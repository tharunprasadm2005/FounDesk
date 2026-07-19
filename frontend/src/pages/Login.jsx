import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, ArrowRight, Shield } from "lucide-react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import api from "../utils/api";
import Logo from "../components/Logo";
import Button from "../components/ui/button";
import Input from "../components/ui/input";

const GOOGLE_CLIENT_ID = "174203078115-lgbiq9ekbd01sr82us4ulb4nsb0boc3q.apps.googleusercontent.com";

function LoginContent({ handleSuccess, authError, onClearError }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const error = authError || localError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError("");
    if (onClearError) onClearError();

    try {
      let res;
      if (isLogin) {
        res = await api.post("/api/auth/login", { email, password });
      } else {
        res = await api.post("/api/auth/signup", { email, password, name });
      }
      
      const { token, refresh_token, user, workspace } = res.data;
      localStorage.setItem("token", token);
      if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
      if (user) localStorage.setItem("user", JSON.stringify(user));
      if (workspace) localStorage.setItem("workspaceId", workspace.id.toString());
      
      navigate("/dashboard");
    } catch (err) {
      setLocalError(err.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-washi-white text-sumi-900 font-sans flex flex-col md:flex-row selection:bg-stone-200">
      <div className="hidden md:flex flex-1 bg-linen-100 border-r border-stone-200 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(circle_at_top_left,var(--stone-200),transparent_50%)]"></div>
        <div className="relative z-10"><Logo size={40} /></div>
        <div className="relative z-10 max-w-md space-y-6">
          <h2 className="text-4xl font-heading leading-tight text-sumi-900">A quiet space for high-velocity execution.</h2>
          <p className="text-stone-400 text-lg leading-relaxed">
            Eliminate the noise of disconnected tools. Compile your workflows, goals, and decisions into one unified operating system.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 reveal visible">
          <div className="md:hidden flex justify-center mb-8"><Logo size={32} /></div>
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-heading text-sumi-900">{isLogin ? "Welcome back" : "Create your account"}</h1>
            <p className="text-stone-400">{isLogin ? "Sign in to your FounDesk workspace." : "Start organizing your execution."}</p>
          </div>

          {error && (
            <div className="p-4 bg-clay-500/10 border border-clay-500/20 text-clay-500 rounded-sm text-sm flex items-center gap-2">
              <Shield size={16} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="w-full flex justify-center">
              <GoogleLogin 
                onSuccess={(credentialResponse) => {
                  if (handleSuccess) handleSuccess(credentialResponse);
                }}
                onError={() => {
                  setLocalError("Google login failed");
                }}
                shape="rectangular"
                theme="outline"
                size="large"
                width="100%"
              />
            </div>
            
            <div className="flex items-center gap-4 py-4">
              <div className="flex-1 h-px bg-stone-200"></div>
              <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Or with email</span>
              <div className="flex-1 h-px bg-stone-200"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-sumi-900 block">Full Name</label>
                  <Input placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-sumi-900 block">Email Address</label>
                <Input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-sumi-900 block">Password</label>
                  {isLogin && <a href="#" className="text-xs text-stone-400 hover:text-sumi-900">Forgot password?</a>}
                </div>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <Button type="submit" variant="primary" className="w-full mt-2" disabled={loading}>
                {loading ? "Authenticating..." : (isLogin ? "Sign In" : "Create Account")}
                {!loading && <ArrowRight size={16} />}
              </Button>
            </form>
          </div>

          <div className="text-center text-sm text-stone-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setLocalError(""); if(onClearError) onClearError(); }} className="text-sumi-900 font-medium hover:underline">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login(props) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginContent {...props} />
    </GoogleOAuthProvider>
  );
}
