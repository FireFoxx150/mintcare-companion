import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export default function PpaRepoManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mirrors, setMirrors] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const fetchRepoData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/ppa-repos');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoData();
  }, []);

  const handleTestMirrors = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/system/ppa-repos/test-mirrors', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setMirrors(json.mirrors);
      }
    } catch (err) {
      console.error('Error testing mirror speed:', err);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Auditing /etc/apt/sources.list.d & GPG Keyrings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0c121a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              APT SOFTWARE SOURCES & PPAs
            </span>
            <span className="text-xs text-slate-400 font-mono">
              GPG Trusted Keys: {data?.trustedKeysCount}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Repository & Mirror Auditor</h2>
          <p className="text-xs text-slate-400">
            Inspect active Launchpad PPAs, third-party software sources, and test mirror latency.
          </p>
        </div>

        <button
          onClick={handleTestMirrors}
          disabled={testing}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
        >
          <Zap className="h-4 w-4" />
          {testing ? 'Benchmarking Ping...' : 'Benchmark Mirror Speed'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            Configured Repositories & Launchpad PPAs
          </h3>

          <div className="space-y-2">
            {data?.repos?.map((repo: any) => (
              <div key={repo.id} className="bg-[#05070a] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{repo.name}</span>
                    {repo.official && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        OFFICIAL
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{repo.url} ({repo.branch})</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  repo.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
                }`}>
                  {repo.active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mirror Latencies */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            APT Mirror Benchmark Results
          </h3>

          {mirrors.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Click "Benchmark Mirror Speed" to run ping tests against Linux Mint CDN mirrors.</p>
          ) : (
            <div className="space-y-2">
              {mirrors.map((m, idx) => (
                <div key={idx} className="bg-[#05070a] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-300 truncate max-w-[180px]">{m.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{m.pingMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
