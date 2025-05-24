# app/db/session.py

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import ssl
from app.core.config import get_settings  # ✅ NEW: use app settings

# ✅ Load app settings
settings = get_settings()

# ✅ Dynamically select correct DB URL
db_url = settings.get_db_url()

# ✅ SSL only if Neon is used
ssl_ctx = ssl.create_default_context()
connect_args = {"ssl": ssl_ctx} if "neon.tech" in db_url else {}

# ✅ Fix: Add pool_pre_ping and pool_recycle to avoid stale connections
engine = create_async_engine(
    db_url,
    echo=settings.debug,
    connect_args=connect_args,
    pool_pre_ping=True,        # 💡 verifies connection is alive before each use
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
