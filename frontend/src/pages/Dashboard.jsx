import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Target, ListChecks, Calendar
} from "lucide-react";
import api from "../utils/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Section, Grid, Stack, Inline } from "../components/layout";

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
        <div className="text-stone-400 font-mono text-[12px] uppercase tracking-widest animate-pulse">
          Compiling Briefing...
        </div>
      </div>
    );
  }

  return (
    <Section padding="p-0" className="max-w-7xl mx-auto w-full font-ui">
      
      {/* Header */}
      <header className="reveal visible mb-[96px]">
        <Inline justify="justify-between" items="items-end" className="flex-col md:flex-row gap-[24px]">
          <Stack gap="gap-[8px]">
            <p className="text-[12px] m-0 font-mono text-stone-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-[32px] md:text-[40px] m-0 font-heading text-sumi-900 leading-tight">Good morning, {user?.name?.split(' ')[0] || 'Founder'}.</h1>
          </Stack>
          <Inline gap="gap-[12px]">
            <Button variant="secondary" size="md">Review Yesterday</Button>
            <Button variant="primary" size="md">Start Execution</Button>
          </Inline>
        </Inline>
      </header>

      <div className="h-px bg-stone-200 mb-[64px] w-full"></div>

      <Grid className="reveal visible animate-fade-in" gap="gap-[32px]">
        
        {/* Primary Focus */}
        <Stack gap="gap-[16px]" className="col-span-4 md:col-span-8 lg:col-span-6">
          <h2 className="text-[12px] m-0 font-mono text-stone-400 uppercase tracking-widest flex items-center gap-[8px]">
            <Target size={14} className="text-indigo-ink"/> Active Goal
          </h2>
          <Card padding="p-[24px]" className="h-full">
            <Stack gap="gap-[16px]">
              <h3 className="text-[20px] m-0 font-heading text-sumi-900">{data?.command_strip?.active_goal?.title || "Ship Q3 Product Update"}</h3>
              <div className="w-full bg-stone-200 h-[4px] rounded-[2px] overflow-hidden">
                <div className="bg-indigo-ink h-full rounded-[2px]" style={{ width: '45%' }}></div>
              </div>
              <Inline justify="justify-between" className="text-[13px] font-mono text-stone-400">
                <span>Progress</span>
                <span>45%</span>
              </Inline>
            </Stack>
          </Card>
        </Stack>

        {/* Schedule */}
        <Stack gap="gap-[16px]" className="col-span-4 md:col-span-8 lg:col-span-6">
          <h2 className="text-[12px] m-0 font-mono text-stone-400 uppercase tracking-widest flex items-center gap-[8px]">
            <Calendar size={14} className="text-moss-600"/> Next Up
          </h2>
          <Card padding="p-[24px]" className="h-full">
            <Stack gap="gap-[16px]">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-[16px] items-start border-b border-stone-200 pb-[16px] last:border-0 last:pb-0">
                  <div className="text-[13px] font-mono text-stone-400 w-[48px] pt-[2px]">
                    {i === 1 ? '10:00' : '13:00'}
                  </div>
                  <div>
                    <div className="font-medium text-[14px] text-sumi-900 leading-snug">{i === 1 ? 'Product Sync' : 'Deep Work Block'}</div>
                    <div className="text-[13px] text-stone-400">Zoom • 45m</div>
                  </div>
                </div>
              ))}
            </Stack>
          </Card>
        </Stack>

        {/* Execution Checklist */}
        <Stack gap="gap-[16px]" className="col-span-4 md:col-span-8 lg:col-span-12 mt-[32px]">
          <h2 className="text-[12px] m-0 font-mono text-stone-400 uppercase tracking-widest flex items-center gap-[8px]">
            <ListChecks size={14} className="text-stone-400" /> Execution Checklist
          </h2>
          <Card padding="p-0" className="overflow-hidden border border-stone-200">
            {[
              "Review Q3 metrics and update dashboard",
              "Approve new landing page copy",
              "Finalize API schema for v2 release"
            ].map((task, i) => (
              <div key={i} className="flex items-center gap-[16px] p-[16px] border-b border-stone-200 last:border-0 hover:bg-linen-100/50 transition-colors cursor-pointer group">
                <div className="w-[20px] h-[20px] rounded-[2px] border border-stone-400 group-hover:border-indigo-ink flex items-center justify-center transition-colors">
                </div>
                <span className="text-sumi-900 text-[14px] font-medium group-hover:text-indigo-ink transition-colors">{task}</span>
              </div>
            ))}
          </Card>
        </Stack>

      </Grid>
    </Section>
  );
}
