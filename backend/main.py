from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import uvicorn
import httpx
import json
import asyncio
import re
import random

#
#  ------------------------------------------------------------------ KEYS
import os
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY")
app = FastAPI(title="AI Debate System")

# ------------------------------------------------------------------ DIFFICULTY LEVELS

DIFFICULTY_STYLES = {

    "easy": """
DIFFICULTY: Easy — sharp classmate who disagrees clearly.

Your style:
- Plain, everyday language. Zero academic jargon.
- Make ONE focused point backed by ONE relatable real-life example.
- Don't cite studies or statistics. Use things everyone knows.
- Tone: calm but genuinely convinced. Not aggressive. Not a pushover.
- Keep it brief unless the user gives a long, detailed argument.
""",

    "medium": """
DIFFICULTY: Medium — well-prepared university debater.

Your style:
- Reference 1-2 real-world examples, known events, or widely reported facts.
- Spot the ONE weak point in their argument and name it directly.
- Ask at least one sharp rhetorical question that puts them on the back foot.
- Tone: assertive, focused, building pressure.
- Keep it brief unless the user gives a long, detailed argument.
""",

    "hard": """
DIFFICULTY: Hard — championship-level debater. Legal mind. Policy expert.

Your style:
- Open fast with concrete evidence, not a slow introduction.
- Cite SPECIFIC quick evidence: one statistic, named real-world case, documented event, policy outcome, or expert-backed fact.
- Stay locked to the OPPOSITE side and make that side sound obviously stronger.
- Execute a 2-step attack in compact form: expose the flaw, then replace it with your stronger evidence-backed point.
- Use at least five punchy spoken lines. Each line should land a clear hit.
- Tone: intense, surgical, authoritative. You are winning and you know it.
- Aim for 95-125 words. No essay filler, no neutral balancing, no soft validation.
""",
}

DIFFICULTY_TEMPERATURE = {
    "easy":   0.78,
    "medium": 0.85,
    "hard":   0.88,
}

ALEX_SELF_INTRO = (
    "My name is Alex. I was built by Yamuna as an AI debate trainer. "
    "My main features are voice-based debating, topic-based arguments, difficulty levels, "
    "counterarguments, argument scoring, fallacy detection, coaching tips, video confidence analysis, "
    "debate reports, and a leaderboard. I help you practice speaking, sharpen your logic, "
    "and become more confident in debates."
)

# ------------------------------------------------------------------ ATTACK STRATEGIES
# These describe HOW to attack, not what to say. Rotated per turn.

ATTACK_STRATEGIES = [
    "Turn their own logic against them. Show how their reasoning, followed to its conclusion, actually supports YOUR side more than theirs.",
    "Give one vivid, undeniable real-world counterexample that directly collapses their claim. Make it concrete and hard to dismiss.",
    "Expose the hidden assumption holding their argument together — the thing they assumed without proving. Once that falls, the whole argument falls.",
    "Take their logic to its extreme conclusion. Show how absurd, dangerous, or self-defeating that outcome becomes.",
    "Point to a documented real-world failure or event that directly contradicts what they're claiming.",
    "Narrow their claim — show it only holds in a tiny edge case, not in the general reality they're implying.",
    "Break the cause-and-effect chain they're implying. Prove their correlation doesn't establish causation.",
    "Shift the burden of proof. Force them to justify a core assumption they took for granted.",
]

# ------------------------------------------------------------------ ESCALATION ARC
# Tone instructions indexed by turn count. Debate gets more intense as it goes.

def get_escalation_tone(turn_count: int) -> str:
    if turn_count == 0:
        return "This is your opening counter. Be sharp and confident but give them room to respond."
    elif turn_count == 1:
        return "They've had one go. Start pressing harder. Show you've listened and you're dismantling their specific point."
    elif turn_count == 2:
        return "Third exchange. The debate is heating up. Don't let up. Be more direct and more insistent."
    elif turn_count <= 4:
        return "Mid-debate. You're in it now. Get sharper. Show genuine frustration at the weakness of their argument."
    else:
        return "Late debate. You've been at this a while. Hit with your strongest evidence and rhetoric. Make it count."

