"""
Persistent Background Automation Scheduler for NIAT AI Admission Conversion Engine.
Built with APScheduler and backed by the persistent `automation_jobs` table.
Guarantees:
- Idempotency (UNIQUE lead_id + step constraint)
- Survives server restarts (reloads pending/due jobs from database on startup)
- Exponential backoff retry on failure (base 2 backoff, max 3 attempts)
- IST Quiet Hours Window (09:00 - 21:00 IST): delays outside-hours runs to next 09:00 IST
- Auto-cancellation on student reply, booking, or opt-out
"""

import asyncio
import logging
from datetime import datetime, timedelta
import pytz
from typing import Optional, List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.database import get_db_connection, get_lead_by_id

logger = logging.getLogger("niat.scheduler")
IST = pytz.timezone("Asia/Kolkata")

# Global scheduler instance
scheduler = AsyncIOScheduler(timezone=IST)

def now_ist() -> datetime:
    """Returns current datetime in IST timezone."""
    return datetime.now(IST)

def adjust_for_quiet_hours(run_dt: datetime) -> datetime:
    """
    Enforces the 09:00 - 21:00 IST outreach window.
    If run_dt falls before 09:00 IST, moves to 09:00 IST today.
    If run_dt falls after 21:00 IST, moves to 09:00 IST tomorrow morning.
    """
    if run_dt.tzinfo is None:
        run_dt = IST.localize(run_dt)
    else:
        run_dt = run_dt.astimezone(IST)

    hour = run_dt.hour
    if hour < 9:
        # Move to 09:00 today
        return run_dt.replace(hour=9, minute=0, second=0, microsecond=0)
    elif hour >= 21:
        # Move to 09:00 tomorrow
        tomorrow = run_dt + timedelta(days=1)
        return tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
    return run_dt


async def enqueue_automation_job(
    lead_id: int,
    step: str,
    run_at: datetime,
    max_attempts: int = 3
) -> Optional[int]:
    """
    Enqueues an automation job in the database.
    Guarantees idempotency via UNIQUE(lead_id, step) constraint.
    Adjusts run_at for IST quiet hours.
    """
    adjusted_run_at = adjust_for_quiet_hours(run_at)
    run_at_str = adjusted_run_at.strftime("%Y-%m-%d %H:%M:%S")

    async with get_db_connection() as conn:
        try:
            cursor = await conn.execute("""
            INSERT INTO automation_jobs (lead_id, step, run_at, status, attempts, max_attempts)
            VALUES (?, ?, ?, 'pending', 0, ?)
            ON CONFLICT(lead_id, step) DO NOTHING
            """, (lead_id, step, run_at_str, max_attempts))
            await conn.commit()
            job_id = cursor.lastrowid
            if job_id:
                logger.info(f"Enqueued automation job #{job_id} for lead {lead_id} [{step}] at {run_at_str}")
                return job_id
            else:
                logger.debug(f"Job for lead {lead_id} [{step}] already exists (idempotency preserved).")
                return None
        except Exception as e:
            logger.error(f"Error enqueuing job for lead {lead_id} [{step}]: {e}")
            return None


async def initialize_lead_sequence(lead_id: int, accelerated: bool = False):
    """
    Initializes the standard multi-touch nurturing sequence for a qualified lead:
    - Day 0: Welcome + counselling slot link (immediately or +5 mins)
    - Day 1: Objection handling / personalized curriculum breakdown (+24h or +2 mins if accelerated)
    - Day 3: Social proof + 4-year transparent fee & EMI options (+72h or +4 mins if accelerated)
    """
    lead = await get_lead_by_id(lead_id)
    if not lead or lead.get("opted_out"):
        return

    base_time = now_ist()
    
    if accelerated:
        # Accelerated mode for tests/simulation: minutes instead of days
        d0_time = base_time + timedelta(seconds=2)
        d1_time = base_time + timedelta(seconds=30)
        d3_time = base_time + timedelta(seconds=70)
    else:
        d0_time = base_time + timedelta(minutes=2)
        d1_time = base_time + timedelta(days=1)
        d3_time = base_time + timedelta(days=3)

    await enqueue_automation_job(lead_id, "day_0_welcome", d0_time)
    await enqueue_automation_job(lead_id, "day_1_objection", d1_time)
    await enqueue_automation_job(lead_id, "day_3_social_proof", d3_time)


async def schedule_counselling_reminders(lead_id: int, slot_dt: datetime, accelerated: bool = False):
    """
    Schedules appointment reminders for a booked counselling session:
    - Reminder 24h before
    - Reminder 1h before
    Cancels any generic nurturing steps (day 1, day 3) that are still pending.
    """
    await cancel_pending_sequence(lead_id, reason="counselling_booked")

    if slot_dt.tzinfo is None:
        slot_dt = IST.localize(slot_dt)
    else:
        slot_dt = slot_dt.astimezone(IST)

    if accelerated:
        r24_time = now_ist() + timedelta(seconds=15)
        r1_time = now_ist() + timedelta(seconds=35)
    else:
        r24_time = slot_dt - timedelta(hours=24)
        r1_time = slot_dt - timedelta(hours=1)

    # Only enqueue if time is in the future
    if r24_time > now_ist():
        await enqueue_automation_job(lead_id, "reminder_24h", r24_time)
    if r1_time > now_ist():
        await enqueue_automation_job(lead_id, "reminder_1h", r1_time)


