import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Target, ListChecks, Calendar, Shield } from "lucide-react";
import Logo from "../components/Logo";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export default function Landing() {
  const navigate = useNavigate();

  const handleLaunch = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-washi-white text-sumi-900 font-sans selection:bg-stone-200">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-washi-white/80 backdrop-blur-md border-b border-stone-200 px-[24px] py-[16px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
        </div>
        <div className="flex items-center gap-[16px]">
          <button 
            onClick={() => navigate("/login")}
            className="text-stone-400 hover:text-sumi-900 font-medium transition-colors bg-transparent border-none cursor-pointer outline-none"
          >
            Sign In
          </button>
          <Button variant="primary" size="md" onClick={handleLaunch}>
            Start Free
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-[24px] py-[96px] md:py-[128px] max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-[64px]">
        <div className="flex-1 space-y-[32px] reveal visible">
          <h1 className="text-[48px] md:text-[64px] font-heading text-sumi-900 leading-[1.1]">
            The operating system <br className="hidden md:block"/> for founders.
          </h1>
          <p className="text-[20px] text-stone-400 max-w-lg leading-relaxed">
            Reclaim your focus. Compile your tools, goals, calendar, and decisions into a calm, panoramic command center.
          </p>
          <div className="flex flex-col sm:flex-row gap-[16px] pt-[16px]">
            <Button variant="primary" size="lg" onClick={handleLaunch} className="flex items-center gap-2">
              Get Started <ArrowRight size={18} />
            </Button>
          </div>
        </div>
        
        {/* Abstract Hero Visual (Japandi) */}
        <div className="flex-1 w-full reveal visible">
          <Card className="aspect-[4/3] w-full flex flex-col relative overflow-hidden bg-linen-100/50">
            <div className="absolute top-0 right-0 w-[256px] h-[256px] bg-stone-200 rounded-full blur-3xl opacity-20 -mr-[80px] -mt-[80px]"></div>
            
            <div className="flex justify-between items-start mb-[48px]">
              <div className="space-y-[8px]">
                <p className="text-[12px] font-mono text-stone-400 uppercase tracking-widest m-0">Morning Briefing</p>
                <h3 className="font-heading text-[24px] text-sumi-900 m-0">Your day is structured.</h3>
              </div>
              <div className="w-[48px] h-[48px] rounded-[4px] border border-stone-200 flex items-center justify-center bg-washi-white shadow-sm">
                <Target className="text-indigo-ink" size={20} />
              </div>
            </div>
            
            <div className="space-y-[16px] mt-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[64px] w-full border border-stone-200 rounded-[4px] bg-washi-white flex items-center px-[16px] gap-[16px] relative">
                  <div className={`w-[2px] h-[48px] ${i === 1 ? 'bg-indigo-ink' : i === 2 ? 'bg-moss-600' : 'bg-clay-500'} absolute left-0 top-1/2 -translate-y-1/2 rounded-r-[2px]`}></div>
                  <div className="w-[16px] h-[16px] rounded-[2px] border border-stone-200"></div>
                  <div className="flex-1 flex flex-col gap-[8px]">
                    <div className="h-[8px] w-1/3 bg-stone-200 rounded-[2px]"></div>
                    <div className="h-[8px] w-1/4 bg-linen-100 rounded-[2px]"></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-linen-100 py-[96px] border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-[24px]">
          <div className="max-w-2xl mb-[64px]">
            <h2 className="text-[32px] md:text-[40px] font-heading text-sumi-900 mb-[16px]">Precision over noise.</h2>
            <p className="text-stone-400 text-[18px] m-0">We stripped away the clutter so you can focus on execution.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-[32px]">
            <Card className="space-y-[24px]">
              <div className="w-[40px] h-[40px] border border-stone-200 rounded-[4px] flex items-center justify-center bg-washi-white">
                <ListChecks className="text-indigo-ink" size={20} />
              </div>
              <h3 className="font-heading text-[20px] m-0">Unified Inbox</h3>
              <p className="text-stone-400 text-[14px] leading-relaxed m-0">
                Slack, Gmail, Linear. All your inputs compiled into one quiet stream. No more context switching.
              </p>
            </Card>
            <Card className="space-y-[24px]">
              <div className="w-[40px] h-[40px] border border-stone-200 rounded-[4px] flex items-center justify-center bg-washi-white">
                <Calendar className="text-moss-600" size={20} />
              </div>
              <h3 className="font-heading text-[20px] m-0">Calendar Defense</h3>
              <p className="text-stone-400 text-[14px] leading-relaxed m-0">
                Automatically shield your deep work blocks. FounDesk reschedules low-priority interruptions.
              </p>
            </Card>
            <Card className="space-y-[24px]">
              <div className="w-[40px] h-[40px] border border-stone-200 rounded-[4px] flex items-center justify-center bg-washi-white">
                <Shield className="text-clay-500" size={20} />
              </div>
              <h3 className="font-heading text-[20px] m-0">Decision Log</h3>
              <p className="text-stone-400 text-[14px] leading-relaxed m-0">
                Every major choice documented. Search your past reasoning to inform your future strategy.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Simple */}
      <section className="py-[96px] max-w-4xl mx-auto px-[24px] text-center">
        <h2 className="text-[32px] md:text-[40px] font-heading text-sumi-900 mb-[16px]">Start executing today.</h2>
        <p className="text-stone-400 text-[18px] mb-[48px] m-0">One transparent plan. No artificial limits.</p>
        
        <Card padding="p-8" className="max-w-lg mx-auto flex flex-col items-center text-left">
          <div className="text-[12px] font-mono text-stone-400 uppercase tracking-widest mb-[16px] text-center">Pro Plan</div>
          <div className="text-[48px] font-heading text-sumi-900 mb-[32px] text-center">$29<span className="text-[18px] text-stone-400 font-sans">/mo</span></div>
          
          <ul className="space-y-[16px] text-left w-full mb-[32px] p-0 m-0 list-none">
            {["Unlimited workspaces", "All integrations included", "Priority AI processing", "Historical decision search"].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-[12px] text-[14px] text-sumi-900">
                <Check size={16} className="text-moss-600 shrink-0" /> {feature}
              </li>
            ))}
          </ul>
          
          <Button variant="primary" size="lg" className="w-full" onClick={handleLaunch}>
            Start 14-Day Trial
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-[48px] px-[24px]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-[16px]">
          <div className="flex items-center gap-[12px] text-stone-400">
            <Logo />
            <span className="text-[14px]">© {new Date().getFullYear()} FounDesk.</span>
          </div>
          <div className="flex gap-[24px] text-[14px] text-stone-400">
            <a href="#" className="hover:text-sumi-900 text-stone-400 no-underline transition-colors">Privacy</a>
            <a href="#" className="hover:text-sumi-900 text-stone-400 no-underline transition-colors">Terms</a>
            <a href="#" className="hover:text-sumi-900 text-stone-400 no-underline transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