# ------------------------------------------------------------------ HELPERS

def normalize_difficulty(value):
    difficulty = (value or "medium").strip().lower()
    if difficulty == "moderate":
        difficulty = "medium"
    return difficulty if difficulty in DIFFICULTY_STYLES else "medium"


def get_debate_sides(user_position):
    user_side = (user_position or "").strip().upper()
    if user_side == "AGAINST":
        return "AGAINST", "FOR"
    return "FOR", "AGAINST"


def contains_abusive_language(text):
    cleaned = re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())
    abusive_patterns = [
        r"\bf+u+c+k+(ing|er|ed)?\b",
        r"\bshit+\b",
        r"\bbitch+\b",
        r"\basshole+\b",
        r"\bbastard+\b",
        r"\bdamn+\b",
        r"\bcrap+\b",
        r"\bidiot+\b",
        r"\bstupid+\b",
        r"\bdumb+\b",
        r"\bmoron+\b",
        r"\bloser+\b",
        r"\bshut up+\b",
        r"\bgo to hell+\b",
    ]
    return any(re.search(pattern, cleaned) for pattern in abusive_patterns)


def is_about_alex_question(text):
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


def classify_intent(text, turn_count):
    cleaned = (text or "").strip().lower()
    words = cleaned.split()
    if contains_abusive_language(cleaned):
        return "abusive"
    if is_about_alex_question(cleaned):
        return "about_alex"

    exit_patterns = [
        r"\b(bye|goodbye|good bye|see you|see ya|farewell|take care|gn|good night|sweet dreams)\b",
        r"\b(exit|quit|stop|end debate|end the debate|let's stop|let's end)\b",
        r"\b(i('m| am) done|i('m| am) finished|that('s| is) all|no more)\b",
        r"\b(thanks for the debate|thank you for debating|good game|gg)\b",
        r"\blet('s| us) (wrap|call it|finish|end)\b",
    ]
    for pat in exit_patterns:
        if re.search(pat, cleaned):
            return "exit"

    greeting_patterns = [
        r"^(hi+|hey+|hello+|hiya|howdy|greetings|good (morning|evening|afternoon|day)|gm)\b",
        r"^(hi|hey|hello|gm).{0,60}(this is|i('m| am)|my name is|i am)",
        r"^(hi|hey|hello).{0,60}(shall we|can we|ready|start|begin|let('s| us))",
        r"^(nice to meet|pleased to meet|good to meet)",
        r"^(what('s| is) up|sup\b|yo\b)",
    ]
    setup_patterns = [
        r"^(shall|should|can|could|may) we (start|begin|continue|go ahead|move on|proceed)( our| the)? debate[.!?]*$",
        r"^(let('s| us) (start|begin|continue|go ahead|move on|proceed)( our| the)? debate)[.!?]*$",
        r"^(are you ready|ready to start|ready for the debate|shall we)[.!?]*$",
        r"^(start the debate|begin the debate|we can start|you can start|go ahead)[.!?]*$",
    ]
    for pat in setup_patterns:
        if re.search(pat, cleaned):
            return "setup"

    has_debate_substance = any(w in cleaned for w in [
        "because", "therefore", "however", "argue", "claim", "evidence",
        "prove", "fact", "reason", "think", "believe", "should", "must",
        "will", "replace", "better", "worse", "harm", "benefit", "impact",
    ])
    if not has_debate_substance:
        for pat in greeting_patterns:
            if re.search(pat, cleaned):
                return "greeting"

    if not has_debate_substance:
        for pat in setup_patterns:
            if re.search(pat, cleaned):
                return "setup"

    small_talk_patterns = [
        r"^how are you",
        r"^how('s| is) it going",
        r"^what('s| is) your name",
        r"^are you (ready|an ai|a (robot|bot|human))",
        r"^(nice|good|great|cool|okay|ok|sure|alright|sounds good|let('s| us) (go|start|begin|do this))[.!]*$",
        r"^(yes|no|yeah|nah|yep|nope|hmm|umm|uh+)[.!?]*$",
    ]
    for pat in small_talk_patterns:
        if re.search(pat, cleaned):
            return "greeting" if turn_count == 0 else "irrelevant"

    if len(words) < 5 and not has_debate_substance:
        return "irrelevant"

    return "argument"


