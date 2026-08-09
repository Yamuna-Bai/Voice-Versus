import React, { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function WaitingRoom({
  roomId,
  playerName,
  onStart,
  onBack,
}) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  async function fetchRoom() {
    try {
      const res = await fetch(
        `${API}/multiplayer/room/${roomId}`
      );

      if (!res.ok) {
        console.error(
          "Failed to fetch room state"
        );
        return;
      }

      const data = await res.json();

      console.log(
        "🏠 WAITING ROOM STATE:",
        data
      );

      if (!data) {
  console.error(
    "❌ Room state is empty"
  );
  return;
}

      setRoom(data);
      setLoading(false);

      if (data.status === "started") {
  console.log(
    "🚀 Debate started — entering live screen"
  );

  onStart();
}
    } catch (err) {
      console.error(
        "Waiting room error:",
        err
      );
    }
  }

  async function startDebate() {
    if (starting) return;

    setStarting(true);

    try {
      const res = await fetch(
        `${API}/multiplayer/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_id: roomId,
          }),
        }
      );

      const data = await res.json();

      console.log(
        "🚀 START DEBATE RESPONSE:",
        data
      );

      if (data.success) {
        onStart();
      } else {
        alert(
          data.detail ||
            "Unable to start debate"
        );

        setStarting(false);
      }
    } catch (error) {
      console.error(
        "Start debate error:",
        error
      );

      alert(
        "Could not connect to backend"
      );

      setStarting(false);
    }
  }

  useEffect(() => {
    fetchRoom();

    const interval = setInterval(
      fetchRoom,
      2000
    );

    return () =>
      clearInterval(interval);
  }, []);

  if (loading || !room) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg,#020510,#071020,#020510)",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily:
            "'Courier New', monospace",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#00d9ff",
            letterSpacing: "3px",
          }}
        >
          LOADING MATCH...
        </div>
      </div>
    );
  }

  const players = room.players || [];

  const opponentJoined =
    players.length >= 2;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% -20%, #182044 0%, #070b18 40%, #02040b 100%)",
        color: "#eef4ff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily:
          "'Courier New', monospace",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "650px",
          maxWidth: "95vw",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              color: "#627291",
              fontSize: "9px",
              letterSpacing: "4px",
              marginBottom: "10px",
            }}
          >
            MATCH LOBBY
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "38px",
              letterSpacing: "2px",
            }}
          >
            Waiting for your{" "}
            <span
              style={{
                color: "#00d9ff",
              }}
            >
              Opponent
            </span>
          </h1>
        </div>

        {/* ROOM CARD */}

        <div
          style={{
            padding: "20px 25px",
            borderRadius: "14px",
            background:
              "rgba(10,20,38,0.8)",
            border:
              "1px solid rgba(0,217,255,0.2)",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              color: "#637394",
              fontSize: "8px",
              letterSpacing: "3px",
              marginBottom: "8px",
            }}
          >
            ROOM CODE
          </div>

          <div
            style={{
              color: "#00d9ff",
              fontSize: "28px",
              fontWeight: "bold",
              letterSpacing: "6px",
            }}
          >
            {roomId}
          </div>
        </div>

        {/* PLAYERS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 60px 1fr",
            gap: "15px",
            alignItems: "center",
          }}
        >
          {/* YOU */}

          <div
            style={{
              minHeight: "190px",
              borderRadius: "18px",
              background:
                "linear-gradient(145deg,rgba(5,35,55,0.95),rgba(4,15,29,0.95))",
              border:
                "1px solid rgba(0,217,255,0.25)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                color: "#00d9ff",
                fontSize: "8px",
                letterSpacing: "3px",
                marginBottom: "15px",
              }}
            >
              YOU
            </div>

            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background:
                  "rgba(0,217,255,0.08)",
                border:
                  "1px solid rgba(0,217,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
              }}
            >
              👤
            </div>

            <div
              style={{
                marginTop: "15px",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              {playerName}
            </div>
          </div>

          {/* VS */}

          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              border:
                "1px solid rgba(120,80,255,0.4)",
              background:
                "rgba(80,50,160,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#876cff",
              fontWeight: "bold",
              fontSize: "11px",
            }}
          >
            VS
          </div>

          {/* OPPONENT */}

          <div
            style={{
              minHeight: "190px",
              borderRadius: "18px",
              background:
                "linear-gradient(145deg,rgba(25,12,55,0.95),rgba(10,7,25,0.95))",
              border: opponentJoined
                ? "1px solid rgba(0,255,170,0.3)"
                : "1px solid rgba(120,80,255,0.2)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                color: "#876cff",
                fontSize: "8px",
                letterSpacing: "3px",
                marginBottom: "15px",
              }}
            >
              OPPONENT
            </div>

            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background:
                  "rgba(120,80,255,0.08)",
                border:
                  "1px solid rgba(120,80,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
              }}
            >
              {opponentJoined
                ? "👤"
                : "⌛"}
            </div>

            {opponentJoined ? (
              <>
                <div
                  style={{
                    marginTop: "15px",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  {players[1]?.name ||
                    "Opponent"}
                </div>

                <div
                  style={{
                    marginTop: "6px",
                    color: "#00ffaa",
                    fontSize: "8px",
                    letterSpacing: "2px",
                  }}
                >
                  ● CONNECTED
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    marginTop: "15px",
                    color: "#73809c",
                    fontSize: "14px",
                  }}
                >
                  Waiting...
                </div>

                <div
                  style={{
                    marginTop: "6px",
                    color: "#596681",
                    fontSize: "8px",
                    letterSpacing: "2px",
                  }}
                >
                  SEARCHING
                </div>
              </>
            )}
          </div>
        </div>

        {/* ACTION AREA */}

        <div
          style={{
            marginTop: "25px",
            textAlign: "center",
          }}
        >
          {opponentJoined ? (
            <div
              style={{
                padding: "20px",
                borderRadius: "14px",
                background:
                  "rgba(0,255,170,0.05)",
                border:
                  "1px solid rgba(0,255,170,0.2)",
              }}
            >
              <div
                style={{
                  color: "#00ffaa",
                  fontSize: "10px",
                  letterSpacing: "2px",
                  marginBottom: "15px",
                }}
              >
                ✓ OPPONENT CONNECTED
              </div>

              <button
                onClick={startDebate}
                disabled={starting}
                style={{
                  width: "100%",
                  maxWidth: "360px",
                  padding: "15px",
                  border: "none",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(135deg,#00d9ff,#715cff)",
                  color: "white",
                  cursor: starting
                    ? "not-allowed"
                    : "pointer",
                  fontFamily:
                    "'Courier New', monospace",
                  fontWeight: "bold",
                  fontSize: "12px",
                  letterSpacing: "2px",
                  opacity: starting
                    ? 0.7
                    : 1,
                  boxShadow:
                    "0 0 25px rgba(0,217,255,0.2)",
                }}
              >
                {starting
                  ? "STARTING..."
                  : "▶ START DEBATE"}
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                background:
                  "rgba(255,180,0,0.05)",
                border:
                  "1px solid rgba(255,180,0,0.15)",
                color: "#dcae45",
                fontSize: "9px",
                letterSpacing: "2px",
              }}
            >
              ● WAITING FOR OPPONENT...
            </div>
          )}

          {/* BACK */}

          <button
            onClick={onBack}
            style={{
              marginTop: "18px",
              background: "transparent",
              border: "none",
              color: "#62708c",
              cursor: "pointer",
              fontFamily:
                "'Courier New', monospace",
              fontSize: "9px",
              letterSpacing: "1px",
            }}
          >
            ← LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}