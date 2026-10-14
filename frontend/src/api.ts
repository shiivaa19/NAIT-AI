import {
  ChatMessage,
  Campus,
  CostCalculatorResult,
  CampusComparisonResult,
  DecisionReport,
  CounsellingLead,
  AdminMetrics,
  UserMode,
  LanguageCode,
  User,
  AuthResponse
} from './types';

const API_BASE = '/api';
const TOKEN_KEY = 'niat_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed. Please check your credentials.');
  }
  const data: AuthResponse = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function registerUser(email: string, password: string, name: string, role: string = 'student'): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed.');
  }
  const data: AuthResponse = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function loginWithGoogle(): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'google.student@gmail.com', name: 'Google Student' })
  });
  if (!res.ok) {
    throw new Error('Google sign-in failed. Please try again.');
  }
  const data: AuthResponse = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) {
    removeAuthToken();
    return null;
  }
  return res.json();
}

export async function sendChatMessage(
  message: string,
  sessionId: string,
  mode: UserMode,
  language: LanguageCode,
  history: ChatMessage[] = []
): Promise<{
  message: string;
  citations: any[];
  tools_used: string[];
  suggested_actions: string[];
  engine_used?: string;
  latency_ms?: number;
}> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      mode,
      language,
      history: history.map(h => ({ role: h.role, content: h.content }))
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to communicate with AI Admission Copilot');
  }
  return res.json();
}

export async function fetchCampuses(state?: string, city?: string): Promise<Campus[]> {
  const params = new URLSearchParams();
  if (state) params.append('state', state);
  if (city) params.append('city', city);
  const res = await fetch(`${API_BASE}/campuses?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch campuses');
  const data = await res.json();
  return data.campuses || [];
}

export async function compareCampuses(campusIds: string[]): Promise<CampusComparisonResult> {
  const res = await fetch(`${API_BASE}/campuses/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campus_ids: campusIds })
  });
  if (!res.ok) throw new Error('Failed to compare campuses');
  return res.json();
}

export async function calculateCost(payload: {
  annual_university_tuition: number;
  annual_niat_program_fee: number;
  annual_hostel_fee: number;
  annual_mess_fee: number;
  annual_transport_fee: number;
  annual_other_fees: number;
  annual_scholarship_discount: number;
  campus_name?: string;
  campus_id?: string;
}): Promise<CostCalculatorResult> {
  const res = await fetch(`${API_BASE}/calculate-cost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to calculate cost');
  return res.json();
}

export async function generateDecisionReport(payload: {
  session_id: string;
  student_name: string;
  mode: string;
  preferred_campus?: string;
  main_concerns: string[];
}): Promise<DecisionReport> {
  const res = await fetch(`${API_BASE}/decision-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate decision report');
  return res.json();
}

export async function submitCounsellingLead(payload: {
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
  notes?: string;
}): Promise<{ lead_id: number; status: string; message: string }> {
  const res = await fetch(`${API_BASE}/counselling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit counselling request');
  }
  return res.json();
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const res = await fetch(`${API_BASE}/admin/metrics`);
  if (!res.ok) throw new Error('Failed to fetch admin metrics');
  return res.json();
}

export async function fetchAdminLeads(status?: string): Promise<CounsellingLead[]> {
  const url = status ? `${API_BASE}/admin/leads?status=${status}` : `${API_BASE}/admin/leads`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch leads');
  const data = await res.json();
  return data.leads || [];
}

export async function updateLeadStatus(leadId: number, status: string, notes?: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes })
  });
  return res.ok;
}

export async function clearSessionMessages(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/session/${sessionId}`, { method: 'DELETE' });
}

export async function fetchConversionFunnel(): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/funnel`);
  if (!res.ok) throw new Error('Failed to fetch conversion funnel');
  return res.json();
}

export async function fetchLeadTimeline(leadId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/engine/lead/${leadId}/timeline`);
  if (!res.ok) throw new Error('Failed to fetch lead timeline');
  return res.json();
}

export async function fetchEngineJobs(leadId?: number): Promise<any[]> {
  const url = leadId ? `${API_BASE}/engine/jobs?lead_id=${leadId}` : `${API_BASE}/engine/jobs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch engine jobs');
  const data = await res.json();
  return data.jobs || [];
}

export async function retryEngineJob(jobId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/engine/jobs/${jobId}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry job');
  return res.json();
}

export async function runSimulation(leadName?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/engine/simulate?lead_name=${encodeURIComponent(leadName || 'Aarav Sharma')}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function bookSlot(leadId: number, slotTime?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/leads/${leadId}/book-slot${slotTime ? `?slot_time=${encodeURIComponent(slotTime)}` : ''}`, {
    method: 'POST'
  });
  return res.json();
}

export async function recordAttendance(leadId: number, attended: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/leads/${leadId}/counselling-attended?attended=${attended}`, {
    method: 'POST'
  });
  return res.json();
}

