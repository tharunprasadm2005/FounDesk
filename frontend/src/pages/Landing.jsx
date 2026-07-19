import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Target, ListChecks, Calendar, Shield } from "lucide-react";
import Logo from "../components/Logo";

export default function Landing() {
  const navigate = useNavigate();

  const handleLaunch = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-washi-white text-sumi-900 font-sans selection:bg-stone-200">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-washi-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/login")}
            className="text-stone-400 hover:text-sumi-900 font-medium transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={handleLaunch}
            className="btn-primary"
          >
            Start Free
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-24 md:py-32 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8 reveal visible">
          <h1 className="text-5xl md:text-6xl font-heading text-sumi-900 leading-tight">
            The operating system <br className="hidden md:block"/> for founders.
          </h1>
          <p className="text-xl text-stone-400 max-w-lg leading-relaxed">
            Reclaim your focus. Compile your tools, goals, calendar, and decisions into a calm, panoramic command center.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={handleLaunch}
              className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        </div>
        
        {/* Abstract Hero Visual (Japandi) */}
        <div className="flex-1 w-full reveal visible">
          <div className="card-japandi aspect-[4/3] w-full flex flex-col p-8 relative overflow-hidden bg-linen-100/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-stone-200 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
            
            <div className="flex justify-between items-start mb-12">
              <div className="space-y-2">
                <p className="text-xs font-mono text-stone-400 uppercase tracking-widest">Morning Briefing</p>
                <h3 className="font-heading text-2xl text-sumi-900">Your day is structured.</h3>
              </div>
              <div className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center bg-washi-white shadow-sm">
                <Target className="text-indigo-ink" size={20} />
              </div>
            </div>
            
            <div className="space-y-4 mt-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-full border border-stone-200 rounded-sm bg-washi-white flex items-center px-4 gap-4">
                  <div className={`w-2 h-full ${i === 1 ? 'bg-indigo-ink' : i === 2 ? 'bg-moss-600' : 'bg-clay-500'} absolute left-0`}></div>
                  <div className="w-4 h-4 rounded-sm border border-stone-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-1/3 bg-stone-200 rounded-sm"></div>
                    <div className="h-2 w-1/4 bg-linen-100 rounded-sm"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-linen-100 py-24 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <h2 className="text-4xl font-heading text-sumi-900 mb-4">Precision over noise.</h2>
            <p className="text-stone-400 text-lg">We stripped away the clutter so you can focus on execution.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-japandi p-8 space-y-6">
              <div className="w-10 h-10 border border-stone-200 flex items-center justify-center bg-washi-white">
                <ListChecks className="text-indigo-ink" size={20} />
              </div>
              <h3 className="font-heading text-xl">Unified Inbox</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Slack, Gmail, Linear. All your inputs compiled into one quiet stream. No more context switching.
              </p>
            </div>
            <div className="card-japandi p-8 space-y-6">
              <div className="w-10 h-10 border border-stone-200 flex items-center justify-center bg-washi-white">
                <Calendar className="text-moss-600" size={20} />
              </div>
              <h3 className="font-heading text-xl">Calendar Defense</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Automatically shield your deep work blocks. FounDesk reschedules low-priority interruptions.
              </p>
            </div>
            <div className="card-japandi p-8 space-y-6">
              <div className="w-10 h-10 border border-stone-200 flex items-center justify-center bg-washi-white">
                <Shield className="text-clay-500" size={20} />
              </div>
              <h3 className="font-heading text-xl">Decision Log</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Every major choice documented. Search your past reasoning to inform your future strategy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Simple */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-heading text-sumi-900 mb-4">Start executing today.</h2>
        <p className="text-stone-400 text-lg mb-12">One transparent plan. No artificial limits.</p>
        
        <div className="card-japandi p-12 max-w-lg mx-auto flex flex-col items-center">
          <div className="text-sm font-mono text-stone-400 uppercase tracking-widest mb-4">Pro Plan</div>
          <div className="text-5xl font-heading text-sumi-900 mb-8">$29<span className="text-lg text-stone-400 font-sans">/mo</span></div>
          
          <ul className="space-y-4 text-left w-full mb-8">
            {["Unlimited workspaces", "All integrations included", "Priority AI processing", "Historical decision search"].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm text-sumi-900">
                <Check size={16} className="text-moss-600" /> {feature}
              </li>
            ))}
          </ul>
          
          <button onClick={handleLaunch} className="btn-primary w-full py-4 text-lg">
            Start 14-Day Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-stone-400">
            <Logo />
            <span className="text-sm">© {new Date().getFullYear()} FounDesk.</span>
          </div>
          <div className="flex gap-6 text-sm text-stone-400">
            <a href="#" className="hover:text-sumi-900">Privacy</a>
            <a href="#" className="hover:text-sumi-900">Terms</a>
            <a href="#" className="hover:text-sumi-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
