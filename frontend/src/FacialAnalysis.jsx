import { useEffect, useRef, useState, useCallback } from "react";

// ─── DEBATE REPORT HELPERS ───────────────────────────────────────────────────

function getConfidenceTier(score) {
  if (score >= 8) return { label: "HIGH", color: "#00ff88", bar: "#00ff88" };
  if (score >= 5.5) return { label: "MED", color: "#ffc107", bar: "#ffc107" };
  return { label: "LOW", color: "#ff4444", bar: "#ff4444" };
}

function getEmotionDebateLabel(emotion) {
  const map = {
    happy: "Positive / Agreeable",
    neutral: "Composed / Focused",
    surprised: "Reactive / Alert",
    angry: "Assertive / Tense",
    disgusted: "Dismissive / Critical",
    fearful: "Nervous / Anxious",
    sad: "Disengaged / Low Energy",
    "not measured": "Analyzing…",
  };
  return map[emotion] || emotion;
}

function getEmotionColor(emotion) {
  const map = {
    happy: "#00e676",
    neutral: "#4fc3f7",
    surprised: "#ffb74d",
    angry: "#ef5350",
    disgusted: "#ab47bc",
    fearful: "#ff7043",
    sad: "#90a4ae",
    "not measured": "#546e7a",
  };
  return map[emotion] || "#90a4ae";
}

function getEyeContactLabel(ec) {
  if (ec === "steady") return { label: "Steady ✓", color: "#00ff88" };
  if (ec === "visible") return { label: "Visible", color: "#ffc107" };
  if (ec === "missing") return { label: "Not Detected", color: "#ff4444" };
  return { label: "Avoiding", color: "#ff7043" };
}

function getPostureLabel(p) {
  if (p === "upright") return { label: "Upright ✓", color: "#00ff88" };
  if (p === "tense") return { label: "Tense", color: "#ffc107" };
  if (p === "visible") return { label: "Detected", color: "#4fc3f7" };
  return { label: p || "—", color: "#90a4ae" };
}

function getNervLabel(score) {
  if (score <= 2) return { label: "Calm", color: "#00ff88" };
  if (score <= 5) return { label: "Mild Tension", color: "#ffc107" };
  if (score <= 7) return { label: "Nervous", color: "#ff7043" };
  return { label: "High Stress", color: "#ff4444" };
}

function getStabilityLabel(s) {
  if (s === "calm") return { label: "Calm ✓", color: "#00ff88" };
  if (s === "balanced") return { label: "Balanced", color: "#4fc3f7" };
  if (s === "nervous") return { label: "Shaky", color: "#ff7043" };
  if (s === "visible") return { label: "Stable", color: "#4fc3f7" };
  return { label: "N/A", color: "#546e7a" };
}

function MiniBar({ value, max = 10, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.4s ease" }} />
    </div>
  );
}

