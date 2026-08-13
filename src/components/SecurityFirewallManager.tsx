import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Plus, Power, Radio, RefreshCw } from 'lucide-react';

export default function SecurityFirewallManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newPort, setNewPort] = useState('');
  const [newComment, setNewComment] = useState('');

  const fetchFirewallData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/firewall');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load firewall status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirewallData();
  }, []);

  const handleToggleFirewall = async () => {
    try {
      const res = await fetch('/api/system/firewall/toggle', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setData((prev: any) => ({ ...prev, enabled: json.enabled }));
      }
    } catch (err) {
      console.error('Error toggling firewall:', err);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPort) return;
    try {
      const res = await fetch('/api/system/firewall/rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: newPort, comment: newComment })
      });
      if (res.ok) {
        setNewPort('');
        setNewComment('');
        setShowAddRule(false);
        fetchFirewallData();
      }
    } catch (err) {
      console.error('Error adding rule:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Auditing UFW Firewall Rules & Listening Sockets...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0c121a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              UFW FIREWALL & SECURITY
            </span>
            <span className="text-xs text-slate-400 font-mono">
              AppArmor: {data?.appArmorStatus || 'Active'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">UFW Firewall & Network Hardening Center</h2>
          <p className="text-xs text-slate-400">
            Manage incoming packet filter rules, open listening TCP/UDP sockets, and network security profiles.
          </p>
        </div>

        <button
          onClick={handleToggleFirewall}
          className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            data?.enabled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-[0_4px_12px_rgba(16,185,129,0.2)]'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          <Power className="h-4 w-4" />
          {data?.enabled ? 'Firewall Active (Enabled)' : 'Firewall Disabled'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Firewall Rules List */}
        <div className="lg:col-span-2 bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              Active UFW Firewall Rules
            </h3>
            <button
              onClick={() => setShowAddRule(true)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </button>
          </div>

          <div className="space-y-2">
            {data?.rules?.map((rule: any) => (
              <div key={rule.id} className="bg-[#05070a] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-200">{rule.port}</span>
                  <span className="text-[11px] text-slate-400 ml-3">{rule.comment}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  {rule.action} ({rule.direction})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Listening Sockets */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Radio className="h-4 w-4 text-amber-400" />
            Open Listening Ports (ss -tulpn)
          </h3>

          <div className="space-y-2">
            {data?.openPorts?.map((item: any, idx: number) => (
              <div key={idx} className="bg-[#05070a] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-400">Port {item.port}</span>
                  <span className="text-[10px] text-slate-400 block">{item.process}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">{item.proto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c121a] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-400" />
              Add UFW Firewall Rule
            </h3>
            <form onSubmit={handleAddRule} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Port / Protocol</label>
                <input
                  type="text"
                  value={newPort}
                  onChange={(e) => setNewPort(e.target.value)}
                  placeholder="e.g. 8080/tcp or 53/udp"
                  className="w-full bg-[#05070a] border border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Comment / Identifier</label>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="e.g. Node API Server"
                  className="w-full bg-[#05070a] border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRule(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl"
                >
                  Allow Port
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
