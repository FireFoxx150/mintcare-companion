import React from "react";
import { Sprout, Gauge, Terminal, ChevronRight, CheckCircle2, Lock } from "lucide-react";

export type UserLevel = "beginner" | "intermediate" | "advanced";

interface LevelCard {
  id: UserLevel;
  label: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  colour: string;         // Tailwind colour token (e.g. "emerald")
  included: string[];
  locked?: string[];      // features unlocked at higher levels
}

const LEVELS: LevelCard[] = [
  {
    id: "beginner",
    label: "Beginner",
    tagline: "Safe essentials only",
    description: "Get your system clean and up-to-date with guided, one-click tools. No technical knowledge required.",
    icon: Sprout,
    colour: "emerald",
    included: [
      "Dashboard Overview",
      "Cleanup Builder (cache, trash, thumbnails)",
      "Package Manager & Updates",
      "Power & Battery Monitor",
      "AI Helpdesk — ask anything",
      "System Logs (read-only view)",
    ],
    locked: ["Advanced tuning", "Kernel management", "Firewall", "Benchmarks", "Fan curves", "Backups"],
  },
  {
    id: "intermediate",
    label: "Intermediate",
    tagline: "More control, still safe",
    description: "Diagnose issues, manage network connections, tune audio and RAM, and keep your apps organised.",
    icon: Gauge,
    colour: "sky",
    included: [
      "Everything in Beginner",
      "Diagnostics & Audits Panel",
      "RAM & Swap Tuner",
      "Autostart App Manager",
      "APT Mirror Speed Test",
      "PPA & Sources Manager",
      "Audio / PipeWire Engine",
      "Display & Night Light",
      "Flatpak Sandbox Permissions",
      "Storage & SSD TRIM",
      "Hardware Sensors Monitor",
      "Network / Connection Monitor",
      "Task Explorer (process viewer)",
      "Maintenance Scheduler",
    ],
    locked: ["Kernel & Boot Optimizer", "Fan Control Curves", "UFW Firewall", "S.M.A.R.T. Benchmarks", "Backup Manager"],
  },
  {
    id: "advanced",
    label: "Advanced",
    tagline: "Full system control",
    description: "Every tool exposed. Manage your kernel, firewall, fan curves, SMART benchmarks, and automated rsync backups.",
    icon: Terminal,
    colour: "amber",
    included: [
      "Everything in Intermediate",
      "1-Click System Tuning Presets",
      "Kernel & Boot Optimizer",
      "Fan Control Curve Creator",
      "UFW Firewall Hardening",
      "S.M.A.R.T. Drive & Speed Benchmark",
      "rsync Backup Manager",
    ],
  },
];

const colourMap: Record<string, { bg: string; border: string; text: string; btn: string; badge: string }> = {
  emerald: {
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/60",
    text: "text-emerald-400",
    btn: "bg-emerald-500 hover:bg-emerald-400 text-black",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  sky: {
    bg: "bg-sky-950/40",
    border: "border-sky-500/60",
    text: "text-sky-400",
    btn: "bg-sky-500 hover:bg-sky-400 text-black",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  amber: {
    bg: "bg-amber-950/40",
    border: "border-amber-500/60",
    text: "text-amber-400",
    btn: "bg-amber-500 hover:bg-amber-400 text-black",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
};

interface Props {
  onSelect: (level: UserLevel) => void;
  current?: UserLevel;       // set when re-opening from settings
}

export default function UserLevelSelector({ onSelect, current }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#05070a]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-auto">
      {/* Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black text-2xl shadow-[0_0_24px_rgba(16,185,129,0.5)]">
            M
          </div>
          <h1 className="text-3xl font-black text-emerald-400 tracking-tight">MintCare Companion</h1>
        </div>
        <p className="text-slate-400 text-base max-w-xl mx-auto">
          {current ? "Change your experience level — you can switch any time." : "Choose your experience level. Every tool is safe to use; this just hides the more complex ones until you want them."}
        </p>
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
        {LEVELS.map((level) => {
          const c = colourMap[level.colour];
          const Icon = level.icon;
          const isCurrent = current === level.id;

          return (
            <div
              key={level.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col gap-4 transition-all
                ${isCurrent ? `${c.bg} ${c.border}` : "bg-slate-900/60 border-slate-800 hover:border-slate-600"}`}
            >
              {isCurrent && (
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>
                  CURRENT
                </span>
              )}

              {/* Icon + title */}
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg border ${c.bg} ${c.border}`}>
                  <Icon className={`h-5 w-5 ${c.text}`} />
                </span>
                <div>
                  <div className={`font-bold text-lg ${c.text}`}>{level.label}</div>
                  <div className="text-xs text-slate-400">{level.tagline}</div>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">{level.description}</p>

              {/* Included features */}
              <ul className="space-y-1.5 flex-1">
                {level.included.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${c.text}`} />
                    {f}
                  </li>
                ))}
                {level.locked?.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                    <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelect(level.id)}
                disabled={isCurrent}
                className={`mt-2 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default ${c.btn}`}
              >
                {isCurrent ? "Already selected" : `Start with ${level.label}`}
                {!isCurrent && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-slate-600 text-xs text-center">
        You can change your level at any time from the ⚙ icon in the header.
      </p>
    </div>
  );
}
