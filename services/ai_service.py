import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("AIzaSyDVTl6AjLVPoUY_WrEUa718UOexMSNxrug"))

DEBATE_PROMPT = """You are an expert debate opponent.
Your job is to argue the OPPOSITE side of the user.

Rules:
1. Stay strictly on the debate topic
2. Give one clear counter argument
3. Use facts and logic only
4. Keep response under 80 words
5. End with one challenging question
6. Be aggressive but respectful

Topic: {topic}
Your position: {ai_position}"""

async def generate_counter_argument(
    user_argument: str,
    topic: str,
    ai_position: str,
    debate_history: list
):
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    history_text = ""
    for turn in debate_history:
        history_text += f"User: {turn['user']}\n"
        history_text += f"AI: {turn['ai']}\n"
    
    prompt = f"""{DEBATE_PROMPT.format(
        topic=topic,
        ai_position=ai_position
    )}

Debate history so far:
{history_text}

User just said: {user_argument}

Your counter argument:"""

    response = model.generate_content(prompt)
    return response.text