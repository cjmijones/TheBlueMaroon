import asyncio
from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from sqlalchemy.orm import declarative_base
from alembic import context
import os
import ssl
from dotenv import load_dotenv

# Load env vars
load_dotenv()

ssl_ctx = ssl.create_default_context()

# This is the Alembic Config object
config = context.config
fileConfig(config.config_file_name)

# Your model metadata
from app.models import Base  # ⬅️ import your Base here
# Base = declarative_base()

target_metadata = Base.metadata

print(f"This should be the target metadata: {target_metadata.tables.keys()}")

# Get DB URL from env
SYNC_DATABASE_URL = os.getenv("SYNC_DATABASE_URL")

def run_migrations_offline():
    """Run migrations without DB connection (not recommended for async)."""
    context.configure(
        url=SYNC_DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = create_engine(SYNC_DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,            # ← autogen diff helpers
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

def run():
    print("Is offline? ", context.is_offline_mode())
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()

run()
