import asyncio

from services.llm import chat_text, coerce_json_object

async def detect_fallacies(argument: str):
    prompt = f"""Analyze this argument for logical fallacies.
Choose ONLY from these 10 types:
ad_hominem, straw_man, false_dichotomy,
slippery_slope, appeal_to_authority,
hasty_generalization, circular_reasoning,
appeal_to_tradition, bandwagon, red_herring

Argument: {argument}

Respond ONLY in this exact JSON format:
{{
  "detected": true or false,
  "fallacies": [
    {{
      "type": "fallacy_id",
      "confidence": "high or medium or low",
      "explanation": "one sentence why"
    }}
  ]
}}

No extra text. Just JSON."""

    raw = await asyncio.to_thread(
        chat_text,
        model="llama-3.3-70b-versatile",
        system=None,
        user=prompt,
        temperature=0.0,
        max_tokens=300,
    )
    try:
        data = coerce_json_object(raw)
    except Exception:
        return {"detected": False, "fallacies": []}

    detected = bool(data.get("detected", False))
    fallacies = data.get("fallacies", [])
    if not isinstance(fallacies, list):
        fallacies = []
    return {"detected": detected, "fallacies": fallacies}