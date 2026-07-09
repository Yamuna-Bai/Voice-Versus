import { useState, useEffect, useRef } from "react";
import "./landing.css";

const REVEAL_STEPS = [
  {
    step: "01",
    icon: "🤖",
    title: "Meet Alex — Your AI Opponent",
    desc: "Alex isn't a chatbot. It's a fully adaptive debate engine that reads your argument, identifies weak points, and fires back with logic, pressure, and evidence — all in real-time.",
    tag: "AI ENGINE",
    color: "#00d4ff",
    checkLabel: "Adaptive opponent ready",
  },
  {
    step: "02",
    icon: "🎙️",
    title: "Speak, Don't Type",
    desc: "Open your mic and argue. The system transcribes every word you say, detects silence to know when you're done, and routes your speech into the scoring engine instantly.",
    tag: "VOICE FIRST",
    color: "#7b2fff",
    checkLabel: "Voice recognition active",
  },
  {
    step: "03",
    icon: "👁️",
    title: "Camera Reads Your Confidence",
    desc: "Your face tells the truth. Eye contact, head movement, expression stability — all tracked live. You'll get a confidence score most speakers never see about themselves.",
    tag: "CONFIDENCE AI",
    color: "#00ff88",
    checkLabel: "Facial analysis online",
  },
  {
    step: "04",
    icon: "⚡",
    title: "Fallacies Caught in Real-Time",
    desc: "Ad hominem. Strawman. Appeal to authority. The engine flags logical fallacies in your argument mid-round — so you learn to reason better, not just speak louder.",
    tag: "LOGIC GUARD",
    color: "#ffc107",
    checkLabel: "Fallacy detection armed",
  },
  {
    step: "05",
    icon: "📊",
    title: "Full Debrief After Every Match",
    desc: "Round 5 ends and a complete score report drops — argument quality, evidence strength, rebuttal power, filler word count, eye contact %, and a coach note for next time.",
    tag: "SMART REPORT",
    color: "#ff4d6d",
    checkLabel: "Report system ready",
  },
];

const STATS = [
  { value: "5", label: "Debate Rounds" },
  { value: "6+", label: "Hot Topics" },
  { value: "3", label: "Difficulty Modes" },
  { value: "∞", label: "Rematches" },
];

const TICKER_ITEMS = [
  { icon: "🤖", text: "AI opponent adapts to YOUR argument style", color: "#00d4ff" },
  { icon: "🎙️", text: "Speak freely — voice-first, zero typing", color: "#7b2fff" },
  { icon: "👁️", text: "Facial confidence scored in real-time", color: "#00ff88" },
  { icon: "⚡", text: "Fallacy detection on every argument", color: "#ffc107" },
  { icon: "🔥", text: "3 difficulty modes — Easy to Ruthless", color: "#ff4d6d" },
  { icon: "📊", text: "Full debate report after 5 rounds", color: "#00d4ff" },
  { icon: "🧠", text: "AI rebuttal powered by Groq", color: "#7b2fff" },
  { icon: "🎯", text: "6+ debate topics — or bring your own", color: "#00ff88" },
  { icon: "🏆", text: "Score breakdown: logic · evidence · delivery", color: "#ffc107" },
  { icon: "🗣️", text: "Silence detection — argue at your own pace", color: "#00d4ff" },
];

const HOW_STEPS = [
  {
    step: "01",
    icon: "🎯",
    title: "Pick a topic & stance",
    desc: "Choose from 6 debate topics or write your own. Pick FOR or AGAINST. Set difficulty from Easy to Ruthless.",
    color: "#00d4ff",
  },
  {
    step: "02",
    icon: "🎙️",
    title: "Speak your argument",
    desc: "Press the mic and speak. No typing needed. Silence detection stops recording when you're done.",
    color: "#7b2fff",
  },
  {
    step: "03",
    icon: "🤖",
    title: "Alex fires back",
    desc: "Your AI opponent analyzes your argument and delivers a voice rebuttal with logic, evidence, and pressure.",
    color: "#00ff88",
  },
  {
    step: "04",
    icon: "📊",
    title: "Get your report",
    desc: "After 5 rounds, see your full score breakdown: arguments, fallacies, facial confidence, and language analysis.",
    color: "#ffc107",
  },
];

