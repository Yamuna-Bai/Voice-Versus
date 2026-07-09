import json
import os
from typing import Any, Optional

from dotenv import load_dotenv
from groq import Groq

load_dotenv()


def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    return Groq(api_key=api_key)


def coerce_json_object(text: str) -> dict[str, Any]:
    """
    Best-effort extraction of a JSON object from model output.
    """
    t = (text or "").strip()
    if not t:
        raise ValueError("Empty JSON text")

    # Strip common fences
    t = t.replace("```json", "").replace("```", "").strip()

    # Fast path
    try:
        val = json.loads(t)
        if isinstance(val, dict):
            return val
    except Exception:
        pass

    # Try to extract first {...} block
    start = t.find("{")
    end = t.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = t[start : end + 1]
        val = json.loads(candidate)
        if isinstance(val, dict):
            return val

    raise ValueError("Could not parse JSON object")


def chat_text(
    *,
    model: str,
    system: Optional[str],
    user: str,
    temperature: float = 0.3,
    max_tokens: int = 512,
) -> str:
    client = get_groq_client()
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": user})

    res = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (res.choices[0].message.content or "").strip()

