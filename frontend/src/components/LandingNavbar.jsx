import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "./Logo";

const NAV_LINKS = [
  { label: "Platform", id: "features" },
  { label: "Workflow", id: "howitworks" },
  { label: "Testimonials", id: "testimonials" },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingNavbar({ onLaunch }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const navRef = useRef(null);
  const sx = useMotionValue(50);
  const sy = useMotionValue(50);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      let current = "";
      for (const { id } of NAV_LINKS) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top < 200) current = id;
        }
      }
      setActiveSection(current);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!navRef.current) return;
    const r = navRef.current.getBoundingClientRect();
    sx.set(((e.clientX - r.left) / r.width) * 100);
    sy.set(((e.clientY - r.top) / r.height) * 100);
  }, [sx, sy]);

  const bgSpotlight = useMotionTemplate`radial-gradient(500px circle at ${sx}% ${sy}%, rgba(232,80,20,0.06) 0%, transparent 50%)`;

  return (
    <>
      <motion.nav
        ref={navRef}
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: scrolled ? "64px" : "80px",
          background: scrolled ? "rgba(10, 10, 12, 0.7)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid transparent",
          boxShadow: scrolled ? "0 10px 30px rgba(0, 0, 0, 0.5)" : "none",
          transition: "height 0.4s ease, background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1400px",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            padding: "0 40px",
            position: "relative",
          }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: bgSpotlight }}
          />

          {/* LEFT: Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="cursor-pointer flex items-center gap-2 shrink-0 relative z-10"
            style={{ justifySelf: "start" }}
          >
            <Logo size={18} showText={false} />
            <span
              className="text-sm font-bold text-white tracking-wide hidden sm:block"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              FounDesk
            </span>
          </div>

          {/* CENTER: Nav links */}
          <div
            className="hidden lg:flex items-center relative z-10"
            style={{
              justifySelf: "center",
              justifyContent: "center",
              gap: "36px",
            }}
          >
            {NAV_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="border-none bg-transparent cursor-pointer relative group"
                  style={{
                    padding: "6px 0",
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.72)",
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.transform = "translateY(-1.5px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isActive ? "#fff" : "rgba(255,255,255,0.72)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {item.label}
                  <span
                    className="absolute bottom-0 left-0 h-[2px] bg-[var(--japandi-accent)] transition-all duration-300 origin-center scale-x-0 group-hover:scale-x-100"
                    style={{
                      width: "100%",
                      transform: isActive ? "scaleX(1)" : undefined,
                      transformOrigin: "center",
                      transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)"
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* RIGHT: Button */}
          <div className="flex items-center gap-2 relative z-10" style={{ justifySelf: "end" }}>
            <button
              onClick={onLaunch}
              className="border-none cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              style={{
                padding: "8px 20px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                color: "#fff",
                background: "linear-gradient(135deg, #E85002, #F16001)",
                transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(232,80,2,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Login
              <ArrowRight size={13} />
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 lg:hidden"
          style={{
            background: "rgba(10,10,10,0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
          onClick={() => setMobileOpen(false)}
        >
          {NAV_LINKS.map((item) => (
            <button
              key={item.id}
              onClick={() => { scrollToSection(item.id); setMobileOpen(false); }}
              className="border-none bg-transparent cursor-pointer"
              style={{
                fontSize: "20px", fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                color: activeSection === item.id ? "#E85002" : "rgba(255,255,255,0.7)",
                letterSpacing: "0.02em", padding: "8px 0",
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => { onLaunch(); setMobileOpen(false); }}
            className="mt-6 border-none cursor-pointer"
            style={{
              padding: "14px 36px", borderRadius: "999px",
              fontSize: "15px", fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif", color: "#fff",
              background: "linear-gradient(135deg, #E85002, #F16001)",
            }}
          >
            Launch App
          </button>
        </div>
      )}
    </>
  );
}
