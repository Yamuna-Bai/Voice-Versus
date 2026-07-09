export default function ConfidencePanel({ analysis, isActive, recordingTime }) {
  if (!isActive) return null;

  const score = analysis?.confidenceScore ?? 0;
  const scoreColor = score >= 8 ? "#00ff88" : score >= 6 ? "#00d4ff" : score >= 4 ? "#ffc107" : "#ff4444";
  const fit = analysis?.cameraFit || "checking";
  const status = analysis?.integrityStatus || "yellow";
  const statusColor = status === "red" ? "#ff4444" : status === "yellow" ? "#ffc107" : "#00ff88";
  const hint = getLiveHint(analysis);
  const expressionText = analysis?.expressionMeasured
    ? `${analysis.primaryEmotion}: ${analysis.expressionLevel}%`
    : "expression: measuring";

  return (
    <div
      style={{
        position: "absolute",
        left: "24px",
        top: "306px",
        width: "220px",
        zIndex: 25,
        background: "rgba(0, 0, 0, 0.68)",
        border: `1px solid ${statusColor}88`,
        borderRadius: "10px",
        padding: "9px 10px",
        color: "#e8f0ff",
        fontFamily: "'Courier New', monospace",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
        <div style={{ fontSize: "9px", color: statusColor, letterSpacing: "1.4px" }}>{status === "red" ? "RED LIGHT" : status === "yellow" ? "CHECK CAMERA" : "LIVE CAMERA"}</div>
        <div style={{ fontSize: "11px", color: scoreColor, fontWeight: 900 }}>{score ? score.toFixed(1) : "--"}/10</div>
      </div>

      <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden", marginBottom: "7px" }}>
        <div style={{ width: `${score * 10}%`, height: "100%", background: scoreColor, borderRadius: "999px", transition: "width 0.35s ease" }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "10px", color: "#8aa8c8", lineHeight: 1.35 }}>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
        <span style={{ textTransform: "capitalize", flex: 1 }}>{fit}</span>
        <span style={{ color: recordingTime > 0 ? "#ff6b35" : "#4a6a8a" }}>
          {recordingTime > 0 ? "REC" : "LIVE"}
        </span>
      </div>

      <div style={{ marginTop: "5px", fontSize: "10px", color: "#9bb7d8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "capitalize" }}>
        {expressionText}
      </div>

      <div style={{ marginTop: "6px", fontSize: "10px", color: "#9bb7d8", lineHeight: 1.4 }}>
        {analysis?.liveReport?.summary || "Live facial report is warming up..."}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "4px", marginTop: "8px", color: "#8aa8c8", fontSize: "10px" }}>
        <div>Emotion: {analysis?.liveReport?.expression || "..."}</div>
        <div>Eye contact: {analysis?.liveReport?.contact || "..."}</div>
        <div>Stability: {analysis?.liveReport?.stability || "..."}</div>
        <div>Movement: {analysis?.liveReport?.movement || "..."}</div>
        <div>Posture: {analysis?.liveReport?.posture || "..."}</div>
        <div>Tension: {analysis?.liveReport?.stress || "..."}</div>
      </div>
      <div style={{ marginTop: "8px", fontSize: "9px", color: "#c8d8e8", lineHeight: 1.45 }}>
        {analysis?.liveReport?.recommendations?.slice(0, 2).map((rec, index) => (
          <div key={index}>• {rec}</div>
        ))}
      </div>
      <div style={{ marginTop: "3px", fontSize: "9px", color: "#6f8cad", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {hint}
      </div>
    </div>
  );
}

function getLiveHint(analysis) {
  if (!analysis) return "Keep your face inside the guide.";
  if (analysis.integrityIssue) return analysis.integrityIssue;
  if (analysis.faceCount > 1) return "Only one face should be visible.";
  if (analysis.cameraFit === "face missing") return "Face is not visible.";
  if (analysis.cameraFit === "unusual movement") return "Return to the camera.";
  if (analysis.cameraFit === "move closer") return "Move a little closer.";
  if (analysis.cameraFit === "move back") return "Move a little back.";
  if (analysis.cameraFit === "center your face") return "Center your face in frame.";
  if (analysis.headMovement === "excessive") return "Reduce extra head movement.";
  return "Good framing. Keep speaking naturally.";
}
