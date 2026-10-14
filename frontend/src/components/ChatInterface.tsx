import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  RotateCcw,
  Calculator,
  Building2,
  FileText,
  PhoneCall,
  CheckSquare,
  ChevronRight,
  Copy,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus
} from 'lucide-react';
import { ChatMessage, Citation, UserMode, LanguageCode, ThemeMode } from '../types';
import { sendChatMessage, clearSessionMessages } from '../api';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatInterfaceProps {
  mode: UserMode;
  language: LanguageCode;
  sessionId: string;
  theme?: ThemeMode;
  userName?: string;
  urgentNotice?: any;
  onOpenNotifications?: () => void;
  onNewSession: () => void;
  onOpenCitations: (citations: Citation[]) => void;
  onOpenCalculator: () => void;
  onOpenCampusCompare: () => void;
  onOpenReport: () => void;
  onOpenCounselling: () => void;
  onOpenChecklist: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  mode,
  language,
  sessionId,
  theme = 'dark',
  userName,
  urgentNotice,
  onOpenNotifications,
  onNewSession,
  onOpenCitations,
  onOpenCalculator,
  onOpenCampusCompare,
  onOpenReport,
  onOpenCounselling,
  onOpenChecklist
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [showQuickTools, setShowQuickTools] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice Input & Output states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isVoiceResponseEnabled, setIsVoiceResponseEnabled] = useState<boolean>(() => {
    return localStorage.getItem('voice_response_enabled') === 'true';
  });
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const toggleVoiceResponse = () => {
    setIsVoiceResponseEnabled(prev => {
      const next = !prev;
      localStorage.setItem('voice_response_enabled', String(next));
      if (!next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
      }
      return next;
    });
  };

  const speakMessage = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speakingMsgId === msgId) {
      setSpeakingMsgId(null);
      return;
    }

    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, 'Flowchart diagram displayed.')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*`_~|]/g, '')
      .replace(/⚡.*?•/g, '')
      .trim();

    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Speech recognition start failed:', e);
      setIsListening(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const studentPrompts = [
    "What exactly is NIAT and who awards my B.Tech degree?",
    "Can I join after Class 12 PCM? What are the eligibility criteria?",
    "What will I learn in each year? Tell me about the 50+ projects.",
    "Are internships guaranteed and what is the highest placement package?"
  ];

  const parentPrompts = [
    "Explain this in simple Telugu to my father",
    "What is the complete 4-year cost including hostel charges?",
    "Is NIAT a college or a separate upskilling program?",
    "What critical questions should parents ask before paying?"
  ];

  const teluguPrompts = [
    "మా నాన్నకు NIAT గురించి సరళమైన తెలుగులో వివరించండి",
    "B.Tech డిగ్రీని యూనివర్సిటీ ఇస్తుందా లేదా NIAT ఇస్తుందా?",
    "4 సంవత్సరాల మొత్తం ఖర్చు మరియు హాస్టల్ ఫీజు ఎంత?",
    "ఉద్యోగం లేదా ప్లేస్‌మెంట్ గ్యారెంటీగా లభిస్తుందా?"
  ];

  const activePrompts = language === 'te'
    ? teluguPrompts
    : (mode === 'parent' ? parentPrompts : studentPrompts);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await sendChatMessage(
        query.trim(),
        sessionId,
        mode,
        language,
        messages
      );

      const botMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: resp.message,
        citations: resp.citations || [],
        tools_used: resp.tools_used || [],
        engine_used: resp.engine_used,
        latency_ms: resp.latency_ms,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      if (isVoiceResponseEnabled) {
        speakMessage(resp.message, botMsg.id);
      }
      if (resp.suggested_actions && resp.suggested_actions.length > 0) {
        setSuggestedActions(resp.suggested_actions);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${err.message || 'Error communicating with AI engine. Please verify network or credentials.'}`,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (confirm('Are you sure you want to clear this conversation history?')) {
      await clearSessionMessages(sessionId);
      setMessages([]);
      setSuggestedActions([]);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex-1 flex flex-col h-full max-w-4xl w-full mx-auto px-3 sm:px-6 overflow-hidden">
      {/* Messages List Area - Only this scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 pt-2 pb-2">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-14 space-y-5 text-center animate-fade-in my-auto">
            {/* Claude-Style Clean Centered Emblem & Warm Greeting */}
            <div className="flex items-center justify-center space-x-2.5">
              <span className="text-2xl sm:text-3xl text-amber-500 animate-spin-slow">✳️</span>
              <h1 className="text-2xl sm:text-4xl font-serif tracking-tight text-slate-900 dark:text-white font-medium">
                {getGreeting()}, {userName || (mode === 'student' ? 'Student' : 'Parent')}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed px-4">
              {language === 'te'
                ? 'NIAT అడ్మిషన్స్, 41 క్యాంపస్‌లు, B.Tech డిగ్రీలు మరియు ఫీజులపై మీ సందేహాలను అడగండి.'
                : 'How can I help you explore NIAT programs, university degrees, and admissions today?'}
            </p>

            {/* Clean compact suggestion pills (No big headline, takes minimal space) */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto pt-1 px-2">
              {activePrompts.slice(0, 4).map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(promptText)}
                  className="px-3.5 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/90 hover:dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white transition-all shadow-xs flex items-center space-x-1.5 active:scale-95 text-left"
                >
                  <span>{promptText}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            <div className="flex justify-center pt-1 pb-1">
              <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                Today {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`${
                    msg.role === 'user'
                      ? 'max-w-[85%] sm:max-w-[75%] bg-[#223D72] text-white rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-md space-y-1'
                      : 'w-full max-w-full bg-transparent text-slate-900 dark:text-white p-1 sm:p-2 space-y-3'
                  }`}
                >
                  <div className="text-sm leading-relaxed text-slate-900 dark:text-white">
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} theme={theme} />
                    ) : (
                      <div className="whitespace-pre-line font-medium text-white">{msg.content}</div>
                    )}
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                      <div>
                        {msg.citations && msg.citations.length > 0 && (
                          <button
                            onClick={() => onOpenCitations(msg.citations || [])}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-cyan-500/10 dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 dark:border-zinc-800 transition-all font-medium text-[11px]"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{msg.citations.length} Verified Citations</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => speakMessage(msg.content, msg.id)}
                          className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
                            speakingMsgId === msg.id ? 'text-cyan-500 bg-cyan-500/10' : 'text-slate-400'
                          }`}
                          title="Listen to this answer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 transition-colors"
                          title="Copy response"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 py-3 px-2 text-xs text-slate-500 dark:text-zinc-400 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Thinking and grounding response in official NIAT knowledge base...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggested Follow-up Actions */}
      {suggestedActions.length > 0 && !loading && (
        <div className="flex flex-wrap items-center gap-1.5 py-1.5 overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Suggested:</span>
          {suggestedActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(action)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0D1117] hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-white border border-slate-200 dark:border-zinc-800 transition-all truncate max-w-xs shadow-xs"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Claude-Style Chat Box Area - Anchored smoothly at bottom */}
      <div className="shrink-0 pt-1 pb-3 sm:pb-4 z-20 bg-transparent transition-colors w-full">
        {/* Urgent Live Notification Banner (If exam or counselling is today) */}
        {urgentNotice && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs animate-fade-in shadow-xs">
            <div className="flex items-center space-x-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
              <span className="font-bold text-rose-500 dark:text-rose-400 shrink-0">{urgentNotice.title}:</span>
              <span className="text-slate-700 dark:text-zinc-300 truncate text-[11px]">{urgentNotice.message}</span>
            </div>
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="text-[11px] text-blue-500 hover:underline font-bold shrink-0 ml-2"
              >
                View
              </button>
            )}
          </div>
        )}

        {/* Rounded Input Container like Claude */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111620] border border-slate-200 dark:border-zinc-800 focus-within:border-blue-500/80 dark:focus-within:border-blue-500 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all p-2.5 sm:p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "🎙️ Listening... speak now..."
                : (language === 'te'
                  ? "NIAT అడ్మిషన్స్ గురించి ఏదైనా అడగండి..."
                  : "How can I help you today?")
            }
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 px-2 py-1 focus:outline-none resize-none max-h-32 min-h-[40px]"
          />

          {/* Bottom Toolbar row inside the chatbox */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800/60 mt-1">
            {/* Left Side: + Quick Tools Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQuickTools(!showQuickTools)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center space-x-1"
                title="Quick Admission Tools"
              >
                <Plus className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              </button>

              {/* Tools Popover */}
              {showQuickTools && (
                <div className="absolute left-0 bottom-9 z-50 w-52 rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-zinc-800 shadow-xl p-1.5 space-y-1 text-xs animate-scale-in">
                  <button
                    onClick={() => { onOpenCalculator(); setShowQuickTools(false); }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-left text-slate-700 dark:text-zinc-200"
                  >
                    <Calculator className="w-3.5 h-3.5 text-cyan-500" />
                    <span>4-Year Cost Calculator</span>
                  </button>
                  <button
                    onClick={() => { onOpenCampusCompare(); setShowQuickTools(false); }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-left text-slate-700 dark:text-zinc-200"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Campuses Directory</span>
                  </button>
                  <button
                    onClick={() => { onOpenReport(); setShowQuickTools(false); }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-left text-slate-700 dark:text-zinc-200"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Decision Report</span>
                  </button>
                  <button
                    onClick={() => { onOpenChecklist(); setShowQuickTools(false); }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-left text-slate-700 dark:text-zinc-200"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>Admission Checklist</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={toggleVoiceResponse}
                className={`p-1.5 rounded-lg transition-all ${
                  isVoiceResponseEnabled
                    ? 'text-cyan-500 bg-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
                }`}
                title={isVoiceResponseEnabled ? "Voice Output ON" : "Voice Output OFF"}
              >
                {isVoiceResponseEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-1.5 rounded-lg transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
                }`}
                title={isListening ? "Listening... Speak now" : "Voice Input (Speech-to-Text)"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg"
                  title="Clear chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-3 pt-1.5 text-[10px] text-slate-400 dark:text-zinc-500">
          <span>NIAT AI Copilot • 41 Collaborating Campuses</span>
          <span className="hidden sm:inline">Press Enter to send, Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
