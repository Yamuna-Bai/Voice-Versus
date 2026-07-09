import asyncio

from services.llm import chat_text, coerce_json_object

async def score_argument(argument: str, topic: str):
    prompt = f"""You are an AI debate coach. Score this debate argument and give short coaching feedback.
Topic: {topic}
Argument: {argument}

Respond ONLY in this exact JSON format:
{{
  "score": <1-10>,
  "argument_quality": <1-10>,
  "evidence_use": <1-10>,
  "rebuttal_strength": <1-10>,
  "overall": <1-10>,
  "feedback": "1-2 line coaching feedback",
  "coach_tip": "specific improvement suggestion"
}}

Rules:
- feedback must be helpful, actionable, and short
- coach_tip must suggest exactly what to improve next
- no extra text, JSON only."""

    raw = await asyncio.to_thread(
        chat_text,
        model="llama-3.3-70b-versatile",
        system=None,
        user=prompt,
        temperature=0.2,
        max_tokens=260,
    )
    try:
        data = coerce_json_object(raw)
    except Exception:
        return {
            "score": 0,
            "argument_quality": 0,
            "evidence_use": 0,
            "rebuttal_strength": 0,
            "overall": 0,
            "feedback": "Could not score argument",
            "coach_tip": "Try again with a clear claim and one supporting reason.",
        }

    # Normalize expected fields
    def _num(x):
        try:
            n = int(round(float(x)))
            return max(1, min(10, n))
        except Exception:
            return 0

    return {
        "score": _num(data.get("score") or data.get("overall")),
        "argument_quality": _num(data.get("argument_quality")),
        "evidence_use": _num(data.get("evidence_use")),
        "rebuttal_strength": _num(data.get("rebuttal_strength")),
        "overall": _num(data.get("overall")),
        "feedback": str(data.get("feedback") or "").strip() or "Keep it specific and support claims with evidence.",
        "coach_tip": str(data.get("coach_tip") or "").strip() or "Add one concrete example or statistic to strengthen your point.",
    }
