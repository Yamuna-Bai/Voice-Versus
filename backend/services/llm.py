
import json
import os
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from groq import Groq


# Load the .env file from the backend folder
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError(
            "Missing GROQ_API_KEY. Check the backend/.env file."
        )

    return Groq(api_key=api_key)


def coerce_json_object(text: str) -> dict[str, Any]:
    """
    Best-effort extraction of a JSON object from model output.
    """
    t = (text or "").strip()

    if not t:
        raise ValueError("Empty JSON text")

    # Strip common Markdown code fences
    t = t.replace("```json", "").replace("```", "").strip()

    # Try parsing the complete response
    try:
        val = json.loads(t)

        if isinstance(val, dict):
            return val

    except (json.JSONDecodeError, TypeError):
        pass

    # Try extracting the first JSON object
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
    """
    Send a chat request to Groq and return the visible response text.
    Raise an error if the model returns empty content.
    """
    client = get_groq_client()

    messages = []

    if system:
        messages.append(
            {"role": "system", "content": system}
        )

    messages.append(
        {"role": "user", "content": user}
    )

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    if not response.choices:
        raise RuntimeError("Groq returned no response choices")

    choice = response.choices[0]
    message = choice.message
    content = (message.content or "").strip()

    if not content:
        raise RuntimeError(
            "Groq returned empty content. "
            f"Finish reason: {choice.finish_reason}"
        )

    return content
