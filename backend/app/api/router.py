from fastapi import APIRouter
from app.api.v1 import (
    auth,
    profiles,
    vault,
    adapters,
    reconciliation,
    discrepancy,
    movement,
    dashboard,
    payables,
    ask,
    reports,
    admin,
    admin_controls,
    connections,
)

api_router = APIRouter()

# 1. Auth & Workspace
api_router.include_router(auth.router)
api_router.include_router(profiles.router)

# 2. Vault & Ingestion
api_router.include_router(vault.router)
api_router.include_router(adapters.router)

# 3. Deterministic Matching & Exceptions
api_router.include_router(reconciliation.router)
api_router.include_router(discrepancy.router)
api_router.include_router(movement.router)

# 4. Truth Dashboard & Decision Queue
api_router.include_router(dashboard.router)
api_router.include_router(payables.router)

# 5. Guarded Assistant & Compliance Reports
api_router.include_router(ask.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)

# 6. Admin Governance & Connection Requests
api_router.include_router(admin_controls.router)
api_router.include_router(connections.router)