import React from "react";

export default function MultiplayerResult({
  result,
  playerName,
  onContinue,
}) {
  if (!result) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020510",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading result...
      </div>
    );
  }

  const score = result.result || {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020510",
        color: "white",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <div style={{ fontSize: "55px" }}>
            {result.is_winner ? "🏆" : "🎤"}
          </div>

          <h1>
            {result.is_winner
              ? "YOU WON!"
              : "DEBATE COMPLETE"}
          </h1>

          <p
            style={{
              color: "#aaa",
              fontSize: "18px",
            }}
          >
            {playerName}
          </p>
        </div>

        {/* OVERALL SCORE */}

        <div
          style={{
            background: "#111827",
            borderRadius: "16px",
            padding: "30px",
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              color: "#00d4ff",
              fontSize: "14px",
            }}
          >
            YOUR OVERALL SCORE
          </div>

          <div
            style={{
              fontSize: "60px",
              fontWeight: "bold",
              marginTop: "10px",
            }}
          >
            {score.overall || 0}
            <span
              style={{
                fontSize: "24px",
                color: "#888",
              }}
            >
              /10
            </span>
          </div>
        </div>

        {/* SCORE BREAKDOWN */}

        <div
          style={{
            background: "#111827",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "25px",
          }}
        >
          <h2>📊 Your Performance</h2>

          <ScoreRow
            label="Argument Quality"
            value={score.argument_quality}
          />

          <ScoreRow
            label="Evidence Use"
            value={score.evidence_use}
          />

          <ScoreRow
            label="Rebuttal Strength"
            value={score.rebuttal_strength}
          />

          <ScoreRow
            label="Clarity"
            value={score.clarity}
          />

          <ScoreRow
            label="Logical Reasoning"
            value={score.logical_reasoning}
          />
        </div>

        {/* STRENGTHS */}

        <div
          style={{
            background: "#111827",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "25px",
          }}
        >
          <h2>💪 Your Strengths</h2>

          {score.strengths?.length ? (
            <ul>
              {score.strengths.map(
                (item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                )
              )}
            </ul>
          ) : (
            <p>No strengths recorded.</p>
          )}
        </div>

        {/* WEAKNESSES */}

        <div
          style={{
            background: "#111827",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "25px",
          }}
        >
          <h2>📈 Areas to Improve</h2>

          {score.weaknesses?.length ? (
            <ul>
              {score.weaknesses.map(
                (item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                )
              )}
            </ul>
          ) : (
            <p>No weaknesses recorded.</p>
          )}
        </div>

        {/* WINNER MESSAGE */}

        <div
          style={{
            background: "#111827",
            borderRadius: "16px",
            padding: "25px",
            textAlign: "center",
          }}
        >
          {result.is_winner ? (
            <>
              <h2>🏆 Congratulations!</h2>

              <p>
                {result.winner_reason ||
                  "You performed strongly throughout the debate."}
              </p>
            </>
          ) : (
            <>
              <h2>Keep Improving! 💪</h2>

              <p>
                The debate is complete. Review
                your feedback and use it to
                improve your next performance.
              </p>
            </>
          )}
        </div>

        {/* BUTTON */}

        <div
          style={{
            textAlign: "center",
            marginTop: "30px",
          }}
        >
          <button
            onClick={onContinue}
            style={{
              padding: "14px 30px",
              fontSize: "16px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom:
          "1px solid #273244",
      }}
    >
      <span>{label}</span>

      <strong>
        {value || 0}/10
      </strong>
    </div>
  );
}