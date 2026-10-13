"""
Deterministic tool calling architecture for NIAT AI Admission Copilot.
All calculations, comparisons, and lead submissions are deterministic backend code.
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.knowledge_base import kb
from backend.models import (
    CostCalculatorRequest,
    CostCalculatorResponse,
    CostItemBreakdown,
    DecisionReportResponse
)
from backend.database import save_lead, save_decision_report, record_event

def search_verified_knowledge_tool(query: str, category: Optional[str] = None) -> Dict[str, Any]:
    """Search verified NIAT knowledge base documents."""
    results = kb.search(query, category=category, top_k=4)
    formatted = []
    for r in results:
        formatted.append({
            "title": r.get("title"),
            "content": r.get("content"),
            "source_url": r.get("source_url"),
            "source_name": r.get("source_name"),
            "verification_status": r.get("verification_status"),
            "applicability": r.get("applicability")
        })
    return {"query": query, "count": len(formatted), "results": formatted}

def get_campus_info_tool(campus_identifier: str) -> Dict[str, Any]:
    """Retrieve detailed verified specifications for a specific collaborating university campus."""
    campus = kb.get_campus_by_id(campus_identifier)
    if not campus:
        return {"error": f"Campus '{campus_identifier}' not found. Please select from 41 collaborating institutions."}
    return {"campus": campus}

def compare_campuses_tool(campus_identifiers: List[str]) -> Dict[str, Any]:
    """Compare 2 to 4 collaborating university campuses side by side."""
    campuses = []
    for c_id in campus_identifiers:
        c = kb.get_campus_by_id(c_id)
        if c:
            campuses.append(c)
            
    if len(campuses) < 2:
        return {"error": "Need at least 2 valid campuses to compare."}
        
    matrix = {
        "Degree Awarding Entity": [c["degree_awarded"] for c in campuses],
        "City & State": [f"{c['city']}, {c['state']}" for c in campuses],
        "Hostel Availability": [c["hostel_availability"] for c in campuses],
        "Transportation": [c["transportation"] for c in campuses],
        "PCM Requirement": [c["pcm_mandated"] for c in campuses],
        "Specialisations": [c["specialisations"] for c in campuses],
        "Official Links": [c["official_url"] for c in campuses]
    }
    return {
        "campuses": campuses,
        "attributes": list(matrix.keys()),
        "matrix": matrix,
        "comparison_summary": f"Comparing {', '.join(c['name'] for c in campuses)}. All grant UGC-recognized degrees independently while offering NIAT industry-ready skilling."
    }

def calculate_four_year_cost_tool(req: CostCalculatorRequest) -> CostCalculatorResponse:
    """
    Pure deterministic arithmetic engine calculating annual and 4-year education costs.
    Distinguishes verified amounts, user quotations, and estimates without LLM mental math.
    """
    annual_tuition = float(req.annual_university_tuition)
    annual_niat = float(req.annual_niat_program_fee)
    annual_hostel = float(req.annual_hostel_fee)
    annual_mess = float(req.annual_mess_fee)
    annual_transport = float(req.annual_transport_fee)
    annual_other = float(req.annual_other_fees)
    annual_scholarship = float(req.annual_scholarship_discount)

    # 4-Year Totals
    four_year_tuition = annual_tuition * 4
    four_year_niat = annual_niat * 4
    four_year_hostel = annual_hostel * 4
    four_year_mess = annual_mess * 4
    four_year_transport = annual_transport * 4
    four_year_other = annual_other * 4
    four_year_scholarship = annual_scholarship * 4

    annual_gross = annual_tuition + annual_niat + annual_hostel + annual_mess + annual_transport + annual_other
    four_year_gross = annual_gross * 4

    annual_net = max(0.0, annual_gross - annual_scholarship)
    four_year_net = max(0.0, four_year_gross - four_year_scholarship)

    items = [
        CostItemBreakdown(
            category="tuition",
            label="University B.Tech Degree Tuition",
            annual_amount=annual_tuition,
            four_year_amount=four_year_tuition,
            status=req.tuition_status,
            notes="Paid directly to the collaborating university for academic credits & degree"
        ),
        CostItemBreakdown(
            category="niat_fee",
            label="NIAT Industry-Ready Upskilling Fee",
            annual_amount=annual_niat,
            four_year_amount=four_year_niat,
            status=req.niat_fee_status,
            notes="Covers modern AI/ML curriculum, 50+ projects, mentor support, and IRC credentials"
        ),
        CostItemBreakdown(
            category="hostel",
            label="Hostel Living Accommodation",
            annual_amount=annual_hostel,
            four_year_amount=four_year_hostel,
            status=req.hostel_status,
            notes="University managed hostel (on-campus or off-campus)"
        ),
        CostItemBreakdown(
            category="mess",
            label="Mess & Dining Charges",
            annual_amount=annual_mess,
            four_year_amount=four_year_mess,
            status="estimated" if annual_mess > 0 else "unknown",
            notes="Meal plan charges (breakfast, lunch, dinner)"
        ),
        CostItemBreakdown(
            category="transport",
            label="Campus Transportation / Bus",
            annual_amount=annual_transport,
            four_year_amount=four_year_transport,
            status="estimated" if annual_transport > 0 else "unknown",
            notes="Optional depending on campus proximity"
        ),
        CostItemBreakdown(
            category="other",
            label="Examination, Lab & Uniform Fees",
            annual_amount=annual_other,
            four_year_amount=four_year_other,
            status="estimated" if annual_other > 0 else "unknown",
            notes="Includes university exam registrations and miscellaneous fees"
        )
    ]

    missing = []
    if annual_tuition == 0:
        missing.append("University Tuition Fee")
    if annual_niat == 0:
        missing.append("NIAT Program Upskilling Fee")
    if annual_hostel == 0 and annual_mess == 0:
        missing.append("Hostel & Mess Charges (if residential)")

    is_complete = len(missing) == 0

    guidance = (
        "This calculation uses deterministic arithmetic based on provided numbers. "
        "Because university tuition and hostel tariffs differ by collaborating university, "
        "please request an official itemized fee quotation from the respective university admissions office before paying."
    )

    campus_label = req.campus_name or "General NIAT Collaborating University"

    return CostCalculatorResponse(
        campus_name=campus_label,
        annual_gross_total=annual_gross,
        four_year_gross_total=four_year_gross,
        annual_net_total=annual_net,
        four_year_net_total=four_year_net,
        total_four_year_scholarship_savings=four_year_scholarship,
        items=items,
        is_complete=is_complete,
        missing_items=missing,
        counsellor_action_note=guidance
    )

async def generate_family_decision_report_tool(
    session_id: str,
    student_name: str = "Prospective Student",
    mode: str = "student",
    preferred_campus: Optional[str] = None,
    main_concerns: List[str] = None
) -> DecisionReportResponse:
    """Generate a synthesized family decision report from the live conversation context."""
    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    campus_info = None
    if preferred_campus:
        campus_info = kb.get_campus_by_id(preferred_campus)
        
    concerns = main_concerns or [
        "Degree recognition and UGC/AICTE validity",
        "Total 4-year transparent fee structure",
        "Hostel safety and facilities",
        "Placement support versus realistic employment outcomes"
    ]
    
    # Verified facts grounded in official sources
    verified_facts = [
        {
            "fact": "Degree Legitimacy: The B.Tech degree is awarded independently by the collaborating university (UGC-recognised / AICTE-approved). NIAT is an upskilling initiative by NxtWave that awards an Industry Ready Certificate (IRC).",
            "source_name": "NIAT University Collabs",
            "source_url": "https://www.niatindia.com/campus",
            "status": "verified_official"
        },
        {
            "fact": "Admission vs Enrollment: University admission and NIAT enrollment are distinct. University admission requires satisfying university criteria; NIAT enrollment requires qualifying the 90-minute NAT (NxtWave Assessment Test, ₹1,200 non-refundable).",
            "source_name": "Official NAT Assessment",
            "source_url": "https://www.niatindia.com/assessment-test",
            "status": "verified_official"
        },
        {
            "fact": "Placement Reality: NIAT provides extensive placement preparation and access to 2,500+ hiring companies, but employment or salary packages are NOT 100% guaranteed. Outcomes depend on student capability and industry demands.",
            "source_name": "NIAT Placements & Career Outcomes",
            "source_url": "https://www.niatindia.com/placements",
            "status": "verified_official"
        }
    ]
    
    questions_for_counsellor = [
        "What is the exact written breakdown between University Tuition and the NIAT Upskilling Fee?",
        "Are hostel and mess charges payable annually or semester-wise, and what is the fee refund policy?",
        "What are the specific eligibility cutoff marks for NAT scholarships or university merit waivers?",
        "Can we visit the university campus, labs, and hostel in person before confirming enrollment?",
        "Who is the designated academic coordinator for student grievances on campus?"
    ]
    
    checklist = [
        {"id": "c1", "task": "Verify Class 12 PCM eligibility (pass out between 2023-2027)", "status": "pending"},
        {"id": "c2", "task": "Register for NAT (NxtWave Assessment Test, 90 mins, 82 questions)", "status": "pending"},
        {"id": "c3", "task": "Select 2-3 preferred collaborating university campuses based on location", "status": "pending"},
        {"id": "c4", "task": "Schedule 1-on-1 official career counselling session with parents", "status": "pending"},
        {"id": "c5", "task": "Request official itemized fee quotation letter", "status": "pending"}
    ]
    
    resp = DecisionReportResponse(
        report_id=report_id,
        session_id=session_id,
        generated_at=now_str,
        student_name=student_name,
        mode=mode,
        summary=f"Personalized Decision & Counselling Readiness Report for {student_name}. Prepared in {mode.capitalize()} Mode to support informed, transparent decision-making with verified official data.",
        student_goals=[
            "Pursue modern B.Tech in CSE with AI & NextGen Engineering specialisation",
            "Build 50+ real-world projects and graduate with an industry-ready portfolio",
            "Ensure full transparency regarding fees, degree awarding, and career outcomes"
        ],
        verified_facts=verified_facts,
        campus_details=campus_info,
        cost_breakdown={
            "general_range": "₹8 Lakhs - ₹18 Lakhs across 4 years (varies by university tuition and hostel option)",
            "key_components": ["University Tuition", "NIAT Upskilling Fee", "Hostel & Mess Charges", "Transport & Exam fees"]
        },
        unresolved_questions=[
            "Exact semester payment schedule for chosen campus",
            "Hostel room occupancy options (2-sharing vs 3-sharing AC/Non-AC)"
        ],
        questions_for_counsellor=questions_for_counsellor,
        readiness_checklist=checklist,
        recommended_next_steps=[
            "Schedule a verified 1-on-1 counselling discussion to clarify university-specific seat availability",
            "Review the NAT syllabus (Critical Thinking, Mathematics, Psychometric)",
            "Share this summary report with parents or guardians"
        ]
    )
    
    # Persist in DB
    await save_decision_report(report_id, session_id, resp.model_dump())
    return resp

async def submit_counselling_lead_tool(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    """Capture a consented student or parent lead for counselling follow-up."""
    lead_id = await save_lead(lead_data)
    return {
        "lead_id": lead_id,
        "status": "success",
        "message": "Counselling request successfully registered. An official academic advisor will contact you."
    }

# Tool schemas for OpenAI/Groq function calling
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_verified_knowledge",
            "description": "Search verified NIAT official knowledge documents, guidelines, degree details, fees, and placement policies.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query (e.g. 'degree awarding university', 'NAT pattern', 'hostel facilities', 'highest package')"
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter: about_niat, degree_partnership, nat_assessment, eligibility, fee_structure, placements_internships, campus_info"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_campus_info",
            "description": "Get verified details of a collaborating university campus (facilities, degree, city, state, hostel, transportation, PCM requirement).",
            "parameters": {
                "type": "object",
                "properties": {
                    "campus_identifier": {
                        "type": "string",
                        "description": "Campus slug or name, e.g. 'chaitanya-university', 'aurora-deemed-university', 'yenepoya-bangalore', 'gmrit'"
                    }
                },
                "required": ["campus_identifier"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_campuses",
            "description": "Compare 2 to 4 collaborating university campuses side-by-side on location, degree, hostel, transport, and facilities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campus_identifiers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of 2 to 4 campus slugs or names to compare"
                    }
                },
                "required": ["campus_identifiers"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_four_year_cost",
            "description": "Calculate deterministic 4-year and annual education costs. Never do mental math; use this tool.",
            "parameters": {
                "type": "object",
                "properties": {
                    "annual_university_tuition": {"type": "number", "description": "Annual university tuition amount in INR"},
                    "annual_niat_program_fee": {"type": "number", "description": "Annual NIAT upskilling fee in INR"},
                    "annual_hostel_fee": {"type": "number", "description": "Annual hostel fee in INR"},
                    "annual_mess_fee": {"type": "number", "description": "Annual mess/dining fee in INR"},
                    "annual_transport_fee": {"type": "number", "description": "Annual transport fee in INR"},
                    "annual_other_fees": {"type": "number", "description": "Annual exam/lab fees in INR"},
                    "annual_scholarship_discount": {"type": "number", "description": "Annual scholarship or fee waiver in INR"},
                    "campus_name": {"type": "string", "description": "Name of the campus"}
                },
                "required": ["annual_university_tuition", "annual_niat_program_fee"]
            }
        }
    }
]
