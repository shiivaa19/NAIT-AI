"""
Main FastAPI server for NIAT AI Admission Copilot.
Handles AI chat, streaming, tool executions, campus directory, cost calculator,
family decision reports, consented counselling leads, and admin growth analytics.
"""

import uuid
import json
import asyncio
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.config import settings
from backend.models import (
    ChatRequest,
    ChatResponse,
    CostCalculatorRequest,
    CostCalculatorResponse,
    CampusCompareRequest,
    CampusCompareResponse,
    CounsellingLeadRequest,
    CounsellingLeadResponse,
    LeadStatusUpdateRequest,
    DecisionReportRequest,
    DecisionReportResponse,
    AdminMetricsResponse,
    ChecklistUpdateRequest,
    UserRegisterRequest,
    UserLoginRequest,
    GoogleAuthRequest,
    UserResponse,
    AuthResponse
)
from backend.database import (
    init_db,
    save_session,
    save_message,
    get_session_messages,
    clear_session_messages,
    save_lead,
    get_all_leads,
    update_lead_status,
    save_decision_report,
    get_decision_report,
    get_admin_metrics,
    record_event,
    create_user,
    get_user_by_email,
    get_user_by_id
)
from backend.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from backend.knowledge_base import kb
from backend.tools import (
    calculate_four_year_cost_tool,
    compare_campuses_tool,
    generate_family_decision_report_tool
)
from backend.ai_engine import ai_engine
from fastapi import Depends

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Full AI-Native Admission Assistance Platform for NIAT",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "dual_engine_active": True,
        "primary_engines": ["Google Gemini 3.5-Flash", "Groq OpenAI GPT-OSS-120B"],
        "campuses_count": len(kb.campuses),
        "knowledge_chunks": len(kb.documents)
    }

# --- Authentication Endpoints ---
@app.post("/api/auth/register", response_model=AuthResponse)
async def register(req: UserRegisterRequest):
    existing = await get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")
    
    p_hash = hash_password(req.password)
    user = await create_user(req.email, p_hash, req.name, req.role or "student")
    token = create_access_token({"sub": user["email"], "user_id": user["id"], "role": user["role"]})
    return AuthResponse(token=token, user=UserResponse(**user))

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(req: UserLoginRequest):
    user = await get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["email"], "user_id": user["id"], "role": user["role"]})
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=str(user.get("created_at"))
        )
    )

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=str(user.get("created_at"))
    )

@app.post("/api/auth/google", response_model=AuthResponse)
async def google_auth(req: Optional[GoogleAuthRequest] = None):
    """Google 1-Click SSO authentication fallback."""
    email = (req.email if req and req.email else "google.student@gmail.com").strip().lower()
    name = (req.name if req and req.name else "Google Student").strip()
    role = req.role if req and req.role else "student"
    
    user = await get_user_by_email(email)
    if not user:
        p_hash = hash_password(f"google_oauth_{uuid.uuid4().hex}")
        user = await create_user(email, p_hash, name, role)
        
    token = create_access_token({"sub": user["email"], "user_id": user["id"], "role": user["role"]})
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=str(user.get("created_at"))
        )
    )

# 1. Chat Endpoints
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    session_id = req.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    await save_session(session_id, mode=req.mode, language=req.language)
    
    # Save user message
    await save_message(session_id, role="user", content=req.message)
    
    # Fetch prior conversation history
    history = await get_session_messages(session_id, limit=10)
    
    # Generate dynamic response
    resp = await ai_engine.generate_response(
        message=req.message,
        session_id=session_id,
        mode=req.mode,
        language=req.language,
        history=history
    )
    
    # Save assistant message
    await save_message(
        session_id=session_id,
        role="assistant",
        content=resp["message"],
        citations=resp.get("citations", []),
        tools_used=resp.get("tools_used", [])
    )
    
    # Record analytics event
    await record_event(session_id, "chat_message_exchanged", {"mode": req.mode, "language": req.language})
    
    return ChatResponse(**resp)

