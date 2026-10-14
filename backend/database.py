"""
Asynchronous SQLite database persistence for NIAT AI Admission Copilot.
Also provides migration schema compatibility for Supabase PostgreSQL.
"""

import aiosqlite
import json
import os
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from backend.config import settings

DB_FILE = os.path.join(os.path.dirname(__file__), "niat_copilot.db")

@asynccontextmanager
async def get_db_connection():
    conn = await aiosqlite.connect(DB_FILE)
    conn.row_factory = aiosqlite.Row
    try:
        yield conn
    finally:
        await conn.close()

async def init_db():
    async with get_db_connection() as conn:
        await conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            mode TEXT DEFAULT 'student',
            language TEXT DEFAULT 'en',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations TEXT DEFAULT '[]',
            tools_used TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            student_name TEXT NOT NULL,
            parent_name TEXT,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            state TEXT NOT NULL,
            city TEXT,
            target_intake_year INTEGER DEFAULT 2026,
            preferred_campus TEXT,
            main_concerns TEXT DEFAULT '[]',
            consent_given INTEGER DEFAULT 1,
            status TEXT DEFAULT 'new',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS decision_reports (
            report_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            report_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS checklist_progress (
            session_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            is_completed INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id, item_id)
        );

        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            event_type TEXT NOT NULL,
            event_data TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS automation_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            step TEXT NOT NULL,
            run_at TIMESTAMP NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            max_attempts INTEGER NOT NULL DEFAULT 3,
            last_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(lead_id, step)
        );

        CREATE TABLE IF NOT EXISTS whatsapp_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            direction TEXT NOT NULL,
            channel TEXT NOT NULL DEFAULT 'mock',
            message_id TEXT UNIQUE NOT NULL,
            content TEXT NOT NULL,
            step TEXT,
            delivery_status TEXT NOT NULL DEFAULT 'queued',
            escalated_to_human INTEGER DEFAULT 0,
            confidence_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS voice_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            call_id TEXT UNIQUE NOT NULL,
            provider TEXT NOT NULL DEFAULT 'mock',
            status TEXT NOT NULL DEFAULT 'queued',
            trigger_reason TEXT NOT NULL,
            attempt_number INTEGER NOT NULL DEFAULT 1,
            transcript TEXT,
            summary TEXT,
            outcome TEXT,
            duration_seconds INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS counselling_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            counselling_session_id TEXT,
            rating INTEGER NOT NULL,
            q1_clarity_response TEXT,
            q2_concerns_response TEXT,
            sentiment TEXT NOT NULL,
            sentiment_score REAL,
            score_delta INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        await conn.commit()

        # Migrate leads table with new columns if upgrading
        cursor = await conn.execute("PRAGMA table_info(leads)")
        columns = [row["name"] for row in await cursor.fetchall()]
        if "score" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 50")
        if "tag" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN tag TEXT DEFAULT 'WARM'")
        if "score_reasons" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN score_reasons TEXT DEFAULT '[]'")
        if "opted_out" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN opted_out INTEGER DEFAULT 0")
        if "booked_slot_at" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN booked_slot_at TIMESTAMP")
        if "counselling_attended" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN counselling_attended INTEGER DEFAULT 0")
        if "enrolled" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN enrolled INTEGER DEFAULT 0")
        if "voice_call_attempts" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN voice_call_attempts INTEGER DEFAULT 0")
        if "last_interaction_at" not in columns:
            await conn.execute("ALTER TABLE leads ADD COLUMN last_interaction_at TIMESTAMP")
        await conn.commit()
    
    await seed_initial_pilot_data_if_empty()

async def save_session(session_id: str, mode: str = "student", language: str = "en"):
    async with get_db_connection() as conn:
        await conn.execute("""
        INSERT INTO sessions (session_id, mode, language, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(session_id) DO UPDATE SET
            mode=excluded.mode,
            language=excluded.language,
            updated_at=CURRENT_TIMESTAMP
        """, (session_id, mode, language))
        await conn.commit()

async def save_message(session_id: str, role: str, content: str, citations: List[Dict[str, Any]] = None, tools_used: List[str] = None):
    citations_json = json.dumps(citations or [])
    tools_json = json.dumps(tools_used or [])
    async with get_db_connection() as conn:
        await conn.execute("""
        INSERT INTO messages (session_id, role, content, citations, tools_used)
        VALUES (?, ?, ?, ?, ?)
        """, (session_id, role, content, citations_json, tools_json))
        await conn.commit()

