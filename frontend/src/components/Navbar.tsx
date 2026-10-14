import React from 'react';
import { UserMode, LanguageCode, ThemeMode, User } from '../types';
import {
  GraduationCap,
  Users,
  Calculator,
  Building2,
  FileText,
  PhoneCall,
  BarChart3,
  Languages,
  Sparkles,
  CheckSquare,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Bell
} from 'lucide-react';

interface NavbarProps {
  mode: UserMode;
  onModeChange: (mode: UserMode) => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenCalculator: () => void;
  onOpenCampusCompare: () => void;
  onOpenReport: () => void;
  onOpenCounselling: () => void;
  onOpenChecklist: () => void;
  onToggleAdmin: () => void;
  isAdminOpen: boolean;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  unreadNoticeCount?: number;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  onModeChange,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  onOpenCalculator,
  onOpenCampusCompare,
  onOpenReport,
  onOpenCounselling,
  onOpenChecklist,
  onToggleAdmin,
  isAdminOpen,
  user,
  onOpenAuth,
  onLogout,
  unreadNoticeCount = 2,
  onOpenNotifications = () => {}
}) => {
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${
      isDark
        ? 'border-zinc-800/80 bg-[#000000]/95 text-white'
        : 'border-slate-200 bg-white/95 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand & Crest Logo */}
          <div className="flex items-center space-x-2.5">
            {/* NIAT Official Crest Medallion */}
            <div
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-md shadow-amber-500/25 p-0.5 shrink-0 ring-2 ring-amber-300/50"
              title="NIAT Official Crest"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none">
                <circle cx="50" cy="50" r="46" fill="#F6BA35" />
                <path d="M 50,27 H 32 V 53 C 32,65 41,73 50,73 Z" fill="#7E1520" />
                <line x1="50" y1="27" x2="50" y2="73" stroke="#7E1520" strokeWidth="4.5" strokeLinecap="butt" />
                <path d="M 32,27 H 68 V 53 C 68,65 59,73 50,73 C 41,73 32,65 32,53 Z" fill="none" stroke="#7E1520" strokeWidth="4.5" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Title & Tag */}
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className={`font-extrabold text-base sm:text-lg tracking-tight ${
                  isDark
                    ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent'
                    : 'text-slate-900'
                }`}>
                  NIAT
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                  AI COPILOT
                </span>
              </div>
              <p className={`text-[10px] sm:text-[11px] hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
                Admission Guidance System
              </p>
            </div>
          </div>

          {/* Quick Action Tools (Desktop only) */}
          <div className="hidden lg:flex items-center space-x-1.5">
            <button
              onClick={onOpenCalculator}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>Cost Calculator</span>
            </button>

            <button
              onClick={onOpenCampusCompare}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Campuses (41)</span>
            </button>

            <button
              onClick={onOpenReport}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Decision Report</span>
            </button>

            <button
              onClick={onOpenChecklist}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Checklist</span>
            </button>
          </div>

          {/* Controls: Mode, Language, Notification Bell, Theme, Counselling, Admin & Sign-In */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Mode Switcher */}
            <div className={`flex items-center p-0.5 rounded-lg border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => onModeChange('student')}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-all ${
                  mode === 'student'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Student Discovery Mode"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Student</span>
              </button>
              <button
                onClick={() => onModeChange('parent')}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-all ${
                  mode === 'parent'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Parent Transparency Mode"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Parent</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                className={`appearance-none border text-xs rounded-lg pl-6 pr-3 sm:pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="en">EN</option>
                <option value="te">తెలుగు</option>
                <option value="hi">हिंदी</option>
                <option value="ta">தமிழ்</option>
              </select>
              <Languages className="w-3.5 h-3.5 text-slate-400 absolute left-1.5 top-2 pointer-events-none" />
            </div>

            {/* Live Student Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className={`relative p-1.5 sm:p-2 rounded-lg text-xs font-medium border transition-all ${
                isDark
                  ? 'bg-slate-900 text-amber-400 border-slate-800 hover:bg-slate-800'
                  : 'bg-slate-100 text-amber-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="Live Student Notices & Exam Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadNoticeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                  {unreadNoticeCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-1.5 sm:p-2 rounded-lg text-xs font-medium border transition-all ${
                isDark
                  ? 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Counselling Lead Button */}
            <button
              onClick={onOpenCounselling}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Counselling</span>
            </button>

            {/* Admin Dashboard Toggle */}
            <button
              onClick={onToggleAdmin}
              className={`p-1.5 rounded-lg text-xs transition-all border ${
                isAdminOpen
                  ? 'bg-purple-600 text-white border-purple-500'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
              title="Admin Growth Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* User Account / Sign In (Tucked cleanly in top bar on both mobile and PC) */}
            {user ? (
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline text-white font-medium max-w-[80px] truncate">{user.name}</span>
                <button 
                  onClick={onLogout} 
                  title="Sign Out" 
                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                title="Sign In / Create Account"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
