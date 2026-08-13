import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Keyboard, 
  Sparkles, 
  Eye, 
  LayoutDashboard, 
  Terminal, 
  Cpu, 
  HelpCircle,
  Clock,
  HeartPulse,
  Info
} from "lucide-react";

interface ShortcutItem {
  id: string;
  keys: string[];
  description: string;
  category: "navigation" | "accessibility" | "utility";
  actionLabel?: string;
  icon?: React.ComponentType<any>;
  onClickAction?: () => void;
}

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: any) => void;
  onToggleTheme: () => void;
  currentTheme: "immersive-dark" | "high-contrast";
}

export default function ShortcutsModal({
  isOpen,
  onClose,
  onSelectTab,
  onToggleTheme,
  currentTheme
}: ShortcutsModalProps) {
  const shortcuts: ShortcutItem[] = [
    {
      id: "nav-dashboard",
      keys: ["Ctrl", "D"],
      description: "Instantly switch to Dashboard Overview console.",
      category: "navigation",
      actionLabel: "Go to Dashboard",
      icon: LayoutDashboard,
      onClickAction: () => {
        onSelectTab("dashboard");
        onClose();
      }
    },
    {
      id: "nav-assistant",
      keys: ["Ctrl", "A"],
      description: "Switch to Mint AI Helpdesk and focus the question field.",
      category: "navigation",
      actionLabel: "Open AI Helpdesk",
      icon: Sparkles,
      onClickAction: () => {
        onSelectTab("assistant");
        // Focus is handled by the timeout in App.tsx
        onClose();
      }
    },
    {
      id: "nav-assistant-alt",
      keys: ["Ctrl", "K"],
      description: "Alternative query shortcut for Mint AI Helpdesk search box.",
      category: "navigation",
      actionLabel: "Search with AI",
      icon: Sparkles,
      onClickAction: () => {
        onSelectTab("assistant");
        onClose();
      }
    },
    {
      id: "nav-logs",
      keys: ["Ctrl", "Shift", "L"],
      description: "Jump to System Logs Terminal to inspect live cron output.",
      category: "navigation",
      actionLabel: "View System Logs",
      icon: Terminal,
      onClickAction: () => {
        onSelectTab("logs");
        onClose();
      }
    },
    {
      id: "nav-explorer",
      keys: ["Ctrl", "Shift", "E"],
      description: "Open the Task Explorer component to audit or kill active threads.",
      category: "navigation",
      actionLabel: "Open Task Explorer",
      icon: Cpu,
      onClickAction: () => {
        onSelectTab("processes");
        onClose();
      }
    },
    {
      id: "toggle-theme",
      keys: ["Alt", "T"],
      description: "Toggle High Contrast Accessibility theme on or off.",
      category: "accessibility",
      actionLabel: `Toggle theme (currently ${currentTheme === "high-contrast" ? "High Contrast" : "Immersive Dark"})`,
      icon: Eye,
      onClickAction: () => {
        onToggleTheme();
      }
    },
    {
      id: "toggle-shortcuts",
      keys: ["?"],
      description: "Toggle this Keyboard Shortcuts interactive legend.",
      category: "utility",
      actionLabel: "Toggle Shortcuts Menu",
      icon: Keyboard,
      onClickAction: () => {
        onClose();
      }
    },
    {
      id: "close-dialogs",
      keys: ["Esc"],
      description: "Instantly close active modals, dialogues, or input search boxes.",
      category: "utility",
      actionLabel: "Dismiss active modal",
      icon: X,
      onClickAction: () => {
        onClose();
      }
    }
  ];

  const categories = [
    { id: "navigation", label: "Application Navigation", color: "text-emerald-400 border-emerald-500/25 bg-emerald-500/5" },
    { id: "accessibility", label: "Accessibility Controls", color: "text-amber-400 border-amber-500/25 bg-amber-500/5" },
    { id: "utility", label: "General & Window Utilities", color: "text-sky-400 border-sky-500/25 bg-sky-500/5" }
  ];

  // Prevent event bubbling when clicking inside the modal content
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          id="shortcuts-modal-overlay"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
            onClick={handleModalClick}
            className="bg-[#0c121a] border border-emerald-500/20 max-w-2xl w-full rounded-2xl p-6 shadow-[0_15px_50px_rgba(0,0,0,0.6)] space-y-6 relative overflow-hidden"
            id="shortcuts-modal-content"
          >
            {/* Ambient visual matrix lines or glow */}
            <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-40 w-40 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm tracking-tight text-slate-100 uppercase flex items-center gap-2">
                    Keyboard Shortcuts Reference Portal
                    <span className="text-[9px] font-mono font-normal bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/25 uppercase">
                      accessibility core
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Discover global keyboard accelerators designed for power users and screen-readers.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-100 bg-[#05070a]/50 hover:bg-slate-800 rounded-lg transition-all cursor-pointer border border-white/5"
                title="Dismiss modal (Esc)"
                id="close-shortcuts-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Accessibility Tip Box */}
            <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-lg text-xs leading-relaxed text-emerald-400/90 flex items-start gap-2.5 relative z-10">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">Discovery Tip:</p>
                <p className="text-slate-400">
                  Click on any navigation shortcut row below to immediately trigger the action or jump to that module. Pressing <kbd className="font-bold text-emerald-400 font-mono bg-[#030508] px-1 py-0.25 rounded border border-white/5 text-[10px]">?</kbd> anywhere in the application will close or re-open this helper modal dynamically.
                </p>
              </div>
            </div>

            {/* Shortcuts Sections */}
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin relative z-10">
              {categories.map((cat) => {
                const catShortcuts = shortcuts.filter(s => s.category === cat.id);
                if (catShortcuts.length === 0) return null;

                return (
                  <div key={cat.id} className="space-y-3">
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-mono font-bold tracking-wide uppercase ${cat.color}`}>
                      <span>{cat.label}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {catShortcuts.map((shortcut) => {
                        const IconComponent = shortcut.icon || Keyboard;
                        return (
                          <div
                            key={shortcut.id}
                            onClick={shortcut.onClickAction}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#05070a]/40 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/[0.02] rounded-xl transition-all cursor-pointer group"
                            title={shortcut.actionLabel || "Trigger action"}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-1.5 bg-[#05070a] border border-white/5 rounded-lg text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all shrink-0">
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-200 group-hover:text-slate-100 transition-colors font-sans">
                                  {shortcut.actionLabel || shortcut.description}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                  {shortcut.description}
                                </p>
                              </div>
                            </div>

                            {/* Keystroke badges container */}
                            <div className="flex items-center gap-1.5 self-start sm:self-center">
                              {shortcut.keys.map((key, index) => (
                                <React.Fragment key={index}>
                                  <kbd className="px-2 py-1 bg-slate-900 border-b-2 border-slate-950 border-x border-t border-white/10 rounded text-[10px] font-mono text-emerald-400 font-black tracking-wide shadow-[0_2px_4px_rgba(0,0,0,0.3)] group-hover:border-emerald-500/20 group-hover:text-emerald-300 transition-colors min-w-[20px] text-center">
                                    {key}
                                  </kbd>
                                  {index < shortcut.keys.length - 1 && (
                                    <span className="text-slate-600 font-mono text-xs font-bold select-none">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[10px] text-slate-500 font-mono relative z-10">
              <span className="font-sans">Access keys conform to Section 508 & WAI-ARIA WCAG standard guidelines.</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Companion Hotkeys Active
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
