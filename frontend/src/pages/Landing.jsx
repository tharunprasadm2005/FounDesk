import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import Logo from "../components/Logo";
import { Gauge } from "../components/ui/gauge";
import HeroNumber from "../components/ui/HeroNumber";
import { FounDeskHeader, FounDeskHeroSection } from "../components/FounDeskHero.jsx";
import {
  Target, ListChecks, Calendar, AlertTriangle, HelpCircle,
  FileText, Plug, Activity, ArrowRight, Sparkles, Code, Users,
  Info, Quote, ChevronRight, Check, Star, CheckSquare, Zap, Play, Terminal
} from "lucide-react";

const FONT_SANS = "'Clash Display', system-ui, sans-serif";
const FONT_BODY = "'Satoshi', system-ui, sans-serif";

const ICON_MAP = {
  target: Target,
  "list-check": ListChecks,
  calendar: Calendar,
  "alert-triangle": AlertTriangle,
  "help-circle": HelpCircle,
  notes: FileText,
  plug: Plug,
  activity: Activity,
  "arrow-right": ArrowRight,
  sparkles: Sparkles,
  code: Code,
  users: Users,
  quote: Quote,
  info: Info
};

function Icon({ name, size = 18, stroke = 1.5, className = "" }) {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} strokeWidth={stroke} className={className} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

// Mini Sparkline Component (No border/stroke wrappers)
function MiniSparkline() {
  const data = [4, 9, 6, 12, 8, 15, 10, 18, 13, 20];
  const width = 180;
  const height = 40;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ember)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--ember)" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkline-grad)"
      />
      <polyline
        fill="none"
        className="sparkline-path"
        points={points}
      />
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="4"
        className="sparkline-endpoint"
      />
    </svg>
  );
}


// Live Subsystems Ledger Reveal inside Bento (Borderless)
function BentoLedgerWidget() {
  const logs = [
    { time: "11:42 AM", source: "AI ENGINE", file: "gmail-sync", status: "Confirmed", details: "Extracted goal to 'Integrate Stripe customer portal' from client email." },
    { time: "11:20 AM", source: "MANUAL", file: "slack-sync", status: "Confirmed", details: "Logged decision to deprecate legacy authentication router." },
    { time: "10:15 AM", source: "AI ENGINE", file: "calendar-sync", status: "Proposed", details: "Suggested focus block of 3 hours for deep product design." }
  ];

  const [count, setCount] = useState(1);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCount(logs.length);
      return;
    }
    const timer = setInterval(() => {
      setCount(c => c >= logs.length ? 1 : c + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {logs.slice(0, count).map((l, i) => (
        <div key={i} className="p-3 bg-[var(--border-soft)] rounded-xl flex flex-col gap-1.5 transition-all duration-300">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--graphite)]">{l.time}</span>
              <span className="text-[var(--graphite)] bg-[var(--border-glass)] px-1 rounded">{l.source}</span>
              <span className="text-[var(--sand)] font-bold">{l.file}</span>
            </div>
            <span className={`tag ${l.status === "Proposed" ? "tag-ember" : "tag-positive"}`} style={{ fontSize: "8.5px" }}>
              {l.status}
            </span>
          </div>
          <p className="text-[12.5px] text-[var(--graphite)] leading-relaxed font-sans">{l.details}</p>
        </div>
      ))}
    </div>
  );
}

