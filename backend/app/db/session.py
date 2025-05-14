# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import ssl
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ssl_ctx = ssl.create_default_context()

# ✅ Fix: Add pool_pre_ping and pool_recycle to avoid stale connections
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"ssl": ssl_ctx},
    pool_pre_ping=True,       # 💡 verifies connection is alive before each use
    pool_recycle=1800,         # 💡 recycles connection every 30 minutes (Neon safe)
    pool_size=5, 
    max_overflow=0
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# ✅ Optional: ensure session is closed even on exception
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