function ReportRow({ label, value, color, showBar, barValue, barMax }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
      <span style={{ color: "#607d8b", fontSize: "8.5px", letterSpacing: "1px", textTransform: "uppercase", width: "72px", flexShrink: 0 }}>
        {label}
      </span>
      {showBar && <MiniBar value={barValue} max={barMax || 10} color={color} />}
      <span style={{ color, fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", whiteSpace: "nowrap", width: showBar ? "40px" : "auto", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

// ─── FACE-OUT ALERT OVERLAY ──────────────────────────────────────────────────

function FaceOutOverlay({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "rgba(255,40,40,0.18)",
      backdropFilter: "blur(2px)", borderRadius: "14px",
    }}>
      <div style={{ fontSize: "22px", marginBottom: "4px" }}>⚠️</div>
      <div style={{ color: "#ff4444", fontFamily: "'Courier New', monospace", fontSize: "9px", fontWeight: 900, letterSpacing: "2px", textAlign: "center" }}>
        FACE NOT<br />DETECTED<br />
        <span style={{ fontSize: "7.5px", color: "#ff8a80", fontWeight: 400 }}>DEBATE PAUSED</span>
      </div>
    </div>
  );
}

// ─── LIVE REPORT PANEL ───────────────────────────────────────────────────────

function LiveDebateReport({ data, faceOut }) {
  if (!data) return null;

  const conf = getConfidenceTier(data.confidenceScore);
  const eye = getEyeContactLabel(data.eyeContact);
  const posture = getPostureLabel(data.speakingPosture);
  const nerv = getNervLabel(data.nervousnessScore);
  const stability = getStabilityLabel(data.facialStability);
  const emotionColor = getEmotionColor(data.primaryEmotion);
  const engColor = data.engagement === "high" ? "#00ff88" : data.engagement === "moderate" ? "#ffc107" : "#ff4444";

  return (
    <div style={{
      position: "absolute",
      left: "0",
      top: "calc(100% + 8px)",
      width: "220px",
      background: "linear-gradient(160deg, rgba(8,16,24,0.97) 80%, rgba(0,40,60,0.97) 100%)",
      border: "1px solid rgba(0,212,255,0.18)",
      borderRadius: "12px",
      padding: "10px 12px 12px",
      zIndex: 25,
      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      pointerEvents: "none",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid rgba(0,212,255,0.12)" }}>
        <span style={{ color: "#00d4ff", fontFamily: "'Courier New', monospace", fontSize: "8.5px", letterSpacing: "2px", fontWeight: 900 }}>
          ◉ LIVE DEBATE REPORT
        </span>
        <span style={{ color: conf.color, fontSize: "8px", fontWeight: 800, letterSpacing: "1px", background: `${conf.color}18`, padding: "2px 6px", borderRadius: "4px" }}>
          {faceOut ? "PAUSED" : conf.label}
        </span>
      </div>

      {/* Confidence Score */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ color: "#546e7a", fontSize: "8px", letterSpacing: "1.5px", textTransform: "uppercase" }}>Confidence</span>
          <span style={{ color: conf.color, fontFamily: "'Courier New', monospace", fontSize: "16px", fontWeight: 900, lineHeight: 1 }}>
            {faceOut ? "—" : `${data.confidenceScore}`}
            <span style={{ fontSize: "8px", color: "#546e7a" }}>/10</span>
          </span>
        </div>
        <MiniBar value={faceOut ? 0 : data.confidenceScore} max={10} color={conf.color} />
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(0,212,255,0.08)", margin: "6px 0" }} />

      {/* Emotion State */}
      <div style={{ marginBottom: "7px" }}>
        <div style={{ color: "#546e7a", fontSize: "7.5px", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "3px" }}>Emotional State</div>
        <div style={{ color: emotionColor, fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.5px" }}>
          {faceOut ? "—" : getEmotionDebateLabel(data.primaryEmotion)}
        </div>
        {!faceOut && data.expressionMeasured && data.primaryEmotionValue > 0 && (
          <div style={{ marginTop: "3px" }}>
            <MiniBar value={data.primaryEmotionValue} max={100} color={emotionColor} />
          </div>
        )}
        {!faceOut && data.secondaryEmotion && data.secondaryEmotion !== "not measured" && (
          <div style={{ color: "#455a64", fontSize: "7.5px", marginTop: "2px" }}>
            + {data.secondaryEmotion} ({data.secondaryEmotionValue}%)
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(0,212,255,0.08)", margin: "6px 0" }} />

      {/* Metrics Grid */}
      <ReportRow
        label="Eye Contact"
        value={faceOut ? "—" : eye.label}
        color={faceOut ? "#546e7a" : eye.color}
      />
      <ReportRow
        label="Posture"
        value={faceOut ? "—" : posture.label}
        color={faceOut ? "#546e7a" : posture.color}
      />
      <ReportRow
        label="Nervousness"
        value={faceOut ? "—" : nerv.label}
        color={faceOut ? "#546e7a" : nerv.color}
        showBar
        barValue={faceOut ? 0 : data.nervousnessScore}
        barMax={10}
      />
      <ReportRow
        label="Stability"
        value={faceOut ? "—" : stability.label}
        color={faceOut ? "#546e7a" : stability.color}
      />
      <ReportRow
        label="Engagement"
        value={faceOut ? "—" : (data.engagement ? data.engagement.charAt(0).toUpperCase() + data.engagement.slice(1) : "—")}
        color={faceOut ? "#546e7a" : engColor}
      />
      <ReportRow
        label="Movement"
        value={faceOut ? "—" : `${data.movementScore}/10`}
        color={faceOut ? "#546e7a" : (data.movementScore >= 7 ? "#00ff88" : data.movementScore >= 5 ? "#ffc107" : "#ff4444")}
        showBar
        barValue={faceOut ? 0 : data.movementScore}
        barMax={10}
      />

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(0,212,255,0.08)", margin: "6px 0" }} />

      {/* Debate Tip */}
      <div style={{ color: "#37474f", fontSize: "7.5px", lineHeight: "1.4", letterSpacing: "0.3px" }}>
        {faceOut
          ? "⚠ Return to frame to resume debate evaluation."
          : getDebateTip(data)}
      </div>

      {/* Source badge */}
      <div style={{ marginTop: "6px", color: "#263238", fontSize: "7px", letterSpacing: "0.5px" }}>
        SRC: {data.analysisSource?.toUpperCase() || "LIVE CAMERA"}
      </div>
    </div>
  );
}

function getDebateTip(data) {
  if (data.nervousnessScore > 6) return "💡 Take a breath — your face shows stress. Slow down, make eye contact.";
  if (data.eyeContact === "avoiding") return "💡 Look directly into the camera to signal confidence.";
  if (data.headMovement === "excessive") return "💡 Reduce head movement — it signals anxiety to the audience.";
  if (data.facialStability === "nervous") return "💡 Keep your expressions controlled and deliberate.";
  if (data.primaryEmotion === "angry") return "💡 Soften your expression — assertiveness wins over aggression.";
  if (data.engagement === "low") return "💡 Show more energy! Nod, vary expression to engage your audience.";
  if (data.confidenceScore >= 8) return "✓ Strong presence. Maintain this delivery.";
  return "💡 Stay centered and hold steady eye contact.";
}

// ─── BROAD SKIN DETECTION (works across skin tones & lighting) ───────────────

function isSkinLike(r, g, b) {
  const brightness = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  const total = r + g + b || 1;
  const nr = r / total;
  const ng = g / total;
  const nb = b / total;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Too dark (shadows/background) or pure black
  if (brightness < 22 || brightness > 245) return false;
  // Avoid pure grays (walls, backgrounds) — very low saturation
  if (saturation < 5) return false;
  // Red channel must be the strongest (skin is warm-toned)
  const rgbSkin = r > 35 && g > 18 && b > 10 && r >= g * 0.82 && r >= b * 0.95 && nr > 0.30 && ng > 0.24 && nb < 0.38;
  const ycbcrSkin = y > 25 && cb >= 68 && cb <= 155 && cr >= 118 && cr <= 190;
  return rgbSkin || ycbcrSkin;
}

function isDarkFeatureLike(r, g, b) {
  const brightness = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return brightness > 8 && brightness < 105 && max - min > 6;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function FacialAnalysis({ isActive, onAnalysisUpdate, onFaceOut }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectionActive, setDetectionActive] = useState(false);
  const [analysisMode, setAnalysisMode] = useState("camera");
  const [integrityStatus, setIntegrityStatus] = useState("yellow");
  const [liveReport, setLiveReport] = useState(null);
  const [faceOut, setFaceOut] = useState(false);

  const detectionIntervalRef = useRef(null);
  const modelPromiseRef = useRef(null);
  const mediaPipeDetectorRef = useRef(null);
  const nativeDetectorRef = useRef(null);
  const previousFrameRef = useRef(null);
  const consecutiveMissRef = useRef(0);
  const consecutiveHitRef = useRef(0);
  const faceOutStateRef = useRef(false);
  const lastStableMetricsRef = useRef(null);

  // ── FIX 1: Use functional setState to avoid stale closure on faceOut ────────
  const handleAnalysisResult = useCallback((rawMetrics) => {
    const metrics = rawMetrics || createMissingFaceAnalysis();
    const isMissing = !metrics.faceVisible || metrics.integrityStatus === "red";

    if (isMissing) {
      consecutiveMissRef.current += 1;
      consecutiveHitRef.current = 0;
      if (consecutiveMissRef.current < 8 && lastStableMetricsRef.current) {
        setLiveReport(lastStableMetricsRef.current);
        setIntegrityStatus(lastStableMetricsRef.current.integrityStatus);
        return;
      }
      if (consecutiveMissRef.current >= 8 && !faceOutStateRef.current) {
        faceOutStateRef.current = true;
        setFaceOut(true);
        if (onFaceOut) onFaceOut(true);
      }
    } else {
      lastStableMetricsRef.current = metrics;
      consecutiveMissRef.current = 0;
      consecutiveHitRef.current += 1;
      if (consecutiveHitRef.current >= 2 && faceOutStateRef.current) {
        faceOutStateRef.current = false;
        setFaceOut(false);
        if (onFaceOut) onFaceOut(false);
      } else if (!faceOutStateRef.current) {
        setFaceOut(false);
      }
    }

    setLiveReport(metrics);
    setIntegrityStatus(faceOutStateRef.current ? "red" : metrics.integrityStatus);
    if (onAnalysisUpdate) onAnalysisUpdate(metrics);
  }, [onAnalysisUpdate, onFaceOut]); // faceOut is NOT a dependency — functional update handles it

  // Initialize face detectors
  useEffect(() => {
    try {
      if ("FaceDetector" in window) {
        nativeDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
        setIsLoading(false);
      }
    } catch (error) {
      console.warn("Native FaceDetector unavailable:", error);
    }

    const loadModels = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/";
        const faceapi = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/dist/face-api.esm.js");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmarksTinyNet.loadFromUri(MODEL_URL),
        ]);
        modelPromiseRef.current = faceapi;
        setIsLoading(false);
      } catch (error) {
        console.error("Face-API loading error:", error);
        if (!nativeDetectorRef.current) setIsLoading(false);
      }
    };

    const loadMediaPipe = async () => {
      try {
        const { FaceDetector, FilesetResolver } = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        mediaPipeDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.35,
        });
        setIsLoading(false);
      } catch (error) {
        console.warn("MediaPipe face detector unavailable:", error);
      }
    };

    loadModels();
    loadMediaPipe();
  }, []);

  // Start/stop camera
  useEffect(() => {
    const video = videoRef.current;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setDetectionActive(true);
        }
      } catch (error) {
        console.error("Camera access denied:", error);
        setDetectionActive(false);
      }
    };

    if (isActive) startVideo();

    return () => {
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  // Run detection loop
  useEffect(() => {
    if (!isActive || !detectionActive) return;

    const runDetection = async () => {
      try {
        const faceapi = modelPromiseRef.current;
        if (!videoRef.current) return;

        // ── Path 1: Native browser FaceDetector ─────────────────────────────
        if (nativeDetectorRef.current) {
          try {
            const nativeDetections = await nativeDetectorRef.current.detect(videoRef.current);
            if (nativeDetections.length > 0) {
              const metrics = calculateNativeFaceConfidence(nativeDetections, videoRef.current, canvasRef.current, previousFrameRef);
              setAnalysisMode("native-face");
              handleAnalysisResult(metrics);
              return;
            }
          } catch (nativeErr) {
            console.warn("Native detector error:", nativeErr);
          }
        }

        // ── Path 2: face-api.js with expressions + landmarks ────────────────
        if (mediaPipeDetectorRef.current) {
          try {
            const mediaPipeResult = mediaPipeDetectorRef.current.detectForVideo(videoRef.current, performance.now());
            const mediaPipeDetections = mediaPipeResult?.detections || [];
            if (mediaPipeDetections.length > 0) {
              const metrics = calculateMediaPipeFaceConfidence(mediaPipeDetections, videoRef.current, canvasRef.current, previousFrameRef);
              setAnalysisMode("mediapipe-face");
              handleAnalysisResult(metrics);
              return;
            }
          } catch (mediaPipeErr) {
            console.warn("MediaPipe detector error:", mediaPipeErr);
          }
        }

        if (faceapi) {
          try {
            const detections = await faceapi
              .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
              .withFaceExpressions()
              .withFaceLandmarks();

            if (detections.length > 0) {
              const detection = choosePrimaryDetection(detections, videoRef.current) || detections[0];
              const metrics = calculateConfidence(detection.expressions, detection, detections.length, videoRef.current, canvasRef.current, previousFrameRef);
              setAnalysisMode("face");
              handleAnalysisResult(metrics);
              return;
            }

            const looseDetections = await faceapi.detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.12 })
            );

            if (looseDetections.length > 0) {
              const metrics = calculateDetectedFaceConfidence(looseDetections, videoRef.current, canvasRef.current, previousFrameRef);
              setAnalysisMode("face-loose");
              handleAnalysisResult(metrics);
              return;
            }

            const ssdDetections = await faceapi.detectAllFaces(
              videoRef.current,
              new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 })
            );

            if (ssdDetections.length > 0) {
              const metrics = calculateDetectedFaceConfidence(ssdDetections, videoRef.current, canvasRef.current, previousFrameRef);
              setAnalysisMode("face-ssd");
              handleAnalysisResult(metrics);
              return;
            }
          } catch (faceApiErr) {
            console.warn("face-api.js error:", faceApiErr);
          }
        }

        // ── Path 3: Pixel-level skin-tone fallback ───────────────────────────
        const localFace = calculateLocalFacePresence(videoRef.current, canvasRef.current, previousFrameRef);
        if (localFace.faceVisible) {
          setAnalysisMode("local-unverified");
          handleAnalysisResult(localFace);
          return;
        }

        // ── Path 4: All methods failed — face truly missing ──────────────────
        const missingFace = createMissingFaceAnalysis();
        setAnalysisMode("face-missing");
        handleAnalysisResult(missingFace);

      } catch (error) {
        console.error("Detection error:", error);
        handleAnalysisResult(createMissingFaceAnalysis("Face verification failed", "verification failed"));
      }
    };

    detectionIntervalRef.current = setInterval(runDetection, 200);
    return () => clearInterval(detectionIntervalRef.current);
  }, [isActive, detectionActive, handleAnalysisResult]);

  const statusColor =
    faceOut ? "#ff4444" :
      integrityStatus === "red" ? "#ff4444" :
        integrityStatus === "yellow" ? "#ffc107" : "#00ff88";

  const statusLabel =
    faceOut ? "FACE OUT — PAUSED" :
      integrityStatus === "red" ? "RED: CHECK CAMERA" :
        integrityStatus === "yellow" ? "YELLOW: ADJUST" : "GREEN: LIVE";

  return (
    <div
      style={{
        display: isActive ? "block" : "none",
        position: "absolute",
        left: "24px",
        top: "132px",
        width: "220px",
        zIndex: 24,
        pointerEvents: "none",
      }}
    >
      {/* Camera box */}
      <div style={{
        width: "220px",
        height: "165px",
        borderRadius: "16px",
        overflow: "hidden",
        border: `2px solid ${statusColor}`,
        background: "rgba(0,0,0,0.72)",
        boxShadow: faceOut
          ? "0 0 0 5px rgba(255,68,68,0.2), 0 18px 50px rgba(0,0,0,0.32)"
          : integrityStatus === "red"
            ? "0 0 0 5px rgba(255,68,68,0.14), 0 18px 50px rgba(0,0,0,0.32)"
            : "0 18px 50px rgba(0,0,0,0.32)",
        position: "relative",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      }}>
        <video
          ref={videoRef}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
          autoPlay playsInline muted
        />

        {/* Face guide oval */}
        <div style={{
          position: "absolute",
          inset: "18px 22px 34px",
          border: `1px dashed ${faceOut ? "rgba(255,68,68,0.7)" : "rgba(0,212,255,0.55)"}`,
          borderRadius: "50%",
          transition: "border-color 0.3s ease",
        }} />

        {/* Face-out overlay */}
        <FaceOutOverlay show={faceOut} />

        {/* Status bar */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "8px 10px",
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
          color: statusColor,
          fontFamily: "'Courier New', monospace",
          fontSize: "9px",
          letterSpacing: "1.5px",
          fontWeight: 700,
          transition: "color 0.3s ease",
        }}>
          {isLoading ? "◉ CAMERA ON" : statusLabel}
        </div>

        <canvas ref={canvasRef} style={{ display: "none", width: "320px", height: "240px" }} />
      </div>

      {/* Live Report Panel */}
      <LiveDebateReport data={liveReport} faceOut={faceOut} />
    </div>
  );
}

