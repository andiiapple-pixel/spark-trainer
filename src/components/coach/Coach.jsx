import { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { storage, getCurrentStreak, getWeeklyWorkoutCount } from '../../utils/storage';
import { sendCoachMessage, generateContextualCoachPrompts } from '../../api/anthropic';
import { data as dataApi, recovery as recoveryApi } from '../../services/api';

const FALLBACK_PROMPTS = [
  "Am I overtraining?",
  "What should I eat before a morning session?",
  "How do I improve my squat form?",
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mr-2 flex-shrink-0 mt-1"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          ST
        </div>
      )}
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={{
          background: isUser ? '#6366f1' : '#111118',
          color: isUser ? '#fff' : '#e2e8f0',
          border: isUser ? 'none' : '1px solid #1e1e2e',
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function Coach() {
  const [messages, setMessages] = useState(() => storage.getCoachChat());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextualPrompts, setContextualPrompts] = useState(FALLBACK_PROMPTS);
  const [coachContext, setCoachContext] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history from API on mount; fall back to localStorage
  useEffect(() => {
    dataApi.getCoachChat()
      .then(res => {
        const apiMsgs = (res.messages || []).map(m => ({ role: m.role, content: m.content }));
        if (apiMsgs.length > 0) setMessages(apiMsgs);
      })
      .catch(() => {}); // silently use localStorage fallback

    // Build coach context for richer responses
    const profile = storage.getProfile();
    const history = storage.getWorkoutHistory();
    const programme = storage.getActiveProgramme();
    const prs = storage.getPersonalRecords();
    const streak = getCurrentStreak(history);
    const weeklyCount = getWeeklyWorkoutCount(history);

    const ctx = {
      recentWorkouts: history.slice(0, 7),
      currentProgramme: programme,
      personalRecords: Object.entries(prs || {}).map(([name, pr]) => ({ name, ...pr })).slice(0, 20),
      consistencyStats: {
        currentStreak: streak,
        workoutsThisWeek: weeklyCount,
        targetPerWeek: profile?.daysPerWeek || 3,
        lastWorkoutDate: history[0]?.savedAt || null,
      },
    };
    setCoachContext(ctx);

    // Generate contextual prompts (non-blocking)
    if (profile) {
      generateContextualCoachPrompts(profile, ctx)
        .then(prompts => { if (Array.isArray(prompts) && prompts.length) setContextualPrompts(prompts); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setError(null);

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    storage.addCoachMessage(userMsg);

    setLoading(true);
    try {
      const profile = storage.getProfile();
      const history = storage.getWorkoutHistory();
      const recentNotes = history
        .slice(0, 5)
        .map(w => w.user_notes_today)
        .filter(Boolean);

      const chatHistory = newMessages.slice(-20);
      const reply = await sendCoachMessage(profile, chatHistory, msg, recentNotes, coachContext);

      const assistantMsg = { role: 'assistant', content: reply };
      setMessages(m => [...m, assistantMsg]);
      storage.addCoachMessage(assistantMsg);
      // Persist both messages to API (non-blocking)
      dataApi.saveCoachMessages([userMsg, assistantMsg]).catch(() => {});
    } catch (e) {
      setError("Your trainer lost connection. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid #1e1e2e', background: '#0a0a0f' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
          style={{ background: '#6366f1', color: '#fff', fontSize: 14 }}
        >
          ST
        </div>
        <div>
          <h1 className="font-bold" style={{ color: '#f8fafc' }}>Your Trainer</h1>
          <p className="text-xs" style={{ color: '#10b981' }}>● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-36">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div
              className="p-4 rounded-2xl"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid #6366f130' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background: '#6366f1', color: '#fff' }}
                >
                  ST
                </div>
                <p className="text-xs font-semibold" style={{ color: '#818cf8', letterSpacing: '0.04em' }}>
                  YOUR TRAINER
                </p>
              </div>
              <p className="font-bold mb-1" style={{ color: '#f8fafc' }}>Hey there! 👋</p>
              <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>
                I&apos;m your personal trainer. Ask me anything about training, nutrition, recovery, or your progress. I&apos;ve got your profile right here, so I can give you personalised advice.
              </p>
            </div>

            <p className="text-xs text-center mt-1" style={{ color: '#475569' }}>Try asking...</p>

            {/* Horizontal-scroll prompt chips */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {contextualPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  className="flex-shrink-0 px-4 py-2.5 rounded-full text-sm btn-press"
                  style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8', whiteSpace: 'nowrap' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 mb-3 animate-fade-in">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mr-2"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              ST
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-bl flex items-center gap-2"
              style={{ background: '#111118', border: '1px solid #1e1e2e' }}
            >
              <Loader size={14} className="animate-spin" style={{ color: '#6366f1' }} />
              <span className="text-sm" style={{ color: '#475569' }}>Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="px-4 py-3 rounded-2xl text-sm mb-3 animate-fade-in"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef444440', color: '#fca5a5' }}
          >
            {error}{' '}
            <button
              onClick={() => { setError(null); send(messages[messages.length - 1]?.content); }}
              className="underline"
              style={{ color: '#818cf8' }}
            >
              Retry
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-20 pt-3 max-w-[430px] mx-auto"
        style={{ background: 'linear-gradient(to top, #0a0a0f 70%, transparent)' }}
      >
        <div
          className="flex items-end gap-2 p-2 rounded-2xl"
          style={{ background: '#111118', border: '1px solid #2d2d3d' }}
        >
          <textarea
            ref={inputRef}
            placeholder="Ask your trainer anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: 16,
              resize: 'none',
              maxHeight: 100,
              padding: '8px 4px',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl btn-press transition-all"
            style={{
              background: input.trim() && !loading ? '#6366f1' : '#1e1e2e',
              color: input.trim() && !loading ? '#fff' : '#475569',
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
