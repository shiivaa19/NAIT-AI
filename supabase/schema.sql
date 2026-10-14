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

-- 4. Admissions Leads Table (Extended Conversion Engine Attributes)
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
    score INT DEFAULT 50,
    tag TEXT DEFAULT 'WARM' CHECK (tag IN ('HOT', 'WARM', 'COLD')),
    score_reasons JSONB DEFAULT '[]'::jsonb,
    opted_out BOOLEAN DEFAULT FALSE,
    booked_slot_at TIMESTAMPTZ,
    counselling_attended BOOLEAN DEFAULT FALSE,
    enrolled BOOLEAN DEFAULT FALSE,
    voice_call_attempts INT DEFAULT 0,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
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

-- 8. Persistent Automation Jobs Table (APScheduler Idempotency)
CREATE TABLE IF NOT EXISTS public.automation_jobs (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    run_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'skipped')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lead_id, step)
);

-- 9. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    channel TEXT NOT NULL DEFAULT 'mock' CHECK (channel IN ('meta', 'twilio', 'mock')),
    message_id TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    step TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    escalated_to_human BOOLEAN DEFAULT FALSE,
    confidence_score REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Voice Calls Table (Vapi / Retell / Mock Telephony)
CREATE TABLE IF NOT EXISTS public.voice_calls (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    call_id TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'mock' CHECK (provider IN ('vapi', 'retell', 'mock')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'no_answer')),
    trigger_reason TEXT NOT NULL CHECK (trigger_reason IN ('hot_unresponsive_48h', 'counselling_no_show', 'manual_trigger')),
    attempt_number INT NOT NULL DEFAULT 1,
    transcript TEXT,
    summary TEXT,
    outcome TEXT CHECK (outcome IN ('interested', 'reschedule', 'not_interested', 'unreachable')),
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Post-Counselling Feedback Table
CREATE TABLE IF NOT EXISTS public.counselling_feedback (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    counselling_session_id TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    q1_clarity_response TEXT,
    q2_concerns_response TEXT,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    sentiment_score REAL,
    score_delta INT DEFAULT 0,
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
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselling_feedback ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Public access on automation_jobs" ON public.automation_jobs;
CREATE POLICY "Public access on automation_jobs" ON public.automation_jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Public access on whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on voice_calls" ON public.voice_calls;
CREATE POLICY "Public access on voice_calls" ON public.voice_calls FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on counselling_feedback" ON public.counselling_feedback;
CREATE POLICY "Public access on counselling_feedback" ON public.counselling_feedback FOR ALL USING (true) WITH CHECK (true);
