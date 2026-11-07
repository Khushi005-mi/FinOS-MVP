from fastapi import APIRouter
from app.api.v1 import (
    payment_policy,
    vendors_admin,
    auth,
    profiles,
    vault,
    adapters,
    reconciliation,
    discrepancy,
    movement,
    reports,
    dashboard,
    ask,
    payables,
    cash,
    connections,
    admin,
    admin_controls
)

api_router = APIRouter()

# Authentication & Session Management
api_router.include_router(auth.router)

# Tenant Profile & Vault
api_router.include_router(profiles.router)
api_router.include_router(vault.router)
api_router.include_router(adapters.router)
api_router.include_router(reconciliation.router)
api_router.include_router(discrepancy.router)
api_router.include_router(movement.router)
api_router.include_router(reports.router)
api_router.include_router(dashboard.router)
api_router.include_router(ask.router)
api_router.include_router(payables.router)
api_router.include_router(vendors_admin.router, prefix="/vendors-admin", tags=["vendors-admin"])
api_router.include_router(payment_policy.router, prefix="/payment-policy", tags=["payment-policy"])
api_router.include_router(cash.router)
api_router.include_router(connections.router)
api_router.include_router(admin.router)
api_router.include_router(admin_controls.router)
