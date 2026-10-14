import React, { useState, useEffect } from 'react';
import { UserMode, LanguageCode, ThemeMode, Citation, User } from './types';
import { fetchCurrentUser, removeAuthToken, fetchNotifications } from './api';
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
import { NotificationModal, StudentNotification } from './components/NotificationModal';

export const App: React.FC = () => {
  const [mode, setMode] = useState<UserMode>('student');
  const [language, setLanguage] = useState<LanguageCode>('en');
  // Default to pure Black Theme
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
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<StudentNotification[]>([
    {
      id: "notif_exam_today",
      type: "exam",
      priority: "urgent",
      title: "🚨 NAT Entrance Exam is LIVE Today!",
      message: "The National Aptitude Test (NAT) window is active today from 10:00 AM to 6:00 PM IST. Please have your admit card and stable internet ready.",
      action_label: "Exam Guidelines",
      action_key: "checklist",
      created_at: "Today 10:00 AM",
      is_today: true
    },
    {
      id: "notif_counselling_reminder",
      type: "counselling",
      priority: "high",
      title: "📅 Counselling Session Tomorrow at 5:00 PM",
      message: "Your 1-on-1 Academic Counselling session with Senior NIAT Advisor is scheduled for Tomorrow at 5:00 PM IST. Have your Class 12 PCM details ready.",
      action_label: "Counselling Details",
      action_key: "counselling",
      created_at: "Today 02:00 PM",
      is_today: false
    },
    {
      id: "notif_periodic_cadence",
      type: "cadence",
      priority: "info",
      title: "⚡ 5-Hour Admissions Update: Seat Availability",
      message: "Cohort 2026 early-action scholarship quota is 78% filled across Hyderabad & Bangalore campuses. Complete your verification checklist.",
      action_label: "View Campuses",
      action_key: "campuses",
      created_at: "5 hours ago",
      is_today: false
    }
  ]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);

  // Auto-authentication on mount via saved JWT token
  useEffect(() => {
    fetchCurrentUser().then(u => {
      if (u) setUser(u);
    }).catch(() => {});

    // Fetch live notifications
    fetchNotifications().then(data => {
      if (data && data.notifications && data.notifications.length > 0) {
        setNotifications(data.notifications);
      }
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

  const handleNotificationAction = (actionKey?: string) => {
    if (actionKey === 'counselling') setIsCounsellingOpen(true);
    else if (actionKey === 'checklist') setIsChecklistOpen(true);
    else if (actionKey === 'calculator') setIsCalculatorOpen(true);
    else if (actionKey === 'campuses') setIsCampusCompareOpen(true);
  };

  const handleDismissNotification = (id: string) => {
    setDismissedNotifIds(prev => [...prev, id]);
  };

  const activeNotifs = notifications.filter(n => !dismissedNotifIds.includes(n.id));
  const urgentBanner = activeNotifs.find(n => n.is_today || n.priority === 'urgent');

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
        unreadNoticeCount={activeNotifs.length}
        onOpenNotifications={() => setIsNotificationOpen(true)}
      />

      {/* Main Conversational Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ChatInterface
          mode={mode}
          language={language}
          sessionId={sessionId}
          theme={theme}
          userName={user?.name}
          urgentNotice={urgentBanner}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onNewSession={handleNewSession}
          onOpenCitations={handleOpenCitations}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenCampusCompare={() => setIsCampusCompareOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
          onOpenCounselling={() => setIsCounsellingOpen(true)}
          onOpenChecklist={() => setIsChecklistOpen(true)}
        />
      </main>

      {/* Modals & Drawers */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={activeNotifs}
        onActionClick={handleNotificationAction}
        onDismiss={handleDismissNotification}
      />

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
