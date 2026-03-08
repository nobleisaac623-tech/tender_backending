import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import MarkdownMessage from './MarkdownMessage';
import AIErrorBoundary from './AIErrorBoundary';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function FloatingProcureAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm ProcureAI 👋 Ask me anything about procurement, bids, or business.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const location = useLocation();

  // Hide on the full intelligence page
  if (location.pathname.includes('/intelligence')) return null;

  // Scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        history: updatedMessages.slice(1, -1).slice(-6).map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (res.data.success) {
        const reply = res.data.data?.reply ?? res.data.data ?? 'No response received.';
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.data.message || 'ProcureAI is temporarily unavailable. Please try again in a moment.',
        }]);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'ProcureAI is temporarily unavailable. Please try again in a moment.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Determine full page intelligence route based on role
  const intelligenceRoute = user?.role === 'admin'
    ? '/admin/intelligence'
    : user?.role === 'evaluator'
    ? '/evaluator/intelligence'
    : '/supplier/intelligence';

  return (
    <>
      {/* Popup Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            width: '340px',
            height: '480px',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 998,
            animation: 'procureai-pop 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px',
              }}>🤖</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>ProcureAI</div>
                <div style={{ fontSize: '11px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
                  Online
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                to={intelligenceRoute}
                style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'none' }}
                onClick={() => setIsOpen(false)}
              >
                Full page →
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <AIErrorBoundary>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    background: msg.role === 'assistant'
                      ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                      : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px',
                  }}>
                    {msg.role === 'assistant' ? '🤖' : '👤'}
                  </div>

                  {/* Bubble */}
                  {msg.role === 'assistant' ? (
                    <div style={{
                      maxWidth: '80%',
                      padding: '10px 13px',
                      borderRadius: '4px 12px 12px 12px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}>
                      <MarkdownMessage content={msg.content} isUser={false} />
                    </div>
                  ) : (
                    <div style={{
                      maxWidth: '80%',
                      padding: '10px 13px',
                      borderRadius: '12px 4px 12px 12px',
                      background: '#2563eb',
                      color: 'white',
                      fontSize: '12px',
                      lineHeight: '1.6',
                    }}>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                  }}>🤖</div>
                  <div style={{
                    padding: '10px 14px', background: 'white', borderRadius: '4px 12px 12px 12px',
                    border: '1px solid #e2e8f0', display: 'flex', gap: '4px', alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8',
                        display: 'inline-block',
                        animation: `procureai-bounce 1.2s infinite ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          </AIErrorBoundary>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '8px',
            background: 'white',
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ProcureAI..."
              disabled={isLoading}
              style={{
                flex: 1,
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit',
                color: '#334155',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: input.trim() && !isLoading ? '#2563eb' : '#e2e8f0',
                color: input.trim() && !isLoading ? 'white' : '#94a3b8',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        title="Open ProcureAI"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '54px',
          height: '54px',
          borderRadius: '16px',
          background: isOpen
            ? '#1e293b'
            : 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '22px',
          boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1) translateY(-2px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(37,99,235,0.5)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1) translateY(0)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(37,99,235,0.4)';
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes procureai-pop {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes procureai-bounce {
          0%, 80%, 100% { transform: translateY(0);   }
          40%           { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
