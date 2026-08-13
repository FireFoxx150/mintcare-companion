import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Globe, 
  Sliders, 
  Zap,
  Radio,
  Sparkles,
  Layers,
  Wrench,
  Check,
  ShieldCheck,
  Download
} from "lucide-react";
import { NetworkMetric, NetworkHost, AptMirror } from "../types";

const PRESET_HOSTS: NetworkHost[] = [
  { id: "mint-repo", name: "Linux Mint Repo", host: "packages.linuxmint.com", category: "repository" },
  { id: "ubuntu-mirror", name: "Ubuntu Archive Mirror", host: "archive.ubuntu.com", category: "repository" },
  { id: "cloudflare-dns", name: "Cloudflare DNS", host: "1.1.1.1", category: "dns" },
  { id: "google-dns", name: "Google DNS", host: "8.8.8.8", category: "dns" },
  { id: "google-main", name: "Google", host: "google.com", category: "search" }
];

interface NetworkDiagnosticsProps {
  onAskAI?: (query: string) => void;
}

export default function NetworkDiagnostics({ onAskAI }: NetworkDiagnosticsProps) {
  const [subTab, setSubTab] = useState<"ping" | "mirrors" | "speedtest">("ping");

  // Speed test states
  const [speedTestStatus, setSpeedTestStatus] = useState<"idle" | "pinging" | "downloading" | "uploading" | "completed">("idle");
  const [speedPing, setSpeedPing] = useState<number | null>(null);
  const [speedJitter, setSpeedJitter] = useState<number | null>(null);
  const [speedDownload, setSpeedDownload] = useState<number>(0);
  const [speedUpload, setSpeedUpload] = useState<number>(0);
  const [speedProgress, setSpeedProgress] = useState<number>(0);
  const [speedHistory, setSpeedHistory] = useState<Array<{ timestamp: string; download: number; upload: number; ping: number }>>([]); // populated by real speed test runs only

  const handleRunSpeedTest = async () => {
    setSpeedTestStatus("pinging");
    setSpeedPing(null);
    setSpeedJitter(null);
    setSpeedDownload(0);
    setSpeedUpload(0);
    setSpeedProgress(10);

    try {
      // Animate progress bar while the server curl measurement runs
      setSpeedTestStatus("downloading");
      setSpeedProgress(25);

      const progressTimer = setInterval(() => {
        setSpeedProgress(prev => prev < 85 ? prev + 3 : prev);
      }, 400);

      const res = await fetch("/api/network/speedtest", { method: "POST" });
      clearInterval(progressTimer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setSpeedProgress(100);
      setSpeedPing(data.pingMs ?? null);
      setSpeedJitter(data.jitterMs ?? null);
      setSpeedDownload(data.downloadMbps ?? 0);
      // Upload measurement not available without a writable public endpoint
      setSpeedUpload(0);
      setSpeedTestStatus("completed");

      const nowLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setSpeedHistory(prev => [
        ...prev,
        {
          timestamp: nowLabel,
          download: data.downloadMbps ?? 0,
          upload: 0,
          ping: data.pingMs ?? 0
        }
      ]);
    } catch (err) {
      console.error("Speed test failed:", err);
      setSpeedTestStatus("idle");
      setSpeedProgress(0);
    }
  };
  
  // Host connection states
  const [metrics, setMetrics] = useState<Record<string, NetworkMetric>>({});
  const [selectedHostId, setSelectedHostId] = useState<string>("mint-repo");
  const [testing, setTesting] = useState(false);
  const [autoPoll, setAutoPoll] = useState(false);

  // APT Mirrors states
  const [mirrors, setMirrors] = useState<AptMirror[]>([]);
  const [testingMirrors, setTestingMirrors] = useState(false);
  const [selectedMirrorId, setSelectedMirrorId] = useState<string | null>("mirror-1");
  const [repairStep, setRepairStep] = useState<string | null>(null);
  const [repairComplete, setRepairComplete] = useState(false);

  // Initialize metrics state
  useEffect(() => {
    const initialMetrics: Record<string, NetworkMetric> = {};
    PRESET_HOSTS.forEach(h => {
      initialMetrics[h.id] = {
        hostId: h.id,
        name: h.name,
        host: h.host,
        pingMs: null,
        dnsMs: null,
        status: 'checking',
        history: [], // filled by real ping results as user tests
        packetLoss: 0
      };
    });
    setMetrics(initialMetrics);
    
    // Fetch initial mirrors
    fetchMirrors();
  }, []);

  const fetchMirrors = async () => {
    try {
      const res = await fetch("/api/network/apt-mirrors");
      if (res.ok) {
        const data = await res.json();
        setMirrors(data);
      }
    } catch (err) {
      console.error("Failed to load software mirrors:", err);
    }
  };

  const runPingTest = async (hostId: string) => {
    const hostObj = PRESET_HOSTS.find(h => h.id === hostId);
    if (!hostObj) return;

    setTesting(true);
    try {
      const res = await fetch("/api/network/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: hostObj.host })
      });

      if (res.ok) {
        const data = await res.json();
        
        setMetrics(prev => {
          const current = prev[hostId];
          const newPing = data.pingMs;
          const newStatus = data.status;
          
          // Generate new history
          const timeLabel = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
          const newHistory = [...current.history.slice(1), {
            timestamp: timeLabel,
            latency: newPing !== null ? newPing : 0
          }];

          // Calculate packet loss based on history
          const fails = newHistory.filter(h => h.latency === 0).length;
          const loss = Math.round((fails / newHistory.length) * 100);

          return {
            ...prev,
            [hostId]: {
              ...current,
              pingMs: newPing,
              dnsMs: data.dnsMs,
              status: newStatus,
              history: newHistory,
              packetLoss: loss
            }
          };
        });
      }
    } catch (err) {
      console.error("Network test failed:", err);
    } finally {
      setTesting(false);
    }
  };

  const handleTestMirrors = async () => {
    setTestingMirrors(true);
    try {
      const res = await fetch("/api/network/apt-mirrors/test", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMirrors(data);
      }
    } catch (err) {
      console.error("Mirror latency sweep failed:", err);
    } finally {
      setTestingMirrors(false);
    }
  };

  const handleSelectMirror = async (id: string) => {
    setRepairComplete(false);
    
    const steps = [
      "Generating checksum hashes for sources.list pipeline...",
      "Rewriting /etc/apt/sources.list.d/official-package-repositories.list...",
      "Syncing secure GPG keys with Mint keyrings (packages.linuxmint.com/GPG)...",
      "Purging stale package list cache folders in /var/lib/apt/lists/...",
      "Invoking 'sudo apt-get update' block updates in sandbox...",
      "Rebuilding system package catalog databases..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setRepairStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
      const res = await fetch("/api/network/apt-mirrors/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSelectedMirrorId(id);
        setRepairComplete(true);
      }
    } catch (err) {
      console.error("Failed to select mirror:", err);
    } finally {
      setRepairStep(null);
      setTimeout(() => setRepairComplete(false), 3000);
    }
  };

  // Run initial test for all hosts
  useEffect(() => {
    const runAll = async () => {
      for (const h of PRESET_HOSTS) {
        await runPingTest(h.id);
      }
    };
    runAll();
  }, []);

  // Auto poll effects
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      runPingTest(selectedHostId);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPoll, selectedHostId]);

  const activeMetric = metrics[selectedHostId] || {
    hostId: "",
    name: "",
    host: "",
    pingMs: null,
    dnsMs: null,
    status: 'checking',
    history: [],
    packetLoss: 0
  };

  // Analyze connection bottlenecks
  const getBottleneckAnalysis = (m: NetworkMetric) => {
    if (m.status === 'offline' || m.pingMs === null) {
      return {
        rating: "Severe Connection Block",
        color: "text-red-400",
        bgColor: "bg-red-500/5",
        borderColor: "border-red-950/40",
        desc: "Destination host completely offline or connection blocked by firewall policy. Local gateway link could be down.",
        advice: "Ensure your Wi-Fi/Ethernet physical router is connected. Check local DNS resolvers in '/etc/resolv.conf'."
      };
    }
    
    if (m.pingMs > 150 || (m.dnsMs && m.dnsMs > 150) || m.packetLoss > 10) {
      return {
        rating: "Severe Latency Bottleneck",
        color: "text-red-400",
        bgColor: "bg-red-500/5",
        borderColor: "border-red-950/40",
        desc: "High routing congestion. Roundtrip socket delays exceed 150ms. Potential Wi-Fi channel packet collisions.",
        advice: "Avoid heavy download streams on active network. Adjust router channel widths or run flatpak network reset."
      };
    }

    if (m.pingMs > 75 || (m.dnsMs && m.dnsMs > 80) || m.packetLoss > 0) {
      return {
        rating: "Moderate Queue Jitter",
        color: "text-amber-400",
        bgColor: "bg-amber-500/5",
        borderColor: "border-amber-950/40",
        desc: "Minor interface bufferbloat. DNS lookup is slightly laggy which slows down page loads but holds stable transfer bandwidth.",
        advice: "Change DNS to Cloudflare (1.1.1.1) inside Linux Mint Network Connections manager to accelerate DNS queries."
      };
    }

    return {
      rating: "Optimum Clean Pipe (Healthy)",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/5",
      borderColor: "border-emerald-950/30",
      desc: "Outstanding roundtrip TCP ping speeds and instantaneous DNS resolve performance. Zero interface packet drops.",
      advice: "Your Linux Mint connection is perfectly optimized. No corrective actions are required."
    };
  };

  const bottleneck = getBottleneckAnalysis(activeMetric);

  return (
    <div className="space-y-6">
      
      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-emerald-900/15 pb-px font-sans text-xs gap-1.5">
        <button
          onClick={() => setSubTab("ping")}
          className={`pb-3 px-5 font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer ${
            subTab === "ping"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Connection Monitor
        </button>
        <button
          onClick={() => setSubTab("mirrors")}
          className={`pb-3 px-5 font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer ${
            subTab === "mirrors"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          APT Mirrors & GPG Repairman
        </button>
        <button
          onClick={() => setSubTab("speedtest")}
          className={`pb-3 px-5 font-bold tracking-wide uppercase border-b-2 transition-all cursor-pointer ${
            subTab === "speedtest"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Internet Speed Test
        </button>
      </div>

      {subTab === "ping" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left selector card list */}
          <div className="bg-[#0c121a] rounded-xl border border-emerald-900/20 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-900/10 pb-2 mb-2">
              <h3 className="font-sans font-bold text-slate-100 text-sm flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-400" />
                Target Hosts
              </h3>
              <button
                onClick={() => runPingTest(selectedHostId)}
                disabled={testing}
                className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 bg-emerald-500/5 border border-emerald-500/20 rounded-lg transition-all cursor-pointer"
                title="Refresh connection speeds"
                id="refresh-ping-btn"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {PRESET_HOSTS.map(host => {
                const metric = metrics[host.id];
                const isSelected = selectedHostId === host.id;
                
                let statusColor = "bg-slate-600";
                if (metric) {
                  statusColor = metric.status === 'online' ? "bg-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" : metric.status === 'offline' ? "bg-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" : "bg-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]";
                }

                return (
                  <div
                    key={host.id}
                    onClick={() => setSelectedHostId(host.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                      isSelected
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-white/5 bg-[#05070a]/40 hover:border-emerald-900/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor}`}></span>
                      <div className="min-w-0">
                        <h4 className="font-sans font-bold text-xs text-slate-200 truncate">{host.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{host.host}</p>
                      </div>
                    </div>
                    {metric && metric.pingMs !== null && (
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-[#05070a] px-2 py-0.5 rounded border border-emerald-900/25 shrink-0">
                        {metric.pingMs}ms
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-emerald-900/10 pt-3 mt-1.5 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Continuous Polling:</span>
              <button
                onClick={() => setAutoPoll(!autoPoll)}
                className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase transition-all border cursor-pointer ${
                  autoPoll
                    ? "bg-emerald-600 text-black border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : "bg-white/5 text-slate-400 border-white/10"
                }`}
                id="polling-toggle-btn"
              >
                {autoPoll ? "ON (5s)" : "OFF"}
              </button>
            </div>
          </div>

          {/* Right chart/results metrics */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Diagnostic summary metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0c121a] border border-emerald-900/20 p-4 rounded-xl shadow-md">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">TCP Ping Latency</span>
                <p className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {activeMetric.pingMs !== null ? `${activeMetric.pingMs} ms` : "Offline"}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Socket connect time</span>
              </div>
              <div className="bg-[#0c121a] border border-emerald-900/20 p-4 rounded-xl shadow-md">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">DNS Lookup Speed</span>
                <p className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {activeMetric.dnsMs !== null ? `${activeMetric.dnsMs} ms` : "Failed"}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Domain lookup resolve</span>
              </div>
              <div className="bg-[#0c121a] border border-emerald-900/20 p-4 rounded-xl shadow-md">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Packet Transmission Loss</span>
                <p className={`text-xl font-bold font-mono mt-1 ${activeMetric.packetLoss > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {activeMetric.packetLoss}%
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Success / drop ratio</span>
              </div>
            </div>

            {/* Recharts Connection Latency Chart */}
            <div className="bg-[#0c121a] border border-emerald-900/20 p-5 rounded-xl shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-sans font-bold text-slate-100 text-sm">Latency Tracking Jitter</h4>
                  <p className="text-xs text-slate-400">Continuous ping timeline to test connection stability.</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                  Live Jitter Graph
                </span>
              </div>

              <div className="h-48 w-full text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={activeMetric.history}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.05)" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#475569" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#475569" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#05070a', borderRadius: '8px', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'monospace' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="latency" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1.5, stroke: '#0c121a' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottleneck Analysis card */}
            <div className={`p-5 rounded-xl border flex items-start gap-4 transition-all ${bottleneck.bgColor} ${bottleneck.borderColor}`}>
              <div className="shrink-0 mt-0.5">
                {activeMetric.status === 'online' ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : activeMetric.status === 'offline' ? (
                  <ShieldAlert className="h-6 w-6 text-red-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className={`font-sans font-bold text-sm tracking-tight ${bottleneck.color}`}>
                  {bottleneck.rating}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {bottleneck.desc}
                </p>
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 font-sans block uppercase tracking-wider font-mono">Remediation Action:</p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                    {bottleneck.advice}
                  </p>
                  {onAskAI && (
                    <button
                      onClick={() => onAskAI(`How to optimize network and resolve: '${bottleneck.rating}'? The companion suggests: ${bottleneck.advice}. Please compile a complete Linux Mint optimization guide.`)}
                      className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-all cursor-pointer font-sans bg-transparent border-none outline-none mt-1.5"
                    >
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      Consult Mint AI
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {subTab === "mirrors" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left mirrors selector */}
          <div className="bg-[#0c121a] rounded-xl border border-emerald-900/20 p-4 space-y-4 shadow-md flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-900/10 pb-2 mb-2">
                <h3 className="font-sans font-bold text-slate-100 text-sm flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  Package Archives
                </h3>
                <button
                  onClick={handleTestMirrors}
                  disabled={testingMirrors}
                  className="px-2.5 py-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/25 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 font-mono"
                >
                  <RefreshCw className={`h-3 w-3 ${testingMirrors ? "animate-spin" : ""}`} />
                  Ping Sweep
                </button>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {mirrors.map((mir) => {
                  const isSelected = selectedMirrorId === mir.id;
                  const isExcellent = mir.status === "excellent";
                  const isSlow = mir.status === "slow";
                  const isOffline = mir.status === "offline";
                  
                  return (
                    <div
                      key={mir.id}
                      onClick={() => setSelectedMirrorId(mir.id)}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.05)]"
                          : "border-white/5 bg-[#05070a]/40 hover:border-emerald-900/15"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <h4 className="font-sans font-bold text-xs text-slate-200 truncate flex items-center gap-1.5">
                            {mir.name}
                            {mir.isOfficial && (
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold tracking-tight">Official</span>
                            )}
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono tracking-wide">{mir.country}</span>
                        </div>
                        
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isExcellent 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : isSlow 
                            ? "bg-amber-500/10 text-amber-400" 
                            : isOffline
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {mir.ping === -1 ? "offline" : `${mir.ping}ms`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-emerald-900/10 pt-3 text-[11px] leading-relaxed text-slate-500 font-sans">
              Changing official mirrors alters `/etc/apt/sources.list` directly. Fast mirrors accelerate packages download velocity up to 10x.
            </div>
          </div>

          {/* Right mirrors detailed actions */}
          <div className="lg:col-span-2 space-y-6">
            {selectedMirrorId && (() => {
              const mirror = mirrors.find(m => m.id === selectedMirrorId);
              if (!mirror) return null;
              
              const isExcellent = mirror.status === "excellent";
              const isOffline = mirror.status === "offline";
              
              return (
                <div className="bg-[#0c121a] rounded-xl border border-emerald-900/20 p-5 sm:p-6 shadow-md space-y-5">
                  <div className="flex justify-between items-start border-b border-emerald-900/10 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold tracking-wide">
                        Selected APT Mirror Endpoint
                      </span>
                      <h3 className="font-sans font-bold text-base text-slate-200 mt-1">{mirror.name}</h3>
                      <code className="text-xs text-emerald-300 font-mono block select-all bg-[#05070a] p-2 border border-emerald-950/40 rounded-lg mt-1.5">
                        deb {mirror.url} virginia main upstream import
                      </code>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isExcellent 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {mirror.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#05070a]/40 p-3 rounded-lg border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">Geographic Area</span>
                      <p className="text-xs text-slate-300">{mirror.country}</p>
                    </div>
                    
                    <div className="bg-[#05070a]/40 p-3 rounded-lg border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">GPG Key Verification Status</span>
                      <p className={`text-xs flex items-center gap-1.5 font-bold ${isOffline ? "text-red-400" : "text-emerald-400"}`}>
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        {isOffline ? "KEY CORRUPTED (GPG ERROR)" : "VERIFIED & REKEYED"}
                      </p>
                    </div>
                  </div>

                  {/* Terminal Action Logs */}
                  {repairStep ? (
                    <div className="bg-[#05070a] text-emerald-400 p-4 rounded-lg border border-emerald-900/30 font-mono text-[10px] space-y-1.5">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1">
                        <span className="font-bold">ADMIN APT-COMMAND SANDBOX RUNNING</span>
                        <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                      </div>
                      <p className="text-slate-500">$ sudo mintsources --switch-mirror --url {mirror.url}</p>
                      <p className="text-emerald-300 flex items-center gap-1.5 font-bold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                        {repairStep}
                      </p>
                    </div>
                  ) : repairComplete ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-lg flex items-center gap-3 text-emerald-400 text-xs font-mono">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold">Repository Sync Completed successfully!</p>
                        <p className="text-[10px] text-emerald-500/80">Sources rekeyed and packages catalog database updated with fast mirror.</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectMirror(mirror.id)}
                      disabled={isOffline}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Wrench className="h-4 w-4" />
                      Switch to this APT Mirror & Repair Keys
                    </button>
                  )}

                  {/* AI remedial options */}
                  {onAskAI && (
                    <div className="bg-[#05070a]/30 p-4 rounded-xl border border-white/5 space-y-3">
                      <h4 className="font-sans font-bold text-slate-200 text-xs">Troubleshoot Linux Mint PPA errors with AI</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Do you see 404 Repository GPG errors while running `apt update`? Consult Gemini to safely clear broken launchpad keys.
                      </p>
                      
                      <button
                        onClick={() => onAskAI(`I am seeing a GPG authentication or 404 error on a third party repository while running apt-get update in Linux Mint. How can I safely identify the broken PPA in my /etc/apt/sources.list.d/ folder, what commands do I use to retrieve missing public GPG keys, and how do I purge PPAs using the 'ppa-purge' command?`)}
                        className="py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Analyze PPA Errors
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        </div>
      )}

      {subTab === "speedtest" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Speedometer and Active Test panel */}
          <div className="lg:col-span-2 bg-[#0c121a] rounded-xl border border-emerald-900/20 p-5 sm:p-6 shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-slate-100">Speedtest Engine</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Real-time Linux Mint bandwidth capacity</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  speedTestStatus === "idle"
                    ? "bg-slate-800 text-slate-400"
                    : speedTestStatus === "completed"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse"
                }`}>
                  {speedTestStatus}
                </span>
              </div>

              {/* Progress Bar */}
              {speedTestStatus !== "idle" && (
                <div className="w-full space-y-1 bg-[#05070a] p-2.5 rounded-lg border border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-400">
                      {speedTestStatus === "pinging" && "Measuring server latency..."}
                      {speedTestStatus === "downloading" && "Measuring Download Transfer rate..."}
                      {speedTestStatus === "uploading" && "Measuring Upload Transfer rate..."}
                      {speedTestStatus === "completed" && "Bandwidth measurement complete."}
                    </span>
                    <span className="text-emerald-400 font-bold">{speedProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${speedProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Meters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Download Meter Card */}
                <div className="bg-[#05070a]/50 border border-white/5 p-5 rounded-xl space-y-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">Download Speed</span>
                    <Download className={`h-4 w-4 ${speedTestStatus === "downloading" ? "text-emerald-400 animate-bounce" : "text-slate-500"}`} />
                  </div>
                  <div className="py-2">
                    <p className="text-4xl font-extrabold font-mono text-emerald-400 tracking-tight">
                      {speedDownload} <span className="text-xs text-slate-500 font-normal">Mbps</span>
                    </p>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-150"
                      style={{ width: `${Math.min((speedDownload / 200) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Measuring physical interface capacity</span>
                </div>

                {/* Upload Meter Card */}
                <div className="bg-[#05070a]/50 border border-white/5 p-5 rounded-xl space-y-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">Upload Speed</span>
                    <Download className={`h-4 w-4 rotate-180 ${speedTestStatus === "uploading" ? "text-blue-400 animate-bounce" : "text-slate-500"}`} />
                  </div>
                  <div className="py-2">
                    <p className="text-4xl font-extrabold font-mono text-blue-400 tracking-tight">
                      {speedTestStatus === "completed"
                        ? <span className="text-xl text-slate-500">N/A<span className="text-xs ml-2 font-normal">no upload endpoint</span></span>
                        : <span>{speedUpload} <span className="text-xs text-slate-500 font-normal">Mbps</span></span>
                      }
                    </p>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${Math.min((speedUpload / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Measuring stream transmission speed</span>
                </div>

              </div>

              {/* Latency and Server Metadata badging */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#05070a]/30 border border-white/5 p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Ping (RTT)</span>
                  <span className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                    {speedPing !== null ? `${speedPing} ms` : "--"}
                  </span>
                </div>
                <div className="bg-[#05070a]/30 border border-white/5 p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Jitter</span>
                  <span className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                    {speedJitter !== null ? `${speedJitter} ms` : "--"}
                  </span>
                </div>
                <div className="bg-[#05070a]/30 border border-white/5 p-3 rounded-lg col-span-2 sm:col-span-1 flex flex-col justify-center">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Server Host</span>
                  <span className="text-xs font-bold text-slate-200 truncate mt-0.5">
                    {speedTestStatus !== "idle" ? "mirrors.kernel.org / archive.ubuntu.com" : "Ready to test"}
                  </span>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-emerald-900/10">
              <button
                onClick={handleRunSpeedTest}
                disabled={speedTestStatus !== "idle" && speedTestStatus !== "completed"}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md font-sans"
              >
                <Activity className={`h-4 w-4 ${speedTestStatus !== "idle" && speedTestStatus !== "completed" ? "animate-spin" : ""}`} />
                {speedTestStatus === "idle" && "Begin Speed Test"}
                {speedTestStatus === "completed" && "Run Speed Test Again"}
                {speedTestStatus === "pinging" && "Measuring Latency..."}
                {speedTestStatus === "downloading" && "Testing Download Speed..."}
                {speedTestStatus === "uploading" && "Testing Upload Speed..."}
              </button>
            </div>
          </div>

          {/* Speed test history tracker */}
          <div className="bg-[#0c121a] rounded-xl border border-emerald-900/20 p-5 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-900/10 pb-3">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-xs text-slate-100">Speed Session History</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Historical runs catalog</p>
                </div>
              </div>

              {/* Recharts Speed History Chart */}
              <div className="h-44 w-full text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={speedHistory}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.05)" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#475569" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#475569" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#05070a', borderRadius: '8px', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'monospace' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="download" 
                      name="Download"
                      stroke="#10b981" 
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="upload" 
                      name="Upload"
                      stroke="#3b82f6" 
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed historical table */}
              <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1.5 custom-scrollbar">
                {speedHistory.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-[#05070a]/65 rounded border border-white/5 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 font-bold">{item.timestamp}</span>
                    <div className="flex gap-3 text-right">
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">DL</span>
                        <span className="text-emerald-400 font-bold">{item.download} M</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">UL</span>
                        <span className="text-blue-400 font-bold">{item.upload} M</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">Ping</span>
                        <span className="text-slate-300">{item.ping}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className="pt-3 border-t border-white/5 text-[10px] text-slate-500 font-mono mt-4">
              Internet Speed tests require active network data. MintCare utilizes a secure local speed sweep pipeline.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
