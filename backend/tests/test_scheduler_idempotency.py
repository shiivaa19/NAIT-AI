"""
Pytest unit tests for APScheduler persistent automation engine and idempotency.
Verifies:
- Idempotency: Duplicate enqueue calls for same lead and step never create duplicate jobs.
- Quiet Hours: Adjusts execution window to 09:00-21:00 IST.
- Auto-cancellation: Opt-out or student booking immediately cancels pending nurture jobs.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
import pytz

from backend.database import init_db, save_lead, get_db_connection
from backend.scheduler import (
    enqueue_automation_job,
    cancel_pending_sequence,
    adjust_for_quiet_hours,
    now_ist,
    IST
)

@pytest.mark.asyncio
async def test_scheduler_idempotency():
    await init_db()
    
    # 1. Create a dummy lead
    lead_data = {
        "student_name": "Kavya Reddy",
        "phone": "+919988776655",
        "email": "kavya@test.com",
        "state": "Andhra Pradesh",
        "city": "Vijayawada",
        "target_intake_year": 2026,
        "preferred_campus": "GMR Institute of Technology",
        "consent_given": True
    }
    lead_id = await save_lead(lead_data)
    
    run_time = now_ist() + timedelta(hours=2)
    
    # 2. Enqueue same step twice
    job1_id = await enqueue_automation_job(lead_id, "day_0_welcome", run_time)
    job2_id = await enqueue_automation_job(lead_id, "day_0_welcome", run_time)
    
    assert job1_id is not None, "First job enqueue must succeed"
    assert job2_id is None, "Second duplicate enqueue for same lead & step must return None (idempotent)"
    
    # 3. Verify exactly 1 job exists in database
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT COUNT(*) as count FROM automation_jobs WHERE lead_id = ? AND step = ?",
            (lead_id, "day_0_welcome")
        )
        row = await cursor.fetchone()
        assert row["count"] == 1

@pytest.mark.asyncio
async def test_quiet_hours_adjustment():
    # Outside quiet hours: 23:30 IST night -> should adjust to 09:00 AM next day
    late_night = IST.localize(datetime(2026, 10, 15, 23, 30, 0))
    adjusted = adjust_for_quiet_hours(late_night)
    assert adjusted.hour == 9
    assert adjusted.minute == 0
    assert adjusted.day == 16

    # Outside quiet hours: 04:15 AM early morning -> should adjust to 09:00 AM today
    early_morning = IST.localize(datetime(2026, 10, 15, 4, 15, 0))
    adjusted_early = adjust_for_quiet_hours(early_morning)
    assert adjusted_early.hour == 9
    assert adjusted_early.minute == 0
    assert adjusted_early.day == 15

    # Within quiet hours: 14:30 PM afternoon -> remains unchanged
    afternoon = IST.localize(datetime(2026, 10, 15, 14, 30, 0))
    adjusted_afternoon = adjust_for_quiet_hours(afternoon)
    assert adjusted_afternoon.hour == 14
    assert adjusted_afternoon.minute == 30

@pytest.mark.asyncio
async def test_cancel_pending_sequence():
    await init_db()
    lead_data = {
        "student_name": "Manish Verma",
        "phone": "+919871112233",
        "email": "manish@test.com",
        "state": "Karnataka",
        "city": "Bangalore",
        "consent_given": True
    }
    lead_id = await save_lead(lead_data)
    
    # Enqueue two steps
    await enqueue_automation_job(lead_id, "day_1_objection", now_ist() + timedelta(days=1))
    await enqueue_automation_job(lead_id, "day_3_social_proof", now_ist() + timedelta(days=3))
    
    # Cancel sequence
    await cancel_pending_sequence(lead_id, reason="opted_out")
    
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT status, last_error FROM automation_jobs WHERE lead_id = ?",
            (lead_id,)
        )
        rows = await cursor.fetchall()
        for r in rows:
            assert r["status"] == "cancelled"
            assert "opted_out" in r["last_error"]