// ─── ANALYSIS MATH ────────────────────────────────────────────────────────────

function getDetectionBox(detection) {
  return detection?.detection?.box || detection?.box || getNativeBox(detection) || getMediaPipeBox(detection);
}

function choosePrimaryDetection(detections, video) {
  const list = Array.from(detections || []).filter(Boolean);
  if (!list.length) return null;
  const videoWidth = video?.videoWidth || 320;
  const videoHeight = video?.videoHeight || 240;
  return list
    .map(detection => {
      const box = getDetectionBox(detection);
      if (!box) return { detection, score: 0 };
      const centerX = (box.x + box.width / 2) / videoWidth;
      const centerY = (box.y + box.height / 2) / videoHeight;
      const area = (box.width * box.height) / (videoWidth * videoHeight);
      const centerPenalty = Math.abs(centerX - 0.5) + Math.abs(centerY - 0.45);
      return { detection, score: area * 8 - centerPenalty };
    })
    .sort((a, b) => b.score - a.score)[0].detection;
}

function getFaceFit(detection, faceCount, video) {
  const box = getDetectionBox(detection);
  const videoWidth = video?.videoWidth || 320;
  const videoHeight = video?.videoHeight || 240;
  if (!box || !videoWidth || !videoHeight) {
    return {
      faceVisible: true, faceCount, cameraFit: "face visible",
      facePosition: "detected", integrityStatus: "green", integrityIssue: "",
    };
  }
  const centerX = (box.x + box.width / 2) / videoWidth;
  const centerY = (box.y + box.height / 2) / videoHeight;
  const area = (box.width * box.height) / (videoWidth * videoHeight);
  const centered = centerX > 0.32 && centerX < 0.68 && centerY > 0.22 && centerY < 0.72;
  if (area < 0.08) return { faceVisible: true, faceCount, cameraFit: "move closer", facePosition: centered ? "centered but far" : "off center", integrityStatus: "yellow", integrityIssue: "Face too far from camera" };
  if (area > 0.58) return { faceVisible: true, faceCount, cameraFit: "move back", facePosition: centered ? "too close" : "off center", integrityStatus: "yellow", integrityIssue: "Face too close to camera" };
  if (!centered) return { faceVisible: true, faceCount, cameraFit: "center your face", facePosition: "off center", integrityStatus: "yellow", integrityIssue: "Face is off center" };
  return {
    faceVisible: true,
    faceCount,
    cameraFit: "camera fit",
    facePosition: faceCount > 1 ? "centered; background faces ignored" : "centered",
    integrityStatus: "green",
    integrityIssue: "",
  };
}

