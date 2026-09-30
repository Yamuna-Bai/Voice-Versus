import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

export default function MultiplayerResult({
  result,
  playerName,
  onRematch,
  onHome,
}) {
  if (!result) {
    return (
      <div className="mv-page mv-loading-page">
        <style>{`
          .mv-page{
            min-height:100vh;
            width:100%;
            box-sizing:border-box;
            background:
              radial-gradient(circle at 50% -15%,rgba(0,212,255,.13),transparent 35%),
              radial-gradient(circle at 85% 20%,rgba(123,47,255,.11),transparent 28%),
              #020510;
            color:#eef4ff;
            font-family:'Courier New',monospace;
          }
          .mv-loading-page{
            display:flex;
            align-items:center;
            justify-content:center;
            padding:24px;
          }
          .mv-loading-card{
            width:min(440px,100%);
            padding:38px 28px;
            border-radius:20px;
            text-align:center;
            background:rgba(9,14,28,.88);
            border:1px solid rgba(0,217,255,.16);
            box-shadow:0 24px 70px rgba(0,0,0,.34);
          }
          .mv-spinner{
            width:54px;
            height:54px;
            margin:0 auto 18px;
            border-radius:50%;
            border:2px solid rgba(255,255,255,.08);
            border-top-color:#00d9ff;
            border-right-color:#7b2fff;
            animation:mvSpin 1s linear infinite;
          }
          .mv-loading-kicker{
            color:#00d9ff;
            font-size:9px;
            letter-spacing:3px;
            margin-bottom:10px;
          }
          .mv-loading-title{
            margin:0;
            font-size:18px;
            letter-spacing:2px;
          }
          .mv-loading-copy{
            margin:10px 0 0;
            color:#667695;
            font-size:10px;
            letter-spacing:1px;
          }
          @keyframes mvSpin{to{transform:rotate(360deg)}}
        `}</style>
        <div className="mv-loading-card">
          <div className="mv-spinner" />
          <div className="mv-loading-kicker">[ AI DEBRIEF ]</div>
          <h1 className="mv-loading-title">LOADING RESULT...</h1>
          <p className="mv-loading-copy">
            COMPILING YOUR DEBATE PERFORMANCE
          </p>
        </div>
      </div>
    );
  }

  const score = result.result || {};

  const overallScore = Number(
    score.overall ?? score.score
  ) || 0;

  const performanceData = [
    { skill: "Argument", score: Number(score.argument_quality) || 0 },
    { skill: "Evidence", score: Number(score.evidence_use) || 0 },
    { skill: "Rebuttal", score: Number(score.rebuttal_strength) || 0 },
    { skill: "Relevance", score: Number(score.relevance) || 0 },
    {
      skill: "Logic",
      score: Number(
        score.logical_reasoning ?? score.logic
      ) || 0,
    },
    { skill: "Clarity", score: Number(score.clarity) || 0 },
  ];

  const barData = performanceData.map((item) => ({
    name: item.skill,
    score: item.score,
  }));

  const fallacyData = score.fallacies || {
    count: 0,
    fallacies: [],
  };

  const fallacies = Array.isArray(fallacyData.fallacies)
    ? fallacyData.fallacies
    : [];

  // Preserved from the existing component: these values are
  // derived from the six skill scores for the progression charts.
  const progressData = performanceData.map((item, index) => ({
    round: `R${index + 1}`,
    score: item.score,
  }));

  const averageSkill =
    performanceData.length
      ? (
          performanceData.reduce(
            (sum, item) => sum + item.score,
            0
          ) / performanceData.length
        ).toFixed(1)
      : "0.0";

  const strengths = Array.isArray(score.strengths)
    ? score.strengths
    : [];

  const weaknesses = Array.isArray(score.weaknesses)
    ? score.weaknesses
    : Array.isArray(score.improvements)
      ? score.improvements
      : [];

  const supportingEvidence = Array.isArray(
    score.supporting_evidence
  )
    ? score.supporting_evidence
    : [];

  const counterarguments = Array.isArray(
    score.counterarguments
  )
    ? score.counterarguments
    : [];

  const weakPoints = Array.isArray(score.weak_points)
    ? score.weak_points
    : [];

  const improvements = Array.isArray(
    score.improvements
  )
    ? score.improvements
    : [];

  const messages = Array.isArray(result.messages)
    ? result.messages
    : [];

  const grade =
    overallScore >= 8
      ? { label: "EXCELLENT", color: "#00ff88" }
      : overallScore >= 6
        ? { label: "STRONG", color: "#00d9ff" }
        : overallScore >= 4
          ? { label: "DEVELOPING", color: "#ffc107" }
          : { label: "KEEP PRACTICING", color: "#ff6b7a" };

  return (
    <div className="mv-page">
      <style>{`
        .mv-page{
          min-height:100vh;
          width:100%;
          box-sizing:border-box;
          padding:0 28px 60px;
          background:
            radial-gradient(circle at 50% -18%,rgba(0,212,255,.14),transparent 34%),
            radial-gradient(circle at 90% 15%,rgba(123,47,255,.12),transparent 28%),
            linear-gradient(180deg,#020510 0%,#030815 52%,#020510 100%);
          color:#eef4ff;
          font-family:'Courier New',monospace;
          position:relative;
          overflow-x:hidden;
        }

        .mv-grid{
          position:fixed;
          inset:0;
          pointer-events:none;
          opacity:.32;
          background-image:
            linear-gradient(rgba(0,212,255,.032) 1px,transparent 1px),
            linear-gradient(90deg,rgba(0,212,255,.032) 1px,transparent 1px);
          background-size:60px 60px;
        }

        .mv-topbar{
          height:72px;
          max-width:1160px;
          margin:0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          border-bottom:1px solid rgba(90,140,255,.14);
          position:relative;
          z-index:2;
        }

        .mv-brand{
          display:flex;
          align-items:center;
          gap:11px;
        }

        .mv-logo{
          width:40px;
          height:40px;
          border-radius:11px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:linear-gradient(135deg,#00d9ff,#715cff);
          box-shadow:0 0 24px rgba(0,217,255,.24);
          font-size:19px;
        }

        .mv-brand-name{
          font-size:16px;
          font-weight:900;
          letter-spacing:3px;
        }

        .mv-brand-name span{
          color:#00d9ff;
        }

        .mv-brand-sub{
          margin-top:3px;
          color:#667695;
          font-size:8px;
          letter-spacing:2px;
        }

        .mv-user{
          padding:8px 14px;
          border-radius:999px;
          background:rgba(5,10,24,.72);
          border:1px solid rgba(0,217,255,.18);
          color:#7586a7;
          font-size:9px;
          letter-spacing:1.4px;
        }

        .mv-user span{
          color:#dce8ff;
        }

        .mv-main{
          max-width:1160px;
          margin:0 auto;
          padding-top:42px;
          position:relative;
          z-index:1;
        }

        .mv-hero{
          display:grid;
          grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);
          gap:22px;
          align-items:stretch;
          margin-bottom:20px;
        }

        .mv-hero-card{
          padding:28px;
          border-radius:22px;
          background:rgba(9,14,28,.86);
          border:1px solid rgba(90,140,255,.14);
          box-shadow:0 24px 70px rgba(0,0,0,.30);
          backdrop-filter:blur(14px);
        }

        .mv-kicker{
          color:#00d9ff;
          font-size:10px;
          letter-spacing:4px;
          margin-bottom:12px;
        }

        .mv-title{
          margin:0;
          font-size:clamp(34px,5vw,56px);
          font-weight:900;
          letter-spacing:4px;
          line-height:1.05;
          background:linear-gradient(90deg,#00d4ff,#7b2fff,#00d4ff);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }

        .mv-subtitle{
          margin:14px 0 0;
          color:#71819d;
          font-size:11px;
          line-height:1.8;
          letter-spacing:1.3px;
        }

        .mv-player-chip{
          display:inline-flex;
          align-items:center;
          gap:7px;
          margin-top:18px;
          padding:8px 12px;
          border-radius:999px;
          border:1px solid rgba(0,217,255,.18);
          background:rgba(0,217,255,.045);
          color:#a5b6d1;
          font-size:9px;
          letter-spacing:1.5px;
        }

        .mv-player-chip span{
          color:#eef4ff;
          font-weight:900;
        }

        .mv-result-status{
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          text-align:center;
          min-height:100%;
        }

        .mv-status-icon{
          font-size:45px;
          margin-bottom:12px;
          filter:drop-shadow(0 0 16px rgba(0,217,255,.13));
        }

        .mv-status-label{
          font-size:9px;
          color:#6b7c98;
          letter-spacing:3px;
        }

        .mv-status-title{
          margin:8px 0 0;
          font-size:24px;
          letter-spacing:2px;
          color:#eff5ff;
        }

        .mv-status-text{
          margin:10px 0 0;
          max-width:320px;
          color:#71819d;
          font-size:10px;
          line-height:1.7;
        }

        .mv-score-grid{
          display:grid;
          grid-template-columns:minmax(280px,.74fr) minmax(0,1.26fr);
          gap:18px;
          margin-bottom:18px;
        }

        .mv-score-card,
        .mv-chart-card,
        .mv-section-card{
          background:rgba(9,14,28,.84);
          border:1px solid rgba(90,140,255,.14);
          border-radius:20px;
          box-shadow:0 18px 55px rgba(0,0,0,.26);
          backdrop-filter:blur(12px);
        }

        .mv-score-card{
          padding:24px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
        }

        .mv-score-ring{
          width:220px;
          height:220px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          position:relative;
          background:
            conic-gradient(
              from -90deg,
              #00d9ff 0%,
              #7b2fff ${Math.max(0,Math.min(100,overallScore * 10)) / 2}%,
              rgba(255,255,255,.07) ${Math.max(0,Math.min(100,overallScore * 10))}%,
              rgba(255,255,255,.07) 100%
            );
          box-shadow:0 0 42px rgba(0,217,255,.09);
        }

        .mv-score-ring::after{
          content:"";
          position:absolute;
          inset:10px;
          border-radius:50%;
          background:#070d1a;
          border:1px solid rgba(255,255,255,.07);
        }

        .mv-score-center{
          position:relative;
          z-index:1;
          display:flex;
          flex-direction:column;
          align-items:center;
        }

        .mv-score-number{
          font-size:60px;
          font-weight:900;
          line-height:1;
          color:#f1f7ff;
        }

        .mv-score-max{
          color:#627491;
          font-size:11px;
          letter-spacing:2px;
          margin-top:5px;
        }

        .mv-grade{
          margin-top:18px;
          padding:7px 15px;
          border-radius:999px;
          background:rgba(0,217,255,.05);
          border:1px solid rgba(0,217,255,.18);
          font-size:9px;
          font-weight:900;
          letter-spacing:2px;
        }

        .mv-average{
          margin-top:12px;
          color:#60728f;
          font-size:9px;
          letter-spacing:1.8px;
        }

        .mv-chart-card{
          padding:22px;
        }

        .mv-section-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          margin-bottom:13px;
        }

        .mv-section-label{
          color:#00d9ff;
          font-size:10px;
          letter-spacing:2.2px;
          text-transform:uppercase;
        }

        .mv-section-note{
          color:#50627e;
          font-size:8px;
          letter-spacing:1.2px;
        }

        .mv-two-charts{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:18px;
          margin-bottom:18px;
        }

        .mv-chart-wrap{
          width:100%;
          height:300px;
        }

        .mv-metric-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
          margin-top:12px;
        }

        .mv-metric{
          padding:13px;
          border-radius:12px;
          background:rgba(255,255,255,.025);
          border:1px solid rgba(255,255,255,.07);
        }

        .mv-metric-label{
          color:#627491;
          font-size:8px;
          letter-spacing:1.3px;
          text-transform:uppercase;
        }

        .mv-metric-value{
          margin-top:7px;
          color:#eef4ff;
          font-size:18px;
          font-weight:900;
        }

        .mv-columns{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:18px;
          margin-bottom:18px;
        }

        .mv-section-card{
          padding:22px;
        }

        .mv-list{
          display:flex;
          flex-direction:column;
          gap:10px;
          margin-top:14px;
        }

        .mv-list-item{
          display:grid;
          grid-template-columns:28px 1fr;
          gap:10px;
          align-items:start;
          padding:12px 13px;
          border-radius:12px;
          background:rgba(255,255,255,.023);
          border:1px solid rgba(255,255,255,.065);
        }

        .mv-list-index{
          width:24px;
          height:24px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:9px;
          font-weight:900;
          background:rgba(0,217,255,.08);
          color:#00d9ff;
        }

        .mv-list-text{
          color:#bac8dc;
          font-size:11px;
          line-height:1.65;
        }

        .mv-accent-green .mv-list-index{
          background:rgba(0,255,170,.08);
          color:#00ffaa;
        }

        .mv-accent-gold .mv-list-index{
          background:rgba(255,193,7,.08);
          color:#ffc107;
        }

        .mv-accent-red .mv-list-index{
          background:rgba(255,88,108,.08);
          color:#ff7081;
        }

        .mv-empty{
          padding:14px;
          border-radius:11px;
          background:rgba(255,255,255,.02);
          border:1px solid rgba(255,255,255,.06);
          color:#667796;
          font-size:10px;
          line-height:1.7;
          margin-top:14px;
        }

        .mv-coach{
          background:
            linear-gradient(135deg,rgba(123,47,255,.11),rgba(0,217,255,.055));
          border:1px solid rgba(123,47,255,.20);
        }

        .mv-coach-main{
          padding:17px;
          border-radius:13px;
          background:rgba(123,47,255,.06);
          border:1px solid rgba(123,47,255,.15);
          margin-top:14px;
        }

        .mv-coach-title{
          color:#b7b4ff;
          font-size:9px;
          letter-spacing:1.7px;
          text-transform:uppercase;
          margin-bottom:8px;
        }

        .mv-coach-copy{
          color:#ccd7e8;
          font-size:12px;
          line-height:1.7;
          margin:0;
        }

        .mv-argument{
          margin-top:12px;
          padding:15px;
          border-radius:13px;
          background:#07101d;
          border:1px solid rgba(255,255,255,.06);
        }

        .mv-argument-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:10px;
        }

        .mv-argument-name{
          color:#eef4ff;
          font-size:11px;
          font-weight:900;
        }

        .mv-argument-tag{
          color:#50627e;
          font-size:8px;
          letter-spacing:1.2px;
        }

        .mv-argument-text{
          color:#aebdd3;
          font-size:11px;
          line-height:1.7;
          margin:0;
        }

        .mv-fallacy{
          margin-top:12px;
          padding:15px;
          border-radius:13px;
          background:rgba(255,75,92,.045);
          border:1px solid rgba(255,75,92,.16);
        }

        .mv-fallacy-name{
          color:#ff8290;
          font-size:11px;
          font-weight:900;
          letter-spacing:1px;
          margin-bottom:7px;
        }

        .mv-fallacy p{
          color:#b9c6d9;
          font-size:10px;
          line-height:1.6;
          margin:5px 0;
        }

        .mv-winner-card{
          padding:24px;
          margin-bottom:18px;
          text-align:center;
          border-radius:20px;
          background:
            linear-gradient(135deg,rgba(0,217,255,.08),rgba(123,47,255,.07));
          border:1px solid rgba(0,217,255,.16);
          box-shadow:0 18px 55px rgba(0,0,0,.25);
        }

        .mv-winner-kicker{
          color:#00ffaa;
          font-size:9px;
          letter-spacing:2.5px;
          margin-bottom:9px;
        }

        .mv-winner-title{
          margin:0;
          font-size:22px;
          letter-spacing:2px;
        }

        .mv-winner-reason{
          max-width:720px;
          margin:11px auto 0;
          color:#7e90ac;
          font-size:10px;
          line-height:1.7;
        }

        .mv-action{
          display:flex;
          justify-content:center;
          align-items:center;
          gap:14px;
          padding-top:6px;
        }

        .mv-home,
        .mv-rematch{
          min-width:220px;
          padding:14px 24px;
          border-radius:11px;
          font-family:'Courier New',monospace;
          font-size:10px;
          font-weight:900;
          letter-spacing:2px;
          cursor:pointer;
          transition:.2s ease;
        }

        .mv-home{
          border:1px solid rgba(0,217,255,.22);
          background:rgba(0,217,255,.055);
          color:#00d9ff;
        }

        .mv-home:hover{
          transform:translateY(-3px);
          background:rgba(0,217,255,.10);
          border-color:rgba(0,217,255,.40);
          box-shadow:0 0 28px rgba(0,217,255,.10);
        }

        .mv-rematch{
          border:1px solid rgba(255,255,255,.12);
          background:linear-gradient(135deg,#00d9ff,#715cff);
          color:#fff;
          box-shadow:0 0 30px rgba(0,217,255,.16);
        }

        .mv-rematch:hover{
          transform:translateY(-3px);
          box-shadow:0 0 40px rgba(0,217,255,.26);
        }

        @media(max-width:900px){
          .mv-hero,
          .mv-score-grid,
          .mv-columns,
          .mv-two-charts{
            grid-template-columns:1fr;
          }

          .mv-metric-grid{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media(max-width:640px){
          .mv-page{padding:0 15px 42px}
          .mv-topbar{height:66px}
          .mv-user{display:none}
          .mv-main{padding-top:30px}
          .mv-hero-card,.mv-section-card,.mv-chart-card,.mv-score-card{padding:18px}
          .mv-score-ring{width:190px;height:190px}
          .mv-score-number{font-size:52px}
          .mv-metric-grid{grid-template-columns:1fr}
          .mv-chart-wrap{height:260px}
          .mv-home,.mv-rematch{width:100%;min-width:0}
          .mv-action{flex-direction:column-reverse}
        }
      `}</style>

      <div className="mv-grid" />

      <header className="mv-topbar">
        <div className="mv-brand">
          <div className="mv-logo">🎙</div>
          <div>
            <div className="mv-brand-name">
              VOICE <span>VERSUS</span>
            </div>
            <div className="mv-brand-sub">
              AI DEBATE ARENA
            </div>
          </div>
        </div>

        {playerName && (
          <div className="mv-user">
            OPERATIVE:{" "}
            <span>{playerName.toUpperCase()}</span>
          </div>
        )}
      </header>

      <main className="mv-main">
        {/* HERO */}
        <section className="mv-hero">
          <div className="mv-hero-card">
            <div className="mv-kicker">
              [ AI JUDGED DEBRIEF ]
            </div>

            <h1 className="mv-title">
              DEBATE COMPLETE
            </h1>

            <p className="mv-subtitle">
              Your match has been analyzed across argument quality,
              evidence, rebuttal, relevance, logic, clarity and
              detected fallacies.
            </p>

            <div className="mv-player-chip">
              PLAYER <span>{playerName}</span>
            </div>
          </div>

          <div className="mv-hero-card mv-result-status">
            <div className="mv-status-icon">
              {result.is_winner ? "🏆" : "🎤"}
            </div>

            <div className="mv-status-label">
              MATCH STATUS
            </div>

            <h2 className="mv-status-title">
              {result.is_winner
                ? "YOU WON"
                : "DEBATE FINISHED"}
            </h2>

            <p className="mv-status-text">
              {result.winner_reason ||
                "Review the analysis below to understand your performance."}
            </p>
          </div>
        </section>

        {/* SCORE */}
        <section className="mv-score-grid">
          <div className="mv-score-card">
            <div className="mv-score-ring">
              <div className="mv-score-center">
                <div className="mv-score-number">
                  {overallScore}
                </div>
                <div className="mv-score-max">
                  OVERALL / 10
                </div>
              </div>
            </div>

            <div
              className="mv-grade"
              style={{
                color: grade.color,
                borderColor: `${grade.color}45`,
                background: `${grade.color}0d`,
              }}
            >
              {grade.label}
            </div>

            <div className="mv-average">
              SKILL AVERAGE: {averageSkill}/10
            </div>
          </div>

          <div className="mv-chart-card">
            <div className="mv-section-head">
              <div className="mv-section-label">
                Performance Overview
              </div>
              <div className="mv-section-note">
                6 CORE SKILLS
              </div>
            </div>

            <div className="mv-chart-wrap">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <RadarChart
                  data={performanceData}
                >
                  <PolarGrid stroke="rgba(255,255,255,.08)" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{
                      fill: "#b9c8dc",
                      fontSize: 10,
                    }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 10]}
                    tick={{
                      fill: "#627491",
                      fontSize: 8,
                    }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#00d9ff"
                    fill="#00d9ff"
                    fillOpacity={0.22}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a1120",
                      border:
                        "1px solid rgba(0,217,255,.2)",
                      borderRadius: 8,
                      color: "#eef4ff",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* CHARTS */}
        <section className="mv-two-charts">
          <div className="mv-chart-card">
            <div className="mv-section-head">
              <div className="mv-section-label">
                Skill Breakdown
              </div>
              <div className="mv-section-note">
                SCORE / 10
              </div>
            </div>

            <div className="mv-chart-wrap">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={barData}>
                  <CartesianGrid
                    stroke="rgba(255,255,255,.07)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "#9fb0c7",
                      fontSize: 9,
                    }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{
                      fill: "#627491",
                      fontSize: 9,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a1120",
                      border:
                        "1px solid rgba(0,217,255,.2)",
                      borderRadius: 8,
                      color: "#eef4ff",
                    }}
                  />
                  <Bar
                    dataKey="score"
                    name="Score"
                    fill="#00d9ff"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mv-chart-card">
            <div className="mv-section-head">
              <div className="mv-section-label">
                Performance Trend
              </div>
              <div className="mv-section-note">
                DERIVED VIEW
              </div>
            </div>

            <div className="mv-chart-wrap">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={progressData}>
                  <CartesianGrid
                    stroke="rgba(255,255,255,.07)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="round"
                    tick={{
                      fill: "#9fb0c7",
                      fontSize: 9,
                    }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{
                      fill: "#627491",
                      fontSize: 9,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a1120",
                      border:
                        "1px solid rgba(123,47,255,.2)",
                      borderRadius: 8,
                      color: "#eef4ff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="#7b5cff"
                    fill="#7b5cff"
                    fillOpacity={0.16}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mv-metric-grid">
              <div className="mv-metric">
                <div className="mv-metric-label">
                  Argument
                </div>
                <div className="mv-metric-value">
                  {score.argument_quality || 0}/10
                </div>
              </div>

              <div className="mv-metric">
                <div className="mv-metric-label">
                  Rebuttal
                </div>
                <div className="mv-metric-value">
                  {score.rebuttal_strength || 0}/10
                </div>
              </div>

              <div className="mv-metric">
                <div className="mv-metric-label">
                  Logic
                </div>
                <div className="mv-metric-value">
                  {score.logical_reasoning ??
                    score.logic ??
                    0}
                  /10
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STRENGTHS + IMPROVEMENTS */}
        <section className="mv-columns">
          <div className="mv-section-card mv-accent-green">
            <div className="mv-section-label">
              Your Strengths
            </div>

            {strengths.length ? (
              <div className="mv-list">
                {strengths.map((item, index) => (
                  <div
                    className="mv-list-item"
                    key={index}
                  >
                    <div className="mv-list-index">
                      {index + 1}
                    </div>
                    <div className="mv-list-text">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mv-empty">
                No strengths were recorded by the judge.
              </div>
            )}
          </div>

          <div className="mv-section-card mv-accent-gold">
            <div className="mv-section-label">
              Areas To Improve
            </div>

            {(weaknesses.length
              ? weaknesses
              : improvements
            ).length ? (
              <div className="mv-list">
                {(weaknesses.length
                  ? weaknesses
                  : improvements
                ).map((item, index) => (
                  <div
                    className="mv-list-item"
                    key={index}
                  >
                    <div className="mv-list-index">
                      {index + 1}
                    </div>
                    <div className="mv-list-text">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mv-empty">
                No improvement points were recorded.
              </div>
            )}
          </div>
        </section>

        {/* EVIDENCE + COUNTERARGUMENTS */}
        <section className="mv-columns">
          <div className="mv-section-card">
            <div className="mv-section-label">
              Supporting Evidence
            </div>

            {supportingEvidence.length ? (
              <div className="mv-list">
                {supportingEvidence.map(
                  (item, index) => (
                    <div
                      className="mv-list-item"
                      key={index}
                    >
                      <div className="mv-list-index">
                        ✓
                      </div>
                      <div className="mv-list-text">
                        {item}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="mv-empty">
                No supporting evidence was recorded.
              </div>
            )}
          </div>

          <div className="mv-section-card">
            <div className="mv-section-label">
              Counterarguments
            </div>

            {counterarguments.length ? (
              <div className="mv-list">
                {counterarguments.map(
                  (item, index) => (
                    <div
                      className="mv-list-item"
                      key={index}
                    >
                      <div className="mv-list-index">
                        ↪
                      </div>
                      <div className="mv-list-text">
                        {item}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="mv-empty">
                No counterarguments were recorded.
              </div>
            )}
          </div>
        </section>

        {/* WEAK POINTS + COACH */}
        <section className="mv-columns">
          <div className="mv-section-card mv-accent-red">
            <div className="mv-section-label">
              Weak Points
            </div>

            {weakPoints.length ? (
              <div className="mv-list">
                {weakPoints.map((item, index) => (
                  <div
                    className="mv-list-item"
                    key={index}
                  >
                    <div className="mv-list-index">
                      !
                    </div>
                    <div className="mv-list-text">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mv-empty">
                No specific weak points were recorded.
              </div>
            )}
          </div>

          <div className="mv-section-card mv-coach">
            <div className="mv-section-label">
              AI Coach
            </div>

            <div className="mv-coach-main">
              <div className="mv-coach-title">
                Next Match Tip
              </div>

              <p className="mv-coach-copy">
                {score.coach_tip ||
                  "Keep practicing structured arguments and support your strongest claims with clear evidence."}
              </p>
            </div>

            <div className="mv-list">
              {improvements.length ? (
                improvements.slice(0, 3).map(
                  (item, index) => (
                    <div
                      className="mv-list-item"
                      key={index}
                    >
                      <div className="mv-list-index">
                        {index + 1}
                      </div>
                      <div className="mv-list-text">
                        {item}
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="mv-empty">
                  Keep working on evidence, rebuttal structure,
                  and precise wording.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ARGUMENT ANALYSIS */}
        <section className="mv-section-card" style={{ marginBottom: 18 }}>
          <div className="mv-section-head">
            <div className="mv-section-label">
              Argument Analysis
            </div>
            <div className="mv-section-note">
              {messages.length} RECORDED
            </div>
          </div>

          {messages.length ? (
            messages.map((message, index) => (
              <div
                className="mv-argument"
                key={index}
              >
                <div className="mv-argument-head">
                  <div className="mv-argument-name">
                    {message.player ||
                      message.name ||
                      "Participant"}
                  </div>
                  <div className="mv-argument-tag">
                    ARGUMENT {index + 1}
                  </div>
                </div>

                <p className="mv-argument-text">
                  {message.text ||
                    message.transcript ||
                    message.message ||
                    "No transcript available."}
                </p>
              </div>
            ))
          ) : (
            <div className="mv-empty">
              Argument-level analysis will appear here when
              message data is available.
            </div>
          )}
        </section>

        {/* FALLACIES */}
        <section className="mv-section-card" style={{ marginBottom: 18 }}>
          <div className="mv-section-head">
            <div
              className="mv-section-label"
              style={{
                color:
                  fallacies.length
                    ? "#ff7081"
                    : "#00ffaa",
              }}
            >
              Logical Fallacy Detection
            </div>

            <div
              style={{
                minWidth: 34,
                height: 34,
                padding: "0 9px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: fallacies.length
                  ? "rgba(255,75,92,.09)"
                  : "rgba(0,255,170,.08)",
                border: `1px solid ${
                  fallacies.length
                    ? "rgba(255,75,92,.22)"
                    : "rgba(0,255,170,.18)"
                }`,
                color: fallacies.length
                  ? "#ff7081"
                  : "#00ffaa",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              {fallacyData.count ||
                fallacies.length}
            </div>
          </div>

          {!fallacies.length ? (
            <div className="mv-empty">
              ✅ No major logical fallacies were detected
              in your recorded arguments.
            </div>
          ) : (
            fallacies.map(
              (fallacy, index) => (
                <div
                  className="mv-fallacy"
                  key={index}
                >
                  <div className="mv-fallacy-name">
                    ⚠{" "}
                    {fallacy.name ||
                      fallacy.type ||
                      "Logical Fallacy"}
                  </div>

                  {fallacy.description && (
                    <p>
                      <strong>
                        What happened:
                      </strong>{" "}
                      {fallacy.description}
                    </p>
                  )}

                  {fallacy.explanation && (
                    <p>
                      <strong>
                        Explanation:
                      </strong>{" "}
                      {fallacy.explanation}
                    </p>
                  )}

                  {fallacy.quote && (
                    <p>
                      <strong>
                        Your statement:
                      </strong>{" "}
                      "{fallacy.quote}"
                    </p>
                  )}

                  {fallacy.suggestion && (
                    <p>
                      <strong>
                        How to improve:
                      </strong>{" "}
                      {fallacy.suggestion}
                    </p>
                  )}
                </div>
              )
            )
          )}
        </section>

        {/* WINNER */}
        <section className="mv-winner-card">
          <div className="mv-winner-kicker">
            {result.is_winner
              ? "MATCH RESULT"
              : "MATCH REVIEW"}
          </div>

          <h2 className="mv-winner-title">
            {result.is_winner
              ? "🏆 CONGRATULATIONS"
              : "🎤 KEEP BUILDING"}
          </h2>

          <p className="mv-winner-reason">
            {result.winner_reason ||
              (result.is_winner
                ? "You performed strongly throughout the debate."
                : "Review your feedback and use it to sharpen your next debate.")}
          </p>
        </section>

        <div className="mv-action">
          <button
            className="mv-home"
            onClick={onHome}
            type="button"
          >
            ⌂ BACK TO HOME
          </button>

          <button
            className="mv-rematch"
            onClick={onRematch}
            type="button"
          >
            ⚔ REMATCH
          </button>
        </div>
      </main>
    </div>
  );
}

