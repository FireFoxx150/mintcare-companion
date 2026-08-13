import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Download, 
  FileText,
  ChevronDown,
  ChevronUp,
  Sliders,
  Send,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SystemLog } from "../types.js";

interface SystemLogsProps {
  onAskAI?: (query: string) => void;
}

/** Derive a stable "PID" from a service name so journalctl-style output
 *  never shows random values that change on every render. */
function stablePid(service: string): number {
  let h = 5381;
  for (let i = 0; i < service.length; i++) {
    h = ((h << 5) + h) ^ service.charCodeAt(i);
    h = h >>> 0; // keep 32-bit unsigned
  }
  return 500 + (h % 29500); // realistic PID range 500–29999
}

export default function SystemLogs({ onAskAI }: SystemLogsProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  
  // Custom Log Form State
    const [simService, setSimService] = useState("");
  const [simSeverity, setSimSeverity] = useState<"info" | "warning" | "error" | "debug">("warning");
  const [simMessage, setSimMessage] = useState("");

  // Interactive Terminal State
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; output: string }>>([
    { cmd: "help", output: "Welcome to MintCare Interactive Diagnostics terminal.\nType 'help' to list available commands." }
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    let output = "";
    const lowerCmd = cmd.toLowerCase();

    if (lowerCmd === "clear") {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    } else if (lowerCmd === "help") {
      output = `Available MintCare administration commands:\n` +
               `  systemctl status cinnamon    - Inspect active Cinnamon Desktop metrics\n` +
               `  cinnamon --replace           - Reset display manager / reload desktop GUI\n` +
               `  journalctl -xe               - Dump latest system error log entries\n` +
               `  tail -n 50 /var/log/syslog   - Read real-time diagnostic kernel messages\n` +
               `  ufw status                   - Display uncomplicated firewall security active status\n` +
               `  ss -tulnp                    - List active TCP/UDP ports and listening servers\n` +
               `  df -h                        - Review root folder disk storage overhead\n` +
               `  free -m                      - Examine physical and swap memory allocation\n` +
               `  uname -a                     - Print architecture type and Linux Kernel version\n` +
               `  lspci                        - List all motherboard PCI hubs and GPU card connections\n` +
               `  remediate                    - Query Gemini AI on troubleshooting system issues\n` +
               `  clear                        - Clear terminal history buffer`;
    } else if (lowerCmd.includes("systemctl status cinnamon")) {
      output = `● cinnamon.service - Cinnamon Desktop Shell Environment\n` +
               `     Loaded: loaded (/lib/systemd/system/cinnamon.service; enabled; vendor preset: enabled)\n` +
               `     Active: active (running) since Fri 2026-07-10 08:30:14 UTC; 1h 45min ago\n` +
               `   Main PID: 1421 (cinnamon)\n` +
               `      Tasks: 42 (limit: 4915)\n` +
               `     Memory: 412.0M (limit: 1024.0M configured via MintCare Tuning)\n` +
               `        CPU: 4.8% average overhead\n` +
               `     Status: "Running window manager loop under display server Xorg"\n` +
               `   CGroup: /system.slice/cinnamon.service\n` +
               `           └─1421 /usr/bin/cinnamon --replace`;
    } else if (lowerCmd.includes("cinnamon --replace")) {
      output = `cinnamon@mint:~$ cinnamon --replace\n` +
               `Window manager warning: Screen 0 on display ":0" already has a window manager; replacing it.\n` +
               `Cinnamon desktop process restarted successfully. Running Cinnamon shell loop on PID 2419.`;
    } else if (lowerCmd.includes("journalctl")) {
      const recentErrors = logs.slice(0, 5).map(l => 
        `[${l.timestamp.split('T')[1]?.slice(0, 8) || '08:44:12'}] mint-host ${l.service}[${stablePid(l.service)}]: [${l.severity.toUpperCase()}] ${l.message}`
      ).join("\n");
      output = recentErrors || `No syslog entries captured in buffer currently.`;
    } else if (lowerCmd.includes("tail -n 50 /var/log/syslog")) {
      output = `syslog latest log streams:\n` +
               `Jul 12 11:02:14 mint-host kernel: thermal thermal_zone0: critical temperature reached (82 C)\n` +
               `Jul 12 11:05:32 mint-host NetworkManager[621]: <info> [1719124211] connection 'Wired' active\n` +
               `Jul 12 11:08:44 mint-host cinnamon[1421]: JS LOG: Extension system monitor loaded in 14ms\n` +
               `Jul 12 11:15:02 mint-host mintUpdate: Fetching update catalogs completed successfully.`;
    } else if (lowerCmd.includes("ufw status")) {
      output = `Status: active (shield enabled)\n` +
               `Default: deny (incoming), allow (outgoing)\n` +
               `\n` +
               `To      Action      From\n` +
               `--      ------      ----\n` +
               `22/tcp  ALLOW       Anywhere\n` +
               `80/tcp  ALLOW       Anywhere`;
    } else if (lowerCmd.includes("ss -tulnp")) {
      output = `Netid State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port Process\n` +
               `tcp   LISTEN 0      4096          0.0.0.0:3000       0.0.0.0:*     users:(("node",pid=345,fd=19))\n` +
               `tcp   LISTEN 0      128           0.0.0.0:22         0.0.0.0:*     users:(("sshd",pid=112,fd=3))\n` +
               `tcp   LISTEN 0      511           0.0.0.0:80         0.0.0.0:*     users:(("nginx",pid=144,fd=6))`;
    } else if (lowerCmd.includes("df -h")) {
      output = `Filesystem      Size  Used Avail Use% Mounted on\n` +
               `udev            7.8G     0  7.8G   0% /dev\n` +
               `/dev/sda2       250G  148G  102G  59% /\n` +
               `tmpfs           1.6G  2.3M  1.6G   1% /run\n` +
               `/dev/sda1       511M  6.1M  505M   2% /boot/efi`;
    } else if (lowerCmd.includes("free -m")) {
      output = `               total        used        free      shared  buff/cache   available\n` +
               `Mem:           16000        8241        7759         185        2410        9214\n` +
               `Swap:           2048         121        1927`;
    } else if (lowerCmd.includes("uname -a")) {
      output = `Linux mint-host 6.5.0-27-generic #28-Ubuntu SMP PREEMPT_DYNAMIC Thu Mar 7 18:21:00 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux`;
    } else if (lowerCmd.includes("lspci")) {
      output = `00:00.0 Host bridge: Intel Corporation 12th Gen Core Processor Host Bridge/DRAM Registers (rev 02)\n` +
               `00:02.0 VGA compatible controller: Intel Corporation Alder Lake-S GT1 [UHD Graphics 710] (rev 0c)\n` +
               `00:14.0 USB controller: Intel Corporation Alder Lake-S PCH USB 3.2 xHCI Host Controller (rev 11)\n` +
               `00:1c.0 PCI express root port\n` +
               `01:00.0 VGA compatible controller: NVIDIA Corporation GA106 [GeForce RTX 3060] (rev a1)`;
    } else if (lowerCmd === "remediate") {
      output = `[MintCare AI Diagnostics Dispatching...]\n` +
               `Constructing system health profile and dispatching to Gemini API...\n\n` +
               `Recommendations compiled:\n` +
               `1. Adjust vm.swappiness to 10 to limit excessive drive wear.\n` +
               `2. Auto-vacuum journal logs when logs cross 500MB.\n` +
               `3. Activate active UFW rule sets to avoid network scanning bottlenecks.`;
    } else {
      output = `# Command '${cmd}' compiled successfully in sandbox environment.\n` +
               `# Output: [RUN SUCCESSFUL]. To apply this real command, deploy the terminal script using MintCare Remediation scripts.`;
    }

    setTerminalHistory(prev => [...prev, { cmd, output }]);
    setTerminalInput("");
  };

  const runCheatCommand = (cmd: string) => {
    setTerminalInput(cmd);
    setTimeout(() => {
      let output = "";
      const lowerCmd = cmd.toLowerCase();
      
      if (lowerCmd === "help") {
        output = `Available MintCare administration commands:\n` +
                 `  systemctl status cinnamon    - Inspect active Cinnamon Desktop metrics\n` +
                 `  cinnamon --replace           - Reset display manager / reload desktop GUI\n` +
                 `  journalctl -xe               - Dump latest system error log entries\n` +
                 `  tail -n 50 /var/log/syslog   - Read real-time diagnostic kernel messages\n` +
                 `  ufw status                   - Display uncomplicated firewall security active status\n` +
                 `  ss -tulnp                    - List active TCP/UDP ports and listening servers\n` +
                 `  df -h                        - Review root folder disk storage overhead\n` +
                 `  free -m                      - Examine physical and swap memory allocation\n` +
                 `  uname -a                     - Print architecture type and Linux Kernel version\n` +
                 `  lspci                        - List all motherboard PCI hubs and GPU card connections\n` +
                 `  remediate                    - Query Gemini AI on troubleshooting system issues\n` +
                 `  clear                        - Clear terminal history buffer`;
      } else if (lowerCmd.includes("systemctl status cinnamon")) {
        output = `● cinnamon.service - Cinnamon Desktop Shell Environment\n` +
                 `     Loaded: loaded (/lib/systemd/system/cinnamon.service; enabled; vendor preset: enabled)\n` +
                 `     Active: active (running) since Fri 2026-07-10 08:30:14 UTC; 1h 45min ago\n` +
                 `   Main PID: 1421 (cinnamon)\n` +
                 `      Tasks: 42 (limit: 4915)\n` +
                 `     Memory: 412.0M (limit: 1024.0M configured via MintCare Tuning)\n` +
                 `        CPU: 4.8% average overhead\n` +
                 `     Status: "Running window manager loop under display server Xorg"\n` +
                 `   CGroup: /system.slice/cinnamon.service\n` +
                 `           └─1421 /usr/bin/cinnamon --replace`;
      } else if (lowerCmd.includes("cinnamon --replace")) {
        output = `cinnamon@mint:~$ cinnamon --replace\n` +
                 `Window manager warning: Screen 0 on display ":0" already has a window manager; replacing it.\n` +
                 `Cinnamon desktop process restarted successfully. Running Cinnamon shell loop on PID 2419.`;
      } else if (lowerCmd.includes("journalctl")) {
        const recentErrors = logs.slice(0, 5).map(l => 
          `[${l.timestamp.split('T')[1]?.slice(0, 8) || '08:44:12'}] mint-host ${l.service}[${stablePid(l.service)}]: [${l.severity.toUpperCase()}] ${l.message}`
        ).join("\n");
        output = recentErrors || `No syslog entries captured in buffer currently.`;
      } else if (lowerCmd.includes("tail -n 50 /var/log/syslog")) {
        output = `syslog latest log streams:\n` +
                 `Jul 12 11:02:14 mint-host kernel: thermal thermal_zone0: critical temperature reached (82 C)\n` +
                 `Jul 12 11:05:32 mint-host NetworkManager[621]: <info> [1719124211] connection 'Wired' active\n` +
                 `Jul 12 11:08:44 mint-host cinnamon[1421]: JS LOG: Extension system monitor loaded in 14ms\n` +
                 `Jul 12 11:15:02 mint-host mintUpdate: Fetching update catalogs completed successfully.`;
      } else if (lowerCmd.includes("ufw status")) {
        output = `Status: active (shield enabled)\n` +
                 `Default: deny (incoming), allow (outgoing)\n` +
                 `\n` +
                 `To      Action      From\n` +
                 `--      ------      ----\n` +
                 `22/tcp  ALLOW       Anywhere\n` +
                 `80/tcp  ALLOW       Anywhere`;
      } else if (lowerCmd.includes("ss -tulnp")) {
        output = `Netid State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port Process\n` +
                 `tcp   LISTEN 0      4096          0.0.0.0:3000       0.0.0.0:*     users:(("node",pid=345,fd=19))\n` +
                 `tcp   LISTEN 0      128           0.0.0.0:22         0.0.0.0:*     users:(("sshd",pid=112,fd=3))\n` +
                 `tcp   LISTEN 0      511           0.0.0.0:80         0.0.0.0:*     users:(("nginx",pid=144,fd=6))`;
      } else if (lowerCmd.includes("df -h")) {
        output = `Filesystem      Size  Used Avail Use% Mounted on\n` +
                 `udev            7.8G     0  7.8G   0% /dev\n` +
                 `/dev/sda2       250G  148G  102G  59% /\n` +
                 `tmpfs           1.6G  2.3M  1.6G   1% /run\n` +
                 `/dev/sda1       511M  6.1M  505M   2% /boot/efi`;
      } else if (lowerCmd.includes("free -m")) {
        output = `               total        used        free      shared  buff/cache   available\n` +
                 `Mem:           16000        8241        7759         185        2410        9214\n` +
                 `Swap:           2048         121        1927`;
      } else if (lowerCmd.includes("uname -a")) {
        output = `Linux mint-host 6.5.0-27-generic #28-Ubuntu SMP PREEMPT_DYNAMIC Thu Mar 7 18:21:00 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux`;
      } else if (lowerCmd.includes("lspci")) {
        output = `00:00.0 Host bridge: Intel Corporation 12th Gen Core Processor Host Bridge/DRAM Registers (rev 02)\n` +
                 `00:02.0 VGA compatible controller: Intel Corporation Alder Lake-S GT1 [UHD Graphics 710] (rev 0c)\n` +
                 `00:14.0 USB controller: Intel Corporation Alder Lake-S PCH USB 3.2 xHCI Host Controller (rev 11)\n` +
                 `00:1c.0 PCI express root port\n` +
                 `01:00.0 VGA compatible controller: NVIDIA Corporation GA106 [GeForce RTX 3060] (rev a1)`;
      } else if (lowerCmd === "remediate") {
        output = `[MintCare AI Diagnostics Dispatching...]\n` +
                 `Constructing system health profile and dispatching to Gemini API...\n\n` +
                 `Recommendations compiled:\n` +
                 `1. Adjust vm.swappiness to 10 to limit excessive drive wear.\n` +
                 `2. Auto-vacuum journal logs when logs cross 500MB.\n` +
                 `3. Activate active UFW rule sets to avoid network scanning bottlenecks.`;
      } else if (lowerCmd === "clear") {
        setTerminalHistory([]);
        setTerminalInput("");
        return;
      } else {
        output = `# Command '${cmd}' compiled successfully in sandbox environment.\n` +
                 `# Output: [RUN SUCCESSFUL]. To apply this real command, deploy the terminal script using MintCare Remediation scripts.`;
      }
      
      setTerminalHistory(prev => [...prev, { cmd, output }]);
      setTerminalInput("");
    }, 50);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setRefreshKey(prev => prev + 1);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch system logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  

  const handleClearCustomLogs = async () => {
    try {
      const res = await fetch("/api/logs/clear", { method: "POST" });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error("Failed to clear custom logs:", err);
    }
  };

  const handlePurgeLogs = async () => {
    try {
      const res = await fetch("/api/logs/purge", { method: "POST" });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error("Failed to purge logs:", err);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mintcare_system_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    let csv = "ID,Timestamp,Service,Severity,Source,Message\n";
    filteredLogs.forEach(l => {
      const id = `"${l.id.replace(/"/g, '""')}"`;
      const timestamp = `"${new Date(l.timestamp).toISOString()}"`;
      const service = `"${l.service.replace(/"/g, '""')}"`;
      const severity = `"${l.severity.replace(/"/g, '""')}"`;
      const source = `"${l.source.replace(/"/g, '""')}"`;
      const message = `"${l.message.replace(/"/g, '""')}"`;
      csv += `${id},${timestamp},${service},${severity},${source},${message}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mintcare_system_logs_report_${selectedSeverity}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMarkdown = () => {
    let markdown = `# MintCare Companion Center - Parsed System Logs\n`;
    markdown += `Generated on: ${new Date().toLocaleString()}\n`;
    markdown += `Total Entries: ${filteredLogs.length}\n\n`;
    markdown += `| Timestamp | Service | Severity | Source | Message |\n`;
    markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;
    
    filteredLogs.forEach(l => {
      markdown += `| ${new Date(l.timestamp).toISOString()} | ${l.service} | ${l.severity.toUpperCase()} | ${l.source} | ${l.message} |\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mintcare_system_logs_${Date.now()}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportTXT = () => {
    const timestamp = new Date().toLocaleString();
    let txt = `=================================================================\n`;
    txt += `               MINTCARE COMPANION SYSTEM LOG REPORT              \n`;
    txt += `=================================================================\n`;
    txt += `Generated: ${timestamp}\n`;
    txt += `Total Matching Entries: ${filteredLogs.length}\n\n`;

    filteredLogs.forEach((l, idx) => {
      txt += `[${idx + 1}] ${new Date(l.timestamp).toISOString()} [${l.severity.toUpperCase()}] [${l.service}] (${l.source})\n`;
      txt += `     ${l.message}\n\n`;
    });

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mintcare_system_logs_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get unique list of sources
  const sources = ["all", ...Array.from(new Set(logs.map(l => l.source)))];

  // Filtering Logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.service.toLowerCase().includes(searchQuery.toLowerCase()) || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = 
      selectedSeverity === "all" || log.severity === selectedSeverity;
      
    const matchesSource = 
      selectedSource === "all" || log.source === selectedSource;

    return matchesSearch && matchesSeverity && matchesSource;
  });

  const errorsCount = logs.filter(l => l.severity === "error").length;
  const warningsCount = logs.filter(l => l.severity === "warning").length;
  const infosCount = logs.filter(l => l.severity === "info").length;
  const debugsCount = logs.filter(l => l.severity === "debug").length;

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour12: false })}`;
  };

  return (
    <div className="space-y-6">
      {/* Upper header action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c121a] p-5 rounded-xl border border-emerald-900/20 shadow-md">
        <div>
          <h2 className="font-sans font-bold text-slate-100 text-base">System Logs Analyzer</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Read and audit standard Linux Mint log files alongside live kernel errors and warnings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            className={`flex-1 sm:flex-initial py-2 px-3.5 border text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              autoRefresh
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-500/20"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
            }`}
            id="auto-refresh-logs-toggle-btn"
            title="Toggle 5-second automatic log list refresh"
          >
            <span className="relative flex h-2 w-2">
              {autoRefresh && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefresh ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
            </span>
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto-refresh (5s): {autoRefresh ? "ON" : "OFF"}</span>
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            id="reload-logs-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
            id="download-log-report-btn"
            title="Download CSV report of current filtered log view (All, Errors, Warnings)"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
          <button
            onClick={handleClearCustomLogs}
            disabled={logs.filter(l => l.source === "User Triggered").length === 0}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 text-red-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Clear manual logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Manual
          </button>
          <button
            onClick={handlePurgeLogs}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Purge logs older than 30 days"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Purge Old (&gt;30d)
          </button>
        </div>
      </div>

      {/* Log Statistics Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => setSelectedSeverity("all")}
          className={`bg-[#0c121a] border p-4 rounded-xl shadow-md col-span-2 lg:col-span-1 cursor-pointer transition-all ${
            selectedSeverity === 'all' ? 'border-emerald-500/80 ring-1 ring-emerald-500/30' : 'border-emerald-900/20 hover:border-emerald-500/40'
          }`}
          title="Filter: All Logs"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Total Log Pool</span>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-1">{logs.length}</p>
          <span className="text-[10px] text-slate-400 font-mono">Active system nodes checked</span>
        </div>
        <div 
          onClick={() => setSelectedSeverity("error")}
          className={`bg-[#0c121a] border p-4 rounded-xl shadow-md bg-red-500/5 cursor-pointer transition-all ${
            selectedSeverity === 'error' ? 'border-red-500/80 ring-1 ring-red-500/40' : 'border-red-950/40 hover:border-red-500/40'
          }`}
          title="Filter: Errors Only"
        >
          <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider font-mono">Critical Errors</span>
          <p className="text-2xl font-bold font-mono text-red-400 mt-1 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-400 animate-pulse" />
            {errorsCount}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Requiring immediate action</span>
        </div>
        <div 
          onClick={() => setSelectedSeverity("warning")}
          className={`bg-[#0c121a] border p-4 rounded-xl shadow-md bg-amber-500/5 cursor-pointer transition-all ${
            selectedSeverity === 'warning' ? 'border-amber-500/80 ring-1 ring-amber-500/40' : 'border-amber-950/40 hover:border-amber-500/40'
          }`}
          title="Filter: Warnings Only"
        >
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider font-mono">Warnings</span>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            {warningsCount}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Non-blocking bottlenecks</span>
        </div>
        <div 
          onClick={() => setSelectedSeverity("info")}
          className={`bg-[#0c121a] border p-4 rounded-xl shadow-md bg-emerald-500/5 cursor-pointer transition-all ${
            selectedSeverity === 'info' ? 'border-emerald-500/80 ring-1 ring-emerald-500/40' : 'border-emerald-950/30 hover:border-emerald-500/40'
          }`}
          title="Filter: Info Only"
        >
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider font-mono">Informational</span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            {infosCount}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Healthy service events</span>
        </div>
        <div 
          onClick={() => setSelectedSeverity("debug")}
          className={`bg-[#0c121a] border p-4 rounded-xl shadow-md bg-blue-500/5 cursor-pointer transition-all ${
            selectedSeverity === 'debug' ? 'border-blue-500/80 ring-1 ring-blue-500/40' : 'border-blue-950/30 hover:border-blue-500/40'
          }`}
          title="Filter: Debug Only"
        >
          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider font-mono">Debug Logs</span>
          <p className="text-2xl font-bold font-mono text-blue-400 mt-1 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-400 animate-pulse" />
            {debugsCount}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Verbose trace logs</span>
        </div>
      </div>

      {/* Filters and Exports Panel */}
      <div className="bg-[#0c121a] border border-emerald-900/20 p-4 rounded-xl shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs by keyword, process, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg pl-10 pr-4 py-2.5 outline-none transition-all placeholder:text-slate-600 text-slate-200 text-xs font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Severity Filter Dropdown */}
            <div className="flex items-center gap-2 bg-[#05070a] border border-emerald-900/30 hover:border-emerald-500/40 rounded-lg px-3 py-1.5 transition-all" id="log-severity-filter-wrapper">
              <Filter className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-400">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent border-none text-slate-200 text-xs font-bold outline-none cursor-pointer pr-1"
                id="log-severity-filter-select"
              >
                <option value="all" className="bg-[#0c121a] text-slate-200">All Logs</option>
                <option value="error" className="bg-[#0c121a] text-red-400 font-bold">Errors Only</option>
                <option value="warning" className="bg-[#0c121a] text-amber-400 font-bold">Warnings Only</option>
                <option value="info" className="bg-[#0c121a] text-emerald-400 font-bold">Info Only</option>
                <option value="debug" className="bg-[#0c121a] text-blue-400 font-bold">Debug Only</option>
              </select>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-2 bg-[#05070a] border border-emerald-900/10 rounded-lg px-2.5 py-1.5">
              <Terminal className="h-3 w-3 text-emerald-400" />
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="bg-transparent border-none text-slate-300 text-xs font-semibold outline-none cursor-pointer pr-1 truncate max-w-[160px]"
              >
                <option value="all" className="bg-[#0c121a]">All Sources</option>
                {sources.filter(s => s !== "all").map((source) => (
                  <option key={source} value={source} className="bg-[#0c121a]">
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {/* Export buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={handleExportCSV}
                disabled={filteredLogs.length === 0}
                className="py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                id="export-csv-logs"
                title="Download report of filtered system logs as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                Download Report (CSV)
              </button>
              <button
                onClick={handleExportTXT}
                disabled={filteredLogs.length === 0}
                className="py-1.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                id="export-txt-logs"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Export TXT
              </button>
              <button
                onClick={handleExportMarkdown}
                disabled={filteredLogs.length === 0}
                className="py-1.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                id="export-md-logs"
              >
                <Download className="h-3.5 w-3.5 text-slate-400" />
                Export MD
              </button>
              <button
                onClick={handleExportJSON}
                disabled={filteredLogs.length === 0}
                className="py-1.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                id="export-json-logs"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Log Console terminal */}
      <div className="bg-[#05070a] border border-emerald-900/30 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[550px]">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#080c12] border-b border-emerald-900/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono pl-2">
              mint_diagnostic_logs.sh
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono tracking-wider">
            {lastRefreshedAt && (
              <span className="text-slate-500 hidden sm:inline">
                Last updated: {lastRefreshedAt.toLocaleTimeString()}
              </span>
            )}
            <span className="text-emerald-400 font-bold">
              Showing {filteredLogs.length} of {logs.length} entries
            </span>
          </div>
        </div>

        {/* Terminal Stream Output with Fade-in Animation */}
        <div 
          key={refreshKey} 
          className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[11px] leading-relaxed select-text animate-fadeIn"
        >
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mb-3" />
              <p>Analyzing system diagnostic files...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Terminal className="h-8 w-8 text-slate-600 mb-3 animate-pulse" />
              <p>No log entries found matching criteria.</p>
              <p className="text-[10px] text-slate-600 mt-1">Try resetting the filters or trigger a custom test log.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              
              let severityBadge = "text-emerald-400";
              let textRowColor = "text-slate-300";
              if (log.severity === "error") {
                severityBadge = "text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-1 rounded animate-pulse";
                textRowColor = "text-red-200";
              } else if (log.severity === "warning") {
                severityBadge = "text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded";
                textRowColor = "text-amber-200/90";
              } else if (log.severity === "debug") {
                severityBadge = "text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded";
                textRowColor = "text-blue-200/80";
              }

              return (
                <div key={log.id} className="border-b border-white/5 last:border-none">
                  {/* Summary row */}
                  <div 
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedLogId(isExpanded ? null : log.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    title="Click to toggle expanded log details"
                    className="flex items-start gap-2 py-2 px-1.5 rounded hover:bg-white/5 transition-all cursor-pointer group select-none focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  >
                    <span className="text-slate-500 shrink-0 select-none min-w-[125px]">
                      {formatDate(log.timestamp)}
                    </span>
                    <span className={`shrink-0 font-bold uppercase text-[9px] w-[50px] text-center ${severityBadge}`}>
                      {log.severity}
                    </span>
                    <span className="text-emerald-400 shrink-0 font-bold max-w-[130px] truncate">
                      [{log.service}]
                    </span>
                    <span className={`flex-1 break-all ${textRowColor} group-hover:text-white transition-colors`}>
                      {log.message}
                    </span>
                    <span className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 hidden sm:inline group-hover:text-slate-300">{isExpanded ? "Collapse" : "Expand"}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </div>

                  {/* Expanded Metadata Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-[#0c121a]/80 border border-emerald-900/30 rounded-md my-2 mx-1 p-3.5 space-y-3 text-slate-300 font-sans shadow-lg"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div className="bg-[#05070a] p-2 rounded border border-white/5">
                            <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block mb-0.5">Timestamp</span>
                            <span className="font-mono text-[11px] text-slate-200 font-semibold">{formatDate(log.timestamp)}</span>
                            <span className="font-mono text-[10px] text-slate-500 block truncate">{new Date(log.timestamp).toISOString()}</span>
                          </div>
                          <div className="bg-[#05070a] p-2 rounded border border-white/5">
                            <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block mb-0.5">Log Source File</span>
                            <span className="font-mono text-[11px] text-amber-300 font-semibold truncate block">{log.source}</span>
                          </div>
                          <div className="bg-[#05070a] p-2 rounded border border-white/5">
                            <span className="text-slate-500 font-mono text-[10px] uppercase block font-bold mb-0.5">Service / Process</span>
                            <span className="font-bold text-emerald-400 text-[11px]">{log.service}</span>
                          </div>
                          <div className="bg-[#05070a] p-2 rounded border border-white/5">
                            <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block mb-0.5">Log Record ID</span>
                            <span className="font-mono text-[10px] text-slate-400 truncate block">{log.id}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-emerald-900/20">
                          <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block mb-1">Raw Log Message Content</span>
                          <code className="block bg-[#05070a] text-slate-100 p-3 rounded border border-emerald-900/30 font-mono text-[11px] break-all leading-relaxed font-semibold selection:bg-emerald-500/30">
                            {log.message}
                          </code>
                        </div>

                        {onAskAI && (log.severity === "warning" || log.severity === "error") && (
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskAI(`How can I troubleshoot this Linux Mint system log event from process [${log.service}]? \nSeverity: ${log.severity.toUpperCase()}\nMessage: "${log.message}"\nSource: ${log.source}\n\nPlease explain why this error occurs and compile safe commands or configurations to fix it.`);
                              }}
                              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer font-sans bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-md"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                              Troubleshoot with Mint AI
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Interactive Troubleshooting Command Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Terminal Sandbox Column */}
        <div className="bg-[#070b10] text-slate-200 rounded-xl border border-white/5 p-5 shadow-lg font-mono space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block"></span>
                </div>
                <span className="text-xs text-slate-400 ml-2 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Terminal className="h-4 w-4 text-emerald-400 animate-pulse" />
                  mintcare-troubleshooter@diagnostics:~
                </span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 font-sans">
                BASH SANDBOX ACTIVE
              </span>
            </div>

            <div className="space-y-3 h-[280px] overflow-y-auto pr-2 text-[11px] leading-relaxed font-mono custom-scrollbar">
              <div className="text-slate-500 leading-normal">
                # MintCare Sandbox shell initialized successfully.
                # Type 'help' to review commands or click any cheat sheet quick shortcut.
              </div>
              {terminalHistory.map((entry, idx) => (
                <div key={idx} className="space-y-1.5 bg-[#030508]/60 p-2.5 rounded border border-white/5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1">
                    <span className="text-emerald-400 font-bold">mintcare@system:~$ {entry.cmd}</span>
                    <span className="text-[9px] text-slate-600">Interactive Sandbox Run</span>
                  </div>
                  <pre className="text-slate-300 font-mono whitespace-pre-wrap leading-relaxed text-[10px] font-medium">{entry.output}</pre>
                </div>
              ))}
              <div ref={terminalEndRef}></div>
            </div>
          </div>

          <form onSubmit={handleTerminalSubmit} className="flex gap-2.5 items-center bg-[#030508] border border-emerald-900/10 hover:border-emerald-500/20 rounded-lg p-2 transition-all mt-4 shrink-0">
            <span className="text-emerald-400 font-bold pl-1.5 text-xs select-none">mintcare@system:~$</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Type systemctl status cinnamon, journalctl, free -m..."
              className="flex-1 bg-transparent border-none text-slate-200 outline-none font-mono text-xs placeholder:text-slate-700"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded-md flex items-center gap-1 transition-all shrink-0 cursor-pointer font-sans"
            >
              <Send className="h-3 w-3" />
              Execute
            </button>
          </form>
        </div>

        {/* Cheat Sheet Quick-Run Sidebar Column */}
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col justify-between font-sans">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-xs text-slate-100">Cinnamon Admin Cheat Sheet</h4>
                <p className="text-[10px] text-slate-500 font-mono">One-click execution</p>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-1.5 custom-scrollbar">
              {/* Category 1: System Health */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">1. System Health & Storage</span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => runCheatCommand("df -h")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>df -h</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Disk Space</span>
                  </button>
                  <button
                    onClick={() => runCheatCommand("free -m")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>free -m</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Memory RAM</span>
                  </button>
                  <button
                    onClick={() => runCheatCommand("uname -a")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>uname -a</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Kernel Info</span>
                  </button>
                </div>
              </div>

              {/* Category 2: Cinnamon GUI Desktop */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">2. GUI Cinnamon Desktop</span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => runCheatCommand("systemctl status cinnamon")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>systemctl status cinnamon</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Check GUI</span>
                  </button>
                  <button
                    onClick={() => runCheatCommand("cinnamon --replace")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-[#991b1b]/10 text-slate-300 hover:text-red-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>cinnamon --replace</span>
                    <span className="text-[9px] text-red-500 uppercase font-sans font-bold">Reload GUI</span>
                  </button>
                </div>
              </div>

              {/* Category 3: Log & Audit logs */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">3. Error & Syslog Auditing</span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => runCheatCommand("journalctl -xe")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>journalctl -xe</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Systemctl Failures</span>
                  </button>
                  <button
                    onClick={() => runCheatCommand("tail -n 50 /var/log/syslog")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>tail -n 50 syslog</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Diagnostic Stream</span>
                  </button>
                </div>
              </div>

              {/* Category 4: Security & Connections */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">4. Network Ports & Firewall</span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => runCheatCommand("ufw status")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>ufw status</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Shield rules</span>
                  </button>
                  <button
                    onClick={() => runCheatCommand("ss -tulnp")}
                    className="w-full text-left font-mono text-[10px] py-1.5 px-2 bg-[#05070a]/65 border border-white/5 hover:border-emerald-500/25 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>ss -tulnp</span>
                    <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Active ports</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[10px] text-slate-500 font-mono leading-relaxed mt-4 shrink-0">
            Pro Tip: Launching <span className="text-emerald-400">cinnamon --replace</span> executes a full desktop environment render reset.
          </div>
        </div>

      </div>

    </div>
  );
}
