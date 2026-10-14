"""
AI Calling Agent & Telephony Provider Layer for NIAT Admission Conversion Engine.
Supports:
- Provider abstraction: MockVoiceProvider (default) and VapiVoiceProvider (live)
- Grounded outbound scripts customized to lead's stated campus, concerns, and trigger reason:
  * 'hot_unresponsive_48h': Non-responsive high-intent candidate
  * 'counselling_no_show': Candidate missed scheduled counselling session
- Call-ended webhook handling: logs transcript, summary, duration, and outcome:
  ('interested', 'reschedule', 'not_interested', 'unreachable')
- Maximum 2 call attempts per lead.
"""

import uuid
import logging
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime

from backend.config import settings
from backend.database import get_db_connection, get_lead_by_id

logger = logging.getLogger("niat.voice")

class VoiceProvider(ABC):
    """Abstract interface for outbound AI calling agents."""

    @abstractmethod
    async def trigger_call(self, lead: Dict[str, Any], trigger_reason: str, attempt_number: int = 1) -> Dict[str, Any]:
        """Initiates an outbound AI voice call to the student or parent."""
        pass


class MockVoiceProvider(VoiceProvider):
    """
    Zero-cost mock voice provider.
    Simulates telephony connection, generates grounded AI conversation transcript,
    classifies outcome, and logs to `voice_calls` table.
    """

    async def trigger_call(self, lead: Dict[str, Any], trigger_reason: str, attempt_number: int = 1) -> Dict[str, Any]:
        lead_id = lead["id"]
        call_id = f"mock_call_{uuid.uuid4().hex[:12]}"
        student_name = lead.get("student_name", "Student")
        campus = lead.get("preferred_campus") or "Hyderabad Campus"
        concerns = lead.get("main_concerns") or ["Degree & Curriculum"]
        concerns_str = ", ".join(concerns)

        logger.info(f"[MOCK VOICE CALL] Outbound to {lead.get('phone')} for {student_name} (Attempt #{attempt_number}, Reason: {trigger_reason})")

        # Grounded realistic transcript generation based on trigger reason
        if trigger_reason == "counselling_no_show":
            transcript = (
                f"AI Counsellor: Hello, am I speaking with {student_name}?\n"
                f"Student: Yes, speaking. Who is this?\n"
                f"AI Counsellor: Hi {student_name}, this is Priya calling from NIAT Admissions. We noticed you had a 1-on-1 academic counselling session scheduled earlier today that you were unable to attend. I wanted to check if everything is alright and if you'd like to reschedule?\n"
                f"Student: Oh yes, I had an unexpected class exam at school and missed the link. Can we reschedule for tomorrow evening?\n"
                f"AI Counsellor: Absolutely! I have reopened your booking link. I'll send you a WhatsApp confirmation with a 5 PM slot. Does that work?\n"
                f"Student: Yes, that works perfectly. Thank you!\n"
                f"AI Counsellor: You're welcome, {student_name}. Look forward to speaking with you and your family tomorrow. Have a great day!"
            )
            summary = f"Student missed scheduled session due to school exam. Confirmed interest in {campus} and agreed to reschedule for tomorrow 5 PM."
            outcome = "reschedule"
            duration = 118
        else:
            # hot_unresponsive_48h
            transcript = (
                f"AI Counsellor: Hello, is this {student_name}?\n"
                f"Student: Yes, who's calling?\n"
                f"AI Counsellor: Hello {student_name}! This is Arjun from the NIAT engineering admissions team. You recently qualified through our AI portal showing interest in the {campus} cohort.\n"
                f"Student: Yes, I was looking into your AI/ML specialisation and placement stats.\n"
                f"AI Counsellor: Wonderful! We specifically noticed you had questions regarding {concerns_str}. Our students receive direct degree conferral from collaborating universities along with ₹2.92 Cr in earned stipends. We have 3 seats remaining for this weekend's campus walkthrough. Would you like us to reserve one for you?\n"
                f"Student: Yes, I would definitely like to discuss the fee payment and hostel with my parents.\n"
                f"AI Counsellor: Excellent. I'm tagging your file as priority and our senior academic dean will share the exact syllabus breakdown over WhatsApp right now.\n"
                f"Student: Thank you so much!"
            )
            summary = f"Hot lead followed up after 48h. Student confirmed interest in {campus} AI/ML curriculum and fee breakdown. Priority follow-up requested."
            outcome = "interested"
            duration = 142

        # Record in database
        async with get_db_connection() as conn:
            await conn.execute("""
            INSERT INTO voice_calls (lead_id, call_id, provider, status, trigger_reason, attempt_number, transcript, summary, outcome, duration_seconds)
            VALUES (?, ?, 'mock', 'completed', ?, ?, ?, ?, ?, ?)
            """, (lead_id, call_id, trigger_reason, attempt_number, transcript, summary, outcome, duration))
            
            # Increment attempts and update status
            await conn.execute("""
            UPDATE leads 
            SET voice_call_attempts = voice_call_attempts + 1,
                status = CASE WHEN ? = 'interested' THEN 'contacted' ELSE status END,
                last_interaction_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (outcome, lead_id))
            await conn.commit()

        return {
            "success": True,
            "provider": "mock",
            "call_id": call_id,
            "status": "completed",
            "outcome": outcome,
            "summary": summary,
            "duration_seconds": duration
        }


class VapiVoiceProvider(VoiceProvider):
    """
    Live AI Telephony provider via Vapi API.
    Dispatches outbound call with customized system prompt grounded in student data.
    """

    async def trigger_call(self, lead: Dict[str, Any], trigger_reason: str, attempt_number: int = 1) -> Dict[str, Any]:
        if not settings.VAPI_API_KEY:
            logger.warning("VAPI_API_KEY not set. Falling back to MockVoiceProvider.")
            return await MockVoiceProvider().trigger_call(lead, trigger_reason, attempt_number)

        student_name = lead.get("student_name", "Student")
        campus = lead.get("preferred_campus") or "Hyderabad / Bangalore"
        phone = lead.get("phone")

        url = "https://api.vapi.ai/call/phone"
        headers = {
            "Authorization": f"Bearer {settings.VAPI_API_KEY}",
            "Content-Type": "application/json"
        }

        # Dynamic system prompt for Vapi agent grounded in lead profile
        system_prompt = f"""You are Priya, a friendly, articulate Senior Admission Counsellor at NIAT (NxtWave of Innovation in Advanced Technologies).
You are calling {student_name} who showed interest in the {campus} engineering program.
Reason for call: {trigger_reason}.
Keep your sentences brief, conversational, and natural.
If the student missed their counselling session, offer to reschedule.
If they are interested, invite them to reserve their scholarship seat.
At the end of the call, summarize their decision politely.
"""

        payload = {
            "phoneNumberId": settings.VAPI_PHONE_NUMBER_ID,
            "customer": {"number": phone, "name": student_name},
            "assistant": {
                "name": "NIAT Admissions Officer",
                "firstMessage": f"Hello {student_name}, this is Priya calling from NIAT Admissions. Do you have a quick moment?",
                "model": {
                    "provider": "openai",
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "system", "content": system_prompt}]
                },
                "voice": "azure-jenny"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                data = resp.json()
                if resp.status_code in (200, 201):
                    call_id = data.get("id", f"vapi_{uuid.uuid4().hex[:10]}")
                    async with get_db_connection() as conn:
                        await conn.execute("""
                        INSERT INTO voice_calls (lead_id, call_id, provider, status, trigger_reason, attempt_number)
                        VALUES (?, ?, 'vapi', 'queued', ?, ?)
                        """, (lead["id"], call_id, trigger_reason, attempt_number))
                        await conn.commit()
                    return {"success": True, "provider": "vapi", "call_id": call_id, "status": "queued"}
                else:
                    err_msg = data.get("message", resp.text)
                    logger.error(f"Vapi API error: {err_msg}")
                    return {"success": False, "provider": "vapi", "error": err_msg}
        except Exception as e:
            logger.exception(f"Network error initiating Vapi call: {e}")
            return {"success": False, "provider": "vapi", "error": str(e)}


class VoiceService:
    """Orchestrates outbound voice triggers and webhook ingestion."""

    def __init__(self):
        self.mock_provider = MockVoiceProvider()
        self.vapi_provider = VapiVoiceProvider()

    def get_active_provider(self) -> VoiceProvider:
        if settings.VOICE_MODE.lower() == "live":
            return self.vapi_provider
        return self.mock_provider

    async def trigger_call(self, lead: Dict[str, Any], trigger_reason: str, attempt_number: int = 1) -> Dict[str, Any]:
        """Checks attempt limits (max 2) and dispatches call."""
        lead_id = lead["id"]
        current_attempts = lead.get("voice_call_attempts", 0)

        if current_attempts >= 2:
            logger.info(f"Skipping voice call for lead {lead_id}: Maximum 2 attempts already reached.")
            return {"success": False, "error": "Maximum call attempts (2) reached", "lead_id": lead_id}

        provider = self.get_active_provider()
        return await provider.trigger_call(lead, trigger_reason, attempt_number=current_attempts + 1)

    async def handle_call_ended_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes Vapi/telephony end-of-call report:
        Extracts transcript, summary, duration, and classifies outcome.
        Updates lead status and voice_calls record.
        """
        call_data = payload.get("message", payload)
        call_id = call_data.get("call", {}).get("id") or call_data.get("id")
        transcript = call_data.get("transcript") or call_data.get("artifact", {}).get("transcript", "")
        summary = call_data.get("summary") or call_data.get("analysis", {}).get("summary", "")
        duration = int(call_data.get("durationSeconds") or 60)

        # Classify outcome
        lower_trans = (transcript + " " + summary).lower()
        if any(w in lower_trans for w in ["reschedule", "another time", "tomorrow", "next week", "busy"]):
            outcome = "reschedule"
        elif any(w in lower_trans for w in ["not interested", "wrong number", "don't call", "stop"]):
            outcome = "not_interested"
        else:
            outcome = "interested"

        async with get_db_connection() as conn:
            # Update voice_calls row
            cursor = await conn.execute("""
            UPDATE voice_calls 
            SET status = 'completed', transcript = ?, summary = ?, outcome = ?, duration_seconds = ?
            WHERE call_id = ?
            """, (transcript, summary, outcome, duration, call_id))
            await conn.commit()

            # Find corresponding lead
            cursor = await conn.execute("SELECT lead_id FROM voice_calls WHERE call_id = ?", (call_id,))
            row = await cursor.fetchone()
            if row:
                lead_id = row["lead_id"]
                new_status = "scheduled" if outcome == "reschedule" else ("contacted" if outcome == "interested" else "closed")
                await conn.execute("""
                UPDATE leads 
                SET status = ?, voice_call_attempts = voice_call_attempts + 1, last_interaction_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, (new_status, lead_id))
                await conn.commit()
                return {"success": True, "lead_id": lead_id, "call_id": call_id, "outcome": outcome}

        return {"success": True, "call_id": call_id, "outcome": outcome}


voice_service = VoiceService()
