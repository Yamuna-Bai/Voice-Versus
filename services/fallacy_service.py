import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("AIzaSyDVTl6AjLVPoUY_WrEUa718UOexMSNxrug"))

async def detect_fallacies(argument: str):
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""Analyze this argument for logical fallacies.
Choose ONLY from these 10 types:
ad_hominem, straw_man, false_dichotomy, 
slippery_slope, appeal_to_authority, 
hasty_generalization, circular_reasoning,
appeal_to_tradition, bandwagon, red_herring

Argument: {argument}

Respond ONLY in this exact JSON format:
{{
  "detected": true or false,
  "fallacies": [
    {{
      "type": "fallacy_id",
      "confidence": "high or medium or low",
      "explanation": "one sentence why"
    }}
  ]
}}

No extra text. Just JSON."""

    response = model.generate_content(prompt)
    text = response.text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)