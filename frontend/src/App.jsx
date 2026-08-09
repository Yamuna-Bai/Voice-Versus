import { useState, useRef, useEffect, useCallback } from "react";

import FacialAnalysis from "./FacialAnalysis";
import ConfidencePanel from "./ConfidencePanel";
import LandingPage from "./LandingPage";
import ModeScreen from "./ModeScreen";
import MultiplayerScreen from "./MultiplayerScreen";
import WaitingRoom from "./WaitingRoom";
import MultiplayerDebateScreen from "./MultiplayerDebateScreen";
import MultiplayerResult from "./MultiplayerResult";

const TOPICS = [
  { id: 1, title: "AI will replace human jobs", category: "Technology", icon: "🤖" },
  { id: 2, title: "Social media does more harm than good", category: "Society", icon: "📱" },
  { id: 3, title: "Online education is better than classroom", category: "Education", icon: "🎓" },
  { id: 4, title: "Climate change is the biggest global threat", category: "Environment", icon: "🌍" },
  { id: 5, title: "Cryptocurrency is the future of money", category: "Economics", icon: "💰" },
  { id: 6, title: "Death penalty should be abolished", category: "Politics", icon: "⚖️" },
];

const MAX_TURNS = 5;
const API_BASE = "http://localhost:8000";
const MAX_SPEAKING_MS = 60000;
const MIN_RECORDING_MS = 1800;
const SILENCE_STOP_MS = 4000;
const SPEECH_GRACE_MS = 1400;
const NOISE_CALIBRATION_MS = 1300;
const MIN_VOICE_RMS_THRESHOLD = 0.009;
const NOISE_GATE_MULTIPLIER = 1.55;
const MAX_DEMO_VOICE_THRESHOLD = 0.038;
const VOICE_DROP_SILENCE_RATIO = 0.42;
const NO_SPEECH_AUTO_STOP_MS = 8500;
const SPEAKER_HANDOFF_DELAY_MS = 80;
const MIC_AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 16000 },
    sampleSize: { ideal: 16 },
  },
};

function getStoredAuthUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("debateAuth") || localStorage.getItem("debateUser"));
    return stored && typeof stored.name === "string" && stored.name.trim()
      ? {
        id: stored.id,
        name: stored.name.trim(),
        email: typeof stored.email === "string" ? stored.email.trim().toLowerCase() : "",
        access_token: stored.access_token || stored.token || "",
      }
      : null;
  } catch { return null; }
}

function storeAuthUser(user) {
  try {
    localStorage.setItem("debateAuth", JSON.stringify(user));
    localStorage.setItem("debateUser", JSON.stringify(user));
  } catch { }
}

function clearAuthUser() {
  try {
    localStorage.removeItem("debateAuth");
    localStorage.removeItem("debateUser");
  } catch { }
}

function authHeaders(user) {
  return user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {};
}

function isAuthExpiredResponse(res, data) {
  return res.status === 401 && /auth|token|user not found/i.test(String(data?.detail || ""));
}

const DIFFICULTIES = [
  { id: "easy", label: "Easy", icon: "😄", desc: "Simple & short" },
  { id: "medium", label: "Medium", icon: "😐", desc: "Balanced" },
  { id: "hard", label: "Hard", icon: "😈", desc: "Ruthless" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  const isChallenge = /prove it|that doesn't hold|you know it|come on|seriously|hold on|actually|really\?|what evidence|how exactly/.test(spoken);
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

function saveLeaderboard(username, avg) {
  try {
    const board = JSON.parse(localStorage.getItem("debateLeaderboard") || "[]");
    const i = board.findIndex(e => e.username === username);
    if (i >= 0) { board[i].avg = Math.max(board[i].avg, avg); board[i].games = (board[i].games || 1) + 1; }
    else board.push({ username, avg, games: 1 });
    board.sort((a, b) => b.avg - a.avg);
    localStorage.setItem("debateLeaderboard", JSON.stringify(board.slice(0, 20)));
  } catch { }
}

function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem("debateLeaderboard") || "[]"); } catch { return []; }
}

function formatLabel(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
}

