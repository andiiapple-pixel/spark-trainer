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
      <div
        className="max-w-[80%] px-4 py-3"
        style={{
          background: isUser ? '#111111' : 'transparent',
          color: isUser ? '#FFFFFF' : '#888888',
          borderRadius: 0,
          borderLeft: !isUser ? '3px solid #E8FF00' : 'none',
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          lineHeight: '1.6',
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
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-3"
        style={{ borderBottom: '1px solid #222222', background: '#0A0A0A' }}
      >
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 24, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.02em' }}>COACH</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-36">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div
              className="py-4"
              style={{ borderLeft: '3px solid #E8FF00', paddingLeft: 16 }}
            >
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: '#FFFFFF', marginBottom: 4 }}>Hey there!</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#888888', lineHeight: '1.6' }}>
                I&apos;m your personal trainer. Ask me anything about training, nutrition, recovery, or your progress. I&apos;ve got your profile right here, so I can give you personalised advice.
              </p>
            </div>

            <p className="text-center mt-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#555555' }}>Try asking...</p>

            {/* Suggested prompts */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {contextualPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  className="flex-shrink-0 px-4 py-2.5 btn-press"
                  style={{ background: 'transparent', border: '1px solid #222222', color: '#888888', whiteSpace: 'nowrap', borderRadius: 0, fontFamily: "'Inter', sans-serif", fontSize: 13 }}
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
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderLeft: '3px solid #E8FF00', borderRadius: 0 }}
            >
              <Loader size={14} className="animate-spin" style={{ color: '#E8FF00' }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#555555' }}>Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="px-4 py-3 mb-3 animate-fade-in"
            style={{ background: 'transparent', borderLeft: '3px solid #EF4444', borderRadius: 0, fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#EF4444' }}
          >
            {error}{' '}
            <button
              onClick={() => { setError(null); send(messages[messages.length - 1]?.content); }}
              className="underline"
              style={{ color: '#E8FF00' }}
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
        style={{ background: '#0A0A0A' }}
      >
        <div
          className="flex items-end gap-2 p-2"
          style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}
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
              color: '#FFFFFF',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              resize: 'none',
              maxHeight: 100,
              padding: '8px 4px',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center btn-press"
            style={{
              width: 48,
              height: 48,
              background: 'transparent',
              color: input.trim() && !loading ? '#E8FF00' : '#555555',
              borderRadius: 0,
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
