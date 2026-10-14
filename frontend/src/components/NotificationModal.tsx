import React from 'react';
import { Bell, X, Calendar, AlertCircle, Clock, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';

export interface StudentNotification {
  id: string;
  type: 'exam' | 'counselling' | 'cadence';
  priority: 'urgent' | 'high' | 'info';
  title: string;
  message: string;
  action_label?: string;
  action_key?: string;
  created_at: string;
  is_today: boolean;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: StudentNotification[];
  onActionClick: (actionKey?: string) => void;
  onDismiss: (id: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onActionClick,
  onDismiss
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0E1217] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Live Student Notices & Alerts</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                  {notifications.length} Active
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Automated exam reminders, counselling updates & 5-hour admissions cadence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notices List */}
        <div className="p-4 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-zinc-800/60">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No active notices right now. You are all caught up!
            </div>
          ) : (
            notifications.map(notif => {
              const isUrgent = notif.priority === 'urgent' || notif.is_today;
              const isHigh = notif.priority === 'high';
              return (
                <div 
                  key={notif.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isUrgent
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                      : isHigh
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                      : 'bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5">
                      <div className="mt-0.5">
                        {isUrgent ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 animate-pulse" />
                        ) : isHigh ? (
                          <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {notif.title}
                          </h4>
                          {notif.is_today && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase tracking-wide">
                              TODAY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center space-x-3 pt-1 text-[10px] text-slate-400">
                          <span>{notif.created_at}</span>
                          {notif.action_label && (
                            <button
                              onClick={() => {
                                onActionClick(notif.action_key);
                                onClose();
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center space-x-0.5"
                            >
                              <span>{notif.action_label}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onDismiss(notif.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1 rounded"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">Direct automated alerts via WhatsApp & App</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
