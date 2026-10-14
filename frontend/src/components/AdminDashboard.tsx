import React, { useState, useEffect } from 'react';
import {
  X,
  BarChart3,
  Users,
  Target,
  FileText,
  PhoneCall,
  CheckCircle2,
  Clock,
  Building,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  Flame,
  Snowflake,
  Zap,
  MessageSquare,
  PhoneForwarded,
  Star,
  Play,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { AdminMetrics, CounsellingLead, FunnelStage } from '../types';
import {
  fetchAdminMetrics,
  fetchAdminLeads,
  updateLeadStatus,
  fetchConversionFunnel,
  fetchLeadTimeline,
  runSimulation,
  bookSlot,
  recordAttendance
} from '../api';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'funnel' | 'leads' | 'timeline'>('funnel');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [leads, setLeads] = useState<CounsellingLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchLead, setSearchLead] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leadTimeline, setLeadTimeline] = useState<any | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, l, f] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminLeads(statusFilter === 'all' ? undefined : statusFilter),
        fetchConversionFunnel()
      ]);
      setMetrics(m);
      setLeads(l);
      if (f && f.funnel_stages) {
        setFunnelStages(f.funnel_stages);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, statusFilter]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadTimeline(selectedLeadId)
        .then(res => setLeadTimeline(res.timeline))
        .catch(err => console.error(err));
    }
  }, [selectedLeadId]);

  if (!isOpen) return null;

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setUpdatingId(leadId);
    try {
      await updateLeadStatus(leadId, newStatus);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await runSimulation('Aarav Sharma');
      setSimResult(`Simulation completed! Lead #${res.lead_id} scored ${res.initial_score} -> ${res.final_score} (${res.final_tag}). WhatsApp dispatched & Voice call executed.`);
      await loadData();
      if (res.lead_id) {
        setSelectedLeadId(res.lead_id);
        setActiveTab('timeline');
      }
    } catch (err: any) {
      setSimResult(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleBookSlot = async (leadId: number) => {
    try {
      await bookSlot(leadId);
      await loadData();
      if (selectedLeadId === leadId) {
        const res = await fetchLeadTimeline(leadId);
        setLeadTimeline(res.timeline);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttendance = async (leadId: number, attended: boolean) => {
    try {
      await recordAttendance(leadId, attended);
      await loadData();
      if (selectedLeadId === leadId) {
        const res = await fetchLeadTimeline(leadId);
        setLeadTimeline(res.timeline);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const term = searchLead.toLowerCase();
    return (
      lead.student_name.toLowerCase().includes(term) ||
      lead.phone.includes(term) ||
      lead.email.toLowerCase().includes(term) ||
      (lead.preferred_campus && lead.preferred_campus.toLowerCase().includes(term))
    );
  });

  const getTagBadge = (tag?: string, score?: number) => {
    if (tag === 'HOT') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
          <Flame className="w-3.5 h-3.5" />
          <span>HOT ({score || 75})</span>
        </span>
      );
    }
    if (tag === 'COLD') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
          <Snowflake className="w-3.5 h-3.5" />
          <span>COLD ({score || 35})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <Zap className="w-3.5 h-3.5" />
        <span>WARM ({score || 55})</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#090D16] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[94vh] overflow-y-auto text-slate-100">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">AI Admission Conversion Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Layer 2 Autonomous Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400">
                End-to-end qualifying, lead scoring, WhatsApp nurture, voice caller, and feedback loop
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center space-x-1.5 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simulating ? 'Simulating...' : '1-Click Pipeline Simulation'}</span>
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Engine Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Simulation Feedback Alert */}
        {simResult && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>{simResult}</span>
            </div>
            <button onClick={() => setSimResult(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800 mt-4 mb-6">
          <button
            onClick={() => setActiveTab('funnel')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'funnel'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>7-Stage Conversion Funnel</span>
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'leads'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Scored Leads & Actions ({leads.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Live Automation Timeline</span>
          </button>
        </div>

        {/* TAB 1: 7-STAGE CONVERSION FUNNEL */}
        {activeTab === 'funnel' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">Total Inbound Chats</span>
                <p className="text-2xl font-bold text-white mt-1">{metrics?.total_chats || 42}</p>
                <span className="text-[10px] text-emerald-400">100% Top of Funnel</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">Consented Leads Captured</span>
                <p className="text-2xl font-bold text-white mt-1">{metrics?.total_consented_leads || leads.length}</p>
                <span className="text-[10px] text-blue-400">Consent captured with OTP</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">HOT Scored Leads</span>
                <p className="text-2xl font-bold text-rose-400 mt-1">
                  {leads.filter(l => l.tag === 'HOT').length}
                </p>
                <span className="text-[10px] text-rose-400">Score &ge; 70 / 100</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400">Counselling Conversion Rate</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {metrics?.counselling_conversion_rate || 33.3}%
                </p>
                <span className="text-[10px] text-slate-400">Target hypothesis: 30%</span>
              </div>
            </div>

            {/* Visual Funnel Progression Bars */}
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Conversion Drop-off by Funnel Stage</span>
              </h3>
              
              <div className="space-y-3">
                {funnelStages.map((stg, idx) => {
                  const maxCount = funnelStages[0]?.count || 100;
                  const pct = Math.max(8, Math.round((stg.count / maxCount) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{idx + 1}. {stg.stage}</span>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-white font-bold">{stg.count}</span>
                          <span className="text-[10px] text-slate-400">
                            {idx === 0 ? 'Baseline' : `${stg.conversion_from_prev}% pass-through`}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 ? 'bg-slate-500' :
                            idx <= 2 ? 'bg-blue-500' :
                            idx <= 4 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Common Concerns & Campus Interest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Primary Decision Inquiries</span>
                </h4>
                <div className="space-y-2">
                  {(metrics?.common_concerns || []).map((c, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 truncate pr-2">{c.concern}</span>
                      <span className="font-mono text-purple-400 font-bold">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center space-x-2">
                  <Building className="w-4 h-4 text-blue-400" />
                  <span>Campus Preference Distribution</span>
                </h4>
                <div className="space-y-2">
                  {(metrics?.campus_interest || []).map((camp, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 truncate pr-2">{camp.campus}</span>
                      <span className="font-mono text-blue-400 font-bold">{camp.inquiries}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCORED LEADS TABLE */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search lead, phone, campus..."
                  value={searchLead}
                  onChange={e => setSearchLead(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-500" />
                {['all', 'new', 'scheduled', 'contacted', 'enrolled', 'closed'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs rounded-md capitalize transition-colors ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Leads Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-slate-400">
                    <th className="p-3">Student / Contact</th>
                    <th className="p-3">AI Score & Tag</th>
                    <th className="p-3">Preferred Campus</th>
                    <th className="p-3">Funnel Status</th>
                    <th className="p-3">Actions & Triggers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-white">{lead.student_name}</div>
                        <div className="text-[11px] text-slate-400">{lead.phone} • {lead.city || lead.state}</div>
                        {lead.parent_name && (
                          <div className="text-[10px] text-slate-500">Parent: {lead.parent_name}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {getTagBadge(lead.tag, lead.score)}
                          {lead.score_reasons && lead.score_reasons.length > 0 && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs" title={lead.score_reasons.map(r => r.reason).join(' | ')}>
                              {lead.score_reasons[0].reason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-300 font-medium">
                          {lead.preferred_campus || 'Not selected'}
                        </span>
                        <div className="text-[10px] text-slate-500">Cohort: {lead.target_intake_year}</div>
                      </td>
                      <td className="p-3">
                        <select
                          value={lead.status}
                          disabled={updatingId === lead.id}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                          className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none"
                        >
                          <option value="new">New</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="contacted">Contacted</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="closed">Closed / Opt-Out</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <button
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setActiveTab('timeline');
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold text-[11px] flex items-center space-x-1"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Timeline</span>
                          </button>
                          
                          <button
                            onClick={() => handleBookSlot(lead.id)}
                            className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] flex items-center space-x-1"
                            title="Book slot & schedule 24h/1h reminders"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Book Slot</span>
                          </button>

                          <button
                            onClick={() => handleAttendance(lead.id, true)}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] flex items-center space-x-1"
                            title="Attended counselling (triggers feedback survey)"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Attended</span>
                          </button>

                          <button
                            onClick={() => handleAttendance(lead.id, false)}
                            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] flex items-center space-x-1"
                            title="No-Show (triggers outbound AI Voice call)"
                          >
                            <PhoneForwarded className="w-3 h-3" />
                            <span>No-Show Call</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE AUTOMATION TIMELINE PER LEAD */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400">Select Lead:</span>
                <select
                  value={selectedLeadId || ''}
                  onChange={e => setSelectedLeadId(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">-- Choose Candidate --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      #{l.id} - {l.student_name} ({l.tag || 'WARM'}, Score: {l.score || 50})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLeadId && (
                <button
                  onClick={() => {
                    fetchLeadTimeline(selectedLeadId).then(r => setLeadTimeline(r.timeline));
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Timeline</span>
                </button>
              )}
            </div>

            {!selectedLeadId ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Select a lead above or click "Timeline" on any candidate from the Leads tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Outbound & Inbound WhatsApp Log */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-white flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp Outreach Sequence ({leadTimeline?.messages?.length || 0})</span>
                  </h4>
                  
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(!leadTimeline?.messages || leadTimeline.messages.length === 0) ? (
                      <p className="text-slate-500 text-xs">No WhatsApp interactions dispatched yet.</p>
                    ) : (
                      leadTimeline.messages.map((m: any, i: number) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg text-xs border ${
                            m.direction === 'inbound'
                              ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                              : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold uppercase">{m.direction} • {m.step || 'direct'}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {m.delivery_status || 'delivered'}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-[11px]">{m.content}</p>
                          {m.escalated_to_human === 1 && (
                            <span className="mt-1.5 inline-flex items-center space-x-1 text-[10px] text-amber-400 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Escalated to human counsellor</span>
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI Voice Calls & Transcripts */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-white flex items-center space-x-2">
                    <PhoneCall className="w-4 h-4 text-indigo-400" />
                    <span>AI Voice Agent Calls ({leadTimeline?.voice_calls?.length || 0})</span>
                  </h4>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(!leadTimeline?.voice_calls || leadTimeline.voice_calls.length === 0) ? (
                      <p className="text-slate-500 text-xs">No voice calls recorded yet.</p>
                    ) : (
                      leadTimeline.voice_calls.map((vc: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-800/40 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-indigo-300">
                            <span className="font-semibold uppercase">Reason: {vc.trigger_reason}</span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-900/50 font-bold text-indigo-200">
                              Outcome: {vc.outcome?.toUpperCase()} ({vc.duration_seconds}s)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-medium">Summary: {vc.summary}</p>
                          {vc.transcript && (
                            <details className="text-[10px] text-slate-400">
                              <summary className="cursor-pointer text-indigo-400 hover:text-indigo-300">
                                View Full Call Transcript
                              </summary>
                              <pre className="mt-1 p-2 bg-black/40 rounded border border-slate-800 whitespace-pre-wrap font-sans text-slate-300 text-[10px]">
                                {vc.transcript}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Post-Counselling Feedback Flow */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-white flex items-center space-x-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span>Post-Counselling Feedback & Score Recalibration</span>
                  </h4>

                  <div className="space-y-2">
                    {(!leadTimeline?.feedback || leadTimeline.feedback.length === 0) ? (
                      <p className="text-slate-500 text-xs">No feedback submitted yet. Mark attendance to trigger feedback survey.</p>
                    ) : (
                      leadTimeline.feedback.map((fb: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, idx) => (
                                <Star
                                  key={idx}
                                  className={`w-3.5 h-3.5 ${idx < fb.rating ? 'fill-current' : 'text-slate-600'}`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400">
                              Score Delta: +{fb.score_delta} pts ({fb.sentiment?.toUpperCase()})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">Clarity: {fb.q1_clarity_response}</p>
                          <p className="text-[11px] text-slate-400">Decision next steps: {fb.q2_concerns_response}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Persistent Scheduled Jobs */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-white flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>Persistent Background Jobs ({leadTimeline?.jobs?.length || 0})</span>
                  </h4>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(!leadTimeline?.jobs || leadTimeline.jobs.length === 0) ? (
                      <p className="text-slate-500 text-xs">No scheduled background jobs found.</p>
                    ) : (
                      leadTimeline.jobs.map((job: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-white">{job.step}</span>
                            <div className="text-[10px] text-slate-400">Run At: {job.run_at}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                              job.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : job.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : job.status === 'running'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {job.status} (attempt {job.attempts})
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
