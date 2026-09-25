import { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Eye, Send, Play, RefreshCw,
  Activity, UserCheck, CheckCircle2, XCircle,
  Lock, Flame, Inbox, Search, Terminal, ChevronRight
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

export function App() {
  const [emails, setEmails] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total_analyzed: 0,
    quarantine_count: 0,
    escalated_count: 0,
    monitored_count: 0,
    allowed_count: 0,
    pending_human_review: 0
  });
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'simulation' | 'events'>('queue');
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [simMode, setSimMode] = useState<'preset' | 'raw'>('preset');
  const [rawEmlInput, setRawEmlInput] = useState('');
  const [analystNotes, setAnalystNotes] = useState('');
  const [events, setEvents] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [resEmails, resStats, resSamples] = await Promise.all([
        fetch(`${API_BASE}/api/emails`),
        fetch(`${API_BASE}/api/emails/stats`),
        fetch(`${API_BASE}/api/simulation/samples`)
      ]);
      if (resEmails.ok) setEmails(await resEmails.json());
      if (resStats.ok) setStats(await resStats.json());
      if (resSamples.ok) setSamples(await resSamples.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const eventSource = new EventSource(`${API_BASE}/api/events/stream`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [data, ...prev].slice(0, 100));
        fetchData();
      } catch (err) {}
    };
    eventSource.addEventListener("email_analyzed", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [data, ...prev].slice(0, 100));
        fetchData();
      } catch (err) {}
    });
    eventSource.addEventListener("analyst_feedback", () => fetchData());
    return () => eventSource.close();
  }, []);
  const openEmailDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/emails/${id}`);
      if (res.ok) setSelectedEmail(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalystFeedback = async (verdict: string) => {
    if (!selectedEmail) return;
    try {
      const res = await fetch(`${API_BASE}/api/emails/${selectedEmail.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, notes: analystNotes })
      });
      if (res.ok) {
        openEmailDetail(selectedEmail.id);
        fetchData();
        setAnalystNotes("");
      }
    } catch (err) {}
  };

  const runSimulation = async (payload: any, isRaw: boolean = false) => {
    setLoading(true);
    try {
      const endpoint = isRaw ? `${API_BASE}/api/emails/analyze-raw` : `${API_BASE}/api/emails/analyze-json`;
      const body = isRaw ? JSON.stringify({ raw_eml: payload }) : JSON.stringify(payload);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      if (res.ok) {
        const result = await res.json();
        await fetchData();
        openEmailDetail(result.id);
        setActiveTab("queue");
      }
    } catch (err) {} finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    if (verdict === "QUARANTINE_RECOMMENDATION") {
      return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> QUARANTINE</span>;
    }
    if (verdict === "ESCALATE") {
      return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ESCALATE</span>;
    }
    if (verdict === "MONITOR") {
      return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1"><Eye className="w-3 h-3" /> MONITOR</span>;
    }
    return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ALLOW</span>;
  };

  const getRiskColor = (score: number) => {
    if (score >= 4.0) return "text-red-400 bg-red-500/10 border-red-500/20";
    if (score >= 2.5) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  };

  const filteredEmails = emails.filter((e) => {
    const matchVerdict = filterVerdict === "ALL" || e.policy_verdict === filterVerdict;
    const matchSearch = e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.sender.toLowerCase().includes(searchQuery.toLowerCase());
    return matchVerdict && matchSearch;
  });
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-soc-border bg-soc-card/90 backdrop-blur px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">PhishGuard</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">SOC Triage</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">TypeSafe Jev</span>
            </div>
            <p className="text-xs text-gray-400">Deterministic Signals + System-1 Semantic Decision Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-soc-bg px-3 py-1.5 rounded-lg border border-soc-border">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-gray-300">Live SSE Feed</span>
          </div>

          <button
            onClick={() => setActiveTab("simulation")}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ingest & Simulate</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-soc-card border border-soc-border rounded-xl p-3.5">
            <span className="text-xs text-gray-400 block mb-1">Total Analyzed</span>
            <span className="text-2xl font-bold font-mono text-white">{stats.total_analyzed}</span>
          </div>
          <div className="bg-soc-card border border-red-500/20 rounded-xl p-3.5">
            <span className="text-xs text-red-400 block mb-1">Quarantine</span>
            <span className="text-2xl font-bold font-mono text-red-400">{stats.quarantine_count}</span>
          </div>
          <div className="bg-soc-card border border-amber-500/20 rounded-xl p-3.5">
            <span className="text-xs text-amber-400 block mb-1">Escalated</span>
            <span className="text-2xl font-bold font-mono text-amber-400">{stats.escalated_count}</span>
          </div>
          <div className="bg-soc-card border border-blue-500/20 rounded-xl p-3.5">
            <span className="text-xs text-blue-400 block mb-1">Monitored</span>
            <span className="text-2xl font-bold font-mono text-blue-400">{stats.monitored_count}</span>
          </div>
          <div className="bg-soc-card border border-emerald-500/20 rounded-xl p-3.5">
            <span className="text-xs text-emerald-400 block mb-1">Allowed</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">{stats.allowed_count}</span>
          </div>
          <div className="bg-soc-card border border-purple-500/30 bg-purple-500/5 rounded-xl p-3.5">
            <span className="text-xs text-purple-300 block mb-1">Pending Review</span>
            <span className="text-2xl font-bold font-mono text-purple-400">{stats.pending_human_review}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-soc-border pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "queue" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-soc-card"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Email Triage Queue</span>
            </button>
            <button
              onClick={() => setActiveTab("simulation")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "simulation" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-soc-card"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simulation Lab</span>
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "events" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-soc-card"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Event Stream</span>
            </button>
          </div>
          <button onClick={fetchData} className="p-1.5 text-gray-400 hover:text-white hover:bg-soc-card rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {activeTab === "queue" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                {["ALL", "QUARANTINE_RECOMMENDATION", "ESCALATE", "MONITOR", "ALLOW"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setFilterVerdict(v)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      filterVerdict === v
                        ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                        : "bg-soc-card text-gray-400 border border-soc-border hover:text-white"
                    }`}
                  >
                    {v === "QUARANTINE_RECOMMENDATION" ? "Quarantine" : v}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search subject, sender..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-soc-card border border-soc-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-soc-bg border-b border-soc-border text-gray-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Sender / Subject</th>
                    <th className="py-3 px-4">Jev Class</th>
                    <th className="py-3 px-4">Threat Risk</th>
                    <th className="py-3 px-4">Policy Verdict</th>
                    <th className="py-3 px-4">Review Status</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {filteredEmails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500">
                        No emails found. Run an ingestion scenario from the Simulation Lab!
                      </td>
                    </tr>
                  ) : (
                    filteredEmails.map((email) => (
                      <tr
                        key={email.id}
                        onClick={() => openEmailDetail(email.id)}
                        className="hover:bg-soc-cardhover/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">{email.subject}</span>
                          <span className="text-gray-400 font-mono text-[11px]">{email.sender}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-mono text-gray-300 bg-soc-bg px-2 py-0.5 rounded border border-soc-border">
                            {email.classification.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold border ${getRiskColor(email.risk_score)}`}>
                            {email.risk_score.toFixed(1)} / 5.0
                          </span>
                        </td>
                        <td className="py-3 px-4">{getVerdictBadge(email.policy_verdict)}</td>
                        <td className="py-3 px-4">
                          {email.analyst_verdict ? (
                            <span className="text-purple-400 font-semibold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {email.analyst_verdict}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-[11px]">Unreviewed</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-blue-400 hover:text-blue-300 p-1 rounded">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === "simulation" && (
          <div className="bg-soc-card border border-soc-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Simulation Lab — Safe Triage Testing</span>
                </h2>
                <p className="text-xs text-gray-400">Run test scenarios or paste raw .eml emails.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSimMode("preset")}
                  className={`px-3 py-1 text-xs rounded-md ${simMode === "preset" ? "bg-blue-600 text-white" : "text-gray-400 bg-soc-bg"}`}
                >
                  Presets ({samples.length})
                </button>
                <button
                  onClick={() => setSimMode("raw")}
                  className={`px-3 py-1 text-xs rounded-md ${simMode === "raw" ? "bg-blue-600 text-white" : "text-gray-400 bg-soc-bg"}`}
                >
                  Paste Raw EML
                </button>
              </div>
            </div>

            {simMode === "preset" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {samples.map((s) => (
                  <div key={s.id} className="bg-soc-bg border border-soc-border rounded-lg p-3.5 flex flex-col justify-between hover:border-blue-500/50 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-bold text-white">{s.title}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {s.expected_class}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-3">{s.description}</p>
                    </div>
                    <button
                      onClick={() => runSimulation(s.data, false)}
                      disabled={loading}
                      className="w-full bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-semibold py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3" />
                      <span>Execute Scenario</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <textarea
                  rows={8}
                  value={rawEmlInput}
                  onChange={(e) => setRawEmlInput(e.target.value)}
                  placeholder="Paste RFC 5322 .eml headers and body here..."
                  className="w-full bg-soc-bg border border-soc-border rounded-lg p-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => runSimulation(rawEmlInput, true)}
                  disabled={loading || !rawEmlInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Analyze Raw EML</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div className="bg-soc-card border border-soc-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Security Event Telemetry</span>
            </h2>
            <div className="space-y-2 font-mono text-xs max-h-[500px] overflow-y-auto mt-4">
              {events.length === 0 ? (
                <span className="text-gray-500">Listening for real-time SSE telemetry events...</span>
              ) : (
                events.map((ev, i) => (
                  <div key={i} className="p-2.5 bg-soc-bg border border-soc-border rounded flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-[11px]">{new Date(ev.timestamp || Date.now()).toLocaleTimeString()}</span>
                      <span className="text-blue-400 font-bold">[{ev.event || "PIPELINE"}]</span>
                      <span className="text-gray-300">{ev.subject || ev.message || ev.email_id}</span>
                    </div>
                    {ev.policy_verdict && getVerdictBadge(ev.policy_verdict)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-soc-border flex items-center justify-between bg-soc-bg/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{selectedEmail.sender}</span>
                  <span className="text-gray-600">→</span>
                  <span className="font-mono text-xs text-gray-400">{selectedEmail.recipient}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">{selectedEmail.subject}</h2>
              </div>
              <div className="flex items-center gap-3">
                {getVerdictBadge(selectedEmail.policy.verdict)}
                <button onClick={() => setSelectedEmail(null)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-soc-bg border border-soc-border rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Deterministic Signals</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-soc-card rounded border border-soc-border">
                      <span className="text-[10px] text-gray-400 block">SPF</span>
                      <span className={`font-mono font-bold ${selectedEmail.features.signals.spf_result === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedEmail.features.signals.spf_result}
                      </span>
                    </div>
                    <div className="p-2 bg-soc-card rounded border border-soc-border">
                      <span className="text-[10px] text-gray-400 block">DKIM</span>
                      <span className={`font-mono font-bold ${selectedEmail.features.signals.dkim_result === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedEmail.features.signals.dkim_result}
                      </span>
                    </div>
                    <div className="p-2 bg-soc-card rounded border border-soc-border">
                      <span className="text-[10px] text-gray-400 block">DMARC</span>
                      <span className={`font-mono font-bold ${selectedEmail.features.signals.dmarc_result === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedEmail.features.signals.dmarc_result}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs space-y-1.5 text-gray-300">
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span>Lookalike Domains:</span>
                      <span className="font-bold text-red-400">{selectedEmail.features.signals.lookalike_domains.length > 0 ? "YES" : "NONE"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span>Display Name Spoof:</span>
                      <span className="font-bold text-amber-400">{selectedEmail.features.signals.display_name_spoofing ? "YES" : "NO"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span>Suspicious URLs:</span>
                      <span className="font-mono text-gray-200">{selectedEmail.features.signals.suspicious_url_count}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span>Dangerous Files:</span>
                      <span className="font-mono text-gray-200">{selectedEmail.features.signals.dangerous_attachment_count}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Deterministic Risk:</span>
                      <span className="font-mono font-bold text-amber-400">{selectedEmail.features.signals.deterministic_risk_score} / 1.0</span>
                    </div>
                  </div>
                </div>

                <div className="bg-soc-bg border border-soc-border rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>TypeSafe Jev (Semantic)</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-400">Classification:</span>
                        <span className="font-bold text-white uppercase">{selectedEmail.jev.classification}</span>
                      </div>
                      <div className="w-full bg-soc-card rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${selectedEmail.jev.classification_confidence * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span className="text-gray-400">Risk Score:</span>
                      <span className="font-mono font-bold text-red-400">{selectedEmail.jev.risk_score} / 5.0</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span className="text-gray-400">Credential Theft Intent:</span>
                      <span className="font-mono text-gray-200">{(selectedEmail.jev.credential_theft_prob * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span className="text-gray-400">BEC Impersonation:</span>
                      <span className="font-mono text-gray-200">{(selectedEmail.jev.bec_prob * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-border/50">
                      <span className="text-gray-400">Malicious URL Intent:</span>
                      <span className="font-mono text-gray-200">{(selectedEmail.jev.malicious_url_prob * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">Human Review Escalation:</span>
                      <span className="font-mono text-amber-400">{(selectedEmail.jev.human_review_prob * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-soc-bg border border-soc-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Policy Engine Action</span>
                    </h3>
                    <div className="mt-2">{getVerdictBadge(selectedEmail.policy.verdict)}</div>
                    <p className="text-xs font-semibold text-gray-200 mt-2">{selectedEmail.policy.recommended_action}</p>
                    <div className="mt-3 space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Rationale:</span>
                      <ul className="list-disc list-inside text-[11px] text-gray-300 space-y-1">
                        {selectedEmail.policy.reasons.map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-soc-border text-[10px] text-gray-500 font-mono">
                    Latency: {selectedEmail.latency_ms} ms
                  </div>
                </div>
              </div>

              <div className="bg-soc-bg border border-soc-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Sanitized Email Preview</h4>
                  <span className="text-[10px] text-gray-500">Links neutralized for safe SOC rendering</span>
                </div>
                <div
                  className="bg-white text-black p-4 rounded-lg text-xs font-sans max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.features.sanitized_html || selectedEmail.features.body_preview }}
                />
              </div>

              <div className="bg-soc-bg border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Human-in-the-Loop Analyst Feedback</span>
                  </h4>
                  {selectedEmail.analyst?.verdict && (
                    <span className="text-xs font-mono text-purple-400">Status: {selectedEmail.analyst.verdict}</span>
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Analyst forensic investigation remarks..."
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                    className="flex-1 w-full bg-soc-card border border-soc-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalystFeedback('CONFIRMED_PHISH')}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Confirm Phish
                    </button>
                    <button
                      onClick={() => handleAnalystFeedback('LEGITIMATE')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Mark Legitimate
                    </button>
                    <button
                      onClick={() => handleAnalystFeedback('ESCALATED')}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Escalate
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
