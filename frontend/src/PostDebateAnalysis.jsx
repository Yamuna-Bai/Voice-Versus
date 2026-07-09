import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function PostDebateAnalysis({ turns, analysisHistory, onClose }) {
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (!analysisHistory || analysisHistory.length === 0) return;

    const stats = calculateStatistics(analysisHistory);
    setStatistics(stats);
  }, [analysisHistory]);

  if (!statistics) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#4a6a8a" }}>
        Loading analysis...
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0, 212, 255, 0.2)",
        borderRadius: "20px",
        padding: "32px",
        maxWidth: "600px",
        color: "#e8f0ff",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* Header */}
      <motion.div variants={itemVariants} style={{ marginBottom: "28px", textAlign: "center" }}>
        <div style={{ fontSize: "13px", color: "#00d4ff", letterSpacing: "3px", marginBottom: "8px" }}>
          PERFORMANCE ANALYSIS
        </div>
        <h3
          style={{
            fontSize: "24px",
            fontWeight: "900",
            margin: "0 0 4px",
            background: "linear-gradient(90deg, #00d4ff, #7b2fff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Debate Confidence Report
        </h3>
      </motion.div>

      {/* Key Metrics Grid */}
      <motion.div
        variants={itemVariants}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Average Confidence */}
        <MetricCard
          label="Avg Confidence"
          value={statistics.avgConfidence.toFixed(1)}
          max="10"
          color={getScoreColor(statistics.avgConfidence)}
          emoji="🎯"
        />

        {/* Most Common Emotion */}
        <MetricCard
          label="Primary Emotion"
          value={statistics.dominantEmotion}
          emoji={getEmotionEmoji(statistics.dominantEmotion)}
        />

        {/* Nervousness Average */}
        <MetricCard
          label="Nervousness"
          value={statistics.avgNervousness.toFixed(1)}
          max="10"
          color={statistics.avgNervousness > 5 ? "#ff4444" : "#00ff88"}
          emoji={statistics.avgNervousness > 5 ? "😰" : "😌"}
        />

        {/* Overall Engagement */}
        <MetricCard
          label="Engagement Level"
          value={statistics.engagementScore.toFixed(1)}
          max="10"
          color={statistics.engagementScore > 7 ? "#00ff88" : "#ffc107"}
          emoji="⚡"
        />
      </motion.div>

      {/* Confidence Trend Chart */}
      <motion.div variants={itemVariants} style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: "#00d4ff", fontWeight: "700", marginBottom: "12px" }}>
          CONFIDENCE TREND ACROSS ROUNDS
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            height: "80px",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid rgba(0, 212, 255, 0.1)",
          }}
        >
          {analysisHistory.map((analysis, idx) => (
            <motion.div
              key={idx}
              initial={{ height: 0 }}
              animate={{ height: `${(analysis.confidenceScore / 10) * 100}%` }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              style={{
                flex: 1,
                background: getScoreColor(analysis.confidenceScore),
                borderRadius: "4px",
                position: "relative",
                minHeight: "4px",
                boxShadow: `0 0 8px ${getScoreColor(analysis.confidenceScore)}`,
              }}
              title={`Round ${idx + 1}: ${analysis.confidenceScore.toFixed(1)}`}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "8px",
            fontSize: "10px",
            color: "#4a6a8a",
          }}
        >
          {analysisHistory.map((_, idx) => (
            <span key={idx}>R{idx + 1}</span>
          ))}
        </div>
      </motion.div>

      {/* Performance Assessment */}
      <motion.div variants={itemVariants} style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: "#00d4ff", fontWeight: "700", marginBottom: "12px" }}>
          PERFORMANCE ASSESSMENT
        </div>
        <div
          style={{
            background: "rgba(123, 47, 255, 0.08)",
            border: "1px solid rgba(123, 47, 255, 0.15)",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "12px",
            color: "#8aa8c8",
            lineHeight: "1.6",
          }}
        >
          <p style={{ margin: "0 0 10px" }}>
            <strong style={{ color: "#7b2fff" }}>Strengths:</strong>
            <br />
            {generateStrengths(statistics).join(" • ")}
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "#ff9500" }}>Growth Areas:</strong>
            <br />
            {generateGrowthAreas(statistics).join(" • ")}
          </p>
        </div>
      </motion.div>

      {/* Actionable Tips */}
      <motion.div variants={itemVariants} style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: "#00d4ff", fontWeight: "700", marginBottom: "12px" }}>
          TIPS FOR NEXT DEBATE
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {generateTips(statistics).map((tip, idx) => (
            <li
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(0, 212, 255, 0.1)",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "11px",
                color: "#8aa8c8",
              }}
            >
              {tip}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Close Button */}
      <motion.button
        variants={itemVariants}
        onClick={onClose}
        style={{
          width: "100%",
          background: "linear-gradient(135deg, #00d4ff, #7b2fff)",
          border: "none",
          color: "white",
          padding: "12px 20px",
          borderRadius: "10px",
          fontFamily: "'Courier New', monospace",
          fontWeight: "700",
          cursor: "pointer",
          fontSize: "12px",
          letterSpacing: "2px",
          transition: "all 0.3s",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = "0 8px 24px rgba(0, 212, 255, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "none";
        }}
      >
        CLOSE REPORT
      </motion.button>
    </motion.div>
  );
}

