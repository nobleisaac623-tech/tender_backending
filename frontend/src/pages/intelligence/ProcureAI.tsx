import { useState, useRef, useEffect } from 'react';
import { aiService, type AIChatMessage } from '@/services/ai';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toastError } from '@/hooks/useToast';
import { Sparkles, Send, Trash2, Loader2, Copy, Check } from 'lucide-react';
import MarkdownMessage from '@/components/ai/MarkdownMessage';
import AIErrorBoundary from '@/components/ai/AIErrorBoundary';

// Suggested questions by role
const suggestedQuestions = {
  admin: [
    "How do I structure criteria for a construction tender?",
    "What are red flags to watch for in supplier bids?",
    "How should I handle a sole-source procurement?",
    "What is the GPPA threshold for restricted tendering?",
  ],
  evaluator: [
    "How do I score technical proposals fairly?",
    "What is a weighted evaluation matrix?",
    "How should I handle a conflict of interest?",
    "What makes a bid technically non-responsive?",
  ],
  supplier: [
    "How do I write a winning technical proposal?",
    "What documents do I need to bid on a government tender?",
    "How should I price my bid competitively?",
    "What certifications improve my chances of winning?",
  ],
};

export function ProcureAI() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I am ProcureAI, your procurement intelligence assistant inside ProcurEase. I can help you with procurement best practices, market trends, bid strategies, and business decisions. What would you like to know? 👇`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const role = user?.role || 'supplier';
  const suggestions = suggestedQuestions[role as keyof typeof suggestedQuestions] || suggestedQuestions.supplier;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await aiService.chat(userMessage, messages);
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'ProcureAI is unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = async (suggestion: string) => {
    setInput(suggestion);
    // Auto-send after setting input
    setTimeout(() => {
      const userMessage = suggestion;
      setIsLoading(true);
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      
      aiService.chat(suggestion, messages)
        .then(response => {
          setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
        })
        .catch(e => {
          toastError(e instanceof Error ? e.message : 'ProcureAI is unavailable.');
        })
        .finally(() => setIsLoading(false));
    }, 100);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I am ProcureAI, your procurement intelligence assistant inside ProcurEase. I can help you with procurement best practices, market trends, bid strategies, and business decisions. What would you like to know? 👇`,
      },
    ]);
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">ProcureAI</h1>
                <p className="text-sm text-slate-500">Your procurement intelligence assistant</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
            <p className="text-sm text-slate-600 mb-3">Try asking:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(q)}
                  className="text-left text-sm p-3 rounded-lg bg-slate-50 hover:bg-blue-50 
                             border border-slate-200 hover:border-blue-200 transition-colors text-slate-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <AIErrorBoundary>
          <div className="space-y-4 mb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="text-blue-600" size={16} />
                      <span className="text-sm font-medium text-slate-600">ProcureAI</span>
                      {i > 0 && (
                        <button
                          onClick={() => handleCopy(msg.content, i)}
                          className="ml-auto text-slate-400 hover:text-slate-600"
                        >
                          {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  )}
                  {msg.role === 'assistant' ? (
                    <div className="text-sm leading-relaxed text-slate-700">
                      <MarkdownMessage content={msg.content} isUser={false} />
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed text-white">
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-600 animate-pulse" size={16} />
                    <span className="text-sm text-slate-500">ProcureAI is thinking...</span>
                    <Loader2 className="animate-spin text-slate-400" size={14} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </AIErrorBoundary>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask ProcureAI anything..."
              className="flex-1 border-0 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0"
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 text-center pb-2">
            Shift + Enter for new line • Enter to send
          </p>
        </div>

        {/* Footer disclaimer */}
        <p className="text-xs text-slate-400 text-center mt-4">
          🤖 ProcureAI • Advisory only — human judgment required for final decisions
        </p>
      </div>
    </div>
  );
}

export default ProcureAI;
