"""
Pytest unit tests for WhatsApp webhooks, opt-out compliance, and escalation flags.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.database import init_db, save_lead, get_lead_by_id, get_db_connection
from backend.config import settings

@pytest.mark.asyncio
async def test_meta_webhook_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Correct token
        res = await client.get("/api/webhooks/whatsapp", params={
            "hub.mode": "subscribe",
            "hub.challenge": "12345678",
            "hub.verify_token": settings.META_VERIFY_TOKEN
        })
        assert res.status_code == 200
        assert res.text == "12345678"

        # Wrong token -> 403 Forbidden
        res_bad = await client.get("/api/webhooks/whatsapp", params={
            "hub.mode": "subscribe",
            "hub.challenge": "12345678",
            "hub.verify_token": "wrong_token"
        })
        assert res_bad.status_code == 403

@pytest.mark.asyncio
async def test_inbound_stop_opt_out():
    await init_db()
    lead_data = {
        "student_name": "Deepak Kumar",
        "phone": "+919876500001",
        "email": "deepak@test.com",
        "state": "Telangana",
        "consent_given": True
    }
    lead_id = await save_lead(lead_data)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/webhooks/whatsapp", json={
            "from": "+919876500001",
            "body": "STOP",
            "channel": "mock"
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("action") == "opted_out"
        assert data.get("lead_id") == lead_id

    # Verify lead status updated to closed and opted_out = 1
    updated_lead = await get_lead_by_id(lead_id)
    assert updated_lead["opted_out"] is True
    assert updated_lead["status"] == "closed"

@pytest.mark.asyncio
async def test_inbound_human_escalation():
    await init_db()
    lead_data = {
        "student_name": "Sita Rao",
        "phone": "+919876500002",
        "email": "sita@test.com",
        "state": "Andhra Pradesh",
        "consent_given": True
    }
    lead_id = await save_lead(lead_data)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/webhooks/whatsapp", json={
            "from": "+919876500002",
            "body": "I want to talk to a real human counsellor right now regarding my scholarship.",
            "channel": "mock"
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("escalated_to_human") is True
        assert data.get("confidence_score") <= 0.65

    # Verify message row has escalated_to_human = 1
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT escalated_to_human FROM whatsapp_messages WHERE lead_id = ? AND direction = 'inbound'",
            (lead_id,)
        )
        row = await cursor.fetchone()
        assert row is not None
        assert row["escalated_to_human"] == 1
