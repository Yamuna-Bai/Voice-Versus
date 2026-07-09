from fastapi import APIRouter
import asyncio
from services.ai_service import generate_counter_argument
from services.fallacy_service import detect_fallacies
from services.scoring_service import score_argument
from pydantic import BaseModel

router = APIRouter()

class DebateTurn(BaseModel):
    user_argument: str
    topic: str
    ai_position: str
    debate_history: list = []

@router.post("/turn")
async def debate_turn(turn: DebateTurn):
    
    # Run all 3 simultaneously
    counter, fallacies, scores = await asyncio.gather(
        generate_counter_argument(
            turn.user_argument,
            turn.topic,
            turn.ai_position,
            turn.debate_history
        ),
        detect_fallacies(turn.user_argument),
        score_argument(turn.user_argument, turn.topic)
    )
    
    return {
        "ai_response": counter,
        "fallacy_analysis": fallacies,
        "scores": scores,
        "turn_complete": True
    }

@router.get("/topics")
def get_topics():
    return {
        "topics": [
            {
                "id": 1,
                "title": "AI will replace human jobs",
                "category": "Technology"
            },
            {
                "id": 2,
                "title": "Social media does more harm than good",
                "category": "Society"
            },
            {
                "id": 3,
                "title": "Online education is better than classroom",
                "category": "Education"
            },
            {
                "id": 4,
                "title": "Climate change is the biggest global threat",
                "category": "Environment"
            },
            {
                "id": 5,
                "title": "Cryptocurrency is the future of money",
                "category": "Economics"
            },
            {
                "id": 6,
                "title": "Death penalty should be abolished",
                "category": "Politics"
            }
        ]
    }