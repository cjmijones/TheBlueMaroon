# app/models/user.py
from datetime import datetime
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base

class User(Base):
    __tablename__ = "users"

    id          = Column(String, primary_key=True)           # Auth0 sub
    email       = Column(String, unique=True, index=True)
    name        = Column(String)
    picture     = Column(String)
    created_at  = Column(DateTime, default=func.now())
    last_login  = Column(DateTime)

    # relationships -------------------------------------------------
    wallets       = relationship("Wallet", back_populates="user")
    socials       = relationship("SocialLink", back_populates="user")
    addresses     = relationship("Address", back_populates="user")
    roles         = relationship("Role", secondary="user_roles", back_populates="users")
    notifications = relationship("Notification", back_populates="user")
    audits        = relationship("AuditEvent", back_populates="user")

    # NEW  ⇣
    verification  = relationship(
        "UserVerification",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan"
    )
