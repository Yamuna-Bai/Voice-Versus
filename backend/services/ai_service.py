import asyncio

from services.llm import chat_text

DIFFICULTY_STYLES = {
    "easy": """Difficulty: easy.
Use simple language, short responses, and basic logic. Keep the challenge friendly.""",
    "medium": """Difficulty: medium.
Use balanced arguments with moderate reasoning. Push back clearly without being too complex.""",
    "hard": """Difficulty: hard.
Give a fast, strong opposite-side rebuttal. Open with quick concrete evidence: a statistic, real-world case, documented event, policy outcome, or expert-backed fact. Use at least five punchy spoken lines. Sound intense, human, and authoritative. No neutral balancing and no essay filler.""",
}


DEBATE_PROMPT = """You are an expert debate opponent.
Your job is to argue the OPPOSITE side of the user with conviction.

Rules:
1. Stay strictly on the debate topic
2. Your position is locked as {ai_position}. Do not drift neutral or support the user's side.
3. If your position is FOR, defend the topic strongly. If your position is AGAINST, attack the topic strongly.
4. Give one clear human-sounding counterargument
5. Use facts, logic, and a concrete example when possible
6. Give minimum five strong spoken lines
7. Keep response under 110 words
8. End with one challenging question
9. Be aggressive but respectful

Topic: {topic}
Your position: {ai_position}

{difficulty_style}"""


def _history_to_text(debate_history: list) -> str:
    lines: list[str] = []
    for turn in debate_history or []:
        if not isinstance(turn, dict):
            continue
        user = turn.get("user") or turn.get("userArgument") or turn.get("user_text") or turn.get("userText")
        ai = turn.get("ai") or turn.get("aiResponse") or turn.get("ai_response") or turn.get("aiText")
        if user:
            lines.append(f"User: {user}")
        if ai:
            lines.append(f"AI: {ai}")
    return "\n".join(lines).strip()


async def generate_counter_argument(
    user_argument: str,
    topic: str,
    ai_position: str,
    debate_history: list,
    difficulty: str = "medium",
):
    history_text = _history_to_text(debate_history)
    difficulty_key = (difficulty or "medium").strip().lower()
    difficulty_style = DIFFICULTY_STYLES.get(difficulty_key, DIFFICULTY_STYLES["medium"])

    prompt = f"""{DEBATE_PROMPT.format(
        topic=topic,
        ai_position=ai_position,
        difficulty_style=difficulty_style,
    )}

Debate history:
{history_text}

User just said: {user_argument}

Your counter argument:"""

    return await asyncio.to_thread(
        chat_text,
        model="llama-3.3-70b-versatile",
        system=None,
        user=prompt,
        temperature=0.5,
        max_tokens=220,
    )
