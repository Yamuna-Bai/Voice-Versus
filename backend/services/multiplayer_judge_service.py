import asyncio


from backend.services.llm import (
    chat_text,
    coerce_json_object,
)

from backend.services.multiplayer_fallacy_service import (
    detect_multiplayer_fallacies,
)


async def judge_multiplayer_debate(
    topic: str,
    players: list[dict],
    messages: list[dict],
) -> dict:

    player_names = [
        player["name"]
        for player in players
    ]

    # --------------------------------------------------
    # BUILD FULL DEBATE TRANSCRIPT
    # --------------------------------------------------

    debate_text = []

    for message in messages:
        speaker = message.get("speaker", "")
        text = message.get("text", "")

        if speaker and text:
            debate_text.append(
                f"{speaker}: {text}"
            )

    transcript = "\n".join(debate_text)

    # --------------------------------------------------
    # MAIN AI JUDGE
    # --------------------------------------------------

    prompt = f"""
You are an impartial AI debate judge.

Topic:
{topic}

Players:
{", ".join(player_names)}

Debate transcript:
{transcript}

Evaluate BOTH players fairly based ONLY on what they actually said.

For EACH player evaluate:

1. Argument quality
2. Evidence and examples
3. Rebuttal strength
4. Relevance
5. Logic and reasoning
6. Clarity and persuasiveness
7. Supporting evidence used by the player
8. Counterarguments made against the opponent
9. Weak points in the player's arguments

IMPORTANT:
- Rebuttal strength means how effectively the player responded to the opponent's arguments.
- Do not reward a player simply for speaking more.
- Do not invent arguments.
- Do not favor the first speaker.
- Evaluate the quality of the actual arguments.

Return ONLY valid JSON in exactly this structure:
IMPORTANT OUTPUT RULES:
- Return ONLY the JSON object.
- Do NOT write any explanation before the JSON.
- Do NOT write any explanation after the JSON.
- Do NOT use Markdown code fences.
- Do NOT use ```json.
- The response must begin with {{ and end with }}.
- Use valid JSON with double quotes around all keys and string values.

{{
  "players": {{
    "PLAYER_NAME_1": {{
      "score": 8,
      "argument_quality": 8,
      "evidence_use": 7,
      "rebuttal_strength": 9,
      "relevance": 8,
      "logic": 8,
      "clarity": 8,

      "supporting_evidence": [
        "Used a relevant example to support the argument.",
        "Connected the claim with a practical situation."
      ],

      "counterarguments": [
        "Responded to the opponent's main point.",
        "Could have addressed the opposing argument more directly."
      ],

      "weak_points": [
        "Some claims were not supported with enough evidence.",
        "The argument could have been more specific."
      ],

      "strengths": [
        "...",
        "...",
        "..."
      ],

      "improvements": [
        "...",
        "...",
        "..."
      ],

      "feedback": "...",
      "coach_tip": "..."
    }},

    "PLAYER_NAME_2": {{
      "score": 8,
      "argument_quality": 8,
      "evidence_use": 7,
      "rebuttal_strength": 9,
      "relevance": 8,
      "logic": 8,
      "clarity": 8,

      "supporting_evidence": [
        "Used a relevant example to support the argument.",
        "Connected the claim with a practical situation."
      ],

      "counterarguments": [
        "Responded to the opponent's main point.",
        "Could have addressed the opposing argument more directly."
      ],

      "weak_points": [
        "Some claims were not supported with enough evidence.",
        "The argument could have been more specific."
      ],

      "strengths": [
        "...",
        "...",
        "..."
      ],

      "improvements": [
        "...",
        "...",
        "..."
      ],

      "feedback": "...",
      "coach_tip": "..."
    }}
  }},

  "winner": "PLAYER_NAME",
  "winner_reason": "..."
}}

Rules:

- Every score must be between 1 and 10.
- Give 2-3 strengths.
- Give 2-3 improvements.
- Give 2-3 supporting evidence points.
- Give 2-3 counterargument points.
- Give 2-3 weak points.
- Feedback must be short and useful.
- Coach tip must be one actionable sentence.
- Choose the winner based on overall debate quality.
- Do not use speaking time alone to determine the winner.
- Return JSON only.
""".strip()

    try:

        # --------------------------------------------------
        # CALL MAIN AI JUDGE
        # --------------------------------------------------

        raw = await asyncio.to_thread(
            chat_text,
            model="openai/gpt-oss-20b",
            system=None,
            user=prompt,
            temperature=0.2,
            max_tokens=1600,
        )

        print("====================================")
        print("🤖 RAW AI JUDGE RESPONSE:")
        print(raw)
        print("====================================")

        try:
            evaluation = coerce_json_object(raw)
        except Exception as e:
            print("====================================")
            print("❌ JSON PARSING FAILED")
            print("ERROR:", repr(e))
            print("RAW RESPONSE:", raw)
            print("====================================")

            return {
                "error": f"Could not parse JSON object: {e}"
            }

        # --------------------------------------------------
        # VALIDATE PLAYER RESULTS
        # --------------------------------------------------

        evaluated_players = evaluation.get(
            "players",
            {}
        )

        result = {}

        for name in player_names:

            player_result = evaluated_players.get(
                name,
                {}
            )

            # -----------------------------
            # MAIN SCORE
            # -----------------------------

            try:
                score = int(
                    round(
                        float(
                            player_result.get(
                                "score",
                                0
                            )
                        )
                    )
                )
            except Exception:
                score = 0

            score = max(
                1,
                min(10, score)
            )

            # -----------------------------
            # ANALYTICS SCORES
            # -----------------------------

            def safe_score(key, default=0):

                try:
                    value = int(
                        round(
                            float(
                                player_result.get(
                                    key,
                                    default
                                )
                            )
                        )
                    )

                    return max(
                        1,
                        min(10, value)
                    )

                except Exception:
                    return default

            argument_quality = safe_score(
                "argument_quality",
                score
            )

            evidence_use = safe_score(
                "evidence_use"
            )

            rebuttal_strength = safe_score(
                "rebuttal_strength"
            )

            relevance = safe_score(
                "relevance"
            )

            logic = safe_score(
                "logic"
            )

            clarity = safe_score(
                "clarity"
            )
            
            supporting_evidence = player_result.get(
                "supporting_evidence",
                []
            )

            counterarguments = player_result.get(
                "counterarguments",
                []
            )

            weak_points = player_result.get(
                "weak_points",
                []
            )

            if not isinstance(supporting_evidence, list):
                supporting_evidence = []

            if not isinstance(counterarguments, list):
                counterarguments = []

            if not isinstance(weak_points, list):
                weak_points = []

            # -----------------------------
            # STRENGTHS
            # -----------------------------

            strengths = player_result.get(
                "strengths",
                []
            )

            if not isinstance(
                strengths,
                list
            ):
                strengths = []

            # -----------------------------
            # IMPROVEMENTS
            # -----------------------------

            improvements = player_result.get(
                "improvements",
                []
            )

            if not isinstance(
                improvements,
                list
            ):
                improvements = []

            # -----------------------------
            # PLAYER RESULT
            # -----------------------------

            result[name] = {
                "score": score,

                "argument_quality":
                    argument_quality,

                "evidence_use":
                    evidence_use,

                "rebuttal_strength":
                    rebuttal_strength,

                "relevance":
                    relevance,

                "logic":
                    logic,

                "clarity":
                    clarity,

                "supporting_evidence":
                    supporting_evidence,

                "counterarguments":
                    counterarguments,

                "weak_points":
                    weak_points,

                "strengths":
                    strengths,

                "improvements":
                    improvements,

                "feedback": str(
                    player_result.get(
                        "feedback",
                        ""
                    )
                ).strip(),

                "coach_tip": str(
                    player_result.get(
                        "coach_tip",
                        ""
                    )
                ).strip(),

                "fallacies": {
                    "count": 0,
                    "fallacies": []
                },
            }

        # --------------------------------------------------
        # FALLACY DETECTION
        # --------------------------------------------------

        for name in player_names:

            player_arguments = []

            for message in messages:

                speaker = message.get(
                    "speaker",
                    ""
                )

                text = message.get(
                    "text",
                    ""
                )

                if (
                    speaker == name
                    and text
                ):
                    player_arguments.append(
                        text
                    )

            all_fallacies = []

            # Analyze each spoken argument
            for argument in player_arguments:

                try:

                    fallacy_data = (
                        await detect_multiplayer_fallacies(
                            argument=argument,
                            topic=topic
                        )
                    )

                    detected = fallacy_data.get(
                        "fallacies",
                        []
                    )

                    if isinstance(
                        detected,
                        list
                    ):
                        all_fallacies.extend(
                            detected
                        )

                except Exception as fallacy_error:

                    print(
                        "MULTIPLAYER FALLACY ERROR:",
                        fallacy_error
                    )

            result[name]["fallacies"] = {
                "count": len(all_fallacies),
                "fallacies": all_fallacies,
            }

        # --------------------------------------------------
        # DETERMINE WINNER
        # --------------------------------------------------

        winner = evaluation.get(
            "winner"
        )

        if winner not in player_names:

            winner = max(
                player_names,
                key=lambda name:
                    result[name]["score"]
            )

        # --------------------------------------------------
        # FINAL RESULT
        # --------------------------------------------------

        return {
            "players": result,

            "winner": winner,

            "winner_reason": str(
                evaluation.get(
                    "winner_reason",
                    ""
                )
            ).strip(),
        }

    except Exception as e:

        print(
            "MULTIPLAYER JUDGE ERROR:",
            e
        )

        return {
            "error": str(e)
        }