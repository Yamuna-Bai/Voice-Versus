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
    assert normalize_difficulty("easy") == "hard"


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
    turns = [{"scores": {"overall": 8}}, {"scores": {"overall": 6}}]
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
