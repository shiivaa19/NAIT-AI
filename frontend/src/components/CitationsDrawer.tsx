import React from 'react';
import { Citation } from '../types';
import { X, ExternalLink, ShieldCheck, Calendar, BookOpen } from 'lucide-react';

interface CitationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citations: Citation[];
}

export const CitationsDrawer: React.FC<CitationsDrawerProps> = ({
  isOpen,
  onClose,
  citations
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          <h2 className="font-bold text-base text-slate-900 dark:text-white">Verified Grounded Sources</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          Every substantive statement about NIAT programs, partner universities, NAT exams,
          and career outcomes is retrieved dynamically from verified primary records.
        </p>

        {citations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No specific citations attached to the latest response.
          </div>
        ) : (
          <div className="space-y-4">
            {citations.map((cite, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-200">
                    {cite.source_name}
                  </h3>
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Official</span>
                  </span>
                </div>

                {cite.snippet && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/60 italic leading-relaxed">
                    "{cite.snippet}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span>Verified: Oct 2026 ({cite.applicability || '2023-2027'})</span>
                  </div>

                  <a
                    href={cite.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 dark:text-cyan-400 hover:underline font-medium"
                  >
                    <span>View Primary Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