function getFitScore(faceFit) {
  if (faceFit.integrityStatus === "red") return 2;
  if (faceFit.cameraFit === "camera fit") return 9;
  if (faceFit.cameraFit === "face visible") return 7.5;
  return 5.5;
}

function calculateLiveMotion(video, canvas, previousFrameRef) {
  if (!video || !canvas || video.readyState < 2) return { movementScore: 5, stabilityScore: 5, motionLevel: 0 };
  const width = 80, height = 60;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { movementScore: 5, stabilityScore: 5, motionLevel: 0 };
  ctx.drawImage(video, 0, 0, width, height);
  const frame = ctx.getImageData(0, 0, width, height).data;
  const previous = previousFrameRef.current;
  previousFrameRef.current = new Uint8ClampedArray(frame);
  if (!previous) return { movementScore: 7, stabilityScore: 7, motionLevel: 0 };
  let diff = 0;
  for (let i = 0; i < frame.length; i += 16) diff += Math.abs(frame[i] - previous[i]);
  const motionLevel = diff / (frame.length / 16);
  const stabilityScore = Math.max(1, Math.min(10, 10 - motionLevel / 4));
  return {
    movementScore: Math.round(stabilityScore * 10) / 10,
    stabilityScore: Math.round(stabilityScore * 10) / 10,
    motionLevel: Math.round(motionLevel * 10) / 10,
  };
}

