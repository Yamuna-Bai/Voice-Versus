import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Avatar3D from "./Avatar3D";
import FacialAnalysis from "./FacialAnalysis";
import ConfidencePanel from "./ConfidencePanel";

const MAX_TURNS = 5;

function getBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Google US English",
    "Google UK English Male",
    "Google UK English Female",
    "Microsoft Mark - English (United States)",
    "Microsoft Zira - English (United States)",
    "Alex",
    "Daniel",
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name.toLowerCase() === name.toLowerCase());
    if (v) return v;
  }
  return voices.find(v => /natural|neural|online/i.test(v.name) && v.lang.startsWith("en"))
    || voices.find(v => v.lang === "en-US")
    || voices.find(v => v.lang.startsWith("en"))
    || voices[0]
    || null;
}

function humanizeSpeechText(text) {
  return (text || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—|–/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\b(Hold on|Look|Listen|Seriously|Come on)\b/gi, "$1,")
    .replace(/,\s*,/g, ",")
    .trim();
}

function getAlexSpeechSettings(text, difficulty = "medium") {
  const spoken = (text || "").toLowerCase();
  const isChallenge = /prove it|that doesn't hold|you know it|come on|seriously|hold on|what evidence|how exactly/.test(spoken);
  const isQuestion = /\?/.test(text || "");
  const longReply = (text || "").split(/\s+/).length > 75;
  const base = {
    easy: { rate: 0.92, pitch: 1.02 },
    medium: { rate: 0.96, pitch: 0.98 },
    hard: { rate: 1.0, pitch: 0.94 },
  }[difficulty] || { rate: 0.96, pitch: 0.98 };
  return {
    rate: Math.min(1.08, Math.max(0.86, base.rate + (isChallenge ? 0.04 : 0) - (longReply ? 0.03 : 0))),
    pitch: Math.min(1.08, Math.max(0.86, base.pitch - (isChallenge ? 0.04 : 0) + (isQuestion ? 0.02 : 0))),
    volume: 1,
  };
}

function createAlexUtterance(text, difficulty = "medium") {
  const utterance = new SpeechSynthesisUtterance(humanizeSpeechText(text));
  const voice = getBestVoice();
  const settings = getAlexSpeechSettings(text, difficulty);
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;
  if (voice) utterance.voice = voice;
  return utterance;
}

