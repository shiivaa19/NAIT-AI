# 🚀 NIAT AI ADMISSION COPILOT — FULL AI-NATIVE GROWTH SYSTEM

An enterprise-grade, production-ready AI conversational assistant and admission growth platform engineered for **NIAT** (NxtWave of Innovation in Advanced Technologies). Grounded in verified official documentation from [niatindia.com](https://www.niatindia.com/), 41 collaborating university campus directories, NAT assessment regulations, transparent fee structures, and placement analytics.

---

## 🌟 Key Architecture & Capabilities

### 1. Real, Dynamic LLM Reasoning
- **Configurable LLM Engine**: Connected to Groq API (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) with automatic failover to an intelligent grounded RAG engine when no API key is supplied.
- **Natural Language Understanding**: Understands novel questions, reasons across multi-turn context, resolves ambiguities, and performs deterministic math instead of LLM mental arithmetic.
- **Anti-Hallucination Guardrails**:
  - Never claims NIAT is a standalone university or directly confers B.Tech degrees (the degree is independently conferred by the collaborating UGC/AICTE university).
  - Never guarantees 100% placements or jobs.
  - Never fabricates fee numbers.
  - Generates clickable primary citations (`[Source: Page Title](https://www.niatindia.com/...)`).

### 2. Dual Persona Architecture
- **🎓 Student Mode**: Focuses on cutting-edge curriculum (Generative AI, Agentic workflows, full-stack), 50+ real-world projects, Class 12 PCM eligibility (2023–2027), NAT exam prep, and tech career pathways.
- **👨‍👩‍👧 Parent Mode**: Focuses on legal degree legitimacy (UGC recognition), transparent 4-year cost breakdown, hostel safety and security, realistic placement assistance, and questions to ask counsellors before paying.

### 3. Native Multilingual Intelligence (English + Telugu + Hindi + Tamil)
- Native conversational Telugu support designed specifically for parents (`"Explain this in simple Telugu to my father"` -> fluent, respectful Telugu explaining the degree relationship, fee model, and safety).

### 4. Interactive Growth Tools
- **🧮 4-Year Cost Calculator**: Deterministic arithmetic engine calculating annual and 4-year totals for tuition, NIAT fees, hostel, mess, transport, and scholarships with verified vs estimate flags.
- **🏫 41+ Campus Comparator**: Side-by-side comparison across 15+ cities (Hyderabad, Bengaluru, Chennai, Pune, Jaipur, etc.) on degree, hostels, transport, and facilities.
- **📄 Personalized Family Decision Report**: Synthesizes live conversation context into an itemized, printable dossier.
- **✅ Admission Readiness Checklist**: 6-step roadmap from Class 12 verification to enrollment.
- **📞 Consented Counselling Pipeline**: Trust-first lead capture requiring explicit DPDP consent.
- **📊 Admin Growth Dashboard**: Real-time funnel metrics, conversion tracking against the 30% pilot hypothesis, unresolved concerns, and lead management.

---

## 🏗️ Project Structure

```
NIAT-AI/
├── backend/
│   ├── data/
│   │   ├── campuses.json           # 41 verified partner campus profiles
│   │   └── knowledge_base.json     # 54 verified RAG knowledge chunks
│   ├── scripts/
│   │   └── ingest_official_data.py # Ingestion script for official NIAT data
│   ├── tests/
│   │   └── test_copilot.py         # Automated pytest test suite (9 tests)
│   ├── ai_engine.py                # AI orchestration layer (Groq + Local RAG)
│   ├── config.py                   # Pydantic Settings configuration
│   ├── database.py                 # Async SQLite + Supabase migration adapter
│   ├── knowledge_base.py           # Hybrid RAG search engine
│   ├── main.py                     # FastAPI application endpoints
│   ├── models.py                   # Pydantic data schemas
│   ├── requirements.txt            # Python dependencies
│   └── tools.py                    # Deterministic tool executions
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdmissionChecklistModal.tsx
│   │   │   ├── CampusComparisonModal.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── CitationsDrawer.tsx
│   │   │   ├── CostCalculatorModal.tsx
│   │   │   ├── CounsellingRequestModal.tsx
│   │   │   ├── DecisionReportModal.tsx
│   │   │   └── Navbar.tsx
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── supabase/
│   └── schema.sql                  # PostgreSQL + pgvector schema and RLS policies
├── .env.example                    # Environment variable reference
├── DEPLOYMENT.md                   # Production deployment guide
├── GROWTH_PILOT.md                 # 7-day pilot experiment plan
└── LOOM_SCRIPT.md                  # 3-minute video demonstration walkthrough
```

---

## ⚡ Quick Start on Localhost

### 1. Prerequisites
- **Node.js**: v18+ (tested on v22.19.0)
- **Python**: 3.10+ (tested on 3.13.7)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional)* Add your free Groq API key in `.env`:
```ini
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```
> **Note**: Even without an API key, the system runs with its intelligent grounded RAG reasoning engine, with zero setup friction!

### 3. Start Backend Server
```bash
# In project root:
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and Swagger docs will be live at:
- **API Health**: `http://localhost:8000/api/health`
- **Swagger Docs**: `http://localhost:8000/docs`

### 4. Start Frontend Application
In a separate terminal:
```bash
cd frontend
npm run dev
```
The interactive frontend will be live at:
- **Local URL**: `http://localhost:5173`

---

## 🧪 Automated Verification & Tests

Run the backend test suite:
```bash
python -m pytest backend/tests/test_copilot.py -v
```

All 9 integration tests verify:
1. Health check & database initialization
2. Hybrid RAG retrieval over verified documents
3. 41+ campus directory lookups
4. Pure deterministic arithmetic in 4-year cost calculation
5. Campus comparison matrix generation
6. Fluent Telugu explanation for parents
7. Strict anti-hallucination guardrails (degree entity & placement policy)
8. Consented counselling lead registration
9. Admin growth funnel and conversion analytics
