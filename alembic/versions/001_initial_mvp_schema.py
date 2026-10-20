"""initial mvp schema with rls

Revision ID: 001_initial_mvp_schema
Revises: 
Create Date: 2026-03-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_mvp_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Organizations (Tenants / F1 Workspace)
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('gstin', sa.String(length=15), nullable=True),
        sa.Column('pan', sa.String(length=10), nullable=True),
        sa.Column('financial_year_start', sa.String(length=10), server_default='04-01', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # 2. Users (F13 Access & Security - 3 roles: admin, finance_user, viewer)
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='finance_user', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # 3. Source Files (F2 Vault & Hashing)
    op.create_table(
        'source_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('sha256_hash', sa.CHAR(length=64), nullable=False, index=True),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('period_start', sa.Date(), nullable=True),
        sa.Column('period_end', sa.Date(), nullable=True)
    )

    # 4. Bank Transactions
    op.create_table(
        'bank_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('source_files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('narration', sa.Text(), nullable=True),
        sa.Column('debit_paise', sa.Numeric(precision=20, scale=0), nullable=False, default=0),
        sa.Column('credit_paise', sa.Numeric(precision=20, scale=0), nullable=False, default=0),
        sa.Column('balance_paise', sa.Numeric(precision=20, scale=0), nullable=True),
        sa.Column('reference', sa.String(length=100), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # 5. Settlements
    op.create_table(
        'settlements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('source_files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('settlement_id', sa.String(length=100), nullable=False, index=True),
        sa.Column('gross_amount_paise', sa.Numeric(precision=20, scale=0), nullable=False),
        sa.Column('fee_paise', sa.Numeric(precision=20, scale=0), nullable=False),
        sa.Column('gst_on_fee_paise', sa.Numeric(precision=20, scale=0), nullable=True, default=0),
        sa.Column('refunds_paise', sa.Numeric(precision=20, scale=0), nullable=True, default=0),
        sa.Column('holds_paise', sa.Numeric(precision=20, scale=0), nullable=True, default=0),
        sa.Column('net_amount_paise', sa.Numeric(precision=20, scale=0), nullable=False),
        sa.Column('settlement_date', sa.Date(), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # 6. Ledger Entries
    op.create_table(
        'ledger_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('source_files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('voucher_date', sa.Date(), nullable=False, index=True),
        sa.Column('voucher_type', sa.String(length=50), nullable=True),
        sa.Column('party_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('amount_paise', sa.Numeric(precision=20, scale=0), nullable=False),
        sa.Column('ledger_name', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default="now()", nullable=False)
    )

    # 7. Matches, Discrepancies & Cases
    op.create_table(
        'matches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('match_type', sa.String(length=50), nullable=False),
        sa.Column('matched_record_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False),
        sa.Column('confidence_score', sa.Numeric(precision=3, scale=2), nullable=False),
        sa.Column('reason_code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default="now()", nullable=False)
    )

    op.create_table(
        'discrepancies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('check_type', sa.String(length=50), nullable=False),
        sa.Column('reason_code', sa.String(length=50), nullable=False),
        sa.Column('amount_paise', sa.Numeric(precision=20, scale=0), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='OPEN', nullable=False, index=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default="now()", nullable=False)
    )

    op.create_table(
        'cases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('discrepancy_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('discrepancies.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('status', sa.String(length=20), server_default='OPEN', nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('resolution', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default="now()", nullable=False)
    )

    # --- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES ---
    tables = ['users', 'source_files', 'bank_transactions', 'settlements', 'ledger_entries', 'matches', 'discrepancies', 'cases']
    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"""
            CREATE POLICY org_isolation_policy ON {table}
            FOR ALL
            USING (organization_id = current_setting('app.current_org_id', true)::UUID);
        """)

def downgrade() -> None:
    tables = ['cases', 'discrepancies', 'matches', 'ledger_entries', 'settlements', 'bank_transactions', 'source_files', 'users', 'organizations']
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS org_isolation_policy ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
        op.drop_table(table)