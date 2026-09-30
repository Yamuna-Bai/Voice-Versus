import React, { useEffect, useState } from "react";

const API = "";

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
      <div className="vv-page vv-loading">
        <style>{`
          .vv-page{
            min-height:100vh;
            width:100%;
            box-sizing:border-box;
            background:
              radial-gradient(circle at 50% -15%,rgba(0,212,255,.12),transparent 36%),
              radial-gradient(circle at 85% 20%,rgba(123,47,255,.10),transparent 28%),
              #020510;
            color:#eef4ff;
            font-family:'Courier New',monospace;
            position:relative;
            overflow:hidden;
          }

          .vv-grid{
            position:fixed;
            inset:0;
            pointer-events:none;
            opacity:.35;
            background-image:
              linear-gradient(rgba(0,212,255,.028) 1px,transparent 1px),
              linear-gradient(90deg,rgba(0,212,255,.028) 1px,transparent 1px);
            background-size:60px 60px;
          }

          .vv-loading{
            display:flex;
            align-items:center;
            justify-content:center;
            padding:30px;
          }

          .vv-loader{
            position:relative;
            z-index:1;
            width:min(420px,92vw);
            padding:38px 28px;
            text-align:center;
            border-radius:18px;
            background:rgba(9,14,28,.84);
            border:1px solid rgba(0,217,255,.16);
            box-shadow:0 18px 50px rgba(0,0,0,.35);
            backdrop-filter:blur(12px);
          }

          .vv-spinner{
            width:56px;
            height:56px;
            margin:0 auto 20px;
            border-radius:50%;
            border:2px solid rgba(255,255,255,.08);
            border-top-color:#00d9ff;
            border-right-color:#7b2fff;
            animation:vvSpin 1s linear infinite;
            box-shadow:0 0 24px rgba(0,217,255,.10);
          }

          .vv-loading-kicker{
            color:#00d9ff;
            font-size:9px;
            letter-spacing:3px;
            margin-bottom:10px;
          }

          .vv-loading-title{
            margin:0;
            font-size:17px;
            letter-spacing:3px;
            color:#eef4ff;
          }

          .vv-loading-copy{
            margin:12px 0 0;
            color:#647695;
            font-size:9px;
            letter-spacing:1px;
          }

          @keyframes vvSpin{
            to{transform:rotate(360deg)}
          }
        `}</style>

        <div className="vv-grid" />

        <div className="vv-loader">
          <div className="vv-spinner" />
          <div className="vv-loading-kicker">
            [ MATCH SYNCHRONIZATION ]
          </div>
          <h1 className="vv-loading-title">
            LOADING MATCH...
          </h1>
          <p className="vv-loading-copy">
            CONNECTING TO THE SHARED DEBATE ROOM
          </p>
        </div>
      </div>
    );
  }

  const players = room.players || [];

  const opponent = players.find(
    (player) => player.name !== playerName
  );

  const opponentJoined = !!opponent;

  const myPlayer = players.find(
    (player) => player.name === playerName
  );

  const mySide = myPlayer?.side || "—";
  const opponentSide = opponent?.side || "—";

  const debateTopic =
    typeof room.topic === "string"
      ? room.topic
      : room.topic?.title ||
        room.topic?.topic ||
        "Topic will be announced";

  return (
    <div className="vv-page">
      <style>{`
        *{
          box-sizing:border-box;
        }

        .vv-page{
          min-height:100vh;
          width:100%;
          padding:0 28px 58px;
          background:
            radial-gradient(circle at 50% -15%,rgba(0,212,255,.12),transparent 36%),
            radial-gradient(circle at 88% 20%,rgba(123,47,255,.10),transparent 27%),
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
          opacity:.35;
          background-image:
            linear-gradient(rgba(0,212,255,.028) 1px,transparent 1px),
            linear-gradient(90deg,rgba(0,212,255,.028) 1px,transparent 1px);
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

        .vv-brand{
          display:flex;
          align-items:center;
          gap:11px;
        }

        .vv-logo{
          width:38px;
          height:38px;
          border-radius:10px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:linear-gradient(135deg,#00d9ff,#715cff);
          box-shadow:0 0 22px rgba(0,217,255,.25);
          font-size:18px;
        }

        .vv-brand-name{
          font-size:16px;
          font-weight:900;
          letter-spacing:3px;
        }

        .vv-brand-name span{
          color:#00d9ff;
        }

        .vv-brand-sub{
          margin-top:3px;
          color:#667695;
          font-size:8px;
          letter-spacing:2px;
        }

        .vv-user{
          padding:8px 14px;
          border-radius:999px;
          background:rgba(5,10,24,.72);
          border:1px solid rgba(0,217,255,.18);
          color:#7586a7;
          font-size:9px;
          letter-spacing:1.4px;
        }

        .vv-user span{
          color:#dce8ff;
        }

        .vv-main{
          max-width:1040px;
          margin:0 auto;
          padding-top:46px;
          position:relative;
          z-index:1;
        }

        .vv-heading{
          text-align:center;
          margin-bottom:26px;
        }

        .vv-kicker{
          color:#00d9ff;
          font-size:10px;
          letter-spacing:4px;
          margin-bottom:12px;
        }

        .vv-title{
          margin:0;
          font-size:clamp(32px,5vw,52px);
          font-weight:900;
          letter-spacing:4px;
          background:linear-gradient(90deg,#00d4ff,#7b2fff,#00d4ff);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }

        .vv-subtitle{
          margin:13px 0 0;
          color:#627390;
          font-size:11px;
          letter-spacing:1.5px;
          line-height:1.7;
        }

        .vv-lobby-card{
          background:rgba(9,14,28,.84);
          border:1px solid rgba(90,140,255,.14);
          border-radius:20px;
          box-shadow:0 18px 55px rgba(0,0,0,.30);
          backdrop-filter:blur(12px);
          overflow:hidden;
        }

        .vv-room-strip{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          padding:18px 22px;
          border-bottom:1px solid rgba(90,140,255,.10);
          background:linear-gradient(
            90deg,
            rgba(0,212,255,.045),
            rgba(123,47,255,.05)
          );
        }

        .vv-room-label{
          color:#637394;
          font-size:8px;
          letter-spacing:3px;
          margin-bottom:7px;
        }

        .vv-room-code{
          color:#00d9ff;
          font-size:24px;
          font-weight:900;
          letter-spacing:6px;
          text-shadow:0 0 18px rgba(0,217,255,.18);
        }

        .vv-room-status{
          padding:7px 11px;
          border-radius:999px;
          border:1px solid rgba(123,47,255,.25);
          background:rgba(123,47,255,.06);
          color:#8e78ff;
          font-size:8px;
          font-weight:900;
          letter-spacing:1.7px;
        }

        .vv-briefing{
          margin:0 24px 24px;
          padding:20px;
          border-radius:16px;
          background:linear-gradient(135deg,rgba(0,217,255,.055),rgba(123,47,255,.055));
          border:1px solid rgba(0,217,255,.16);
          box-shadow:inset 0 0 35px rgba(0,217,255,.018);
        }

        .vv-briefing-label{
          color:#00d9ff;
          font-size:8px;
          letter-spacing:3px;
          margin-bottom:9px;
        }

        .vv-topic{
          margin:0;
          color:#f3f7ff;
          font-size:clamp(18px,3vw,26px);
          line-height:1.35;
          letter-spacing:1px;
        }

        .vv-topic-sub{
          margin-top:8px;
          color:#697a97;
          font-size:9px;
          letter-spacing:1.2px;
        }

        .vv-side-row{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          margin-top:16px;
        }

        .vv-side-card{
          padding:14px 15px;
          border-radius:12px;
          background:rgba(3,8,20,.62);
          border:1px solid rgba(255,255,255,.08);
        }

        .vv-side-name{
          color:#7f8eaa;
          font-size:8px;
          letter-spacing:1.4px;
          margin-bottom:7px;
        }

        .vv-side-value{
          font-size:15px;
          font-weight:900;
          letter-spacing:2px;
        }

        .vv-side-value.for{
          color:#00ffaa;
        }

        .vv-side-value.against{
          color:#ff7081;
        }

        .vv-match-area{
          padding:24px;
        }

        .vv-match-grid{
          display:grid;
          grid-template-columns:minmax(0,1fr) 80px minmax(0,1fr);
          gap:18px;
          align-items:center;
        }

        .vv-player-card{
          min-height:250px;
          padding:25px 18px;
          border-radius:18px;
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          text-align:center;
          position:relative;
          overflow:hidden;
        }

        .vv-player-card.you{
          background:
            linear-gradient(
              145deg,
              rgba(0,48,72,.72),
              rgba(4,15,29,.95)
            );
          border:1px solid rgba(0,217,255,.25);
          box-shadow:inset 0 0 40px rgba(0,217,255,.025);
        }

        .vv-player-card.opponent{
          background:
            linear-gradient(
              145deg,
              rgba(37,16,72,.62),
              rgba(10,7,25,.95)
            );
          border:1px solid rgba(123,47,255,.23);
          box-shadow:inset 0 0 40px rgba(123,47,255,.025);
        }

        .vv-player-card.connected{
          border-color:rgba(0,255,170,.30);
          box-shadow:
            inset 0 0 40px rgba(0,255,170,.025),
            0 0 30px rgba(0,255,170,.035);
        }

        .vv-player-label{
          color:#00d9ff;
          font-size:8px;
          letter-spacing:3px;
          margin-bottom:16px;
        }

        .vv-player-card.opponent .vv-player-label{
          color:#8e78ff;
        }

        .vv-avatar{
          width:78px;
          height:78px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:31px;
          margin-bottom:17px;
        }

        .vv-avatar.you{
          background:rgba(0,217,255,.07);
          border:1px solid rgba(0,217,255,.30);
          box-shadow:0 0 24px rgba(0,217,255,.06);
        }

        .vv-avatar.opponent{
          background:rgba(123,47,255,.08);
          border:1px solid rgba(123,47,255,.30);
          box-shadow:0 0 24px rgba(123,47,255,.05);
        }

        .vv-player-name{
          max-width:90%;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:#eef4ff;
          font-size:16px;
          font-weight:900;
          letter-spacing:1px;
        }

        .vv-connected{
          margin-top:8px;
          color:#00ffaa;
          font-size:8px;
          letter-spacing:2px;
        }

        .vv-searching{
          margin-top:4px;
          color:#596681;
          font-size:8px;
          letter-spacing:2px;
        }

        .vv-vs{
          width:58px;
          height:58px;
          margin:0 auto;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(123,47,255,.42);
          background:rgba(90,55,175,.11);
          color:#8f79ff;
          font-size:11px;
          font-weight:900;
          letter-spacing:2px;
          box-shadow:0 0 22px rgba(123,47,255,.06);
        }

        .vv-action{
          padding:20px;
          border-top:1px solid rgba(90,140,255,.10);
          text-align:center;
        }

        .vv-ready-box{
          padding:19px;
          border-radius:14px;
          background:rgba(0,255,170,.045);
          border:1px solid rgba(0,255,170,.18);
        }

        .vv-ready-title{
          color:#00ffaa;
          font-size:10px;
          letter-spacing:2px;
          margin-bottom:15px;
        }

        .vv-start{
          width:min(360px,100%);
          padding:14px 20px;
          border:0;
          border-radius:10px;
          background:linear-gradient(135deg,#00d9ff,#715cff);
          color:white;
          cursor:pointer;
          font-family:'Courier New',monospace;
          font-weight:900;
          font-size:11px;
          letter-spacing:2px;
          box-shadow:0 0 25px rgba(0,217,255,.20);
          transition:.2s ease;
        }

        .vv-start:hover:not(:disabled){
          transform:translateY(-2px);
          box-shadow:0 0 32px rgba(0,217,255,.28);
        }

        .vv-start:disabled{
          cursor:not-allowed;
          opacity:.65;
        }

        .vv-wait{
          padding:13px 16px;
          border-radius:10px;
          background:rgba(255,180,0,.045);
          border:1px solid rgba(255,180,0,.14);
          color:#d5ab50;
          font-size:9px;
          letter-spacing:2px;
        }

        .vv-back{
          margin-top:16px;
          border:0;
          background:transparent;
          color:#62708c;
          cursor:pointer;
          font-family:'Courier New',monospace;
          font-size:9px;
          letter-spacing:1px;
          transition:.2s ease;
        }

        .vv-back:hover{
          color:#a6b6d0;
        }

        .vv-footnote{
          margin-top:17px;
          text-align:center;
          color:#4f5e79;
          font-size:8px;
          letter-spacing:1.3px;
        }

        @media(max-width:760px){
          .vv-page{
            padding:0 16px 42px;
          }

          .vv-topbar{
            height:66px;
          }

          .vv-user{
            display:none;
          }

          .vv-main{
            padding-top:34px;
          }

          .vv-room-strip{
            align-items:flex-start;
            flex-direction:column;
          }

          .vv-match-grid{
            grid-template-columns:1fr;
            gap:12px;
          }

          .vv-side-row{
            grid-template-columns:1fr;
          }

          .vv-player-card{
            min-height:205px;
          }

          .vv-vs{
            width:46px;
            height:46px;
          }

          .vv-player-card:nth-child(3){
            grid-row:4;
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
            OPERATIVE:{" "}
            <span>
              {playerName.toUpperCase()}
            </span>
          </div>
        )}
      </header>

      <main className="vv-main">
        <section className="vv-heading">
          <div className="vv-kicker">
            [ MATCH LOBBY • CONNECTION SYNC ]
          </div>

          <h1 className="vv-title">
            WAITING ROOM
          </h1>

          <p className="vv-subtitle">
            The debate arena is ready.
            <br />
            Waiting for both players to connect before launch.
          </p>
        </section>

        <section className="vv-lobby-card">
          <div className="vv-room-strip">
            <div>
              <div className="vv-room-label">
                ROOM CODE
              </div>

              <div className="vv-room-code">
                {roomId}
              </div>
            </div>

            <div className="vv-room-status">
              {opponentJoined
                ? "MATCH READY"
                : "SEARCHING"}
            </div>
          </div>

          <section className="vv-briefing">
            <div className="vv-briefing-label">[ DEBATE BRIEFING ]</div>
            <h2 className="vv-topic">
              {debateTopic}
            </h2>
            <div className="vv-topic-sub">
              FINAL TOPIC SELECTED BY AI FROM BOTH PLAYERS' PREFERENCES
            </div>

            <div className="vv-side-row">
              <div className="vv-side-card">
                <div className="vv-side-name">{playerName.toUpperCase()} • YOUR POSITION</div>
                <div className={`vv-side-value ${mySide.toLowerCase()}`}>
                  {mySide}
                </div>
              </div>

              <div className="vv-side-card">
                <div className="vv-side-name">{(opponent?.name || "OPPONENT").toUpperCase()} • POSITION</div>
                <div className={`vv-side-value ${opponentSide.toLowerCase()}`}>
                  {opponentSide}
                </div>
              </div>
            </div>
          </section>

          <div className="vv-match-area">
            <div className="vv-match-grid">
              <div className="vv-player-card you">
                <div className="vv-player-label">
                  YOU
                </div>

                <div className="vv-avatar you">
                  👤
                </div>

                <div className="vv-player-name">
                  {playerName}
                </div>

                <div className={`vv-side-value ${mySide.toLowerCase()}`} style={{ marginTop: 10, fontSize: 12 }}>
                  {mySide}
                </div>

                <div className="vv-connected">
                  ● CONNECTED
                </div>
              </div>

              <div className="vv-vs">
                VS
              </div>

              <div
                className={`vv-player-card opponent ${
                  opponentJoined ? "connected" : ""
                }`}
              >
                <div className="vv-player-label">
                  OPPONENT
                </div>

                <div className="vv-avatar opponent">
                  {opponentJoined
                    ? "👤"
                    : "⌛"}
                </div>

                {opponentJoined ? (
                  <>
                    <div className="vv-player-name">
                      {opponent?.name ||
                        "Opponent"}
                    </div>

                    <div className={`vv-side-value ${opponentSide.toLowerCase()}`} style={{ marginTop: 10, fontSize: 12 }}>
                      {opponentSide}
                    </div>

                    <div className="vv-connected">
                      ● CONNECTED
                    </div>
                  </>
                ) : (
                  <>
                    <div className="vv-player-name">
                      Waiting...
                    </div>

                    <div className="vv-searching">
                      SEARCHING
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="vv-footnote">
              ROOM STATUS IS UPDATED AUTOMATICALLY
            </div>
          </div>

          <div className="vv-action">
            {opponentJoined ? (
              <div className="vv-ready-box">
                <div className="vv-ready-title">
                  ✓ OPPONENT CONNECTED
                </div>

                <button
                  onClick={startDebate}
                  disabled={starting}
                  className="vv-start"
                  type="button"
                >
                  {starting
                    ? "STARTING..."
                    : "▶ START DEBATE"}
                </button>
              </div>
            ) : (
              <div className="vv-wait">
                ● WAITING FOR OPPONENT...
              </div>
            )}

            <button
              onClick={onBack}
              className="vv-back"
              type="button"
            >
              ← LEAVE ROOM
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
