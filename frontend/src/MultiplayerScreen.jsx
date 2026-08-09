import React, { useState } from "react";

const API = "http://localhost:8000";

export default function MultiplayerScreen({
  selectedTopic,
  onBack,
  onRoomCreated,
  onRoomJoined,
}) {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);

  async function createRoom() {
    if (!playerName.trim()) {
      alert("Enter your name");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API}/multiplayer/create-room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            player_name: playerName,
            topic: selectedTopic.title,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        onRoomCreated(
          data.room_id,
          playerName
        );
      } else {
        alert(
          data.detail ||
            "Unable to create room"
        );
      }
    } catch (err) {
      alert("Backend not running");
    }

    setLoading(false);
  }

  async function joinRoom() {
    if (!playerName.trim()) {
      alert("Enter your name");
      return;
    }

    if (!roomId.trim()) {
      alert("Enter Room ID");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API}/multiplayer/join-room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_id: roomId,
            player_name: playerName,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        onRoomJoined(
          roomId,
          playerName
        );
      } else {
        alert(
          data.detail ||
            "Unable to join"
        );
      }
    } catch (err) {
      alert("Backend not running");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at 50% 0%, #172447 0%, #080d1d 38%, #02040b 78%)",
        color: "#eef4ff",
        fontFamily:
          "'Courier New', monospace",
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
            "rgba(0,212,255,0.07)",
          filter: "blur(110px)",
          top: "-250px",
          left: "50%",
          transform:
            "translateX(-50%)",
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
          filter: "blur(100px)",
          bottom: "-180px",
          right: "-100px",
        }}
      />

      {/* MAIN */}

      <div
        style={{
          width: "min(850px, 92%)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* BRAND */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
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
                  "0 0 25px rgba(0,212,255,0.2)",
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
        </div>

        {/* HEADING */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#617394",
              letterSpacing: "4px",
              marginBottom: "10px",
            }}
          >
            MULTIPLAYER ARENA
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              letterSpacing: "1px",
            }}
          >
            Enter the{" "}
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
              Debate
            </span>
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#7485a5",
              fontSize: "12px",
            }}
          >
            Create a room or join an existing
            debate.
          </p>
        </div>

        {/* TOPIC */}

        <div
          style={{
            maxWidth: "650px",
            margin: "0 auto 24px",
            padding: "14px 18px",
            borderRadius: "12px",
            background:
              "rgba(0,212,255,0.05)",
            border:
              "1px solid rgba(0,212,255,0.16)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background:
                "rgba(0,212,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            💬
          </div>

          <div>
            <div
              style={{
                color: "#60718f",
                fontSize: "8px",
                letterSpacing: "2px",
                marginBottom: "4px",
              }}
            >
              DEBATE TOPIC
            </div>

            <div
              style={{
                color: "#dce7f9",
                fontSize: "13px",
              }}
            >
              {selectedTopic?.title ||
                "Selected debate topic"}
            </div>
          </div>
        </div>

        {/* MAIN CARD */}

        <div
          style={{
            background:
              "rgba(8,14,29,0.88)",
            border:
              "1px solid rgba(100,140,210,0.16)",
            borderRadius: "22px",
            padding: "30px",
            boxShadow:
              "0 25px 70px rgba(0,0,0,0.35)",
            backdropFilter: "blur(15px)",
          }}
        >
          {/* NAME */}

          <div
            style={{
              marginBottom: "26px",
            }}
          >
            <label
              style={{
                display: "block",
                color: "#7183a2",
                fontSize: "9px",
                letterSpacing: "2px",
                marginBottom: "9px",
              }}
            >
              YOUR NAME
            </label>

            <input
              placeholder="Enter your name..."
              value={playerName}
              onChange={(e) =>
                setPlayerName(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "15px 16px",
                borderRadius: "10px",
                border:
                  "1px solid rgba(100,140,210,0.2)",
                outline: "none",
                background:
                  "rgba(2,7,18,0.8)",
                color: "#edf4ff",
                fontFamily:
                  "'Courier New', monospace",
                fontSize: "13px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.border =
                  "1px solid rgba(0,212,255,0.65)";
                e.currentTarget.style.boxShadow =
                  "0 0 18px rgba(0,212,255,0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border =
                  "1px solid rgba(100,140,210,0.2)";
                e.currentTarget.style.boxShadow =
                  "none";
              }}
            />
          </div>

          {/* CREATE / JOIN */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1px 1fr",
              gap: "25px",
              alignItems: "stretch",
            }}
          >
            {/* CREATE */}

            <div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#00d4ff",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                }}
              >
                NEW ARENA
              </div>

              <h2
                style={{
                  margin:
                    "0 0 8px",
                  fontSize: "19px",
                }}
              >
                Create a Room
              </h2>

              <p
                style={{
                  margin:
                    "0 0 20px",
                  color: "#657594",
                  fontSize: "11px",
                  lineHeight: "1.6",
                }}
              >
                Start a new debate and
                invite another player
                using your room code.
              </p>

              <button
                onClick={createRoom}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(0,212,255,0.35)",
                  background:
                    "linear-gradient(135deg,rgba(0,212,255,0.18),rgba(0,150,255,0.08))",
                  color: "#00d4ff",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  fontFamily:
                    "'Courier New', monospace",
                  fontWeight: "bold",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  opacity: loading
                    ? 0.5
                    : 1,
                }}
              >
                {loading
                  ? "CREATING..."
                  : "CREATE ROOM  →"}
              </button>
            </div>

            {/* DIVIDER */}

            <div
              style={{
                background:
                  "rgba(100,140,210,0.12)",
              }}
            />

            {/* JOIN */}

            <div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#a16cff",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                }}
              >
                JOIN ARENA
              </div>

              <h2
                style={{
                  margin:
                    "0 0 8px",
                  fontSize: "19px",
                }}
              >
                Join a Room
              </h2>

              <p
                style={{
                  margin:
                    "0 0 20px",
                  color: "#657594",
                  fontSize: "11px",
                  lineHeight: "1.6",
                }}
              >
                Have a room code?
                Enter it below to join
                your opponent.
              </p>

              <input
                placeholder="ROOM CODE"
                value={roomId}
                onChange={(e) =>
                  setRoomId(
                    e.target.value.toUpperCase()
                  )
                }
                maxLength={6}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  borderRadius: "9px",
                  border:
                    "1px solid rgba(123,47,255,0.25)",
                  outline: "none",
                  background:
                    "rgba(2,7,18,0.8)",
                  color: "#edf4ff",
                  fontFamily:
                    "'Courier New', monospace",
                  fontSize: "13px",
                  letterSpacing: "3px",
                  textAlign: "center",
                  marginBottom: "10px",
                }}
              />

              <button
                onClick={joinRoom}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(123,47,255,0.4)",
                  background:
                    "linear-gradient(135deg,rgba(123,47,255,0.2),rgba(123,47,255,0.08))",
                  color: "#a979ff",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  fontFamily:
                    "'Courier New', monospace",
                  fontWeight: "bold",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  opacity: loading
                    ? 0.5
                    : 1,
                }}
              >
                {loading
                  ? "JOINING..."
                  : "JOIN ROOM  →"}
              </button>
            </div>
          </div>
        </div>

        {/* BACK */}

        <div
          style={{
            textAlign: "center",
            marginTop: "25px",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: "none",
              color: "#62728f",
              cursor: "pointer",
              fontFamily:
                "'Courier New', monospace",
              fontSize: "10px",
              letterSpacing: "1px",
            }}
          >
            ← BACK TO MODE SELECTION
          </button>
        </div>
      </div>
    </div>
  );
}