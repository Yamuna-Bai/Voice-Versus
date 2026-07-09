import asyncio
import json
import os
import re

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, UploadFile

from services.ai_service import generate_counter_argument
from services.fallacy_service import detect_fallacies
from services.report_service import generate_final_report
from services.scoring_service import score_argument

router = APIRouter()

load_dotenv()


# ✅ Greeting detection (FIXED)
ALEX_SELF_INTRO = (
    "My name is Alex. I was built by Yamuna as an AI debate trainer. "
    "My main features are voice-based debating, topic-based arguments, difficulty levels, "
    "counterarguments, argument scoring, fallacy detection, coaching tips, video confidence analysis, "
    "debate reports, and a leaderboard. I help you practice speaking, sharpen your logic, "
    "and become more confident in debates."
)


def is_greeting(text: str):
    text = text.lower()
    greetings = ["hi", "hello", "hey", "hii", "good morning", "good evening"]
    return any(word in text for word in greetings)


# ✅ Name detection (UPDATED)
def extract_name(text: str):
    patterns = [
        r"i am (\w+)",
        r"i'm (\w+)",
        r"my name is (\w+)",
        r"this is (\w+)"   # IMPORTANT
    ]
    text = text.lower()
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).capitalize()
    return None


# ✅ Small talk
def is_about_alex_question(text: str):
    cleaned = re.sub(r"[^a-z0-9\s']", " ", (text or "").lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    about_patterns = [
        r"\bwhat('s| is) your name\b",
        r"\bwho are you\b",
        r"\btell me about yourself\b",
        r"\bintroduce yourself\b",
        r"\bwhat (can|do) you do\b",
        r"\bwhat are your features\b",
        r"\bwhat features do you have\b",
        r"\bfeatures of you\b",
        r"\bwhat is the use of you\b",
        r"\bwhat('s| is) your use\b",
        r"\bhow (can|do) you help\b",
        r"\bwho (built|made|created|developed) you\b",
        r"\bwho (built|made|created|developed) alex\b",
    ]
    return any(re.search(pattern, cleaned) for pattern in about_patterns)


def is_small_talk(text: str):
    small = ["ok", "okay", "hmm", "yes", "yeah", "fine"]
    return text.lower().strip() in small


# ✅ Weak input
def is_weak_input(text: str):
    return len(text.split()) < 5


def _ai_position_from_user_position(user_position: str) -> str:
    pos = (user_position or "").strip().upper()
    if pos == "FOR":
        return "AGAINST"
    if pos == "AGAINST":
        return "FOR"
    return "AGAINST"


def _normalize_history(history_raw: str) -> list[dict]:
    try:
        parsed = json.loads(history_raw or "[]")
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass
    return []


def _normalize_difficulty(value: str) -> str:
    difficulty = (value or "medium").strip().lower()
    return difficulty if difficulty in {"easy", "medium", "hard"} else "medium"


async def _speech_to_text_deepgram(audio_bytes: bytes, content_type: str) -> str:
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise RuntimeError("Missing DEEPGRAM_API_KEY")

    async with httpx.AsyncClient(timeout=40.0) as client:
        resp = await client.post(
            "https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true&filler_words=false&channels=1&alternatives=1",
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": content_type or "audio/webm",
            },
            content=audio_bytes,
        )
        resp.raise_for_status()
        data = resp.json()

    return (
        data.get("results", {})
        .get("channels", [{}])[0]
        .get("alternatives", [{}])[0]
        .get("transcript", "")
        or ""
    ).strip()


def _safe_deepgram_error_message(exc: Exception) -> str:
    msg = str(exc) or exc.__class__.__name__
    if "Missing DEEPGRAM_API_KEY" in msg:
        return "Speech recognition failed: missing DEEPGRAM_API_KEY in backend/.env"
    if "401" in msg or "403" in msg:
        return "Speech recognition failed: invalid Deepgram API key"
    if "415" in msg:
        return "Speech recognition failed: unsupported audio format"
    if "422" in msg:
        return "Speech recognition failed: invalid audio payload"
    return f"Speech recognition failed: {msg}"


