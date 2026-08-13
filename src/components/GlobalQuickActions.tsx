import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  X, 
  Trash2, 
  Globe, 
  Image, 
  Cpu, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Volume2,
  VolumeX,
  History,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuickActionItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  endpointValue: string;
  estimatedReclaimed: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "dns",
    name: "Flush DNS Cache",
    description: "Sanitizes local systemd-resolved DNS caching lookup tables.",
    icon: Globe,
    endpointValue: "flush-dns",
    estimatedReclaimed: "Hosts Flush"
  },
  {
    id: "thumbnails",
    name: "Clear Thumbnail Cache",
    description: "Clears directory ~/.cache/thumbnails/ preview graphics safely.",
    icon: Image,
    endpointValue: "clear-thumbnails",
    estimatedReclaimed: "95 MB Rec"
  },
  {
    id: "recycle",
    name: "Empty Recycle Bin",
    description: "Permanently purges Cinnamon user Trash files and cache blobs.",
    icon: Trash2,
    endpointValue: "empty-recycle",
    estimatedReclaimed: "85 MB Rec"
  },
  {
    id: "ram",
    name: "Drop RAM Buffer Caches",
    description: "Triggers sync and clears inactive cache memory structures.",
    icon: Cpu,
    endpointValue: "flush-ram",
    estimatedReclaimed: "Free Cache"
  }
];

export default function GlobalQuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [successActionId, setSuccessActionId] = useState<string | null>(null);
  
  // Audio feedback setting (muted by default)
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // History tracking for current session
  const [history, setHistory] = useState<{ time: string; name: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const triggerSound = (type: "click" | "success" | "error") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "click") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "error") {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio Context block or error:", e);
    }
  };

  const executeAction = async (actionItem: QuickActionItem) => {
    if (runningActionId) return;
    
    setRunningActionId(actionItem.id);
    triggerSound("click");

    try {
      const res = await fetch("/api/system/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionItem.endpointValue })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccessActionId(actionItem.id);
        triggerSound("success");
        setToast({ type: "success", message: data.message });
        
        // Update history log
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setHistory(prev => [{ time: timestamp, name: actionItem.name }, ...prev].slice(0, 5));

        // Dispatch system-updated event to reload other active component stats
        window.dispatchEvent(new CustomEvent("system-updated", { detail: { action: actionItem.id } }));

        setTimeout(() => {
          setSuccessActionId(null);
        }, 2000);
      } else {
        triggerSound("error");
        setToast({ type: "error", message: data.error || "Failed to execute quick action." });
      }
    } catch (err) {
      console.error("Quick action failed:", err);
      triggerSound("error");
      setToast({ type: "error", message: "Network connection failure." });
    } finally {
      setRunningActionId(null);
    }
  };

  // Close toast automatically after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" ref={menuRef} id="global-quick-actions-container">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={`absolute bottom-20 right-0 p-3.5 rounded-xl border flex items-center gap-2.5 shadow-2xl min-w-[300px] max-w-[380px] text-xs font-mono backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-[#05070a]/90 border-emerald-500/40 text-emerald-300" 
                : "bg-red-950/90 border-red-500/40 text-red-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            )}
            <div className="flex-1">
              <span className="font-sans font-bold uppercase tracking-wider block text-[10px] text-slate-400 mb-0.5">
                {toast.type === "success" ? "Task Complete" : "Task Failed"}
              </span>
              <p className="leading-snug">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-500 hover:text-slate-300 font-bold transition-colors cursor-pointer text-sm"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating expand panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 25 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute bottom-16 right-0 w-80 bg-[#0c121a]/95 backdrop-blur-md border border-emerald-500/20 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#05070a]/90 px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1">
                    Quick Actions
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono">Instant Companion Tools</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Audio Feedback toggle */}
                <button
                  onClick={() => setSoundEnabled(prev => !prev)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    soundEnabled 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-[#05070a] border-white/5 text-slate-600 hover:text-slate-400"
                  }`}
                  title={soundEnabled ? "Mute interface feedback" : "Enable audio task alerts"}
                >
                  {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                </button>

                {/* History list toggle */}
                <button
                  onClick={() => setShowHistory(prev => !prev)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    showHistory 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-[#05070a] border-white/5 text-slate-500 hover:text-slate-300"
                  }`}
                  title="View task execution log"
                >
                  <History className="h-3 w-3" />
                </button>

                <button
                  onClick={() => { triggerSound("click"); setIsOpen(false); }}
                  className="p-1 bg-[#05070a] hover:bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Content area: Actions or History */}
            <div className="p-3 max-h-80 overflow-y-auto space-y-2">
              {showHistory ? (
                <div className="space-y-2 py-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1">
                    <span>Task Execution History</span>
                    <button 
                      onClick={() => setHistory([])}
                      className="text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Clear Log
                    </button>
                  </div>
                  {history.length > 0 ? (
                    <div className="space-y-1.5 divide-y divide-white/5">
                      {history.map((h, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0 flex items-start gap-2 text-[11px] font-mono">
                          <span className="text-slate-600 font-bold shrink-0">{h.time}</span>
                          <div className="flex-1 text-slate-300 truncate">
                            <span className="text-emerald-400 font-bold mr-1">✓</span>
                            {h.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-600 font-mono text-xs">
                      No actions executed this session
                    </div>
                  )}
                </div>
              ) : (
                QUICK_ACTIONS.map((action) => {
                  const isRunning = runningActionId === action.id;
                  const isSuccess = successActionId === action.id;
                  const ActionIcon = action.icon;

                  return (
                    <button
                      key={action.id}
                      onClick={() => executeAction(action)}
                      disabled={runningActionId !== null}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all select-none cursor-pointer group ${
                        isRunning 
                          ? "bg-emerald-500/5 border-emerald-500/40 text-emerald-300"
                          : isSuccess 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                          : "bg-[#05070a]/60 border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.01] text-slate-300"
                      }`}
                      id={`quick-action-trigger-${action.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg border transition-all ${
                          isRunning 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : isSuccess 
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            : "bg-[#0c121a] border-white/5 text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/20"
                        }`}>
                          <ActionIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-sans font-bold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                            {action.name}
                          </span>
                          <span className="block text-[9px] text-slate-500 truncate font-sans leading-tight mt-0.5">
                            {action.description}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isRunning ? (
                          <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                        ) : isSuccess ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                        ) : (
                          <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/5 text-emerald-400/80 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 border border-emerald-500/10">
                            {action.estimatedReclaimed}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer warning info */}
            <div className="bg-[#05070a]/90 px-4 py-2 border-t border-white/5 text-[9px] font-mono text-slate-600 flex items-center justify-between">
              <span>ACTIVE PROTOCOLS: LOCAL</span>
              <span className="text-emerald-500/50">MINTCARE UTILS</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) Trigger */}
      <motion.button
        onClick={() => {
          triggerSound("click");
          setIsOpen(!isOpen);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`p-3.5 rounded-full border shadow-2xl transition-all cursor-pointer relative flex items-center justify-center ${
          isOpen
            ? "bg-red-500/10 text-red-400 border-red-500/30 hover:border-red-400"
            : "bg-[#0c121a]/95 text-emerald-400 border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] shadow-emerald-950/20"
        }`}
        title="Open Global Quick Actions Menu"
        id="global-quick-actions-fab"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="zap"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              {/* Pulsating status glow around the icon */}
              <span className="absolute -inset-1 rounded-full bg-emerald-500/10 animate-ping opacity-60"></span>
              <Zap className="h-5 w-5 fill-emerald-500/10" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
