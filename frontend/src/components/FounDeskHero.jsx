import React from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useScroll } from "framer-motion";
import { cn } from "../lib/utils";
import { InfiniteSlider } from "./ui/InfiniteSlider";
import { ProgressiveBlur } from "./ui/ProgressiveBlur";
import { CardStack } from "./ui/CardStack";
import Logo from "./Logo";

const navItems = [
  { name: "Platform", href: "#features" },
  { name: "Workflow", href: "#howitworks" },
];

const integrations = ["Gmail", "Slack", "Google Calendar", "HubSpot", "Pipedrive", "Linear", "Trello", "Asana", "Monday.com"];

const integrationItems = [
  {
    id: "gmail",
    title: "Gmail Extraction",
    description: "New email → action item extracted",
    tag: "GMAIL",
    imageSrc: "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "slack",
    title: "Slack Standups",
    description: "Standup logged → 2 targets extracted",
    tag: "SLACK",
    imageSrc: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "calendar",
    title: "Calendar Defense",
    description: "Double booking → conflict auto-resolved",
    tag: "CALENDAR",
    imageSrc: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "linear",
    title: "Linear Sync",
    description: "3 issues moved to In Progress",
    tag: "LINEAR",
    imageSrc: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "hubspot",
    title: "HubSpot / Pipedrive",
    description: "Deal closed → billing setup tasked",
    tag: "CRM",
    imageSrc: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
  },
];

function FounDeskMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="var(--ember-orange)" strokeWidth="1.6" />
      <path d="M8 16V8h8" stroke="var(--warm-sand)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.6" fill="var(--ember-orange)" />
    </svg>
  );
}

export function FounDeskHeader({ onLaunch }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollYProgress } = useScroll();
  const [activeSection, setActiveSection] = React.useState("");

  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => setScrolled(latest > 0.03));
    return () => unsubscribe();
  }, [scrollYProgress]);

  React.useEffect(() => {
    const sections = ["features", "howitworks", "testimonials"];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 180;
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            return;
          }
        }
      }
      setActiveSection("");
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <nav
        className={cn(
          "navbar flex items-center justify-between transition-all duration-300 w-full",
          scrolled ? "h-16 navbar--scrolled" : "h-20"
        )}
      >
        {/* Left Side: Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="cursor-pointer flex items-center group"
        >
          <Logo size={28} showText={true} />
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden lg:flex items-center justify-center flex-1">
          <ul className="list-none p-0 m-0" style={{ display: "flex", gap: "40px", alignItems: "center" }}>
            {navItems.map((item) => {
              const isActive = activeSection === item.href.replace("#", "");
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      const targetId = item.href.replace("#", "");
                      const el = document.getElementById(targetId);
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={cn(
                      "font-sans text-[12px] font-bold uppercase tracking-widest transition-colors duration-200 no-underline",
                      isActive
                        ? "text-[var(--ember)]"
                        : "text-[var(--graphite)] hover:text-[var(--sand)]"
                    )}
                  >
                    {item.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right Side: Actions (Sign Up CTA Button Only) */}
        <div className="hidden items-center lg:flex">
          <button
            onClick={onLaunch}
            className="border-none cursor-pointer cta-button px-7 py-2.5 text-[11px] font-extrabold uppercase tracking-widest"
          >
            Sign Up
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--sand)] lg:hidden border-none bg-transparent cursor-pointer hover:bg-[var(--surface-2)]/50 transition-colors"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="absolute top-full left-0 w-full bg-[var(--void)] border-b border-[var(--border-soft)] py-6 px-6 flex flex-col gap-6 lg:hidden shadow-lg animate-[fadeIn_0.15s_ease-out]">
            <ul className="flex flex-col gap-4 list-none p-0 m-0">
              {navItems.map((item) => {
                const isActive = activeSection === item.href.replace("#", "");
                return (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                        const targetId = item.href.replace("#", "");
                        const el = document.getElementById(targetId);
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={cn(
                        "font-sans text-xs font-semibold tracking-widest uppercase no-underline block py-1.5 transition-colors",
                        isActive ? "text-[var(--ember)]" : "text-[var(--graphite)]"
                      )}
                    >
                      {item.name}
                    </a>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => { onLaunch(); setMenuOpen(false); }}
              className="border-none cursor-pointer cta-button py-3 text-[11px] font-extrabold uppercase tracking-widest text-center"
            >
              Sign Up
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

export function FounDeskHeroSection({ onLaunch }) {
  return (
    <section className="hero-section relative overflow-hidden">
      {/* Copy Column */}
      <div className="hero-content flex flex-col justify-center select-text z-10">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.05em] text-[var(--graphite)] mb-4 block animate-reveal-eyebrow">
          FOUNDER OPERATING SYSTEM
        </span>
        <h1 className="text-4xl md:text-5xl xl:text-[4rem] font-bold text-[var(--sand)] leading-[1.05] tracking-tight animate-reveal-title">
          Every decision, commit, and update.{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FC6F20] to-[#E85002] italic font-normal" style={{ fontFamily: "'Fraunces', serif" }}>
            Synced.
          </span>
        </h1>
        <p className="mt-6 max-w-[480px] font-sans text-base md:text-lg leading-relaxed text-[var(--graphite)] animate-reveal-desc">
          FounDesk pulls decision requests, goals, and tasks automatically from Gmail, Slack, Google Calendar, HubSpot, Pipedrive, Linear, Trello, Asana, and Monday.com into one cohesive founder dashboard.
        </p>

        <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center animate-reveal-ctas">
          <button
            onClick={onLaunch}
            className="border-none cursor-pointer cta-button px-8 py-3.5 text-xs font-bold uppercase tracking-wider shadow-md"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Card Stack Visual Column */}
      <div className="hero-card-stack flex items-center justify-center z-10">
        <CardStack items={integrationItems} cardWidth={360} cardHeight={240} />
      </div>
    </section>
  );
}