async def cancel_pending_sequence(lead_id: int, reason: str = "opted_out"):
    """Cancels pending jobs for a lead (e.g. on student reply, slot booking, or STOP)."""
    async with get_db_connection() as conn:
        await conn.execute("""
        UPDATE automation_jobs 
        SET status = 'cancelled', last_error = ?, updated_at = CURRENT_TIMESTAMP
        WHERE lead_id = ? AND status = 'pending'
        """, (f"Cancelled: {reason}", lead_id))
        await conn.commit()
    logger.info(f"Cancelled pending automation jobs for lead {lead_id} (Reason: {reason})")


async def get_due_jobs() -> List[Dict[str, Any]]:
    """Fetches pending jobs where run_at <= current time."""
    current_str = now_ist().strftime("%Y-%m-%d %H:%M:%S")
    async with get_db_connection() as conn:
        cursor = await conn.execute("""
        SELECT id, lead_id, step, run_at, status, attempts, max_attempts, last_error
        FROM automation_jobs
        WHERE status = 'pending' AND run_at <= ?
        ORDER BY run_at ASC
        LIMIT 25
        """, (current_str,))
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def execute_job(job: Dict[str, Any]):
    """
    Executes a single automation job with retry and exponential backoff.
    Ensures idempotency by checking lock status.
    """
    job_id = job["id"]
    lead_id = job["lead_id"]
    step = job["step"]
    attempts = job["attempts"] + 1
    max_attempts = job["max_attempts"]

    # 1. Acquire running state atomically
    async with get_db_connection() as conn:
        cursor = await conn.execute("""
        UPDATE automation_jobs
        SET status = 'running', attempts = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
        """, (attempts, job_id))
        await conn.commit()
        if cursor.rowcount == 0:
            # Another worker or run already picked it up
            return

    # 2. Check if lead has opted out or is deleted
    lead = await get_lead_by_id(lead_id)
    if not lead or lead.get("opted_out"):
        async with get_db_connection() as conn:
            await conn.execute("""
            UPDATE automation_jobs SET status = 'skipped', last_error = 'Lead opted out or inactive', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (job_id,))
            await conn.commit()
        return

    # 3. Dispatch the step via the provider layer
    success = False
    error_msg = None
    try:
        from backend.messaging import messaging_service
        from backend.voice import voice_service

        if step.startswith("voice_call"):
            trigger = "counselling_no_show" if "no_show" in step else "hot_unresponsive_48h"
            res = await voice_service.trigger_call(lead, trigger_reason=trigger, attempt_number=attempts)
            success = res.get("success", False)
            if not success:
                error_msg = res.get("error", "Voice call failed")
        else:
            # WhatsApp sequence step or feedback flow
            res = await messaging_service.send_sequence_message(lead, step=step)
            success = res.get("success", False)
            if not success:
                error_msg = res.get("error", "Message delivery failed")

    except Exception as exc:
        success = False
        error_msg = str(exc)
        logger.exception(f"Unhandled exception executing job #{job_id}: {exc}")

    # 4. Handle success or retry with exponential backoff
    async with get_db_connection() as conn:
        if success:
            await conn.execute("""
            UPDATE automation_jobs SET status = 'completed', last_error = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (job_id,))
            logger.info(f"Job #{job_id} [{step}] completed successfully for lead {lead_id}.")
        else:
            if attempts < max_attempts:
                # Exponential backoff: base 2 minutes * 2^(attempts - 1)
                backoff_seconds = (2 ** (attempts - 1)) * 60
                retry_run_at = adjust_for_quiet_hours(now_ist() + timedelta(seconds=backoff_seconds))
                retry_str = retry_run_at.strftime("%Y-%m-%d %H:%M:%S")
                await conn.execute("""
                UPDATE automation_jobs 
                SET status = 'pending', run_at = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, (retry_str, f"Attempt {attempts} failed: {error_msg}", job_id))
                logger.warning(f"Job #{job_id} failed. Retrying at {retry_str} (Attempt {attempts}/{max_attempts})")
            else:
                await conn.execute("""
                UPDATE automation_jobs 
                SET status = 'failed', last_error = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, (f"Max attempts exceeded: {error_msg}", job_id))
                logger.error(f"Job #{job_id} failed permanently after {attempts} attempts.")
        await conn.commit()


async def process_due_jobs_tick():
    """Periodic tick called every 10 seconds to pick up due automation jobs."""
    try:
        due = await get_due_jobs()
        if due:
            logger.info(f"Scheduler tick: found {len(due)} due automation jobs.")
            for job in due:
                await execute_job(job)
    except Exception as e:
        logger.error(f"Error in scheduler tick: {e}")


def start_scheduler():
    """Starts the background APScheduler."""
    if not scheduler.running:
        scheduler.add_job(process_due_jobs_tick, "interval", seconds=10, id="automation_jobs_tick", replace_existing=True)
        scheduler.start()
        logger.info("APScheduler initialized and running with IST timezone and persistent SQLite/Postgres backing.")


def shutdown_scheduler():
    """Gracefully shuts down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