function getNativeBox(detection) {
  const box = detection?.boundingBox;
  if (!box) return null;
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function calculateNativeFaceConfidence(detections, video, canvas, previousFrameRef) {
  const primaryDetection = choosePrimaryDetection(detections, video) || detections[0];
  const detection = { box: getNativeBox(primaryDetection) };
  const faceFit = getFaceFit(detection, detections.length, video);
  const verified = faceFit.integrityStatus !== "red";
  const motion = calculateLiveMotion(video, canvas, previousFrameRef);
  const confidenceScore = verified
    ? Math.round(((getFitScore(faceFit) * 0.7) + (motion.stabilityScore * 0.3)) * 10) / 10
    : 2;
  return {
    confidenceScore,
    primaryEmotion: "not measured", primaryEmotionValue: 0,
    secondaryEmotion: "not measured", secondaryEmotionValue: 0,
    expressionMeasured: false, expressionLevel: null,
    nervousnessScore: verified ? 3 : 8,
    hesitation: "not measured",
    engagement: verified ? "moderate" : "low",
    eyeContact: verified ? "visible" : "missing",
    facialStability: verified ? "visible" : "not visible",
    headMovement: "not measured",
    speakingPosture: verified ? "visible" : "not visible",
    movementScore: verified ? motion.movementScore : 0,
    motionLevel: motion.motionLevel,
    analysisSource: "live face detection",
    scoreBasis: "live face fit + movement stability",
    ...faceFit,
  };
}

// ── FIX 2: Broader skin detection that works across skin tones & lighting ─────
function getMediaPipeBox(detection) {
  const box = detection?.boundingBox;
  if (!box) return null;
  return {
    x: box.originX ?? ((box.xCenter || 0) - (box.width || 0) / 2),
    y: box.originY ?? ((box.yCenter || 0) - (box.height || 0) / 2),
    width: box.width || 0,
    height: box.height || 0,
  };
}

function calculateMediaPipeFaceConfidence(detections, video, canvas, previousFrameRef) {
  const primaryDetection = choosePrimaryDetection(detections, video) || detections[0];
  const detection = { box: getMediaPipeBox(primaryDetection) };
  const faceFit = getFaceFit(detection, detections.length, video);
  const verified = faceFit.integrityStatus !== "red";
  const motion = calculateLiveMotion(video, canvas, previousFrameRef);
  const confidenceScore = verified
    ? Math.round(((getFitScore(faceFit) * 0.8) + (motion.stabilityScore * 0.2)) * 10) / 10
    : 2;

  return {
    confidenceScore,
    primaryEmotion: "not measured", primaryEmotionValue: 0,
    secondaryEmotion: "not measured", secondaryEmotionValue: 0,
    expressionMeasured: false, expressionLevel: null,
    nervousnessScore: verified ? 3 : 8,
    hesitation: "not measured",
    engagement: verified ? "moderate" : "low",
    eyeContact: verified ? "visible" : "missing",
    facialStability: verified ? "visible" : "not visible",
    headMovement: "not measured",
    speakingPosture: verified ? "visible" : "not visible",
    movementScore: verified ? motion.movementScore : 0,
    motionLevel: motion.motionLevel,
    analysisSource: "mediapipe face detection",
    scoreBasis: "MediaPipe face detector + movement stability",
    ...faceFit,
  };
}

function calculateDetectedFaceConfidence(detections, video, canvas, previousFrameRef) {
  const detection = choosePrimaryDetection(detections, video) || detections[0];
  const faceFit = getFaceFit(detection, detections.length, video);
  const verified = faceFit.integrityStatus !== "red";
  const motion = calculateLiveMotion(video, canvas, previousFrameRef);
  const confidenceScore = verified
    ? Math.round(((getFitScore(faceFit) * 0.75) + (motion.stabilityScore * 0.25)) * 10) / 10
    : 2;

  return {
    confidenceScore,
    primaryEmotion: "not measured", primaryEmotionValue: 0,
    secondaryEmotion: "not measured", secondaryEmotionValue: 0,
    expressionMeasured: false, expressionLevel: null,
    nervousnessScore: verified ? 3.5 : 8,
    hesitation: "not measured",
    engagement: verified ? "moderate" : "low",
    eyeContact: verified ? "visible" : "missing",
    facialStability: verified ? "visible" : "not visible",
    headMovement: "not measured",
    speakingPosture: verified ? "visible" : "not visible",
    movementScore: verified ? motion.movementScore : 0,
    motionLevel: motion.motionLevel,
    analysisSource: "live face detection",
    scoreBasis: "low-threshold face detection + movement stability",
    ...faceFit,
  };
}

function calculateLocalFacePresence(video, canvas, previousFrameRef) {
  if (!video || !canvas || video.readyState < 2) {
    return createMissingFaceAnalysis("Camera not ready", "checking");
  }

  const width = 96, height = 72;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return createMissingFaceAnalysis("Camera scan failed", "checking");

  ctx.drawImage(video, 0, 0, width, height);
  const frame = ctx.getImageData(0, 0, width, height).data;

  // Focus on center region where a face would naturally be
  const center = {
    x1: Math.floor(width * 0.10),
    x2: Math.floor(width * 0.90),
    y1: Math.floor(height * 0.05),
    y2: Math.floor(height * 0.88),
  };

  let skinPixels = 0, brightPixels = 0, total = 0;
  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let y = center.y1; y < center.y2; y++) {
    for (let x = center.x1; x < center.x2; x++) {
      const i = (y * width + x) * 4;
      const r = frame[i], g = frame[i + 1], b = frame[i + 2];
      total++;
      const brightness = (r + g + b) / 3;
      if (brightness > 25) brightPixels++;
      if (isSkinLike(r, g, b)) {
        skinPixels++;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }

  const skinRatio = skinPixels / total;
  const brightRatio = brightPixels / total;
  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  const blobCenterX = boxWidth > 0 ? (minX + boxWidth / 2) / width : 0;
  const blobCenterY = boxHeight > 0 ? (minY + boxHeight / 2) / height : 0;
  const blobAspect = boxHeight > 0 ? boxWidth / boxHeight : 0;
  const blobArea = (boxWidth * boxHeight) / (width * height);

  // Face-shaped blob check: skin region must have some spatial extent
  const hasFaceShape =
    boxWidth > width * 0.08 &&
    boxHeight > height * 0.10 &&
    blobAspect > 0.45 &&
    blobAspect < 1.9 &&
    blobCenterX > 0.14 &&
    blobCenterX < 0.86 &&
    blobCenterY > 0.08 &&
    blobCenterY < 0.82 &&
    blobArea > 0.012 &&
    blobArea < 0.82;

  console.log("FALLBACK DETECT:", {
    skinRatio: (skinRatio * 100).toFixed(1) + "%",
    brightRatio: (brightRatio * 100).toFixed(1) + "%",
    boxW: boxWidth,
    boxH: boxHeight,
    centerX: blobCenterX.toFixed(2),
    centerY: blobCenterY.toFixed(2),
    aspect: blobAspect.toFixed(2),
    blobArea: (blobArea * 100).toFixed(1) + "%",
    hasFaceShape,
  });

  // ── FIX: Lowered thresholds + face-shape check ───────────────────────────
  // skinRatio > 0.008  → any reasonable skin presence
  // brightRatio > 0.02 → camera isn't just a black screen
  // hasFaceShape       → skin pixels form a region, not random noise
  if (skinRatio > 0.006 && skinRatio < 0.96 && brightRatio > 0.02 && hasFaceShape) {
    const motion = calculateLiveMotion(video, canvas, previousFrameRef);
    const fitScore = Math.min(10, Math.max(5, 5 + skinRatio * 50 + brightRatio * 8));
    const confidenceScore = Math.round(((fitScore * 0.65) + (motion.stabilityScore * 0.35)) * 10) / 10;
    return {
      confidenceScore,
      primaryEmotion: "not measured", primaryEmotionValue: 0,
      secondaryEmotion: "not measured", secondaryEmotionValue: 0,
      expressionMeasured: false, expressionLevel: null,
      nervousnessScore: 3.5, hesitation: "not measured",
      engagement: "moderate",
      eyeContact: "visible",
      facialStability: "visible",
      headMovement: "not measured",
      speakingPosture: "visible",
      movementScore: motion.movementScore,
      motionLevel: motion.motionLevel,
      analysisSource: "live camera scan",
      scoreBasis: "live face visibility + movement stability",
      faceVisible: true, faceCount: 1,
      cameraFit: "face visible",
      facePosition: "centered",
      integrityStatus: "green",
      integrityIssue: "",
    };
  }

  return createMissingFaceAnalysis("Face not visible", "face missing");
}

function calculateConfidence(expressions, detection, faceCount, video, canvas, previousFrameRef) {
  const sortedExpressions = Object.entries(expressions).sort(([, a], [, b]) => b - a);
  const primaryEmotion = sortedExpressions[0];
  const secondaryEmotion = sortedExpressions[1];
  const expressionLevel = Math.round((primaryEmotion?.[1] || 0) * 100);
  const expressionValues = Object.values(expressions);
  const expressionVariance = expressionValues.reduce((a, b) => a + b, 0) / expressionValues.length;
  const nervousnessScore = (expressions.fearful || 0) * 10 + (expressions.sad || 0) * 5;
  const hesitationLevel = expressionVariance > 0.4 ? "low" : "medium";
  const eyeContact = (expressions.neutral || 0) + (expressions.happy || 0) + (expressions.surprised || 0) > 0.55 ? "steady" : "avoiding";
  const facialStability = expressionVariance < 0.35 ? "calm" : expressionVariance > 0.55 ? "nervous" : "balanced";
  const headMovement = expressionVariance > 0.5 ? "excessive" : "controlled";
  const faceFit = getFaceFit(detection, faceCount, video);
  const motion = calculateLiveMotion(video, canvas, previousFrameRef);
  const expressionConfidenceScore = Math.max(4, Math.min(10, expressionLevel / 10));
  const confidenceScore = Math.round(
    ((getFitScore(faceFit) * 0.45) + (motion.stabilityScore * 0.35) + (expressionConfidenceScore * 0.2)) * 10
  ) / 10;
  const speakingPosture = confidenceScore >= 7 && nervousnessScore < 4 ? "upright" : "tense";
  return {
    confidenceScore: Math.round(confidenceScore * 10) / 10,
    primaryEmotion: primaryEmotion[0], primaryEmotionValue: expressionLevel,
    secondaryEmotion: secondaryEmotion[0], secondaryEmotionValue: Math.round(secondaryEmotion[1] * 100),
    expressionMeasured: true, expressionLevel,
    nervousnessScore: Math.round(nervousnessScore * 100) / 100,
    hesitation: hesitationLevel,
    engagement: expressionVariance > 0.3 ? "high" : "moderate",
    eyeContact, facialStability, headMovement, speakingPosture,
    movementScore: motion.movementScore,
    motionLevel: motion.motionLevel,
    analysisSource: "live face expression",
    scoreBasis: "live face fit + movement stability + expression strength",
    ...faceFit,
  };
}

function createMissingFaceAnalysis(issue = "Face not visible", cameraFit = "face missing") {
  return {
    confidenceScore: 0,
    primaryEmotion: "not measured", primaryEmotionValue: 0,
    secondaryEmotion: "not measured", secondaryEmotionValue: 0,
    nervousnessScore: 10, hesitation: "high", engagement: "low",
    eyeContact: "missing", facialStability: "not visible",
    headMovement: "not visible", speakingPosture: "not visible",
    movementScore: 0, analysisSource: "face visibility",
    faceVisible: false, faceCount: 0,
    cameraFit, facePosition: "not in frame",
    integrityStatus: "red", integrityIssue: issue,
  };
}
