import React, { useState } from 'react';
import { X, FileText, Printer, CheckCircle, ShieldCheck, HelpCircle, ArrowRight, Download } from 'lucide-react';
import { DecisionReport, UserMode } from '../types';
import { generateDecisionReport } from '../api';

interface DecisionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  mode: UserMode;
  onOpenCounselling: () => void;
}

export const DecisionReportModal: React.FC<DecisionReportModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  mode,
  onOpenCounselling
}) => {
  const [studentName, setStudentName] = useState<string>('Prospective Student');
  const [report, setReport] = useState<DecisionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateDecisionReport({
        session_id: sessionId,
        student_name: studentName,
        mode: mode,
        main_concerns: [
          'Degree validation by UGC/AICTE university',
          'Transparent four-year cost breakdown',
          'Hostel safety and mess standards',
          'Placement assistance vs realistic market conditions'
        ]
      });
      setReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personalized Family Decision Report</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synthesized decision roadmap grounded in verified official NIAT documentation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!report ? (
          <div className="py-12 px-4 max-w-md mx-auto text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generate Your Family Decision Dossier</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Compile all verified facts from your conversation, degree clarifications, itemized costs,
                and specific questions to ask official counsellors into a printable report.
              </p>
            </div>

            <div className="text-left space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Student / Family Name</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. Aditya Sharma & Family"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? 'Synthesizing Verified Dossier...' : 'Generate Decision Report Now'}
            </button>
          </div>
        ) : (
          <div className="space-y-6 mt-6 print:m-0 print:p-0">
            {/* Printable Report Header */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                    Official NIAT Decision Briefing • Ref: {report.report_id}
                  </span>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    Admission Decision Report: {report.student_name}
                  </h1>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Date: {report.generated_at}
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{report.summary}"
              </p>
            </div>

            {/* Core Grounded Facts */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Verified Legal & Academic Facts</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.verified_facts.map((vf, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {vf.fact}
                    </p>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-blue-600 dark:text-cyan-400">
                      <a href={vf.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Source: {vf.source_name}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4-Year Cost Model */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Financial Framework (4-Year Outlay)</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Range: <strong className="text-emerald-600 dark:text-emerald-400">{report.cost_breakdown?.general_range}</strong>
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {report.cost_breakdown?.key_components.map((comp, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                    • {comp}
                  </span>
                ))}
              </div>
            </div>

            {/* Critical Questions to Ask Counsellor */}
            <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Critical Questions Parents Should Ask Official Counsellor Before Committing</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {report.questions_for_counsellor.map((q, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">{idx + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Next Steps */}
            <div className="p-5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3">
              <h3 className="text-sm font-bold text-blue-800 dark:text-cyan-300 flex items-center space-x-2">
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <span>Recommended Action Steps</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {report.recommended_next_steps.map((step, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Dossier</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenCounselling();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-md shadow-emerald-500/20"
              >
                Proceed to 1-on-1 Counselling Discussion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
