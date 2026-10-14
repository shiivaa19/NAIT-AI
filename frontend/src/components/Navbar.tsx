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
  UserCheck,
  Bot
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
  onLogout
}) => {
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] ${
      isDark
        ? 'border-zinc-800/80 bg-[#000000]/95 text-white'
        : 'border-slate-200 bg-white/95 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Crest Logo */}
          <div className="flex items-center space-x-3">
            {/* NIAT Official Crest Medallion */}
            <div
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-md shadow-amber-500/25 p-0.5 shrink-0 ring-2 ring-amber-300/50"
              title="NIAT Official Crest"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none">
                {/* Gold circular background */}
                <circle cx="50" cy="50" r="46" fill="#F6BA35" />
                
                {/* Solid filled left half */}
                <path
                  d="M 50,27 H 32 V 53 C 32,65 41,73 50,73 Z"
                  fill="#7E1520"
                />
                
                {/* Center vertical dividing seam */}
                <line
                  x1="50"
                  y1="27"
                  x2="50"
                  y2="73"
                  stroke="#7E1520"
                  strokeWidth="4.5"
                  strokeLinecap="butt"
                />
                
                {/* Unified outer shield boundary stroke */}
                <path
                  d="M 32,27 H 68 V 53 C 68,65 59,73 50,73 C 41,73 32,65 32,53 Z"
                  fill="none"
                  stroke="#7E1520"
                  strokeWidth="4.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Title & Tag */}
            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-extrabold text-base sm:text-lg tracking-tight ${
                  isDark
                    ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent'
                    : 'text-slate-900'
                }`}>
                  NIAT
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                  AI COPILOT
                </span>
              </div>
              <p className={`text-[11px] hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
                Admission Guidance System
              </p>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="hidden lg:flex items-center space-x-2">
            <button
              onClick={onOpenCalculator}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
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
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
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
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
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
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Checklist</span>
            </button>
          </div>

          {/* Controls: Mode, Language, Theme, Counselling, Admin */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mode Switcher */}
            <div className={`flex items-center p-0.5 rounded-lg border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => onModeChange('student')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  mode === 'student'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Student</span>
              </button>
              <button
                onClick={() => onModeChange('parent')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  mode === 'parent'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
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
                className={`appearance-none border text-xs rounded-lg pl-7 pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="en">English</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
              <Languages className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                isDark
                  ? 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={isDark ? "Switch to Crisp Light Theme" : "Switch to Matte Black Theme"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Counselling Lead Button */}
            <button
              onClick={onOpenCounselling}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Counselling</span>
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

            {/* User Profile / Sign In in Header */}
            {user ? (
              <div className="flex items-center space-x-1 pl-0.5">
                <div
                  className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs"
                  title={`Signed in as ${user.name}`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors hidden sm:block"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 dark:bg-zinc-800 hover:bg-white/20 dark:hover:bg-zinc-700 text-white border border-slate-700/60 transition-all shadow-xs"
                title="Sign In"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
