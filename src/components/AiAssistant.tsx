import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Send, 
  Terminal, 
  ShieldCheck, 
  Cpu, 
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  MessageSquare
} from "lucide-react";

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

const PRESET_PROMPTS = [
  "How to configure Swappiness parameters in Linux Mint to prevent memory lag?",
  "What are the best commands to safely clear broken packages and apt dependencies?",
  "How can I safely configure cron to clean system thumbnail cache every week?",
  "How to check the S.M.A.R.T physical drive health in Linux Mint terminal?",
  "How to troubleshoot Cinnamon desktop high memory usage and reset Cinnamon safely?",
  "How to enable and configure the UFW Firewall to secure Linux Mint?",
  "What is the best way to verify and fix Flatpak permissions on Linux Mint?",
  "How do I analyze high network latency and update to fast Google or Cloudflare DNS?"
];

interface AiAssistantProps {
  initialQuery?: string;
  clearInitialQuery?: () => void;
}

export default function AiAssistant({ initialQuery, clearInitialQuery }: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your **MintCare Assistant**, a customized expert trained on Linux Mint Administration, Cinnamon desktop optimization, APT/Flatpak managers, and network optimization.\n\nAsk me any question or choose one of the quick suggestions below, and I will compile safe shell commands and comprehensive explanations for you."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: textToSend }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { id: assistantMsgId, sender: 'assistant', text: data.analysis }]);
      } else {
        const errorData = await res.json();
        setMessages(prev => [...prev, { id: assistantMsgId, sender: 'assistant', text: `Failed to retrieve advice from Gemini API:\n\n${errorData.error || "Please check if your GEMINI_API_KEY is configured."}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: assistantMsgId, sender: 'assistant', text: "Failed to connect to the backend API route. Please ensure the dev server is active." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
      if (clearInitialQuery) {
        clearInitialQuery();
      }
    }
  }, [initialQuery]);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
      {/* Suggestions side drawer */}
      <div className="lg:col-span-1 bg-[#0c121a] border border-emerald-900/20 p-4 rounded-xl shadow-md space-y-4">
        <h3 className="font-sans font-bold text-slate-100 text-sm flex items-center gap-1.5 border-b border-emerald-900/10 pb-2">
          <HelpCircle className="h-4 w-4 text-emerald-400" />
          Common Inquiries
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Select a preset configuration prompt to generate verified CLI terminal commands.
        </p>
        <div className="space-y-2">
          {PRESET_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="w-full text-left p-3 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-xs text-slate-300 bg-[#05070a]/40 rounded-lg transition-all cursor-pointer font-sans leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat log */}
      <div className="lg:col-span-3 bg-[#0c121a] border border-emerald-900/20 rounded-xl shadow-md flex flex-col h-[520px] overflow-hidden">
        {/* Chat header */}
        <div className="px-5 py-3.5 border-b border-emerald-900/15 flex items-center justify-between bg-[#080c12] shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-emerald-400" />
            <h4 className="font-sans font-bold text-xs text-slate-100 uppercase tracking-wider">MintCare AI Interactive Helpdesk</h4>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            Expert Mode
          </span>
        </div>

        {/* Scrollable logs */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar icon */}
                <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center border font-mono font-bold text-xs ${
                  isUser 
                    ? 'bg-slate-800 border-slate-700 text-slate-200' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {isUser ? "U" : "AI"}
                </div>

                {/* Message text card */}
                <div className={`p-4 rounded-xl border leading-relaxed space-y-2.5 whitespace-pre-wrap ${
                  isUser 
                    ? 'bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-tr-none' 
                    : 'bg-[#05070a]/60 border border-emerald-900/15 text-slate-300 rounded-tl-none font-sans'
                }`}>
                  {m.text}

                  {!isUser && (
                    <div className="flex justify-end pt-1.5 border-t border-emerald-900/10">
                      <button
                        onClick={() => handleCopyCode(m.id, m.text)}
                        className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-sans"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copied Text
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy Response
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2.5 text-slate-400 font-mono italic">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
              Gemini is consulting Linux Mint manuals...
            </div>
          )}
        </div>

        {/* Bottom input area */}
        <div className="p-4 border-t border-emerald-900/10 bg-[#080c12] shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything (e.g., 'How to configure UFW Firewall in Linux Mint Cinnamon?')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              disabled={loading}
              className="flex-1 bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg px-3 py-2.5 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-700 font-sans"
              id="chat-input-field"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)] shrink-0"
              id="chat-send-btn"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
