"""add_workspace_member_invited_by

Revision ID: c91d44e5fbf4
Revises: 9b5cfece90a7
Create Date: 2026-07-19 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c91d44e5fbf4'
down_revision: Union[str, Sequence[str], None] = '9b5cfece90a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('workspace_members', sa.Column('invited_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))


def downgrade() -> None:
    op.drop_column('workspace_members', 'invited_by')