export default function ImmersiveDebateScreen({ user, topic, position, difficulty, onFinish, onLeaderboard }) {
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const containerRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const latestTurn = turns[turns.length - 1];
  const scores = turns.map(t => t.scores?.overall || 0);

  // Parallax mouse tracking
  useEffect(() => {
    function onMouseMove(e) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // Auto-finish
  useEffect(() => {
    if (turns.length >= MAX_TURNS) {
      setTimeout(() => onFinish(turns, analysisHistory), 1800);
    }
  }, [turns, analysisHistory, onFinish]);

  useEffect(() => {
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }, []);

  // Track recording time
  useEffect(() => {
    if (recording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [recording]);

  // Handle facial analysis updates
  const handleAnalysisUpdate = (analysis) => {
    setCurrentAnalysis(analysis);
    
    // Store analysis for post-debate report if speaking or thinking
    if (isSpeaking || isThinking) {
      setAnalysisHistory((prev) => {
        // Only add if not already added for this turn
        if (prev.length < turns.length) {
          return [...prev, analysis];
        }
        return prev;
      });
    }
  };

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true } });
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? { mimeType:"audio/webm;codecs=opus" } : {});
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = e => audioChunksRef.current.push(e.data);
      rec.start(250);
      setRecording(true);
      setStatus("🔊 Listening…");
    } catch (err) {
      setStatus("❌ Mic error: " + err.message);
    }
  }

  async function stopRecording() {
    return new Promise(resolve => {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || "audio/webm" });
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setRecording(false);
    });
  }

  async function handleVoiceDebate() {
    if (recording) {
      const audioBlob = await stopRecording();
      setLoading(true); setIsThinking(true); setStatus("⏳ Alex is thinking…");
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "audio.webm");
        formData.append("topic", topic.title);
        formData.append("position", position);
        formData.append("difficulty", difficulty);
        formData.append("history", JSON.stringify(turns));

        const res = await fetch("http://localhost:8000/debate/voice-turn", { method:"POST", body:formData });
        const data = await res.json();

        if (data.error) { setStatus("❌ " + data.error); setLoading(false); setIsThinking(false); return; }
        if (data.end) { setIsThinking(false); setIsSpeaking(false); setLoading(false); onFinish(turns, analysisHistory); return; }

        setTurns(prev => [...prev, { userArgument:data.user_text, aiResponse:data.ai_response, fallacies:data.fallacy_analysis, scores:data.scores }]);
        setIsThinking(false); setIsSpeaking(true); setStatus("💬 Alex is speaking…");
        window.speechSynthesis.cancel();

        if (!getBestVoice()) await new Promise(r => setTimeout(r, 300));
        const utt = createAlexUtterance(data.ai_response, difficulty);
        utt.onend = () => { setIsSpeaking(false); setStatus(""); setLoading(false); };
        window.speechSynthesis.speak(utt);
      } catch (err) {
        setStatus("❌ " + err.message);
        setLoading(false); setIsThinking(false); setIsSpeaking(false);
      }
    } else {
      await startRecording();
    }
  }

  const isActive = recording || isSpeaking || isThinking;
  
  // Glassmorphism panel variants
  const panelVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <div
      ref={containerRef}
      className="immersive-debate-screen"
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(135deg, #020510 0%, #0a0a1a 50%, #020510 100%)",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* ── ANIMATED GRADIENT BACKGROUND ── */}
      <motion.div
        animate={{
          background:
            isSpeaking
              ? "radial-gradient(ellipse at 50% 40%, rgba(255, 107, 53, 0.2) 0%, transparent 65%)"
              : recording
              ? "radial-gradient(ellipse at 50% 40%, rgba(220, 50, 50, 0.18) 0%, transparent 65%)"
              : isThinking
              ? "radial-gradient(ellipse at 50% 40%, rgba(255, 193, 7, 0.16) 0%, transparent 65%)"
              : "radial-gradient(ellipse at 50% 50%, rgba(0, 80, 200, 0.12) 0%, transparent 65%)",
        }}
        transition={{ duration: 0.8 }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── ANIMATED GRID BACKGROUND ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
          pointerEvents: "none",
          zIndex: 0,
          animation: "grid-drift 20s linear infinite",
        }}
      />

      {/* ── FLOATING PARTICLES ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -500, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5,
            }}
            style={{
              position: "absolute",
              width: "2px",
              height: "2px",
              borderRadius: "50%",
              background: "#00d4ff",
              left: `${(i * 8) % 100}%`,
              bottom: "-50px",
              boxShadow: "0 0 6px #00d4ff",
            }}
          />
        ))}
      </div>

      {/* ── FACIAL ANALYSIS (hidden camera) ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <FacialAnalysis isActive={recording || isSpeaking} onAnalysisUpdate={handleAnalysisUpdate} />
      </div>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#e8f0ff",
        }}
      >
        {/* ── TOP PANEL: Topic & Position Info ── */}
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: "absolute",
            top: "24px",
            left: "24px",
            right: "24px",
            maxWidth: "500px",
            background: "rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 212, 255, 0.15)",
            borderRadius: "16px",
            padding: "16px 20px",
            fontSize: "12px",
            zIndex: 10,
          }}
        >
          <div style={{ color: "#00d4ff", letterSpacing: "2px", marginBottom: "6px", fontWeight: "700" }}>
            {topic.icon} {topic.category}
          </div>
          <div style={{ color: "#8aa8c8", fontSize: "13px", fontWeight: "600" }}>{topic.title}</div>
          <div style={{ color: "#4a6a8a", fontSize: "11px", marginTop: "6px", letterSpacing: "1px" }}>
            YOUR POSITION: <span style={{ color: position === "FOR" ? "#00ff88" : "#ff4444" }}>{position}</span>
          </div>
        </motion.div>

        {/* ── ROUND COUNTER ── */}
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            background: "rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 212, 255, 0.15)",
            borderRadius: "16px",
            padding: "12px 20px",
            fontSize: "13px",
            fontWeight: "700",
            letterSpacing: "2px",
            zIndex: 10,
          }}
        >
          <span style={{ color: "#00d4ff" }}>R{turns.length + 1}</span>
          <span style={{ color: "#4a6a8a", marginLeft: "8px" }}>/5</span>
        </motion.div>

        {/* ── AVATAR WITH 3D PERSPECTIVE ── */}
        <motion.div
          style={{
            width: "100%",
            maxWidth: "550px",
            aspectRatio: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Avatar3D isActive={isActive} isSpeaking={isSpeaking} isThinking={isThinking} mousePos={mousePos} />
        </motion.div>

        {/* ── CONFIDENCE PANEL (Real-time Facial Feedback) ── */}
        <AnimatePresence>
          {(recording || isSpeaking) && (
            <ConfidencePanel analysis={currentAnalysis} isActive={recording || isSpeaking} recordingTime={recordingTime} />
          )}
        </AnimatePresence>

        {/* ── BOTTOM CONTROL PANEL ── */}
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: "absolute",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            zIndex: 10,
          }}
        >
          {/* Status text */}
          <AnimatePresence>
            {(recording || isSpeaking || isThinking) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  fontSize: "12px",
                  color:
                    isSpeaking ? "#ff6b35" : recording ? "#ff4444" : isThinking ? "#ffc107" : "#00d4ff",
                  fontWeight: "700",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                {status}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Mic Button */}
          <motion.button
            animate={{
              scale: recording ? [1, 1.15, 1] : 1,
              boxShadow: recording
                ? [
                    "0 0 20px rgba(255, 68, 68, 0.6), 0 0 60px rgba(255, 68, 68, 0.3)",
                    "0 0 40px rgba(255, 68, 68, 0.8), 0 0 100px rgba(255, 68, 68, 0.4)",
                    "0 0 20px rgba(255, 68, 68, 0.6), 0 0 60px rgba(255, 68, 68, 0.3)",
                  ]
                : "0 0 20px rgba(0, 212, 255, 0.4), 0 0 60px rgba(0, 212, 255, 0.2)",
            }}
            transition={{
              duration: recording ? 1.2 : 0.3,
              repeat: recording ? Infinity : 0,
            }}
            onClick={handleVoiceDebate}
            disabled={loading || turns.length >= MAX_TURNS}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: recording
                ? "linear-gradient(135deg, #ff4444, #ff6b35)"
                : turns.length >= MAX_TURNS ? "linear-gradient(135deg, #4a6a8a, #2a3a5a)"
                : "linear-gradient(135deg, #00d4ff, #7b2fff)",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              color: "white",
              fontSize: "32px",
              cursor: loading || turns.length >= MAX_TURNS ? "not-allowed" : "pointer",
              fontWeight: "700",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              position: "relative",
              opacity: loading || turns.length >= MAX_TURNS ? 0.6 : 1,
            }}
            whileHover={!loading && turns.length < MAX_TURNS ? { scale: 1.1 } : {}}
            whileTap={!loading && turns.length < MAX_TURNS ? { scale: 0.95 } : {}}
          >
            {loading ? "⏳" : recording ? "⏹" : turns.length >= MAX_TURNS ? "✓" : "🎤"}
          </motion.button>

          {/* Help text */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              fontSize: "11px",
              color: "#4a6a8a",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {recording ? "Speak your argument" : "Click to start recording"}
          </motion.div>
        </motion.div>

        {/* ── TURN HISTORY PILL (if any turns) ── */}
        {turns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "absolute",
              bottom: "140px",
              background: "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 212, 255, 0.2)",
              borderRadius: "16px",
              padding: "14px 20px",
              fontSize: "12px",
              color: "#8aa8c8",
              maxWidth: "300px",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            <div style={{ color: "#00d4ff", fontWeight: "700", marginBottom: "4px" }}>
              Last Round Score: {turns[turns.length - 1]?.scores?.overall || 0}/10
            </div>
            <div style={{ fontSize: "11px", color: "#4a6a8a" }}>
              Debate progressing well, keep going!
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes grid-drift {
          0% { transform: translateY(0); }
          100% { transform: translateY(80px); }
        }
      `}</style>
    </div>
  );
}
