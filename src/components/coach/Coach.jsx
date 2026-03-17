import { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { storage } from '../../utils/storage';
import { sendCoachMessage } from '../../api/anthropic';

const STARTER_PROMPTS = [
  "Am I overtraining?",
  "What should I eat before a morning session?",
  "Can you review my progress this month?",
  "How do I improve my squat form?",
  "What's the best way to lose fat without losing muscle?",
  "I've been feeling tired lately — should I take a rest week?",
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1"
          style={{ background: '#1e2d4a', border: '1px solid #3b82f640' }}
        >
          💪
        </div>
      )}
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={{
          background: isUser ? '#3b82f6' : '#1e1e2a',
          color: isUser ? '#fff' : '#e2e8f0',
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
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
      const reply = await sendCoachMessage(profile, chatHistory, msg, recentNotes);

      const assistantMsg = { role: 'assistant', content: reply };
      setMessages(m => [...m, assistantMsg]);
      storage.addCoachMessage(assistantMsg);
    } catch (e) {
      setError("Your trainer lost connection. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid #1a1a24' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ background: '#1e2d4a', border: '1px solid #3b82f640' }}
        >
          💪
        </div>
        <div>
          <h1 className="font-bold" style={{ color: '#f1f5f9' }}>Your Trainer</h1>
          <p className="text-xs" style={{ color: '#10b981' }}>● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-36">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div
              className="p-4 rounded-2xl"
              style={{ background: '#1e2d4a', border: '1px solid #3b82f640' }}
            >
              <p className="font-bold mb-1" style={{ color: '#93c5fd' }}>Hey there! 👋</p>
              <p className="text-sm" style={{ color: '#cbd5e1' }}>
                I&apos;m your personal trainer. Ask me anything about training, nutrition, recovery, or your progress. I&apos;ve got your profile right here, so I can give you personalised advice.
              </p>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: '#475569' }}>Try asking...</p>
            <div className="flex flex-col gap-2">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  className="text-left px-4 py-3 rounded-xl text-sm btn-press transition-all"
                  style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#94a3b8' }}
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
              className="w-7 h-7 rounded-full flex items-center justify-center mr-2 text-sm"
              style={{ background: '#1e2d4a' }}
            >
              💪
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-bl flex items-center gap-2"
              style={{ background: '#1e1e2a' }}
            >
              <Loader size={14} className="animate-spin" style={{ color: '#3b82f6' }} />
              <span className="text-sm" style={{ color: '#64748b' }}>Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm mb-3 animate-fade-in"
            style={{ background: '#2a1a1a', border: '1px solid #ef444450', color: '#fca5a5' }}
          >
            {error}{' '}
            <button
              onClick={() => { setError(null); send(messages[messages.length - 1]?.content); }}
              className="underline"
              style={{ color: '#93c5fd' }}
            >
              Retry
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-20 pt-3 max-w-[430px] mx-auto"
        style={{ background: 'linear-gradient(to top, #0f0f14 70%, transparent)' }}
      >
        <div
          className="flex items-end gap-2 p-2 rounded-2xl"
          style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
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
              color: '#f1f5f9',
              fontSize: 14,
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
              background: input.trim() && !loading ? '#3b82f6' : '#2a2a3a',
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
