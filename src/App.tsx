import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Trash2, 
  HeartPulse, 
  Clock, 
  Activity, 
  Sparkles, 
  Server,
  Terminal,
  HelpCircle,
  HardDrive,
  Gauge,
  ShieldAlert,
  Cpu,
  Radio,
  Zap,
  Power,
  BatteryCharging,
  ShieldCheck,
  Lock,
  Database,
  Sun,
  Wind,
  Sliders,
  Globe,
  Volume2
} from "lucide-react";
import Dashboard from "./components/Dashboard.jsx";
import CleanupManager from "./components/CleanupManager.jsx";
import DiagnosticsPanel from "./components/DiagnosticsPanel.jsx";
import SchedulerDashboard from "./components/SchedulerDashboard.jsx";
import NetworkDiagnostics from "./components/NetworkDiagnostics.jsx";
import BackupManager from "./components/BackupManager.jsx";
import HardwareHealthPanel from "./components/HardwareHealthPanel.jsx";
import PackageManagerAudit from "./components/PackageManagerAudit.jsx";
import AiAssistant from "./components/AiAssistant.jsx";
import SystemLogs from "./components/SystemLogs.jsx";
import TaskExplorer from "./components/TaskExplorer.jsx";
import KernelBootManager from "./components/KernelBootManager";
import CinnamonDesktopManager from "./components/CinnamonDesktopManager";
import PowerManagementPanel from "./components/PowerManagementPanel";
import SecurityFirewallManager from "./components/SecurityFirewallManager";
import StorageMountManager from "./components/StorageMountManager";
import RamSwapManager from "./components/RamSwapManager";
import PpaRepoManager from "./components/PpaRepoManager";
import DisplayNightManager from "./components/DisplayNightManager";
import FlatpakSandboxManager from "./components/FlatpakSandboxManager";
import FanControlCurveCreator from "./components/FanControlCurveCreator";
import SystemTuningPresetManager from "./components/SystemTuningPresetManager";
import AptMirrorSpeedTester from "./components/AptMirrorSpeedTester";
import AudioPipewireManager from "./components/AudioPipewireManager";
import DiskSmartHealthBenchmark from "./components/DiskSmartHealthBenchmark";
import GlobalQuickActions from "./components/GlobalQuickActions";
import ShortcutsModal from "./components/ShortcutsModal";
import SystemDataConnectorModal from "./components/SystemDataConnectorModal";
import SystemHealthCheckupWizardModal from "./components/SystemHealthCheckupWizardModal";
import UserLevelSelector, { UserLevel } from "./components/UserLevelSelector";
import { SystemStats } from "./types.js";

// ── Tab-visibility per user level ──────────────────────────────────────────
const BEGINNER_TABS = new Set([
  "dashboard", "cleanup", "package-audit", "power", "logs", "assistant"
]);
const INTERMEDIATE_TABS = new Set([
  ...BEGINNER_TABS,
  "diagnostics", "ram-swap", "autostart", "apt-mirrors", "ppa",
  "audio-engine", "display", "flatpak", "mounts", "hardware",
  "network", "processes", "scheduler"
]);
// Advanced sees every tab (no filter applied)

function tabsForLevel(level: UserLevel): Set<string> | null {
  if (level === "beginner")      return BEGINNER_TABS;
  if (level === "intermediate")  return INTERMEDIATE_TABS;
  return null; // null = show all
}