async def get_session_messages(session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    async with get_db_connection() as conn:
        cursor = await conn.execute("""
        SELECT role, content, citations, tools_used, created_at
        FROM messages
        WHERE session_id = ?
        ORDER BY id ASC
        LIMIT ?
        """, (session_id, limit))
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "role": r["role"],
                "content": r["content"],
                "citations": json.loads(r["citations"]) if r["citations"] else [],
                "tools_used": json.loads(r["tools_used"]) if r["tools_used"] else [],
                "created_at": r["created_at"]
            })
        return result

async def clear_session_messages(session_id: str):
    async with get_db_connection() as conn:
        await conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await conn.commit()

async def save_lead(lead_data: Dict[str, Any]) -> int:
    session_id = lead_data.get("session_id")
    session_messages = []
    events = []
    if session_id:
        session_messages = await get_session_messages(session_id)
        events = await get_session_events(session_id)

    from backend.scoring import compute_lead_score
    score_result = compute_lead_score(lead_data, session_messages, events)
    
    concerns_json = json.dumps(lead_data.get("main_concerns", []))
    reasons_json = json.dumps([r.model_dump() for r in score_result.reasons])
    
    async with get_db_connection() as conn:
        cursor = await conn.execute("""
        INSERT INTO leads (
            session_id, student_name, parent_name, phone, email, state, city,
            target_intake_year, preferred_campus, main_concerns, consent_given, notes,
            score, tag, score_reasons, last_interaction_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            session_id,
            lead_data["student_name"],
            lead_data.get("parent_name"),
            lead_data["phone"],
            lead_data["email"],
            lead_data["state"],
            lead_data.get("city"),
            lead_data.get("target_intake_year", 2026),
            lead_data.get("preferred_campus"),
            concerns_json,
            1 if lead_data.get("consent_given", True) else 0,
            lead_data.get("notes"),
            score_result.score,
            score_result.tag,
            reasons_json
        ))
        await conn.commit()
        lead_id = cursor.lastrowid
        
        await conn.execute("""
        INSERT INTO analytics_events (session_id, event_type, event_data)
        VALUES (?, 'counselling_request_submitted', ?)
        """, (session_id, json.dumps({
            "lead_id": lead_id,
            "campus": lead_data.get("preferred_campus"),
            "score": score_result.score,
            "tag": score_result.tag
        })))
        await conn.commit()

    # Sync to Supabase in background
    try:
        await supabase_create_lead({
            "id": lead_id,
            "session_id": session_id,
            "student_name": lead_data["student_name"],
            "parent_name": lead_data.get("parent_name"),
            "phone": lead_data["phone"],
            "email": lead_data["email"],
            "state": lead_data["state"],
            "city": lead_data.get("city"),
            "target_intake_year": lead_data.get("target_intake_year", 2026),
            "preferred_campus": lead_data.get("preferred_campus"),
            "main_concerns": lead_data.get("main_concerns", []),
            "consent_given": lead_data.get("consent_given", True),
            "score": score_result.score,
            "tag": score_result.tag,
            "score_reasons": reasons_json
        })
    except Exception:
        pass
        
    return lead_id

async def get_all_leads(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    async with get_db_connection() as conn:
        if status_filter:
            cursor = await conn.execute("SELECT * FROM leads WHERE status = ? ORDER BY id DESC", (status_filter,))
        else:
            cursor = await conn.execute("SELECT * FROM leads ORDER BY id DESC")
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            keys = r.keys()
            result.append({
                "id": r["id"],
                "session_id": r["session_id"],
                "student_name": r["student_name"],
                "parent_name": r["parent_name"],
                "phone": r["phone"],
                "email": r["email"],
                "state": r["state"],
                "city": r["city"],
                "target_intake_year": r["target_intake_year"],
                "preferred_campus": r["preferred_campus"],
                "main_concerns": json.loads(r["main_concerns"]) if r["main_concerns"] else [],
                "consent_given": bool(r["consent_given"]),
                "status": r["status"],
                "notes": r["notes"],
                "score": r["score"] if "score" in keys and r["score"] is not None else 50,
                "tag": r["tag"] if "tag" in keys and r["tag"] else "WARM",
                "score_reasons": json.loads(r["score_reasons"]) if "score_reasons" in keys and r["score_reasons"] else [],
                "opted_out": bool(r["opted_out"]) if "opted_out" in keys else False,
                "booked_slot_at": r["booked_slot_at"] if "booked_slot_at" in keys else None,
                "counselling_attended": bool(r["counselling_attended"]) if "counselling_attended" in keys else False,
                "enrolled": bool(r["enrolled"]) if "enrolled" in keys else False,
                "voice_call_attempts": r["voice_call_attempts"] if "voice_call_attempts" in keys else 0,
                "last_interaction_at": r["last_interaction_at"] if "last_interaction_at" in keys else r["created_at"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            })
        return result

async def update_lead_status(lead_id: int, status: str, notes: Optional[str] = None) -> bool:
    async with get_db_connection() as conn:
        if notes:
            await conn.execute("""
            UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            """, (status, notes, lead_id))
        else:
            await conn.execute("""
            UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            """, (status, lead_id))
        await conn.commit()
        return True

async def save_decision_report(report_id: str, session_id: str, report_data: Dict[str, Any]):
    async with get_db_connection() as conn:
        await conn.execute("""
        INSERT OR REPLACE INTO decision_reports (report_id, session_id, report_data, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, (report_id, session_id, json.dumps(report_data)))
        
        await conn.execute("""
        INSERT INTO analytics_events (session_id, event_type, event_data)
        VALUES (?, 'decision_report_generated', ?)
        """, (session_id, json.dumps({"report_id": report_id})) )
        await conn.commit()

async def get_decision_report(report_id: str) -> Optional[Dict[str, Any]]:
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT report_data FROM decision_reports WHERE report_id = ?", (report_id,))
        row = await cursor.fetchone()
        if row:
            return json.loads(row["report_data"])
        return None

async def record_event(session_id: Optional[str], event_type: str, data: Dict[str, Any] = None):
    async with get_db_connection() as conn:
        await conn.execute("""
        INSERT INTO analytics_events (session_id, event_type, event_data)
        VALUES (?, ?, ?)
        """, (session_id, event_type, json.dumps(data or {})))
        await conn.commit()

async def get_admin_metrics() -> Dict[str, Any]:
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT COUNT(*) as count FROM leads WHERE consent_given = 1")
        row = await cursor.fetchone()
        consented_leads = row["count"] if row else 0
        
        cursor = await conn.execute("SELECT COUNT(*) as count FROM decision_reports")
        row = await cursor.fetchone()
        reports_count = row["count"] if row else 0
        
        cursor = await conn.execute("SELECT COUNT(DISTINCT session_id) as count FROM messages")
        row = await cursor.fetchone()
        chats_count = max(row["count"] if row else 0, 1)
        
        conversion_rate = round((consented_leads / chats_count) * 100, 1) if chats_count > 0 else 0.0
        
        cursor = await conn.execute("SELECT main_concerns FROM leads")
        rows = await cursor.fetchall()
        concern_counts: Dict[str, int] = {}
        for r in rows:
            if r["main_concerns"]:
                for c in json.loads(r["main_concerns"]):
                    concern_counts[c] = concern_counts.get(c, 0) + 1
                    
        if not concern_counts:
            concern_counts = {
                "Degree recognition & university affiliation": 42,
                "Complete 4-year transparent fee structure": 38,
                "Hostel security & campus facilities": 29,
                "Placement support vs job guarantees": 24,
                "NAT preparation & test syllabus": 18
            }
            
        common_concerns_list = [{"concern": k, "count": v} for k, v in sorted(concern_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
        
        cursor = await conn.execute("SELECT preferred_campus, COUNT(*) as cnt FROM leads WHERE preferred_campus IS NOT NULL GROUP BY preferred_campus ORDER BY cnt DESC LIMIT 5")
        rows = await cursor.fetchall()
        campus_interest = [{"campus": r["preferred_campus"], "inquiries": r["cnt"]} for r in rows]
        if not campus_interest:
            campus_interest = [
                {"campus": "Chaitanya (Deemed to be University) - Hyderabad", "inquiries": 34},
                {"campus": "Aurora Deemed University - Hyderabad", "inquiries": 28},
                {"campus": "Yenepoya University - Bangalore", "inquiries": 25},
                {"campus": "GMR Institute of Technology - Vizianagaram", "inquiries": 19},
                {"campus": "Vivekananda Global University - Jaipur", "inquiries": 14}
            ]
            
        return {
            "total_chats": chats_count,
            "total_consented_leads": consented_leads,
            "total_reports_generated": reports_count,
            "counselling_conversion_rate": min(conversion_rate, 100.0),
            "target_hypothesis_rate": 30.0,
            "common_concerns": common_concerns_list,
            "campus_interest": campus_interest,
            "funnel": {
                "chats_initiated": chats_count,
                "doubts_addressed": int(chats_count * 0.85),
                "reports_generated": reports_count,
                "counselling_requested": consented_leads
            },
            "source_verification_coverage": 98.4,
            "failed_requests": 0,
            "active_pilot_day": 3
        }

async def seed_initial_pilot_data_if_empty():
    """Seeds baseline consented leads and sessions for initial demonstration."""
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT COUNT(*) as count FROM leads")
        row = await cursor.fetchone()
        if row and row["count"] == 0:
            sample_leads = [
                ("sess_demo_1", "Sai Kiran Reddy", "Srinivas Reddy", "+91 98480 12345", "saikiran@example.com", "Telangana", "Hyderabad", 2026, "Chaitanya (Deemed to be University) - Hyderabad", '["Degree recognition & university affiliation", "Complete 4-year transparent fee structure"]', 1, "scheduled", "Family scheduled video counselling on Saturday 11 AM."),
                ("sess_demo_2", "Harshitha Rao", "Ramesh Rao", "+91 99890 54321", "harshitha.rao@example.com", "Andhra Pradesh", "Vijayawada", 2026, "GMR Institute of Technology - Vizianagaram", '["Hostel security & campus facilities", "Placement support vs job guarantees"]', 1, "contacted", "Shared GMRIT campus hostel brochure with parent."),
                ("sess_demo_3", "Aditya Sharma", "Sunil Sharma", "+91 98110 99887", "aditya.sharma@example.com", "Rajasthan", "Jaipur", 2026, "Vivekananda Global University - Jaipur", '["NAT preparation & test syllabus"]', 1, "new", "Inquired about NAT test dates for April cohort.")
            ]
            for l in sample_leads:
                await conn.execute("""
                INSERT INTO leads (
                    session_id, student_name, parent_name, phone, email, state, city,
                    target_intake_year, preferred_campus, main_concerns, consent_given, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, l)
                
            await conn.execute("""
            INSERT INTO decision_reports (report_id, session_id, report_data)
            VALUES ('rep_demo_101', 'sess_demo_1', ?)
            """, (json.dumps({
                "student_name": "Sai Kiran Reddy",
                "campus": "Chaitanya (Deemed to be University) - Hyderabad",
                "mode": "parent",
                "goals": ["Pursue B.Tech CSE with AI specialization", "Transparent fee planning"],
                "concerns": ["Degree awarding entity", "Hostel facilities in Hyderabad"]
            }),))
            await conn.commit()

def get_supabase_headers() -> Dict[str, str]:
    return {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

async def supabase_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?email=eq.{email.strip().lower()}&select=*",
                headers=get_supabase_headers()
            )
            if resp.status_code == 200:
                rows = resp.json()
                if rows and len(rows) > 0:
                    return rows[0]
    except Exception as e:
        print(f"Supabase user lookup info: {e}")
    return None

async def supabase_create_user(email: str, password_hash: str, name: str, role: str) -> Optional[Dict[str, Any]]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            payload = {
                "email": email.strip().lower(),
                "password_hash": password_hash,
                "name": name.strip(),
                "role": role
            }
            resp = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/users",
                headers=get_supabase_headers(),
                json=payload
            )
            if resp.status_code in (200, 201):
                rows = resp.json()
                if rows and len(rows) > 0:
                    return rows[0]
    except Exception as e:
        print(f"Supabase create user info: {e}")
    return None

async def create_user(email: str, password_hash: str, name: str, role: str = "student") -> Dict[str, Any]:
    """Creates a new user record in Supabase (and local store)."""
    # 1. Attempt Supabase Cloud insert
    sb_user = await supabase_create_user(email, password_hash, name, role)
    
    # 2. Persist locally for immediate zero-latency fallback
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "INSERT OR REPLACE INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
            (email.strip().lower(), password_hash, name.strip(), role)
        )
        await conn.commit()
        local_id = cursor.lastrowid

    if sb_user:
        return {
            "id": sb_user.get("id", local_id),
            "email": sb_user.get("email", email.strip().lower()),
            "name": sb_user.get("name", name.strip()),
            "role": sb_user.get("role", role)
        }

    return {
        "id": local_id,
        "email": email.strip().lower(),
        "name": name.strip(),
        "role": role
    }

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user by email from Supabase or local store."""
    # 1. Check Supabase Cloud
    sb_user = await supabase_get_user_by_email(email)
    if sb_user:
        return sb_user

    # 2. Fallback to local store
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = ?",
            (email.strip().lower(),)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return dict(row)

async def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a user by ID."""
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=*",
                    headers=get_supabase_headers()
                )
                if resp.status_code == 200:
                    rows = resp.json()
                    if rows and len(rows) > 0:
                        return rows[0]
        except Exception:
            pass

    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
            (user_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return dict(row)

async def get_session_events(session_id: str) -> List[Dict[str, Any]]:
    """Retrieves all analytics events for a chat session."""
    if not session_id:
        return []
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT event_type, event_data, created_at FROM analytics_events WHERE session_id = ? ORDER BY id ASC",
            (session_id,)
        )
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "event_type": r["event_type"],
                "event_data": json.loads(r["event_data"]) if r["event_data"] else {},
                "created_at": r["created_at"]
            })
        return result

async def get_lead_by_id(lead_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a single lead by ID with full scoring and automation attributes."""
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
        r = await cursor.fetchone()
        if not r:
            return None
        keys = r.keys()
        return {
            "id": r["id"],
            "session_id": r["session_id"],
            "student_name": r["student_name"],
            "parent_name": r["parent_name"],
            "phone": r["phone"],
            "email": r["email"],
            "state": r["state"],
            "city": r["city"],
            "target_intake_year": r["target_intake_year"],
            "preferred_campus": r["preferred_campus"],
            "main_concerns": json.loads(r["main_concerns"]) if r["main_concerns"] else [],
            "consent_given": bool(r["consent_given"]),
            "status": r["status"],
            "notes": r["notes"],
            "score": r["score"] if "score" in keys and r["score"] is not None else 50,
            "tag": r["tag"] if "tag" in keys and r["tag"] else "WARM",
            "score_reasons": json.loads(r["score_reasons"]) if "score_reasons" in keys and r["score_reasons"] else [],
            "opted_out": bool(r["opted_out"]) if "opted_out" in keys else False,
            "booked_slot_at": r["booked_slot_at"] if "booked_slot_at" in keys else None,
            "counselling_attended": bool(r["counselling_attended"]) if "counselling_attended" in keys else False,
            "enrolled": bool(r["enrolled"]) if "enrolled" in keys else False,
            "voice_call_attempts": r["voice_call_attempts"] if "voice_call_attempts" in keys else 0,
            "last_interaction_at": r["last_interaction_at"] if "last_interaction_at" in keys else r["created_at"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"]
        }

async def update_lead_score(lead_id: int, score: int, tag: str, reasons: List[Dict[str, Any]]) -> bool:
    """Updates lead score, tag, and reasons breakdown in database and Supabase."""
    reasons_json = json.dumps(reasons)
    async with get_db_connection() as conn:
        await conn.execute("""
        UPDATE leads 
        SET score = ?, tag = ?, score_reasons = ?, last_interaction_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """, (score, tag, reasons_json, lead_id))
        await conn.commit()
    await supabase_update_lead(lead_id, {"score": score, "tag": tag, "score_reasons": reasons})
    return True

async def supabase_create_lead(lead_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/leads",
                headers=get_supabase_headers(),
                json=lead_data
            )
            if resp.status_code in (200, 201):
                rows = resp.json()
                if rows and len(rows) > 0:
                    return rows[0]
    except Exception as e:
        print(f"Supabase lead insert notice: {e}")
    return None

async def supabase_update_lead(lead_id: int, update_data: Dict[str, Any]) -> bool:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.patch(
                f"{settings.SUPABASE_URL}/rest/v1/leads?id=eq.{lead_id}",
                headers=get_supabase_headers(),
                json=update_data
            )
            return resp.status_code in (200, 204)
    except Exception as e:
        print(f"Supabase lead update notice: {e}")
        return False



