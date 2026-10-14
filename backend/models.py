"""
Pydantic data models for NIAT AI Admission Copilot.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Citation(BaseModel):
    source_name: str
    source_url: str
    verification_status: str = "verified_official"
    snippet: Optional[str] = None
    applicability: Optional[str] = "2023-2027 Cohorts"

class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str  # "user" | "assistant" | "system"
    content: str
    citations: List[Citation] = []
    created_at: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    mode: str = "student"  # "student" | "parent"
    language: str = "en"   # "en" | "te" | "hi" | "ta"
    history: List[Dict[str, Any]] = []

class ChatResponse(BaseModel):
    session_id: str
    message: str
    mode: str
    language: str
    citations: List[Citation] = []
    tools_used: List[str] = []
    clarification_question: Optional[str] = None
    suggested_actions: List[str] = []
    engine_used: Optional[str] = None
    latency_ms: Optional[int] = None

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "student"

class UserLoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    email: Optional[str] = "google.student@gmail.com"
    name: Optional[str] = "Google Student"
    role: Optional[str] = "student"

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserResponse

class CostItemBreakdown(BaseModel):
    category: str
    label: str
    annual_amount: float
    four_year_amount: float
    status: str  # "verified_official" | "user_quotation" | "estimated" | "unknown"
    notes: Optional[str] = None

class CostCalculatorRequest(BaseModel):
    campus_id: Optional[str] = None
    campus_name: Optional[str] = None
    annual_university_tuition: float = Field(default=0.0, ge=0)
    annual_niat_program_fee: float = Field(default=0.0, ge=0)
    annual_hostel_fee: float = Field(default=0.0, ge=0)
    annual_mess_fee: float = Field(default=0.0, ge=0)
    annual_transport_fee: float = Field(default=0.0, ge=0)
    annual_other_fees: float = Field(default=0.0, ge=0)
    annual_scholarship_discount: float = Field(default=0.0, ge=0)
    scholarship_conditions: Optional[str] = None
    tuition_status: str = "estimate"
    hostel_status: str = "estimate"
    niat_fee_status: str = "estimate"

class CostCalculatorResponse(BaseModel):
    campus_name: str
    annual_gross_total: float
    four_year_gross_total: float
    annual_net_total: float
    four_year_net_total: float
    total_four_year_scholarship_savings: float
    items: List[CostItemBreakdown]
    is_complete: bool
    missing_items: List[str] = []
    counsellor_action_note: str

class CampusCompareRequest(BaseModel):
    campus_ids: List[str] = Field(..., min_length=2, max_length=4)

class CampusCompareResponse(BaseModel):
    campuses: List[Dict[str, Any]]
    attributes: List[str]
    summary_comparison: str

class CounsellingLeadRequest(BaseModel):
    session_id: Optional[str] = None
    student_name: str
    parent_name: Optional[str] = None
    phone: str
    email: str
    state: str
    city: Optional[str] = None
    target_intake_year: int = 2026
    preferred_campus: Optional[str] = None
    main_concerns: List[str] = []
    consent_given: bool = True
    notes: Optional[str] = None

class ScoreReasonItem(BaseModel):
    dimension: str
    points: int
    max_points: int
    reason: str

class LeadScoreResponse(BaseModel):
    lead_id: int
    score: int
    tag: str
    reasons: List[ScoreReasonItem] = []
    summary: str
    updated_at: Optional[str] = None

class CounsellingLeadResponse(BaseModel):
    lead_id: int
    status: str
    message: str
    score: int = 50
    tag: str = "WARM"
    score_reasons: List[ScoreReasonItem] = []
    created_at: str

class LeadStatusUpdateRequest(BaseModel):
    status: str  # "new" | "contacted" | "scheduled" | "enrolled" | "closed"
    notes: Optional[str] = None

class DecisionReportRequest(BaseModel):
    session_id: str
    student_name: Optional[str] = "Prospective Student"
    mode: str = "student"
    preferred_campus: Optional[str] = None
    main_concerns: List[str] = []
    notes: Optional[str] = None

class DecisionReportResponse(BaseModel):
    report_id: str
    session_id: str
    generated_at: str
    student_name: str
    mode: str
    summary: str
    student_goals: List[str]
    verified_facts: List[Dict[str, Any]]
    campus_details: Optional[Dict[str, Any]]
    cost_breakdown: Optional[Dict[str, Any]]
    unresolved_questions: List[str]
    questions_for_counsellor: List[str]
    readiness_checklist: List[Dict[str, Any]]
    recommended_next_steps: List[str]

class ChecklistUpdateRequest(BaseModel):
    session_id: str
    completed_item_ids: List[str]

class AdminMetricsResponse(BaseModel):
    total_chats: int
    total_consented_leads: int
    total_reports_generated: int
    counselling_conversion_rate: float
    target_hypothesis_rate: float = 30.0
    common_concerns: List[Dict[str, Any]]
    campus_interest: List[Dict[str, Any]]
    funnel: Dict[str, int]
    source_verification_coverage: float
    failed_requests: int
    active_pilot_day: int = 3
