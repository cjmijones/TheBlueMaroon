"""app assets and transaction lifecycle

Revision ID: 2f4b7e9c1d2a
Revises: 11b59f7832e2
Create Date: 2026-05-14 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2f4b7e9c1d2a"
down_revision: Union[str, None] = "11b59f7832e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("creator_id", sa.String(), nullable=False),
        sa.Column("owner_wallet_address", sa.String(length=42), nullable=True),
        sa.Column("chain_id", sa.Integer(), nullable=True),
        sa.Column("nft_contract", sa.String(length=42), nullable=True),
        sa.Column("token_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata_uri", sa.String(), nullable=False),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("status", sa.String(), server_default="metadata_ready", nullable=False),
        sa.Column("mint_tx_hash", sa.String(length=66), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_app_assets_creator_id", "app_assets", ["creator_id"])
    op.create_index("ix_app_assets_chain_contract_token", "app_assets", ["chain_id", "nft_contract", "token_id"])

    op.add_column("transactions", sa.Column("user_id", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True))
    op.create_foreign_key("transactions_user_id_fkey", "transactions", "users", ["user_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_transactions_user_id_created_at", "transactions", ["user_id", "created_at"])

    op.add_column("fractional_listings", sa.Column("status", sa.String(), server_default="draft", nullable=False))
    op.add_column("fractional_listings", sa.Column("tx_hash", sa.String(length=66), nullable=True))
    op.add_column("fractional_listings", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    op.create_index("ix_fractional_listings_creator_status", "fractional_listings", ["creator_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_fractional_listings_creator_status", table_name="fractional_listings")
    op.drop_column("fractional_listings", "updated_at")
    op.drop_column("fractional_listings", "tx_hash")
    op.drop_column("fractional_listings", "status")

    op.drop_index("ix_transactions_user_id_created_at", table_name="transactions")
    op.drop_constraint("transactions_user_id_fkey", "transactions", type_="foreignkey")
    op.drop_column("transactions", "updated_at")
    op.drop_column("transactions", "user_id")

    op.drop_index("ix_app_assets_chain_contract_token", table_name="app_assets")
    op.drop_index("ix_app_assets_creator_id", table_name="app_assets")
    op.drop_table("app_assets")
