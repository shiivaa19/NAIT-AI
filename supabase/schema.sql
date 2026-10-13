-- ==============================================================================
-- NIAT AI ADMISSION COPILOT — SUPABASE POSTGRESQL SCHEMA WITH PGVECTOR
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    mode TEXT NOT NULL DEFAULT 'student' CHECK (mode IN ('student', 'parent')),
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'te', 'hi', 'ta', 'kn', 'ml')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    tools_used JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Leads & Consent table (Primary Conversion Pipeline)
CREATE TABLE IF NOT EXISTS public.leads (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT REFERENCES public.sessions(session_id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT,
    target_intake_year INTEGER NOT NULL DEFAULT 2026,
    preferred_campus TEXT,
    main_concerns JSONB DEFAULT '[]'::jsonb,
    consent_given BOOLEAN NOT NULL DEFAULT true,
    consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'enrolled', 'closed')),
    counsellor_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Saved Family Decision Reports
CREATE TABLE IF NOT EXISTS public.decision_reports (
    report_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    report_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Admission Readiness Checklist Progress
CREATE TABLE IF NOT EXISTS public.checklist_progress (
    session_id TEXT NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (session_id, item_id)
);

-- 7. Analytics Events (Growth Funnel Tracking)
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Verified Knowledge Documents & Vector Embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_name TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'verified_official',
    applicability TEXT NOT NULL DEFAULT '2023-2027 Cohorts',
    embedding vector(1536), -- Vector dimensions for semantic search
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_preferred_campus ON public.leads(preferred_campus);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON public.knowledge_documents(category);

-- Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Public Anonymous Policies (For Prospective Students and Parents)
CREATE POLICY "Public can insert and read their own sessions"
    ON public.sessions FOR ALL USING (true);

CREATE POLICY "Public can insert and view messages for their session"
    ON public.messages FOR ALL USING (true);

CREATE POLICY "Public can insert consented leads"
    ON public.leads FOR INSERT WITH CHECK (consent_given = true);

CREATE POLICY "Public can read and create decision reports"
    ON public.decision_reports FOR ALL USING (true);

CREATE POLICY "Public can manage checklist progress"
    ON public.checklist_progress FOR ALL USING (true);

CREATE POLICY "Public can insert analytics events"
    ON public.analytics_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read verified knowledge documents"
    ON public.knowledge_documents FOR SELECT USING (true);

-- Authenticated Admin Policies (For Admission Counsellors and Officers)
CREATE POLICY "Admins have full access to leads"
    ON public.leads FOR ALL TO authenticated USING (true);

-- View for 7-Day Pilot Growth Funnel Metrics
CREATE OR REPLACE VIEW public.growth_pilot_funnel_view AS
SELECT
    (SELECT COUNT(DISTINCT session_id) FROM public.messages) AS chats_initiated,
    (SELECT COUNT(*) FROM public.decision_reports) AS reports_generated,
    (SELECT COUNT(*) FROM public.leads WHERE consent_given = true) AS consented_counselling_requests,
    ROUND(
        (SELECT COUNT(*) FROM public.leads WHERE consent_given = true)::numeric /
        NULLIF((SELECT COUNT(DISTINCT session_id) FROM public.messages), 0)::numeric * 100,
        1
    ) AS counselling_conversion_rate;
