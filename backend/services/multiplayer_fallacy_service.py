import asyncio

from backend.services.llm import (
    chat_text,
    coerce_json_object,
)


async def detect_multiplayer_fallacies(
    argument: str,
    topic: str
) -> dict:

    prompt = f"""
You are an AI debate coach specializing in logical fallacies.

Analyze the following debate argument.

Topic:
{topic}

Argument:
{argument}

Identify any logical fallacies present in the argument.

Respond ONLY in this exact JSON format:

{{
    "count": 0,
    "fallacies": [
        {{
            "name": "Fallacy name",
            "explanation": "Short explanation of why the argument contains this fallacy."
        }}
    ]
}}

Rules:

- count must equal the number of detected fallacies.
- Only identify genuine logical fallacies.
- Do not invent a fallacy just because the argument is weak.
- If there are no clear fallacies, return count 0 and an empty fallacies list.
- Keep explanations short and understandable.
- Return JSON only.
"""

    raw = await asyncio.to_thread(
        chat_text,
        model="llama-3.3-70b-versatile",
        system=None,
        user=prompt,
        temperature=0.1,
        max_tokens=400,
    )

    try:
        data = coerce_json_object(raw)

    except Exception:
        return {
            "count": 0,
            "fallacies": []
        }

    fallacies = data.get("fallacies", [])

    if not isinstance(fallacies, list):
        fallacies = []

    cleaned = []

    for item in fallacies:
        if not isinstance(item, dict):
            continue

        name = str(
            item.get("name") or ""
        ).strip()

        explanation = str(
            item.get("explanation") or ""
        ).strip()

        if name:
            cleaned.append({
                "name": name,
                "explanation": explanation
                    or "This argument contains a possible logical fallacy."
            })

    return {
        "count": len(cleaned),
        "fallacies": cleaned
    }