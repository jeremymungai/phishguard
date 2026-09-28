import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle2,
  ArrowRight, Upload, Sparkles, RefreshCw, X,
  HelpCircle, ChevronDown, ChevronUp, Eye, Mail
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

interface SamplePreset {
  id: string;
  name: string;
  tag: string;
  tagColor: string;
  text: string;
}

const PRESET_SAMPLES: SamplePreset[] = [
  {
    id: 'google',
    name: 'Google Security Alert',
    tag: 'Fake Lookalike',
    tagColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    text: `From: "Google Security" <no-reply@accounts-google-verify.click>
To: target.user@gmail.com
Subject: Critical security alert: Suspicious sign-in prevented
Date: Mon, 28 Sep 2026 12:00:00 +0000
Authentication-Results: spf=fail; dkim=none; dmarc=fail

Someone just tried to access your Google Account from Moscow, Russia.
Please verify your identity immediately:
http://accounts-google-verify.click/login?user=target.user@gmail.com

If this was not you, your account will be permanently locked in 2 hours.
Google Accounts Security Team`
  },
  {
    id: 'm365',
    name: 'Microsoft 365 Expiry',
    tag: 'Credential Harvest',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    text: `From: "Microsoft 365 Support" <no-reply@security-alerts-office365.com>
To: employee@company.com
Subject: ACTION REQUIRED: Your Microsoft 365 password expires today
Date: Mon, 28 Sep 2026 11:30:00 +0000
Authentication-Results: spf=softfail; dkim=none; dmarc=fail

Dear Employee,

Your Microsoft 365 access will be terminated within 2 hours due to credential expiration.
Reset your password immediately on our secure portal:
https://login-micros0ft.com/auth/login?user=employee@company.com

IT Helpdesk Support`
  },
  {
    id: 'ceo',
    name: 'CEO Urgent Wire / Gift Cards',
    tag: 'Executive Spoof',
    tagColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    text: `From: "Sarah Jenkins (CEO)" <sarah.jenkins.exec99@gmail.com>
To: cfo@company.com
Reply-To: sarah.jenkins.exec99@gmail.com
Subject: Urgent request from Sarah - In conference call
Date: Mon, 28 Sep 2026 10:15:00 +0000
Authentication-Results: spf=pass; dkim=pass; dmarc=pass

Hi Mark,

I am currently in an executive meeting and cannot take phone calls.
I need you to urgently purchase 5 Apple gift cards ($500 each) for client bonuses right now.
Reply to this email with the claim codes as soon as you have them.

Thanks,
Sarah Jenkins
Chief Executive Officer`
  },
  {
    id: 'github',
    name: 'GitHub Security Advisory',
    tag: 'Authentic Safe',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    text: `From: "GitHub Security" <notifications@github.com>
To: dev@company.com
Subject: [GitHub] Security advisory: Dependabot alert detected in repository
Date: Mon, 28 Sep 2026 09:00:00 +0000
Authentication-Results: spf=pass; dkim=pass; dmarc=pass

Hi @dev,

A moderate severity vulnerability has been reported in one of your repository dependencies.
You can view the remediation recommendations and update instructions in your repository Security tab:
https://github.com/company/repo/security/advisories

GitHub Security Operations`
  }
];