// ─────────────────────────────────────────────
// TICKER
// ─────────────────────────────────────────────

function TickerStrip() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      position: "fixed", top: "62px", left: 0, right: 0, zIndex: 99,
      overflow: "hidden", height: "36px", display: "flex", alignItems: "center",
      background: "rgba(2,5,16,0.72)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(0,212,255,0.12)",
      borderTop: "1px solid rgba(0,212,255,0.07)",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "80px", background: "linear-gradient(to right, rgba(2,5,16,0.95), transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "80px", background: "linear-gradient(to left, rgba(2,5,16,0.95), transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", animation: "tickerScroll 38s linear infinite", whiteSpace: "nowrap", willChange: "transform" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "0 32px", borderRight: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}`, flexShrink: 0 }} />
            <span style={{ fontSize: "10px", color: "#fff", opacity: 0.35 }}>{item.icon}</span>
            <span style={{ fontSize: "10.5px", fontFamily: "'Courier New', monospace", letterSpacing: "1.8px", color: item.color, fontWeight: "600", opacity: 0.85, textTransform: "uppercase" }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CHECK ICON
// ─────────────────────────────────────────────

function CheckIcon({ color, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.5" stroke={color} strokeWidth="1" fill={`${color}18`} />
      <path d="M4.5 8.5L6.5 10.5L11 5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// STEP REVEAL SECTION (below hero)
// ─────────────────────────────────────────────

function StepRevealSection({ onGetStarted }) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [progress, setProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const intervalRef = useRef(null);
  const STEP_DURATION = 3200;

  useEffect(() => {
    setProgress(0);
    const tickInterval = 40;
    const ticks = STEP_DURATION / tickInterval;
    let tick = 0;
    intervalRef.current = setInterval(() => {
      tick++;
      setProgress(Math.min((tick / ticks) * 100, 100));
      if (tick >= ticks) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, tickInterval);
    return () => clearInterval(intervalRef.current);
  }, [activeStep]);

  function goNext() {
    setCompletedSteps(prev => prev.includes(activeStep) ? prev : [...prev, activeStep]);
    setContentVisible(false);
    setTimeout(() => {
      setActiveStep(prev => (prev + 1) % REVEAL_STEPS.length);
      setContentVisible(true);
    }, 220);
  }

  function goTo(index) {
    if (index === activeStep) return;
    clearInterval(intervalRef.current);
    if (index > activeStep) {
      setCompletedSteps(prev => {
        const next = [...prev];
        for (let i = activeStep; i < index; i++) {
          if (!next.includes(i)) next.push(i);
        }
        return next;
      });
    }
    setContentVisible(false);
    setTimeout(() => {
      setActiveStep(index);
      setProgress(0);
      setContentVisible(true);
    }, 220);
  }

  const step = REVEAL_STEPS[activeStep];
  const allDone = completedSteps.length >= REVEAL_STEPS.length - 1;

  return (
    <section style={{ width: "100%", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "268px 1fr", gap: "0", minHeight: "400px" }}>

        {/* Left stepper */}
        <div style={{ borderRight: "1px solid rgba(0,212,255,0.08)", paddingRight: "28px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {REVEAL_STEPS.map((s, i) => {
            const isDone = completedSteps.includes(i);
            const isActive = i === activeStep;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  background: isActive ? `${s.color}0c` : "transparent",
                  border: `1px solid ${isActive ? s.color + "30" : "transparent"}`,
                  borderRadius: "12px", padding: "13px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "12px",
                  transition: "all 0.3s ease", textAlign: "left", width: "100%",
                }}
              >
                <div style={{ width: "28px", height: "28px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isDone ? (
                    <div style={{ animation: "tickPop 0.35s cubic-bezier(.2,1.6,.4,1) both" }}>
                      <CheckIcon color={s.color} size={24} />
                    </div>
                  ) : (
                    <div style={{
                      width: "26px", height: "26px", borderRadius: "50%",
                      border: `1px solid ${isActive ? s.color + "60" : "rgba(255,255,255,0.1)"}`,
                      background: isActive ? `${s.color}15` : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "9px", color: isActive ? s.color : "#3a5a7a",
                      fontFamily: "'Courier New', monospace", fontWeight: "700",
                      letterSpacing: "0.5px", transition: "all 0.3s",
                    }}>
                      {s.step}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "9px", color: isActive ? s.color : "#2a4a6a", letterSpacing: "2px", marginBottom: "3px", fontFamily: "'Courier New', monospace", transition: "color 0.3s" }}>
                    {s.tag}
                  </div>
                  <div style={{ fontSize: "11.5px", color: isActive ? "#e8f0ff" : isDone ? "#5a7a9a" : "#3a5a7a", fontWeight: isActive ? "700" : "400", letterSpacing: "0.5px", lineHeight: "1.4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "all 0.3s" }}>
                    {s.title}
                  </div>
                </div>
                {isDone && !isActive && (
                  <span style={{ fontSize: "9px", color: s.color, opacity: 0.5, flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}

          <div style={{ marginTop: "20px", paddingLeft: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "9px", color: "#2a4a6a", letterSpacing: "2px" }}>STEP {activeStep + 1} / {REVEAL_STEPS.length}</span>
              <span style={{ fontSize: "9px", color: step.color, letterSpacing: "1px", opacity: 0.6 }}>AUTO</span>
            </div>
            <div style={{ height: "2px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${step.color}, ${step.color}88)`, borderRadius: "2px", transition: "width 0.04s linear", boxShadow: `0 0 6px ${step.color}80` }} />
            </div>
          </div>
        </div>

        {/* Right content */}
        <div style={{
          paddingLeft: "52px", display: "flex", flexDirection: "column", justifyContent: "center",
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: `${step.color}10`, border: `1px solid ${step.color}30`, borderRadius: "20px", padding: "5px 14px", width: "fit-content", marginBottom: "28px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: step.color, boxShadow: `0 0 6px ${step.color}`, animation: "pulseDot 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "9px", color: step.color, letterSpacing: "3px", fontFamily: "'Courier New', monospace" }}>{step.tag}</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "22px" }}>
            <div style={{ width: "72px", height: "72px", flexShrink: 0, borderRadius: "20px", background: `${step.color}0f`, border: `1px solid ${step.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
              {step.icon}
            </div>
            <div>
              <div style={{ fontSize: "9px", color: step.color, letterSpacing: "2px", marginBottom: "6px", opacity: 0.6 }}>STEP {step.step}</div>
              <h3 style={{ fontSize: "clamp(18px, 2vw, 24px)", fontWeight: "900", color: "#e8f0ff", margin: 0, letterSpacing: "2px", lineHeight: "1.2" }}>{step.title}</h3>
            </div>
          </div>

          <p style={{ fontSize: "14px", color: "#7a9ab8", lineHeight: "1.8", maxWidth: "520px", margin: "0 0 32px", letterSpacing: "0.3px" }}>
            {step.desc}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 18px", background: `${step.color}08`, border: `1px solid ${step.color}22`, borderRadius: "10px", width: "fit-content" }}>
            <CheckIcon color={step.color} size={18} />
            <span style={{ fontSize: "11px", color: step.color, letterSpacing: "1.5px", fontFamily: "'Courier New', monospace", fontWeight: "600" }}>
              {step.checkLabel}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "28px", alignItems: "center" }}>
            <button
              onClick={() => goTo(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              style={{ width: "38px", height: "38px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: activeStep === 0 ? "#1a2a3a" : "#4a6a8a", cursor: activeStep === 0 ? "not-allowed" : "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >←</button>
            <button
              onClick={() => goTo(Math.min(REVEAL_STEPS.length - 1, activeStep + 1))}
              disabled={activeStep === REVEAL_STEPS.length - 1}
              style={{ width: "38px", height: "38px", borderRadius: "50%", background: `${step.color}15`, border: `1px solid ${step.color}30`, color: activeStep === REVEAL_STEPS.length - 1 ? "#1a2a3a" : step.color, cursor: activeStep === REVEAL_STEPS.length - 1 ? "not-allowed" : "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >→</button>
            <span style={{ fontSize: "10px", color: "#2a4a6a", letterSpacing: "1px", marginLeft: "6px" }}>
              {allDone ? "ALL FEATURES UNLOCKED ✓" : "AUTO TICKING · CLICK TO JUMP"}
            </span>
          </div>
        </div>
      </div>

      {allDone && (
        <div style={{ marginTop: "40px", padding: "28px 32px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px", animation: "fadeSlideUp 0.6s ease both" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#00d4ff", letterSpacing: "3px", marginBottom: "6px" }}>ALL SYSTEMS GO</div>
            <div style={{ fontSize: "17px", fontWeight: "700", color: "#e8f0ff", letterSpacing: "1px" }}>You've seen everything. Ready to debate?</div>
          </div>
          <button onClick={onGetStarted}
            style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)", border: "none", color: "white", padding: "14px 36px", borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "3px", boxShadow: "0 8px 28px rgba(0,212,255,0.25)" }}>
            START NOW →
          </button>
        </div>
      )}
    </section>
  );
}

function FloatingParticle({ style }) {
  return <div style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", ...style }} />;
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function LandingPage({ onGetStarted, onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const revealRef = useRef(null);
  const howRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="landing-root" style={{ minHeight: "100vh", background: "linear-gradient(170deg, #020510 0%, #060c1a 50%, #020510 100%)", color: "#e8f0ff", fontFamily: "'Courier New', monospace", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(2,5,16,0.88)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(0,212,255,0.1)" : "none", transition: "all 0.4s ease", padding: "18px 48px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => scrollTo(revealRef)} style={{ background: "transparent", border: "none", color: "#4a6a8a", cursor: "pointer", fontFamily: "'Courier New',monospace", fontSize: "11px", letterSpacing: "1.5px" }}>FEATURES</button>
          <button onClick={() => scrollTo(howRef)} style={{ background: "transparent", border: "none", color: "#4a6a8a", cursor: "pointer", fontFamily: "'Courier New',monospace", fontSize: "11px", letterSpacing: "1.5px" }}>HOW IT WORKS</button>
          <button onClick={onLogin}
            style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", padding: "8px 18px", borderRadius: "20px", cursor: "pointer", fontFamily: "'Courier New',monospace", fontSize: "11px", letterSpacing: "2px", transition: "all 0.2s" }}
            onMouseEnter={e => { e.target.style.background = "rgba(0,212,255,0.16)"; }}
            onMouseLeave={e => { e.target.style.background = "rgba(0,212,255,0.08)"; }}>
            LOGIN
          </button>
        </div>
      </nav>



      {/* ── HERO: Two-column — title left, features right ── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "48px",
        alignItems: "center",
        padding: "120px 48px 52px",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)", backgroundSize: "70px 70px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(0,80,220,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Particles */}
        {[
          { width: "4px", height: "4px", background: "rgba(0,212,255,0.5)", top: "20%", left: "4%", animation: "particleFloat1 8s ease-in-out infinite" },
          { width: "5px", height: "5px", background: "rgba(123,47,255,0.5)", bottom: "25%", left: "2%", animation: "particleFloat2 11s ease-in-out infinite" },
        ].map((p, i) => <FloatingParticle key={i} style={p} />)}

        {/* ── LEFT: Title + CTA + Stats ── */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="brand-name" style={{ fontSize: "clamp(48px, 7vw, 92px)", margin: "0 0 32px", animation: "logoPop 1.2s cubic-bezier(0.2, 1.2, 0.3, 1) 0.1s both, logoGlow 3s ease-in-out 1.3s infinite alternate", textTransform: "uppercase" }}>
            VOICE VERSUS
          </h1>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px", animation: "fadeSlideUp 0.7s ease 0.3s both" }}>
            <button onClick={onGetStarted}
              style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)", border: "none", color: "white", padding: "12px 28px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", transition: "all 0.3s", boxShadow: "0 6px 24px rgba(0,212,255,0.25)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,212,255,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,212,255,0.25)"; }}>
              GET STARTED →
            </button>
            <button onClick={onLogin}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.15)", color: "#c8d8e8", padding: "12px 24px", borderRadius: "12px", fontSize: "12px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", transition: "all 0.3s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}>
              LOGIN
            </button>
          </div>

          <div style={{ display: "flex", gap: "28px", animation: "fadeSlideUp 0.7s ease 0.4s both" }}>
            {STATS.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: "22px", fontWeight: "900", color: "#00d4ff", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "9px", color: "#3a5a7a", letterSpacing: "2px", marginTop: "4px" }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Step Reveal Section ── */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <StepRevealSection onGetStarted={onGetStarted} />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section ref={howRef} style={{ padding: "80px 48px", background: "radial-gradient(circle at 50% 0%, rgba(0,212,255,0.08), transparent 34%)", borderTop: "1px solid rgba(0,212,255,0.07)", borderBottom: "1px solid rgba(0,212,255,0.07)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.018) 1px,transparent 1px)", backgroundSize: "68px 68px", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", color: "#00d4ff", letterSpacing: "4px", marginBottom: "14px" }}>[ THE FLOW ]</div>
            <h2 style={{ fontSize: "clamp(22px,3.5vw,36px)", fontWeight: "900", margin: 0, letterSpacing: "3px" }}>HOW IT WORKS</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
            {HOW_STEPS.map((s, i) => (
              <div
                key={s.step}
                style={{
                  position: "relative", minHeight: "240px", padding: "22px",
                  borderRadius: "20px",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))",
                  border: `1px solid ${s.color}26`,
                  overflow: "hidden",
                  transition: "transform 0.28s ease, border-color 0.28s ease",
                  animation: `howPop 0.72s cubic-bezier(.2,1.1,.2,1) ${i * 0.14}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px) scale(1.02)"; e.currentTarget.style.borderColor = `${s.color}60`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = `${s.color}26`; }}
              >
                <div style={{ position: "absolute", inset: "-45% -20% auto auto", width: "160px", height: "160px", borderRadius: "50%", background: s.color, filter: "blur(58px)", opacity: 0.1, pointerEvents: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: `${s.color}12`, border: `1px solid ${s.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                    {s.icon}
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${s.color}10`, border: `1px solid ${s.color}45`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                    {s.step}
                  </div>
                </div>
                <h3 style={{ margin: "0 0 10px", color: "#e8f0ff", fontSize: "16px", lineHeight: "1.35", letterSpacing: "1px" }}>{s.title}</h3>
                <p style={{ margin: 0, color: "#7a9ab8", fontSize: "12.5px", lineHeight: "1.75" }}>{s.desc}</p>
                <div style={{ position: "absolute", left: "22px", right: "22px", bottom: "18px", height: "2px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{ width: "54%", height: "100%", borderRadius: "999px", background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`, animation: `flowLine 2.6s ease-in-out ${i * 0.2}s infinite` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "80px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(123,47,255,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ fontSize: "10px", color: "#7b2fff", letterSpacing: "4px", marginBottom: "18px" }}>[ READY? ]</div>
          <h2 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: "900", margin: "0 0 18px", letterSpacing: "3px", background: "linear-gradient(90deg,#00d4ff,#7b2fff,#00ff88)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ENTER THE ARENA
          </h2>
          <p style={{ fontSize: "14px", color: "#5a7a9a", lineHeight: "1.7", marginBottom: "36px" }}>One topic. Five rounds. Full report. No excuses.</p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onGetStarted}
              style={{ background: "linear-gradient(135deg,#00d4ff,#7b2fff)", border: "none", color: "white", padding: "16px 44px", borderRadius: "14px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "3px", transition: "all 0.3s", boxShadow: "0 8px 30px rgba(0,212,255,0.3)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
              START DEBATING →
            </button>
            <button onClick={onLogin}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#8aa8c8", padding: "16px 32px", borderRadius: "14px", fontSize: "13px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "#c8d8e8"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#8aa8c8"; }}>
              I HAVE AN ACCOUNT
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "36px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "5px", background: "linear-gradient(90deg,#00d4ff,#7b2fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VOICE VERSUS</div>
        <div style={{ display: "flex", gap: "24px" }}>
          {["About", "Contact", "Privacy"].map(link => (
            <span key={link} style={{ fontSize: "11px", color: "#2a4a6a", cursor: "pointer", letterSpacing: "1.5px", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#4a8aaa"}
              onMouseLeave={e => e.target.style.color = "#2a4a6a"}>
              {link.toUpperCase()}
            </span>
          ))}
        </div>
        <div style={{ fontSize: "10px", color: "#1a2a3a", letterSpacing: "1px" }}>AI DEBATE SYSTEM · LOCAL STORAGE ONLY</div>
      </footer>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes gradientShift {
          0%   { background-position:0% 50%; }
          50%  { background-position:100% 50%; }
          100% { background-position:0% 50%; }
        }
        @keyframes particleFloat1 {
          0%,100% { transform:translate(0,0) scale(1); opacity:.5; }
          33%     { transform:translate(14px,-18px) scale(1.3); opacity:.9; }
          66%     { transform:translate(-8px,10px) scale(.8); opacity:.4; }
        }
        @keyframes particleFloat2 {
          0%,100% { transform:translate(0,0) scale(1); opacity:.4; }
          40%     { transform:translate(-16px,14px) scale(1.2); opacity:.85; }
          70%     { transform:translate(10px,-8px) scale(.9); opacity:.35; }
        }
        @keyframes logoPop {
          0% { transform: scale(0.6) translateY(30px); opacity: 0; filter: blur(12px); letter-spacing: -2px; }
          60% { transform: scale(1.05) translateY(-5px); opacity: 1; filter: blur(0px); letter-spacing: 2px; }
          100% { transform: scale(1) translateY(0); opacity: 1; letter-spacing: 0px; }
        }
        @keyframes logoGlow {
          0% { filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.3)) drop-shadow(0 0 20px rgba(123, 47, 255, 0.2)); }
          100% { filter: drop-shadow(0 0 25px rgba(0, 212, 255, 0.7)) drop-shadow(0 0 45px rgba(123, 47, 255, 0.5)); transform: scale(1.01); }
        }
        @keyframes tickerScroll {
          0%   { transform:translateX(0); }
          100% { transform:translateX(-50%); }
        }
        @keyframes tickPop {
          0%   { transform:scale(0) rotate(-20deg); opacity:0; }
          70%  { transform:scale(1.25) rotate(5deg); opacity:1; }
          100% { transform:scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:.5; transform:scale(.75); }
        }
        @keyframes howPop {
          0%   { opacity:0; transform:translateY(34px) scale(.92); }
          70%  { opacity:1; transform:translateY(-4px) scale(1.02); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes flowLine {
          0%   { transform:translateX(-120%); opacity:.25; }
          45%  { opacity:1; }
          100% { transform:translateX(220%); opacity:.25; }
        }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.18); border-radius:4px; }
      `}</style>
    </div>
  );
}