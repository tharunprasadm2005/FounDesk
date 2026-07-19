import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, ArrowRight, Shield } from "lucide-react";
import { useGoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
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
      if (isLogin) {
        const res = await api.post("/api/login", { email, password });
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      } else {
        const res = await api.post("/api/register", { email, password, name });
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      setLocalError(err.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => {
      if (handleSuccess) {
        // App.jsx handleSuccess expects a credentialResponse object with `credential` property for token.
        // For @react-oauth/google's implicit flow, the token is `access_token`. 
        handleSuccess({ credential: codeResponse.access_token });
      }
    },
    onError: (error) => setLocalError("Google login failed")
  });

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
            <Button 
              type="button"
              variant="secondary" 
              className="w-full"
              onClick={() => loginGoogle()}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            
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
            <button onClick={() => { setIsLogin(!isLogin); setLocalError(""); if(onClearError) onClearError(); }} className="text-sumi-900 font-medium hover:underline">
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
