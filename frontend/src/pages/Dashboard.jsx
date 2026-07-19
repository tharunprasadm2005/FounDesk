import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Target, ListChecks, Calendar
} from "lucide-react";
import api from "../utils/api";
import Logo from "../components/Logo";
import Button from "../components/ui/button";

function Icon({ name, size = 18 }) {
  const ICON_MAP = { target: Target, "list-check": ListChecks, calendar: Calendar };
  const Comp = ICON_MAP[name] || Target;
  return <Comp size={size} className="text-stone-400" />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    Promise.all([
      api.get("/api/me").catch(() => null),
      api.get("/api/dashboard").catch(() => null)
    ]).then(([meRes, dashRes]) => {
      if (meRes && meRes.data) setUser(meRes.data.user);
      if (dashRes && dashRes.data) setData(dashRes.data);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-washi-white flex items-center justify-center">
        <div className="text-stone-400 font-mono text-sm uppercase tracking-widest animate-pulse">
          Compiling Briefing...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal visible">
        <div>
          <p className="text-sm font-mono text-stone-400 uppercase tracking-widest mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-4xl font-heading text-sumi-900">Good morning, {user?.name?.split(' ')[0] || 'Founder'}.</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm">Review Yesterday</Button>
          <Button variant="primary" size="sm">Start Execution</Button>
        </div>
      </header>

      <div className="h-px bg-stone-200"></div>

      {/* Grid Layout (2-col desktop, 1-col mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal visible animate-fade-in">
        
        {/* Primary Focus */}
        <section className="space-y-4">
          <h2 className="text-xs font-mono text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <Target size={14} className="text-indigo-ink"/> Active Goal
          </h2>
          <div className="card-japandi p-6 space-y-4">
            <h3 className="text-xl font-heading">{data?.command_strip?.active_goal?.title || "Ship Q3 Product Update"}</h3>
            <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
              <div className="bg-indigo-ink h-full" style={{ width: '45%' }}></div>
            </div>
            <div className="flex justify-between text-sm font-mono text-stone-400">
              <span>Progress</span>
              <span>45%</span>
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="space-y-4">
          <h2 className="text-xs font-mono text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} className="text-moss-600"/> Next Up
          </h2>
          <div className="card-japandi p-6 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4 items-start border-b border-stone-200 pb-4 last:border-0 last:pb-0">
                <div className="text-sm font-mono text-stone-400 w-16 pt-1">
                  {i === 1 ? '10:00' : '13:00'}
                </div>
                <div>
                  <div className="font-medium text-sumi-900">{i === 1 ? 'Product Sync' : 'Deep Work Block'}</div>
                  <div className="text-sm text-stone-400">Zoom • 45m</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Execution Checklist */}
        <section className="space-y-4 lg:col-span-2">
          <h2 className="text-xs font-mono text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <ListChecks size={14} /> Execution Checklist
          </h2>
          <div className="card-japandi p-0 overflow-hidden">
            {[
              "Review Q3 metrics and update dashboard",
              "Approve new landing page copy",
              "Finalize API schema for v2 release"
            ].map((task, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-stone-200 last:border-0 hover:bg-linen-100/50 transition-colors cursor-pointer group">
                <div className="w-5 h-5 rounded-sm border border-stone-400 group-hover:border-indigo-ink flex items-center justify-center transition-colors">
                </div>
                <span className="text-sumi-900 font-medium group-hover:text-indigo-ink transition-colors">{task}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
