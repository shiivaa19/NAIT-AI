import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Calculator,
  Building2,
  FileText,
  PhoneCall,
  ChevronRight,
  Flame,
  ArrowRight,
  Copy,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Play
} from 'lucide-react';
import { ChatMessage, Citation, UserMode, LanguageCode, ThemeMode } from '../types';
import { sendChatMessage, clearSessionMessages } from '../api';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatInterfaceProps {
  mode: UserMode;
  language: LanguageCode;
  sessionId: string;
  theme?: ThemeMode;
  onNewSession: () => void;
  onOpenCitations: (citations: Citation[]) => void;
  onOpenCalculator: () => void;
  onOpenCampusCompare: () => void;
  onOpenReport: () => void;
  onOpenCounselling: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  mode,
  language,
  sessionId,
  theme = 'light',
  onNewSession,
  onOpenCitations,
  onOpenCalculator,
  onOpenCampusCompare,
  onOpenReport,
  onOpenCounselling
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
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

    // Clean text of markdown, flowcharts, and special characters for natural voice
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
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
    "Can I join after Class 12 PCM? What are the eligibility years?",
    "What will I learn in each year? Tell me about the 50+ projects.",
    "Are internships guaranteed and what is the highest package?",
    "What is the NAT assessment test structure, syllabus and fee?",
    "Compare two Hyderabad collaborating university campuses."
  ];

  const parentPrompts = [
    "Explain this in simple Telugu to my father",
    "Is NIAT a college or a separate upskilling program?",
    "What is the complete 4-year cost including hostel charges?",
    "What if my family cannot afford the fees? Are scholarships available?",
    "What critical questions should parents ask before paying?",
    "Can you calculate my budget using a fee quotation of ₹1,80,000 tuition and ₹75,000 NIAT fee?"
  ];

  const teluguPrompts = [
    "మా నాన్నకు NIAT గురించి సరళమైన తెలుగులో వివరించండి",
    "B.Tech డిగ్రీని యూనివర్సిటీ ఇస్తుందా లేదా NIAT ఇస్తుందా?",
    "4 సంవత్సరాల మొత్తం ఖర్చు మరియు హాస్టల్ ఫీజు ఎంత?",
    "ఉద్యోగం లేదా ప్లేస్‌మెంట్ గ్యారెంటీగా లభిస్తుందా?",
    "హైదరాబాద్‌లోని క్యాంపస్‌లను పోల్చండి"
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

  const isDark = theme === 'dark';

  return (
    <div className="flex-1 flex flex-col h-full max-w-5xl w-full mx-auto px-4 sm:px-6 overflow-hidden">
      {/* Messages List Area - Only this scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-6 pt-2 pb-2">
        {messages.length === 0 ? (
          <div className="py-6 sm:py-10 space-y-8 animate-fade-in">
            {/* NIAT Official Crest Medallion Presentation */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-xl shadow-amber-500/25 p-1 shrink-0 flex items-center justify-center ring-4 ring-amber-300/40"
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

              {/* Mode Pill */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {mode === 'student' ? 'Student Discovery Mode' : 'Parent Transparency Mode'} Active
                </span>
              </div>
            </div>

            {/* Hero Welcome Text */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {language === 'te'
                  ? 'NIAT AI అడ్మిషన్ కోపైలట్'
                  : (mode === 'student'
                    ? 'Explore NIAT & Shape Your Tech Career'
                    : 'Clear, Honest Answers for Parents')}
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                {language === 'te'
                  ? 'UGC గుర్తింపు పొందిన 35+ విశ్వవిద్యాలయాలు, ఫీజుల వివరాలు, హాస్టల్ మరియు ప్లేస్‌మెంట్స్‌పై సరళమైన, నిఖార్సైన సమాధానాలు.'
                  : (mode === 'student'
                    ? 'Ask any question regarding university B.Tech degrees, NextGen AI curricula, NAT exam requirements, and 41 collaborating campuses.'
                    : 'Independent guidance on university degrees versus upskilling, transparent 4-year fee breakdowns, hostel safety, and placement realities.')}
              </p>
            </div>

            {/* Suggested Question Chips */}
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Frequently Asked Questions & Quick Prompts:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activePrompts.map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(promptText)}
                    className="flex items-start justify-between p-3.5 rounded-xl bg-white dark:bg-[#0D1117] hover:bg-slate-50 dark:hover:bg-[#151B22] border border-slate-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-zinc-700 text-left transition-all shadow-[0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.02)] group"
                  >
                    <span className="text-xs text-slate-700 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-white font-medium pr-2 leading-relaxed">
                      {promptText}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 shrink-0 mt-0.5 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {/* Centered Session Timestamp as seen in screenshot */}
            <div className="flex justify-center pt-2 pb-1">
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
                {/* Message Bubble Container: #223D72 for user, transparent black for assistant */}
                <div
                  className={`${
                    msg.role === 'user'
                      ? 'max-w-[85%] sm:max-w-[75%] bg-[#223D72] text-white rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)] space-y-1'
                      : 'w-full max-w-full bg-transparent dark:bg-transparent text-slate-900 dark:text-white p-1 sm:p-2 space-y-3'
                  }`}
                >
                  {/* Message Content */}
                  <div className="text-sm leading-relaxed text-slate-900 dark:text-white">
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} theme={theme} />
                    ) : (
                      <div className="whitespace-pre-line font-medium text-white">{msg.content}</div>
                    )}
                  </div>

                  {/* Assistant Footer */}
                  {msg.role === 'assistant' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                      <div>
                        {msg.citations && msg.citations.length > 0 && (
                          <button
                            onClick={() => onOpenCitations(msg.citations || [])}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-cyan-500/10 dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 dark:border-zinc-800 transition-all font-medium text-[11px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{msg.citations.length} Verified Citations</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 ml-auto">
                        {/* Voice Listen Button */}
                        <button
                          onClick={() => speakMessage(msg.content, msg.id)}
                          className={`p-1 rounded-md transition-colors ${
                            speakingMsgId === msg.id
                              ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 animate-pulse'
                              : 'text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                          title={speakingMsgId === msg.id ? "Stop Voice" : "Listen in Voice"}
                        >
                          {speakingMsgId === msg.id ? (
                            <Square className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="p-1 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-400"
                          title="Copy text"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                          {msg.created_at}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-start justify-start">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-transparent border border-slate-200 dark:border-transparent text-slate-700 dark:text-white flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-zinc-400 font-medium ml-1">
                    Grounded AI Reasoning...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggested Follow-up Actions */}
      {suggestedActions.length > 0 && !loading && (
        <div className="flex flex-wrap items-center gap-1.5 py-2 overflow-x-auto">
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

      {/* Input Box Area - Permanently Fixed at Bottom (Never moves on scroll) */}
      <div className="shrink-0 pt-2 pb-4 z-20 bg-slate-50 dark:bg-[#000000] transition-colors border-t border-slate-200 dark:border-zinc-900">
        <div className="relative rounded-2xl bg-white dark:bg-[#0E1217] border border-slate-200 dark:border-zinc-800 focus-within:border-blue-500 dark:focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(255,255,255,0.05)] transition-all">
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
                  ? "NIAT అడ్మిషన్స్ గురించి ఏదైనా అడగండి (ఉదా: నాన్నకు వివరించండి, ఫీజులు, డిగ్రీ)..."
                  : (mode === 'student'
                    ? "Ask any question about NIAT, B.Tech degrees, NAT exam, projects, or campuses..."
                    : "Ask about degree validation, total 4-year costs, hostel security, or request Telugu explanation..."))
            }
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 px-4 py-3.5 pr-36 focus:outline-none resize-none max-h-32"
          />

          <div className="absolute right-2.5 bottom-2 flex items-center space-x-1.5">
            {/* Voice Response Auto-Speak Toggle */}
            <button
              type="button"
              onClick={toggleVoiceResponse}
              className={`p-2 rounded-xl transition-all ${
                isVoiceResponseEnabled
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
                  : 'text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title={isVoiceResponseEnabled ? "Voice Responses are ON (Click to Mute)" : "Voice Responses are OFF (Click to Enable Voice)"}
            >
              {isVoiceResponseEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Voice Microphone Input Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title={isListening ? "Listening... Click to Stop" : "Speak to Ask (Voice Input)"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="p-2 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:pointer-events-none transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-slate-500 dark:text-zinc-500">
          <span className="flex items-center space-x-1.5">
            <span>NIAT AI Copilot • Voice & Text Enabled</span>
            {isVoiceResponseEnabled && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[9px] font-semibold border border-cyan-500/20">
                Voice Output ON
              </span>
            )}
          </span>
          <span className="hidden sm:inline">Press Enter to send, Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
