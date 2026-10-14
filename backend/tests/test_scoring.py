"""
Unit tests for Lead Scoring & Auto-Tagging engine.
Verifies scoring across interest, budget, course fit, timeline, and engagement.
"""

import pytest
from backend.scoring import compute_lead_score

def test_hot_lead_scoring():
    lead_data = {
        "student_name": "Rohan Sharma",
        "parent_name": "Rajesh Sharma",
        "phone": "+919876543210",
        "email": "rohan@example.com",
        "state": "Telangana",
        "city": "Hyderabad",
        "target_intake_year": 2026,
        "preferred_campus": "Chaitanya (Deemed to be University) - Hyderabad",
        "main_concerns": ["Degree recognition", "Complete 4-year fee structure"],
        "notes": "Looking for B.Tech CSE AI/ML program with direct tech lab immersion.",
        "consent_given": True
    }
    
    session_messages = [
        {"role": "user", "content": "Hi, what is the B.Tech CSE curriculum and fee structure at Hyderabad campus?"},
        {"role": "assistant", "content": "NIAT provides AI/ML lab tracks..."},
        {"role": "user", "content": "Is hostel available and what are the scholarship criteria for NAT exam?"},
        {"role": "assistant", "content": "Yes, hostel is verified..."},
        {"role": "user", "content": "Can I book a counselling session with my father this weekend?"}
    ]
    
    events = [
        {"event_type": "cost_calculation_performed", "event_data": {"four_year_total": 1450000}},
        {"event_type": "decision_report_generated", "event_data": {}}
    ]
    
    result = compute_lead_score(lead_data, session_messages, events)
    assert result.score >= 70, f"Expected HOT score >= 70, got {result.score}"
    assert result.tag == "HOT"
    assert len(result.reasons) == 5
    assert any("Explicit campus preference" in r.reason for r in result.reasons)
    assert any("fee calculator" in r.reason for r in result.reasons)

def test_warm_lead_scoring():
    lead_data = {
        "student_name": "Ananya Roy",
        "parent_name": "",
        "phone": "+919123456789",
        "email": "ananya@example.com",
        "state": "West Bengal",
        "city": "Kolkata",
        "target_intake_year": 2027,
        "preferred_campus": None,
        "main_concerns": [],
        "notes": "",
        "consent_given": True
    }
    
    session_messages = [
        {"role": "user", "content": "What is NIAT?"}
    ]
    
    result = compute_lead_score(lead_data, session_messages, [])
    assert 40 <= result.score < 70, f"Expected WARM score between 40 and 69, got {result.score}"
    assert result.tag == "WARM"

def test_cold_lead_ineligible():
    lead_data = {
        "student_name": "Suresh Patel",
        "parent_name": "",
        "phone": "+919000011111",
        "email": "suresh@example.com",
        "state": "Gujarat",
        "city": "Ahmedabad",
        "target_intake_year": 2021,  # Ineligible (<2023)
        "preferred_campus": "None",
        "main_concerns": [],
        "notes": "",
        "consent_given": True
    }
    
    session_messages = [
        {"role": "user", "content": "Can I join if I passed 12th in 2021?"}
    ]
    
    result = compute_lead_score(lead_data, session_messages, [])
    assert result.score < 40, f"Expected COLD score < 40, got {result.score}"
    assert result.tag == "COLD"
    academic_reason = next(r for r in result.reasons if r.dimension == "Course & Academic Fit")
    assert "precedes 2023 eligibility criteria" in academic_reason.reason
