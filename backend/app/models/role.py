from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    JSON, UniqueConstraint, func, Numeric
)
from sqlalchemy.orm import declarative_base, relationship

from .base import Base

# ──────────────────── RBAC ────────────────────
class Role(Base):
    __tablename__ = "roles"

    id          = Column(Integer, primary_key=True)
    slug        = Column(String, unique=True)
    description = Column(String)

    users       = relationship("User", secondary="user_roles",
                               back_populates="roles")
