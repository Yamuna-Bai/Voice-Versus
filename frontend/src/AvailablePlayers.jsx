import React, { useEffect, useState } from "react";

const API = "";

export default function AvailablePlayers({
  playerName,
  onSelectOpponent,
  onBack,
}) {
  // Get user from localStorage as a backup
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("debateUser"));
    } catch {
      return null;
    }
  })();

  // Use playerName first, then localStorage username
  const currentPlayerName = (
    playerName ||
    storedUser?.name ||
    ""
  ).trim();

  const [players, setPlayers] = useState([]);
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [message, setMessage] = useState("");
  const [waitingChallengeId, setWaitingChallengeId] =
    useState(null);

  // --------------------------------------------------
  // LOAD AVAILABLE PLAYERS
  // --------------------------------------------------
  async function loadPlayers() {
    try {
      const response = await fetch(
        `${API}/multiplayer/players`
      );

      const data = await response.json();

      const filtered = (data.players || []).filter(
        (player) =>
          player.name !== currentPlayerName
      );

      setPlayers(filtered);
    } catch (error) {
      console.error(
        "Failed to load players:",
        error
      );
    }
  }

  // --------------------------------------------------
  // LOAD INCOMING CHALLENGES
  // --------------------------------------------------
  async function loadChallenges() {
    if (!currentPlayerName) return;

    try {
      const response = await fetch(
        `${API}/multiplayer/challenges/${encodeURIComponent(
          currentPlayerName
        )}`
      );

      const data = await response.json();

      setIncomingChallenges(
        data.challenges || []
      );
    } catch (error) {
      console.error(
        "Failed to load challenges:",
        error
      );
    }
  }

  // --------------------------------------------------
  // REGISTER PLAYER ONLINE + POLL
  // --------------------------------------------------
  useEffect(() => {
    if (!currentPlayerName) {
      console.warn(
        "No player name available."
      );
      return;
    }

    async function becomeAvailable() {
      try {
        const response = await fetch(
          `${API}/multiplayer/online?player_name=${encodeURIComponent(
            currentPlayerName
          )}`,
          {
            method: "POST",
          }
        );

        const data = await response.json();

        console.log(
          "PLAYER ONLINE:",
          currentPlayerName,
          data
        );

        if (!response.ok) {
          console.error(
            "Failed to register online:",
            data
          );
          return;
        }

        // Load players immediately
        await loadPlayers();

        // Load challenges immediately
        await loadChallenges();
      } catch (error) {
        console.error(
          "Failed to mark player online:",
          error
        );
      }
    }

    becomeAvailable();

    // Refresh every 3 seconds
    const interval = setInterval(() => {
      loadPlayers();
      loadChallenges();
    }, 3000);

    // IMPORTANT:
    // Do NOT call /offline here.
    // This prevents React StrictMode from
    // accidentally removing the player.
    return () => {
      clearInterval(interval);
    };
  }, [currentPlayerName]);

  // --------------------------------------------------
  // SEND CHALLENGE
  // --------------------------------------------------
  async function handleChallenge(opponent) {
    try {
      const response = await fetch(
        `${API}/multiplayer/challenge?challenger=${encodeURIComponent(
          currentPlayerName
        )}&opponent=${encodeURIComponent(
          opponent.name
        )}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail ||
            "Failed to send challenge"
        );
        return;
      }

      const challengeId =
        data.challenge.challenge_id;

      setWaitingChallengeId(challengeId);

      setMessage(
        `Challenge sent to ${opponent.name}! Waiting for response...`
      );

      console.log(
        "CHALLENGE SENT:",
        data.challenge
      );

      // Check challenge status every 2 seconds
      const checkChallengeStatus =
        setInterval(async () => {
          try {
            const statusResponse =
              await fetch(
                `${API}/multiplayer/challenge/${encodeURIComponent(
                  challengeId
                )}`
              );

            if (!statusResponse.ok) {
              return;
            }

            const statusData =
              await statusResponse.json();

            const challenge =
              statusData.challenge;

            console.log(
              "CHALLENGE STATUS:",
              challenge.status
            );

            // ------------------------------
            // ACCEPTED
            // ------------------------------
            if (
              challenge.status ===
              "accepted"
            ) {
              clearInterval(
                checkChallengeStatus
              );

              setWaitingChallengeId(null);
              setMessage("");

              console.log(
                "🎉 CHALLENGE ACCEPTED:",
                challenge
              );

              onSelectOpponent({
                name: challenge.opponent,
                challengeId:
                  challenge.challenge_id,
              });
            }

            // ------------------------------
            // DECLINED
            // ------------------------------
            if (
              challenge.status ===
              "declined"
            ) {
              clearInterval(
                checkChallengeStatus
              );

              setWaitingChallengeId(null);

              setMessage(
                `${challenge.opponent} declined the challenge.`
              );

              loadPlayers();
              loadChallenges();
            }
          } catch (error) {
            console.error(
              "Challenge status check failed:",
              error
            );
          }
        }, 2000);
    } catch (error) {
      console.error(
        "Challenge error:",
        error
      );

      setMessage(
        "Failed to send challenge."
      );
    }
  }

  // --------------------------------------------------
  // ACCEPT / DECLINE CHALLENGE
  // --------------------------------------------------
  async function handleChallengeResponse(
    challenge,
    accept
  ) {
    try {
      const response = await fetch(
        `${API}/multiplayer/challenge/respond?challenge_id=${encodeURIComponent(
          challenge.challenge_id
        )}&player_name=${encodeURIComponent(
          currentPlayerName
        )}&accept=${accept}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail ||
            "Failed to respond to challenge"
        );
        return;
      }

      // ------------------------------
      // ACCEPT
      // ------------------------------
      if (accept) {
        onSelectOpponent({
          name: challenge.challenger,
          challengeId:
            challenge.challenge_id,
        });
      }

      // ------------------------------
      // DECLINE
      // ------------------------------
      else {
        setMessage(
          "Challenge declined."
        );
      }

      // Refresh lists
      loadChallenges();
      loadPlayers();
    } catch (error) {
      console.error(
        "Challenge response error:",
        error
      );

      setMessage(
        "Failed to respond to challenge."
      );
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="vv-page">
      <style>{`
        .vv-page {
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          padding: 0 28px 60px;
          background:
            radial-gradient(circle at 50% -15%, rgba(0, 212, 255, 0.12), transparent 36%),
            radial-gradient(circle at 85% 20%, rgba(123, 47, 255, 0.10), transparent 28%),
            #020510;
          color: #eef4ff;
          font-family: 'Courier New', monospace;
          position: relative;
          overflow-x: hidden;
        }

        .vv-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.35;
          background-image:
            linear-gradient(rgba(0, 212, 255, 0.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.028) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .vv-topbar {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          max-width: 1180px;
          margin: 0 auto;
          border-bottom: 1px solid rgba(90, 140, 255, 0.14);
          position: relative;
          z-index: 2;
        }

        .vv-brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .vv-logo {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #00d9ff, #715cff);
          box-shadow: 0 0 22px rgba(0, 217, 255, 0.25);
          font-size: 18px;
        }

        .vv-brand-name {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .vv-brand-name span {
          color: #00d9ff;
        }

        .vv-brand-sub {
          margin-top: 3px;
          font-size: 8px;
          color: #667695;
          letter-spacing: 2px;
        }

        .vv-user {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(0, 217, 255, 0.18);
          background: rgba(5, 10, 24, 0.72);
          color: #7586a7;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        .vv-user span {
          color: #dce8ff;
        }

        .vv-main {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding-top: 46px;
        }

        .vv-heading {
          text-align: center;
          margin-bottom: 34px;
        }

        .vv-kicker {
          color: #00d9ff;
          font-size: 10px;
          letter-spacing: 4px;
          margin-bottom: 14px;
        }

        .vv-title {
          margin: 0;
          font-size: clamp(34px, 5vw, 54px);
          font-weight: 900;
          letter-spacing: 5px;
          background: linear-gradient(90deg, #00d4ff 0%, #7b2fff 50%, #00d4ff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .vv-subtitle {
          margin: 14px 0 0;
          color: #607392;
          font-size: 12px;
          letter-spacing: 2px;
          line-height: 1.7;
        }

        .vv-message {
          margin: 0 auto 18px;
          padding: 14px 18px;
          max-width: 760px;
          border-radius: 12px;
          border: 1px solid rgba(0, 212, 255, 0.18);
          background: rgba(0, 212, 255, 0.045);
          color: #9bb8d7;
          font-size: 11px;
          line-height: 1.6;
          text-align: center;
          box-shadow: 0 0 24px rgba(0, 212, 255, 0.05);
        }

        .vv-waiting {
          margin: 0 auto 22px;
          padding: 14px 18px;
          max-width: 760px;
          border-radius: 12px;
          border: 1px solid rgba(255, 193, 7, 0.18);
          background: rgba(255, 193, 7, 0.045);
          color: #c9b46d;
          text-align: center;
          font-size: 11px;
        }

        .vv-section-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin: 30px 0 13px;
        }

        .vv-section-label h2 {
          margin: 0;
          color: #dbe7ff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2.5px;
        }

        .vv-section-label span {
          color: #50627f;
          font-size: 8px;
          letter-spacing: 1.5px;
        }

        .vv-card {
          background: rgba(9, 14, 28, 0.84);
          border: 1px solid rgba(90, 140, 255, 0.14);
          border-radius: 16px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(12px);
        }

        .vv-challenge-card {
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border-color: rgba(123, 47, 255, 0.20);
          background:
            linear-gradient(135deg, rgba(123, 47, 255, 0.07), rgba(8, 13, 27, 0.88));
        }

        .vv-player-main {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .vv-avatar {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(0, 217, 255, 0.13), rgba(123, 47, 255, 0.16));
          border: 1px solid rgba(0, 217, 255, 0.20);
          color: #b9c8e4;
          font-size: 18px;
        }

        .vv-player-name {
          color: #eef4ff;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .vv-player-status {
          margin-top: 6px;
          color: #6d7c99;
          font-size: 8px;
          letter-spacing: 1.8px;
        }

        .vv-online-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin-right: 7px;
          border-radius: 50%;
          background: #00ffaa;
          box-shadow: 0 0 10px #00ffaa;
          vertical-align: middle;
        }

        .vv-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .vv-btn {
          padding: 11px 18px;
          border-radius: 9px;
          border: 1px solid rgba(0, 217, 255, 0.24);
          background: rgba(0, 217, 255, 0.055);
          color: #00d9ff;
          font-family: 'Courier New', monospace;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .vv-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(0, 217, 255, 0.58);
          background: rgba(0, 217, 255, 0.11);
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.14);
        }

        .vv-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .vv-btn-primary {
          border: none;
          color: white;
          background: linear-gradient(135deg, #00bfe8, #7250ed);
          box-shadow: 0 0 22px rgba(0, 191, 232, 0.12);
        }

        .vv-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #00d9ff, #8465ff);
        }

        .vv-btn-accept {
          border-color: rgba(0, 255, 170, 0.24);
          color: #00ffaa;
          background: rgba(0, 255, 170, 0.045);
        }

        .vv-btn-decline {
          border-color: rgba(255, 80, 104, 0.20);
          color: #ff7184;
          background: rgba(255, 80, 104, 0.035);
        }

        .vv-empty {
          padding: 34px 20px;
          text-align: center;
          color: #647391;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .vv-empty-icon {
          font-size: 28px;
          margin-bottom: 10px;
          opacity: 0.65;
        }

        .vv-back-row {
          display: flex;
          justify-content: center;
          margin-top: 28px;
        }

        .vv-back {
          padding: 10px 20px;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.025);
          color: #74839d;
          font-family: 'Courier New', monospace;
          font-size: 9px;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .vv-back:hover {
          color: #dce8ff;
          border-color: rgba(255, 255, 255, 0.20);
        }

        @media (max-width: 700px) {
          .vv-page {
            padding: 0 16px 40px;
          }

          .vv-topbar {
            height: 66px;
          }

          .vv-user {
            display: none;
          }

          .vv-main {
            padding-top: 34px;
          }

          .vv-challenge-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .vv-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="vv-grid" />

      <header className="vv-topbar">
        <div className="vv-brand">
          <div className="vv-logo">🎙</div>
          <div>
            <div className="vv-brand-name">
              VOICE <span>VERSUS</span>
            </div>
            <div className="vv-brand-sub">
              AI DEBATE ARENA
            </div>
          </div>
        </div>

        {currentPlayerName && (
          <div className="vv-user">
            OPERATIVE: <span>{currentPlayerName.toUpperCase()}</span>
          </div>
        )}
      </header>

      <main className="vv-main">
        <section className="vv-heading">
          <div className="vv-kicker">
            [ FIND YOUR OPPONENT ]
          </div>

          <h1 className="vv-title">
            AVAILABLE PLAYERS
          </h1>

          <p className="vv-subtitle">
            Challenge another player to a live voice debate
            <br />
            with AI-powered judging and analysis.
          </p>
        </section>

        {message && (
          <div className="vv-message">
            {message}
          </div>
        )}

        {waitingChallengeId && (
          <div className="vv-waiting">
            ⏳ &nbsp; WAITING FOR THE OPPONENT TO ACCEPT YOUR CHALLENGE...
          </div>
        )}

        {incomingChallenges.length > 0 && (
          <>
            <div className="vv-section-label">
              <h2>⚔ INCOMING CHALLENGES</h2>
              <span>{incomingChallenges.length} PENDING</span>
            </div>

            <div
              className="vv-card"
              style={{ padding: "12px" }}
            >
              {incomingChallenges.map((challenge) => (
                <div
                  key={challenge.challenge_id}
                  className="vv-challenge-card"
                  style={{
                    marginBottom:
                      incomingChallenges[incomingChallenges.length - 1]
                        ?.challenge_id === challenge.challenge_id
                        ? 0
                        : 10,
                  }}
                >
                  <div className="vv-player-main">
                    <div className="vv-avatar">⚔️</div>

                    <div>
                      <div className="vv-player-name">
                        {challenge.challenger}
                      </div>

                      <div className="vv-player-status">
                        WANTS TO DEBATE WITH YOU
                      </div>
                    </div>
                  </div>

                  <div className="vv-actions">
                    <button
                      className="vv-btn vv-btn-accept"
                      onClick={() =>
                        handleChallengeResponse(
                          challenge,
                          true
                        )
                      }
                    >
                      ACCEPT
                    </button>

                    <button
                      className="vv-btn vv-btn-decline"
                      onClick={() =>
                        handleChallengeResponse(
                          challenge,
                          false
                        )
                      }
                    >
                      DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="vv-section-label">
          <h2>◉ AVAILABLE PLAYERS</h2>
          <span>{players.length} ONLINE</span>
        </div>

        <div className="vv-card">
          {players.length === 0 ? (
            <div className="vv-empty">
              <div className="vv-empty-icon">👥</div>
              NO OTHER PLAYERS ARE CURRENTLY AVAILABLE.
              <div style={{ marginTop: 8, color: "#465673", fontSize: 9 }}>
                Keep this page open — the list refreshes automatically.
              </div>
            </div>
          ) : (
            players.map((player, index) => (
              <div
                key={player.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 18,
                  padding: "18px 20px",
                  borderBottom:
                    index === players.length - 1
                      ? "none"
                      : "1px solid rgba(90, 140, 255, 0.10)",
                }}
              >
                <div className="vv-player-main">
                  <div className="vv-avatar">👤</div>

                  <div>
                    <div className="vv-player-name">
                      {player.name}
                    </div>

                    <div className="vv-player-status">
                      <span className="vv-online-dot" />
                      AVAILABLE
                    </div>
                  </div>
                </div>

                <button
                  className="vv-btn vv-btn-primary"
                  onClick={() => handleChallenge(player)}
                  disabled={waitingChallengeId !== null}
                >
                  {waitingChallengeId
                    ? "WAITING..."
                    : "CHALLENGE"}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="vv-back-row">
          <button
            className="vv-back"
            onClick={onBack}
          >
            ← BACK
          </button>
        </div>
      </main>
    </div>
  );
}