type TabType = "dashboard" | "cleanup" | "diagnostics" | "tuning-preset" | "kernel-boot" | "autostart" | "power" | "fan-control" | "firewall" | "apt-mirrors" | "ppa" | "audio-engine" | "display" | "flatpak" | "mounts" | "smart-benchmark" | "ram-swap" | "hardware" | "package-audit" | "scheduler" | "backup" | "network" | "logs" | "processes" | "assistant";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [initialAssistantQuery, setInitialAssistantQuery] = useState<string>("");
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [isHealthCheckupOpen, setIsHealthCheckupOpen] = useState(false);
  const [dataSourceInfo, setDataSourceInfo] = useState<any>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  // User experience level
  const [userLevel, setUserLevel] = useState<UserLevel>(() =>
    (localStorage.getItem("mintcare-user-level") as UserLevel | null) || null as any
  );
  const [showLevelSelector, setShowLevelSelector] = useState<boolean>(!localStorage.getItem("mintcare-user-level"));

  const handleSelectLevel = (level: UserLevel) => {
    localStorage.setItem("mintcare-user-level", level);
    setUserLevel(level);
    setShowLevelSelector(false);
    // Reset to dashboard when changing level so no hidden tab stays active
    setActiveTab("dashboard");
  };
  const [theme, setTheme] = useState<'immersive-dark' | 'high-contrast'>(() => {
    const stored = localStorage.getItem("mintcare-theme");
    return (stored === 'high-contrast') ? 'high-contrast' : 'immersive-dark';
  });
  const [systemGtkTheme, setSystemGtkTheme] = useState<string>("Mint-Y-Dark");
  const [themeSource, setThemeSource] = useState<string>("Detecting system preference...");

  // Confirm backend is reachable on mount
  useEffect(() => {
    let attempts = 0;
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) { setBackendError(null); return; }
        setBackendError(`Backend returned HTTP ${res.status}`);
      } catch (e: any) {
        attempts++;
        if (attempts < 10) {
          setTimeout(check, 1500); // retry while server is still starting
        } else {
          setBackendError("Cannot reach the MintCare backend at http://localhost:3000. Make sure Node.js is installed (sudo apt install nodejs) and the app was installed via the .deb package.");
        }
      }
    };
    check();
  }, []);

  // Detect Linux Mint system-wide theme preference upon initial application load
  useEffect(() => {
    const fetchSystemTheme = async () => {
      try {
        const res = await fetch("/api/system/theme");
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme);
          setSystemGtkTheme(data.gtkTheme);
          setThemeSource(data.details);
        }
      } catch (err) {
        console.error("Failed to detect system-wide Linux Mint theme:", err);
      }
    };
    fetchSystemTheme();
  }, []);

  const fetchDataSource = async () => {
    try {
      const res = await fetch("/api/system/data-source");
      if (res.ok) {
        const data = await res.json();
        setDataSourceInfo(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchDataSource();
    const interval = setInterval(fetchDataSource, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("mintcare-theme", theme);
    const root = document.documentElement;
    if (theme === 'high-contrast') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [theme]);

  const handleAskAI = (query: string) => {
    setInitialAssistantQuery(query);
    setActiveTab("assistant");
  };

  const fetchSystemStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/system/stats");
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch system stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
    
    // Listen for system updates from quick actions
    const handleSystemUpdate = () => {
      fetchSystemStats();
    };
    window.addEventListener("system-updated", handleSystemUpdate);

    // Poll stats every 15 seconds to keep dashboard dials active
    const interval = setInterval(fetchSystemStats, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("system-updated", handleSystemUpdate);
    };
  }, []);

  // Global Keyboard Shortcuts Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in form elements
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toUpperCase();
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          activeEl.hasAttribute("contenteditable") ||
          (activeEl as HTMLElement).isContentEditable
        ) {
          // Allow Escape to dismiss search boxes or blur focus
          if (e.key === "Escape") {
            setIsShortcutsOpen(false);
            if (activeEl instanceof HTMLElement) {
              activeEl.blur();
            }
          }
          return;
        }
      }

      // 1. Accessibility Shortcut: '?' (Shift + /) toggles the shortcuts helper
      if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      // 2. Dismiss Modal: Escape closes shortcuts modal
      if (e.key === "Escape") {
        setIsShortcutsOpen(false);
        return;
      }

      // 3. Accessibility Theme Trigger: Alt+T toggles standard theme to high contrast
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setTheme(prev => prev === "immersive-dark" ? "high-contrast" : "immersive-dark");
        return;
      }

      // 4. Ctrl/Meta key accelerators
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();

      // Ctrl + Shift + L -> Direct Logs Jump
      if (e.shiftKey && key === "l") {
        e.preventDefault();
        setActiveTab("logs");
        return;
      }

      // Ctrl + Shift + E -> Direct Task Explorer Jump
      if (e.shiftKey && key === "e") {
        e.preventDefault();
        setActiveTab("processes");
        return;
      }

      if (key === "d") {
        e.preventDefault();
        setActiveTab("dashboard");
      } else if (key === "a" || key === "k") {
        e.preventDefault();
        setActiveTab("assistant");
        
        // Wait for the tab to switch and the component to mount, then focus the input
        setTimeout(() => {
          const chatInput = document.getElementById("chat-input-field") as HTMLInputElement | null;
          if (chatInput) {
            chatInput.focus();
            chatInput.select();
          }
        }, 80);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const allNavItems = [
    { id: "dashboard",      label: "Dashboard Overview",          icon: LayoutDashboard, shortcut: "Ctrl+D" },
    { id: "cleanup",        label: "Mint Cleanup Builder",         icon: Trash2 },
    { id: "diagnostics",    label: "Diagnostics & Audits",         icon: HeartPulse },
    { id: "tuning-preset",  label: "1-Click System Tuning",        icon: Sliders },
    { id: "kernel-boot",    label: "Kernel & Boot Optimizer",      icon: Zap },
    { id: "ram-swap",       label: "RAM & Swappiness Control",     icon: Database },
    { id: "autostart",      label: "Autostart Apps",               icon: Power },
    { id: "power",          label: "Power & Battery Health",       icon: BatteryCharging },
    { id: "fan-control",    label: "Fan Control & Curve",          icon: Wind },
    { id: "firewall",       label: "UFW Firewall Hardening",       icon: ShieldCheck },
    { id: "apt-mirrors",    label: "APT Mirrors Speed Test",       icon: Globe },
    { id: "ppa",            label: "APT PPAs & Sources",           icon: Server },
    { id: "audio-engine",   label: "PipeWire & Sound Engine",      icon: Volume2 },
    { id: "display",        label: "Display & Redshift",           icon: Sun },
    { id: "flatpak",        label: "Flatpak Sandbox Permissions",  icon: ShieldAlert },
    { id: "mounts",         label: "Storage & SSD TRIM",           icon: HardDrive },
    { id: "smart-benchmark",label: "S.M.A.R.T. & Speed Test",      icon: HardDrive },
    { id: "hardware",       label: "Hardware Sensors",             icon: Gauge },
    { id: "processes",      label: "Task Explorer",                icon: Cpu, shortcut: "Ctrl+Shift+E" },
    { id: "package-audit",  label: "Package Manager Audit",        icon: ShieldAlert },
    { id: "scheduler",      label: "Maintenance Scheduler",        icon: Clock },
    { id: "backup",         label: "rsync Backup Manager",         icon: Server },
    { id: "network",        label: "Connection Monitor",           icon: Activity },
    { id: "logs",           label: "System Logs Terminal",         icon: Terminal, shortcut: "Ctrl+Shift+L" },
    { id: "assistant",      label: "Mint AI Helpdesk",             icon: Sparkles, shortcut: "Ctrl+A" },
  ];

  const allowedTabs = tabsForLevel(userLevel);
  const navItems = allowedTabs ? allNavItems.filter(item => allowedTabs.has(item.id)) : allNavItems;

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-300 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">

      {/* First-launch level selector (also used when re-opening from header) */}
      {showLevelSelector && (
        <UserLevelSelector
          onSelect={handleSelectLevel}
          current={userLevel}
        />
      )}

      {/* Backend error banner */}
      {backendError && (
        <div className="sticky top-0 z-[9999] bg-red-950 border-b border-red-500/50 px-6 py-3 flex items-start gap-3 text-sm">
          <span className="text-red-400 font-bold shrink-0">⚠ Backend offline:</span>
          <span className="text-red-300">{backendError}</span>
          <button onClick={() => window.location.reload()} className="ml-auto shrink-0 px-3 py-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded text-red-300 text-xs cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Top Immersive Header Bar */}
      <header className="border-b border-emerald-900/30 bg-[#080c12]/80 backdrop-blur-md px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              M
            </div>
            <div>
              <h1 className="font-sans font-bold text-emerald-400 text-lg tracking-tight">MintCare Companion Center</h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wide uppercase">Linux Mint System Diagnostic & Administration Portal</p>
            </div>
          </div>
          
          {/* Diagnostic Info Tickers */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">System Hostname</div>
              <div className="text-emerald-100 font-semibold">{dataSourceInfo?.hostname || systemStats?.hostname || "linux-mint-companion"}</div>
            </div>
            <div className="hidden sm:block w-px h-6 bg-emerald-900/30"></div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Kernel Version</div>
              <div className="text-emerald-100 font-semibold">{dataSourceInfo?.kernel || systemStats?.release || "6.8.0-31-generic"}</div>
            </div>
            <div className="hidden sm:block w-px h-6 bg-emerald-900/30"></div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">System Data Source</div>
              <button
                onClick={() => setIsConnectorOpen(true)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  dataSourceInfo?.mode === "native"
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900"
                    : dataSourceInfo?.mode === "agent"
                    ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900"
                    : "bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900"
                }`}
                title="Click to view Linux Mint System Data Connector & Agent Setup"
              >
                <span className={`w-2 h-2 rounded-full ${
                  dataSourceInfo?.mode === "native" ? "bg-emerald-400 animate-pulse" : dataSourceInfo?.mode === "agent" ? "bg-cyan-400 animate-pulse" : "bg-amber-400"
                }`}></span>
                {dataSourceInfo?.mode === "native" && "🟢 Native Linux Mint Host"}
                {dataSourceInfo?.mode === "agent" && "📡 Live Agent Synced"}
                {dataSourceInfo?.mode === "sandbox" && "Connect Real Mint Machine"}
              </button>
            </div>
            <div className="hidden sm:block w-px h-6 bg-emerald-900/30"></div>
            {/* User Level badge */}
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Experience Level</div>
              <button
                onClick={() => setShowLevelSelector(true)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  userLevel === "beginner"     ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/60" :
                  userLevel === "intermediate" ? "text-sky-400 border-sky-500/50 bg-sky-950/60" :
                  userLevel === "advanced"     ? "text-amber-400 border-amber-500/50 bg-amber-950/60" :
                  "text-slate-400 border-slate-700 bg-slate-900"
                }`}
                title="Change experience level"
              >
                {userLevel === "beginner"     && "🌱 Beginner"}
                {userLevel === "intermediate" && "⚙ Intermediate"}
                {userLevel === "advanced"     && "🔧 Advanced"}
                {!userLevel                   && "Select Level"}
                <span className="opacity-50 text-[9px] ml-1">· change</span>
              </button>
            </div>
            <div className="hidden sm:block w-px h-6 bg-emerald-900/30"></div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex justify-between items-center w-full gap-2">
                <span>Console Theme</span>
                <span className="text-emerald-400 font-mono font-normal flex items-center gap-1" title={themeSource}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  Mint GTK: <strong className="text-emerald-200">{systemGtkTheme}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#05070a] border border-emerald-900/40 rounded-lg p-0.5 gap-0.5" id="theme-switch-container">
                  <button
                    onClick={() => setTheme("immersive-dark")}
                    className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wide font-bold transition-all cursor-pointer ${
                      theme === "immersive-dark"
                        ? "bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Switch to Immersive Dark Theme"
                    id="btn-theme-immersive"
                  >
                    Immersive Dark
                  </button>
                  <button
                    onClick={() => setTheme("high-contrast")}
                    className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wide font-bold transition-all cursor-pointer ${
                      theme === "high-contrast"
                        ? "bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Switch to High Contrast Accessibility Theme"
                    id="btn-theme-high-contrast"
                  >
                    High Contrast
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Side Navigation Rail - Immersive Styled */}
        <aside className="w-full lg:w-64 bg-[#080c12] border border-emerald-900/30 rounded-xl p-3 shadow-md space-y-1 lg:sticky lg:top-6 shrink-0">
          <div className="px-3 py-2 border-b border-emerald-900/20 mb-2">
            <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest font-mono">Management Menu</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full py-2.5 px-3.5 rounded-lg flex items-center justify-between transition-all text-xs font-semibold cursor-pointer ${
                    isActive
                      ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                      : "text-slate-400 hover:text-emerald-300 hover:bg-white/5"
                  }`}
                  id={`nav-tab-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <kbd className="hidden xl:inline-block px-1.5 py-0.5 bg-[#05070a]/80 border border-white/10 rounded text-[9px] font-mono text-slate-500 font-bold tracking-wider">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}
          </nav>
          
          <div className="border-t border-emerald-900/20 pt-3 mt-4 px-3 text-[11px] leading-relaxed text-slate-500 font-sans space-y-3">
            <div>
              <p className="font-semibold text-emerald-500/80 mb-1 flex items-center gap-1">
                <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                Administrative Warning:
              </p>
              <p className="leading-normal">
                Always make sure to verify commands before triggering them on production Linux Mint environments.
              </p>
            </div>

            {/* Global Keyboard Navigation Legend */}
            <div className="border border-emerald-500/10 bg-[#05070a]/40 p-2.5 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Keyboard Shortcuts</span>
                <kbd className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[9px] font-mono font-bold text-emerald-400 animate-pulse">?</kbd>
              </div>
              <div className="space-y-1 text-[10px] text-slate-400 font-mono">
                <div className="flex justify-between items-center">
                  <span>Dashboard:</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded text-[9px] font-bold text-emerald-300">Ctrl+D</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>AI Helpdesk:</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded text-[9px] font-bold text-emerald-300">Ctrl+A</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Interactive Portal:</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded text-[9px] font-bold text-emerald-300">?</kbd>
                </div>
              </div>
              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="w-full mt-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                id="sidebar-shortcuts-btn"
              >
                <HelpCircle className="h-3 w-3" />
                Show All Shortcuts (?)
              </button>
            </div>
          </div>
        </aside>

        {/* Right Active Dynamic Content Panel */}
        <section className="flex-1 w-full min-w-0" id="active-panel-container">
          {activeTab === "dashboard" && (
            <Dashboard 
              stats={systemStats} 
              loading={loadingStats} 
              onRefresh={fetchSystemStats} 
              onAskAI={handleAskAI}
              onOpenHealthWizard={() => setIsHealthCheckupOpen(true)}
            />
          )}
          {activeTab === "cleanup" && <CleanupManager systemStats={systemStats} onAskAI={handleAskAI} />}
          {activeTab === "diagnostics" && <DiagnosticsPanel systemStats={systemStats} onAskAI={handleAskAI} />}
          {activeTab === "tuning-preset" && <SystemTuningPresetManager onAskAI={handleAskAI} />}
          {activeTab === "kernel-boot" && <KernelBootManager onAskAI={handleAskAI} />}
          {activeTab === "ram-swap" && <RamSwapManager />}
          {activeTab === "autostart" && <CinnamonDesktopManager />}
          {activeTab === "power" && <PowerManagementPanel />}
          {activeTab === "fan-control" && <FanControlCurveCreator onAskAI={handleAskAI} />}
          {activeTab === "firewall" && <SecurityFirewallManager />}
          {activeTab === "apt-mirrors" && <AptMirrorSpeedTester onAskAI={handleAskAI} />}
          {activeTab === "ppa" && <PpaRepoManager />}
          {activeTab === "audio-engine" && <AudioPipewireManager onAskAI={handleAskAI} />}
          {activeTab === "display" && <DisplayNightManager />}
          {activeTab === "flatpak" && <FlatpakSandboxManager />}
          {activeTab === "mounts" && <StorageMountManager />}
          {activeTab === "smart-benchmark" && <DiskSmartHealthBenchmark onAskAI={handleAskAI} />}
          {activeTab === "hardware" && <HardwareHealthPanel onAskAI={handleAskAI} />}
          {activeTab === "package-audit" && <PackageManagerAudit onAskAI={handleAskAI} />}
          {activeTab === "scheduler" && <SchedulerDashboard />}
          {activeTab === "backup" && <BackupManager onAskAI={handleAskAI} />}
          {activeTab === "network" && <NetworkDiagnostics onAskAI={handleAskAI} />}
          {activeTab === "logs" && <SystemLogs onAskAI={handleAskAI} />}
          {activeTab === "processes" && <TaskExplorer onAskAI={handleAskAI} />}
          {activeTab === "assistant" && (
            <AiAssistant 
              initialQuery={initialAssistantQuery} 
              clearInitialQuery={() => setInitialAssistantQuery("")} 
            />
          )}
        </section>

      </main>

      {/* Footer bar */}
      <footer className="bg-[#080c12] border-t border-emerald-900/20 py-4 px-6 text-center text-[10px] text-slate-500 shrink-0 font-mono mt-auto tracking-wider">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SYSTEM CONTROL INTERFACE V4.2 // L-MINT-STABLE</span>
          <span>© 2026 MINTCARE COMPANION. ALL RIGHTS RESERVED.</span>
        </div>
      </footer>

      {/* Global Quick Actions Floating Menu */}
      <GlobalQuickActions />

      {/* Global Interactive Keyboard Shortcuts Modal */}
      <ShortcutsModal 
        isOpen={isShortcutsOpen} 
        onClose={() => setIsShortcutsOpen(false)} 
        onSelectTab={setActiveTab}
        onToggleTheme={() => setTheme(prev => prev === "immersive-dark" ? "high-contrast" : "immersive-dark")}
        currentTheme={theme}
      />

      {/* Linux Mint System Data Connector & Agent Setup Modal */}
      <SystemDataConnectorModal
        isOpen={isConnectorOpen}
        onClose={() => setIsConnectorOpen(false)}
        onRefreshStats={fetchSystemStats}
      />

      {/* 1-Click System Health Checkup Wizard Modal */}
      <SystemHealthCheckupWizardModal
        isOpen={isHealthCheckupOpen}
        onClose={() => setIsHealthCheckupOpen(false)}
        onAskAI={handleAskAI}
      />
    </div>
  );
}
