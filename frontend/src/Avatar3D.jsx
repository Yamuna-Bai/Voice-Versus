import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function Avatar3D({ isActive, isSpeaking, isThinking, mousePos }) {
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // 3D perspective calculations
  const rotX = (-mousePos.y * 12).toFixed(2);
  const rotY = (mousePos.x * 15).toFixed(2);
  const tX = (mousePos.x * 20).toFixed(2);
  const tY = (mousePos.y * 15).toFixed(2);
  const scaleZ = 1 + mousePos.y * 0.08;

  // Determine state color
  let stateColor = "#00d4ff";
  let glowColor = "rgba(0, 212, 255, 0.6)";
  
  if (isSpeaking) {
    stateColor = "#ff6b35";
    glowColor = "rgba(255, 107, 53, 0.6)";
  } else if (isThinking) {
    stateColor = "#ffc107";
    glowColor = "rgba(255, 193, 7, 0.6)";
  }

  // Floating/breathing animation
  const floatingVariants = {
    initial: { y: 0 },
    animate: {
      y: isSpeaking ? [0, -8, 0] : isThinking ? [0, -6, 0] : [0, -12, 0],
      transition: {
        duration: isSpeaking ? 0.8 : isThinking ? 1.2 : 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Scale-up animation on load
  const scaleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.34, 1.56, 0.64, 1],
      },
    },
  };

  // Pulse animation for active state
  const pulseVariants = {
    animate: {
      boxShadow: [
        `0 0 20px ${glowColor}, 0 0 60px ${glowColor}20, inset 0 0 60px ${glowColor}10`,
        `0 0 40px ${glowColor}, 0 0 100px ${glowColor}30, inset 0 0 80px ${glowColor}15`,
        `0 0 20px ${glowColor}, 0 0 60px ${glowColor}20, inset 0 0 60px ${glowColor}10`,
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
      },
    },
  };

  return (
    <motion.div
      ref={containerRef}
      className="avatar-3d-container"
      initial="hidden"
      animate="visible"
      variants={scaleVariants}
      style={{
        perspective: "1200px",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Ambient light reflection background */}
      <div
        className="avatar-ambient-glow"
        style={{
          position: "absolute",
          inset: "-20%",
          background: `radial-gradient(circle at 30% 30%, ${glowColor}15 0%, transparent 60%)`,
          pointerEvents: "none",
          filter: "blur(40px)",
          width: "100%",
          height: "100%",
        }}
      />

      {/* Main robot card with 3D effect */}
      <motion.div
        className="avatar-card"
        animate={isActive ? "animate" : "initial"}
        variants={floatingVariants}
        style={{
          transformStyle: "preserve-3d",
          transform: `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(${(scaleZ - 1) * 100}px)`,
          transition: "transform 0.05s linear",
          width: "280px",
          height: "280px",
        }}
      >
        <motion.div
          className="avatar-inner"
          animate={isActive ? "animate" : {}}
          variants={pulseVariants}
          style={{
            background: `linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(123, 47, 255, 0.06) 100%)`,
            border: `2px solid ${stateColor}`,
            borderRadius: "24px",
            padding: "40px 30px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(20px)",
            position: "relative",
            overflow: "hidden",
            width: "100%",
            height: "100%",
            boxShadow: `0 20px 80px rgba(0, 0, 0, 0.5), 0 0 60px ${glowColor}20`,
          }}
        >
          {/* Light reflection overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "50%",
              background: `linear-gradient(135deg, ${glowColor}15 0%, transparent 50%)`,
              pointerEvents: "none",
              borderRadius: "20px 20px 0 0",
            }}
          />

          {/* Robot Avatar - Animated Emoji & Status */}
          <motion.div
            animate={{
              scale: isSpeaking ? [1, 1.15, 1] : isThinking ? [1, 1.1, 1] : 1,
              opacity: 1,
            }}
            transition={{
              duration: isSpeaking ? 0.6 : isThinking ? 1 : 2,
              repeat: isSpeaking || isThinking ? Infinity : 0,
              ease: "easeInOut",
            }}
            style={{
              fontSize: "100px",
              marginBottom: "14px",
              position: "relative",
              zIndex: 2,
              filter: `drop-shadow(0 8px 24px ${glowColor}30)`,
            }}
          >
            🤖
          </motion.div>

          {/* Status Label */}
          <motion.div
            animate={{
              opacity: [1, 0.6, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "2px",
              color: stateColor,
              marginBottom: "10px",
              textTransform: "uppercase",
              position: "relative",
              zIndex: 2,
            }}
          >
            {isSpeaking ? "⚡ SPEAKING" : isThinking ? "⏳ THINKING" : "🎯 LISTENING"}
          </motion.div>

          {/* Animated status indicator dots */}
          <div
            style={{
              display: "flex",
              gap: "5px",
              marginBottom: "14px",
              position: "relative",
              zIndex: 2,
            }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: stateColor,
                  boxShadow: `0 0 8px ${stateColor}`,
                }}
              />
            ))}
          </div>

          {/* Subtle info text */}
          <motion.div
            style={{
              fontSize: "9px",
              color: "rgba(255, 255, 255, 0.4)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              position: "relative",
              zIndex: 2,
            }}
          >
            AI OPPONENT READY
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Glow rings behind card (3D effect) */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: "360px",
          height: "360px",
          border: `2px solid ${glowColor}`,
          borderRadius: "24px",
          pointerEvents: "none",
          opacity: 0.3,
        }}
      />

      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
        style={{
          position: "absolute",
          width: "480px",
          height: "480px",
          border: `1px solid ${glowColor}`,
          borderRadius: "24px",
          pointerEvents: "none",
          opacity: 0.2,
        }}
      />
    </motion.div>
  );
}
