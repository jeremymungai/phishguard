import asyncio
import json
from typing import AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

# Active subscriber queues
subscribers: list[asyncio.Queue] = []

def broadcast_event(event_data: dict):
    """Broadcasts an event dict to all connected SSE clients."""
    for q in subscribers:
        try:
            q.put_nowait(event_data)
        except Exception:
            pass

async def event_generator() -> AsyncGenerator[str, None]:
    q = asyncio.Queue()
    subscribers.append(q)
    try:
        # Send initial connection confirmation
        yield f"event: connected\ndata: {json.dumps({'message': 'Connected to PhishGuard Event Stream'})}\n\n"
        while True:
            data = await q.get()
            yield f"event: {data.get('event', 'message')}\ndata: {json.dumps(data)}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        if q in subscribers:
            subscribers.remove(q)

@router.get("/stream")
async def get_event_stream():
    """Server-Sent Events endpoint for real-time dashboard live feed."""
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )