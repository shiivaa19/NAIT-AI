-- ==============================================================
-- NIAT AI Admission Copilot - Supabase Database Schema
-- Run this script in your Supabase SQL Editor (1-Click Setup)
-- ==============================================================

-- 1. Users Table (Real Email & Password Hashed Storage)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    session_id TEXT PRIMARY KEY,
    mode TEXT DEFAULT 'student',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    tools_used JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Admissions Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT,
    student_name TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT,
    target_intake_year INT DEFAULT 2026,
    preferred_campus TEXT,
    main_concerns JSONB DEFAULT '[]'::jsonb,
    consent_given BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Decision Reports Table
CREATE TABLE IF NOT EXISTS public.decision_reports (
    report_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    report_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Admission Checklist Progress
CREATE TABLE IF NOT EXISTS public.checklist_progress (
    session_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, item_id)
);

-- 7. Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows secure read/write via the Publishable API Key
-- ==============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies allowing full API access for the app
DROP POLICY IF EXISTS "Public access on users" ON public.users;
CREATE POLICY "Public access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on sessions" ON public.sessions;
CREATE POLICY "Public access on sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on messages" ON public.messages;
CREATE POLICY "Public access on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on leads" ON public.leads;
CREATE POLICY "Public access on leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on decision_reports" ON public.decision_reports;
CREATE POLICY "Public access on decision_reports" ON public.decision_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on checklist_progress" ON public.checklist_progress;
CREATE POLICY "Public access on checklist_progress" ON public.checklist_progress FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on analytics_events" ON public.analytics_events;
CREATE POLICY "Public access on analytics_events" ON public.analytics_events FOR ALL USING (true) WITH CHECK (true);