export default function App() {
  const [emailInput, setEmailInput] = useState('');
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [cipherText, setCipherText] = useState('0x4F9B... VERIFYING_MIME');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showRawDetails, setShowRawDetails] = useState(false);

  const SCAN_STAGES = [
    { title: "DECODING HEADERS", desc: "Parsing RFC 5322 MIME & Sender Routing" },
    { title: "AUTH AUDIT", desc: "Verifying SPF, DKIM & DMARC DNS Records" },
    { title: "HOMOGLYPH SCAN", desc: "Checking Punycode & Brand Domain Squatting" },
    { title: "URL DEFANGING", desc: "Extracting & Neutralizing Malicious Links" },
    { title: "TYPESAFE JEV AI", desc: "Evaluating Semantic Intent & Coercion Patterns" },
    { title: "SYNTHESIS", desc: "Finalizing Security Policy Verdict" }
  ];

  // Dynamic cyber scanner ticker
  useEffect(() => {
    let stageInterval: any;
    let cipherInterval: any;

    if (scanning) {
      setScanStepIndex(0);
      stageInterval = setInterval(() => {
        setScanStepIndex(prev => (prev < SCAN_STAGES.length - 1 ? prev + 1 : prev));
      }, 380);

      const ciphers = [
        "0xA73F... DMARC_ALIGNMENT_CHECK",
        "0xBC81... SENDER_HOMOGLYPH_EVAL",
        "0x942D... DEFANGING_TARGET_URLS",
        "0x1E05... JEV_CHOICE_CLASSIFIER",
        "0x3C49... POLICY_ACTION_SYNTHESIS"
      ];
      let cIdx = 0;
      cipherInterval = setInterval(() => {
        cIdx = (cIdx + 1) % ciphers.length;
        setCipherText(ciphers[cIdx]);
      }, 180);
    }

    return () => {
      clearInterval(stageInterval);
      clearInterval(cipherInterval);
    };
  }, [scanning]);

  const handleSelectSample = (sample: SamplePreset) => {
    setEmailInput(sample.text);
    setActiveSampleId(sample.id);
    setError(null);
  };

  const handleScan = async () => {
    if (!emailInput.trim()) {
      setError("Please paste an email message or select one of the examples below.");
      return;
    }

    setError(null);
    setScanning(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/emails/analyze-raw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_eml: emailInput })
      });

      if (!res.ok) throw new Error("Analysis failed. Please check the email format.");
      const data = await res.json();

      setTimeout(() => {
        setResult(data);
        setScanning(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Could not analyze the email.");
      setScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanning(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/emails/upload-eml`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Could not parse .eml file.");
      const data = await res.json();

      setTimeout(() => {
        setResult(data);
        setEmailInput(data.plain_text || `Subject: ${data.subject}\nFrom: ${data.sender}`);
        setActiveSampleId(null);
        setScanning(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to analyze .eml file.");
      setScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setEmailInput('');
    setActiveSampleId(null);
    setError(null);
    setShowRawDetails(false);
  };

  const isPhish = result?.policy?.verdict === 'QUARANTINE_RECOMMENDATION';
  const isEscalate = result?.policy?.verdict === 'ESCALATE';

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500/30 relative overflow-x-hidden">
      
      {/* Subtle Ambient Radial Backlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 px-6 py-4 border-b border-white/[0.06] flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white font-mono">PhishGuard</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 font-mono border border-white/[0.08]">
            v2.4 Open Source
          </span>
        </div>

        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/[0.04]"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>How to extract from Gmail</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-5 py-8 flex flex-col justify-center">
        
        {/* Gmail Instructions Modal Drawer */}
        {showInstructions && (
          <div className="mb-6 p-5 rounded-2xl bg-[#0d0f17] border border-indigo-500/30 text-xs text-slate-300 shadow-2xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between font-bold text-indigo-300">
              <span className="flex items-center gap-1.5 font-mono">
                <Mail className="w-4 h-4 text-indigo-400" />
                HOW TO GET RAW EMAIL FROM GMAIL IN 2 CLICKS
              </span>
              <button onClick={() => setShowInstructions(false)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <b className="text-white block mb-1">Method A: Copy & Paste (Fastest)</b>
                1. Open the email in Gmail.<br />
                2. Click the <b>3 dots `⋮`</b> next to the Reply arrow.<br />
                3. Click <b>"Show original"</b>.<br />
                4. Click <b>"Copy to clipboard"</b>, then paste into the box below.
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <b className="text-white block mb-1">Method B: Download .eml File</b>
                1. Open the email in Gmail.<br />
                2. Click the <b>3 dots `⋮`</b>.<br />
                3. Click <b>"Download message"</b> to save the `.eml`.<br />
                4. Click <b>Upload .eml</b> below to drop it in.
              </div>
            </div>
          </div>
        )}

        {/* HERO TITLE (Hidden during scan and result) */}
        {!result && !scanning && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Instant AI & Cryptographic Email Triage</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Is this email legitimate or a <span className="bg-gradient-to-r from-rose-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">phishing scam?</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Paste the message or headers below. Inspect SPF/DKIM verification, sneaky lookalike domains, and malicious links with zero setup.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 1: HIGH-TECH CYBER SCANNER ANIMATION */}
        {/* ======================================================== */}
        {scanning && (
          <div className="p-8 sm:p-10 rounded-3xl bg-[#0b0d14]/90 border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col items-center justify-center text-center my-6 relative overflow-hidden backdrop-blur-xl">
            
            {/* Oscillating Dual Scan Beams */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse shadow-[0_0_20px_#818cf8]" />
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse shadow-[0_0_20px_#a855f7]" />

            {/* Concentric Rotating Hologram Rings */}
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              {/* Outer dashed ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/30 animate-[spin_8s_linear_infinite]" />
              {/* Middle reverse spinning ring */}
              <div className="absolute inset-2 rounded-full border-t-2 border-l-2 border-indigo-400/60 animate-[spin_3s_linear_infinite_reverse]" />
              {/* Glowing inner core */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.6)]">
                <ShieldCheck className="w-6 h-6 text-white animate-pulse" />
              </div>
            </div>

            {/* Current Scan Stage & Description */}
            <div className="space-y-1 mb-5">
              <div className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-bold">
                {SCAN_STAGES[scanStepIndex].title}
              </div>
              <h3 className="text-base font-semibold text-white">
                {SCAN_STAGES[scanStepIndex].desc}
              </h3>
            </div>

            {/* Live Cryptographic Decipher Ticker */}
            <div className="px-3.5 py-1.5 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-[11px] text-slate-400 tracking-wider">
              <span className="text-indigo-400 font-bold mr-2">SYS_AUDIT:</span>
              <span>{cipherText}</span>
            </div>

            {/* Progress Micro-Bar */}
            <div className="w-56 h-1 bg-white/[0.06] rounded-full overflow-hidden mt-6">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 transition-all duration-300 rounded-full"
                style={{ width: `${((scanStepIndex + 1) / SCAN_STAGES.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 2: CLEAR ACTIONABLE VERDICT RESULT */}
        {/* ======================================================== */}
        {!scanning && result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Top Main Verdict Card */}
            <div
              className={`p-6 sm:p-7 rounded-3xl border shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 backdrop-blur-xl ${
                isPhish
                  ? 'bg-gradient-to-br from-[#1b0b11] to-[#0f0509] border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.12)]'
                  : isEscalate
                  ? 'bg-gradient-to-br from-[#1a1207] to-[#0f0a03] border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.12)]'
                  : 'bg-gradient-to-br from-[#061810] to-[#030e09] border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.12)]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    isPhish
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : isEscalate
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isPhish ? (
                    <AlertOctagon className="w-6 h-6" />
                  ) : isEscalate ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm sm:text-base font-extrabold tracking-wide uppercase font-mono ${
                        isPhish ? 'text-rose-400' : isEscalate ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {isPhish
                        ? '🚨 MALICIOUS PHISHING DETECTED'
                        : isEscalate
                        ? '⚠️ SUSPICIOUS - VERIFY SENDER'
                        : '✅ AUTHENTIC & SAFE TO OPEN'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {isPhish
                      ? 'Do NOT click links, download attachments, or reply. This message is attempting to impersonate a brand or harvest credentials.'
                      : isEscalate
                      ? 'This message contains executive name spoofing or urgent payment requests. Call the sender directly on a known number before acting.'
                      : 'Cryptographic authentication passed (SPF/DKIM/DMARC). No suspicious links, homoglyphs, or malware attachments found.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/[0.08] pt-3 sm:pt-0">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Risk Severity</span>
                <span
                  className={`text-2xl font-bold font-mono ${
                    isPhish ? 'text-rose-400' : isEscalate ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {(result.jev?.risk_score || 1.0).toFixed(1)} <span className="text-xs text-slate-500">/ 5.0</span>
                </span>
              </div>
            </div>

            {/* 3 Plain-English Findings Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Sender & Domain Card */}
              <div className="p-4 rounded-2xl bg-[#0c0e17] border border-white/[0.06] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1">SENDER DOMAIN</div>
                  <div className="text-xs font-semibold text-white truncate" title={result.features?.sender?.from_domain}>
                    {result.features?.sender?.from_domain || 'Unknown'}
                  </div>
                </div>
                <div className="text-[10px] mt-2 pt-2 border-t border-white/[0.04]">
                  {result.features?.signals?.lookalike_domains?.length > 0 ? (
                    <span className="text-rose-400 font-semibold">⚠️ Fake lookalike domain detected!</span>
                  ) : (
                    <span className="text-slate-400">Sender domain is consistent</span>
                  )}
                </div>
              </div>

              {/* Authentication Card */}
              <div className="p-4 rounded-2xl bg-[#0c0e17] border border-white/[0.06] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1">AUTHENTICATION</div>
                  <div className="text-xs font-semibold">
                    {result.features?.authentication?.dmarc === 'PASS' ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> DMARC PASSED
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1 font-mono">
                        <AlertOctagon className="w-3.5 h-3.5" /> DMARC FAILED
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/[0.04]">
                  {result.features?.authentication?.dmarc === 'PASS'
                    ? 'Cryptographically authenticated'
                    : 'Sending server not authorized'}
                </div>
              </div>

              {/* Defanged Links Card */}
              <div className="p-4 rounded-2xl bg-[#0c0e17] border border-white/[0.06] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1">EMBEDDED LINKS</div>
                  <div className="text-xs font-semibold text-white">
                    {result.features?.urls?.length || 0} links found
                  </div>
                </div>
                <div className="text-[10px] mt-2 pt-2 border-t border-white/[0.04]">
                  {result.features?.urls?.length > 0 ? (
                    <span className="text-emerald-400">🛡️ All links defanged safely</span>
                  ) : (
                    <span className="text-slate-400">No external URLs in body</span>
                  )}
                </div>
              </div>

            </div>

            {/* Optional Email Raw Details Expander */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setShowRawDetails(!showRawDetails)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer py-1 px-3 rounded-full hover:bg-white/[0.04]"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showRawDetails ? 'Hide technical audit trail' : 'View technical signals & defanged URLs'}</span>
                {showRawDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showRawDetails && (
                <div className="mt-3 p-4 rounded-2xl bg-[#090b12] border border-white/[0.06] text-left text-xs font-mono space-y-2 text-slate-300">
                  <div><b>Policy Reasons:</b> {result.policy?.reasons?.join('; ') || 'Standard classification rules applied.'}</div>
                  <div><b>Semantic Intent:</b> {result.jev?.classification} ({(result.jev?.classification_confidence * 100).toFixed(0)}% confidence)</div>
                  {result.features?.urls?.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <b>Extracted & Defanged URLs:</b>
                      {result.features.urls.map((u: any, i: number) => (
                        <div key={i} className="text-slate-400 truncate mt-1">
                          • {u.original_url.replace('http', 'hxxp').replace('.', '[.]')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scan Another Button */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another Email</span>
              </button>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 3: INPUT VIEW (PASTE OR SELECT EXAMPLE FIRST) */}
        {/* ======================================================== */}
        {!scanning && !result && (
          <div className="w-full space-y-5">
            
            {/* The Main Input Box */}
            <div className="relative rounded-3xl bg-[#0d0f18]/80 border border-white/[0.08] p-4 shadow-2xl focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all backdrop-blur-xl">
              
              {/* Active Sample Indicator Pill (if an example is loaded) */}
              {activeSampleId && (
                <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                  <span className="text-indigo-300 font-medium">
                    Loaded example: <b>{PRESET_SAMPLES.find(s => s.id === activeSampleId)?.name}</b>
                  </span>
                  <button
                    onClick={() => {
                      setEmailInput('');
                      setActiveSampleId(null);
                    }}
                    className="text-slate-400 hover:text-white cursor-pointer text-[11px] flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>
              )}

              <textarea
                value={emailInput}
                onChange={e => {
                  setEmailInput(e.target.value);
                  if (activeSampleId) setActiveSampleId(null);
                }}
                placeholder="Paste the suspicious email contents or raw headers here..."
                rows={8}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none p-1 font-mono leading-relaxed"
              />

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mt-2">
                <div className="flex items-center gap-2">
                  <label className="py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs border border-white/[0.06]">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload .eml</span>
                    <input type="file" accept=".eml,.msg,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                    {emailInput.length > 0 ? `${emailInput.length} characters` : 'Gmail / Outlook compatible'}
                  </span>
                </div>

                <button
                  onClick={handleScan}
                  disabled={!emailInput.trim()}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_20px_rgba(99,102,241,0.35)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  <span>Analyze Message</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
                {error}
              </div>
            )}

            {/* Example Lures (Click loads text into textarea first!) */}
            <div className="pt-2">
              <div className="text-center text-xs text-slate-400 mb-2.5 font-medium">
                Try a realistic lure (loads text into the box for your review first):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_SAMPLES.map(sample => {
                  const isSelected = activeSampleId === sample.id;
                  return (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/20 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                          : 'bg-[#0c0e17] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-200 truncate">{sample.name}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-1 ${sample.tagColor}`}>
                        {sample.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-white/[0.06] text-center text-xs text-slate-500 font-mono">
        <p>© 2026 PhishGuard • Open Source Email Security</p>
      </footer>

    </div>
  );
}
