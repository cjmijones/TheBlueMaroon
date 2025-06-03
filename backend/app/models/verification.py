# app/models/verification.py
from datetime import datetime
from uuid import UUID
from sqlalchemy import Column, String, DateTime, SmallInteger, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class UserVerification(Base):
    __tablename__ = "user_verification"

    user_id          = Column(String, ForeignKey("users.id"), primary_key=True)
    didit_session_id = Column(String)
    id_verified_at   = Column(DateTime)
    aml_status       = Column(String(16), default="pending")  # pending|clear|reject
    aml_score        = Column(SmallInteger)
    aml_checked_at   = Column(DateTime)
    created_at       = Column(DateTime, default=datetime.now())
    updated_at       = Column(DateTime, default=datetime.now(),
                              onupdate=datetime.now())

    # back-reference
    user = relationship("User", back_populates="verification")
