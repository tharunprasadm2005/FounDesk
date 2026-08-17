import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, animate, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, Menu, X } from "lucide-react";
import Brand from "../components/Brand";
import { DeskScene, Rings, Streaks, MiniCalendar, MiniMail, MiniCrm } from "../components/Illustrations";

/* ────────────────────────────────────────────────────────────
   Motion vocabulary
   ──────────────────────────────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1];

const heroParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const heroChild = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};
const riseIn = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};

const NAV_LINKS = [
  { label: "Manifest", href: "#doctrine" },
  { label: "Components", href: "#principles" },
  { label: "Runway", href: "#system" },
  { label: "Pricing", href: "#pricing" },
];

const ROTATOR_WORDS = ["owns", "commands", "quietens", "runs"];

const DOCTRINE_RULES = [
  { t: "One daily read", b: "Four minutes, total. The briefing is the entire interface; the app is the archive." },
  { t: "The loudest tool has no vote", b: "Signals are ranked against your goals — never by which app yells the most." },
  { t: "Every decision earns its place", b: "Capture with context and confidence. Your reasoning becomes an asset, not a memory." },
  { t: "No meeting without a reason", b: "Calendars are defended by default. Interruptions must justify themselves." },
  { t: "Blocked means owned", b: "A blocker without a name, a date, and an owner is just anxiety." },
  { t: "Repeatable beats impressive", b: "Run the two most important things today. Do it so well tomorrow is easy." },
];

const FEATURES = [
  {
    icon: MiniCalendar,
    title: "Calendar defense",
    body: "Every invitation is triaged against your goals before it earns a slot. Focus blocks stay intact.",
  },
  {
    icon: MiniMail,
    title: "Email drafting",
    body: "Replies are drafted from your notes and priorities, ready for one tap — never sent without you.",
  },
  {
    icon: MiniCrm,
    title: "Follow-up CRM",
    body: "Loose ends, blockers and unanswered threads get owners and dates — before they become fires.",
  },
];

const SYSTEM_ROWS = [
  { row: "Compile", body: "Slack, Gmail, GitHub, Calendly, Trello — one pipeline, one source of truth." },
  { row: "Prioritize", body: "Signals are ranked against your goals, never by the loudest app." },
  { row: "Decide", body: "Choices are captured with context and confidence, saved forever." },
  { row: "Execute", body: "A standing plan that re-builds itself every morning. You just run it." },
];

const PRICING = [
  {
    name: "Founder",
    price: "0",
    cadence: "forever",
    tagline: "For solo operators building quietly.",
    dark: false,
    items: ["Full daily briefing", "4 integrated channels", "Decision log", "Priority community line"],
  },
  {
    name: "Firm",
    price: "29",
    cadence: "per month",
    tagline: "For small teams that ship on a rhythm.",
    dark: true,
    items: ["Everything in Founder", "Unlimited integrations", "Shared team command post", "Calendar defense + sync"],
  },
];

/* ── Animated counter ─────────────────────────────────────── */
function Counter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration: 1.4, ease: EASE, onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>{display}</span>;
}

