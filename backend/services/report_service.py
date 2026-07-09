import asyncio
import json

from services.llm import chat_text


def _history_to_compact_text(history: list[dict]) -> str:
    lines: list[str] = []
    for t in history or []:
        if not isinstance(t, dict):
            continue
        user = t.get("userArgument") or t.get("user") or t.get("user_text") or ""
        ai = t.get("aiResponse") or t.get("ai") or t.get("ai_response") or ""
        if user:
            lines.append(f"User: {user}")
        if ai:
            lines.append(f"AI: {ai}")
    return "\n".join(lines)


async def generate_final_report(*, topic: str, user_position: str, history: list[dict]) -> str:
    history_text = _history_to_compact_text(history)
    prompt = f"""
Analyze the user's debate performance.

Topic: {topic}
User position: {user_position}

Debate history:
{history_text}

Return exactly these sections (bullet points allowed):

Fallacies:
- ...

Strengths:
- ...

Improvements:
- ...

Score: X/10
""".strip()

    return await asyncio.to_thread(
        chat_text,
        model="llama-3.3-70b-versatile",
        system=None,
        user=prompt,
        temperature=0.2,
        max_tokens=450,
    )

