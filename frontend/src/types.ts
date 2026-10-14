export type UserMode = 'student' | 'parent';
export type LanguageCode = 'en' | 'te' | 'hi' | 'ta';
export type ThemeMode = 'light' | 'dark';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  user: User;
}

export interface Citation {
  source_name: string;
  source_url: string;
  verification_status: string;
  snippet?: string;
  applicability?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  tools_used?: string[];
  engine_used?: string;
  latency_ms?: number;
  created_at?: string;
}

export interface Campus {
  id: string;
  name: string;
  full_title: string;
  url_path: string;
  official_url: string;
  city: string;
  state: string;
  degree_awarded: string;
  niat_credential: string;
  specialisations: string;
  hostel_availability: string;
  transportation: string;
  uniform_mandatory: string;
  pcm_mandated: string;
  eligibility: string;
  description: string;
  facilities: string[];
  verified: boolean;
  estimated_fee_range: string;
}

export interface CostItemBreakdown {
  category: string;
  label: string;
  annual_amount: number;
  four_year_amount: number;
  status: string;
  notes?: string;
}

export interface CostCalculatorResult {
  campus_name: string;
  annual_gross_total: number;
  four_year_gross_total: number;
  annual_net_total: number;
  four_year_net_total: number;
  total_four_year_scholarship_savings: number;
  items: CostItemBreakdown[];
  is_complete: boolean;
  missing_items: string[];
  counsellor_action_note: string;
}

export interface CampusComparisonResult {
  campuses: Campus[];
  attributes: string[];
  summary_comparison: string;
}

export interface DecisionReport {
  report_id: string;
  session_id: string;
  generated_at: string;
  student_name: string;
  mode: string;
  summary: string;
  student_goals: string[];
  verified_facts: Array<{
    fact: string;
    source_name: string;
    source_url: string;
    status: string;
  }>;
  campus_details?: Campus;
  cost_breakdown?: {
    general_range: string;
    key_components: string[];
  };
  unresolved_questions: string[];
  questions_for_counsellor: string[];
  readiness_checklist: Array<{
    id: string;
    task: string;
    status: string;
  }>;
  recommended_next_steps: string[];
}

export interface ScoreReason {
  dimension: string;
  points: number;
  max_points: number;
  reason: string;
}

export interface CounsellingLead {
  id: number;
  session_id?: string;
  student_name: string;
  parent_name?: string;
  phone: string;
  email: string;
  state: string;
  city?: string;
  target_intake_year: number;
  preferred_campus?: string;
  main_concerns: string[];
  consent_given: boolean;
  status: 'new' | 'contacted' | 'scheduled' | 'enrolled' | 'closed';
  notes?: string;
  score?: number;
  tag?: 'HOT' | 'WARM' | 'COLD';
  score_reasons?: ScoreReason[];
  opted_out?: boolean;
  booked_slot_at?: string;
  counselling_attended?: boolean;
  enrolled?: boolean;
  voice_call_attempts?: number;
  last_interaction_at?: string;
  created_at: string;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversion_from_prev: number;
}

export interface ConversionFunnelResponse {
  funnel_stages: FunnelStage[];
  total_conversion_rate: number;
  lead_to_enrolled_rate: number;
  updated_at: string;
}

export interface AutomationJob {
  id: number;
  lead_id: number;
  step: string;
  run_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped';
  attempts: number;
  max_attempts: number;
  last_error?: string;
}

export interface LeadTimeline {
  lead: CounsellingLead;
  timeline: {
    jobs: any[];
    messages: any[];
    voice_calls: any[];
    feedback: any[];
  };
}

export interface AdminMetrics {
  total_chats: number;
  total_consented_leads: number;
  total_reports_generated: number;
  counselling_conversion_rate: number;
  target_hypothesis_rate: number;
  common_concerns: Array<{ concern: string; count: number }>;
  campus_interest: Array<{ campus: string; inquiries: number }>;
  funnel: {
    chats_initiated: number;
    doubts_addressed: number;
    reports_generated: number;
    counselling_requested: number;
  };
  source_verification_coverage: number;
  failed_requests: number;
  active_pilot_day: number;
}
