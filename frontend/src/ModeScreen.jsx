import React from "react";

export default function ModeScreen({ onSelectMode, onBack }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at 50% 0%, #172447 0%, #080d1d 38%, #02040b 75%)",
        color: "#eef4ff",
        fontFamily: "'Courier New', monospace",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* BACKGROUND GLOW */}

      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "rgba(0,212,255,0.08)",
          filter: "blur(100px)",
          top: "-220px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background:
            "rgba(123,47,255,0.07)",
          filter: "blur(90px)",
          bottom: "-180px",
          right: "-100px",
        }}
      />

      {/* MAIN CONTENT */}

      <div
        style={{
          width: "min(900px, 90%)",
          position: "relative",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        {/* BRAND */}

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg,#00d4ff,#7b2fff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "21px",
              boxShadow:
                "0 0 25px rgba(0,212,255,0.22)",
            }}
          >
            🎙
          </div>

          <div
            style={{
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                letterSpacing: "4px",
              }}
            >
              VOICE
              <span
                style={{
                  color: "#00d4ff",
                }}
              >
                VERSUS
              </span>
            </div>

            <div
              style={{
                fontSize: "9px",
                color: "#647695",
                letterSpacing: "2px",
                marginTop: "3px",
              }}
            >
              AI DEBATE ARENA
            </div>
          </div>
        </div>

        {/* HEADING */}

        <h1
          style={{
            margin: "0",
            fontSize: "42px",
            letterSpacing: "2px",
            lineHeight: "1.2",
            fontWeight: "700",
          }}
        >
          Choose Your
          <br />
          <span
            style={{
              background:
                "linear-gradient(90deg,#00d4ff,#8b5cff)",
              WebkitBackgroundClip:
                "text",
              WebkitTextFillColor:
                "transparent",
            }}
          >
            Battle Mode
          </span>
        </h1>

        <p
          style={{
            marginTop: "15px",
            marginBottom: "45px",
            color: "#7485a5",
            fontSize: "13px",
            letterSpacing: "1px",
          }}
        >
          Think. Speak. Defend. Choose how you want to debate.
        </p>

        {/* MODE CARDS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "22px",
            maxWidth: "760px",
            margin: "0 auto",
          }}
        >
          {/* AI PRACTICE */}

          <button
            onClick={() =>
              onSelectMode("practice")
            }
            style={{
              position: "relative",
              textAlign: "left",
              padding: "30px",
              minHeight: "245px",
              borderRadius: "20px",
              cursor: "pointer",
              color: "white",
              background:
                "linear-gradient(145deg, rgba(10,28,48,0.95), rgba(5,13,27,0.95))",
              border:
                "1px solid rgba(0,212,255,0.25)",
              boxShadow:
                "0 15px 45px rgba(0,0,0,0.3)",
              fontFamily:
                "'Courier New', monospace",
              transition:
                "transform 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                "translateY(-6px)";
              e.currentTarget.style.border =
                "1px solid rgba(0,212,255,0.7)";
              e.currentTarget.style.boxShadow =
                "0 20px 55px rgba(0,212,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0)";
              e.currentTarget.style.border =
                "1px solid rgba(0,212,255,0.25)";
              e.currentTarget.style.boxShadow =
                "0 15px 45px rgba(0,0,0,0.3)";
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "rgba(0,212,255,0.1)",
                border:
                  "1px solid rgba(0,212,255,0.2)",
                fontSize: "25px",
                marginBottom: "24px",
              }}
            >
              🤖
            </div>

            <div
              style={{
                fontSize: "21px",
                fontWeight: "bold",
                marginBottom: "9px",
              }}
            >
              Practice with AI
            </div>

            <div
              style={{
                color: "#7588a8",
                fontSize: "12px",
                lineHeight: "1.7",
                maxWidth: "290px",
              }}
            >
              Challenge an AI opponent and
              improve your arguments, reasoning
              and speaking skills.
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "25px",
                right: "28px",
                color: "#00d4ff",
                fontSize: "18px",
              }}
            >
              →
            </div>

            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "22px",
                fontSize: "8px",
                color: "#00d4ff",
                letterSpacing: "2px",
              }}
            >
              SOLO
            </div>
          </button>

          {/* MULTIPLAYER */}

          <button
            onClick={() =>
              onSelectMode("multiplayer")
            }
            style={{
              position: "relative",
              textAlign: "left",
              padding: "30px",
              minHeight: "245px",
              borderRadius: "20px",
              cursor: "pointer",
              color: "white",
              background:
                "linear-gradient(145deg, rgba(24,15,48,0.95), rgba(7,8,25,0.95))",
              border:
                "1px solid rgba(123,47,255,0.3)",
              boxShadow:
                "0 15px 45px rgba(0,0,0,0.3)",
              fontFamily:
                "'Courier New', monospace",
              transition:
                "transform 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                "translateY(-6px)";
              e.currentTarget.style.border =
                "1px solid rgba(150,90,255,0.8)";
              e.currentTarget.style.boxShadow =
                "0 20px 55px rgba(123,47,255,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0)";
              e.currentTarget.style.border =
                "1px solid rgba(123,47,255,0.3)";
              e.currentTarget.style.boxShadow =
                "0 15px 45px rgba(0,0,0,0.3)";
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "rgba(123,47,255,0.12)",
                border:
                  "1px solid rgba(123,47,255,0.25)",
                fontSize: "25px",
                marginBottom: "24px",
              }}
            >
              👥
            </div>

            <div
              style={{
                fontSize: "21px",
                fontWeight: "bold",
                marginBottom: "9px",
              }}
            >
              Multiplayer
            </div>

            <div
              style={{
                color: "#8580a8",
                fontSize: "12px",
                lineHeight: "1.7",
                maxWidth: "290px",
              }}
            >
              Create or join a live debate room
              and compete face-to-face with
              another player.
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "25px",
                right: "28px",
                color: "#a16cff",
                fontSize: "18px",
              }}
            >
              →
            </div>

            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "22px",
                fontSize: "8px",
                color: "#a16cff",
                letterSpacing: "2px",
              }}
            >
              2 PLAYERS
            </div>
          </button>
        </div>

        {/* BACK */}

        <button
          onClick={onBack}
          style={{
            marginTop: "38px",
            background: "transparent",
            border: "none",
            color: "#62728f",
            cursor: "pointer",
            fontFamily:
              "'Courier New', monospace",
            fontSize: "11px",
            letterSpacing: "1px",
            transition:
              "color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color =
              "#00d4ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color =
              "#62728f";
          }}
        >
          ← BACK
        </button>

        {/* FOOTER */}

        <div
          style={{
            marginTop: "25px",
            color: "#303c54",
            fontSize: "8px",
            letterSpacing: "2px",
          }}
        >
          CHOOSE YOUR ARENA • OWN THE ARGUMENT
        </div>
      </div>
    </div>
  );
}