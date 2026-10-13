import React, { useState, useEffect } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { UserMode, LanguageCode, ThemeMode, Citation, User } from './types';
import { fetchCurrentUser, removeAuthToken } from './api';
import { Navbar } from './components/Navbar';
import { ChatInterface } from './components/ChatInterface';
import { CitationsDrawer } from './components/CitationsDrawer';
import { CostCalculatorModal } from './components/CostCalculatorModal';
import { CampusComparisonModal } from './components/CampusComparisonModal';
import { DecisionReportModal } from './components/DecisionReportModal';
import { CounsellingRequestModal } from './components/CounsellingRequestModal';
import { AdmissionChecklistModal } from './components/AdmissionChecklistModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const [mode, setMode] = useState<UserMode>('student');
  const [language, setLanguage] = useState<LanguageCode>('en');
  // Default to pure Black Theme as shown in screenshot
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme_preference');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [sessionId, setSessionId] = useState<string>(() => `sess_${Math.random().toString(36).substring(2, 11)}`);
  const [user, setUser] = useState<User | null>(null);

  // Modals visibility state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isCampusCompareOpen, setIsCampusCompareOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isCounsellingOpen, setIsCounsellingOpen] = useState<boolean>(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isCitationsOpen, setIsCitationsOpen] = useState<boolean>(false);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  // Auto-authentication on mount via saved JWT token
  useEffect(() => {
    fetchCurrentUser().then(u => {
      if (u) setUser(u);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme_preference', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleNewSession = () => {
    setSessionId(`sess_${Math.random().toString(36).substring(2, 11)}`);
  };

  const handleOpenCitations = (citations: Citation[]) => {
    setActiveCitations(citations);
    setIsCitationsOpen(true);
  };

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#000000] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Navigation */}
      <Navbar
        mode={mode}
        onModeChange={setMode}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenCampusCompare={() => setIsCampusCompareOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenCounselling={() => setIsCounsellingOpen(true)}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        onToggleAdmin={() => setIsAdminOpen(!isAdminOpen)}
        isAdminOpen={isAdminOpen}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          removeAuthToken();
          setUser(null);
        }}
      />

      {/* Main Conversational Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ChatInterface
          mode={mode}
          language={language}
          sessionId={sessionId}
          theme={theme}
          onNewSession={handleNewSession}
          onOpenCitations={handleOpenCitations}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenCampusCompare={() => setIsCampusCompareOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
          onOpenCounselling={() => setIsCounsellingOpen(true)}
        />
      </main>

      {/* Bottom-Left Fixed Sign In / Account Box */}
      <div className="fixed bottom-20 left-3 sm:bottom-4 sm:left-4 z-30">
        {user ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#111620]/95 border border-slate-200 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-xs backdrop-blur-md">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-slate-800 dark:text-white font-medium max-w-[100px] sm:max-w-[130px] truncate">{user.name}</span>
            <button
              onClick={() => {
                removeAuthToken();
                setUser(null);
              }}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/95 dark:bg-[#111620]/95 hover:bg-slate-50 dark:hover:bg-[#1a202c] border border-slate-200 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-xl text-xs font-semibold text-slate-800 dark:text-white transition-all group backdrop-blur-md active:scale-95"
            title="Sign In / Create Account"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* Modals & Drawers */}
      <CitationsDrawer
        isOpen={isCitationsOpen}
        onClose={() => setIsCitationsOpen(false)}
        citations={activeCitations}
      />

      <CostCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onOpenCounselling={() => setIsCounsellingOpen(true)}
      />

      <CampusComparisonModal
        isOpen={isCampusCompareOpen}
        onClose={() => setIsCampusCompareOpen(false)}
        onSelectCampusForChat={() => {}}
      />

      <DecisionReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        sessionId={sessionId}
        mode={mode}
        onOpenCounselling={() => setIsCounsellingOpen(true)}
      />

      <CounsellingRequestModal
        isOpen={isCounsellingOpen}
        onClose={() => setIsCounsellingOpen(false)}
        sessionId={sessionId}
      />

      <AdmissionChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        onOpenCounselling={() => setIsCounsellingOpen(true)}
      />

      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />
    </div>
  );
};

export default App;
