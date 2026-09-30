import { useEffect, useState } from "react";

const TOPICS = [
  "Artificial Intelligence: Boon or Bane",
  "Social Media: Good or Bad",
  "Online Education vs Traditional Education",
  "Climate Change: Individual vs Government Responsibility",
  "Should College Education Be Free?",
  "Is Technology Making Us More Productive?"
];

export default function MultiplayerTopicSelection({
  playerName,
  opponentName,
  onTopicSelected,
  onBack,
}) {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [status, setStatus] = useState("selecting");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleTopic(topic) {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((item) => item !== topic)
        : [...prev, topic]
    );
  }

  async function submitTopics() {
    if (selectedTopics.length === 0) {
      setMessage("Please select at least one topic.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        player_name: playerName,
        opponent_name: opponentName,
      });

      const response = await fetch(
        `/multiplayer/topic-selection?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedTopics),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit topic selection");
      }

      const data = await response.json();

      if (data.status === "topic_selected") {
        setResult(data);
        setStatus("topic_selected");

        if (onTopicSelected) {
          onTopicSelected(data);
        }
      } else if (data.status === "no_common_topic") {
        setStatus("no_common_topic");
        setMessage(
          "You and your opponent did not choose any common topics."
        );
      } else {
        setStatus("waiting");
        setMessage("Waiting for your opponent to choose their topics...");
      }
    } catch (error) {
      console.error("Topic selection error:", error);
      setMessage("Could not submit topics. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (status !== "waiting") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/multiplayer/topic-selection/${encodeURIComponent(
            playerName
          )}/${encodeURIComponent(opponentName)}`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.status === "topic_selected") {
          setResult(data);
          setStatus("topic_selected");

          if (onTopicSelected) {
            onTopicSelected(data);
          }
        }

        if (data.status === "no_common_topic") {
          setStatus("no_common_topic");
          setMessage(
            "You and your opponent did not choose any common topics."
          );
        }
      } catch (error) {
        console.error("Polling topic selection failed:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, playerName, opponentName, onTopicSelected]);

  if (status === "topic_selected" && result) {
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
            max-width: 1120px;
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
            max-width: 980px;
            margin: 0 auto;
            padding-top: 44px;
          }

          .vv-heading {
            text-align: center;
            margin-bottom: 30px;
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

          .vv-card {
            background: rgba(9, 14, 28, 0.84);
            border: 1px solid rgba(90, 140, 255, 0.14);
            border-radius: 18px;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
            backdrop-filter: blur(12px);
          }

          .vv-topic-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .vv-topic {
            min-height: 126px;
            padding: 18px;
            border-radius: 16px;
            border: 1px solid rgba(90, 140, 255, 0.14);
            background: rgba(255, 255, 255, 0.018);
            color: #b9c7df;
            text-align: left;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            transition: 0.22s ease;
            position: relative;
            overflow: hidden;
          }

          .vv-topic:hover {
            transform: translateY(-3px);
            border-color: rgba(0, 217, 255, 0.34);
            box-shadow: 0 0 24px rgba(0, 217, 255, 0.08);
          }

          .vv-topic.selected {
            border-color: rgba(0, 217, 255, 0.58);
            background:
              linear-gradient(135deg, rgba(0, 217, 255, 0.10), rgba(123, 47, 255, 0.09)),
              rgba(255, 255, 255, 0.02);
            box-shadow:
              0 0 0 1px rgba(0, 217, 255, 0.08),
              0 0 28px rgba(0, 217, 255, 0.10);
          }

          .vv-topic-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 20px;
          }

          .vv-topic-icon {
            font-size: 22px;
          }

          .vv-check {
            width: 24px;
            height: 24px;
            border-radius: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #607392;
            background: rgba(255, 255, 255, 0.02);
            font-size: 12px;
            font-weight: 900;
          }

          .vv-topic.selected .vv-check {
            color: #021017;
            border-color: #00d9ff;
            background: #00d9ff;
            box-shadow: 0 0 14px rgba(0, 217, 255, 0.45);
          }

          .vv-topic-label {
            color: #eef4ff;
            font-size: 12px;
            line-height: 1.55;
            font-weight: 900;
            letter-spacing: 1px;
          }

          .vv-topic.selected .vv-topic-label {
            color: #ffffff;
          }

          .vv-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
            margin-top: 18px;
            padding: 12px 14px;
            border-radius: 11px;
            background: rgba(0, 212, 255, 0.035);
            border: 1px solid rgba(0, 212, 255, 0.10);
            color: #627494;
            font-size: 9px;
            letter-spacing: 1.5px;
          }

          .vv-count {
            color: #00d9ff;
            font-weight: 900;
          }

          .vv-message {
            margin: 16px auto 0;
            padding: 13px 16px;
            border-radius: 11px;
            border: 1px solid rgba(255, 193, 7, 0.18);
            background: rgba(255, 193, 7, 0.045);
            color: #c7b56e;
            text-align: center;
            font-size: 10px;
            line-height: 1.6;
          }

          .vv-actions {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 22px;
          }

          .vv-btn {
            padding: 12px 20px;
            border-radius: 9px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            background: rgba(255, 255, 255, 0.025);
            color: #74839d;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1.5px;
            cursor: pointer;
            transition: 0.2s ease;
          }

          .vv-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            color: #e7f2ff;
            border-color: rgba(255, 255, 255, 0.22);
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

          .vv-btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .vv-status {
            text-align: center;
            padding: 26px 20px;
          }

          .vv-status-icon {
            font-size: 38px;
            margin-bottom: 13px;
          }

          .vv-status-title {
            margin: 0;
            color: #eff5ff;
            font-size: 18px;
            letter-spacing: 2px;
          }

          .vv-status-text {
            margin: 10px auto 0;
            max-width: 600px;
            color: #6f809e;
            font-size: 10px;
            line-height: 1.8;
          }

          .vv-progress {
            width: 180px;
            height: 4px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.06);
            overflow: hidden;
            margin: 20px auto 0;
          }

          .vv-progress > div {
            height: 100%;
            width: 48%;
            background: linear-gradient(90deg, #00d4ff, #7b2fff);
            animation: vvPulse 1.35s infinite ease-in-out;
          }

          @keyframes vvPulse {
            0%, 100% { transform: translateX(-110%); }
            50% { transform: translateX(160%); }
          }

          .vv-result-card {
            padding: 30px;
            text-align: center;
          }

          .vv-result-kicker {
            color: #00d9ff;
            font-size: 9px;
            letter-spacing: 3px;
            margin-bottom: 15px;
          }

          .vv-result-topic {
            margin: 0 auto;
            max-width: 700px;
            color: #eef4ff;
            font-size: clamp(23px, 4vw, 34px);
            line-height: 1.25;
            letter-spacing: 1.5px;
          }

          .vv-result-meta {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 22px;
          }

          .vv-player {
            flex: 1;
            min-width: 200px;
            padding: 18px;
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.025);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .vv-player-name {
            color: #eef4ff;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 1px;
          }

          .vv-side {
            display: inline-block;
            margin-top: 9px;
            padding: 6px 12px;
            border-radius: 999px;
            color: #00d9ff;
            border: 1px solid rgba(0, 217, 255, 0.22);
            background: rgba(0, 217, 255, 0.05);
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 1.5px;
          }

          .vv-vs {
            align-self: center;
            color: #6b7b98;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 2px;
          }

          .vv-no-common {
            border-color: rgba(255, 75, 92, 0.20);
            background: linear-gradient(135deg, rgba(255, 75, 92, 0.06), rgba(10, 14, 28, 0.92));
          }

          .vv-no-common .vv-status-icon {
            filter: drop-shadow(0 0 12px rgba(255, 75, 92, 0.18));
          }

          @media (max-width: 760px) {
            .vv-page {
              padding: 0 16px 42px;
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

            .vv-topic-grid {
              grid-template-columns: 1fr;
            }

            .vv-actions {
              flex-direction: column-reverse;
            }

            .vv-btn {
              width: 100%;
            }

            .vv-result-meta {
              flex-direction: column;
            }

            .vv-vs {
              display: none;
            }

            .vv-player {
              min-width: 0;
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

          {playerName && (
            <div className="vv-user">
              OPERATIVE: <span>{playerName.toUpperCase()}</span>
            </div>
          )}
        </header>

        <main className="vv-main">
          <section className="vv-heading">
            <div className="vv-kicker">
              [ MATCH FOUND • TOPIC SYNC ]
            </div>
            <h1 className="vv-title">
              CHOOSE YOUR BATTLEGROUND
            </h1>
            <p className="vv-subtitle">
              Pick the topics you are prepared to debate.
              <br />
              The system will find the common battlefield with your opponent.
            </p>
          </section>

          <section className="vv-card" style={{ padding: 18 }}>
            <div className="vv-meta">
              <span>YOU: <strong style={{ color: "#dbe8ff" }}>{playerName}</strong></span>
              <span>OPPONENT: <strong style={{ color: "#dbe8ff" }}>{opponentName}</strong></span>
              <span>
                SELECTED: <span className="vv-count">{selectedTopics.length}</span>
              </span>
            </div>

            <div style={{ marginTop: 18 }} className="vv-topic-grid">
              {TOPICS.map((topic, index) => {
                const selected = selectedTopics.includes(topic);
                const icons = ["🤖", "📱", "🎓", "🌍", "🏫", "⚡"];

                return (
                  <button
                    key={topic}
                    className={`vv-topic ${selected ? "selected" : ""}`}
                    onClick={() => toggleTopic(topic)}
                    type="button"
                  >
                    <div className="vv-topic-top">
                      <span className="vv-topic-icon">
                        {icons[index]}
                      </span>
                      <span className="vv-check">
                        {selected ? "✓" : "○"}
                      </span>
                    </div>

                    <div className="vv-topic-label">
                      {topic}
                    </div>
                  </button>
                );
              })}
            </div>

            {message && (
              <div className="vv-message">
                {message}
              </div>
            )}

            <div className="vv-actions">
              <button
                className="vv-btn"
                onClick={onBack}
                type="button"
              >
                ← BACK
              </button>

              <button
                className="vv-btn vv-btn-primary"
                onClick={submitTopics}
                disabled={submitting}
                type="button"
              >
                {submitting
                  ? "SUBMITTING..."
                  : "✓ FIND COMMON TOPIC"}
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="vv-page">
        <style>{`
          .vv-page{min-height:100vh;width:100%;box-sizing:border-box;padding:0 28px 60px;background:radial-gradient(circle at 50% -15%,rgba(0,212,255,.12),transparent 36%),radial-gradient(circle at 85% 20%,rgba(123,47,255,.10),transparent 28%),#020510;color:#eef4ff;font-family:'Courier New',monospace;position:relative;overflow-x:hidden}
          .vv-grid{position:fixed;inset:0;pointer-events:none;opacity:.35;background-image:linear-gradient(rgba(0,212,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.028) 1px,transparent 1px);background-size:60px 60px}
          .vv-topbar{height:72px;display:flex;align-items:center;justify-content:space-between;max-width:1120px;margin:0 auto;border-bottom:1px solid rgba(90,140,255,.14);position:relative;z-index:2}
          .vv-brand{display:flex;align-items:center;gap:11px}.vv-logo{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#00d9ff,#715cff);box-shadow:0 0 22px rgba(0,217,255,.25);font-size:18px}
          .vv-brand-name{font-size:16px;font-weight:900;letter-spacing:3px}.vv-brand-name span{color:#00d9ff}.vv-brand-sub{margin-top:3px;font-size:8px;color:#667695;letter-spacing:2px}
          .vv-user{padding:8px 14px;border-radius:999px;border:1px solid rgba(0,217,255,.18);background:rgba(5,10,24,.72);color:#7586a7;font-size:9px;letter-spacing:1.5px}.vv-user span{color:#dce8ff}
          .vv-main{position:relative;z-index:1;max-width:820px;margin:0 auto;padding-top:64px}.vv-heading{text-align:center;margin-bottom:30px}.vv-kicker{color:#00d9ff;font-size:10px;letter-spacing:4px;margin-bottom:14px}.vv-title{margin:0;font-size:clamp(34px,5vw,54px);font-weight:900;letter-spacing:5px;background:linear-gradient(90deg,#00d4ff 0%,#7b2fff 50%,#00d4ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.vv-subtitle{margin:14px 0 0;color:#607392;font-size:12px;letter-spacing:2px;line-height:1.7}
          .vv-card{background:rgba(9,14,28,.84);border:1px solid rgba(90,140,255,.14);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);backdrop-filter:blur(12px);padding:34px}
          .vv-status{text-align:center;padding:14px}.vv-status-icon{font-size:42px;margin-bottom:14px}.vv-status-title{margin:0;color:#eff5ff;font-size:20px;letter-spacing:2px}.vv-status-text{margin:11px auto 0;max-width:600px;color:#6f809e;font-size:10px;line-height:1.8}.vv-progress{width:190px;height:4px;border-radius:10px;background:rgba(255,255,255,.06);overflow:hidden;margin:22px auto 0}.vv-progress>div{height:100%;width:48%;background:linear-gradient(90deg,#00d4ff,#7b2fff);animation:vvPulse 1.35s infinite ease-in-out}@keyframes vvPulse{0%,100%{transform:translateX(-110%)}50%{transform:translateX(160%)}}
          @media(max-width:700px){.vv-page{padding:0 16px 42px}.vv-topbar{height:66px}.vv-user{display:none}.vv-main{padding-top:42px}}
        `}</style>

        <div className="vv-grid" />
        <header className="vv-topbar">
          <div className="vv-brand">
            <div className="vv-logo">🎙</div>
            <div>
              <div className="vv-brand-name">VOICE <span>VERSUS</span></div>
              <div className="vv-brand-sub">AI DEBATE ARENA</div>
            </div>
          </div>

          {playerName && (
            <div className="vv-user">
              OPERATIVE: <span>{playerName.toUpperCase()}</span>
            </div>
          )}
        </header>

        <main className="vv-main">
          <section className="vv-heading">
            <div className="vv-kicker">[ TOPIC SYNCHRONIZATION ]</div>
            <h1 className="vv-title">TOPIC SELECTION</h1>
            <p className="vv-subtitle">
              Your choices are in.
              <br />
              Waiting for the opponent to finish selecting.
            </p>
          </section>

          <div className="vv-card">
            <div className="vv-status">
              <div className="vv-status-icon">⏳</div>
              <h2 className="vv-status-title">
                WAITING FOR OPPONENT
              </h2>
              <p className="vv-status-text">
                Your topics have been submitted successfully.
                {message ? ` ${message}` : ""}
              </p>

              <div className="vv-progress">
                <div />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (status === "no_common_topic") {
    return (
      <div className="vv-page">
        <style>{`
          .vv-page{min-height:100vh;width:100%;box-sizing:border-box;padding:0 28px 60px;background:radial-gradient(circle at 50% -15%,rgba(0,212,255,.12),transparent 36%),radial-gradient(circle at 85% 20%,rgba(123,47,255,.10),transparent 28%),#020510;color:#eef4ff;font-family:'Courier New',monospace;position:relative;overflow-x:hidden}
          .vv-grid{position:fixed;inset:0;pointer-events:none;opacity:.35;background-image:linear-gradient(rgba(0,212,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.028) 1px,transparent 1px);background-size:60px 60px}
          .vv-topbar{height:72px;display:flex;align-items:center;justify-content:space-between;max-width:1120px;margin:0 auto;border-bottom:1px solid rgba(90,140,255,.14);position:relative;z-index:2}
          .vv-brand{display:flex;align-items:center;gap:11px}.vv-logo{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#00d9ff,#715cff);box-shadow:0 0 22px rgba(0,217,255,.25);font-size:18px}
          .vv-brand-name{font-size:16px;font-weight:900;letter-spacing:3px}.vv-brand-name span{color:#00d9ff}.vv-brand-sub{margin-top:3px;font-size:8px;color:#667695;letter-spacing:2px}.vv-user{padding:8px 14px;border-radius:999px;border:1px solid rgba(0,217,255,.18);background:rgba(5,10,24,.72);color:#7586a7;font-size:9px;letter-spacing:1.5px}.vv-user span{color:#dce8ff}
          .vv-main{position:relative;z-index:1;max-width:820px;margin:0 auto;padding-top:64px}.vv-heading{text-align:center;margin-bottom:30px}.vv-kicker{color:#ff7184;font-size:10px;letter-spacing:4px;margin-bottom:14px}.vv-title{margin:0;font-size:clamp(34px,5vw,54px);font-weight:900;letter-spacing:5px;background:linear-gradient(90deg,#ff7184 0%,#7b2fff 50%,#00d4ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.vv-subtitle{margin:14px 0 0;color:#607392;font-size:12px;letter-spacing:2px;line-height:1.7}
          .vv-card{background:linear-gradient(135deg,rgba(255,75,92,.05),rgba(9,14,28,.92));border:1px solid rgba(255,75,92,.20);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);padding:34px}.vv-status{text-align:center}.vv-status-icon{font-size:42px;margin-bottom:14px}.vv-status-title{margin:0;color:#eff5ff;font-size:20px;letter-spacing:2px}.vv-status-text{margin:11px auto 0;max-width:600px;color:#7f8da7;font-size:10px;line-height:1.8}
          .vv-btn{margin-top:24px;padding:12px 22px;border-radius:9px;border:none;color:white;font-family:'Courier New',monospace;font-size:9px;font-weight:900;letter-spacing:1.5px;background:linear-gradient(135deg,#00bfe8,#7250ed);cursor:pointer;box-shadow:0 0 22px rgba(0,191,232,.12)}
          @media(max-width:700px){.vv-page{padding:0 16px 42px}.vv-topbar{height:66px}.vv-user{display:none}.vv-main{padding-top:42px}}
        `}</style>

        <div className="vv-grid" />
        <header className="vv-topbar">
          <div className="vv-brand">
            <div className="vv-logo">🎙</div>
            <div>
              <div className="vv-brand-name">VOICE <span>VERSUS</span></div>
              <div className="vv-brand-sub">AI DEBATE ARENA</div>
            </div>
          </div>

          {playerName && (
            <div className="vv-user">
              OPERATIVE: <span>{playerName.toUpperCase()}</span>
            </div>
          )}
        </header>

        <main className="vv-main">
          <section className="vv-heading">
            <div className="vv-kicker">[ MATCHING FAILED ]</div>
            <h1 className="vv-title">NO COMMON TOPIC</h1>
            <p className="vv-subtitle">
              The AI could not find a shared topic
              <br />
              from the preferences you both selected.
            </p>
          </section>

          <div className="vv-card">
            <div className="vv-status">
              <div className="vv-status-icon">😕</div>
              <h2 className="vv-status-title">
                TOPICS DO NOT OVERLAP
              </h2>
              <p className="vv-status-text">
                {message}
              </p>

              <button
                className="vv-btn"
                onClick={onBack}
                type="button"
              >
                ← CHOOSE AGAIN
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="vv-page">
        <style>{`
          .vv-page{
            min-height:100vh;
            width:100%;
            box-sizing:border-box;
            padding:0 28px 58px;
            background:
              radial-gradient(circle at 50% -15%, rgba(0,212,255,.13), transparent 34%),
              radial-gradient(circle at 88% 18%, rgba(123,47,255,.11), transparent 28%),
              #020510;
            color:#eef4ff;
            font-family:'Courier New',monospace;
            position:relative;
            overflow-x:hidden;
          }
          .vv-grid{
            position:fixed;
            inset:0;
            pointer-events:none;
            opacity:.34;
            background-image:
              linear-gradient(rgba(0,212,255,.032) 1px,transparent 1px),
              linear-gradient(90deg,rgba(0,212,255,.032) 1px,transparent 1px);
            background-size:60px 60px;
          }
          .vv-topbar{
            height:72px;
            max-width:1120px;
            margin:0 auto;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:20px;
            border-bottom:1px solid rgba(90,140,255,.14);
            position:relative;
            z-index:2;
          }
          .vv-brand{display:flex;align-items:center;gap:11px}
          .vv-logo{
            width:40px;height:40px;border-radius:11px;
            display:flex;align-items:center;justify-content:center;
            background:linear-gradient(135deg,#00d9ff,#715cff);
            box-shadow:0 0 24px rgba(0,217,255,.25);
            font-size:19px;
          }
          .vv-brand-name{font-size:16px;font-weight:900;letter-spacing:3px}
          .vv-brand-name span{color:#00d9ff}
          .vv-brand-sub{margin-top:3px;color:#667695;font-size:8px;letter-spacing:2px}
          .vv-user{
            padding:8px 14px;border-radius:999px;
            background:rgba(5,10,24,.72);
            border:1px solid rgba(0,217,255,.18);
            color:#7586a7;font-size:9px;letter-spacing:1.5px;white-space:nowrap;
          }
          .vv-user span{color:#dce8ff}
          .vv-main{position:relative;z-index:1;max-width:1050px;margin:0 auto;padding-top:48px}
          .vv-heading{text-align:center;margin-bottom:28px}
          .vv-kicker{color:#00d9ff;font-size:10px;letter-spacing:4px;margin-bottom:13px}
          .vv-title{
            margin:0;font-size:clamp(34px,5vw,56px);font-weight:900;letter-spacing:5px;line-height:1.05;
            background:linear-gradient(90deg,#00d4ff 0%,#7b2fff 50%,#00d4ff 100%);
            background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
          }
          .vv-subtitle{margin:14px 0 0;color:#677996;font-size:12px;letter-spacing:1.4px;line-height:1.75}
          .vv-card{
            background:rgba(9,14,28,.86);
            border:1px solid rgba(90,140,255,.15);
            border-radius:20px;
            box-shadow:0 24px 70px rgba(0,0,0,.32),0 0 40px rgba(0,130,255,.035);
            backdrop-filter:blur(14px);
          }
          .vv-meta{
            display:grid;grid-template-columns:1fr 1fr auto;align-items:center;gap:12px;
            padding:14px 16px;border-radius:12px;
            background:rgba(0,212,255,.035);border:1px solid rgba(0,212,255,.10);
            color:#7486a4;font-size:10px;letter-spacing:1px;
          }
          .vv-meta strong{color:#dbe8ff}
          .vv-count{color:#00d9ff;font-weight:900;font-size:12px}
          .vv-topic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
          .vv-topic{
            width:100%;min-height:132px;padding:18px;border-radius:16px;
            border:1px solid rgba(90,140,255,.14);background:rgba(255,255,255,.022);
            color:#b9c7df;text-align:left;font-family:'Courier New',monospace;cursor:pointer;
            transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease;
            position:relative;overflow:hidden;
          }
          .vv-topic:hover{
            transform:translateY(-3px);border-color:rgba(0,217,255,.38);
            background:rgba(0,212,255,.035);box-shadow:0 14px 32px rgba(0,100,255,.10);
          }
          .vv-topic.selected{
            border-color:rgba(0,217,255,.64);
            background:linear-gradient(135deg,rgba(0,217,255,.10),rgba(123,47,255,.08)),rgba(255,255,255,.02);
            box-shadow:0 0 0 1px rgba(0,217,255,.08),0 0 30px rgba(0,217,255,.10);
          }
          .vv-topic-top{
            display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;
          }
          .vv-topic-icon{font-size:23px}
          .vv-check{
            width:25px;height:25px;border-radius:7px;display:flex;align-items:center;justify-content:center;
            border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.025);color:#607392;font-size:12px;font-weight:900;
          }
          .vv-topic.selected .vv-check{color:#021017;border-color:#00d9ff;background:#00d9ff;box-shadow:0 0 15px rgba(0,217,255,.42)}
          .vv-topic-label{color:#eaf2ff;font-size:12px;font-weight:900;letter-spacing:.8px;line-height:1.55}
          .vv-message{
            margin-top:16px;padding:13px 15px;border-radius:11px;border:1px solid rgba(255,193,7,.18);
            background:rgba(255,193,7,.045);color:#cbb86e;font-size:10px;text-align:center;letter-spacing:.7px;
          }
          .vv-actions{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:20px}
          .vv-btn{
            min-width:150px;padding:12px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.11);
            background:rgba(255,255,255,.025);color:#7d8da7;font-family:'Courier New',monospace;
            font-size:9px;font-weight:900;letter-spacing:1.6px;cursor:pointer;transition:.2s ease;
          }
          .vv-btn:hover:not(:disabled){transform:translateY(-2px);color:#e7f2ff;border-color:rgba(255,255,255,.24)}
          .vv-btn-primary{
            min-width:225px;border:none;color:#fff;background:linear-gradient(135deg,#00bfe8,#7250ed);
            box-shadow:0 0 24px rgba(0,191,232,.14);
          }
          .vv-btn-primary:hover:not(:disabled){background:linear-gradient(135deg,#00d9ff,#8465ff);box-shadow:0 0 34px rgba(0,191,232,.21)}
          .vv-btn:disabled{opacity:.56;cursor:not-allowed}
          @media(max-width:760px){
            .vv-page{padding:0 16px 42px}
            .vv-topbar{height:66px}.vv-user{display:none}.vv-main{padding-top:34px}
            .vv-topic-grid{grid-template-columns:1fr}
            .vv-meta{grid-template-columns:1fr 1fr}.vv-meta span:last-child{grid-column:1/-1}
            .vv-actions{flex-direction:column-reverse}.vv-btn,.vv-btn-primary{width:100%;min-width:0}
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

        {playerName && (
          <div className="vv-user">
            OPERATIVE: <span>{playerName.toUpperCase()}</span>
          </div>
        )}
      </header>

      <main className="vv-main">
        <section className="vv-heading">
          <div className="vv-kicker">
            [ MATCH FOUND • TOPIC SYNC ]
          </div>

          <h1 className="vv-title">
            CHOOSE YOUR BATTLEGROUND
          </h1>

          <p className="vv-subtitle">
            Pick the topics you are prepared to debate.
            <br />
            The system will find the common battlefield with your opponent.
          </p>
        </section>

        <section className="vv-card" style={{ padding: 18 }}>
          <div className="vv-meta">
            <span>
              YOU:{" "}
              <strong style={{ color: "#dbe8ff" }}>
                {playerName}
              </strong>
            </span>

            <span>
              OPPONENT:{" "}
              <strong style={{ color: "#dbe8ff" }}>
                {opponentName}
              </strong>
            </span>

            <span>
              SELECTED:{" "}
              <span className="vv-count">
                {selectedTopics.length}
              </span>
            </span>
          </div>

          <div
            style={{ marginTop: 18 }}
            className="vv-topic-grid"
          >
            {TOPICS.map((topic, index) => {
              const selected =
                selectedTopics.includes(topic);

              const icons = [
                "🤖",
                "📱",
                "🎓",
                "🌍",
                "🏫",
                "⚡",
              ];

              return (
                <button
                  key={topic}
                  className={`vv-topic ${
                    selected ? "selected" : ""
                  }`}
                  onClick={() => toggleTopic(topic)}
                  type="button"
                >
                  <div className="vv-topic-top">
                    <span className="vv-topic-icon">
                      {icons[index]}
                    </span>

                    <span className="vv-check">
                      {selected ? "✓" : "○"}
                    </span>
                  </div>

                  <div className="vv-topic-label">
                    {topic}
                  </div>
                </button>
              );
            })}
          </div>

          {message && (
            <div className="vv-message">
              {message}
            </div>
          )}

          <div className="vv-actions">
            <button
              className="vv-btn"
              onClick={onBack}
              type="button"
            >
              ← BACK
            </button>

            <button
              className="vv-btn vv-btn-primary"
              onClick={submitTopics}
              disabled={submitting}
              type="button"
            >
              {submitting
                ? "SUBMITTING..."
                : "✓ FIND COMMON TOPIC"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
