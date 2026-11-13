import asyncio
import json
import logging
from typing import Dict, Set, Any
from datetime import datetime

logger = logging.getLogger("finos.broadcaster")

class DashboardEventBroadcaster:
    """
    Tenant-Isolated Asynchronous Event Bus:
    Manages live SSE subscriber queues per tenant organization and dispatches
    real-time KPI mutation events when financial records change.
    """
    _subscribers: Dict[str, Set[asyncio.Queue]] = {}

    @classmethod
    async def subscribe(cls, organization_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        if organization_id not in cls._subscribers:
            cls._subscribers[organization_id] = set()
        cls._subscribers[organization_id].add(queue)
        logger.info(f"Tenant {organization_id} registered new SSE subscriber (Total: {len(cls._subscribers[organization_id])})")
        return queue

    @classmethod
    async def unsubscribe(cls, organization_id: str, queue: asyncio.Queue) -> None:
        if organization_id in cls._subscribers:
            cls._subscribers[organization_id].discard(queue)
            if not cls._subscribers[organization_id]:
                del cls._subscribers[organization_id]
        logger.info(f"Tenant {organization_id} removed SSE subscriber")

    @classmethod
    async def broadcast(cls, organization_id: str, event_type: str, payload: Dict[str, Any]) -> int:
        """Dispatches an event payload strictly to subscribers of the specified tenant."""
        if organization_id not in cls._subscribers:
            return 0

        event_message = {
            "event": event_type,
            "organization_id": organization_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": payload
        }
        
        dead_queues = set()
        notified = 0

        for queue in cls._subscribers[organization_id]:
            try:
                queue.put_nowait(event_message)
                notified += 1
            except Exception:
                dead_queues.add(queue)

        for dead in dead_queues:
            cls._subscribers[organization_id].discard(dead)

        logger.info(f"Dispatched '{event_type}' to {notified} live subscriber(s) for tenant {organization_id}")
        return notified