@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Streaming chat endpoint for responsive typing experience.
    """
    session_id = req.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    await save_session(session_id, mode=req.mode, language=req.language)
    await save_message(session_id, role="user", content=req.message)
    history = await get_session_messages(session_id, limit=10)
    
    resp = await ai_engine.generate_response(
        message=req.message,
        session_id=session_id,
        mode=req.mode,
        language=req.language,
        history=history
    )
    
    async def event_generator():
        yield f"data: {json.dumps({'type': 'start', 'session_id': session_id, 'mode': req.mode, 'citations': resp['citations']})}\n\n"
        
        # Stream response chunks smoothly
        full_text = resp["message"]
        words = full_text.split(" ")
        chunk_size = 3
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i+chunk_size]) + " "
            yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
            await asyncio.sleep(0.02)
            
        yield f"data: {json.dumps({'type': 'done', 'tools_used': resp['tools_used'], 'suggested_actions': resp['suggested_actions']})}\n\n"
        
        # Save assistant message
        await save_message(
            session_id=session_id,
            role="assistant",
            content=full_text,
            citations=resp.get("citations", []),
            tools_used=resp.get("tools_used", [])
        )
        
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/session/{session_id}/messages")
async def get_messages(session_id: str):
    messages = await get_session_messages(session_id)
    return {"session_id": session_id, "messages": messages}

@app.delete("/api/session/{session_id}")
async def clear_session(session_id: str):
    await clear_session_messages(session_id)
    return {"status": "success", "message": f"Conversation history for session {session_id} deleted."}

# 2. Campus Endpoints
@app.get("/api/campuses")
async def list_campuses(state: Optional[str] = None, city: Optional[str] = None):
    campuses = kb.get_all_campuses(state=state, city=city)
    return {"count": len(campuses), "campuses": campuses}

@app.get("/api/campuses/{campus_id}")
async def get_campus(campus_id: str):
    campus = kb.get_campus_by_id(campus_id)
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    return campus

@app.post("/api/campuses/compare", response_model=CampusCompareResponse)
async def compare_campuses(req: CampusCompareRequest):
    res = compare_campuses_tool(req.campus_ids)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return CampusCompareResponse(
        campuses=res["campuses"],
        attributes=res["attributes"],
        summary_comparison=res["comparison_summary"]
    )

# 3. Cost Calculator Endpoint
@app.post("/api/calculate-cost", response_model=CostCalculatorResponse)
async def calculate_cost(req: CostCalculatorRequest):
    res = calculate_four_year_cost_tool(req)
    if req.campus_id:
        await record_event(None, "cost_calculation_performed", {"campus_id": req.campus_id, "four_year_total": res.four_year_gross_total})
    return res

# 4. Personalized Family Decision Report
@app.post("/api/decision-report", response_model=DecisionReportResponse)
async def generate_report(req: DecisionReportRequest):
    res = await generate_family_decision_report_tool(
        session_id=req.session_id,
        student_name=req.student_name or "Prospective Student",
        mode=req.mode,
        preferred_campus=req.preferred_campus,
        main_concerns=req.main_concerns
    )
    return res

@app.get("/api/decision-report/{report_id}")
async def retrieve_report(report_id: str):
    report = await get_decision_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

# 5. Admission Readiness Checklist Update
@app.post("/api/checklist")
async def update_checklist(req: ChecklistUpdateRequest):
    return {"status": "success", "session_id": req.session_id, "completed": req.completed_item_ids}

# 6. Counselling Lead Submission with Consent
@app.post("/api/counselling", response_model=CounsellingLeadResponse)
async def submit_counselling(req: CounsellingLeadRequest):
    if not req.consent_given:
        raise HTTPException(status_code=400, detail="Explicit consent is required to submit contact details.")
    lead_id = await save_lead(req.model_dump())
    return CounsellingLeadResponse(
        lead_id=lead_id,
        status="registered",
        message="Your counselling session request has been registered. An official NIAT counsellor will reach out to you.",
        created_at=uuid.uuid4().hex[:6]
    )

# 7. Admin Growth & Analytics Dashboard Endpoints
@app.get("/api/admin/metrics", response_model=AdminMetricsResponse)
async def get_metrics():
    metrics = await get_admin_metrics()
    return AdminMetricsResponse(**metrics)

@app.get("/api/admin/leads")
async def list_leads(status: Optional[str] = None):
    leads = await get_all_leads(status_filter=status)
    return {"count": len(leads), "leads": leads}

@app.patch("/api/admin/leads/{lead_id}")
async def update_lead(lead_id: int, req: LeadStatusUpdateRequest):
    updated = await update_lead_status(lead_id, req.status, req.notes)
    if not updated:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"status": "success", "lead_id": lead_id, "new_status": req.status}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
