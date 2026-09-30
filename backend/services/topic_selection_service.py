import os
import json
from groq import Groq


client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def select_debate_topic(common_topics: list[str]) -> str:
    if not common_topics:
        raise ValueError("No common topics available")

    # If there is only one common topic,
    # there is no need to call the AI.
    if len(common_topics) == 1:
        return common_topics[0]

    prompt = f"""
You are selecting a debate topic for two players.

Choose exactly ONE topic from the following list:

{json.dumps(common_topics)}

Selection criteria:
- The topic should support meaningful arguments from both sides.
- The topic should be suitable for a student debate.
- Avoid topics that are too narrow or difficult to debate.
- You MUST choose one topic from the provided list.

Return ONLY the exact topic name.
Do not provide explanations.
Do not add quotation marks.
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0.2,
        max_tokens=50,
    )

    selected = response.choices[0].message.content.strip()

    # Safety check: AI must return one of the supplied topics.
    if selected not in common_topics:
        selected = common_topics[0]

    return selected