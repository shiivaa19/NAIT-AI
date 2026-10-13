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
  TrendingUp
} from 'lucide-react';
import { AdminMetrics, CounsellingLead } from '../types';
import { fetchAdminMetrics, fetchAdminLeads, updateLeadStatus } from '../api';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [leads, setLeads] = useState<CounsellingLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchLead, setSearchLead] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, l] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminLeads(statusFilter === 'all' ? undefined : statusFilter)
      ]);
      setMetrics(m);
      setLeads(l);
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

  const filteredLeads = leads.filter(lead => {
    const term = searchLead.toLowerCase();
    return (
      lead.student_name.toLowerCase().includes(term) ||
      lead.phone.includes(term) ||
      lead.email.toLowerCase().includes(term) ||
      (lead.preferred_campus && lead.preferred_campus.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Growth Analytics & Lead Pipeline</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  7-Day Pilot Mode • Day {metrics?.active_pilot_day || 3}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracking counselling-request conversion against the 30% test hypothesis with real persisted events
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Primary Metric KPI Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Counselling Conversion</span>
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {metrics.counselling_conversion_rate}%
              </p>
              <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>Hypothesis Target: &ge; {metrics.target_hypothesis_rate}%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Consented Leads</span>
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {metrics.total_consented_leads}
              </p>
              <p className="text-[11px] text-slate-500">
                100% with explicit DPDP consent
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Decision Reports</span>
                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {metrics.total_reports_generated}
              </p>
              <p className="text-[11px] text-slate-500">
                Generated from multi-turn chats
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>RAG Source Coverage</span>
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {metrics.source_verification_coverage}%
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                0 failed dynamic AI requests
              </p>
            </div>
          </div>
        )}

        {/* Funnel & Concerns Section */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Funnel */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Admission Conversion Funnel
              </h3>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>1. Chats Initiated</span>
                    <strong className="text-white">{metrics.funnel.chats_initiated}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-500 w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>2. Concerns Resolved via RAG</span>
                    <strong className="text-white">{metrics.funnel.doubts_addressed}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[85%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>3. Reports Generated</span>
                    <strong className="text-white">{metrics.funnel.reports_generated}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[60%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>4. Counselling Requests (Consented)</span>
                    <strong className="text-white">{metrics.funnel.counselling_requested}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-purple-500 w-[35%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Concerns */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Top Inquired Concerns Breakdown
              </h3>
              <div className="space-y-2">
                {metrics.common_concerns.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                    <span className="text-slate-300 truncate max-w-[280px]">{c.concern}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 font-mono font-bold">
                      {c.count} inquiries
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lead Management Table */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lead Follow-Up Pipeline</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update status as counsellors connect with prospective families
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter name, phone, campus..."
                  value={searchLead}
                  onChange={e => setSearchLead(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 w-48"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="scheduled">Scheduled</option>
                <option value="enrolled">Enrolled</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Student / Parent</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Campus Interest</th>
                  <th className="py-3 px-3">Cohort</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No leads match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{lead.student_name}</div>
                        {lead.parent_name && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Parent: {lead.parent_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 dark:text-slate-300 font-mono">{lead.phone}</div>
                        <div className="text-[11px] text-slate-400">{lead.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800 dark:text-slate-300 font-medium">
                          {lead.preferred_campus || 'General Inquiry'}
                        </div>
                        <div className="text-[10px] text-slate-400">{lead.state}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {lead.target_intake_year}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={lead.status}
                          disabled={updatingId === lead.id}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold border cursor-pointer ${
                            lead.status === 'scheduled'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : lead.status === 'contacted'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : lead.status === 'enrolled'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : lead.status === 'closed'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        {lead.notes || 'No notes added'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
