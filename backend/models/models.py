from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from backend.models.database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login_at = Column(DateTime, default=datetime.datetime.utcnow)

class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100))
    user_email = Column(String(255), index=True)
    topic = Column(String(255))
    position = Column(String(30))
    difficulty = Column(String(30))
    overall_score = Column(Float)
    fluency_score = Column(Float)
    relevance_score = Column(Float)
    persuasion_score = Column(Float)
    confidence_score = Column(Float)
    fallacies_detected = Column(Text)
    ai_feedback = Column(Text)
    turns_json = Column(Text)
    report_json = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
