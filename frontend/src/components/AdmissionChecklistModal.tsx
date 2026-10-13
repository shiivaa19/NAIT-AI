import React, { useState } from 'react';
import { X, CheckSquare, CheckCircle, Circle, ArrowRight } from 'lucide-react';

interface AdmissionChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCounselling: () => void;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export const AdmissionChecklistModal: React.FC<AdmissionChecklistModalProps> = ({
  isOpen,
  onClose,
  onOpenCounselling
}) => {
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'step1',
      title: 'Verify Class 12 PCM Eligibility',
      description: 'Confirm you completed or are appearing for Class 12 with Maths, Physics, and Chemistry between 2023 and 2027.',
      completed: true
    },
    {
      id: 'step2',
      title: 'Review NAT Assessment Pattern',
      description: 'Understand the 90-minute format: Psychometric (44 questions), Critical Thinking (20 questions), and Math (18 questions).',
      completed: true
    },
    {
      id: 'step3',
      title: 'Shortlist 2-3 Collaborating Campuses',
      description: 'Select institutions based on location, hostel availability, and transport (e.g. Hyderabad, Bengaluru, Vizianagaram).',
      completed: false
    },
    {
      id: 'step4',
      title: 'Calculate 4-Year Family Budget',
      description: 'Combine University Tuition, NIAT program fees, and residential living costs using our Cost Calculator.',
      completed: false
    },
    {
      id: 'step5',
      title: 'Attend 1-on-1 Official Counselling',
      description: 'Discuss career aspirations, partner university suitability, and scholarship possibilities with an advisor.',
      completed: false
    },
    {
      id: 'step6',
      title: 'Request Written Itemized Fee Quotation',
      description: 'Obtain an official fee structure from the university admissions desk before making any financial commitment.',
      completed: false
    }
  ]);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admission Readiness Checklist</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step-by-step verified pathway from Class 12 to NIAT B.Tech enrollment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Admission Readiness Progress</span>
            <span className="font-mono text-blue-600 dark:text-cyan-400 font-bold">{progressPercent}% Completed</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Checklist Items */}
        <div className="space-y-3 mt-5">
          {items.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                item.completed
                  ? 'bg-emerald-500/5 dark:bg-slate-900/90 border-emerald-500/30 dark:border-slate-700/80'
                  : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.completed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-slate-500 font-bold">Step {idx + 1}</span>
                  <h4 className={`text-xs font-semibold ${item.completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {item.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            {completedCount} of {items.length} steps completed
          </span>

          <button
            onClick={() => {
              onClose();
              onOpenCounselling();
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all"
          >
            <span>Proceed to Step 5: Counselling</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