/* ── Rotating hero verb ───────────────────────────────────── */
function Rotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % ROTATOR_WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.i
        key={ROTATOR_WORDS[i]}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ fontStyle: "italic", display: "inline-block" }}
      >
        {ROTATOR_WORDS[i]}
      </motion.i>
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const goAuth = () => navigate("/login");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const compRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: compRef, offset: ["start end", "end start"] });
  const orbAY = useTransform(scrollYProgress, [0, 1], [26, -48]);
  const orbBY = useTransform(scrollYProgress, [0, 1], [40, -30]);
  const orbAX = useTransform(scrollYProgress, [0, 1], [-8, 14]);
  const orbBX = useTransform(scrollYProgress, [0, 1], [8, -14]);

  const subscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <div className="fd-landing fd-grain" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      {/* ── Navigation ───────────────────────────────────── */}
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
        style={{ position: "fixed", top: 16, left: 0, right: 0, zIndex: 60, padding: "0 20px", pointerEvents: "none" }}
      >
        <nav
          className={scrolled ? "fd-glass" : "fd-glass-soft"}
          style={{
            maxWidth: 1220,
            margin: "0 auto",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 10px 9px 22px",
            pointerEvents: "auto",
            transition: "box-shadow 300ms ease",
            boxShadow: scrolled ? "0 16px 40px -18px rgba(45,45,45,0.22)" : "inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <Brand />
          <div className="fd-body" style={{ display: "none", gap: 30, color: "var(--fd-ink-2)", fontSize: 13.5, fontWeight: 500, alignItems: "center", marginRight: 10 }}>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={{ textDecoration: "none", color: "inherit", transition: "color 160ms ease" }}>
                {l.label}
              </a>
            ))}
          </div>
          <div className="fd-body" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={goAuth} className="fd-btn-ghost fd-btn-sm" style={{ border: "none", background: "transparent", cursor: "pointer" }}>
              Sign in
            </button>
            <button onClick={goAuth} className="fd-btn fd-btn-sm" style={{ height: 42 }}>
              Start free
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
              className="fd-btn-ghost"
              style={{ width: 42, height: 42, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, cursor: "pointer" }}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fd-glass fd-body"
              style={{ maxWidth: 1220, margin: "10px auto 0", borderRadius: 26, padding: "14px", display: "grid", gap: 4, pointerEvents: "auto" }}
            >
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", color: "var(--fd-ink-2)", fontSize: 15, fontWeight: 600, padding: "12px 16px", borderRadius: 12 }}>
                  {l.label}
                </a>
              ))}
              <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", color: "var(--fd-ink)", fontSize: 15, fontWeight: 700, padding: "12px 16px", borderRadius: 12 }}>
                Start free →
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ══ HERO — headline + illustrated command desk ═════ */}

      <section
        className="fd-field"
        style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "140px 24px 70px", overflow: "hidden" }}
      >
        <div style={{ maxWidth: 1220, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
          <div className="fd-grid-hero">
            {/* Headline column */}
            <motion.div variants={heroParent} initial="hidden" animate="visible" style={{ position: "relative", zIndex: 1 }}>
              <motion.span variants={heroChild} className="fd-chip fd-body" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, color: "var(--fd-ink-2)", marginBottom: 36 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--fd-ink)", opacity: 0.8 }} />
                Your AI Chief of Staff
              </motion.span>

              <motion.h1 variants={heroChild} className="fd-poster-h1">
                Everything you run,
                <br />
                compiled into one
                <motion.span style={{ display: "block", marginTop: 14 }}>
                  <span className="fd-quietword">QUIET</span>
                  <span>.&nbsp;view.</span>
                </motion.span>
              </motion.h1>

              <motion.p
                variants={heroChild}
                className="fd-body"
                style={{ margin: "26px 0 0", maxWidth: 460, fontSize: 15.5, lineHeight: 1.7, color: "var(--fd-ink-2)", fontWeight: 450 }}
              >
                FounDesk reads your tools, hand-picks what actually matters, and
                hands you a briefing that <Rotator /> your morning. Decisions get
                logged. Follow-ups stop slipping.
              </motion.p>

              <motion.div variants={heroChild} className="fd-body" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
                <button onClick={goAuth} className="fd-btn">
                  Start free <ArrowRight size={16} strokeWidth={2} />
                </button>
                <a href="#doctrine" className="fd-btn fd-btn-ghost" style={{ textDecoration: "none" }}>
                  Read the manifesto
                </a>
              </motion.div>

              <motion.div variants={heroChild} className="fd-body" style={{ display: "flex", gap: 22, marginTop: 30, flexWrap: "wrap" }}>
                {[
                  { v: <Counter value={4} />, l: "min daily read" },
                  { v: <Counter value={7} />, l: "apps compiled" },
                  { v: <Counter value={100} />, l: "% decisions kept" },
                ].map((s) => (
                  <div key={s.l} style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                    <span className="fd-display" style={{ fontSize: 22, margin: 0, lineHeight: 1 }}>
                      {s.v}
                    </span>
                    <span className="fd-kicker" style={{ fontSize: 10.5 }}>{s.l}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Illustrated command desk */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.35, ease: EASE }}
              ref={compRef}
              style={{ position: "relative", zIndex: 2 }}
            >
              <motion.div style={{ position: "absolute", width: 250, height: 250, top: -60, left: -70, y: orbAY, x: orbAX, zIndex: 0 }} className="fd-orb fd-float-slow">
                <div style={{ width: "100%", height: "100%", borderRadius: 999, background: "radial-gradient(circle at 35% 35%, #EFE3D2, rgba(239,227,210,0) 70%)" }} />
              </motion.div>
              <motion.div style={{ position: "absolute", width: 300, height: 300, bottom: -70, right: -50, y: orbBY, x: orbBX, zIndex: 0 }} className="fd-orb">
                <div style={{ width: "100%", height: "100%", borderRadius: 999, background: "radial-gradient(circle at 60% 60%, #E4D8C6, rgba(228,216,198,0) 72%)" }} />
              </motion.div>

              <div className="fd-clay" style={{ position: "relative", zIndex: 1, borderRadius: 44, padding: 10 }}>
                <DeskScene style={{ width: "100%", height: "auto", display: "block", borderRadius: 34 }} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Marquee ───────────────────────────────────────── */}
      <section className="fd-marquee" style={{ padding: "30px 0", borderTop: "1px solid rgba(45,45,45,0.06)" }}>
        <div className="fd-marquee-track">
          {[...Array(2)].flatMap((_, dup) =>
            ["Compile", "Prioritize", "Decide", "Automate", "Brief", "Execute"].map((w, i) => (
              <span key={`${dup}-${i}`} className="fd-display fd-marquee-word" style={{ display: "inline-flex", alignItems: "center", gap: 56, fontSize: 22, fontStyle: "italic", whiteSpace: "nowrap" }}>
                {w}
                <span style={{ fontSize: 11, fontStyle: "normal", color: "var(--fd-fog)" }}>✦</span>
              </span>
            )),
          )}
        </div>
      </section>

      {/* ══ MANIFEST ═══════════════════════════════════════ */}
      <section id="doctrine" className="fd-anchor fd-field" style={{ padding: "120px 24px 30px", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="fd-grid-split">
            <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-90px" }}>
              <div className="fd-kicker" style={{ marginBottom: 18 }}>The Manifesto</div>
              <h2 className="fd-display" style={{ fontSize: "clamp(2.2rem, 3.9vw, 3.4rem)", margin: 0, lineHeight: 0.98, maxWidth: 680 }}>
                Software should feel <em>quiet.</em>
                <br />
                Do its work, hand you
                <br />
                a briefing, step aside.
              </h2>
              <p className="fd-body" style={{ margin: "24px 0 0", maxWidth: 440, fontSize: 15, lineHeight: 1.7, color: "var(--fd-ink-2)" }}>
                One compiled view of everything you run — read in four
                minutes, then forgotten.
              </p>
            </motion.div>
            <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-90px" }} style={{ position: "relative", maxWidth: 420, margin: "0 auto" }}>
              <div className="fd-clay" style={{ borderRadius: "50%", padding: 16 }}>
                <Rings style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            </motion.div>
          </div>

          <div className="fd-grid-rules" style={{ marginTop: 74, borderTop: "1px solid rgba(45,45,45,0.12)" }}>
            {DOCTRINE_RULES.map((r, i) => (
              <motion.div
                key={r.t}
                variants={riseIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: (i % 3) * 0.08 }}
                className="fd-rule-row"
              >
                <div className="fd-rule-index">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="fd-rule-title">{r.t}</div>
                  <p className="fd-rule-body">{r.b}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPONENTS — illustrated trio ══════════════════ */}
      <section id="principles" className="fd-anchor fd-field" style={{ padding: "120px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <div className="fd-kicker" style={{ marginBottom: 18 }}>Components</div>
            <h2 className="fd-display" style={{ fontSize: "clamp(2.1rem, 3.7vw, 3.2rem)", margin: 0, lineHeight: 0.98, maxWidth: 620 }}>
              Precision over noise.
              <br />
              <em>Every single morning.</em>
            </h2>
          </motion.div>

          <div className="fd-grid-trio" style={{ marginTop: 62 }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={riseIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12 }}
                className="fd-clay fd-lift"
                style={{ borderRadius: 30, padding: 26, display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 132, height: 132, borderRadius: 26, background: "rgba(247,241,231,0.7)", border: "1px solid rgba(45,45,45,0.06)", display: "grid", placeItems: "center", padding: 6, overflow: "hidden" }}>
                    <f.icon style={{ width: "100%", height: "100%", display: "block" }} />
                  </div>
                  <div className="fd-bignum">0{i + 1}</div>
                </div>
                <div style={{ borderTop: "1px solid rgba(45,45,45,0.08)", paddingTop: 18 }}>
                  <h3 className="fd-display" style={{ fontSize: 26, margin: 0, marginBottom: 8, lineHeight: 1.05 }}>{f.title}</h3>
                  <p className="fd-body" style={{ fontSize: 14, lineHeight: 1.65, color: "var(--fd-ink-2)", margin: 0 }}>
                    {f.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RUNWAY — ink band ═══════════════════════════════ */}
      <section id="system" className="fd-anchor fd-field-ink" style={{ padding: "120px 24px 130px", color: "#F8F5F2", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 }} className="fd-grid-split-wide">
          <div>
            <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
              <div className="fd-kicker fd-kicker-ink" style={{ marginBottom: 16 }}>The Operating System</div>
              <h2 className="fd-display" style={{ fontSize: "clamp(2.1rem, 3.9vw, 3.3rem)", margin: "0 0 30px", lineHeight: 0.98, color: "#F8F5F2" }}>
                No dashboard guilt.
                <br />
                Just a calm, compiled <em style={{ color: "inherit" }}>runway</em>.
              </h2>
            </motion.div>

            <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} className="fd-glass-ink" style={{ borderRadius: 26, padding: "4px 28px" }}>
              {SYSTEM_ROWS.map((s, i) => (
                <div key={s.row}>
                  {i > 0 && <div className="fd-hairline-ink" />}
                  <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", alignItems: "center", gap: 20, padding: "22px 0" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: "italic", fontSize: 13, color: "rgba(248,245,242,0.42)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="fd-display" style={{ fontStyle: "italic", fontSize: 28, color: "#F8F5F2", margin: 0, lineHeight: 1 }}>
                        {s.row}
                      </span>
                    </div>
                    <p className="fd-body" style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(248,245,242,0.62)", margin: 0 }}>
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} style={{ position: "relative", maxWidth: 460, margin: "0 auto" }}>
            <div className="fd-glass-ink" style={{ borderRadius: "50%", padding: 18, border: "1px solid rgba(248,245,242,0.16)" }}>
              <Streaks style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ PRICING ════════════════════════════════════════ */}
      <section id="pricing" className="fd-anchor fd-field" style={{ padding: "120px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} style={{ textAlign: "center", maxWidth: 520, margin: "0 auto 58px" }}>
            <div className="fd-kicker" style={{ marginBottom: 14 }}>Pricing</div>
            <h2 className="fd-display" style={{ fontSize: "clamp(2.1rem, 3.8vw, 3.3rem)", margin: 0, lineHeight: 0.98 }}>
              Start free.
              <br />
              Upgrade when it <em>compounds.</em>
            </h2>
          </motion.div>

          <div className="fd-grid-duo">
            {PRICING.map((p, i) => (
              <motion.div
                key={p.name}
                variants={riseIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12 }}
                className={p.dark ? "fd-field-ink" : "fd-clay fd-lift"}
                style={{ borderRadius: 30, padding: 32, position: "relative", display: "flex", flexDirection: "column" }}
              >
                {p.dark && (
                  <span className="fd-body" style={{ position: "absolute", top: 22, right: 22, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F8F5F2", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "6px 13px" }}>
                    Most chosen
                  </span>
                )}
                <div style={{ color: p.dark ? "#F8F5F2" : "var(--fd-ink)" }}>
                  <div className="fd-kicker" style={{ marginBottom: 10, ...(p.dark ? { color: "rgba(248,245,242,0.55)" } : {}) }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="fd-display" style={{ fontSize: 52, lineHeight: 1, margin: 0 }}>${p.price}</span>
                    <span className="fd-body" style={{ fontSize: 13.5, color: p.dark ? "rgba(248,245,242,0.55)" : "var(--fd-ink-3)", fontWeight: 600 }}>{p.cadence}</span>
                  </div>
                  <p className="fd-body" style={{ fontSize: 14, lineHeight: 1.55, margin: "14px 0 24px", color: p.dark ? "rgba(248,245,242,0.6)" : "var(--fd-ink-2)" }}>
                    {p.tagline}
                  </p>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12, marginBottom: 30 }}>
                  {p.items.map((it) => (
                    <li key={it} className="fd-body" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600, color: p.dark ? "#F8F5F2" : "var(--fd-ink-2)" }}>
                      <span style={{ width: 22, height: 22, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0, background: p.dark ? "rgba(255,255,255,0.14)" : "rgba(45,45,45,0.08)", color: p.dark ? "#F8F5F2" : "var(--fd-ink)" }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {it}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto" }}>
                  <button onClick={goAuth} className={`fd-btn ${p.dark ? "fd-btn-light" : ""}`} style={{ width: "100%" }}>
                    {p.price === "0" ? "Get started" : "Start free"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="fd-body" style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--fd-ink-3)", fontWeight: 500 }}>
            All plans begin with a real briefing tonight · Cancel anytime
          </p>
        </div>
      </section>

      {/* ══ FOUNDERS CTA ═══════════════════════════════════ */}
      <section id="founders" className="fd-anchor fd-field-ink" style={{ padding: "110px 24px", position: "relative", overflow: "hidden" }}>
        <div className="fd-orb fd-float-slow" style={{ position: "absolute", width: 480, height: 480, bottom: -220, right: -120, background: "radial-gradient(circle at 45% 45%, rgba(150,145,138,0.2), transparent 70%)" }} />
        <motion.div variants={riseIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} style={{ position: "relative", maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <div className="fd-kicker fd-kicker-ink" style={{ marginBottom: 18 }}>Built for founders</div>
          <h2 className="fd-display" style={{ fontSize: "clamp(2.3rem, 4.2vw, 3.6rem)", margin: "0 0 22px", lineHeight: 0.94, color: "#F8F5F2" }}>
            Make the morning
            <br />
            your <em style={{ color: "inherit" }}>unfair advantage.</em>
          </h2>
          <p className="fd-body" style={{ maxWidth: 460, margin: "0 auto 38px", fontSize: 15.5, lineHeight: 1.7, color: "rgba(248,245,242,0.66)" }}>
            Four minutes a day. A compiled view of everything you run. Start free
            and let FounDesk build your first briefing tonight.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={goAuth} className="fd-btn fd-btn-light" style={{ height: 56, padding: "0 38px", fontSize: 15 }}>
              Start free <ArrowRight size={16} />
            </button>
          </div>
          <div className="fd-body" style={{ marginTop: 16, fontSize: 13, color: "rgba(248,245,242,0.45)", fontWeight: 500 }}>
            No credit card · Cancel anytime
          </div>
        </motion.div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════ */}
      <footer className="fd-field" style={{ padding: "90px 24px 0" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="fd-grid-footer" style={{ marginBottom: 80 }}>
            <div>
              <Brand />
              <p className="fd-body" style={{ marginTop: 18, fontSize: 14.5, lineHeight: 1.7, color: "var(--fd-ink-2)", maxWidth: 340 }}>
                One quiet place for everything you run. A four-minute briefing,
                built fresh every morning.
              </p>
            </div>
            <div>
              <div className="fd-kicker" style={{ marginBottom: 14 }}>The quiet post</div>
              <p className="fd-body" style={{ fontSize: 13.5, color: "var(--fd-ink-2)", margin: "0 0 14px" }}>
                One idea on focus and execution, twice a month.
              </p>
              <form onSubmit={subscribe} style={{ display: "flex", gap: 10 }}>
                <div className="fd-news fd-glass-soft" style={{ flex: 1, minWidth: 0 }}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" aria-label="Email address" required />
                  <button type="submit" className="fd-btn fd-btn-sm" aria-label="Subscribe">
                    {subscribed ? <Check size={15} /> : <ArrowRight size={15} />}
                  </button>
                </div>
              </form>
              <div className="fd-body" style={{ marginTop: 10, fontSize: 12.5, color: "var(--fd-ink-3)", fontWeight: 600, minHeight: 18 }}>
                {subscribed ? "You're in. See you at the briefing." : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 30, flexWrap: "wrap", paddingBottom: 40 }}>
            <div className="fd-body" style={{ display: "flex", gap: 26, order: 2 }}>
              {["Privacy", "Terms", "Contact", "Status"].map((l) => (
                <a key={l} href="#top" onClick={(e) => e.preventDefault()} style={{ textDecoration: "none", fontSize: 13, fontWeight: 600, color: "var(--fd-ink-2)", transition: "color 160ms ease", cursor: "pointer" }}>
                  {l}
                </a>
              ))}
            </div>
            <div className="fd-body" style={{ fontSize: 13, color: "var(--fd-ink-3)", fontWeight: 500, order: 1 }}>
              © {new Date().getFullYear()} FounDesk. All rights reserved.
            </div>
          </div>

          <div className="fd-hairline" />
          <div style={{ textAlign: "center", overflow: "hidden", paddingTop: 36 }}>
            <h2 className="fd-wordmark fd-outline" aria-hidden="true">
              FounDesk.
            </h2>
          </div>
        </div>
      </footer>
    </div>
  );
}