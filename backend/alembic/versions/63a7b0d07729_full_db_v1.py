"""Full_DB_v1

Revision ID: 63a7b0d07729
Revises: 305fa484561e
Create Date: 2025-05-27 03:10:55.461342

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63a7b0d07729'
down_revision: Union[str, None] = '305fa484561e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('nfts',
    sa.Column('token_id', sa.String(), nullable=False),
    sa.Column('contract', sa.String(), nullable=True),
    sa.Column('chain_id', sa.Integer(), nullable=True),
    sa.Column('metadata_uri', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('token_id')
    )
    op.create_table('roles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('slug', sa.String(), nullable=True),
    sa.Column('description', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug')
    )
    op.create_table('addresses',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.String(), nullable=True),
    sa.Column('country', sa.String(), nullable=True),
    sa.Column('state', sa.String(), nullable=True),
    sa.Column('city', sa.String(), nullable=True),
    sa.Column('postal_code', sa.String(), nullable=True),
    sa.Column('tax_id', sa.String(), nullable=True),
    sa.Column('label', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('audit_events',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.String(), nullable=True),
    sa.Column('action', sa.String(), nullable=True),
    sa.Column('audit_event_metadata', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('notifications',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.String(), nullable=True),
    sa.Column('type', sa.String(), nullable=True),
    sa.Column('payload', sa.JSON(), nullable=True),
    sa.Column('read_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('social_links',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.String(), nullable=True),
    sa.Column('platform', sa.String(), nullable=True),
    sa.Column('url', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'platform', name='uq_user_platform')
    )
    op.create_table('user_roles',
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('role_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('user_id', 'role_id')
    )
    op.create_table('wallets',
    sa.Column('address', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=True),
    sa.Column('chain_id', sa.Integer(), nullable=True),
    sa.Column('ens_name', sa.String(), nullable=True),
    sa.Column('is_primary', sa.Boolean(), nullable=True),
    sa.Column('linked_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('address')
    )
    op.create_table('listings',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('seller_wallet_address', sa.String(), nullable=True),
    sa.Column('title', sa.String(), nullable=True),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('price_wei', sa.Numeric(precision=78, scale=0), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['seller_wallet_address'], ['wallets.address'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('transactions',
    sa.Column('hash', sa.String(), nullable=False),
    sa.Column('wallet_address', sa.String(), nullable=True),
    sa.Column('chain_id', sa.Integer(), nullable=True),
    sa.Column('method', sa.String(), nullable=True),
    sa.Column('payload_json', sa.JSON(), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['wallet_address'], ['wallets.address'], ),
    sa.PrimaryKeyConstraint('hash')
    )
    op.create_table('user_nfts',
    sa.Column('wallet_address', sa.String(), nullable=False),
    sa.Column('token_id', sa.String(), nullable=False),
    sa.Column('acquired_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['token_id'], ['nfts.token_id'], ),
    sa.ForeignKeyConstraint(['wallet_address'], ['wallets.address'], ),
    sa.PrimaryKeyConstraint('wallet_address', 'token_id')
    )
    op.create_table('orders',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('buyer_wallet_address', sa.String(), nullable=True),
    sa.Column('listing_id', sa.Integer(), nullable=True),
    sa.Column('amount_wei', sa.Numeric(precision=78, scale=0), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('tx_hash', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['buyer_wallet_address'], ['wallets.address'], ),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ),
    sa.ForeignKeyConstraint(['tx_hash'], ['transactions.hash'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('orders')
    op.drop_table('user_nfts')
    op.drop_table('transactions')
    op.drop_table('listings')
    op.drop_table('wallets')
    op.drop_table('user_roles')
    op.drop_table('social_links')
    op.drop_table('notifications')
    op.drop_table('audit_events')
    op.drop_table('addresses')
    op.drop_table('roles')
    op.drop_table('nfts')
    # ### end Alembic commands ###