def speech_quality_issue(text, alternative=None):
    cleaned = re.sub(r"[^a-z0-9\s']", " ", (text or "").lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    words = re.findall(r"\b[a-z0-9']+\b", cleaned)
    meaningful_words = [w for w in words if w not in {"um", "uh", "umm", "hmm", "mm", "ah", "oh"}]
    confidence = None
    if isinstance(alternative, dict):
        confidence = alternative.get("confidence")

    if confidence is not None and confidence < 0.35:
        return "low_confidence"
    if confidence is not None and confidence < 0.48 and len(meaningful_words) <= 4:
        return "low_confidence"
    if len(meaningful_words) == 0:
        return "no_speech"
    if len(meaningful_words) <= 2 and cleaned not in {"hi", "hey", "hello", "hii"}:
        return "too_short"
    if len(set(meaningful_words)) <= 1 and len(meaningful_words) >= 3:
        return "repeated_noise"
    return None


def extract_best_transcript(deepgram_result):
    alternatives = (
        deepgram_result.get("results", {})
                       .get("channels", [{}])[0]
                       .get("alternatives", [])
    )
    if not alternatives:
        return "", {}

    def rank(alternative):
        transcript = (alternative.get("transcript") or "").strip()
        words = re.findall(r"\b[a-z0-9']+\b", transcript.lower())
        confidence = alternative.get("confidence") or 0
        return (len(words), confidence)

    best = max(alternatives, key=rank)
    return (best.get("transcript") or "").strip(), best


def is_substantive_argument(text, topic):
    cleaned = re.sub(r"[^a-z0-9\s']", " ", (text or "").lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    words = re.findall(r"\b[a-z0-9']+\b", cleaned)
    topic_words = {
        w for w in re.findall(r"\b[a-z0-9']+\b", (topic or "").lower())
        if len(w) > 3 and w not in {"does", "more", "than", "good", "will", "should", "better"}
    }
    has_topic_word = any(w in topic_words for w in words)
    has_reasoning = any(phrase in cleaned for phrase in [
        "because", "for example", "for instance", "therefore", "that's why", "that is why",
        "my reason", "the reason", "evidence", "impact", "harm", "benefit", "support",
        "oppose", "agree", "disagree", "i think", "i believe", "in my opinion",
    ])
    has_claim_verb = any(w in words for w in [
        "harm", "harms", "harmful", "benefit", "benefits", "good", "bad", "dangerous",
        "replace", "abolish", "support", "oppose", "agree", "disagree", "better", "worse",
    ])
    if len(words) >= 7 and (has_reasoning or has_topic_word or has_claim_verb):
        return True
    if len(words) >= 5 and has_topic_word and has_claim_verb:
        return True
    return False


def get_attack_angle(turn_count):
    return ATTACK_STRATEGIES[turn_count % len(ATTACK_STRATEGIES)]


def get_response_length_policy(user_text, difficulty="medium"):
    words = re.findall(r"\b\w+\b", user_text or "")
    word_count = len(words)
    detail_markers = len(re.findall(
        r"\b(example|case|study|because|therefore|first|second|third|also|however|evidence|data|statistic|previously|for instance)\b",
        (user_text or "").lower(),
    ))

    if word_count >= 85 or (word_count >= 60 and detail_markers >= 4):
        return {
            "label": "long",
            "max_tokens": 260 if difficulty == "hard" else 230,
            "max_words": 190 if difficulty == "hard" else 170,
            "max_sentences": 9,
            "instructions": (
                "The user gave a detailed argument with examples or cases. You may give a longer, stronger rebuttal, "
                "but stay organized and avoid repeating yourself. Give at least 5 strong spoken lines. "
                "If hard difficulty is selected, open with quick concrete evidence and hit harder. Aim for 7-9 punchy spoken lines."
            ),
        }

    if word_count >= 70 or detail_markers >= 3:
        return {
            "label": "medium",
            "max_tokens": 190 if difficulty == "hard" else 160,
            "max_words": 120 if difficulty == "hard" else 95,
            "max_sentences": 6,
            "instructions": (
                "The user gave a moderately developed point. Give a valid counter in at least 5 short spoken lines, ideally 5-6 lines, "
                "Attack the main flaw only. If hard difficulty is selected, include quick concrete evidence in the first two lines."
            ),
        }

    return {
        "label": "short",
        "max_tokens": 180 if difficulty == "hard" else 150,
        "max_words": 115 if difficulty == "hard" else 95,
        "max_sentences": 5,
        "instructions": (
            "The user gave a short or simple point. Give exactly 5 short, strong spoken lines, max 95 words. "
            "Make one clear counterpoint, one quick example or reason, and one sharp question. "
            "If hard difficulty is selected, use quick evidence immediately and make the opposite side feel forceful. Do not over-explain."
        ),
    }


def trim_response_to_policy(text, policy):
    words = re.findall(r"\S+", text or "")
    if len(words) <= policy["max_words"]:
        return (text or "").strip()

    sentences = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    kept = []
    kept_words = 0
    for sentence in sentences:
        sentence_words = re.findall(r"\S+", sentence)
        if not sentence_words:
            continue
        if len(kept) >= policy["max_sentences"] or kept_words + len(sentence_words) > policy["max_words"]:
            break
        kept.append(sentence)
        kept_words += len(sentence_words)

    if kept:
        return " ".join(kept).strip()

    return " ".join(words[:policy["max_words"]]).rstrip(" ,;:") + "."


def build_history_context(history_list):
    if not history_list:
        return ""
    context = "\n\nCONVERSATION SO FAR (most recent last):\n"
    for turn in history_list[-6:]:
        role = turn.get("role", "")
        content = turn.get("content", "").strip()
        if role == "user":
            context += f"User argued: {content}\n"
        elif role == "assistant":
            context += f"You (Alex) said: {content}\n"
    return context


def normalize_coach_result(data):
    def num(value, default=0):
        try:
            return max(1, min(10, int(round(float(value)))))
        except Exception:
            return default

    fallacies = data.get("fallacies", [])
    if not isinstance(fallacies, list):
        fallacies = []

    score = num(data.get("score"), 7)
    return {
        "scores": {
            "score":             score,
            "overall":           score,
            "argument_quality":  num(data.get("argument_quality"), score),
            "evidence_use":      num(data.get("evidence_use"), score),
            "rebuttal_strength": num(data.get("rebuttal_strength"), score),
            "feedback":  str(data.get("feedback")  or "Good argument, but make it more specific.").strip(),
            "coach_tip": str(data.get("coach_tip") or "Add one concrete example or statistic.").strip(),
        },
        "fallacy_analysis": {
            "detected":  len(fallacies) > 0,
            "fallacies": fallacies,
        },
    }


# ------------------------------------------------------------------ APP

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "AI Debate System Running"}


# ------------------------------------------------------------------ VOICE TURN

@app.post("/debate/voice-turn")
async def voice_debate_turn(
    audio:      UploadFile = File(...),
    topic:      str        = Form(...),
    position:   str        = Form(...),
    history:    str        = Form(default="[]"),
    difficulty: str        = Form(default="medium"),
    transcript: str        = Form(default=""),
):
    try:
        difficulty = normalize_difficulty(difficulty)
        user_text = (transcript or "").strip()
        audio_data = b""
        if not user_text:
            audio_data = await audio.read()

        print("Audio size:", len(audio_data))
        print("Content-Type:", audio.content_type)
        print("Difficulty level:", difficulty)

        try:
            history_list = json.loads(history)
        except Exception:
            history_list = []

        turn_count = len([
            t for t in history_list
            if t.get("role") == "user" or t.get("userArgument")
        ])

        alternative = {}
        if user_text:
            print("USING MANUAL TRANSCRIPT FALLBACK")
        else:
            # --------------------------------- SPEECH TO TEXT
            try:
                deepgram_query = (
                    "?model=nova-2"
                    "&language=en-US"
                    "&smart_format=true"
                    "&punctuate=true"
                    "&filler_words=false"
                    "&channels=1"
                    "&alternatives=1"
                )
                async with httpx.AsyncClient(timeout=35.0) as client:
                    dg_response = await client.post(
                        "https://api.deepgram.com/v1/listen" + deepgram_query,
                        headers={
                            "Authorization": "Token " + DEEPGRAM_KEY,
                            "Content-Type":  audio.content_type,
                        },
                        content=audio_data,
                    )
                result = dg_response.json()
                print("DEEPGRAM RESPONSE:", result)
                if result.get("err_code") or result.get("err_msg"):
                    return {"error": result.get("err_msg") or "Speech recognition failed"}
                user_text, alternative = extract_best_transcript(result)

                if not user_text.strip():
                    retry_query = deepgram_query + "&search=because&search=therefore&search=agree&search=disagree"
                    async with httpx.AsyncClient(timeout=35.0) as client:
                        retry_response = await client.post(
                            "https://api.deepgram.com/v1/listen" + retry_query,
                            headers={
                                "Authorization": "Token " + DEEPGRAM_KEY,
                                "Content-Type":  audio.content_type,
                            },
                            content=audio_data,
                    )
                    retry_result = retry_response.json()
                    print("DEEPGRAM RETRY RESPONSE:", retry_result)
                    if retry_result.get("err_code") or retry_result.get("err_msg"):
                        return {"error": retry_result.get("err_msg") or "Speech recognition failed"}
                    user_text, alternative = extract_best_transcript(retry_result)
            except Exception as e:
                print("DEEPGRAM ERROR:", e)
                return {"error": "Speech recognition failed. Type your argument to continue the demo."}

        if not user_text.strip():
            return {"error": "No speech detected"}

        print("USER TEXT:", user_text)

        # --------------------------------- INTENT
        intent = classify_intent(user_text, turn_count)
        print("INTENT:", intent)

        quality_issue = speech_quality_issue(user_text, alternative)
        if quality_issue and intent not in {"greeting", "setup", "about_alex", "exit", "abusive"}:
            return {
                "user_text": user_text,
                "ai_response": "I couldn't catch that clearly. Please say your point again a little closer to the mic.",
                "scores": {
                    "score": 0, "overall": 0,
                    "feedback": "Speech was unclear or too short.",
                    "coach_tip": "Reduce background noise and speak one complete debate point.",
                },
                "fallacy_analysis": {"detected": False, "fallacies": []},
                "turn_complete": True,
                "non_debate": True,
                "noise_detected": True,
            }

        if intent == "argument" and not is_substantive_argument(user_text, topic):
            intent = "irrelevant"
            print("INTENT OVERRIDE: irrelevant (not substantive)")

        # --------------------------------- ABUSIVE LANGUAGE
        if intent == "abusive":
            return {
                "user_text":   user_text,
                "ai_response": "Let's keep the conversation respectful. I'm here to debate your ideas, not trade insults. Please make your point without abusive language.",
                "scores": {
                    "score": 0, "overall": 0,
                    "feedback":  "Abusive language detected.",
                    "coach_tip": "Criticize the argument, not the person. Rephrase your point respectfully.",
                },
                "fallacy_analysis": {"detected": False, "fallacies": []},
                "turn_complete": True,
                "non_debate": True,
            }

        # --------------------------------- ABOUT ALEX
        if intent == "about_alex":
            return {
                "user_text":   user_text,
                "ai_response": ALEX_SELF_INTRO,
                "scores": {
                    "score": 0, "overall": 0,
                    "feedback":  "Asked about Alex.",
                    "coach_tip": "When you're ready, make one clear argument about the debate topic.",
                },
                "fallacy_analysis": {"detected": False, "fallacies": []},
                "turn_complete": True,
                "non_debate": True,
            }

        # --------------------------------- EXIT
        if intent == "exit":
            return {
                "user_text":   user_text,
                "ai_response": "Alright, I'll give you that — good debate. Let's go again sometime.",
                "scores": {
                    "score": 0, "overall": 0,
                    "feedback":  "Debate ended.",
                    "coach_tip": "Start a new conversation to debate again.",
                },
                "fallacy_analysis": {"detected": False, "fallacies": []},
                "turn_complete":  True,
                "is_debate_over": True,
            }

        # --------------------------------- GREETING
        if intent == "greeting":
            name_match = re.search(
                r"(?:this is|i(?:'m| am)|my name is)\s+([A-Z][a-z]+)",
                user_text,
                re.IGNORECASE,
            )
            name_part = f", {name_match.group(1)}" if name_match else ""
            return {
                "user_text":   user_text,
                "ai_response": f"Hey{name_part}! Good to meet you. We're debating '{topic}' today — I'll be arguing against your position. Whenever you're ready, make your opening argument.",
                "scores": {
                    "score": 0, "overall": 0,
                    "feedback":  "Start your argument.",
                    "coach_tip": "Open with a clear claim, then back it up with one strong reason.",
                },
                "fallacy_analysis": {"detected": False, "fallacies": []},
                "turn_complete": True,
                "non_debate": True,
            }

        # --------------------------------- SETUP / READINESS
        if intent == "setup":
            return {
                "user_text":   user_text,
                "ai_response": f"Yes, absolutely. Let's start. We're debating '{topic}', and I'll argue against your side. Go ahead with your first real point.",
                "scores": {
                    "score": 0, "overall": 0,
                    "feedback":  "Ready to begin.",
                    "coach_tip": "Start with one clear claim and one reason.",
                },
                "fallacy_analysis": {"detected": False, "fallacies": []},
                "turn_complete": True,
                "non_debate": True,
            }

        # --------------------------------- IRRELEVANT
        if intent == "irrelevant":
            return {
                "user_text":   user_text,
                "ai_response": "That's not an argument — that's a sentence. Give me something to actually work with.",
                "scores": {
                    "score": 0, "overall": 0,
                    "feedback":  "Stay on the debate topic.",
                    "coach_tip": "Connect your next point directly to the chosen topic.",
                },
                "fallacy_analysis": {"detected": False, "fallacies": []},
                "turn_complete": True,
                "non_debate": True,
            }

        # --------------------------------- BUILD CONTEXT
        history_context = build_history_context(history_list)
        attack_strategy = get_attack_angle(turn_count)
        escalation_tone = get_escalation_tone(turn_count)
        length_policy = get_response_length_policy(user_text, difficulty)
        user_side, alex_side = get_debate_sides(position)

        print(f"TURN {turn_count} | LENGTH: {length_policy['label']} | ATTACK: {attack_strategy[:40]}...")

        # ----------------------------------------------------------------
        # DEBATE SYSTEM PROMPT — redesigned for authentic human debating
        # Key changes:
        #   - No forced openers. Alex picks how to start naturally.
        #   - Fluid response structure. Tactics, not rigid steps.
        #   - Escalation arc baked in by turn count.
        #   - Style rules focus on ENERGY, not format.
        #   - Word targets are ranges with permission to exceed.
        # ----------------------------------------------------------------

        debate_system = f"""You are Alex — a real human debater in a live, heated spoken debate. You are NOT an AI. You have genuine opinions, real frustration when your points are dismissed, and the kind of confidence that comes from knowing your argument is stronger.

DEBATE TOPIC: {topic}
USER SIDE: {user_side}
YOUR SIDE: {alex_side}

SIDE LOCK - NON-NEGOTIABLE:
- If the user chose FOR, you must argue AGAINST the topic.
- If the user chose AGAINST, you must argue FOR the topic.
- Never accidentally support the user's side. Never become neutral.
- Your job is to defend {alex_side} strongly, like a real human opponent who believes that side can win.
- Every rebuttal must make the {alex_side} side sound stronger than the {user_side} side.

{DIFFICULTY_STYLES[difficulty]}

════════════════════════════════════════
HOW YOU ACTUALLY DEBATE (read carefully)
════════════════════════════════════════

A real debater does NOT follow a script. They listen, react, and attack. Here is how you respond:

1. ENGAGE WITH WHAT THEY ACTUALLY SAID.
   Don't just make a generic counter. Quote or closely paraphrase their specific claim. Make them feel heard — then dismantle what they said.

2. ATTACK STRATEGY FOR THIS TURN:
   {attack_strategy}
   Use this approach to build your counter-argument. Don't announce you're using it — just use it.

3. ESCALATION — WHERE YOU ARE IN THIS DEBATE:
   {escalation_tone}

4. RESPONSE LENGTH - STRICT:
   {length_policy["instructions"]}
   Match the user's detail level. Short user point = short answer. Long user case = longer answer.

5. END WITH PRESSURE.
   Either a sharp rhetorical question that challenges them to justify their position, or a direct challenge: "Prove it." "That doesn't hold up and you know it." "What evidence are you actually working with here?"

════════════════════════════════════════
HOW YOU SOUND
════════════════════════════════════════

ALWAYS use contractions: you're, it's, that's, doesn't, won't, can't, they've, I've, we're.
SHORT punchy sentences mixed with longer ones. Vary your rhythm like a real speaker.
Show EMOTION when it fits — disbelief, impatience, a sharp laugh, genuine conviction.
NEVER sound like an essay: no "Furthermore", "Moreover", "In conclusion", "It is worth noting".
NEVER thank them, validate them, or say "great point". You're here to win.

════════════════════════════════════════
HOW YOU OPEN (CRITICAL)
════════════════════════════════════════

Do NOT start with any of these — they are robotic and weak:
"I disagree" / "That's simply not true" / "Actually" / "Simply put" /
"You raise a fair concern" / "You raise a valid point" / "The data tells" /
"I understand your point" / "I see where you're coming from" /
"While I understand" / "Although you" / "Thank you" / "I appreciate" /
"On the contrary" / "That is incorrect" / "Interesting point"

Instead, open the way a real human does when they strongly disagree — with surprise, impatience, confidence, or a sharp observation. Examples of the KIND of opening energy you should have (do NOT copy these — create your own fresh reaction):
- Reacting to what they said: "Hold on — did you actually just argue that..."
- Calling out a flaw immediately: "The whole thing falls apart the moment you ask..."
- Expressing disbelief: "That would be convincing if it weren't missing..."
- Pressing directly: "Let's be specific here, because that claim doesn't survive..."
- Starting with your counter-evidence: "In 2021, [specific fact] — which completely contradicts..."

Your opening should feel like a real person who just heard something they strongly disagree with and can't wait to respond.

════════════════════════════════════════
RESPONSE FORMAT
════════════════════════════════════════
Output ONLY your spoken rebuttal. No labels, no stage directions, no meta-commentary.
Write as if someone is listening to you speak. Spoken rhythm, not written prose.
For short and medium arguments, do not write a paragraph wall. Keep it compact and readable."""

        # --------------------------------- DEBATE USER MESSAGE
        debate_user = f"""{history_context}

The user just argued: "{user_text}"

Respond now as Alex on the {alex_side} side. Remember: react to their SPECIFIC {user_side} argument, use the assigned attack strategy naturally, match the escalation level for turn {turn_count}, and open the way a real human debater would — not with a scripted phrase.
Length rule: {length_policy["instructions"]}

Output ONLY your spoken rebuttal."""

        # --------------------------------- COACH PROMPT
        coach_prompt = f"""
You are an expert debate coach evaluating the quality of the user's argument.

Topic: {topic}
User's argument: "{user_text}"

Return ONLY valid JSON in this exact format, with no extra text or markdown:
{{
  "score": <1-10>,
  "argument_quality": <1-10>,
  "evidence_use": <1-10>,
  "rebuttal_strength": <1-10>,
  "feedback": "<1-2 sentence coaching feedback>",
  "coach_tip": "<one specific, actionable improvement suggestion>",
  "fallacies": [
    {{
      "type": "<fallacy name>",
      "explanation": "<brief explanation>"
    }}
  ]
}}

Be honest, helpful, and encouraging. Return an empty array for fallacies if none found.
Write only in English.
"""

        # --------------------------------- PARALLEL LLM CALLS

        def get_ai_response():
            try:
                res = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": debate_system},
                        {"role": "user",   "content": debate_user},
                    ],
                    temperature=DIFFICULTY_TEMPERATURE[difficulty],
                    max_tokens=length_policy["max_tokens"],
                    top_p=0.93,
                    frequency_penalty=0.4,  # Lowered — less penalty on natural vocabulary repetition
                    presence_penalty=0.6,   # Raised — pushes model to explore new argument angles
                )
                response = res.choices[0].message.content.strip()

                # Safety net: only strip clearly robotic openers.
                # We do NOT inject a forced opener — we let the model's own opening stand.
                weak_opener_patterns = [
                    r"^(I disagree[,.]?\s*)",
                    r"^(That'?s? simply not true[,.]?\s*)",
                    r"^(Actually[,.]?\s*)",
                    r"^(Simply put[,.]?\s*)",
                    r"^(You raise a (fair|valid)[,.]?\s*)",
                    r"^(The data tells[,.]?\s*)",
                    r"^(I understand your point[,.]?\s*)",
                    r"^(I see where you[,.]?\s*)",
                    r"^(While I understand[,.]?\s*)",
                    r"^(Although you[,.]?\s*)",
                    r"^(Thank you[,.]?\s*)",
                    r"^(I appreciate[,.]?\s*)",
                    r"^(On the contrary[,.]?\s*)",
                    r"^(That is incorrect[,.]?\s*)",
                    r"^(Interesting point[,.]?\s*)",
                    r"^(Great point[,.]?\s*)",
                ]
                for pattern in weak_opener_patterns:
                    match = re.match(pattern, response, re.IGNORECASE)
                    if match:
                        # Strip the weak opener and let the rest of the response speak
                        response = response[match.end():].strip()
                        # Capitalize the first letter of whatever remains
                        if response:
                            response = response[0].upper() + response[1:]
                        break

                return trim_response_to_policy(response, length_policy)

            except Exception as e:
                print("AI ERROR:", e)
                return "I could not respond. Please try again."

        def get_coach_result():
            try:
                res = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": coach_prompt}],
                    temperature=0.2,
                    max_tokens=300,
                )
                raw = res.choices[0].message.content.strip()
                raw = raw.replace("```json", "").replace("```", "").strip()
                return normalize_coach_result(json.loads(raw))
            except Exception as e:
                print("COACH ERROR:", e)
                return {
                    "scores": {
                        "score": 7, "overall": 7,
                        "argument_quality": 7, "evidence_use": 6, "rebuttal_strength": 7,
                        "feedback":  "Good argument, but make it more specific.",
                        "coach_tip": "Add one concrete example, statistic, or source-backed reason.",
                    },
                    "fallacy_analysis": {"detected": False, "fallacies": []},
                }

        ai_response, coach_result = await asyncio.gather(
            asyncio.to_thread(get_ai_response),
            asyncio.to_thread(get_coach_result),
        )

        print("AI RESPONSE:", ai_response)

        return {
            "user_text":        user_text,
            "ai_response":      ai_response,
            "scores":           coach_result["scores"],
            "fallacy_analysis": coach_result["fallacy_analysis"],
            "turn_complete":    True,
        }

    except Exception as e:
        print("SERVER ERROR:", e)
        return {"error": "Internal server error"}


# ------------------------------------------------------------------ RUN
if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)