# 🎙️ VOICE TURN API
@router.post("/voice-turn")
async def voice_turn(
    audio: UploadFile = File(...),
    topic: str = Form(...),
    position: str = Form(...),
    history: str = Form(default="[]"),
    difficulty: str = Form(default="medium"),
):
    debate_history = _normalize_history(history)
    difficulty = _normalize_difficulty(difficulty)

    audio_bytes = await audio.read()
    if not audio_bytes:
        return {"error": "No audio received"}

    try:
        user_text = await _speech_to_text_deepgram(audio_bytes, audio.content_type or "audio/webm")
    except Exception as e:
        print("DEEPGRAM ERROR:", e)
        return {"error": _safe_deepgram_error_message(e)}

    if not user_text:
        return {"error": "No speech detected"}

    # 🟢 GREETING
    if is_about_alex_question(user_text):
        return {
            "user_text": user_text,
            "ai_response": ALEX_SELF_INTRO,
            "turn_complete": True,
            "non_debate": True,
            "fallacy_analysis": {"detected": False, "fallacies": []},
            "scores": {
                "score": 0,
                "overall": 0,
                "feedback": "Asked about Alex.",
                "coach_tip": "When you're ready, make one clear argument about the debate topic.",
            },
        }

    if is_greeting(user_text) and len(debate_history) == 0:
        name = extract_name(user_text)

        if name:
            message = f"Hello {name}! Nice to meet you 😊"
        else:
            message = "Hello! Nice to meet you 😊"

        return {
            "user_text": user_text,
            "ai_response": f"{message}\n\nWe are debating on '{topic}'. Please give your first argument.",
            "fallacy_analysis": {"detected": False, "fallacies": []},
            "scores": {"score": 0, "overall": 0, "feedback": "Start your argument", "coach_tip": "Make a clear claim and support it with one reason."}
        }

    # 🟡 SMALL TALK
    if is_small_talk(user_text):
        return {
            "user_text": user_text,
            "ai_response": "Please give a proper argument related to the topic.",
            "fallacy_analysis": {"detected": False, "fallacies": []},
            "scores": {"score": 0, "overall": 0, "feedback": "Give meaningful argument", "coach_tip": "State a topic-related claim before recording again."}
        }

    # 🔴 WEAK INPUT
    if is_weak_input(user_text):
        return {
            "user_text": user_text,
            "ai_response": "Your argument is too short. Please explain clearly.",
            "fallacy_analysis": {"detected": False, "fallacies": []},
            "scores": {"score": 0, "overall": 0, "feedback": "Expand your argument", "coach_tip": "Add a reason and one example so the AI can respond properly."}
        }

    # 🟣 EXIT (say "exit", "quit", "stop", "end debate")
    if re.search(r"\b(exit|quit|stop|end)\b", user_text.lower()):
        try:
            final_report = await generate_final_report(topic=topic, user_position=position, history=debate_history)
        except Exception as e:
            print("REPORT ERROR:", e)
            final_report = "Could not generate report."

        return {
            "user_text": user_text,
            "ai_response": "Debate ended. Here is your final report.",
            "final_report": final_report,
            "end": True,
            "turn_complete": True,
            "fallacy_analysis": {"detected": False, "fallacies": []},
            "scores": {"score": 0, "overall": 0, "feedback": "Debate ended", "coach_tip": "Review your scores and try another topic."},
        }

    # 🔵 NORMAL DEBATE
    ai_position = _ai_position_from_user_position(position)
    counter, fallacies, scores = await asyncio.gather(
        generate_counter_argument(user_text, topic, ai_position, debate_history, difficulty),
        detect_fallacies(user_text),
        score_argument(user_text, topic)
    )

    return {
        "user_text": user_text,
        "ai_response": counter,
        "fallacy_analysis": fallacies,
        "scores": scores,
        "turn_complete": True
    }
