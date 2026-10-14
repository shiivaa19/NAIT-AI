"""
Lead Scoring & Auto-Tagging Engine for NIAT AI Admission Conversion Engine.
Computes multi-dimensional score (0-100) and categorizes leads as HOT / WARM / COLD
using stated interest, budget fit, course/eligibility fit, timeline urgency, and engagement.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ScoreDimension(BaseModel):
    dimension: str
    points: int
    max_points: int
    reason: str

class LeadScoreResult(BaseModel):
    score: int = Field(..., ge=0, le=100)
    tag: str = Field(..., pattern="^(HOT|WARM|COLD)$")
    reasons: List[ScoreDimension] = []
    summary: str


def compute_lead_score(
    lead_data: Dict[str, Any],
    session_messages: Optional[List[Dict[str, Any]]] = None,
    events: Optional[List[Dict[str, Any]]] = None
) -> LeadScoreResult:
    """
    Evaluates a lead across 5 key dimensions:
    1. Stated Interest (25 pts): Campus preference, specific goals, stated questions.
    2. Budget & Financial Fit (20 pts): Cost calculator usage, scholarship inquiries, realistic budget.
    3. Course & Academic Fit (20 pts): 12th PCM pass-out eligibility (2023-2027), tech track interest.
    4. Timeline & Urgency (15 pts): Immediate intake (2026) vs future.
    5. Engagement Depth (20 pts): Message volume, decision reports, parent involvement.
    """
    reasons: List[ScoreDimension] = []
    total_score = 0
    messages = session_messages or []
    event_list = events or []

    # -------------------------------------------------------------
    # 1. Stated Interest & Intent (Max: 25)
    # -------------------------------------------------------------
    interest_pts = 0
    interest_notes = []

    preferred_campus = lead_data.get("preferred_campus")
    if preferred_campus and preferred_campus.strip().lower() not in ["none", "any", "not sure"]:
        interest_pts += 12
        interest_notes.append(f"Explicit campus preference stated ({preferred_campus})")
    else:
        interest_pts += 5
        interest_notes.append("No specific campus chosen yet")

    main_concerns = lead_data.get("main_concerns") or []
    if isinstance(main_concerns, list) and len(main_concerns) > 0:
        interest_pts += 8
        interest_notes.append(f"Specified key decision concerns: {', '.join(main_concerns[:2])}")
    else:
        interest_pts += 3
        interest_notes.append("General admission interest without specific concerns")

    notes = lead_data.get("notes") or ""
    if len(notes.strip()) > 10:
        interest_pts += 5
        interest_notes.append("Provided detailed personal notes/objectives")

    interest_pts = min(25, interest_pts)
    total_score += interest_pts
    reasons.append(ScoreDimension(
        dimension="Stated Interest",
        points=interest_pts,
        max_points=25,
        reason="; ".join(interest_notes)
    ))

    # -------------------------------------------------------------
    # 2. Budget & Financial Fit (Max: 20)
    # -------------------------------------------------------------
    budget_pts = 0
    budget_notes = []

    # Check if cost calculator was used in events
    cost_calc_events = [e for e in event_list if e.get("event_type") == "cost_calculation_performed"]
    if cost_calc_events:
        budget_pts += 12
        budget_notes.append("Actively engaged with 4-year transparent fee calculator")
    else:
        # Check in messages if fee or scholarship was discussed
        user_text = " ".join([m.get("content", "").lower() for m in messages if m.get("role") == "user"])
        if any(w in user_text for w in ["fee", "cost", "scholarship", "emi", "lakh", "budget"]):
            budget_pts += 8
            budget_notes.append("Discussed fee structure or scholarship options in chat")
        else:
            budget_pts += 5
            budget_notes.append("Standard tuition tier assumed")

    if lead_data.get("state") in ["Telangana", "Andhra Pradesh", "Karnataka"]:
        budget_pts += 8
        budget_notes.append(f"Local state resident ({lead_data.get('state')}), reduced commute/hostel friction")
    else:
        budget_pts += 5
        budget_notes.append(f"Outstation candidate ({lead_data.get('state', 'Other')}) requiring hostel planning")

    budget_pts = min(20, budget_pts)
    total_score += budget_pts
    reasons.append(ScoreDimension(
        dimension="Budget & Financial Fit",
        points=budget_pts,
        max_points=20,
        reason="; ".join(budget_notes)
    ))

    # -------------------------------------------------------------
    # 3. Course & Academic Fit (Max: 20)
    # -------------------------------------------------------------
    academic_pts = 0
    academic_notes = []

    intake_year = int(lead_data.get("target_intake_year") or 2026)
    # Eligibility rules: 12th PCM pass-out 2023-2027
    if intake_year in [2025, 2026]:
        academic_pts += 15
        academic_notes.append(f"Target intake year {intake_year} aligns with active cohort")
    elif intake_year in [2027]:
        academic_pts += 10
        academic_notes.append("Prospective 2027 intake candidate")
    elif intake_year < 2023:
        academic_pts -= 15  # Ineligible penalty
        academic_notes.append(f"Pass-out year {intake_year} precedes 2023 eligibility criteria")
    else:
        academic_pts += 5
        academic_notes.append(f"Intake year {intake_year} logged")

    # Check for tech focus (AI, CSE, Software)
    all_content = (notes + " " + " ".join([m.get("content", "") for m in messages])).lower()
    if any(k in all_content for k in ["ai", "machine learning", "cse", "coding", "software", "tech", "data science"]):
        academic_pts += 5
        academic_notes.append("Demonstrated direct interest in AI/ML & Computer Science specialisation")
    else:
        academic_pts += 2
        academic_notes.append("General engineering profile")

    academic_pts = max(0, min(20, academic_pts))
    total_score += academic_pts
    reasons.append(ScoreDimension(
        dimension="Course & Academic Fit",
        points=academic_pts,
        max_points=20,
        reason="; ".join(academic_notes)
    ))

    # -------------------------------------------------------------
    # 4. Timeline & Urgency (Max: 15)
    # -------------------------------------------------------------
    timeline_pts = 0
    timeline_notes = []

    if intake_year == 2026:
        timeline_pts += 15
        timeline_notes.append("Immediate 2026 admission cohort (High urgency)")
    elif intake_year == 2025:
        timeline_pts += 12
        timeline_notes.append("Current year lateral/transfer candidate")
    else:
        timeline_pts += 7
        timeline_notes.append("Future academic year planning")

    timeline_pts = min(15, timeline_pts)
    total_score += timeline_pts
    reasons.append(ScoreDimension(
        dimension="Timeline & Urgency",
        points=timeline_pts,
        max_points=15,
        reason="; ".join(timeline_notes)
    ))

    # -------------------------------------------------------------
    # 5. Engagement Depth (Max: 20)
    # -------------------------------------------------------------
    engagement_pts = 0
    engagement_notes = []

    user_msgs_count = len([m for m in messages if m.get("role") == "user"])
    if user_msgs_count >= 5:
        engagement_pts += 10
        engagement_notes.append(f"High conversational depth ({user_msgs_count} student queries)")
    elif user_msgs_count >= 2:
        engagement_pts += 6
        engagement_notes.append(f"Moderate conversational depth ({user_msgs_count} student queries)")
    else:
        engagement_pts += 3
        engagement_notes.append("Initial interaction session")

    # Parent contact provided
    parent_name = lead_data.get("parent_name")
    if parent_name and len(parent_name.strip()) > 1:
        engagement_pts += 6
        engagement_notes.append(f"Parent/guardian actively involved ({parent_name.strip()})")

    # Generated decision report
    report_events = [e for e in event_list if e.get("event_type") == "decision_report_generated"]
    if report_events:
        engagement_pts += 4
        engagement_notes.append("Generated family decision roadmap report")

    engagement_pts = min(20, engagement_pts)
    total_score += engagement_pts
    reasons.append(ScoreDimension(
        dimension="Engagement Depth",
        points=engagement_pts,
        max_points=20,
        reason="; ".join(engagement_notes)
    ))

    # -------------------------------------------------------------
    # Final Tag Calculation
    # -------------------------------------------------------------
    final_score = max(0, min(100, total_score))
    if final_score >= 70:
        tag = "HOT"
        summary = f"High-intent candidate ({final_score}/100). Ready for fast-track counselling and priority slot booking."
    elif final_score >= 40:
        tag = "WARM"
        summary = f"Engaged candidate ({final_score}/100) actively evaluating campus options and curriculum."
    else:
        tag = "COLD"
        summary = f"Early-stage or unverified eligibility lead ({final_score}/100). Requires educational nurturing."

    return LeadScoreResult(
        score=final_score,
        tag=tag,
        reasons=reasons,
        summary=summary
    )
