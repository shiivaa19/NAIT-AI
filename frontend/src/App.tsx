import React, { useState, useEffect } from 'react';
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
    <div className={`h-screen h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden transition-colors duration-200 ${
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
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
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
