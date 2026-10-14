"""
Messaging Provider Abstraction and WhatsApp Automation Service for NIAT AI Engine.
Supports:
- Provider abstraction: MockMessagingProvider (default), MetaWhatsAppProvider, TwilioWhatsAppProvider
- Groq-powered dynamic personalization using lead data & prior chat context
- Multi-step sequences (Day 0, Day 1, Day 3, 24h & 1h appointment reminders, feedback)
- Inbound webhook processing with STOP opt-out, RAG answering, and human escalation
"""

import uuid
import hmac
import hashlib
import json
import logging
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime

from backend.config import settings
from backend.database import get_db_connection, get_lead_by_id, get_session_messages

logger = logging.getLogger("niat.messaging")

class MessagingProvider(ABC):
    """Abstract interface for multi-channel messaging providers."""
    
    @abstractmethod
    async def send_message(self, to_phone: str, text: str, lead_id: int, step: Optional[str] = None) -> Dict[str, Any]:
        """Sends an outbound message to a student/parent."""
        pass


class MockMessagingProvider(MessagingProvider):
    """
    Zero-cost mock provider for local testing and live demos.
    Simulates message dispatch, logs to whatsapp_messages table, and returns delivered status.
    """
    
    async def send_message(self, to_phone: str, text: str, lead_id: int, step: Optional[str] = None) -> Dict[str, Any]:
        msg_id = f"mock_wa_{uuid.uuid4().hex[:14]}"
        logger.info(f"[MOCK WHATSAPP] To: {to_phone} | Step: {step} | Message: {text[:60]}...")
        
        async with get_db_connection() as conn:
            await conn.execute("""
            INSERT INTO whatsapp_messages (lead_id, direction, channel, message_id, content, step, delivery_status)
            VALUES (?, 'outbound', 'mock', ?, ?, ?, 'delivered')
            """, (lead_id, msg_id, text, step or "outbound"))
            await conn.commit()
            
        return {
            "success": True,
            "provider": "mock",
            "message_id": msg_id,
            "status": "delivered",
            "timestamp": datetime.utcnow().isoformat()
        }


class MetaWhatsAppProvider(MessagingProvider):
    """Live WhatsApp Business Cloud API provider via Meta Graph API."""
    
    async def send_message(self, to_phone: str, text: str, lead_id: int, step: Optional[str] = None) -> Dict[str, Any]:
        if not settings.META_WHATSAPP_TOKEN or not settings.META_PHONE_NUMBER_ID:
            logger.warning("Meta WhatsApp credentials not fully set. Falling back to mock dispatch.")
            return await MockMessagingProvider().send_message(to_phone, text, lead_id, step)

        clean_phone = to_phone.replace("+", "").replace("-", "").replace(" ", "")
        url = f"https://graph.facebook.com/v20.0/{settings.META_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {"preview_url": True, "body": text}
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                data = resp.json()
                
                if resp.status_code in (200, 201) and "messages" in data:
                    wamid = data["messages"][0]["id"]
                    async with get_db_connection() as conn:
                        await conn.execute("""
                        INSERT INTO whatsapp_messages (lead_id, direction, channel, message_id, content, step, delivery_status)
                        VALUES (?, 'outbound', 'meta', ?, ?, ?, 'sent')
                        """, (lead_id, wamid, text, step or "outbound"))
                        await conn.commit()
                    return {"success": True, "provider": "meta", "message_id": wamid, "status": "sent"}
                else:
                    err_msg = data.get("error", {}).get("message", resp.text)
                    logger.error(f"Meta WhatsApp API error: {err_msg}")
                    return {"success": False, "provider": "meta", "error": err_msg}
        except Exception as e:
            logger.exception(f"Network error calling Meta WhatsApp API: {e}")
            return {"success": False, "provider": "meta", "error": str(e)}


