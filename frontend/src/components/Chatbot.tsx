import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, errMsg } from '../lib/api';
import { useUi } from '../stores/ui';

interface ChatMessage {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  aiGenerated?: boolean;
}

let msgId = 0;
const nextId = () => ++msgId;

/**
 * Floating help chatbot, available on every authenticated page. Proxies
 * through POST /ai/chat on the backend (never calls an AI provider
 * directly), which falls back to canned topic answers if AI is unavailable.
 */
export function Chatbot() {
  const { toast } = useUi();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), sender: 'bot', text: "Hi! I'm the CampusLoop help assistant. Ask me how to book an asset, return an item, list something for peer lending, or anything else about using the app." },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { id: nextId(), sender: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post('/ai/chat', { message: text });
      setMessages((m) => [...m, { id: nextId(), sender: 'bot', text: data.reply, aiGenerated: data.aiGenerated }]);
    } catch (err) {
      toast('error', errMsg(err));
      setMessages((m) => [...m, { id: nextId(), sender: 'bot', text: "Sorry, I couldn't reach the help service just now. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close help chat' : 'Open help chat'}
        aria-expanded={open}
        whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
        style={{
          position: 'fixed', right: 22, bottom: 22, zIndex: 950,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'grid', placeItems: 'center', color: '#fff',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          boxShadow: '0 10px 28px color-mix(in srgb, var(--accent) 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'chat'}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="CampusLoop help chat"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass-strong"
            style={{
              position: 'fixed', right: 22, bottom: 90, zIndex: 950,
              width: 'min(360px, calc(100vw - 32px))', height: 'min(520px, 70dvh)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff' }}>
                <Bot size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>CampusLoop Assistant</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Ask about booking, lending, and more</div>
              </div>
            </div>

            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m) => (
                <div key={m.id} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div
                    style={{
                      padding: '9px 13px', borderRadius: 16,
                      borderBottomRightRadius: m.sender === 'user' ? 4 : 16,
                      borderBottomLeftRadius: m.sender === 'user' ? 16 : 4,
                      fontSize: 13.5, lineHeight: 1.5,
                      background: m.sender === 'user' ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--glass)',
                      color: m.sender === 'user' ? '#fff' : 'var(--ink)',
                      border: m.sender === 'user' ? 'none' : '1px solid var(--glass-border)',
                    }}
                  >
                    {m.text}
                  </div>
                  {m.sender === 'bot' && m.aiGenerated === false && (
                    <div className="chip warn" style={{ marginTop: 5, fontSize: 10.5 }}>AI unavailable - general answer</div>
                  )}
                </div>
              ))}
              {sending && (
                <div style={{ alignSelf: 'flex-start' }}>
                  <div style={{ padding: '9px 13px', borderRadius: 16, borderBottomLeftRadius: 4, background: 'var(--glass)', border: '1px solid var(--glass-border)', display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.15 }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)', display: 'inline-block' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--glass-border)' }}>
              <input
                ref={inputRef}
                className="input"
                aria-label="Message the help assistant"
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                style={{ flex: 1, minHeight: 40, fontSize: 13.5 }}
              />
              <button
                className="btn btn-primary btn-sm"
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                style={{ width: 40, height: 40, padding: 0, borderRadius: 12, flexShrink: 0 }}
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
