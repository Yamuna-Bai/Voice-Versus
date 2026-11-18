import asyncio

from services.llm import chat_text

DIFFICULTY_STYLES = {
    "easy": """Difficulty: easy.
Use simple language, short responses, and basic logic. Keep the challenge friendly but firmly opposed.""",
    "medium": """Difficulty: medium.
Use focused, practical reasoning. Push back clearly without softening into a balanced or neutral answer.""",
    "hard": """Difficulty: hard.
Give a fast, strong opposite-side rebuttal. Use a concrete real-world case, policy outcome, or statistic only if you are certain it is accurate; never invent evidence. Sound intense, human, and authoritative. No neutral balancing and no essay filler.""",
}


DEBATE_PROMPT = """You are an expert debate opponent.
Your job is to argue the OPPOSITE side of the user with conviction.

Rules:
1. Stay strictly on the debate topic
2. Your position is locked as {ai_position}. Do not drift neutral or support the user's side.
3. If your position is FOR, defend the topic strongly. If your position is AGAINST, attack the topic strongly.
4. Give exactly one clear, human-sounding counterargument at a time; do not pile on unrelated objections
5. Respond directly to the user's specific claim and identify why its key assumption, evidence, or logic fails
6. Use practical logic and a concrete real-world example when it is genuinely relevant
7. Only use a statistic, date, study, named event, or source if you know it is accurate. Never invent or guess facts. If precise evidence is uncertain, do not cite it.
8. Keep the response short enough for a live voice debate: normally 2-4 spoken sentences and under 90 words
9. End with one challenging follow-up question that makes the user defend that one issue
10. Be assertive and respectful; sound like a person speaking, not a textbook or chatbot

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
        model="openai/gpt-oss-20b",
        system=None,
        user=prompt,
        temperature=0.5,
        max_tokens=2000,
    )
