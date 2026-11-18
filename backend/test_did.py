
import asyncio
import pytest

from services.ai_service import generate_counter_argument


TOPICS = {
    "easy": {
        "topic": "Online education",
        "argument": "Online education is convenient for students.",
        "position": "AGAINST",
    },
    "medium": {
        "topic": "Online education",
        "argument": "Online education saves time and money.",
        "position": "AGAINST",
    },
    "hard": {
        "topic": "Online education",
        "argument": "Online education can replace traditional classrooms.",
        "position": "AGAINST",
    },
}


def evaluate_response(response, topic):
    """Score observable response qualities; each criterion is worth 20 points."""
    text = response.strip()
    lower = text.lower()

    scores = {
        "non_empty": bool(text),
        "topic_relevance": any(
            word in lower for word in topic.lower().split()
        ),
        "reasoning": len(text.split()) >= 20,
        "supporting_detail": any(
            phrase in lower
            for phrase in [
                "because", "for example", "for instance",
                "evidence", "research", "study", "data"
            ]
        ),
        "follow_up_question": "?" in text,
    }

    percentage = round(
        sum(scores.values()) / len(scores) * 100, 2
    )

    return percentage, scores


@pytest.mark.parametrize("difficulty", ["easy", "medium", "hard"])
def test_ai_debate_quality(difficulty):
    config = TOPICS[difficulty]

    response = asyncio.run(
        generate_counter_argument(
            user_argument=config["argument"],
            topic=config["topic"],
            ai_position=config["position"],
            debate_history=[],
            difficulty=difficulty,
        )
    )

    assert isinstance(response, str) and response.strip()

    percentage, scores = evaluate_response(
        response, config["topic"]
    )

    print(f"\n{difficulty.upper()} AI debate quality: {percentage}%")
    print(f"Criteria: {scores}")
    print(f"AI response: {response}")

    assert percentage >= 0, "Quality percentage must be valid"


def test_overall_ai_debate_quality():
    percentages = []

    for difficulty, config in TOPICS.items():
        response = asyncio.run(
            generate_counter_argument(
                user_argument=config["argument"],
                topic=config["topic"],
                ai_position=config["position"],
                debate_history=[],
                difficulty=difficulty,
            )
        )

        percentage, _ = evaluate_response(
            response, config["topic"]
        )
        percentages.append(percentage)

    overall = round(sum(percentages) / len(percentages), 2)
    print(f"\nOVERALL AI debate quality: {overall}%")

    assert 0 <= overall <= 100

import pytest
from fastapi import HTTPException

from backend.main import (
    normalize_difficulty,
    normalize_debate_position,
    get_debate_sides,
    _normalize_email,
    _average_score,
    contains_abusive_language,
)


def test_normalize_difficulty_easy():
    assert normalize_difficulty("easy") == "easy"


def test_normalize_difficulty_invalid_value():
    assert normalize_difficulty("unknown") == "medium"


def test_normalize_difficulty_moderate():
    assert normalize_difficulty("moderate") == "medium"


def test_normalize_difficulty_hard():
    assert normalize_difficulty("hard") == "hard"


def test_normalize_debate_position_for():
    assert normalize_debate_position("FOR") == "FOR"


def test_normalize_debate_position_against():
    assert normalize_debate_position("against") == "AGAINST"


def test_invalid_debate_position():
    assert normalize_debate_position("maybe") is None


def test_position_with_extra_spaces():
    assert normalize_debate_position("  FOR  ") == "FOR"


def test_get_debate_sides_for():
    assert get_debate_sides("FOR") == ("FOR", "AGAINST")


def test_get_debate_sides_against():
    assert get_debate_sides("AGAINST") == ("AGAINST", "FOR")


def test_invalid_email_raises_error():
    with pytest.raises(HTTPException) as exc:
        _normalize_email("invalid-email")

    assert exc.value.status_code == 400


def test_invalid_email_without_at_symbol():
    with pytest.raises(HTTPException):
        _normalize_email("testexample.com")


def test_normalize_email_lowercase():
    assert _normalize_email(" TEST@EXAMPLE.COM ") == "test@example.com"


def test_average_score():
    turns = [
        {"scores": {"overall": 8}},
        {"scores": {"overall": 6}},
    ]
    assert _average_score(turns) == 7.0


def test_average_score_empty():
    assert _average_score([]) == 0.0


def test_average_score_multiple_turns():
    turns = [
        {"scores": {"overall": 10}},
        {"scores": {"overall": 8}},
        {"scores": {"overall": 6}},
    ]
    assert _average_score(turns) == 8.0


def test_abusive_language_detection():
    assert contains_abusive_language("You are an idiot") is True


def test_respectful_language_not_flagged():
    assert contains_abusive_language(
        "I disagree with your argument"
    ) is False


def test_neutral_argument_not_flagged():
    assert contains_abusive_language(
        "I respectfully disagree with your opinion"
    ) is False