function PageIntro({ onDone }) {
  const containerRef = useRef(null);
  const horizonRef = useRef(null);
  const cardContainerRef = useRef(null);
  const cardRef = useRef(null);
  const lightRef1 = useRef(null);
  const lightRef2 = useRef(null);
  const logoRef = useRef(null);
  const streakRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const flashRef = useRef(null);
  const doneCalled = useRef(false);

  const triggerDone = useCallback(() => {
    if (!doneCalled.current) {
      doneCalled.current = true;
      onDone();
    }
  }, [onDone]);

  useEffect(() => {
    gsap.set(containerRef.current, { opacity: 1 });
    gsap.set(horizonRef.current, { scaleX: 0, opacity: 1, scaleY: 1 });
    gsap.set(cardRef.current, { scaleY: 0.01, scaleX: 1, opacity: 0 });
    gsap.set([lightRef1.current, lightRef2.current], { opacity: 0, x: 0, y: 0 });
    gsap.set(logoRef.current, { scale: 0.7, opacity: 0, filter: "blur(15px)" });
    gsap.set(streakRef.current, { x: "-150%" });
    gsap.set(flashRef.current, { opacity: 0 });

    const titleChars = titleRef.current.querySelectorAll(".char");
    gsap.set(titleChars, { opacity: 0, y: 10, filter: "blur(5px)" });
    gsap.set(subtitleRef.current, { opacity: 0, y: 6 });

    const tl = gsap.timeline({
      onComplete: triggerDone,
      defaults: { ease: "power3.out" }
    });

    tl.timeScale(2.5);

    tl.to(horizonRef.current, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0.2)
      .to(cardRef.current, { opacity: 1, scaleY: 1, duration: 0.9, ease: "power4.inOut" }, 0.7)
      .to(horizonRef.current, { opacity: 0, scaleY: 0, duration: 0.4, ease: "power2.in" }, 0.7)
      .to([lightRef1.current, lightRef2.current], { opacity: 1, duration: 0.9 }, 0.8);

    gsap.to(lightRef1.current, { x: -50, y: -15, duration: 2.0, ease: "power1.inOut", yoyo: true, repeat: -1 });
    gsap.to(lightRef2.current, { x: 50, y: 15, duration: 2.4, ease: "power1.inOut", yoyo: true, repeat: -1 });

    tl.to(logoRef.current, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "back.out(1.4)" }, 1.3)
      .fromTo(streakRef.current, { x: "-150%" }, { x: "150%", duration: 1.2, ease: "power2.inOut" }, 1.4)
      .to(titleChars, { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.04, duration: 0.5, ease: "power2.out" }, 1.5)
      .to(subtitleRef.current, { opacity: 0.8, y: 0, duration: 0.6, ease: "power2.out" }, 1.9)
      .to([titleRef.current, subtitleRef.current], { opacity: 0, y: -6, duration: 0.3, ease: "power3.in" }, 2.5)
      .to(cardContainerRef.current, { scale: 6, opacity: 0.1, duration: 0.8, ease: "power3.in" }, 2.5)
      .to([lightRef1.current, lightRef2.current], { scale: 4, opacity: 0.9, duration: 0.8, ease: "power3.in" }, 2.5)
      .to(flashRef.current, { opacity: 1, duration: 0.4, ease: "power2.in" }, 2.8)
      .to(containerRef.current, { opacity: 0, duration: 0.4, ease: "power2.out" }, 3.1);

    const handleSkip = () => triggerDone();
    const currentContainer = containerRef.current;
    if (currentContainer) currentContainer.addEventListener("click", handleSkip);
    window.addEventListener("keydown", handleSkip);
    window.addEventListener("wheel", handleSkip);

    return () => {
      tl.kill();
      gsap.killTweensOf([lightRef1.current, lightRef2.current]);
      if (currentContainer) currentContainer.removeEventListener("click", handleSkip);
      window.removeEventListener("keydown", handleSkip);
      window.removeEventListener("wheel", handleSkip);
    };
  }, [triggerDone]);

  const brandTitle = "FOUNDESK";

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#030303", display: "flex", flexDirection: "column", alignItems: "center", justifySpace: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
      <div ref={cardContainerRef} style={{ position: "relative", width: "320px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", transformOrigin: "center", willChange: "transform, opacity" }}>
        <div ref={lightRef1} style={{ position: "absolute", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(232, 80, 2, 0.15) 0%, rgba(99, 38, 12, 0.02) 50%, transparent 75%)", filter: "blur(25px)", pointerEvents: "none", willChange: "transform, opacity", zIndex: 1 }} />
        <div ref={lightRef2} style={{ position: "absolute", width: "180px", height: "180px", borderRadius: "50%", background: "radial-gradient(circle, rgba(200, 30, 58, 0.1) 0%, transparent 75%)", filter: "blur(30px)", pointerEvents: "none", willChange: "transform, opacity", zIndex: 1 }} />
        <div ref={horizonRef} style={{ position: "absolute", height: "2px", width: "320px", background: "linear-gradient(90deg, transparent, #ec6d20 50%, transparent)", transformOrigin: "center", zIndex: 10, willChange: "transform, opacity" }} />
        <div ref={cardRef} style={{ position: "relative", width: "320px", height: "180px", borderRadius: "20px", border: "none", background: "rgba(22, 22, 20, 0.45)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", transformOrigin: "center", zIndex: 5, willChange: "transform, opacity", boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 25px 50px rgba(0, 0, 0, 0.75)" }}>
          <div ref={logoRef} style={{ transformOrigin: "center", willChange: "transform, opacity", zIndex: 6 }}><Logo size={60} showText={false} /></div>
          <div ref={streakRef} style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 35%, rgba(255, 255, 255, 0.4) 50%, transparent 65%)", mixBlendMode: "overlay", transform: "skewX(-25deg)", pointerEvents: "none", willChange: "transform", zIndex: 7 }} />
        </div>
      </div>
      <div ref={titleRef} style={{ marginTop: "24px", zIndex: 6, textAlign: "center", display: "flex", justifyContent: "center", gap: "1.5px" }}>
        {brandTitle.split("").map((char, index) => (
          <span key={index} className="char" style={{ display: "inline-block", fontSize: "24px", fontWeight: "900", color: "var(--sand)", fontFamily: FONT_SANS, textTransform: "uppercase", willChange: "transform, opacity, filter" }}>{char}</span>
        ))}
      </div>
      <div ref={subtitleRef} style={{ marginTop: "8px", zIndex: 6, textAlign: "center", willChange: "transform, opacity" }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--graphite)", fontFamily: FONT_BODY, textTransform: "uppercase", letterSpacing: "4px" }}>operating system for founders</span>
      </div>
      <div ref={flashRef} style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, rgba(232, 80, 2, 0.4) 0%, transparent 100%)", mixBlendMode: "screen", opacity: 0, pointerEvents: "none", zIndex: 100, willChange: "opacity" }} />
    </div>
  );
}

class SplineErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Spline load failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function SplineFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent">
      <div className="w-56 h-56 rounded-full bg-gradient-to-tr from-[#E85002]/30 via-[#FF7A33]/15 to-transparent filter blur-3xl animate-pulse" />
      <div className="w-40 h-40 rounded-full bg-gradient-to-bl from-[#C83E00]/25 via-transparent to-transparent filter blur-2xl absolute animate-[spin_12s_linear_infinite]" />
      <div className="absolute font-mono text-[9px] text-[var(--graphite)] tracking-widest uppercase opacity-45 select-none">
        INTERACTIVE CANVAS ACTIVE
      </div>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const [introDone, setIntroDone] = useState(
    () => sessionStorage.getItem("landing_intro_seen") === "true"
  );

  const handleIntroDone = useCallback(() => {
    sessionStorage.setItem("landing_intro_seen", "true");
    setIntroDone(true);
  }, []);

  const handleLaunch = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    document.documentElement.setAttribute("data-page", "landing");
    return () => {
      document.documentElement.removeAttribute("data-page");
    };
  }, []);

  useEffect(() => {
    if (!introDone) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".hero-text-anim",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }
    )
    .fromTo(".hero-console-anim",
      { opacity: 0, scale: 0.96, y: 35 },
      { opacity: 1, scale: 1, y: 0, duration: 1.0, ease: "back.out(1.15)" },
      "-=0.5"
    )
    .fromTo(".metrics-card-anim",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
      "-=0.4"
    );
  }, [introDone]);

  if (!introDone) return <PageIntro onDone={handleIntroDone} />;

  return (
    <div className="landing-zone landing-page min-h-screen bg-transparent overflow-x-hidden selection:bg-[#E85002]/20 selection:text-[var(--sand)]">
      {/* Background grain noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50"
        style={{ opacity: 0.03, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "256px 256px" }}
      />
      
      <FounDeskHeader onLaunch={handleLaunch} />
 
      <main className="overflow-x-hidden">
        <FounDeskHeroSection onLaunch={handleLaunch} />
        
        {/* Main Container */}
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pb-24">

        {/* METRICS CONSOLE GRID (No Section Borders) */}
        <section className="landing-section landing-grid">
          
          {/* Card 1: Latency */}
          <div className="metrics-card-anim card-glass grid-span-1 flex flex-col justify-between min-h-[120px] relative overflow-hidden">
            <div>
              <span className="card-label block">Database Latency</span>
              <HeroNumber value="12ms" variant="neutral" className="block" />
            </div>
            <div className="absolute right-4 bottom-4 opacity-50">
              <svg viewBox="0 0 100 30" width="70" height="24" style={{ overflow: "visible" }}>
                <path d="M0,15 L30,15 L35,5 L40,25 L45,15 L100,15" fill="none" stroke="var(--graphite)" strokeWidth="2" strokeDasharray="100" strokeDashoffset="0" />
              </svg>
            </div>
          </div>

          {/* Card 2: SLA Uptime */}
          <div className="metrics-card-anim card-glass grid-span-1 flex flex-col justify-between min-h-[120px] relative overflow-hidden">
            <div>
              <span className="card-label block">SLA Uptime</span>
              <HeroNumber value="99.9%" variant="positive" className="block" />
            </div>
            <div className="absolute right-4 bottom-4 flex gap-1 items-center">
              {[...Array(6)].map((_, i) => (
                <span key={i} className="w-1.5 h-3 rounded-sm bg-[var(--positive)] opacity-80" />
              ))}
            </div>
          </div>

          {/* Card 3: Active Integrations */}
          <div className="metrics-card-anim card-glass grid-span-1 flex flex-col justify-between min-h-[120px]">
            <div>
              <span className="card-label block">Integrations</span>
              <HeroNumber value="12+" variant="neutral" className="block" />
            </div>
            <span className="text-[11px] text-[var(--graphite)] font-mono">GITHUB / LINEAR / SLACK</span>
          </div>

          {/* Card 4: Task Counts */}
          <div className="metrics-card-anim card-glass grid-span-1 flex flex-col justify-between min-h-[120px]">
            <div>
              <span className="card-label block">Velocity Metrics</span>
              <HeroNumber value="482" variant="neutral" className="block" />
            </div>
            <span className="text-[11px] text-[var(--graphite)] font-mono">RESOLVED CHECKS THIS WEEK</span>
          </div>

        </section>

        {/* CORE SUBSYSTEMS BENTO GRID */}
        <section id="features" className="landing-section">
          <div className="section-header">
            <span className="card-label text-[var(--ember-light)] text-xs font-bold uppercase tracking-wider block section-eyebrow">Features</span>
            <h2 style={{ fontFamily: FONT_SANS }} className="text-3xl md:text-5xl font-black text-[var(--sand)] section-heading">
              Modular subsystems built to <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic" }} className="font-normal text-[var(--sand)]">execute</span>
            </h2>
          </div>

          <div className="landing-grid">
            
            {/* 1. Inbox Sync Engine (2 cols - No borders) */}
            <div className="card-glass feature-card--active grid-span-2 flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="card-label flex items-center gap-1.5">
                  <Icon name="sparkles" size={13} /> Inbox Sync Engine
                </span>
                <p style={{ fontFamily: FONT_BODY }} className="text-[15px] text-[var(--graphite)] mt-2 mb-6 max-w-[550px]">
                  Real-time parser translating email inquiries, Slack standup logs, and customer chat dialogues into structured founder objectives instantly.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-[var(--border-soft)] p-3 rounded-xl text-xs">
                  <span className="flex items-center gap-2 font-mono text-[var(--sand)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" /> gmail: founder-inbox / decision-request
                  </span>
                  <span className="status-pill">Parsed</span>
                </div>
                <div className="flex items-center justify-between bg-[var(--border-soft)] p-3 rounded-xl text-xs">
                  <span className="flex items-center gap-2 font-mono text-[var(--sand)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" /> slack: #product-standup / goal-extracted
                  </span>
                  <span className="status-pill">Synced</span>
                </div>
              </div>
            </div>

            {/* 2. Milestones (1 col) */}
            <div className="card-glass grid-span-2 flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="card-label flex items-center gap-1.5">
                  <Icon name="target" size={13} /> Roadmap Gauge
                </span>
                <p style={{ fontFamily: FONT_BODY }} className="text-[15px] text-[var(--graphite)] mt-2 mb-6">
                  Verify weekly company roadmap health with clean visual milestone tracking.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <Gauge value={54} size="S" />
              </div>
            </div>

            {/* 3. Standups (1 col - No borders) */}
            <div className="card-glass grid-span-1 flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="card-label flex items-center gap-1.5">
                  <Icon name="users" size={13} /> Async Standups
                </span>
                <p style={{ fontFamily: FONT_BODY }} className="text-[15px] text-[var(--graphite)] mt-2 mb-6">
                  Convert Slack standup dialog logs into structured developer targets.
                </p>
              </div>
              <div className="flex flex-col gap-3 font-mono text-[11px]">
                <div className="flex items-center gap-2 bg-[var(--border-soft)] p-2 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)]" />
                  <span className="text-[var(--sand)]">Alice: final specs design spec</span>
                </div>
                <div className="flex items-center gap-2 bg-[var(--border-soft)] p-2 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)]" />
                  <span className="text-[var(--sand)]">Bob: stripe verify middleware</span>
                </div>
              </div>
            </div>

            {/* 5. SLA card (1 col) */}
            <div className="card-glass grid-span-1 flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="card-label flex items-center gap-1.5">
                  <Icon name="info" size={13} /> SLA Contract
                </span>
                <p style={{ fontFamily: FONT_BODY }} className="text-[15px] text-[var(--graphite)] mt-2 mb-4">
                  Enterprise grading and verified failover configuration.
                </p>
              </div>
              <div>
                <HeroNumber value="99.9%" variant="positive" className="block" />
                <span className="text-[var(--graphite)] text-xs font-semibold mt-1 block">Uptime Guarantee</span>
              </div>
            </div>

            {/* 4. Analytics (1 col) */}
            <div className="card-glass grid-span-2 flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="card-label flex items-center gap-1.5">
                  <Icon name="activity" size={13} /> Weekly Sparkline
                </span>
                <p style={{ fontFamily: FONT_BODY }} className="text-[15px] text-[var(--graphite)] mt-2 mb-6">
                  Track weekly completed task metrics with responsive SVG charts.
                </p>
              </div>
              <div className="w-full pt-2">
                <MiniSparkline />
              </div>
            </div>

            {/* 6. Decision Ledger (3 cols - No borders) */}
            <div className="card-glass grid-span-4 flex flex-col justify-between min-h-[280px]">
              <div>
                <span className="card-label flex items-center gap-1.5">
                  <Icon name="sparkles" size={13} /> The Decision Ledger
                </span>
                <p style={{ fontFamily: FONT_BODY }} className="text-[15px] text-[var(--graphite)] mt-2">
                  Maintain a chronological registry of extracted company decisions, meeting action items, and strategic milestones automatically synced from Gmail, Slack, and Google Calendar.
                </p>
              </div>
              <BentoLedgerWidget />
            </div>

          </div>
        </section>

        {/* WORKFLOW PIPELINE */}
        <section id="howitworks" className="landing-section">
          <div className="section-header text-center">
            <span className="card-label text-[var(--ember-light)] text-xs font-bold uppercase tracking-wider block section-eyebrow">Architecture</span>
            <h2 style={{ fontFamily: FONT_SANS }} className="text-3xl md:text-5xl font-black text-[var(--sand)] section-heading">
              Workflow pipeline
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center gap-12 w-full overflow-x-auto">
            {/* SVG Pipeline Schema (Borderless Nodes) */}
            <svg viewBox="0 0 800 200" className="w-full h-auto min-w-[700px] max-w-[800px] overflow-visible select-none">
              
              {/* Connecting Paths */}
              <path d="M 80,40 Q 240,100 400,100" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
              <path d="M 80,100 L 400,100" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
              <path d="M 80,160 Q 240,100 400,100" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
              
              <path d="M 400,100 Q 560,40 720,40" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
              <path d="M 400,100 Q 560,160 720,160" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />

              {/* Streaming Webhooks Dashes */}
              <path d="M 80,40 Q 240,100 400,100" fill="none" stroke="var(--ember)" strokeWidth="1.5" strokeDasharray="8, 12" strokeDashoffset="0" className="animate-[dash_8s_linear_infinite]" />
              <path d="M 80,100 L 400,100" fill="none" stroke="var(--ember)" strokeWidth="1.5" strokeDasharray="8, 12" strokeDashoffset="0" className="animate-[dash_8s_linear_infinite]" />
              <path d="M 80,160 Q 240,100 400,100" fill="none" stroke="var(--ember)" strokeWidth="1.5" strokeDasharray="8, 12" strokeDashoffset="0" className="animate-[dash_8s_linear_infinite]" />

              <path d="M 400,100 Q 560,40 720,40" fill="none" stroke="var(--positive)" strokeWidth="1.5" strokeDasharray="8, 12" strokeDashoffset="0" className="animate-[dash_8s_linear_infinite]" />
              <path d="M 400,100 Q 560,160 720,160" fill="none" stroke="var(--positive)" strokeWidth="1.5" strokeDasharray="8, 12" strokeDashoffset="0" className="animate-[dash_8s_linear_infinite]" />

              {/* Node 1: Code Hooks (Borderless) */}
              <circle cx="80" cy="40" r="16" fill="var(--surface)" stroke="none" />
              <text x="80" y="44" fill="var(--sand)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">Git</text>
              <text x="80" y="16" fill="var(--graphite)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">CODE</text>

              {/* Node 2: Chat Standups (Borderless) */}
              <circle cx="80" cy="100" r="16" fill="var(--surface)" stroke="none" />
              <text x="80" y="104" fill="var(--sand)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">Slack</text>
              <text x="80" y="76" fill="var(--graphite)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">STANDUPS</text>

              {/* Node 3: Calendar (Borderless) */}
              <circle cx="80" cy="160" r="16" fill="var(--surface)" stroke="none" />
              <text x="80" y="164" fill="var(--sand)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">Cal</text>
              <text x="80" y="136" fill="var(--graphite)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">FOCUS</text>

              {/* Center Parser Node (Borderless) */}
              <rect x="360" y="76" width="80" height="48" rx="8" fill="var(--surface-2)" stroke="none" />
              <text x="400" y="100" fill="var(--sand)" fontSize="10" fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="bold">AI ENGINE</text>
              <text x="400" y="112" fill="var(--graphite)" fontSize="8" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">PARSER</text>

              {/* Node 4: Executed Backlogs (Borderless) */}
              <circle cx="720" cy="40" r="16" fill="var(--surface)" stroke="none" />
              <text x="720" y="44" fill="var(--sand)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">Tasks</text>
              <text x="720" y="16" fill="var(--graphite)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">BACKLOG</text>

              {/* Node 5: Crypto Ledger (Borderless) */}
              <circle cx="720" cy="160" r="16" fill="var(--surface)" stroke="none" />
              <text x="720" y="164" fill="var(--sand)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">Log</text>
              <text x="720" y="136" fill="var(--graphite)" fontSize="9" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">DECISIONS</text>

            </svg>
            <style>{`
              @keyframes dash {
                to {
                  stroke-dashoffset: -40;
                }
              }
            `}</style>
          </div>
        </section>

        {/* Testimonials removed */}

      </div>
    </main>

      {/* FOOTER (No Top Border) */}
      <footer className="relative z-10 bg-[var(--surface)] landing-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Col 1 */}
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <Logo size={20} showText={false} />
              <span style={{ fontFamily: FONT_SANS }} className="text-base font-bold text-[var(--sand)] uppercase tracking-wider">
                FounDesk
              </span>
            </div>
            <p style={{ fontFamily: FONT_BODY }} className="text-xs text-[var(--graphite)] leading-relaxed max-w-[220px]">
              Operating system for startup builders. Sync codes, defend calendars, align goals, and log decisions.
            </p>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[10px] text-[var(--graphite)] mt-4 block">
              © 2026 FounDesk. All rights reserved.
            </span>
          </div>

          {/* Col 2 */}
          <div>
            <h4 style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs font-bold text-[var(--sand)] uppercase tracking-wider mb-4">Platform</h4>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs">
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }} className="text-[var(--graphite)] hover:text-[var(--sand)] transition-colors duration-200 no-underline">
                  Features
                </a>
              </li>
              <li>
                <a href="#howitworks" onClick={(e) => { e.preventDefault(); document.getElementById("howitworks")?.scrollIntoView({ behavior: "smooth" }); }} className="text-[var(--graphite)] hover:text-[var(--sand)] transition-colors duration-200 no-underline">
                  Workflow
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs font-bold text-[var(--sand)] uppercase tracking-wider mb-4">Integrations</h4>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs text-[var(--graphite)]">
              <li>Gmail</li>
              <li>Slack</li>
              <li>Google Calendar</li>
              <li>HubSpot</li>
              <li>Monday.com</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs font-bold text-[var(--sand)] uppercase tracking-wider mb-4">Legal</h4>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs">
              <li>
                <a href="#privacy" className="text-[var(--graphite)] hover:text-[var(--sand)] transition-colors duration-200 no-underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-[var(--graphite)] hover:text-[var(--sand)] transition-colors duration-200 no-underline">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#sla" className="text-[var(--graphite)] hover:text-[var(--sand)] transition-colors duration-200 no-underline">
                  SLA Agreement
                </a>
              </li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
}

export default Landing;
