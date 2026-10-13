"""
Automated Pytest Suite for NIAT AI Admission Copilot.
Validates RAG retrieval, anti-hallucination guardrails, Telugu multilingual response,
deterministic arithmetic, and lead persistence.
"""

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.knowledge_base import kb
from backend.models import CostCalculatorRequest
from backend.tools import calculate_four_year_cost_tool, compare_campuses_tool
from backend.ai_engine import ai_engine
from backend.database import init_db, get_admin_metrics, get_all_leads

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    import asyncio
    asyncio.run(init_db())

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["campuses_count"] >= 35
    assert data["knowledge_chunks"] >= 50

def test_knowledge_base_retrieval():
    docs = kb.search("Who awards the B.Tech degree?")
    assert len(docs) > 0
    found_degree_mention = any("degree" in d["content"].lower() or "university" in d["content"].lower() for d in docs)
    assert found_degree_mention

def test_campus_retrieval_and_details():
    campuses = kb.get_all_campuses()
    assert len(campuses) >= 40
    # Search for Hyderabad campuses
    hyd_campuses = [c for c in campuses if "hyderabad" in c["city"].lower() or "telangana" in c["state"].lower()]
    assert len(hyd_campuses) >= 2
    # Verify campus structure
    c = hyd_campuses[0]
    assert "degree_awarded" in c
    assert "hostel_availability" in c
    assert "official_url" in c

def test_deterministic_cost_calculator():
    req = CostCalculatorRequest(
        annual_university_tuition=200000.0,
        annual_niat_program_fee=80000.0,
        annual_hostel_fee=100000.0,
        annual_mess_fee=40000.0,
        annual_transport_fee=20000.0,
        annual_scholarship_discount=40000.0
    )
    res = calculate_four_year_cost_tool(req)
    
    # 200k + 80k + 100k + 40k + 20k = 440k annual gross
    assert res.annual_gross_total == 440000.0
    # 440k * 4 = 1.76M 4-year gross
    assert res.four_year_gross_total == 1760000.0
    # Net annual = 440k - 40k = 400k
    assert res.annual_net_total == 400000.0
    # Net 4-year = 400k * 4 = 1.60M
    assert res.four_year_net_total == 1600000.0
    # Scholarship savings = 40k * 4 = 160k
    assert res.total_four_year_scholarship_savings == 160000.0
    assert res.is_complete is True

def test_campus_comparison_tool():
    c_list = kb.get_all_campuses()
    id1 = c_list[0]["id"]
    id2 = c_list[1]["id"]
    res = compare_campuses_tool([id1, id2])
    assert "matrix" in res
    assert len(res["campuses"]) == 2

@pytest.mark.asyncio
async def test_ai_engine_telugu_father_explanation():
    resp = await ai_engine.generate_response(
        message="Explain this in simple Telugu to my father",
        session_id="test_telugu_sess",
        mode="parent",
        language="te"
    )
    assert resp["language"] == "te"
    # Ensure response contains key Telugu explanations
    assert any(k in resp["message"] for k in ["నాన్న", "యూనివర్సిటీ", "డిగ్రీ", "ఫీజు"])

@pytest.mark.asyncio
async def test_ai_anti_hallucination_degree_claim():
    resp = await ai_engine.generate_response(
        message="Is NIAT a university or who awards my degree?",
        session_id="test_degree_sess",
        mode="student",
        language="en"
    )
    # Must NOT claim NIAT is a university
    msg = resp["message"].lower()
    assert "not a university" in msg or "not a standalone university" in msg
    assert "collaborating university" in msg or "university" in msg
    assert len(resp["citations"]) > 0

def test_counselling_lead_submission_api():
    payload = {
        "student_name": "Karthik Verma",
        "parent_name": "Suresh Verma",
        "phone": "+91 98765 43210",
        "email": "karthik.v@example.com",
        "state": "Telangana",
        "city": "Hyderabad",
        "target_intake_year": 2026,
        "preferred_campus": "Chaitanya (Deemed to be University) - Hyderabad",
        "main_concerns": ["Degree recognition", "Hostel accommodation"],
        "consent_given": True,
        "notes": "Interested in AI specialisation."
    }
    response = client.post("/api/counselling", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "registered"
    assert data["lead_id"] > 0

def test_admin_metrics_api():
    response = client.get("/api/admin/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["total_consented_leads"] >= 1
    assert data["target_hypothesis_rate"] == 30.0
    assert len(data["common_concerns"]) > 0
    assert "funnel" in data