class TwilioWhatsAppProvider(MessagingProvider):
    """Live WhatsApp provider via Twilio REST API."""
    
    async def send_message(self, to_phone: str, text: str, lead_id: int, step: Optional[str] = None) -> Dict[str, Any]:
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.warning("Twilio credentials not configured. Falling back to mock dispatch.")
            return await MockMessagingProvider().send_message(to_phone, text, lead_id, step)

        clean_to = f"whatsapp:{to_phone if to_phone.startswith('+') else '+' + to_phone}"
        clean_from = f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}"
        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={"From": clean_from, "To": clean_to, "Body": text}
                )
                data = resp.json()
                if resp.status_code in (200, 201):
                    sid = data.get("sid", f"tw_{uuid.uuid4().hex[:12]}")
                    async with get_db_connection() as conn:
                        await conn.execute("""
                        INSERT INTO whatsapp_messages (lead_id, direction, channel, message_id, content, step, delivery_status)
                        VALUES (?, 'outbound', 'twilio', ?, ?, ?, 'sent')
                        """, (lead_id, sid, text, step or "outbound"))
                        await conn.commit()
                    return {"success": True, "provider": "twilio", "message_id": sid, "status": "sent"}
                else:
                    err_msg = data.get("message", resp.text)
                    code = data.get("code")
                    hint = ""
                    if code == 572002 or "trial" in err_msg.lower():
                        hint = " (Twilio Sandbox Opt-in Required: Recipient must send their sandbox join keyword to +1 415 523 8886 first)"
                    
                    full_err = f"{err_msg}{hint}"
                    logger.error(f"Twilio WhatsApp error for {to_phone}: {full_err}")
                    
                    # Log to database so it is visible in the admin timeline
                    fail_id = f"tw_err_{uuid.uuid4().hex[:8]}"
                    async with get_db_connection() as conn:
                        await conn.execute("""
                        INSERT INTO whatsapp_messages (lead_id, direction, channel, message_id, content, step, delivery_status)
                        VALUES (?, 'outbound', 'twilio', ?, ?, ?, 'failed')
                        """, (lead_id, fail_id, f"[Twilio Status: Failed - {full_err}]\n\n{text}", step or "outbound"))
                        await conn.commit()
                        
                    return {"success": False, "provider": "twilio", "error": full_err}
        except Exception as e:
            logger.exception(f"Exception dispatching Twilio WhatsApp message: {e}")
            return {"success": False, "provider": "twilio", "error": str(e)}