// Metric Card Component
function MetricCard({ label, value, max, color, emoji }) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(0, 212, 255, 0.1)",
        borderRadius: "12px",
        padding: "14px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "24px", marginBottom: "6px" }}>{emoji}</div>
      <div style={{ fontSize: "10px", color: "#4a6a8a", marginBottom: "4px", letterSpacing: "1px" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: "900",
          color: color || "#00d4ff",
        }}
      >
        {value}
        {max && <span style={{ fontSize: "12px", color: "#4a6a8a" }}>/{max}</span>}
      </div>
    </div>
  );
}

// Calculate overall statistics
function calculateStatistics(analysisHistory) {
  const avgConfidence =
    analysisHistory.reduce((sum, a) => sum + a.confidenceScore, 0) / analysisHistory.length;

  const avgNervousness =
    analysisHistory.reduce((sum, a) => sum + a.nervousnessScore, 0) / analysisHistory.length;

  const emotions = analysisHistory.map((a) => a.primaryEmotion);
  const dominantEmotion = emotions.sort(
    (a, b) => emotions.filter((v) => v === a).length - emotions.filter((v) => v === b).length
  )[emotions.length - 1];

  const highEngagement = analysisHistory.filter((a) => a.engagement === "high").length;
  const engagementScore = (highEngagement / analysisHistory.length) * 10;

  return {
    avgConfidence,
    avgNervousness,
    dominantEmotion,
    engagementScore,
  };
}

function getScoreColor(score) {
  if (score >= 8) return "#00ff88";
  if (score >= 6) return "#00d4ff";
  if (score >= 4) return "#ffc107";
  return "#ff4444";
}

function getEmotionEmoji(emotion) {
  const emojis = {
    happy: "😊",
    neutral: "😐",
    surprised: "😲",
    sad: "😢",
    angry: "😠",
    fearful: "😨",
    disgusted: "🤢",
  };
  return emojis[emotion] || "😐";
}

function generateStrengths(statistics) {
  const strengths = [];
  
  if (statistics.avgConfidence >= 7) {
    strengths.push("Consistent confidence throughout debate");
  }
  if (statistics.avgNervousness < 3) {
    strengths.push("Remained calm under pressure");
  }
  if (statistics.engagementScore >= 7) {
    strengths.push("High facial engagement");
  }
  if (statistics.dominantEmotion === "happy") {
    strengths.push("Positive emotional presence");
  }

  return strengths.length > 0 ? strengths : ["Good participation overall"];
}

function generateGrowthAreas(statistics) {
  const areas = [];
  
  if (statistics.avgConfidence < 6) {
    areas.push("Increase eye contact");
  }
  if (statistics.avgNervousness > 5) {
    areas.push("Manage nervousness better");
  }
  if (statistics.engagementScore < 6) {
    areas.push("Use more varied expressions");
  }

  return areas.length > 0 ? areas : ["Continue building confidence"];
}

function generateTips(statistics) {
  const tips = [];
  
  tips.push("🎯 Practice maintaining consistent eye contact with the camera");
  tips.push("💪 Record practice sessions to track improvements in confidence");
  
  if (statistics.avgNervousness > 4) {
    tips.push("😌 Try breathing exercises before speaking");
  }
  
  tips.push("😊 Remember to smile naturally - it shows confidence");
  tips.push("🎤 Vary your facial expressions to show engagement");

  return tips;
}
