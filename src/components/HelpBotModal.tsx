import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Languages,
  Mail
} from 'lucide-react';
import {
  BOT_KNOWLEDGE_BASE,
  QUICK_PROMPTS,
  searchKnowledgeBase,
  BotKnowledgeItem,
  QuickPrompt
} from '../lib/help-bot-data';
import { LanguageMode } from '../types';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  knowledgeItem?: BotKnowledgeItem;
  isOffTopic?: boolean;
  isFallback?: boolean;
  timestamp: string;
}

interface HelpBotModalProps {
  language: LanguageMode;
  onNavigateTab: (tab: 'daily' | 'register' | 'admin' | 'print') => void;
  onTriggerSync?: () => void;
}

export const HelpBotModal: React.FC<HelpBotModalProps> = ({
  language: initialLanguage,
  onNavigateTab,
  onTriggerSync,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<'mr' | 'en'>(
    initialLanguage === 'en' ? 'en' : 'mr'
  );
  const [inputText, setInputText] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<{ [msgId: string]: 'yes' | 'no' }>({});
  const [isTyping, setIsTyping] = useState(false);

  // Initial welcome message
  const getInitialMessages = (lang: 'mr' | 'en'): Message[] => [
    {
      id: 'welcome-1',
      sender: 'bot',
      text:
        lang === 'mr'
          ? 'नमस्ते! मी महापोषण डिजिटल सहाय्यक आहे 🤖. मी फक्त या ॲपमधील दैनिक हजेरी, धान्य शिल्लक, आवक, शासकीय अहवाल आणि तांत्रिक अडचणी सोडवण्यासाठी मदत करतो. खालीलपैकी कोणताही विषय निवडा किंवा तुमचा प्रश्न टाईप करा!'
          : 'Hello! I am your MahaPoshan Digital Assistant 🤖. I am exclusively trained to help you with daily meal entries, grain inventory, official government reports, and troubleshooting this app. Pick a topic below or type your question!',
      timestamp: 'Just now',
    },
  ];

  const [messages, setMessages] = useState<Message[]>(() =>
    getInitialMessages(initialLanguage === 'en' ? 'en' : 'mr')
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isTyping]);

  // Sync language with parent if changed
  useEffect(() => {
    setActiveLang(initialLanguage === 'en' ? 'en' : 'mr');
  }, [initialLanguage]);

  const handleSendQuery = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Realistic small delay for smooth conversational feel (300ms)
    setTimeout(() => {
      const searchResult = searchKnowledgeBase(trimmed);
      const botMsgId = `bot-${Date.now()}`;

      let botMsg: Message;

      if (searchResult.isOffTopic) {
        // App-only scope guardrail
        botMsg = {
          id: botMsgId,
          sender: 'bot',
          isOffTopic: true,
          text:
            activeLang === 'mr'
              ? '⚠️ क्षमस्व! मी फक्त महापोषण नोंदवही (MahaPoshan Register) ॲपशी संबंधित प्रश्नांची उत्तरे देतो. कृपया शालेय पोषण आहार, विद्यार्थी हजेरी, तांदूळ/धान्य शिल्लक, शासकीय अहवाल किंवा ॲडमिन सेटिंग्ज संबंधी प्रश्न विचारा.'
              : '⚠️ Apologies! I am programmed to exclusively assist with the MahaPoshan Register application. Please ask questions related to student attendance, grain stock, government reports, or app settings.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (searchResult.item) {
        botMsg = {
          id: botMsgId,
          sender: 'bot',
          knowledgeItem: searchResult.item,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else {
        // Fallback with quick suggestions
        botMsg = {
          id: botMsgId,
          sender: 'bot',
          isFallback: true,
          text:
            activeLang === 'mr'
              ? 'मला तुमच्या प्रश्नाचा थेट संदर्भ सापडला नाही. तुम्ही खालीलपैकी एका मुख्य विषयावर क्लिक करू शकता किंवा तुमचा प्रश्न सोप्या शब्दांत (उदा. "हजेरी", "पासवर्ड", "शिल्लक", "प्रिंट") लिहू शकता:'
              : "I couldn't find an exact match for your query. You can click any of the common topics below or use simpler keywords like 'attendance', 'password', 'stock', or 'print':",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 350);
  };

  const handleActionClick = (action: {
    type: 'navigate_tab' | 'sync_now' | 'open_email' | 'recalculate';
    tabTarget?: 'daily' | 'register' | 'admin' | 'print';
  }) => {
    if (action.type === 'navigate_tab' && action.tabTarget) {
      onNavigateTab(action.tabTarget);
      // Auto-minimize on mobile after navigating
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    } else if (action.type === 'sync_now') {
      if (onTriggerSync) {
        onTriggerSync();
      }
    } else if (action.type === 'open_email') {
      window.location.href = 'mailto:poshanregister@gmail.com?subject=MahaPoshan%20App%20Help%20Query';
    } else if (action.type === 'recalculate') {
      onNavigateTab('admin');
    }
  };

  const handleResetChat = () => {
    setMessages(getInitialMessages(activeLang));
    setFeedbackGiven({});
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right, placed above mobile navigation bar) */}
      {!isOpen && (
        <div className="fixed bottom-20 right-3.5 md:bottom-6 md:right-6 z-40 no-print flex items-center gap-2">
          {/* Subtle pulse pill on initial display */}
          <div className="hidden sm:flex items-center gap-1.5 bg-amber-900 text-amber-100 text-xs font-semibold py-1.5 px-3 rounded-full shadow-lg border border-amber-700/60 pointer-events-none animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{activeLang === 'mr' ? 'काही अडचण आहे?' : 'Need Help?'}</span>
          </div>

          <button
            id="btn-open-help-bot"
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open MahaPoshan Help Assistant"
            className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-800 to-amber-900 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-amber-300/40 cursor-pointer"
          >
            <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-amber-100 group-hover:rotate-12 transition-transform duration-200" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </button>
        </div>
      )}

      {/* Chat Window / Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="bot-title"
          className="fixed bottom-16 right-2 left-2 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] h-[580px] max-h-[85vh] z-50 no-print flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Chatbot Header */}
          <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-amber-700/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-200 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 id="bot-title" className="font-bold text-xs sm:text-sm tracking-tight leading-none text-white">
                    {activeLang === 'mr' ? 'महापोषण सहाय्यक' : 'MahaPoshan Assistant'}
                  </h3>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.2 rounded-full font-semibold">
                    100% Free
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/80 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{activeLang === 'mr' ? 'फक्त महापोषण ॲपसाठी • ऑफलाइन तयार' : 'App-Only Support • Offline Ready'}</span>
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Language Switch */}
              <button
                type="button"
                onClick={() => setActiveLang((prev) => (prev === 'mr' ? 'en' : 'mr'))}
                title="Switch Language"
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-amber-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Languages className="w-3 h-3" />
                <span>{activeLang === 'mr' ? 'EN' : 'मराठी'}</span>
              </button>

              {/* Reset History */}
              <button
                type="button"
                onClick={handleResetChat}
                title={activeLang === 'mr' ? 'नवीन संवाद सुरू करा' : 'Clear Chat'}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/70 text-slate-800 text-xs">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-end justify-end'}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-lg bg-amber-800 text-amber-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2 ${isBot ? 'text-left' : 'text-right'}`}>
                    {/* Plain Text Bubble */}
                    {msg.text && (
                      <div
                        className={`p-3 rounded-2xl shadow-2xs leading-relaxed text-xs ${
                          isBot
                            ? msg.isOffTopic
                              ? 'bg-amber-50 text-amber-950 border border-amber-300'
                              : 'bg-white text-slate-800 border border-slate-200/90'
                            : 'bg-amber-700 text-white ml-auto'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    {/* Rich Knowledge Item Card */}
                    {msg.knowledgeItem && (
                      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5 text-left">
                        {/* Title */}
                        <div className="font-bold text-xs sm:text-sm text-amber-950 flex items-start gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            {activeLang === 'mr'
                              ? msg.knowledgeItem.titleMr
                              : msg.knowledgeItem.titleEn}
                          </span>
                        </div>

                        {/* Summary */}
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {activeLang === 'mr'
                            ? msg.knowledgeItem.summaryMr
                            : msg.knowledgeItem.summaryEn}
                        </p>

                        {/* Step by Step Guide */}
                        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            {activeLang === 'mr' ? 'पायऱ्या (Steps):' : 'Follow these steps:'}
                          </span>
                          <ol className="space-y-1.5 text-[11px] text-slate-700">
                            {(activeLang === 'mr'
                              ? msg.knowledgeItem.stepsMr
                              : msg.knowledgeItem.stepsEn
                            ).map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-tight">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Pro Tip if available */}
                        {(activeLang === 'mr'
                          ? msg.knowledgeItem.tipsMr
                          : msg.knowledgeItem.tipsEn) && (
                          <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-[10px] text-amber-900">
                            💡{' '}
                            {activeLang === 'mr'
                              ? msg.knowledgeItem.tipsMr
                              : msg.knowledgeItem.tipsEn}
                          </div>
                        )}

                        {/* Action Buttons */}
                        {msg.knowledgeItem.actions && msg.knowledgeItem.actions.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {msg.knowledgeItem.actions.map((act, actIdx) => (
                              <button
                                key={actIdx}
                                type="button"
                                onClick={() => handleActionClick(act)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] transition-colors cursor-pointer shadow-2xs"
                              >
                                {act.type === 'sync_now' && <RefreshCw className="w-3 h-3" />}
                                {act.type === 'open_email' && <Mail className="w-3 h-3" />}
                                {act.type === 'navigate_tab' && <ArrowRight className="w-3 h-3" />}
                                <span>
                                  {activeLang === 'mr' ? act.labelMr : act.labelEn}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Helpfulness feedback rating */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{activeLang === 'mr' ? 'अडचण सुटली का?' : 'Did this help?'}</span>
                          <div className="flex items-center gap-1.5">
                            {feedbackGiven[msg.id] ? (
                              <span className="text-emerald-700 font-semibold text-[10px]">
                                {activeLang === 'mr' ? '✓ धन्यवाद!' : '✓ Thank you!'}
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedbackGiven((prev) => ({ ...prev, [msg.id]: 'yes' }))
                                  }
                                  className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                                  title="Yes, issue resolved"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedbackGiven((prev) => ({ ...prev, [msg.id]: 'no' }))
                                  }
                                  className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                                  title="No, still facing problem"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[9px] text-slate-400 block px-1">
                      {msg.timestamp}
                    </span>
                  </div>

                  {!isBot && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mb-4 shadow-2xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <div className="w-6 h-6 rounded-lg bg-amber-800 text-amber-100 flex items-center justify-center">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="bg-white px-3 py-2 rounded-2xl border border-slate-200 flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips (Horizontally Scrollable) */}
          <div className="p-2 bg-slate-100/90 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.id}
                type="button"
                onClick={() => handleSendQuery(qp.query)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200/90 hover:border-amber-300 text-[10px] font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                {activeLang === 'mr' ? qp.labelMr : qp.labelEn}
              </button>
            ))}
          </div>

          {/* User Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputText);
            }}
            className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeLang === 'mr'
                  ? 'तुमचा प्रश्न विचारा... (उदा. हजेरी, पासवर्ड, शिल्लक)'
                  : 'Ask a question... (e.g., attendance, password, stock)'
              }
              className="flex-1 px-3 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition-all text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:hover:bg-amber-700 text-white transition-all cursor-pointer shadow-xs shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