class MessagingService:
    """Orchestrates WhatsApp templates, dynamic Groq personalization, and inbound processing."""
    
    def __init__(self):
        self.mock_provider = MockMessagingProvider()
        self.meta_provider = MetaWhatsAppProvider()
        self.twilio_provider = TwilioWhatsAppProvider()

    def get_active_provider(self) -> MessagingProvider:
        """Resolves active provider according to environment variables."""
        if settings.MESSAGING_MODE.lower() == "live":
            if settings.WHATSAPP_PROVIDER.lower() == "twilio":
                return self.twilio_provider
            return self.meta_provider
        return self.mock_provider

    async def generate_personalized_content(self, lead: Dict[str, Any], step: str) -> str:
        """
        Generates contextual WhatsApp copy grounded in lead info and prior conversation.
        Uses Groq if available, with structured fallback templates.
        """
        name = lead.get("student_name", "Student")
        campus = lead.get("preferred_campus") or "Hyderabad / Bangalore"
        city = lead.get("city") or lead.get("state") or "your city"
        concerns = lead.get("main_concerns") or []
        concerns_text = ", ".join(concerns) if concerns else "curriculum and campus life"

        # Check for chat context
        session_id = lead.get("session_id")
        history_summary = ""
        if session_id:
            msgs = await get_session_messages(session_id, limit=4)
            if msgs:
                user_qs = [m.get("content") for m in msgs if m.get("role") == "user"]
                history_summary = "Prior student inquiries: " + " | ".join(user_qs[:2])

        prompt = f"""You are the senior admission counsellor at NIAT (NxtWave of Innovation in Advanced Technologies).
Generate a concise, professional, friendly WhatsApp message for an applicant.
Keep it under 90 words. Use formatting (*bold*, emojis) suitable for WhatsApp.
Include a clear call to action and note that they can reply 'STOP' to opt out anytime.

APPLICANT PROFILE:
- Name: {name}
- Preferred Campus: {campus}
- Location: {city}
- Stated Concerns: {concerns_text}
- {history_summary}
- STEP: {step}

STEP SPECIFICATIONS:
- day_0_welcome: Welcome them warmly. Mention their interest in {campus}. Offer an official 1-on-1 career counselling slot booking link: https://niatindia.com/counselling?ref={lead.get('id')}
- day_1_objection: Address their primary questions/concerns ({concerns_text}) directly with verified facts: UGC/AICTE degree conferral from collaborating universities, tech immersion, or hostel safety.
- day_3_social_proof: Share authentic placement metrics (₹80 LPA top package across NxtWave programs, 2500+ hiring partners, ₹2.92 Cr total stipends), and 4-year transparent fee details with flexible EMI options.
- reminder_24h: Friendly reminder that their counselling session is in 24 hours. Advise having 10th/12th marks ready.
- reminder_1h: Urgent reminder that their counsellor meeting begins in 1 hour. Include link to join.
- post_feedback_survey: Thank them for attending the counselling session. Ask them to rate their session from 1 to 5 and share any remaining questions.

Output ONLY the message body, without preamble.
"""
        # Try Groq generation
        if settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                resp = await client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=220
                )
                text = resp.choices[0].message.content.strip()
                if text:
                    return text
            except Exception as e:
                logger.warning(f"Groq personalization notice (falling back to template): {e}")

        # Deterministic Fallback Templates
        slot_link = f"https://niatindia.com/counselling?lead={lead.get('id')}"
        if step == "day_0_welcome":
            return (
                f"Hello *{name}*! 👋 Welcome to NIAT. We noticed your interest in the *{campus}* cohort.\n\n"
                f"To help you and your family explore curriculum details, scholarships, and career tracks, "
                f"you can book an official 1-on-1 counselling session here: {slot_link}\n\n"
                f"Reply to this chat anytime with your questions, or send *STOP* to unsubscribe."
            )
        elif step == "day_1_objection":
            return (
                f"Hi *{name}*, regarding your inquiry on *{concerns_text}* at NIAT:\n\n"
                f"🎓 Students receive their recognized B.Tech degree directly from collaborating university partners, "
                f"combined with NIAT's intensive AI/ML practical labs and industry portfolio.\n\n"
                f"Would you like to schedule a quick 10-minute briefing with an academic advisor today? Reply *YES* to connect."
            )
        elif step == "day_3_social_proof":
            return (
                f"Hey *{name}*, quick update on NIAT outcomes! 🚀\n\n"
                f"✨ 2,500+ tech hiring partners (Google, Amazon, TCS, etc.)\n"
                f"✨ ₹80 LPA highest package across programs & ₹2.92 Cr in student stipends\n"
                f"✨ 100% transparent 4-year fee structure with flexible monthly EMI plans.\n\n"
                f"Lock your preferred campus seat at {slot_link} or reply here."
            )
        elif step == "reminder_24h":
            return (
                f"Reminder for *{name}*: Your NIAT 1-on-1 Academic Counselling session is scheduled in *24 hours*! ⏰\n\n"
                f"Please have your 12th PCM details ready. If you need to reschedule, simply reply *RESCHEDULE*."
            )
        elif step == "reminder_1h":
            return (
                f"Urgent Reminder: *{name}*, your counselling call starts in *1 hour*! 🔗\n\n"
                f"Your dedicated advisor will connect with you shortly. See you soon!"
            )
        elif step == "post_feedback_survey":
            return (
                f"Hi *{name}*, thank you for attending your NIAT counselling session! 🌟\n\n"
                f"How would you rate your session on a scale of *1 to 5* (where 5 is Excellent)?\n"
                f"Reply with a number (1-5) and tell us: Did this call resolve your key concerns?"
            )
        elif step == "exam_day_notice":
            return (
                f"🚨 *IMPORTANT EXAM NOTICE FOR {name.upper()}* 🚨\n\n"
                f"Your National Aptitude Test (NAT) is *TODAY*! 📝\n"
                f"• Exam Window: 10:00 AM – 6:00 PM IST\n"
                f"• Format: 60 Mins online test (Logical Reasoning & Math basics)\n"
                f"• Admit Card & Link: https://niatindia.com/nat-exam?ref={lead.get('id')}\n\n"
                f"Good luck! Reply HELP if you have any questions."
            )
        elif step == "periodic_cadence_5h":
            return (
                f"⚡ *NIAT Admissions Update for {name}*:\n\n"
                f"Cohort 2026 early-scholarship verification for *{campus}* is active. "
                f"Have you submitted your PCM eligibility details?\n\n"
                f"Review status: https://niatindia.com/portal?ref={lead.get('id')}"
            )
        return f"Hello {name}, thank you for connecting with NIAT Admissions."

    async def send_sequence_message(self, lead: Dict[str, Any], step: str) -> Dict[str, Any]:
        """Generates copy and dispatches message via active provider."""
        content = await self.generate_personalized_content(lead, step)
        provider = self.get_active_provider()
        return await provider.send_message(
            to_phone=lead["phone"],
            text=content,
            lead_id=lead["id"],
            step=step
        )

    async def handle_inbound_message(
        self,
        from_phone: str,
        message_text: str,
        channel: str = "mock"
    ) -> Dict[str, Any]:
        """
        Processes incoming WhatsApp replies:
        1. Finds lead by phone number.
        2. Checks for 'STOP' / 'UNSUBSCRIBE' opt-out keywords.
        3. Cancels pending nurture sequence (since student actively replied).
        4. Evaluates query with RAG AI Engine.
        5. Computes confidence score; flags for human escalation if low confidence or human requested.
        """
        clean_text = message_text.strip()
        upper_text = clean_text.upper()
        
        # 1. Match lead by phone
        clean_phone = from_phone.replace("+", "").replace("-", "").replace(" ", "")
        lead = None
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM leads WHERE replace(replace(replace(phone, '+', ''), '-', ''), ' ', '') LIKE ? ORDER BY id DESC LIMIT 1",
                (f"%{clean_phone[-10:]}",)
            )
            r = await cursor.fetchone()
            if r:
                lead = dict(r)

        lead_id = lead["id"] if lead else 0
        inbound_msg_id = f"in_{uuid.uuid4().hex[:12]}"

        # 2. Check Opt-Out
        if upper_text in ["STOP", "UNSUBSCRIBE", "OPTOUT", "QUIT"]:
            if lead_id:
                async with get_db_connection() as conn:
                    await conn.execute("UPDATE leads SET opted_out = 1, status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (lead_id,))
                    await conn.commit()
                from backend.scheduler import cancel_pending_sequence
                await cancel_pending_sequence(lead_id, reason="opted_out_by_user")

            reply_text = "You have been successfully unsubscribed from NIAT WhatsApp updates. You will not receive further automated messages."
            provider = self.get_active_provider()
            await provider.send_message(from_phone, reply_text, lead_id, step="opt_out_ack")
            return {"action": "opted_out", "lead_id": lead_id}

        # 3. Stop pending generic sequence on student reply
        if lead_id:
            from backend.scheduler import cancel_pending_sequence
            await cancel_pending_sequence(lead_id, reason="student_replied")

        # 4. Check for feedback responses (number 1-5)
        if clean_text in ["1", "2", "3", "4", "5"]:
            from backend.feedback import process_rating_reply
            res = await process_rating_reply(lead_id, int(clean_text))
            return res

        # 5. Check Human Escalation request
        human_keywords = ["human", "counsellor", "agent", "person", "call me", "talk to", "complaint", "fraud"]
        needs_human = any(k in clean_text.lower() for k in human_keywords)
        confidence_score = 0.50 if needs_human else 0.90

        # 6. Generate AI Answer using existing RAG AI Engine
        from backend.ai_engine import ai_engine
        session_id = lead.get("session_id") if lead else f"wa_sess_{uuid.uuid4().hex[:8]}"
        chat_resp = await ai_engine.generate_response(
            message=clean_text,
            session_id=session_id,
            mode="student",
            language="en"
        )
        ai_reply = chat_resp.get("message", "Thank you for reaching out. An admission counsellor will assist you shortly.")

        # Log inbound message
        async with get_db_connection() as conn:
            await conn.execute("""
            INSERT INTO whatsapp_messages (lead_id, direction, channel, message_id, content, step, delivery_status, escalated_to_human, confidence_score)
            VALUES (?, 'inbound', ?, ?, ?, 'inbound_reply', 'read', ?, ?)
            """, (lead_id, channel, inbound_msg_id, clean_text, 1 if needs_human else 0, confidence_score))
            await conn.commit()

        # Send AI response back
        provider = self.get_active_provider()
        await provider.send_message(from_phone, ai_reply, lead_id, step="inbound_ai_response")

        return {
            "action": "answered",
            "lead_id": lead_id,
            "escalated_to_human": needs_human,
            "confidence_score": confidence_score,
            "ai_reply": ai_reply
        }


# Singleton service
messaging_service = MessagingService()