function getMostCommon(values) {
  if (!values.length) return "unknown";
  const counts = values.reduce((acc, value) => ({ ...acc, [value]: (acc[value] || 0) + 1 }), {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
}

function getWorstIntegrity(values) {
  if (values.includes("red")) return "red";
  if (values.includes("yellow")) return "yellow";
  if (values.includes("green")) return "green";
  return "yellow";
}

function getConfidenceFeedback(analysis) {
  const wellDone = [];
  const improvement = [];
  const suggestions = [];
  const isFaceExpression = analysis.analysisSource === "face expression";

  if (analysis.confidenceScore >= 7) wellDone.push("You maintained a steady camera presence.");
  if (analysis.cameraFit === "camera fit" || analysis.cameraFit === "face visible") wellDone.push("Your face stayed visible in the frame.");
  if (analysis.headMovement === "controlled") wellDone.push("Your head movement looked controlled.");
  if (isFaceExpression && analysis.eyeContact === "steady") wellDone.push("Your eye contact looked steady.");

  if (analysis.confidenceScore < 6) improvement.push("Build stronger camera focus and steadier expression.");
  if (analysis.cameraFit && analysis.cameraFit !== "camera fit" && analysis.cameraFit !== "face visible") improvement.push(`Camera framing needs attention: ${analysis.cameraFit}.`);
  if (isFaceExpression && analysis.nervousnessScore > 4) improvement.push("Your face showed some tension; soften your jaw and brow.");
  if (analysis.headMovement === "excessive") improvement.push("Reduce extra head movement for a cleaner delivery.");
  if (isFaceExpression && analysis.hesitation !== "low") improvement.push("Work on smoother transitions between points.");

  suggestions.push("Look into the camera for your key claims.");
  suggestions.push("Take one calm breath before starting each answer.");
  suggestions.push("Keep your chin level and pause briefly after strong points.");

  return {
    wellDone: wellDone.slice(0, 2).length ? wellDone.slice(0, 2) : ["You stayed visible enough for camera tracking."],
    improvement: improvement.slice(0, 2).length ? improvement.slice(0, 2) : ["Keep your face centered and your movement controlled."],
    suggestions: suggestions.slice(0, 3),
  };
}

function summarizeConfidenceAnalysis(samples) {
  if (!samples.length) return null;
  const avg = (key) => samples.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) / samples.length;
  const summary = {
    confidenceScore: Math.round(avg("confidenceScore") * 10) / 10,
    nervousnessScore: Math.round(avg("nervousnessScore") * 10) / 10,
    primaryEmotion: getMostCommon(samples.map(s => s.primaryEmotion).filter(Boolean)),
    secondaryEmotion: getMostCommon(samples.map(s => s.secondaryEmotion).filter(Boolean)),
    hesitation: getMostCommon(samples.map(s => s.hesitation).filter(Boolean)),
    engagement: getMostCommon(samples.map(s => s.engagement).filter(Boolean)),
    eyeContact: getMostCommon(samples.map(s => s.eyeContact).filter(Boolean)),
    facialStability: getMostCommon(samples.map(s => s.facialStability).filter(Boolean)),
    headMovement: getMostCommon(samples.map(s => s.headMovement).filter(Boolean)),
    speakingPosture: getMostCommon(samples.map(s => s.speakingPosture).filter(Boolean)),
    movementScore: Math.round(avg("movementScore") * 10) / 10,
    analysisSource: getMostCommon(samples.map(s => s.analysisSource).filter(Boolean)),
    faceVisible: getMostCommon(samples.map(s => String(Boolean(s.faceVisible))).filter(Boolean)) === "true",
    faceCount: Math.round(avg("faceCount")),
    cameraFit: getMostCommon(samples.map(s => s.cameraFit).filter(Boolean)),
    facePosition: getMostCommon(samples.map(s => s.facePosition).filter(Boolean)),
    integrityStatus: getWorstIntegrity(samples.map(s => s.integrityStatus).filter(Boolean)),
    integrityIssue: getMostCommon(samples.map(s => s.integrityIssue).filter(Boolean)),
    expressionMeasured: samples.some(s => s.expressionMeasured),
    expressionLevel: Math.round(avg("expressionLevel") * 10) / 10,
    scoreBasis: getMostCommon(samples.map(s => s.scoreBasis).filter(Boolean)),
  };
  return { ...summary, feedback: getConfidenceFeedback(summary) };
}

function getDefaultConfidenceAnalysis() {
  const summary = {
    confidenceScore: 6, nervousnessScore: 3, primaryEmotion: "focused", secondaryEmotion: "calm",
    hesitation: "medium", engagement: "moderate", eyeContact: "visible", facialStability: "balanced",
    headMovement: "controlled", speakingPosture: "upright", movementScore: 6,
    analysisSource: "camera available", faceVisible: false, faceCount: 0,
    cameraFit: "keep face inside guide", facePosition: "not verified",
    integrityStatus: "yellow", integrityIssue: "Camera not fully verified",
    expressionMeasured: false, expressionLevel: null, scoreBasis: "live camera verification",
  };
  return {
    ...summary, feedback: getConfidenceFeedback(summary), liveReport: {
      summary: "Face verification pending — the final report will show facial camera feedback.",
      ideal: "A debate-ready face is centered, visible, calm, and engaged.",
      expression: "not measured", contact: "pending", stability: "pending",
      movement: "pending", posture: "pending", stress: "pending",
      recommendations: ["Make sure one clear face is visible before speaking."]
    }
  };
}

// ── ScoreGraph ────────────────────────────────────────────────────────────────
function ScoreGraph({ scores }) {
  if (!scores.length) return null;
  const W = 220, H = 80, PAD = 14;
  const iW = W - PAD * 2, iH = H - PAD * 2;
  const pts = scores.map((s, i) => ({
    x: PAD + (scores.length === 1 ? iW / 2 : (i / (scores.length - 1)) * iW),
    y: PAD + iH - (s / 10) * iH, s,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${pts[pts.length - 1].x},${PAD + iH} L${pts[0].x},${PAD + iH} Z`;
  return (
    <svg width={W} height={H} style={{ overflow: "visible", display: "block" }}>
      {[0, 5, 10].map(v => {
        const y = PAD + iH - (v / 10) * iH;
        return <line key={v} x1={PAD} y1={y} x2={PAD + iW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      <path d={fillD} fill="rgba(0,212,255,0.08)" />
      <path d={pathD} fill="none" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#00d4ff" />
          <circle cx={p.x} cy={p.y} r="1.5" fill="#060c18" />
          <text x={p.x} y={p.y - 7} fontSize="9" fill="#00d4ff" textAnchor="middle">{p.s}</text>
        </g>
      ))}
    </svg>
  );
}

function ReportMetricBar({ label, value, color = "#00d4ff" }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 42px", gap: "10px", alignItems: "center" }}>
      <div style={{ fontSize: "10px", color: "#7b8faa", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ height: "7px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: color, boxShadow: `0 0 16px ${color}44` }} />
      </div>
      <div style={{ fontSize: "11px", color: "#c8d8e8", textAlign: "right" }}>{Math.round(pct)}%</div>
    </div>
  );
}

function ReportPill({ label, value, color = "#00d4ff" }) {
  return (
    <div style={{ background: `${color}10`, border: `1px solid ${color}35`, borderRadius: "8px", padding: "10px 12px" }}>
      <div style={{ fontSize: "9px", color, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "5px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#e8f0ff", fontWeight: "700" }}>{value || "Not measured"}</div>
    </div>
  );
}

const REPORT_STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "they", "them", "their", "there", "then", "than", "will", "would", "could", "should",
  "have", "has", "had", "are", "was", "were", "been", "being", "for", "you", "your", "but", "not", "can", "just", "very", "really",
  "about", "because", "into", "onto", "over", "under", "also", "when", "what", "which", "while", "where", "who", "why", "how",
  "now", "our", "out", "all", "any", "some", "more", "most", "much", "many", "one", "two", "three", "its", "it's", "i", "me", "my",
  "we", "us", "a", "an", "to", "of", "in", "on", "at", "is", "it", "as", "or", "if", "so", "do", "does", "did", "be", "by"
]);

const WEAK_DEBATE_WORDS = [
  "maybe", "probably", "basically", "obviously", "definitely", "surely", "always", "never", "everyone", "nobody",
  "everything", "nothing", "stuff", "things", "really", "very", "just", "like", "actually", "kind", "sort", "somehow"
];

const STRONG_DEBATE_KEYWORDS = [
  "evidence", "example", "impact", "cost", "risk", "benefit", "policy", "data", "reason", "claim", "proof", "source",
  "because", "therefore", "however", "compare", "consequence", "assumption", "alternative", "specific", "case"
];

function analyzeUserLanguage(turns) {
  const text = turns.map(t => t.userArgument || "").join(" ").toLowerCase();
  const words = text.match(/[a-z']{3,}/g) || [];
  const counts = {};
  words.forEach(word => {
    const cleaned = word.replace(/^'+|'+$/g, "");
    if (!cleaned || REPORT_STOP_WORDS.has(cleaned)) return;
    counts[cleaned] = (counts[cleaned] || 0) + 1;
  });
  const weightedKeywords = Object.entries(counts)
    .map(([word, count]) => ({ word, count, weight: count * (word.length >= 8 ? 1.5 : word.length >= 6 ? 1.25 : 1) }))
    .sort((a, b) => b.weight - a.weight).slice(0, 8);
  const weakWords = WEAK_DEBATE_WORDS
    .map(word => ({ word, count: words.filter(w => w === word).length }))
    .filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);
  const missingStrongWords = STRONG_DEBATE_KEYWORDS.filter(word => !words.includes(word)).slice(0, 8);
  const usedStrongWords = STRONG_DEBATE_KEYWORDS.filter(word => words.includes(word)).slice(0, 8);
  return { weightedKeywords, weakWords, missingStrongWords, usedStrongWords };
}

// ── FinalReport ───────────────────────────────────────────────────────────────
function FinalReport({ turns, topic, position, onRestart, onCombined, username, saveStatus }) {
  const fallacySectionRef = useRef(null);
  const faceSectionRef = useRef(null);
  const scores = turns.map(t => t.scores?.overall || 0);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
  const grade = avg >= 8 ? { l: "Excellent", c: "#00ff88" } : avg >= 6 ? { l: "Good", c: "#00d4ff" } : avg >= 4 ? { l: "Developing", c: "#ff9500" } : { l: "Needs Work", c: "#ff4444" };
  const allFallacies = turns.flatMap((t, i) => (t.fallacies?.fallacies || []).map(f => ({ ...f, round: i + 1 })));
  const allTips = [...new Set(turns.map(t => t.scores?.coach_tip).filter(Boolean))].slice(0, 5);
  const allFeedback = [...new Set(turns.map(t => t.scores?.feedback).filter(Boolean))].slice(0, 4);
  const confidenceTurns = turns.filter(t => t.confidenceAnalysis);
  const avgConfidence = confidenceTurns.length
    ? (confidenceTurns.reduce((sum, t) => sum + (Number(t.confidenceAnalysis.confidenceScore) || 0), 0) / confidenceTurns.length).toFixed(1) : "0.0";
  const avgNervousness = confidenceTurns.length
    ? (confidenceTurns.reduce((sum, t) => sum + (Number(t.confidenceAnalysis.nervousnessScore) || 0), 0) / confidenceTurns.length).toFixed(1) : "0.0";
  const languageReport = analyzeUserLanguage(turns);
  const reportSummarySpokenRef = useRef(false);
  const reportSummaryTimerRef = useRef(null);
  const firstScore = scores[0] || 0;
  const lastScore = scores[scores.length - 1] || firstScore;
  const scoreChange = lastScore - firstScore;
  const bestScore = Math.max(...scores, 0);
  const bestRound = scores.length ? scores.indexOf(bestScore) + 1 : 0;
  const proTips = [
    "Use claim + because + evidence in the first 10 seconds.",
    "Replace vague words with a concrete example, number, policy, or real case.",
    "After every point, explain the impact: why it matters and who is affected.",
    "Avoid absolute words unless you can prove them with strong evidence.",
  ];
  const quickReportSummary = [
    `Quick report. Your average score is ${avg} out of 10, graded ${grade.l}.`,
    scores.length ? `Your best round was round ${bestRound} with ${bestScore} out of 10.` : "No scored rounds were recorded.",
    scores.length > 1
      ? scoreChange > 0.2
        ? `You improved by ${scoreChange.toFixed(1)} points from the first round to the last.`
        : scoreChange < -0.2
          ? `Your final round dropped by ${Math.abs(scoreChange).toFixed(1)} points, so keep the structure steady until the end.`
          : "Your score stayed mostly steady across the debate."
      : "",
    allFallacies.length
      ? `${allFallacies.length} logic issue${allFallacies.length === 1 ? "" : "s"} appeared. Slow down and connect each claim to evidence.`
      : "No clear fallacies were detected.",
    allTips[0] || "Next time, use one clear claim, one reason, and one example.",
    confidenceTurns.length
      ? `Face analysis: confidence averaged ${avgConfidence} out of 10, nervousness ${avgNervousness} out of 10. ${confidenceTurns[confidenceTurns.length - 1]?.confidenceAnalysis?.feedback?.suggestions?.[0] || "Keep your face centered and eye contact steady."}`
      : "Face analysis was not available for this report.",
  ].filter(Boolean).join(" ");

  useEffect(() => { if (username) saveLeaderboard(username, parseFloat(avg)); }, [avg, username]);

  function speakReportSummary() {
    if (!window.speechSynthesis || !quickReportSummary) return;
    window.speechSynthesis.cancel();
    const utt = createAlexUtterance(quickReportSummary, "easy");
    utt.rate = Math.min(1.12, utt.rate + 0.12);
    window.speechSynthesis.speak(utt);
  }

  useEffect(() => {
    if (reportSummarySpokenRef.current || !quickReportSummary) return;
    reportSummaryTimerRef.current = window.setTimeout(() => {
      reportSummarySpokenRef.current = true;
      speakReportSummary();
    }, 900);
    return () => {
      if (reportSummaryTimerRef.current) {
        window.clearTimeout(reportSummaryTimerRef.current);
        reportSummaryTimerRef.current = null;
      }
    };
  }, [quickReportSummary]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function jumpToReportSection(ref) { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020510 0%,#060c1a 50%,#020510 100%)", color: "#e8f0ff", fontFamily: "'Courier New',monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "900px", width: "100%" }}>
        {saveStatus?.message && (
          <div style={{ marginBottom: "14px", color: saveStatus.type === "error" ? "#ff7777" : saveStatus.type === "saved" ? "#00ff88" : "#00d4ff", fontSize: "12px", letterSpacing: "1.5px", textAlign: "right" }}>
            {saveStatus.message}
          </div>
        )}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "52px", marginBottom: "12px" }}>🏆</div>
          <h2 style={{ fontSize: "32px", fontWeight: "900", margin: "0 0 8px", letterSpacing: "4px", background: "linear-gradient(90deg,#00d4ff,#7b2fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DEBATE COMPLETE</h2>
          <div style={{ color: "#4a6a8a", fontSize: "13px", letterSpacing: "2px" }}>{topic.icon} {topic.title} · {position}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
          <button onClick={onCombined} style={{ background: "linear-gradient(135deg,#00d4ff,#7b2fff)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "12px 18px", borderRadius: "10px", fontSize: "12px", fontWeight: "900", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1.5px", boxShadow: "0 10px 32px rgba(0,212,255,0.18)" }}>COMBINED RESULT</button>
          <button onClick={() => jumpToReportSection(fallacySectionRef)} style={{ background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.35)", color: "#ffc107", padding: "12px 18px", borderRadius: "10px", fontSize: "12px", fontWeight: "900", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1.5px" }}>FALLACY DETECTION</button>
          <button onClick={() => jumpToReportSection(faceSectionRef)} style={{ background: confidenceTurns.length ? "rgba(123,47,255,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${confidenceTurns.length ? "rgba(123,47,255,0.4)" : "rgba(255,255,255,0.08)"}`, color: confidenceTurns.length ? "#a9b8ff" : "#4a6a8a", padding: "12px 18px", borderRadius: "10px", fontSize: "12px", fontWeight: "900", cursor: confidenceTurns.length ? "pointer" : "not-allowed", fontFamily: "'Courier New',monospace", letterSpacing: "1.5px" }}>FACE ANALYSIS</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "16px", padding: "28px", textAlign: "center", backdropFilter: "blur(20px)" }}>
            <div style={{ fontSize: "72px", fontWeight: "900", color: grade.c, lineHeight: 1 }}>{avg}</div>
            <div style={{ fontSize: "12px", color: "#4a6a8a", margin: "4px 0 12px", letterSpacing: "2px" }}>AVG SCORE / 10</div>
            <div style={{ display: "inline-block", background: `${grade.c}22`, border: `1px solid ${grade.c}55`, borderRadius: "20px", padding: "4px 20px", fontSize: "13px", color: grade.c, fontWeight: "700", letterSpacing: "2px" }}>{grade.l.toUpperCase()}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "16px", padding: "20px", backdropFilter: "blur(20px)" }}>
            <div style={{ fontSize: "11px", color: "#00d4ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Score Trend</div>
            <ScoreGraph scores={scores} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
              <div style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: "8px", padding: "10px" }}>
                <div style={{ fontSize: "10px", color: "#00ff88", marginBottom: "3px", letterSpacing: "1px" }}>BEST ROUND</div>
                <div style={{ fontSize: "18px", fontWeight: "700" }}>R{scores.indexOf(Math.max(...scores, 0)) + 1}</div>
              </div>
              <div style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.15)", borderRadius: "8px", padding: "10px" }}>
                <div style={{ fontSize: "10px", color: "#ff4444", marginBottom: "3px", letterSpacing: "1px" }}>WEAKEST</div>
                <div style={{ fontSize: "18px", fontWeight: "700" }}>R{scores.indexOf(Math.min(...scores, 10)) + 1}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div ref={fallacySectionRef} style={{ scrollMarginTop: "24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,193,7,0.18)", borderRadius: "16px", padding: "20px", backdropFilter: "blur(20px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", color: "#ffc107", letterSpacing: "2px", textTransform: "uppercase" }}>Fallacy Detection</div>
              <div style={{ fontSize: "22px", color: allFallacies.length ? "#ff7777" : "#00ff88", fontWeight: "900" }}>{allFallacies.length}</div>
            </div>
            {allFallacies.length === 0 ? (
              <div style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.16)", borderRadius: "10px", padding: "14px", color: "#9fe8bd", fontSize: "12px", lineHeight: "1.6" }}>
                No clear logical fallacies were detected. Keep supporting your claims with examples and evidence.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {allFallacies.slice(0, 4).map((f, i) => (
                  <div key={i} style={{ background: "rgba(255,68,68,0.07)", border: "1px solid rgba(255,68,68,0.18)", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                      <div style={{ color: "#ff8888", fontSize: "12px", fontWeight: "900", letterSpacing: "1px" }}>{f.type || "Fallacy"}</div>
                      <div style={{ color: "#7b8faa", fontSize: "10px", whiteSpace: "nowrap" }}>ROUND {f.round}</div>
                    </div>
                    <div style={{ color: "#b9c8d8", fontSize: "11px", lineHeight: "1.5" }}>{f.explanation || "Review this point and support it with clearer evidence."}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,136,0.16)", borderRadius: "16px", padding: "20px", backdropFilter: "blur(20px)" }}>
            <div style={{ fontSize: "11px", color: "#00ff88", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px" }}>How To Improve</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(allTips.length ? allTips : ["Use one clear claim, one reason, and one concrete example in every answer."]).map((tip, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: "10px", alignItems: "start", background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.12)", borderRadius: "10px", padding: "11px 12px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,255,136,0.1)", color: "#00ff88", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>{i + 1}</div>
                  <div style={{ color: "#c8d8e8", fontSize: "12px", lineHeight: "1.5" }}>{tip}</div>
                </div>
              ))}
            </div>
            {allFeedback.length > 0 && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "10px", color: "#4a6a8a", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px" }}>Coach Notes</div>
                <div style={{ color: "#8aa8c8", fontSize: "12px", lineHeight: "1.6" }}>{allFeedback.join(" ")}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "16px", padding: "20px", marginBottom: "20px", backdropFilter: "blur(20px)" }}>
          <div style={{ fontSize: "11px", color: "#00d4ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px" }}>Debate Language Analysis</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "14px" }}>
            <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "10px", color: "#00d4ff", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Weighted Keywords Used</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(languageReport.weightedKeywords.length ? languageReport.weightedKeywords : [{ word: "no strong keywords yet", count: 0 }]).map((item, i) => (
                  <span key={i} style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.22)", borderRadius: "999px", padding: "6px 10px", color: "#c8d8e8", fontSize: "11px" }}>
                    {item.word}{item.count ? ` x${item.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "10px", color: "#00ff88", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Strong Words To Use More</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(languageReport.missingStrongWords.length ? languageReport.missingStrongWords : languageReport.usedStrongWords).map((word, i) => (
                  <span key={i} style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.22)", borderRadius: "999px", padding: "6px 10px", color: "#c8d8e8", fontSize: "11px" }}>{word}</span>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "10px", color: "#ff7777", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Words To Avoid</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(languageReport.weakWords.length ? languageReport.weakWords : [{ word: "no weak fillers detected", count: 0 }]).map((item, i) => (
                  <span key={i} style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.22)", borderRadius: "999px", padding: "6px 10px", color: "#c8d8e8", fontSize: "11px" }}>
                    {item.word}{item.count ? ` x${item.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: "14px", background: "rgba(123,47,255,0.06)", border: "1px solid rgba(123,47,255,0.16)", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "#a9b8ff", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Improvement Pro Tips</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "10px" }}>
              {proTips.map((tip, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: "9px", alignItems: "start", color: "#c8d8e8", fontSize: "12px", lineHeight: "1.5" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(123,47,255,0.16)", color: "#a9b8ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>{i + 1}</div>
                  <div>{tip}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "16px", padding: "20px", marginBottom: "20px", backdropFilter: "blur(20px)" }}>
          <div style={{ fontSize: "11px", color: "#00d4ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px" }}>Round Score Cards</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px" }}>
            {turns.map((t, i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontSize: "10px", color: "#4a6a8a", letterSpacing: "1.5px" }}>ROUND {i + 1}</div>
                  <div style={{ fontSize: "20px", color: "#00d4ff", fontWeight: "900" }}>{t.scores?.overall || 0}<span style={{ fontSize: "10px", color: "#4a6a8a" }}>/10</span></div>
                </div>
                <ReportMetricBar label="Argument" value={(t.scores?.argument_quality || t.scores?.overall || 0) * 10} />
                <div style={{ height: "8px" }} />
                <ReportMetricBar label="Evidence" value={(t.scores?.evidence_use || 0) * 10} color="#00ff88" />
                <div style={{ height: "8px" }} />
                <ReportMetricBar label="Rebuttal" value={(t.scores?.rebuttal_strength || 0) * 10} color="#ffc107" />
              </div>
            ))}
          </div>
        </div>

        {confidenceTurns.length > 0 && ["camera fit","face visible"].includes(confidenceTurns[confidenceTurns.length - 1]?.confidenceAnalysis?.cameraFit) && (
          <div ref={faceSectionRef} style={{ scrollMarginTop: "24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(123,47,255,0.18)", borderRadius: "16px", padding: "20px", marginBottom: "20px", backdropFilter: "blur(20px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#a9b8ff", letterSpacing: "2px", textTransform: "uppercase" }}>Facial And Eye Expression Report</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <ReportPill label="Confidence" value={`${avgConfidence}/10`} color="#00d4ff" />
                <ReportPill label="Nervousness" value={`${avgNervousness}/10`} color="#ffc107" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "12px", marginBottom: "16px" }}>
              {confidenceTurns.map((t, i) => {
                const a = t.confidenceAnalysis;
                const eyeScore = a.eyeContact === "steady" ? 92 : a.eyeContact === "visible" ? 72 : a.eyeContact === "unknown" ? 45 : 58;
                const stabilityScore = a.facialStability === "steady" || a.facialStability === "balanced" ? 85 : a.facialStability === "unstable" ? 45 : 65;
                const postureScore = a.speakingPosture === "upright" ? 88 : a.speakingPosture === "leaning" ? 58 : 68;
                const movementScore = (Number(a.movementScore) || 0) * 10;
                return (
                  <div key={i} style={{ background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontSize: "10px", color: "#4a6a8a", letterSpacing: "1.5px" }}>ROUND {turns.indexOf(t) + 1}</div>
                        <div style={{ fontSize: "13px", color: "#e8f0ff", fontWeight: "900", marginTop: "3px" }}>{formatLabel(a.primaryEmotion)}</div>
                      </div>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "rgba(123,47,255,0.12)", border: "1px solid rgba(123,47,255,0.35)", color: "#a9b8ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900" }}>{Number(a.confidenceScore || 0).toFixed(1)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                      <ReportMetricBar label="Eye contact" value={eyeScore} color="#00d4ff" />
                      <ReportMetricBar label="Face stability" value={stabilityScore} color="#7b8cff" />
                      <ReportMetricBar label="Posture" value={postureScore} color="#00ff88" />
                      <ReportMetricBar label="Movement" value={movementScore} color="#ffc107" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                      <ReportPill label="Eye" value={formatLabel(a.eyeContact)} color="#00d4ff" />
                      <ReportPill label="Expression" value={a.expressionMeasured ? `${a.expressionLevel || 0}%` : "Estimated"} color="#7b8cff" />
                      <ReportPill label="Face" value={formatLabel(a.cameraFit)} color="#00ff88" />
                      <ReportPill label="Integrity" value={formatLabel(a.integrityStatus || "yellow")} color={a.integrityStatus === "red" ? "#ff7777" : "#ffc107"} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "rgba(123,47,255,0.06)", border: "1px solid rgba(123,47,255,0.16)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "10px", color: "#a9b8ff", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>What Looked Good</div>
                {confidenceTurns[confidenceTurns.length - 1]?.confidenceAnalysis?.feedback?.wellDone?.map((item, i) => (
                  <div key={i} style={{ color: "#c8d8e8", fontSize: "12px", lineHeight: "1.7" }}>✓ {item}</div>
                ))}
              </div>
              <div style={{ background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.16)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "10px", color: "#ffc107", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Facial Delivery Tips</div>
                {confidenceTurns[confidenceTurns.length - 1]?.confidenceAnalysis?.feedback?.suggestions?.map((item, i) => (
                  <div key={i} style={{ color: "#c8d8e8", fontSize: "12px", lineHeight: "1.7" }}>→ {item}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={onRestart}
            style={{ background: "linear-gradient(135deg,#00d4ff,#7b2fff)", border: "none", color: "white", padding: "16px 48px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer", letterSpacing: "3px", fontFamily: "'Courier New',monospace", transition: "all 0.3s" }}
            onMouseEnter={e => { e.target.style.transform = "translateY(-3px) scale(1.03)"; e.target.style.boxShadow = "0 12px 40px rgba(0,212,255,0.4)" }}
            onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none" }}>
            ↺ DEBATE AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}

function CombinedResultPage({ turns, topic, position, onBack, onRestart }) {
  const scores = turns.map(t => Number(t.scores?.overall) || 0);
  const debateScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) : 0;
  const fallacyCount = turns.reduce((sum, t) => sum + (t.fallacies?.fallacies?.length || 0), 0);
  const fallacyScore = turns.length ? Math.max(0, Math.round(100 - (fallacyCount / turns.length) * 18)) : 0;
  const confidenceTurns = turns.filter(t => t.confidenceAnalysis);
  const faceScore = confidenceTurns.length
    ? Math.round(confidenceTurns.reduce((sum, t) => sum + (Number(t.confidenceAnalysis.confidenceScore) || 0), 0) / confidenceTurns.length * 10) : null;
  const scoreParts = [
    { value: debateScore, weight: 0.45 },
    { value: fallacyScore, weight: 0.25 },
    ...(faceScore === null ? [] : [{ value: faceScore, weight: 0.30 }]),
  ];
  const totalWeight = scoreParts.reduce((sum, item) => sum + item.weight, 0) || 1;
  const totalScore = Math.round(scoreParts.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight);
  const avgMetric = key => {
    const vals = turns.map(t => Number(t.scores?.[key])).filter(Number.isFinite);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) : null;
  };
  const metricScores = [
    { label: "Argument", value: avgMetric("argument_quality") },
    { label: "Evidence", value: avgMetric("evidence_use") },
    { label: "Rebuttal", value: avgMetric("rebuttal_strength") },
  ].filter(item => item.value !== null);
  const weakestMetric = metricScores.length ? metricScores.reduce((low, item) => item.value < low.value ? item : low, metricScores[0]) : null;
  const bestRoundIndex = scores.length ? scores.indexOf(Math.max(...scores)) + 1 : 0;
  const coachTips = [...new Set(turns.map(t => t.scores?.coach_tip).filter(Boolean))];
  const coachFeedback = [...new Set(turns.map(t => t.scores?.feedback).filter(Boolean))];
  const latestFace = confidenceTurns[confidenceTurns.length - 1]?.confidenceAnalysis;
  const avgNervousness = confidenceTurns.length
    ? (confidenceTurns.reduce((sum, t) => sum + (Number(t.confidenceAnalysis.nervousnessScore) || 0), 0) / confidenceTurns.length).toFixed(1)
    : null;
  const mood = totalScore >= 80 ? "Outstanding presence" : totalScore >= 65 ? "Strong progress" : totalScore >= 50 ? "Building momentum" : "Practice round unlocked";
  const message = totalScore >= 80
    ? "Keep it up. You argued with confidence, structure, and presence."
    : totalScore >= 65 ? `Your base is strong; now sharpen ${weakestMetric ? weakestMetric.label.toLowerCase() : "examples"} and cleaner wording.`
      : "Keep going. Focus on one clear claim, one proof point, and steady eye contact.";
  const ring = `${totalScore}, 100`;
  const graphBars = [
    { label: "Debate Quality", value: debateScore, color: "#00d4ff" },
    { label: "Fallacy Control", value: fallacyScore, color: "#00ff88" },
    { label: "Face Expression", value: faceScore, color: "#a9b8ff" },
  ];
  const insightCards = [
    {
      title: "Best Round",
      text: bestRoundIndex
        ? `Round ${bestRoundIndex} was your strongest with ${Math.max(...scores).toFixed(1)}/10. Repeat the structure that worked there.`
        : "No scored rounds were recorded for this debate.",
      color: "#00ff88",
    },
    {
      title: weakestMetric ? `${weakestMetric.label} Focus` : "Argument Focus",
      text: coachTips[0] || coachFeedback[0] || (weakestMetric
        ? `${weakestMetric.label} averaged ${weakestMetric.value}%. Improve this part first in the next debate.`
        : "Use one clear claim, one reason, and one concrete example in each answer."),
      color: "#00d4ff",
    },
    {
      title: fallacyCount ? "Logic Check" : "Clean Logic",
      text: fallacyCount
        ? `${fallacyCount} fallac${fallacyCount === 1 ? "y was" : "ies were"} detected. Slow down and connect each claim to evidence.`
        : "No fallacies were detected in the recorded turns. Keep supporting claims with evidence.",
      color: fallacyCount ? "#ffc107" : "#00ff88",
    },
    {
      title: "Delivery",
      text: latestFace
        ? `Face confidence averaged ${faceScore}%, with nervousness around ${avgNervousness}/10. Eye contact was ${formatLabel(latestFace.eyeContact)}.`
        : "No face-analysis samples were available, so delivery was not included in the combined score.",
      color: "#a9b8ff",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 20%, rgba(0,212,255,0.18), transparent 34%), linear-gradient(135deg,#020510 0%,#07111f 52%,#03050d 100%)", color: "#e8f0ff", fontFamily: "'Courier New',monospace", padding: "38px 24px", overflowY: "auto" }}>
      <div style={{ maxWidth: "1040px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#8aa8c8", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1.5px" }}>BACK</button>
          <div style={{ textAlign: "right", color: "#4a6a8a", fontSize: "11px", letterSpacing: "2px" }}>{topic.icon} {topic.title} · {position}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,380px) 1fr", gap: "24px", alignItems: "stretch" }}>
          <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))", border: "1px solid rgba(0,212,255,0.24)", borderRadius: "24px", padding: "28px", boxShadow: "0 30px 90px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: "11px", color: "#00d4ff", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "18px" }}>Combined Performance</div>
            <div style={{ position: "relative", width: "260px", height: "260px", margin: "0 auto 20px" }}>
              <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                <path d="M18 2.5 a 15.5 15.5 0 1 1 0 31 a 15.5 15.5 0 1 1 0 -31" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.6" />
                <path d="M18 2.5 a 15.5 15.5 0 1 1 0 31 a 15.5 15.5 0 1 1 0 -31" fill="none" stroke="url(#scoreGradient)" strokeWidth="2.9" strokeLinecap="round" strokeDasharray={ring} />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="55%" stopColor="#7b2fff" />
                    <stop offset="100%" stopColor="#00ff88" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "64px", lineHeight: 1, fontWeight: "900", background: "linear-gradient(90deg,#00d4ff,#00ff88)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{totalScore}%</div>
                <div style={{ color: "#7b8faa", fontSize: "11px", letterSpacing: "2px", marginTop: "8px" }}>TOTAL SCORE</div>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#e8f0ff", marginBottom: "8px" }}>{mood}</div>
              <div style={{ fontSize: "13px", color: "#8aa8c8", lineHeight: "1.7" }}>{message}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: "18px" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "22px" }}>
              <div style={{ fontSize: "11px", color: "#a9b8ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>Performance Graph</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {graphBars.map(item => (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
                      <span style={{ color: "#c8d8e8", fontSize: "13px", fontWeight: "700" }}>{item.label}</span>
                      <span style={{ color: item.color, fontSize: "13px", fontWeight: "900" }}>{item.value === null ? "N/A" : `${item.value}%`}</span>
                    </div>
                    <div style={{ height: "13px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${item.value ?? 0}%`, height: "100%", background: `linear-gradient(90deg,${item.color},#ffffff99)`, borderRadius: "999px", boxShadow: `0 0 22px ${item.color}66` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "14px" }}>
              {insightCards.map(card => (
                <div key={card.title} style={{ background: `${card.color}10`, border: `1px solid ${card.color}30`, borderRadius: "18px", padding: "18px", minHeight: "150px" }}>
                  <div style={{ color: card.color, fontSize: "12px", fontWeight: "900", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "12px" }}>{card.title}</div>
                  <div style={{ color: "#c8d8e8", fontSize: "13px", lineHeight: "1.7" }}>{card.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginTop: "28px" }}>
          <button onClick={onBack} style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff", padding: "13px 26px", borderRadius: "12px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", fontWeight: "900" }}>VIEW FULL REPORT</button>
          <button onClick={onRestart} style={{ background: "linear-gradient(135deg,#00d4ff,#7b2fff)", border: "none", color: "white", padding: "13px 26px", borderRadius: "12px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", fontWeight: "900" }}>DEBATE AGAIN</button>
        </div>
      </div>
    </div>
  );
}

function LeaderboardScreen({ onBack, currentUser }) {
  const board = getLeaderboard();
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020510 0%,#060c1a 50%,#020510 100%)", color: "#e8f0ff", fontFamily: "'Courier New',monospace", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px 40px" }}>
      <div style={{ maxWidth: "500px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>🏆</div>
          <h2 style={{ fontSize: "26px", fontWeight: "900", margin: "0 0 6px", letterSpacing: "4px", background: "linear-gradient(90deg,#ffd700,#ff9500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LEADERBOARD</h2>
          <div style={{ color: "#4a6a8a", fontSize: "12px", letterSpacing: "2px" }}>TOP DEBATE PERFORMERS</div>
        </div>
        {board.length === 0 ? (
          <div style={{ textAlign: "center", color: "#4a6a8a", fontSize: "14px", padding: "40px 0", letterSpacing: "1px" }}>No records yet — complete a debate first!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {board.map((entry, i) => {
              const isMe = entry.username === currentUser;
              const medal = ["🥇", "🥈", "🥉"][i] || `#${i + 1}`;
              return (
                <div key={i} style={{ background: isMe ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${isMe ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", backdropFilter: "blur(10px)" }}>
                  <div style={{ fontSize: "20px", width: "28px", textAlign: "center" }}>{medal}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: isMe ? "#00d4ff" : "#c8d8e8", letterSpacing: "1px" }}>{entry.username}{isMe ? " (You)" : ""}</div>
                    <div style={{ fontSize: "11px", color: "#4a6a8a", marginTop: "2px" }}>{entry.games || 1} debate{(entry.games || 1) !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "22px", fontWeight: "900", color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#6a8aaa" }}>{entry.avg}</div>
                    <div style={{ fontSize: "10px", color: "#4a6a8a", letterSpacing: "1px" }}>AVG</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onBack}
          style={{ marginTop: "32px", background: "transparent", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", padding: "10px 28px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", display: "block", marginLeft: "auto", marginRight: "auto", transition: "all 0.2s" }}
          onMouseEnter={e => e.target.style.background = "rgba(0,212,255,0.08)"}
          onMouseLeave={e => e.target.style.background = "transparent"}>
          ← BACK
        </button>
      </div>
    </div>
  );
}

function HistoryScreen({ sessions, loading, err, onBack, onOpenSession, onRefresh }) {
  useEffect(() => { onRefresh?.(); }, [onRefresh]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020510 0%,#060c1a 50%,#020510 100%)", color: "#e8f0ff", fontFamily: "'Courier New',monospace", padding: "44px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "34px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#00d4ff", letterSpacing: "3px", marginBottom: "8px" }}>SAVED REPORTS</div>
            <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "3px" }}>DEBATE HISTORY</h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onRefresh} disabled={loading} style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.22)", color: "#00d4ff", padding: "10px 18px", borderRadius: "8px", cursor: loading ? "wait" : "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", opacity: loading ? 0.7 : 1 }}>REFRESH</button>
            <button onClick={onBack} style={{ background: "transparent", border: "1px solid rgba(0,212,255,0.22)", color: "#00d4ff", padding: "10px 22px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px" }}>BACK</button>
          </div>
        </div>

        {loading && <div style={{ color: "#4a6a8a", fontSize: "13px", letterSpacing: "1px" }}>Loading saved reports...</div>}
        {err && <div style={{ color: "#ff7777", fontSize: "13px", letterSpacing: "1px" }}>{err}</div>}
        {!loading && !err && !sessions.length && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.14)", borderRadius: "14px", padding: "28px", color: "#7b8faa", textAlign: "center" }}>
            No saved debates yet. Complete a debate report once and it will appear here.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "14px" }}>
          {(sessions || []).map(session => (
            <button key={session.id} onClick={() => onOpenSession(session)}
              style={{ textAlign: "left", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(0,212,255,0.14)", borderRadius: "12px", padding: "18px", cursor: "pointer", color: "#e8f0ff", fontFamily: "'Courier New',monospace" }}>
              <div style={{ color: "#00d4ff", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
                {session.created_at ? new Date(session.created_at).toLocaleString() : "SAVED REPORT"}
              </div>
              <div style={{ fontSize: "15px", fontWeight: "900", lineHeight: "1.4", marginBottom: "12px" }}>{session.topic}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", color: "#8aa8c8", fontSize: "11px" }}>
                <span>{session.position || "POSITION"}</span>
                <span>{session.difficulty || "DIFFICULTY"}</span>
                <span>{Number(session.overall_score || 0).toFixed(1)}/10</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegacyLandingScreen({ onLogin }) {
  const featuresRef = useRef(null);
  const features = [
    {
      icon: "🧠",
      title: "AI-Powered Debate Feedback",
      desc: "Instant scoring, fallacy detection, coaching tips, and smarter rebuttal practice after every turn.",
    },
    {
      icon: "⚡",
      title: "Real-Time Debate Flow",
      desc: "Speak naturally, respond fast, and train in a live debate loop that feels intense and interactive.",
    },
    {
      icon: "🎥",
      title: "Confidence & Expression Analysis",
      desc: "Practice eye contact, posture, facial control, and presence while your argument skills improve.",
    },
    {
      icon: "🎯",
      title: "Smart Topic Suggestions",
      desc: "Pick high-impact topics or create your own battleground for focused speaking practice.",
    },
  ];

  function scrollToFeatures() {
    featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020510", color: "#e8f0ff", fontFamily: "'Courier New',monospace", overflowX: "hidden", scrollBehavior: "smooth" }}>
      <section style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px 84px", overflow: "hidden", background: "radial-gradient(circle at 20% 20%, rgba(0,212,255,0.20), transparent 28%), radial-gradient(circle at 80% 18%, rgba(123,47,255,0.18), transparent 30%), linear-gradient(135deg,#020510 0%,#071426 52%,#03050d 100%)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.035) 1px,transparent 1px)", backgroundSize: "64px 64px", maskImage: "linear-gradient(to bottom, black 0%, transparent 92%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "10%", left: "8%", width: "180px", height: "180px", border: "1px solid rgba(0,212,255,0.16)", borderRadius: "50%", animation: "landingOrbit 14s linear infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: "7%", bottom: "16%", width: "230px", height: "230px", border: "1px solid rgba(123,47,255,0.16)", borderRadius: "50%", animation: "landingOrbit 18s linear reverse infinite", pointerEvents: "none" }} />

        <div className="landingHeroGrid" style={{ width: "min(1160px,100%)", display: "grid", gridTemplateColumns: "minmax(0,1.04fr) minmax(320px,0.86fr)", gap: "54px", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ animation: "landingFadeUp 720ms ease both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "8px 14px", borderRadius: "999px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.22)", color: "#00d4ff", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "22px", boxShadow: "0 0 28px rgba(0,212,255,0.08)" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 18px #00ff88" }} />
              AI Debate Arena
            </div>

            <h1 style={{ fontSize: "clamp(42px,7vw,82px)", lineHeight: "0.98", margin: "0 0 20px", fontWeight: "900", letterSpacing: "0", maxWidth: "820px" }}>
              Master the Art of Debate with
              <span style={{ display: "block", background: "linear-gradient(90deg,#00d4ff 0%,#a9b8ff 45%,#00ff88 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0 0 42px rgba(0,212,255,0.12)" }}>AI & Real People</span>
            </h1>

            <p style={{ color: "#9db2c9", fontSize: "clamp(15px,2vw,19px)", lineHeight: "1.75", maxWidth: "660px", margin: "0 0 30px" }}>
              Train in real-time voice debates, get sharp AI feedback, detect weak logic, and build the confidence to speak with clarity under pressure.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", marginBottom: "32px" }}>
              <button onClick={scrollToFeatures} className="landingGlowButton" style={{ background: "linear-gradient(135deg,#00d4ff,#7b2fff)", border: "1px solid rgba(255,255,255,0.22)", color: "white", padding: "15px 28px", borderRadius: "14px", fontSize: "13px", fontWeight: "900", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", boxShadow: "0 18px 48px rgba(0,212,255,0.26)", transition: "transform 220ms ease, box-shadow 220ms ease" }}>
                GET STARTED
              </button>
              <button onClick={onLogin} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", color: "#c8d8e8", padding: "15px 28px", borderRadius: "14px", fontSize: "13px", fontWeight: "900", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", backdropFilter: "blur(18px)", transition: "transform 220ms ease, border-color 220ms ease" }}>
                LOGIN
              </button>
            </div>

            <div className="landingStats" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px", maxWidth: "640px" }}>
              {[
                ["LIVE", "voice debates"],
                ["AI", "coach feedback"],
                ["360°", "confidence report"],
              ].map(([value, label]) => (
                <div key={value} style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "14px", padding: "13px 14px", backdropFilter: "blur(18px)" }}>
                  <div style={{ color: "#00d4ff", fontSize: "20px", fontWeight: "900", lineHeight: 1 }}>{value}</div>
                  <div style={{ color: "#617895", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "6px" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="landingVisual" style={{ position: "relative", minHeight: "520px", animation: "landingFadeUp 900ms ease 120ms both" }}>
            <div style={{ position: "absolute", inset: "36px 10px 26px", borderRadius: "34px", background: "linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(26px)", boxShadow: "0 32px 110px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.14)" }} />
            <div style={{ position: "absolute", top: "0", left: "50%", transform: "translateX(-50%)", width: "230px", height: "230px", borderRadius: "50%", background: "radial-gradient(circle,#00d4ff 0%,#7b2fff 48%,transparent 70%)", filter: "blur(30px)", opacity: 0.28 }} />

            <div style={{ position: "relative", zIndex: 2, padding: "76px 38px 38px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "214px", height: "214px", borderRadius: "48px", background: "linear-gradient(145deg,rgba(0,212,255,0.22),rgba(123,47,255,0.14))", border: "1px solid rgba(0,212,255,0.34)", boxShadow: "0 0 58px rgba(0,212,255,0.25), inset 0 0 38px rgba(255,255,255,0.06)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", animation: "landingFloat 5.5s ease-in-out infinite" }}>
                <div style={{ position: "absolute", top: "-26px", width: "2px", height: "30px", background: "linear-gradient(#00d4ff,transparent)" }} />
                <div style={{ position: "absolute", top: "-38px", width: "18px", height: "18px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 22px #00ff88" }} />
                <div style={{ width: "142px", height: "96px", borderRadius: "30px", background: "rgba(2,5,16,0.82)", border: "1px solid rgba(0,212,255,0.30)", position: "relative", boxShadow: "inset 0 0 28px rgba(0,212,255,0.12)" }}>
                  <div style={{ position: "absolute", top: "28px", left: "28px", width: "18px", height: "18px", borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 18px #00d4ff" }} />
                  <div style={{ position: "absolute", top: "28px", right: "28px", width: "18px", height: "18px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 18px #00ff88" }} />
                  <div style={{ position: "absolute", left: "42px", right: "42px", bottom: "24px", height: "5px", borderRadius: "999px", background: "linear-gradient(90deg,#00d4ff,#00ff88)", animation: "landingMouth 1.8s ease-in-out infinite" }} />
                </div>
              </div>

              <div style={{ width: "100%", marginTop: "34px", display: "grid", gap: "12px" }}>
                {[
                  ["You", "Because evidence matters more than opinion."],
                  ["Alex", "Good. Now prove the impact."],
                  ["Coach", "Stronger claim. Add one real example."],
                ].map(([name, text], index) => (
                  <div key={name} style={{ justifySelf: index === 1 ? "end" : "start", width: "min(320px,92%)", background: index === 1 ? "rgba(123,47,255,0.15)" : "rgba(0,212,255,0.10)", border: `1px solid ${index === 1 ? "rgba(123,47,255,0.32)" : "rgba(0,212,255,0.25)"}`, borderRadius: "16px", padding: "12px 14px", boxShadow: "0 14px 38px rgba(0,0,0,0.22)", animation: `landingChatIn 760ms ease ${index * 160 + 400}ms both` }}>
                    <div style={{ color: index === 1 ? "#a9b8ff" : "#00d4ff", fontSize: "10px", letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: "5px" }}>{name}</div>
                    <div style={{ color: "#d8e6f4", fontSize: "12px", lineHeight: "1.5" }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button onClick={scrollToFeatures} aria-label="Scroll to features" style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", width: "42px", height: "42px", borderRadius: "50%", border: "1px solid rgba(0,212,255,0.26)", background: "rgba(0,0,0,0.28)", color: "#00d4ff", cursor: "pointer", backdropFilter: "blur(12px)", animation: "landingBounce 2.4s ease-in-out infinite" }}>
          ↓
        </button>
      </section>

      <section ref={featuresRef} style={{ position: "relative", padding: "92px 24px 64px", background: "linear-gradient(180deg,#03050d 0%,#06111e 54%,#020510 100%)" }}>
        <div style={{ width: "min(1120px,100%)", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "42px" }}>
            <div style={{ color: "#00d4ff", fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", marginBottom: "12px" }}>Built For Faster Growth</div>
            <h2 style={{ fontSize: "clamp(30px,4vw,48px)", lineHeight: "1.08", margin: "0 0 14px", letterSpacing: "0", fontWeight: "900" }}>Everything you need to become sharper on stage.</h2>
            <p style={{ color: "#7f95af", fontSize: "15px", lineHeight: "1.7", maxWidth: "650px", margin: "0 auto" }}>A premium debate practice system that trains logic, delivery, expression, and confidence in one focused experience.</p>
          </div>

          <div className="landingFeatureGrid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "16px" }}>
            {features.map((feature, index) => (
              <div key={feature.title} className="landingFeatureCard" style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))", border: "1px solid rgba(255,255,255,0.11)", borderRadius: "18px", padding: "22px", minHeight: "220px", backdropFilter: "blur(20px)", boxShadow: "0 20px 70px rgba(0,0,0,0.24)", transition: "transform 220ms ease, border-color 220ms ease, background 220ms ease", animation: `landingFadeUp 680ms ease ${index * 80}ms both` }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "23px", marginBottom: "18px", boxShadow: "0 0 26px rgba(0,212,255,0.10)" }}>{feature.icon}</div>
                <h3 style={{ margin: "0 0 10px", color: "#e8f0ff", fontSize: "15px", lineHeight: "1.35", fontWeight: "900" }}>{feature.title}</h3>
                <p style={{ margin: 0, color: "#8399b2", fontSize: "12px", lineHeight: "1.7" }}>{feature.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "54px", padding: "28px", borderRadius: "22px", background: "linear-gradient(135deg,rgba(0,212,255,0.11),rgba(123,47,255,0.10),rgba(0,255,136,0.07))", border: "1px solid rgba(255,255,255,0.13)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "18px", flexWrap: "wrap", boxShadow: "0 26px 90px rgba(0,0,0,0.30)" }}>
            <div>
              <div style={{ color: "#00ff88", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "8px" }}>Ready To Enter?</div>
              <div style={{ fontSize: "clamp(20px,3vw,30px)", fontWeight: "900", lineHeight: "1.2" }}>Start your first AI debate in seconds.</div>
            </div>
            <button onClick={onLogin} className="landingGlowButton" style={{ background: "linear-gradient(135deg,#00ff88,#00d4ff)", border: "none", color: "#021018", padding: "15px 26px", borderRadius: "14px", fontSize: "13px", fontWeight: "900", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", boxShadow: "0 18px 48px rgba(0,255,136,0.20)", whiteSpace: "nowrap" }}>
              LOGIN / SIGN UP
            </button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#020510", padding: "24px", color: "#526981" }}>
        <div style={{ width: "min(1120px,100%)", margin: "0 auto", display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          <span>VOICE VERSUS</span>
          <span>About · Contact · Privacy · Built for debate practice</span>
        </div>
      </footer>

      <style>{`
        .landingGlowButton:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 22px 62px rgba(0,212,255,0.36); }
        .landingFeatureCard:hover { transform: translateY(-8px); border-color: rgba(0,212,255,0.36); background: linear-gradient(180deg,rgba(0,212,255,0.08),rgba(255,255,255,0.03)); }
        @keyframes landingFadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes landingChatIn { from { opacity:0; transform:translateY(16px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes landingFloat { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-14px) rotate(1deg); } }
        @keyframes landingMouth { 0%,100% { transform:scaleX(0.8); opacity:0.72; } 50% { transform:scaleX(1.24); opacity:1; } }
        @keyframes landingOrbit { to { transform:rotate(360deg); } }
        @keyframes landingBounce { 0%,100% { transform:translateX(-50%) translateY(0); } 50% { transform:translateX(-50%) translateY(8px); } }
        @media (max-width: 900px) {
          .landingHeroGrid { grid-template-columns: 1fr !important; gap: 30px !important; text-align: center; }
          .landingStats { grid-template-columns: 1fr !important; }
          .landingVisual { min-height: 470px !important; }
          .landingFeatureGrid { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
        }
        @media (max-width: 560px) {
          .landingFeatureGrid { grid-template-columns: 1fr !important; }
          .landingVisual { min-height: 430px !important; }
        }
      `}</style>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (mode === "signup" && !name.trim()) { setErr("Please enter your name."); return; }
    if (!email.trim() || !email.includes("@")) { setErr("Please enter a valid email."); return; }
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/${mode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      const user = { ...data.user, access_token: data.access_token };
      storeAuthUser(user);
      onLogin(user);
    } catch (error) {
      setErr(error.message || "Authentication failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020510 0%,#060c1a 50%,#020510 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden", fontFamily: "'Courier New',monospace" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(0,100,255,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "13px", color: "#00d4ff", letterSpacing: "4px", marginBottom: "16px" }}>[ AI DEBATE SYSTEM v2.0 ]</div>
          <h1 style={{ fontSize: "44px", fontWeight: "900", margin: "0 0 8px", letterSpacing: "6px", background: "linear-gradient(90deg,#00d4ff 0%,#7b2fff 50%,#00d4ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VOICE<br />VERSUS</h1>
          <p style={{ color: "#4a6a8a", fontSize: "13px", margin: 0, letterSpacing: "2px" }}>CHALLENGE AN AI OPPONENT</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "20px", padding: "32px", backdropFilter: "blur(20px)", boxShadow: "0 0 60px rgba(0,100,255,0.1)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
            {["login", "signup"].map(item => (
              <button key={item} type="button" onClick={() => { setMode(item); setErr(""); }}
                style={{ background: mode === item ? "rgba(0,212,255,0.16)" : "rgba(255,255,255,0.035)", border: `1px solid ${mode === item ? "rgba(0,212,255,0.55)" : "rgba(255,255,255,0.08)"}`, color: mode === item ? "#00d4ff" : "#6a8aaa", padding: "10px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", fontSize: "11px", fontWeight: "900", textTransform: "uppercase" }}>
                {item}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#00d4ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Operative Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jordan Smith"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "10px", color: "#e8f0ff", padding: "12px 16px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'Courier New',monospace", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(0,212,255,0.2)"} />
          </div>
          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#00d4ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Email Address</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "10px", color: "#e8f0ff", padding: "12px 16px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'Courier New',monospace", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(0,212,255,0.2)"} />
          </div>
          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#00d4ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" type="password"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "10px", color: "#e8f0ff", padding: "12px 16px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'Courier New',monospace", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(0,212,255,0.2)"} />
          </div>
          {err && <div style={{ color: "#ff4444", fontSize: "12px", marginBottom: "16px", letterSpacing: "1px" }}>⚠ {err}</div>}
          <button onClick={handleSubmit} disabled={saving}
            style={{ width: "100%", background: "linear-gradient(135deg,#00d4ff,#7b2fff)", border: "none", color: "white", padding: "15px", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: saving ? "wait" : "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "3px", transition: "all 0.3s", opacity: saving ? 0.72 : 1 }}
            onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 30px rgba(0,212,255,0.4)" }}
            onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none" }}>
            {saving ? "PLEASE WAIT..." : mode === "signup" ? "CREATE ACCOUNT" : "LOGIN"}
          </button>
          <p style={{ color: "#2a4a6a", fontSize: "11px", textAlign: "center", marginTop: "14px", marginBottom: 0, letterSpacing: "1px" }}>JWT SECURED HISTORY</p>
        </div>
      </div>
    </div>
  );
}

function TopicsScreen({ user, onSelectTopic, onLeaderboard, onHistory, onLogout }) {
  const [customTopic, setCustomTopic] = useState("");
  const [err, setErr] = useState("");

  function startCustom() {
    const t = customTopic.trim();
    if (t.length < 6) { setErr("Enter a clearer topic (6+ characters)."); return; }
    setErr("");
    onSelectTopic({ id: "custom", title: t, category: "Custom", icon: "🎯" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020510 0%,#060c1a 50%,#020510 100%)", color: "#e8f0ff", fontFamily: "'Courier New',monospace", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(0,100,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, padding: "32px 28px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1100px", margin: "0 auto 48px" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "5px", background: "linear-gradient(90deg,#00d4ff,#7b2fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VOICE VERSUS</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "#4a6a8a", letterSpacing: "1px" }}>OPERATIVE: <span style={{ color: "#00d4ff" }}>{user.name.toUpperCase()}</span></span>
            <button onClick={onLeaderboard} style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", color: "#ffd700", padding: "7px 16px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1px" }}>🏆 BOARD</button>
            <button onClick={onHistory} style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", padding: "7px 16px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1px" }}>HISTORY</button>
            <button onClick={onLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#4a6a8a", padding: "7px 16px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1px" }}>LOGOUT</button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <div style={{ fontSize: "11px", color: "#00d4ff", letterSpacing: "4px", marginBottom: "16px" }}>[ SELECT YOUR BATTLEGROUND ]</div>
          <h1 style={{ fontSize: "clamp(36px,6vw,64px)", fontWeight: "900", margin: "0 0 16px", letterSpacing: "6px", background: "linear-gradient(90deg,#00d4ff 0%,#7b2fff 50%,#00d4ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CHOOSE YOUR TOPIC</h1>
          <p style={{ color: "#4a6a8a", fontSize: "14px", margin: 0, letterSpacing: "2px" }}>FACE AN AI OPPONENT IN REAL-TIME VOICE DEBATE</p>
        </div>
        <div style={{ maxWidth: "700px", margin: "0 auto 40px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <input value={customTopic} onChange={e => setCustomTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && startCustom()} placeholder="Or type your own topic…"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "12px", color: "#e8f0ff", padding: "14px 18px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'Courier New',monospace" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(0,212,255,0.2)"} />
            {err && <div style={{ color: "#ff4444", fontSize: "12px", marginTop: "6px", letterSpacing: "1px" }}>⚠ {err}</div>}
          </div>
          <button onClick={startCustom} style={{ background: "linear-gradient(135deg,#00d4ff,#7b2fff)", border: "none", color: "white", padding: "14px 24px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "2px", whiteSpace: "nowrap", flexShrink: 0 }}>START →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "16px", maxWidth: "1100px", margin: "0 auto" }}>
          {TOPICS.map((topic, idx) => (
            <div key={topic.id} onClick={() => onSelectTopic(topic)}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "16px", padding: "24px 26px", cursor: "pointer", transition: "all 0.3s", position: "relative", overflow: "hidden" }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "rgba(0,212,255,0.4)"; el.style.background = "rgba(0,212,255,0.06)"; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 16px 40px rgba(0,100,255,0.15)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "rgba(0,212,255,0.12)"; el.style.background = "rgba(255,255,255,0.03)"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{topic.icon}</div>
              <div style={{ fontSize: "10px", color: "#00d4ff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>{topic.category}</div>
              <div style={{ fontSize: "15px", fontWeight: "700", lineHeight: "1.4", color: "#c8d8e8", letterSpacing: "0.5px" }}>{topic.title}</div>
              <div style={{ position: "absolute", right: "18px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", color: "rgba(0,212,255,0.2)" }}>→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PositionScreen({ topic, onChoose, onBack }) {
  const [diff, setDiff] = useState("medium");
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020510 0%,#060c1a 50%,#020510 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New',monospace", padding: "24px", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(123,47,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "600px", width: "100%" }}>
        <div style={{ fontSize: "11px", color: "#00d4ff", letterSpacing: "3px", marginBottom: "14px" }}>{topic.icon} {topic.category.toUpperCase()}</div>
        <h2 style={{ fontSize: "clamp(20px,3.5vw,28px)", fontWeight: "900", marginBottom: "44px", lineHeight: "1.3", color: "#e8f0ff", letterSpacing: "1px" }}>"{topic.title}"</h2>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "11px", color: "#4a6a8a", letterSpacing: "3px", marginBottom: "14px" }}>SELECT DIFFICULTY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
            {DIFFICULTIES.map(d => {
              const active = diff === d.id;
              return (
                <button key={d.id} onClick={() => setDiff(d.id)}
                  style={{ background: active ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.08)"}`, color: active ? "#00d4ff" : "#4a6a8a", padding: "14px 10px", borderRadius: "12px", cursor: "pointer", fontFamily: "'Courier New',monospace", transition: "all 0.2s", boxShadow: active ? "0 0 20px rgba(0,212,255,0.15)" : "none" }}>
                  <div style={{ fontSize: "22px", marginBottom: "5px" }}>{d.icon}</div>
                  <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "1px" }}>{d.label.toUpperCase()}</div>
                  <div style={{ fontSize: "10px", marginTop: "3px", opacity: 0.7 }}>{d.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "11px", color: "#4a6a8a", letterSpacing: "3px", marginBottom: "16px" }}>CHOOSE YOUR STANCE</div>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            {[
              { pos: "FOR", c: "#00ff88", bg: "rgba(0,255,136,0.08)", b: "rgba(0,255,136,0.3)", label: "I SUPPORT THIS" },
              { pos: "AGAINST", c: "#ff4444", bg: "rgba(255,68,68,0.08)", b: "rgba(255,68,68,0.3)", label: "I OPPOSE THIS" }
            ].map(b => (
              <button key={b.pos} onClick={() => onChoose(b.pos, diff)}
                style={{ background: b.bg, border: `1px solid ${b.b}`, color: b.c, padding: "18px 36px", borderRadius: "14px", fontSize: "14px", fontWeight: "900", cursor: "pointer", transition: "all 0.25s", fontFamily: "'Courier New',monospace", letterSpacing: "2px", flex: 1, maxWidth: "220px" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05) translateY(-3px)"; e.currentTarget.style.boxShadow = `0 16px 40px ${b.c}25` }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) translateY(0)"; e.currentTarget.style.boxShadow = "none" }}>
                {b.pos === "FOR" ? "👍" : "👎"} {b.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: "#4a6a8a", cursor: "pointer", fontSize: "13px", fontFamily: "'Courier New',monospace", letterSpacing: "2px" }}>← BACK TO TOPICS</button>
      </div>
    </div>
  );
}

// ── Main Debate Screen ────────────────────────────────────────────────────────
function DebateScreen({ user, topic, position, difficulty, onFinish, onLeaderboard }) {
  const [turns, setTurns] = useState([]);
  const [conversationLog, setConversationLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [confidenceAnalysis, setConfidenceAnalysis] = useState(null);
  const [integrityAlert, setIntegrityAlert] = useState("");
  const [status, setStatus] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [faceOutDisplay, setFaceOutDisplay] = useState(false);

  const faceOutRef = useRef(false);
  const confidenceAnalysisRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const containerRef = useRef(null);
  const analysisSamplesRef = useRef([]);
  const integrityEventsRef = useRef([]);
  const recordingRef = useRef(false);
  const turnsRef = useRef([]);
  const conversationLogRef = useRef([]);
  const autoDebateRef = useRef(false);
  const processingTurnRef = useRef(false);
  const maxTurnTimerRef = useRef(null);
  const silenceFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const micFilterContextRef = useRef(null);
  const speechInterruptedRef = useRef(false);
  const alexSpeakTimerRef = useRef(null);

  useEffect(() => { recordingRef.current = recording; }, [recording]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { conversationLogRef.current = conversationLog; }, [conversationLog]);

  const latestTurn = turns[turns.length - 1];
  const latestExchange = conversationLog[conversationLog.length - 1] || latestTurn;
  const scores = turns.map(t => t.scores?.overall || 0);

  const faceVerified = confidenceAnalysis?.faceVisible === true && confidenceAnalysis?.integrityStatus !== "red";
  const cameraBlockReason = confidenceAnalysis?.integrityIssue || "Show one clear face in the camera before speaking.";

  // ── Mouse parallax
  useEffect(() => {
    function onMouseMove(e) {
      setMousePos({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 });
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // ── Auto-finish after MAX_TURNS
  useEffect(() => {
    if (turns.length >= MAX_TURNS) setTimeout(() => onFinish(turns), 1800);
  }, [onFinish, turns]);

  // ── Load voices
  useEffect(() => {
    if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = () => { };
  }, []);

  // ── Recording timer
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setRecordingTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  function cleanupRecordingWatchers() {
    if (maxTurnTimerRef.current) { clearTimeout(maxTurnTimerRef.current); maxTurnTimerRef.current = null; }
    if (silenceFrameRef.current) { cancelAnimationFrame(silenceFrameRef.current); silenceFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null; }
  }

  function cleanupMicFilter() {
    if (micFilterContextRef.current) {
      micFilterContextRef.current.close().catch(() => { });
      micFilterContextRef.current = null;
    }
  }

  function clearAlexSpeakTimer() {
    if (alexSpeakTimerRef.current) {
      clearTimeout(alexSpeakTimerRef.current);
      alexSpeakTimerRef.current = null;
    }
  }

  function createFilteredMicStream(rawStream) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return rawStream;

    try {
      const audioContext = new AudioContextClass();
      micFilterContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(rawStream);
      const highPass = audioContext.createBiquadFilter();
      const lowPass = audioContext.createBiquadFilter();
      const compressor = audioContext.createDynamicsCompressor();
      const destination = audioContext.createMediaStreamDestination();

      highPass.type = "highpass";
      highPass.frequency.value = 90;
      highPass.Q.value = 0.7;
      lowPass.type = "lowpass";
      lowPass.frequency.value = 7800;
      lowPass.Q.value = 0.7;
      compressor.threshold.value = -48;
      compressor.knee.value = 24;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.18;

      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(compressor);
      compressor.connect(destination);
      return destination.stream;
    } catch {
      cleanupMicFilter();
      return rawStream;
    }
  }

  function beginAutoStopDetection(stream) {
    cleanupRecordingWatchers();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { maxTurnTimerRef.current = setTimeout(() => stopAndSubmitCurrentTurn(), MAX_SPEAKING_MS); return; }
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const startedAt = performance.now();
    let speechStarted = false;
    let silenceStartedAt = null;
    let noiseFloor = MIN_VOICE_RMS_THRESHOLD / NOISE_GATE_MULTIPLIER;
    let voicePeakRms = 0;
    const tick = () => {
      if (!recordingRef.current || processingTurnRef.current) return;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) { const c = (samples[i] - 128) / 128; sum += c * c; }
      const rms = Math.sqrt(sum / samples.length);
      const now = performance.now();
      const elapsed = now - startedAt;
      const calibrating = elapsed < NOISE_CALIBRATION_MS;
      if (!speechStarted && (calibrating || rms < noiseFloor * 1.8)) {
        noiseFloor = noiseFloor * 0.94 + rms * 0.06;
      }
      const graceDone = now - startedAt > SPEECH_GRACE_MS;
      const minRecordingDone = elapsed > MIN_RECORDING_MS;
      const voiceThreshold = Math.min(
        MAX_DEMO_VOICE_THRESHOLD,
        Math.max(MIN_VOICE_RMS_THRESHOLD, noiseFloor * NOISE_GATE_MULTIPLIER)
      );
      const speechStartThreshold = Math.max(voiceThreshold, MIN_VOICE_RMS_THRESHOLD * 1.65);
      const speechContinueThreshold = speechStarted
        ? Math.max(voiceThreshold, voicePeakRms * VOICE_DROP_SILENCE_RATIO)
        : speechStartThreshold;
      const hasVoice = !calibrating && rms > speechContinueThreshold;
      if (hasVoice) {
        speechStarted = true;
        voicePeakRms = Math.max(voicePeakRms * 0.992, rms);
        silenceStartedAt = null;
      }
      else if (speechStarted && graceDone && minRecordingDone) {
        silenceStartedAt ??= now;
        if (now - silenceStartedAt >= SILENCE_STOP_MS) { stopAndSubmitCurrentTurn(); return; }
      }
      else if (!speechStarted && elapsed > NO_SPEECH_AUTO_STOP_MS) {
        stopAndSubmitCurrentTurn();
        return;
      }
      silenceFrameRef.current = requestAnimationFrame(tick);
    };
    silenceFrameRef.current = requestAnimationFrame(tick);
    maxTurnTimerRef.current = setTimeout(() => stopAndSubmitCurrentTurn(), MAX_SPEAKING_MS);
  }

  const handleFaceOut = useCallback((isOut) => {
    faceOutRef.current = isOut;
    setFaceOutDisplay(isOut);
    if (isOut && recordingRef.current) {
      setStatus("🚫 Face lost — recording stopped");
      cleanupRecordingWatchers();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current.rawStream?.getTracks().forEach(t => t.stop());
        cleanupMicFilter();
      }
      setRecording(false);
      recordingRef.current = false;
      setRecordingTime(0);
    }
    if (!isOut) setStatus(prev => prev === "🚫 Face lost — recording stopped" ? "" : prev);
  }, []);

  useEffect(() => () => {
    cleanupRecordingWatchers();
    clearAlexSpeakTimer();
  }, []);

  const handleAnalysisUpdate = useCallback((analysis) => {
    const merged = integrityAlert ? { ...analysis, integrityStatus: "red", integrityIssue: integrityAlert } : analysis;
    setConfidenceAnalysis(merged);
    confidenceAnalysisRef.current = merged;
    analysisSamplesRef.current = [...analysisSamplesRef.current.slice(-18), merged];
  }, [integrityAlert]);

  useEffect(() => {
    function flagIntegrity(message) {
      integrityEventsRef.current = [...integrityEventsRef.current, { message, time: new Date().toLocaleTimeString() }].slice(-10);
      setIntegrityAlert(message);
      const current = confidenceAnalysisRef.current || getDefaultConfidenceAnalysis();
      const next = { ...current, confidenceScore: Math.min(current.confidenceScore || 4, 3), integrityStatus: "red", integrityIssue: message };
      confidenceAnalysisRef.current = next;
      setConfidenceAnalysis(next);
      window.setTimeout(() => setIntegrityAlert(""), 4500);
    }
    function blockCopy(e) { e.preventDefault(); flagIntegrity("Copy/paste is blocked during debate"); }
    function blockContext(e) { e.preventDefault(); flagIntegrity("Right-click is blocked during debate"); }
    function handleBlur() { flagIntegrity("Window or tab switch detected"); }
    window.addEventListener("copy", blockCopy);
    window.addEventListener("cut", blockCopy);
    window.addEventListener("paste", blockCopy);
    window.addEventListener("contextmenu", blockContext);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("copy", blockCopy);
      window.removeEventListener("cut", blockCopy);
      window.removeEventListener("paste", blockCopy);
      window.removeEventListener("contextmenu", blockContext);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  async function startRecording() {
    if (recordingRef.current || processingTurnRef.current) return;
    const latestAnalysis = confidenceAnalysisRef.current;
    const faceReady = !faceOutRef.current && latestAnalysis !== null && latestAnalysis.faceVisible === true && latestAnalysis.integrityStatus !== "red";
    if (!faceReady) { setStatus("🚫 Face not detected — please look at camera first"); return; }
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia(MIC_AUDIO_CONSTRAINTS);
      const stream = createFilteredMicStream(rawStream);
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? { mimeType: "audio/webm;codecs=opus" } : {});
      rec.rawStream = rawStream;
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = e => audioChunksRef.current.push(e.data);
      rec.start(250);
      analysisSamplesRef.current = [];
      setConfidenceAnalysis(null);
      setRecordingTime(0);
      setRecording(true);
      recordingRef.current = true;
      setStatus("🔊 Listening in demo noise mode — speak close, click again to submit");
      beginAutoStopDetection(stream);
    } catch (err) {
      setStatus("❌ Mic error: " + err.message);
    }
  }

  async function stopRecording() {
    cleanupRecordingWatchers();
    return new Promise(resolve => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        mediaRecorderRef.current?.rawStream?.getTracks().forEach(t => t.stop());
        cleanupMicFilter();
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" })); return;
      }
      mediaRecorderRef.current.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || "audio/webm" }));
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.rawStream?.getTracks().forEach(t => t.stop());
      cleanupMicFilter();
      setRecording(false);
      recordingRef.current = false;
      setRecordingTime(0);
    });
  }

  async function stopAndSubmitCurrentTurn() {
    if (!recordingRef.current || processingTurnRef.current) return;
    processingTurnRef.current = true;
    const audioBlob = await stopRecording();
    await processAudioTurn(audioBlob);
    processingTurnRef.current = false;
  }

  async function processAudioTurn(audioBlob) {
    setLoading(true); setIsThinking(true); setStatus("⏳ Alex is thinking…");
    try {
      const currentTurns = turnsRef.current;
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("topic", topic.title);
      formData.append("position", position);
      formData.append("difficulty", difficulty);
      formData.append("history", JSON.stringify(currentTurns));

      const res = await fetch(`${API_BASE}/debate/voice-turn`, { method: "POST", headers: authHeaders(user), body: formData });
      let data = await res.json();

      if (data.error) {
        const canUseTypedFallback = /speech recognition|deepgram|network|type your argument/i.test(data.error);
        if (canUseTypedFallback) {
          const typedArgument = window.prompt("Speech service is offline. Type the argument you just said to continue the demo:");
          if (typedArgument?.trim()) {
            const fallbackData = new FormData();
            fallbackData.append("audio", new Blob([], { type: "audio/webm" }), "manual.webm");
            fallbackData.append("transcript", typedArgument.trim());
            fallbackData.append("topic", topic.title);
            fallbackData.append("position", position);
            fallbackData.append("difficulty", difficulty);
            fallbackData.append("history", JSON.stringify(currentTurns));
            const fallbackRes = await fetch(`${API_BASE}/debate/voice-turn`, { method: "POST", headers: authHeaders(user), body: fallbackData });
            data = await fallbackRes.json();
          }
        }
        if (data.error) { setStatus("❌ " + data.error); setLoading(false); setIsThinking(false); return; }
      }
      if (data.noise_detected) {
        setStatus("🎙️ Couldn't hear clearly — please repeat");
      }

      if (data.end || data.is_debate_over) {
        autoDebateRef.current = false;
        setIsThinking(false); setIsSpeaking(false); setLoading(false);
        setStatus("📊 Here is your report");
        window.speechSynthesis.cancel();
        if (!getBestVoice()) await new Promise(r => setTimeout(r, 300));
        const utt = createAlexUtterance("Here is your report.", "easy");
        window.speechSynthesis.speak(utt);
        onFinish(currentTurns);
        return;
      }

      const roundConfidence = summarizeConfidenceAnalysis(analysisSamplesRef.current) || confidenceAnalysisRef.current || getDefaultConfidenceAnalysis();
      const integrityEvents = integrityEventsRef.current.slice();
      const nextExchange = {
        userArgument: data.user_text,
        aiResponse: data.ai_response,
        fallacies: data.fallacy_analysis,
        scores: data.scores,
        confidenceAnalysis: roundConfidence,
        integrityEvents,
        nonDebate: Boolean(data.non_debate),
      };
      const nextConversationLog = [...conversationLogRef.current, nextExchange];
      conversationLogRef.current = nextConversationLog;
      setConversationLog(nextConversationLog);
      const nextTurns = data.non_debate
        ? currentTurns
        : [...currentTurns, nextExchange];
      turnsRef.current = nextTurns;
      if (!data.non_debate) setTurns(nextTurns);
      setIsThinking(false); setIsSpeaking(true); setStatus("💬 Alex is speaking…");
      window.speechSynthesis.cancel();
      clearAlexSpeakTimer();

      if (!getBestVoice()) await new Promise(r => setTimeout(r, 300));
      const utt = createAlexUtterance(data.ai_response, difficulty);
      utt.onend = () => {
        if (speechInterruptedRef.current) { speechInterruptedRef.current = false; return; }
        setIsSpeaking(false); setStatus(""); setLoading(false);
        if (autoDebateRef.current && nextTurns.length < MAX_TURNS && !faceOutRef.current) {
          window.setTimeout(() => startRecording(), 450);
        }
      };
      setStatus("💬 Alex is starting…");
      alexSpeakTimerRef.current = window.setTimeout(() => {
        alexSpeakTimerRef.current = null;
        setStatus("💬 Alex is speaking…");
        window.speechSynthesis.speak(utt);
      }, SPEAKER_HANDOFF_DELAY_MS);
    } catch (err) {
      setStatus("❌ " + err.message);
      setLoading(false); setIsThinking(false); setIsSpeaking(false);
    }
  }

  function handleEmergencyInterject() {
    if (!isSpeaking) return;
    speechInterruptedRef.current = true;
    autoDebateRef.current = true;
    clearAlexSpeakTimer();
    window.speechSynthesis.cancel();
    setIsSpeaking(false); setLoading(false);
    setStatus("🚨 Interjection — listening…");
    window.setTimeout(() => { if (!recordingRef.current && !faceOutRef.current) startRecording(); }, 150);
  }

  async function handleVoiceDebate() {
    if (loading || isSpeaking || isThinking) return;
    if (!recording && faceOutRef.current) { setStatus("🚫 " + cameraBlockReason); return; }
    autoDebateRef.current = true;
    if (recording) await stopAndSubmitCurrentTurn();
    else await startRecording();
  }

  const rotX = (-mousePos.y * 8).toFixed(2);
  const rotY = (mousePos.x * 10).toFixed(2);
  const tX = (mousePos.x * 18).toFixed(2);
  const tY = (mousePos.y * 12).toFixed(2);

  const statusColor = isSpeaking ? "#ff6b35" : recording ? "#ff4444" : isThinking ? "#ffc107" : "#00d4ff";
  const statusLabel = isSpeaking ? "SPEAKING" : recording ? "LISTENING" : isThinking ? "THINKING" : "READY";

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh", background: "#020510", overflow: "hidden", position: "relative", fontFamily: "'Courier New',monospace", color: "#e8f0ff", userSelect: "none" }}>
      <FacialAnalysis isActive={true} onAnalysisUpdate={handleAnalysisUpdate} onFaceOut={handleFaceOut} />

      {/* AMBIENT GLOW */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, transition: "background 1.2s ease", pointerEvents: "none",
        background: isSpeaking ? "radial-gradient(ellipse at 50% 40%, rgba(255,107,53,0.18) 0%, transparent 65%)"
          : recording ? "radial-gradient(ellipse at 50% 40%, rgba(220,50,50,0.16) 0%, transparent 65%)"
            : isThinking ? "radial-gradient(ellipse at 50% 40%, rgba(255,193,7,0.14) 0%, transparent 65%)"
              : "radial-gradient(ellipse at 50% 50%, rgba(0,80,200,0.14) 0%, transparent 65%)",
      }} />

      {/* GRID */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none" }} />

      {/* ROBOT */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, perspective: "1200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: "100%", height: "calc(100% + 230px)", position: "relative",
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) translateX(${tX}px) translateY(${tY - 105}px) translateZ(20px)`,
          transition: "transform 0.12s cubic-bezier(.2,.9,.2,1)",
          transformStyle: "preserve-3d",
        }}>
          <img
            src="/alex.png"
            alt="Alex — AI Debater"
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              display: "block",
              filter: isSpeaking
                ? "drop-shadow(0 0 60px rgba(255,107,53,0.5)) drop-shadow(0 30px 80px rgba(255,107,53,0.25)) brightness(1.05)"
                : recording ? "drop-shadow(0 0 50px rgba(220,50,50,0.45)) brightness(1.03)"
                  : "drop-shadow(0 20px 80px rgba(0,50,200,0.4)) brightness(0.98)",
              transition: "filter 600ms ease",
              animation: "robotFloat 7s ease-in-out infinite",
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(0,212,255,0.02) 100%)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* TOP HUD */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "linear-gradient(to bottom, rgba(2,5,16,0.85) 0%, transparent 100%)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "12px", padding: "10px 16px" }}>
            <div style={{ fontSize: "9px", color: "#4a6a8a", letterSpacing: "2px", marginBottom: "3px" }}>TOPIC</div>
            <div style={{ fontSize: "13px", color: "#c8d8e8", maxWidth: "340px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{topic.icon} {topic.title}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ background: `${position === "FOR" ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)"}`, backdropFilter: "blur(16px)", border: `1px solid ${position === "FOR" ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`, borderRadius: "20px", padding: "5px 14px", fontSize: "11px", color: position === "FOR" ? "#00ff88" : "#ff4444", fontWeight: "700", letterSpacing: "1.5px" }}>
              YOUR SIDE: {position}
            </div>
            <div style={{ background: "rgba(255,165,0,0.08)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,165,0,0.25)", borderRadius: "20px", padding: "5px 14px", fontSize: "11px", color: "#ffa040", letterSpacing: "1.5px", textTransform: "uppercase" }}>{difficulty}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onLeaderboard} style={{ background: "rgba(255,215,0,0.06)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,215,0,0.2)", color: "#ffd700", padding: "6px 14px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1px" }}>🏆 BOARD</button>
            <button onClick={() => onFinish(turns)} disabled={turns.length === 0}
              style={{ background: turns.length === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,212,255,0.08)", backdropFilter: "blur(16px)", border: `1px solid ${turns.length === 0 ? "rgba(255,255,255,0.06)" : "rgba(0,212,255,0.25)"}`, color: turns.length === 0 ? "#2a3a4a" : "#00d4ff", padding: "6px 14px", borderRadius: "20px", fontSize: "11px", cursor: turns.length === 0 ? "not-allowed" : "pointer", fontFamily: "'Courier New',monospace", letterSpacing: "1px" }}>REPORT</button>
          </div>
          <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "20px", padding: "6px 18px", fontSize: "13px", color: "#00d4ff", fontWeight: "700", letterSpacing: "2px" }}>
            TURN {Math.min(turns.length + 1, MAX_TURNS)} / {MAX_TURNS}
          </div>
        </div>
      </div>

      {/* STATUS BADGE */}
      <div style={{ position: "absolute", top: "100px", left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
        <div style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(20px)", border: `1px solid ${statusColor}30`, borderRadius: "30px", padding: "7px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusColor, animation: (isSpeaking || recording || isThinking) ? "statusPulse 1s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: "11px", color: statusColor, letterSpacing: "2.5px", fontWeight: "700" }}>{statusLabel}</span>
        </div>
      </div>

      {/* LATEST AI SPEECH */}
      {latestExchange && (
        <div style={{ position: "absolute", bottom: "90px", left: "50%", transform: "translateX(-50%)", zIndex: 20, width: "min(620px, 88vw)", animation: "fadeUp 0.4s ease both" }}>
          <div style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(24px)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "18px", padding: "16px 22px" }}>
            <div style={{ fontSize: "9px", color: "#00d4ff", letterSpacing: "2.5px", marginBottom: "7px" }}>ALEX</div>
            <div style={{ fontSize: "14px", lineHeight: "1.65", color: "#c8d8e8" }}>{latestExchange.aiResponse}</div>
            {latestExchange.scores?.coach_tip && !latestExchange.nonDebate && (
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "12px", color: "#4a6a8a" }}>
                💡 <span style={{ color: "#7b8faa" }}>{latestExchange.scores.coach_tip}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {turns.length === 0 && !loading && (
        <div style={{ position: "absolute", bottom: "150px", left: "50%", transform: "translateX(-50%)", zIndex: 20, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: "13px", color: "rgba(0,212,255,0.4)", letterSpacing: "2px", animation: "breathe 3s ease-in-out infinite" }}>TAP THE MIC TO MAKE YOUR OPENING ARGUMENT</div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div style={{ position: "absolute", bottom: "95px", left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: "7px", alignItems: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(20px)", borderRadius: "30px", padding: "12px 24px", border: "1px solid rgba(0,212,255,0.15)" }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00d4ff", animation: "bounce 1s ease infinite", animationDelay: `${i * 0.18}s` }} />)}
          <span style={{ fontSize: "12px", color: "#00d4ff", letterSpacing: "2px", marginLeft: "6px" }}>PROCESSING</span>
        </div>
      )}

      {/* RIGHT SIDEBAR */}
      {conversationLog.length > 0 && (
        <div style={{ position: "absolute", right: "20px", top: "140px", bottom: "140px", zIndex: 20, width: "260px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
          {scores.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "14px", padding: "14px" }}>
              <div style={{ fontSize: "9px", color: "#4a6a8a", letterSpacing: "2px", marginBottom: "10px" }}>SCORE PROGRESS</div>
              <ScoreGraph scores={scores} />
            </div>
          )}
          <div style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "14px", padding: "14px", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: "9px", color: "#4a6a8a", letterSpacing: "2px", marginBottom: "10px" }}>CONVERSATION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {conversationLog.slice(-4).map((turn, i) => {
                const rn = conversationLog.length - conversationLog.slice(-4).length + i + 1;
                return (
                  <div key={i} style={{ borderLeft: "2px solid rgba(0,212,255,0.2)", paddingLeft: "10px" }}>
                    <div style={{ fontSize: "9px", color: "#4a6a8a", marginBottom: "4px", letterSpacing: "1px" }}>
                      {turn.nonDebate ? `CHAT ${rn}` : `ROUND ${turns.indexOf(turn) + 1 || rn} · ${turn.scores?.overall || 0}/10`}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6a8aaa", lineHeight: "1.5", marginBottom: "3px" }}>
                      <span style={{ color: "#4a90d4" }}>YOU: </span>{turn.userArgument?.slice(0, 70)}{turn.userArgument?.length > 70 ? "…" : ""}
                    </div>
                    {turn.fallacies?.detected && turn.fallacies?.fallacies?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "4px" }}>
                        {turn.fallacies.fallacies.map((f, fi) => (
                          <span key={fi} style={{ background: "rgba(200,50,50,0.1)", border: "1px solid rgba(200,50,50,0.2)", borderRadius: "4px", padding: "1px 6px", fontSize: "9px", color: "#cc6666" }}>
                            ⚠ {f.type?.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL BAR */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, background: "linear-gradient(to top, rgba(2,5,16,0.95) 0%, transparent 100%)", padding: "20px 32px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "28px" }}>
        <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "12px", padding: "10px 18px", textAlign: "center", minWidth: "80px" }}>
          <div style={{ fontSize: "24px", fontWeight: "900", color: "#00d4ff", lineHeight: 1 }}>{turns.length}<span style={{ fontSize: "12px", color: "#2a4a6a", fontWeight: "400" }}>/{MAX_TURNS}</span></div>
          <div style={{ fontSize: "9px", color: "#2a4a6a", marginTop: "2px", letterSpacing: "1.5px" }}>TURNS</div>
        </div>

        <button onClick={handleVoiceDebate} disabled={loading || turns.length >= MAX_TURNS}
          style={{
            width: "80px", height: "80px", borderRadius: "50%", flexShrink: 0, fontSize: "28px",
            background: recording ? "rgba(180,20,20,0.9)" : loading || turns.length >= MAX_TURNS ? "rgba(30,40,60,0.7)" : faceOutDisplay ? "rgba(120,30,30,0.72)" : "rgba(0,212,255,0.12)",
            border: recording ? "2px solid rgba(255,80,80,0.7)" : loading || turns.length >= MAX_TURNS ? "2px solid rgba(30,50,80,0.5)" : faceOutDisplay ? "2px solid rgba(255,68,68,0.65)" : "2px solid rgba(0,212,255,0.5)",
            color: "white", cursor: loading || turns.length >= MAX_TURNS ? "not-allowed" : "pointer", transition: "all 0.25s cubic-bezier(.2,.9,.2,1)",
            boxShadow: recording ? "0 0 0 10px rgba(220,50,50,0.12), 0 0 40px rgba(220,50,50,0.5)" : loading ? "none" : faceOutDisplay ? "0 0 0 8px rgba(255,68,68,0.08), 0 0 30px rgba(255,68,68,0.25)" : "0 0 0 8px rgba(0,212,255,0.06), 0 0 30px rgba(0,212,255,0.2)",
            animation: recording ? "micPulse 1.1s ease-in-out infinite" : "none", backdropFilter: "blur(20px)",
          }}
          onMouseEnter={e => { if (!recording && !loading && turns.length < MAX_TURNS && !faceOutDisplay) { e.currentTarget.style.background = "rgba(0,212,255,0.25)"; e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 0 0 10px rgba(0,212,255,0.08),0 0 50px rgba(0,212,255,0.35)"; } }}
          onMouseLeave={e => { if (!recording) { e.currentTarget.style.background = loading || turns.length >= MAX_TURNS ? "rgba(30,40,60,0.7)" : faceOutDisplay ? "rgba(120,30,30,0.72)" : "rgba(0,212,255,0.12)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = loading || turns.length >= MAX_TURNS ? "none" : faceOutDisplay ? "0 0 0 8px rgba(255,68,68,0.08),0 0 30px rgba(255,68,68,0.25)" : "0 0 0 8px rgba(0,212,255,0.06),0 0 30px rgba(0,212,255,0.2)"; } }}
        >
          {recording ? "⏹" : loading ? "⟳" : "🎙️"}
        </button>

        <button onClick={handleEmergencyInterject} disabled={!isSpeaking} title="Interrupt Alex and speak now"
          style={{
            width: "54px", height: "54px", borderRadius: "50%", flexShrink: 0, fontSize: "22px",
            background: isSpeaking ? "rgba(255,68,68,0.18)" : "rgba(30,40,60,0.45)",
            border: isSpeaking ? "2px solid rgba(255,68,68,0.7)" : "2px solid rgba(45,60,82,0.55)",
            color: isSpeaking ? "#ff7777" : "#40546a", cursor: isSpeaking ? "pointer" : "not-allowed",
            transition: "all 0.25s cubic-bezier(.2,.9,.2,1)",
            boxShadow: isSpeaking ? "0 0 0 7px rgba(255,68,68,0.08), 0 0 24px rgba(255,68,68,0.28)" : "none",
            backdropFilter: "blur(20px)",
          }}
          onMouseEnter={e => { if (isSpeaking) { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.background = "rgba(255,68,68,0.28)"; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = isSpeaking ? "rgba(255,68,68,0.18)" : "rgba(30,40,60,0.45)"; }}>
          ⚡
        </button>

        <div style={{ textAlign: "left", minWidth: "240px" }}>
          <div style={{ fontSize: "14px", color: recording ? "#ff6b6b" : loading ? "#ffc107" : turns.length >= MAX_TURNS ? "#4a6a8a" : "#8aa8c8", marginBottom: "4px", fontWeight: recording ? "700" : "400", letterSpacing: "0.5px" }}>
            {status || (turns.length >= MAX_TURNS ? "Debate complete — view your report" : faceOutDisplay ? "Face not detected — look at camera" : "Click once to start auto debate")}
          </div>
          <div style={{ fontSize: "11px", color: "#2a4a6a", letterSpacing: "1px" }}>
            {recording ? "SPEAK CLOSE TO THE MIC — CLICK AGAIN TO SUBMIT" : faceOutDisplay ? "CENTER ONE CLEAR FACE IN CAMERA" : "MIC REOPENS AFTER ALEX FINISHES"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes robotFloat {
          0%,100%{transform:translateY(0) rotate(0.0deg)}
          25%{transform:translateY(-12px) rotate(0.3deg)}
          50%{transform:translateY(-6px) rotate(0deg)}
          75%{transform:translateY(-14px) rotate(-0.3deg)}
        }
        @keyframes bounce {0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes micPulse {
          0%,100%{box-shadow:0 0 0 10px rgba(220,50,50,0.12),0 0 40px rgba(220,50,50,0.5)}
          50%{box-shadow:0 0 0 18px rgba(220,50,50,0.06),0 0 60px rgba(220,50,50,0.7)}
        }
        @keyframes statusPulse {0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeUp {from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes breathe {0%,100%{opacity:0.4}50%{opacity:0.9}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,212,255,0.15);border-radius:4px}
      `}</style>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => getStoredAuthUser());
  const [screen, setScreen] = useState("landing");
  const [multiplayerResult, setMultiplayerResult] =
  useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [position, setPosition] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [debateMode, setDebateMode] = useState(null);
  const [finalTurns, setFinalTurns] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const savedReportKeyRef = useRef("");
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");

  const handleSessionExpired = useCallback(() => {
    clearAuthUser();
    setUser(null);
    setHistorySessions([]);
    setHistoryError("");
    setSaveStatus(null);
    setScreen("login");
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user?.access_token) {
      setHistorySessions([]);
      setHistoryError(user ? "Please login again to load saved debates." : "");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await fetch(`${API_BASE}/debate-sessions`, {
        headers: authHeaders(user),
      });
      const data = await res.json().catch(() => []);
      if (isAuthExpiredResponse(res, data)) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) throw new Error(data.detail || "Could not load debate history");
      setHistorySessions(Array.isArray(data) ? data : []);
    } catch (error) {
      setHistoryError(error.message || "Could not load debate history");
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [handleSessionExpired, user]);

  useEffect(() => {
    if (user?.access_token) loadHistory();
  }, [user?.access_token, loadHistory]);

  function handleLoginSuccess(nextUser) {
    setUser(nextUser);
    storeAuthUser(nextUser);
    setScreen("topics");
  }
  function handleLogout() { clearAuthUser(); setUser(null); setHistorySessions([]); setScreen("landing"); }
  function handleSelectTopic(topic) {
  setSelectedTopic(topic);

  if (debateMode === "multiplayer") {
    setScreen("multiplayer");
  } else {
    setScreen("position");
  }
}
  function handleChoosePosition(pos, diff) { setPosition(pos); setDifficulty(diff); setScreen("debate"); }
  const saveDebateSession = useCallback(async (turns) => {
    if (!user?.access_token) throw new Error("Please login again before saving history.");
    if (!selectedTopic?.title || !turns?.length) throw new Error("No completed debate turns were available to save.");
    const scores = turns.map(t => Number(t.scores?.overall) || 0);
    const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const res = await fetch(`${API_BASE}/debate-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(user) },
      body: JSON.stringify({
        user_name: user.name,
        user_email: user.email,
        topic: selectedTopic.title,
        position,
        difficulty,
        turns,
        report: { averageScore },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (isAuthExpiredResponse(res, data)) {
      handleSessionExpired();
      throw new Error("Your login expired. Please sign in again to save this report.");
    }
    if (!res.ok) throw new Error(data.detail || "Could not save this debate report.");
    await loadHistory();
    return data;
  }, [difficulty, handleSessionExpired, loadHistory, position, selectedTopic?.title, user]);

  useEffect(() => {
    if (screen !== "report" || !finalTurns.length || selectedTopic?.id?.toString().startsWith("saved-")) return;
    const reportKey = `${selectedTopic?.title || ""}|${position || ""}|${difficulty || ""}|${finalTurns.length}|${finalTurns.map(t => t.userArgument || "").join("|")}`;
    if (savedReportKeyRef.current === reportKey) return;
    savedReportKeyRef.current = reportKey;
    setSaveStatus({ type: "saving", message: "Saving report to MySQL..." });
    saveDebateSession(finalTurns)
      .then(() => setSaveStatus({ type: "saved", message: "Saved to MySQL history." }))
      .catch(error => {
        savedReportKeyRef.current = "";
        setSaveStatus({ type: "error", message: error.message || "Could not save this report." });
      });
  }, [difficulty, finalTurns, position, saveDebateSession, screen, selectedTopic]);

  function handleFinish(turns) {
    setFinalTurns(turns);
    setSaveStatus(null);
    setScreen("report");
  }
  function handleOpenSavedSession(session) {
    setSelectedTopic({ id: `saved-${session.id}`, title: session.topic, category: "Saved", icon: "ðŸ“Œ" });
    setPosition(session.position || "FOR");
    setDifficulty(session.difficulty || "medium");
    setFinalTurns(session.turns || []);
    setSaveStatus(null);
    setScreen("report");
  }
  function handleRestart() { setScreen("topics"); setSelectedTopic(null); setPosition(null); setFinalTurns([]); setSaveStatus(null); savedReportKeyRef.current = ""; }

  function handleGetStarted() {if (user) {setScreen("mode");} else {setScreen("login");}}
  function handleLoginNav() { setScreen(user ? "topics" : "login"); }
  function handleSelectMode(mode) {setDebateMode(mode);if (mode === "practice") { setScreen("topics");} else { setScreen("topics");}}
  function handleRoomCreated(room, player) {
  setRoomId(room);
  setPlayerName(player);
  setScreen("waitingRoom");
}

function handleRoomJoined(room, player) {
  setRoomId(room);
  setPlayerName(player);
  setScreen("waitingRoom");
}
function handleStartDebate() {
  setScreen("multiplayerDebate");
}

async function handleDebateFinished() {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/multiplayer/result/${multiplayerRoomId}?player=${encodeURIComponent(
        playerName
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Result error:",
        data
      );
      return;
    }

    setMultiplayerResult(data);
    setScreen("multiplayer-result");

  } catch (error) {
    console.error(
      "Failed to load debate result:",
      error
    );
  }
}
  if (screen === "landing") return <LandingPage onGetStarted={handleGetStarted} onLogin={handleLoginNav} />;
  if (screen === "login") return user
    ? <TopicsScreen user={user} onSelectTopic={handleSelectTopic} onLeaderboard={() => setScreen("leaderboard")} onHistory={() => setScreen("history")} onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLoginSuccess} />;
  if (!user) return <LandingPage onGetStarted={handleGetStarted} onLogin={handleLoginNav} />;
  if (screen === "leaderboard") return <LeaderboardScreen onBack={() => setScreen(selectedTopic ? "debate" : "topics")} currentUser={user.name} />;
  if (screen === "history") return <HistoryScreen sessions={historySessions} loading={historyLoading} err={historyError} onBack={() => setScreen("topics")} onOpenSession={handleOpenSavedSession} onRefresh={loadHistory} />;
  if (screen === "combined") return <CombinedResultPage turns={finalTurns} topic={selectedTopic} position={position} onBack={() => setScreen("report")} onRestart={handleRestart} />;
  if (screen === "report") return <FinalReport turns={finalTurns} topic={selectedTopic} position={position} username={user.name} saveStatus={saveStatus} onRestart={handleRestart} onCombined={() => setScreen("combined")} />;
  if (screen === "mode")return ( <ModeScreen  onSelectMode={handleSelectMode} onBack={() => setScreen("landing")} />);
  if (screen === "multiplayer")
  return (
  <MultiplayerScreen
  selectedTopic={selectedTopic}
  onBack={() => setScreen("topics")}
  onRoomCreated={handleRoomCreated}
  onRoomJoined={handleRoomJoined}
/>
  );
 if (screen === "waitingRoom")
  return (
    <WaitingRoom
      roomId={roomId}
      playerName={playerName}
      onStart={handleStartDebate}
      onBack={() => setScreen("multiplayer")}
    />
  );
 if (screen === "multiplayerDebate")
  return (
    <MultiplayerDebateScreen
      roomId={roomId}
      playerName={playerName}
      topic={selectedTopic?.title}
      opponentName={null}
    />
  );
  if (
  screen === "multiplayer-result"
) {
  return (
    <MultiplayerResult
      result={multiplayerResult}
      playerName={playerName}
      onContinue={() => {
        setMultiplayerResult(null);
        setScreen("mode");
      }}
    />
  );
}
  if (screen === "topics") return <TopicsScreen user={user} onSelectTopic={handleSelectTopic} onLeaderboard={() => setScreen("leaderboard")} onHistory={() => setScreen("history")} onLogout={handleLogout} />;
  if (screen === "position") return <PositionScreen topic={selectedTopic} onChoose={handleChoosePosition} onBack={() => setScreen("topics")} />;
  if (screen === "debate") return <DebateScreen user={user} topic={selectedTopic} position={position} difficulty={difficulty} onFinish={handleFinish} onLeaderboard={() => setScreen("leaderboard")} />;
  return null;
}
