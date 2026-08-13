import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  HardDrive, 
  FolderPlus, 
  Trash2, 
  Settings, 
  Play, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  Check, 
  Loader2, 
  ShieldCheck,
  Folder,
  Sliders,
  Database,
  History,
  RotateCcw,
  Info,
  ShieldAlert
} from "lucide-react";
import { BackupSource, BackupSettings, BackupHistoryEntry, TimeshiftSnapshot } from "../types";

interface BackupManagerProps {
  onAskAI?: (query: string) => void;
}

export default function BackupManager({ onAskAI }: BackupManagerProps) {
  const [sources, setSources] = useState<BackupSource[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  
  // Tab toggler: directory backups vs system restore points (Timeshift)
  const [backupSubTab, setBackupSubTab] = useState<"rsync" | "timeshift">("rsync");
  const [timeshiftSnapshots, setTimeshiftSnapshots] = useState<TimeshiftSnapshot[]>([]);
  const [loadingTimeshift, setLoadingTimeshift] = useState(false);
  const [isCreatingTimeshift, setIsCreatingTimeshift] = useState(false);
  const [timeshiftComment, setTimeshiftComment] = useState("");
  const [timeshiftLogs, setTimeshiftLogs] = useState("");
  const [isRestoringTimeshift, setIsRestoringTimeshift] = useState<string | null>(null);
  const [timeshiftModalOpen, setTimeshiftModalOpen] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  // Loading states
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);


  // Form states for adding new source
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourcePath, setNewSourcePath] = useState("");
  const [newSourceSize, setNewSourceSize] = useState("150");
  const [showAddForm, setShowAddForm] = useState(false);

  // Execution run logs
  const [consoleLogs, setConsoleLogs] = useState<string>("");
  const [activeSnapshot, setActiveSnapshot] = useState<BackupHistoryEntry | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  const fetchSources = async () => {
    setLoadingSources(true);
    try {
      const res = await fetch("/api/backup/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (err) {
      console.error("Failed to fetch backup sources:", err);
    } finally {
      setLoadingSources(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/backup/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch backup settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/backup/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch backup history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchTimeshiftSnapshots = async () => {
    setLoadingTimeshift(true);
    try {
      const res = await fetch("/api/timeshift/snapshots");
      if (res.ok) {
        const data = await res.json();
        setTimeshiftSnapshots(data);
      }
    } catch (err) {
      console.error("Failed to fetch Timeshift snapshots:", err);
    } finally {
      setLoadingTimeshift(false);
    }
  };

  const handleCreateTimeshiftSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTimeshift(true);
    setTimeshiftLogs("timeshift@system:~$ sudo timeshift --create --comments '" + (timeshiftComment || "On-demand user snapshot") + "'\n");
    
    await new Promise(r => setTimeout(r, 600));
    setTimeshiftLogs(prev => prev + "Using system device: /dev/sda2\n");
    await new Promise(r => setTimeout(r, 600));
    setTimeshiftLogs(prev => prev + "Mounted /dev/sda2 at /timeshift\n");
    await new Promise(r => setTimeout(r, 700));
    setTimeshiftLogs(prev => prev + "Creating rsync system restore point...\n");
    
    for (let pct = 10; pct <= 100; pct += 15) {
      setTimeshiftLogs(prev => prev + `Copying system files: ${Math.min(pct, 100)}% complete...\n`);
      await new Promise(r => setTimeout(r, 300));
    }

    try {
      const res = await fetch("/api/timeshift/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: timeshiftComment })
      });
      if (res.ok) {
        const data = await res.json();
        setTimeshiftSnapshots(prev => [data, ...prev]);
        setTimeshiftComment("");
        setTimeshiftLogs(prev => prev + `\n[SUCCESS] Timeshift snapshot '${data.name}' committed. Restoration tag: {O}.\n`);
      }
    } catch (err) {
      console.error("Failed to create Timeshift snapshot:", err);
      setTimeshiftLogs(prev => prev + "\n[ERROR] Snapshot execution thread failed.\n");
    } finally {
      setIsCreatingTimeshift(false);
    }
  };

  const handleDeleteTimeshiftSnapshot = async (id: string) => {
    try {
      const res = await fetch(`/api/timeshift/snapshots/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setTimeshiftSnapshots(prev => prev.filter(ts => ts.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete Timeshift snapshot:", err);
    }
  };

  const handleRestoreTimeshiftSnapshot = async (id: string, name: string) => {
    setIsRestoringTimeshift(id);
    setRestoreProgress(5);
    setTimeshiftModalOpen(true);
    
    const steps = [15, 35, 55, 75, 95, 100];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 600));
      setRestoreProgress(step);
    }

    try {
      const res = await fetch(`/api/timeshift/restore/${id}`, {
        method: "POST"
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("system-updated"));
      }
    } catch (err) {
      console.error("Failed to restore Timeshift snapshot:", err);
    } finally {
      setIsRestoringTimeshift(null);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchSettings();
    fetchHistory();
    fetchTimeshiftSnapshots();
  }, []);

  // Scroll to bottom of terminal when logs change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const handleToggleSource = async (id: string) => {
    try {
      const res = await fetch("/api/backup/sources/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const updated = await res.json();
        setSources(prev => prev.map(s => s.id === id ? updated : s));
      }
    } catch (err) {
      console.error("Failed to toggle backup source:", err);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourcePath) return;

    try {
      const res = await fetch("/api/backup/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSourceName,
          path: newSourcePath,
          estimatedSizeMb: parseInt(newSourceSize, 10) || 50
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSources(prev => [...prev, data]);
        setNewSourceName("");
        setNewSourcePath("");
        setNewSourceSize("150");
        setShowAddForm(false);
      }
    } catch (err) {
      console.error("Failed to add backup source:", err);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/backup/sources/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSources(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete backup source:", err);
    }
  };

  const handleSaveSettings = async (updates: Partial<BackupSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings); // Optimistic UI update

    try {
      const res = await fetch("/api/backup/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const saved = await res.json();
        setSettings(saved);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      fetchSettings(); // Revert on failure
    }
  };

  const handleRunBackup = async () => {
    setIsBackingUp(true);
    setConsoleLogs("");
    setActiveSnapshot(null);

    // Initial terminal command invocation
    const dryRunStr = settings?.dryRun ? " --dry-run" : "";
    setConsoleLogs(`mintcare@system:~$ rsync -avz${dryRunStr} --progress --delete /home/user/Documents ${settings?.destinationPath}/snapshots/\n`);

    // Terminal print speeds for realistic UI response
    await new Promise(resolve => setTimeout(resolve, 800));
    setConsoleLogs(prev => prev + "sending incremental file list\n");

    try {
      const res = await fetch("/api/backup/run", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        
        // Stagger terminal lines output
        const logLines = data.consoleLogs.split("\n");
        let currentLogs = `mintcare@system:~$ rsync -avz${dryRunStr} --progress --delete ${settings?.destinationPath}/snapshots/\n`;
        
        for (let i = 0; i < logLines.length; i++) {
          if (logLines[i].startsWith("mintcare@system:~$")) continue; // Skip redundant command log line
          currentLogs += logLines[i] + "\n";
          setConsoleLogs(currentLogs);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        setActiveSnapshot(data.entry);
        setHistory(prev => [data.entry, ...prev]);
      } else {
        const errData = await res.json();
        setConsoleLogs(prev => prev + `\nrsync: connection failure. error: ${errData.error || "Execution terminated"}\n`);
      }
    } catch (err) {
      console.error("Backup execution failed:", err);
      setConsoleLogs(prev => prev + "\n[ERROR] Connection timeout while executing backup snapshot daemon.\n");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (history.length === 0) return;
    setIsVerifying(true);
    setConsoleLogs("");

    const dest = settings?.destinationPath || "/var/backups/mintcare";
    setConsoleLogs(`mintcare@system:~$ sudo rsync --dry-run --archive --checksum --itemize-changes ${dest}/\n` +
                   `[ADMIN] Spawning cryptographic byte checksum scanner on target repository: '${dest}'\n` +
                   `Initializing signature audit loops...\n`);
    await new Promise(r => setTimeout(r, 650));

    try {
      const res = await fetch("/api/backup/verify", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const logLines = data.logs.split("\n");
        let currentLogs = "";
        
        for (let i = 0; i < logLines.length; i++) {
          currentLogs += logLines[i] + "\n";
          setConsoleLogs(currentLogs);
          await new Promise(r => setTimeout(r, 100));
        }

        // Refresh snapshot history list to capture new verified property
        fetchHistory();
        if (activeSnapshot) {
          setActiveSnapshot(prev => prev ? { ...prev, verified: true, integrityScore: 100 } : null);
        }
      } else {
        const errData = await res.json();
        setConsoleLogs(prev => prev + `\nrsync: integrity mismatch. error: ${errData.error || "Verification aborted"}\n`);
      }
    } catch (err) {
      console.error("Backup snapshot integrity verification failed:", err);
      setConsoleLogs(prev => prev + "\n[ERROR] Connection timeout during verification sweep.\n");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/backup/history/clear", { method: "POST" });
      if (res.ok) {
        setHistory([]);
        setActiveSnapshot(null);
      }
    } catch (err) {
      console.error("Failed to clear snapshot logs:", err);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const enabledSizeTotal = sources
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + s.estimatedSizeMb, 0);

  return (
    <div className="space-y-6">
      
      {/* Backup Tab Switcher */}
      <div className="flex border-b border-white/5 pb-px gap-2">
        <button
          onClick={() => setBackupSubTab("rsync")}
          className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all rounded-t-lg border-b-2 font-mono flex items-center gap-2 cursor-pointer ${
            backupSubTab === "rsync" 
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          Directory Sync (Rsync)
        </button>
        <button
          onClick={() => setBackupSubTab("timeshift")}
          className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all rounded-t-lg border-b-2 font-mono flex items-center gap-2 cursor-pointer ${
            backupSubTab === "timeshift" 
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Timeshift System Restore
        </button>
      </div>

      {backupSubTab === "rsync" ? (
        <>
          {/* Upper Dashboard Meta Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        
        {/* Source Directories Setup Card */}
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <Folder className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100">Backup Scope Directories</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Define physical folders containing documents, themes, or system configs.</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Add Scope
            </button>
          </div>

          {/* Add Form Dropdown */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddSource}
                className="bg-[#05070a]/60 border border-emerald-950/40 rounded-lg p-4 space-y-3 font-sans overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Scope Label Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My Documents"
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      className="w-full bg-[#030508] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500/35"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Absolute Linux Filepath</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /home/user/Documents"
                      value={newSourcePath}
                      onChange={(e) => setNewSourcePath(e.target.value)}
                      className="w-full bg-[#030508] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500/35 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Estimated Folder Size (MB)</label>
                    <input
                      type="number"
                      placeholder="150"
                      value={newSourceSize}
                      onChange={(e) => setNewSourceSize(e.target.value)}
                      className="w-20 bg-[#030508] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none text-center font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded font-bold text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs rounded font-bold cursor-pointer"
                    >
                      Save Scope
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Directory Scope Rows */}
          <div className="space-y-2.5">
            {sources.map((src) => (
              <div 
                key={src.id}
                className={`p-3 rounded-lg border flex items-center justify-between gap-4 transition-all bg-[#05070a]/40 ${
                  src.enabled 
                    ? "border-emerald-950 hover:border-emerald-500/10" 
                    : "border-white/5 opacity-50 hover:opacity-80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={src.enabled}
                    onChange={() => handleToggleSource(src.id)}
                    className="h-3.5 w-3.5 accent-emerald-500 rounded border-white/10 bg-[#030508] cursor-pointer"
                    id={`toggle-src-${src.id}`}
                  />
                  <div className="min-w-0 font-mono">
                    <h4 className="font-sans font-bold text-xs text-slate-200 truncate flex items-center gap-2">
                      {src.name}
                    </h4>
                    <code className="text-[10px] text-slate-500 truncate block select-all">{src.path}</code>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-white/5">
                    ~{src.estimatedSizeMb} MB
                  </span>
                  <button
                    onClick={() => handleDeleteSource(src.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-red-500/5 transition-all cursor-pointer"
                    title="Remove folder path scope"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5 font-mono text-[10px] tracking-wide text-slate-500">
            <span>TOTAL ENABLED TARGET POOL:</span>
            <span className="font-bold text-emerald-400">~{enabledSizeTotal} MB ({sources.filter(s => s.enabled).length} Paths)</span>
          </div>
        </div>

        {/* Global Rsync/Snapshot Settings Card */}
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100">Backup Options</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Configure snapshot destinations & schedules.</p>
              </div>
            </div>

            {settings && (
              <div className="space-y-3.5 text-xs font-sans">
                {/* Destination directory input */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Backup Storage Path</label>
                  <input
                    type="text"
                    value={settings.destinationPath}
                    onChange={(e) => handleSaveSettings({ destinationPath: e.target.value })}
                    className="w-full bg-[#030508] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-emerald-500/35"
                    placeholder="/media/user/MintBackup_External"
                  />
                </div>

                {/* Schedule frequency dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Automated Cron Schedule</label>
                  <select
                    value={settings.schedule}
                    onChange={(e) => handleSaveSettings({ schedule: e.target.value as any })}
                    className="w-full bg-[#030508] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-500/35 font-mono"
                  >
                    <option value="manual">Manual Snapshot Only</option>
                    <option value="daily">Daily Cron Task</option>
                    <option value="weekly">Weekly Sunday Sweep</option>
                    <option value="monthly">Monthly Full Mirror</option>
                  </select>
                </div>

                {/* Sliders Toggles options */}
                <div className="space-y-2.5 pt-2 border-t border-white/5 font-mono text-[10px]">
                  
                  {/* Dry run */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">RSYNC DRY RUN OPTION:</span>
                    <input
                      type="checkbox"
                      checked={settings.dryRun}
                      onChange={(e) => handleSaveSettings({ dryRun: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer h-3.5 w-3.5"
                    />
                  </div>

                  {/* Compress */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">LZW DATA COMPRESSION (-z):</span>
                    <input
                      type="checkbox"
                      checked={settings.compress}
                      onChange={(e) => handleSaveSettings({ compress: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer h-3.5 w-3.5"
                    />
                  </div>

                  {/* Exclude hidden */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">EXCLUDE HIDDEN DOTFILES:</span>
                    <input
                      type="checkbox"
                      checked={settings.excludeHidden}
                      onChange={(e) => handleSaveSettings({ excludeHidden: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer h-3.5 w-3.5"
                    />
                  </div>

                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={handleRunBackup}
              disabled={isBackingUp || sources.filter(s => s.enabled).length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  Running Rsync Sync...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-black" />
                  Commit Rsync Snapshot Now
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Center Console rsync output screen */}
      <div className="bg-[#070b10] text-slate-200 rounded-xl border border-white/5 p-5 shadow-lg font-mono space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block"></span>
            </div>
            <span className="text-xs text-slate-400 ml-2 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Terminal className="h-4 w-4 text-emerald-400" />
              rsync-session@backup-engine:~
            </span>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
            RSYNC CONSOLE TERMINAL
          </span>
        </div>

        <div className="bg-[#030508] p-4 rounded-lg border border-white/5 min-h-36 max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar">
          {consoleLogs ? (
            <pre className="whitespace-pre-wrap text-emerald-400 font-mono font-medium">{consoleLogs}</pre>
          ) : (
            <div className="text-slate-600 flex flex-col items-center justify-center py-6 text-center space-y-1 select-none">
              <Terminal className="h-6 w-6 text-slate-700 stroke-1" />
              <p>Rsync terminal logs are currently idle.</p>
              <p className="text-[10px]">Trigger "Commit Rsync Snapshot Now" above to monitor dynamic delta copying.</p>
            </div>
          )}
          <div ref={logsEndRef}></div>
        </div>

        {activeSnapshot && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-sans"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-400 font-mono">rsync synchronization complete!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Snapshot Name: <span className="text-slate-300 font-mono font-bold">{activeSnapshot.snapshotName}</span></p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono">
              <div>
                <span className="text-slate-500 block">COPIED FILES:</span>
                <span className="font-bold text-slate-300 block">{activeSnapshot.copiedFilesCount} Files</span>
              </div>
              <div>
                <span className="text-slate-500 block">PAYLOAD COPIED:</span>
                <span className="font-bold text-slate-300 block">{formatBytes(activeSnapshot.copiedBytes)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ELAPSED:</span>
                <span className="font-bold text-slate-300 block">{(activeSnapshot.durationMs / 1000).toFixed(2)}s</span>
              </div>
              <div className="border-l border-white/5 pl-4 flex items-center h-8">
                {activeSnapshot.verified ? (
                  <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-1 rounded font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Verified Integrity 100%
                  </span>
                ) : (
                  <button
                    onClick={handleVerifyIntegrity}
                    disabled={isVerifying}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-black font-bold uppercase text-[9px] tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 font-sans"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Verify Integrity
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Snapshot History Grid & Audit Log */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100">Backup Snapshot & Rsync History</h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Audit log of system times, success status, and storage space utilized or recovered by each run.</p>
            </div>
          </div>

          <button
            onClick={handleClearHistory}
            disabled={history.length === 0}
            className="px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 bg-transparent border border-white/5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear History
          </button>
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto pr-1">
            {history.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs font-sans border-b border-white/5 last:border-b-0">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-200 font-bold text-[13px] truncate select-all">{item.snapshotName}</span>
                    
                    {/* Status Badge */}
                    {item.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        SUCCESS
                      </span>
                    ) : item.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                        <AlertCircle className="h-3 w-3 text-red-400" />
                        FAILED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 animate-pulse">
                        <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                        RUNNING
                      </span>
                    )}

                    {item.isDryRun && (
                      <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                        DRY RUN
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="text-slate-400 truncate max-w-sm sm:max-w-md lg:max-w-xl block" title={item.logSummary}>{item.logSummary}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0 font-mono text-[10px] text-slate-400 bg-[#05070a]/40 p-2.5 rounded-lg border border-white/5">
                  <div className="text-right">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-wider font-bold">Files Copied</span>
                    <span className="font-bold text-slate-300">{item.copiedFilesCount}</span>
                  </div>
                  
                  <div className="h-6 w-px bg-white/5"></div>

                  <div className="text-right">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-wider font-bold">Space Utilized</span>
                    <span className={`font-bold ${item.status === 'failed' ? 'text-slate-600' : 'text-emerald-400'}`}>
                      {item.status === 'failed' ? '--' : formatBytes(item.spaceUtilizedBytes ?? item.copiedBytes)}
                    </span>
                  </div>

                  <div className="h-6 w-px bg-white/5"></div>

                  <div className="text-right">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-wider font-bold">Space Recovered</span>
                    <span className={`font-bold ${item.status === 'failed' ? 'text-slate-600' : 'text-cyan-400'}`}>
                      {item.status === 'failed' ? '--' : formatBytes(item.spaceRecoveredBytes ?? 0)}
                    </span>
                  </div>

                  <div className="h-6 w-px bg-white/5"></div>

                  <div className="text-right">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-wider font-bold">Duration</span>
                    <span className="font-bold text-slate-300">{(item.durationMs / 1000).toFixed(1)}s</span>
                  </div>

                  <div className="h-6 w-px bg-white/5"></div>

                  <div className="text-right">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-wider font-bold">Integrity Audit</span>
                    {item.verified ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1 font-sans text-[9px] uppercase tracking-wide">
                        <ShieldCheck className="h-3 w-3 inline-block" />
                        Verified
                      </span>
                    ) : (
                      <button
                        onClick={handleVerifyIntegrity}
                        disabled={isVerifying}
                        className="text-amber-400 hover:text-amber-300 transition-all cursor-pointer font-bold text-[9px] uppercase tracking-wider underline block text-right outline-none bg-transparent border-none"
                      >
                        Unverified
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-600 flex flex-col items-center justify-center py-8 text-center space-y-1.5 select-none font-sans text-xs">
            <Clock className="h-7 w-7 text-slate-700 stroke-1" />
            <p className="font-bold text-slate-500">No backup runs are logged yet.</p>
            <p className="text-slate-600">Sync is offline. Push your first incremental run to log a snapshot trace.</p>
          </div>
        )}
      </div>

      {/* AI Troubleshooting panel for Backup Restorations */}
      {onAskAI && (
        <div className="bg-[#0c121a] text-slate-200 rounded-xl border border-emerald-900/30 p-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] select-none pointer-events-none">
            <Database className="h-28 w-28 text-emerald-400" />
          </div>

          <div className="space-y-4 max-w-2xl relative z-10 font-sans">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-sm tracking-tight text-slate-100">Consult MintCare AI for Rsync & Recovery</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Do you need help configuring advanced rsync exclusions (like excluding `.git` or `.node_modules` folders)? Or do you want a guided terminal command script to restore files from a previously backed-up snapshot? Ask MintCare.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => onAskAI("How do I write an advanced rsync backup command that ignores large system subfolders like node_modules, cache directories, and virtual environments, and logs all progress to a file called /var/log/mintcare-rsync.log?")}
                className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Advanced Rsync Excludes
              </button>
              
              <button
                onClick={() => onAskAI("I need to restore my Documents directory from a snapshot located at /media/user/MintBackup_External/snapshots/mintcare_backup_20260708_142210/. What are the exact rsync or cp terminal commands to restore my files safely without overwriting newer revisions?")}
                className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                File Recovery & Restoration Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  ) : (
        <div className="space-y-6 animate-fadeIn">
          {/* Timeshift Overview banner */}
          <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="font-sans font-bold text-sm text-slate-100 flex items-center gap-2">
                  Timeshift Restore Points
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Timeshift protects your system by taking incremental snapshots of the system files at regular intervals. 
                These restore points can be restored at any time to undo updates, broken system configurations, or software faults.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 font-mono text-xs bg-[#05070a]/60 border border-white/5 p-3 rounded-lg">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">SNAPSHOT DEVICE</span>
                <span className="font-bold text-slate-200">/dev/sda2 (EXT4)</span>
              </div>
              <div className="h-6 w-px bg-white/10 mx-1"></div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">STORAGE USED</span>
                <span className="font-bold text-emerald-400">35.1 GB / 465 GB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Snapshot Form */}
            <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-4 lg:col-span-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                    <FolderPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-slate-100">Create Restore Point</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Commit a manual system snapshot</p>
                  </div>
                </div>

                <form onSubmit={handleCreateTimeshiftSnapshot} className="space-y-3 font-sans">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500 font-mono">Description / Comment</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Before installing Cinnamon 6.0"
                      value={timeshiftComment}
                      onChange={(e) => setTimeshiftComment(e.target.value)}
                      className="w-full bg-[#030508] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500/35"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500 font-mono">Snapshot Type</label>
                    <select
                      className="w-full bg-[#030508] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none font-mono"
                      defaultValue="RSYNC"
                    >
                      <option value="RSYNC">RSYNC (Compatible with all filesystems)</option>
                      <option value="BTRFS">BTRFS (Subvolume snapshotting)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingTimeshift}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-black text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isCreatingTimeshift ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating Snapshot...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-black" />
                        Create Snapshot
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Dynamic Console feedback block inside the form column */}
              {timeshiftLogs && (
                <div className="mt-4 p-2.5 bg-[#030508] border border-white/5 rounded-lg text-[10px] font-mono leading-relaxed text-emerald-400 max-h-44 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                  {timeshiftLogs}
                </div>
              )}
            </div>

            {/* List of Restore Points */}
            <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-slate-100">Saved Restore Points</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Manage existing Timeshift archives</p>
                  </div>
                </div>

                <button
                  onClick={fetchTimeshiftSnapshots}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 border border-white/5 rounded"
                  title="Reload snapshots"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTimeshift ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingTimeshift && timeshiftSnapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs font-mono">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mb-2" />
                  Scanning /timeshift/snapshots directory...
                </div>
              ) : timeshiftSnapshots.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] text-slate-300">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                        <th className="pb-2">Restore Point Name</th>
                        <th className="pb-2">Tags</th>
                        <th className="pb-2 text-right">Size</th>
                        <th className="pb-2 pl-4">Comment / Description</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {timeshiftSnapshots.map((ts) => (
                        <tr key={ts.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-bold text-slate-200">
                            {ts.name}
                            <span className="block text-[9px] text-slate-500 font-normal">{new Date(ts.timestamp).toLocaleString()}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1.5">
                              {ts.tags.map((tag) => {
                                const colors: Record<string, string> = {
                                  O: "bg-blue-500/10 text-blue-400 border-blue-500/15",
                                  D: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
                                  W: "bg-amber-500/10 text-amber-400 border-amber-500/15",
                                  M: "bg-purple-500/10 text-purple-400 border-purple-500/15",
                                  H: "bg-pink-500/10 text-pink-400 border-pink-500/15"
                                };
                                const labels: Record<string, string> = {
                                  O: "on-demand",
                                  D: "daily",
                                  W: "weekly",
                                  M: "monthly",
                                  H: "hourly"
                                };
                                return (
                                  <span
                                    key={tag}
                                    title={`Timeshift ${labels[tag]} snapshot`}
                                    className={`px-1.5 py-0.5 text-[8px] font-bold rounded border uppercase font-sans ${colors[tag] || "bg-slate-800 text-slate-300"}`}
                                  >
                                    {tag}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 text-right text-slate-400 font-bold">{ts.size}</td>
                          <td className="py-3 pl-4 text-slate-300 italic max-w-xs truncate" title={ts.comment}>{ts.comment || "No comment"}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRestoreTimeshiftSnapshot(ts.id, ts.name)}
                                className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-black font-sans font-bold text-[10px] rounded transition-all cursor-pointer"
                                title="Restore system to this restore point"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => handleDeleteTimeshiftSnapshot(ts.id)}
                                className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/5 cursor-pointer"
                                title="Permanently delete snapshot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-slate-600 flex flex-col items-center justify-center py-12 text-center space-y-1.5 select-none font-sans text-xs">
                  <History className="h-7 w-7 text-slate-700 stroke-1" />
                  <p className="font-bold text-slate-500">No Timeshift restore points found.</p>
                  <p className="text-slate-600">Create a system restore point on the left side to register a checkpoint.</p>
                </div>
              )}
            </div>
          </div>

          {/* Prompt AI assist section for Timeshift */}
          {onAskAI && (
            <div className="bg-[#0c121a] text-slate-200 rounded-xl border border-emerald-900/30 p-5 shadow-md relative overflow-hidden font-sans">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] select-none pointer-events-none">
                <History className="h-28 w-28 text-emerald-400" />
              </div>

              <div className="space-y-4 max-w-2xl relative z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-sm tracking-tight text-slate-100">Consult MintCare AI for Timeshift Recovery</h3>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  Have questions about how Timeshift system restore points interact with your personal files in `/home`? 
                  Want to know how to execute a Timeshift restore operation from a command terminal during an emergency? Ask MintCare AI.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => onAskAI("Does Timeshift restore points overwrite my personal photos, music, and documents in /home/user when I execute a system restore? Explain the exclusion mechanics of Timeshift.")}
                    className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                  >
                    Exclusions & Personal Files
                  </button>
                  
                  <button
                    onClick={() => onAskAI("Explain the terminal command flow to restore a Timeshift backup snapshot from a Linux Mint live USB stick if my display server crashes or I cannot boot into the Cinnamon GUI.")}
                    className="py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                  >
                    CLI Live Restoration Guide
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeshift Restoration Modal Dialog */}
      <AnimatePresence>
        {timeshiftModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020406]/95 z-[9999] flex flex-col items-center justify-center p-6 select-none"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="max-w-md w-full bg-[#080d14] border border-emerald-500/25 p-6 rounded-xl shadow-2xl text-center space-y-6 font-mono"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 animate-pulse">
                  <RotateCcw className="h-8 w-8 animate-spin" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  System Restoration in Progress
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  DO NOT TURN OFF OR REBOOT THE COMPUTER
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>TIMESHIIT RSYNC UNPACK...</span>
                  <span className="font-bold text-emerald-400">{restoreProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${restoreProgress}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>
              </div>

              <div className="bg-[#030508] p-3 rounded-lg border border-white/5 text-left text-[9px] text-slate-400 h-28 overflow-y-auto custom-scrollbar font-mono space-y-1">
                <p className="text-emerald-500">Connecting Timeshift client stream...</p>
                {restoreProgress >= 15 && <p>Reading partition metadata from /dev/sda2... Done.</p>}
                {restoreProgress >= 35 && <p>Unlocking block layers and scanning target directories...</p>}
                {restoreProgress >= 55 && <p className="text-amber-500">[WARN] Overwriting active directories /etc/ and /var/lib/...</p>}
                {restoreProgress >= 75 && <p>Restoring system settings & package list configurations...</p>}
                {restoreProgress >= 95 && <p>Updating grub bootloader settings...</p>}
                {restoreProgress === 100 && (
                  <>
                    <p className="text-emerald-400 font-bold">[SUCCESS] File restoration complete.</p>
                    <p className="text-emerald-400 font-bold">Triggering Cinnamon desktop state refresh...</p>
                  </>
                )}
              </div>

              {restoreProgress === 100 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setTimeshiftModalOpen(false)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded transition-all cursor-pointer font-sans"
                >
                  Close & Refresh Desktop
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

