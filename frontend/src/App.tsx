import React, { useState, useRef } from 'react';
import {
  ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle2,
  Upload, ArrowRight, RefreshCw, FileText, X,
  HelpCircle, ChevronDown, ChevronUp
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
    name: 'Fake Google Alert',
    tag: 'Lookalike Phish',
    tagColor: 'text-red-400 bg-red-500/10 border-red-500/20',
    text: `From: "Google Security" <no-reply@accounts-google-verify.click>
To: user@gmail.com
Subject: Critical security alert: Suspicious sign-in prevented
Date: Mon, 28 Sep 2026 12:00:00 +0000
Authentication-Results: spf=fail; dkim=none; dmarc=fail

Someone just tried to access your Google Account from Moscow, Russia.
Please verify your identity immediately:
http://accounts-google-verify.click/login?user=user@gmail.com

If this was not you, your account will be permanently locked in 2 hours.
Google Accounts Security Team`
  },
  {
    id: 'ceo',
    name: 'CEO Urgent Gift Cards',
    tag: 'Impersonation BEC',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    text: `From: "Sarah Jenkins (CEO)" <sarah.jenkins.exec99@gmail.com>
To: cfo@company.com
Reply-To: sarah.jenkins.exec99@gmail.com
Subject: Urgent request from Sarah - In conference call
Date: Mon, 28 Sep 2026 10:15:00 +0000
Authentication-Results: spf=pass; dkim=pass; dmarc=pass

Hi Mark,

I am currently in an executive meeting and cannot take phone calls.
I need you to purchase 5 Apple gift cards ($500 each) for client bonuses right now.
Reply to this email with the claim codes as soon as you have them.

Thanks,
Sarah Jenkins
Chief Executive Officer`
  },
  {
    id: 'github',
    name: 'GitHub Security Advisory',
    tag: 'Safe / Authentic',
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
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Drag and Drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    setError(null);
    try {
      // Read the file text so user can see it in the box
      const text = await file.text();
      setEmailInput(text);
      setLoadedFileName(file.name);
      setActiveSampleId(null);
    } catch (err) {
      setError("Failed to read the .eml file. Please try pasting the text instead.");
    }
  };

  const handleSelectSample = (sample: SamplePreset) => {
    setEmailInput(sample.text);
    setActiveSampleId(sample.id);
    setLoadedFileName(null);
    setError(null);
  };

  const handleScan = async () => {
    if (!emailInput.trim()) {
      setError("Please paste an email or drop a .eml file before scanning.");
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

      if (!res.ok) throw new Error("Analysis failed. Please verify the email format.");
      const data = await res.json();

      setTimeout(() => {
        setResult(data);
        setScanning(false);
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to analyze message.");
      setScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setEmailInput('');
    setLoadedFileName(null);
    setActiveSampleId(null);
    setError(null);
    setShowDetails(false);
  };

  const isPhish = result?.policy?.verdict === 'QUARANTINE_RECOMMENDATION';
  const isEscalate = result?.policy?.verdict === 'ESCALATE';

  return (
    <div className="min-h-screen bg-[#111215] text-[#ececee] flex flex-col justify-between font-sans selection:bg-blue-500/30">
      
      {/* Simple Header */}
      <header className="px-6 py-4 border-b border-[#23252d] flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base tracking-tight text-white">PhishGuard</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#1e2029] text-[#9a9ca6] border border-[#2c2e3a]">
            Open Source
          </span>
        </div>

        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-xs text-[#9a9ca6] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-md hover:bg-[#1a1c24]"
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>How to extract from Gmail</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 flex flex-col justify-center">
        
        {/* Help Drawer */}
        {showInstructions && (
          <div className="mb-6 p-4 rounded-xl bg-[#181920] border border-[#2b2d39] text-xs text-[#c4c6cf] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between font-semibold text-white">
              <span>HOW TO GET AN EMAIL FROM GMAIL OR OUTLOOK</span>
              <button onClick={() => setShowInstructions(false)} className="text-[#888b96] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed">
              <div className="p-3 rounded-lg bg-[#111217] border border-[#262834]">
                <b className="text-white block mb-1">📬 In Gmail:</b>
                1. Open the suspicious email.<br />
                2. Click the <b>3 dots `⋮`</b> next to Reply.<br />
                3. Choose <b>"Download message"</b> ➔ drag that `.eml` file into the box below.<br />
                <i>(Or click "Show original" and copy/paste the text).</i>
              </div>
              <div className="p-3 rounded-lg bg-[#111217] border border-[#262834]">
                <b className="text-white block mb-1">📫 In Outlook:</b>
                1. Open the message.<br />
                2. Click the <b>3 dots `...`</b> ➔ <b>View</b> ➔ <b>View message details</b>.<br />
                3. Select all, copy, and paste directly into the box.
              </div>
            </div>
          </div>
        )}

        {/* Hero Title */}
        {!result && !scanning && (
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Is this email safe or a phishing attack?
            </h1>
            <p className="text-sm text-[#9294a0] max-w-md mx-auto">
              Paste the email text or drag and drop a <b>.eml</b> file below to check its sender authentication and links.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* SIMPLE LOADING SPINNER */}
        {/* ======================================================== */}
        {scanning && (
          <div className="p-10 rounded-2xl bg-[#181920] border border-[#2b2d39] text-center my-6 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-sm font-semibold text-white mb-1">Analyzing Email Security</h3>
            <p className="text-xs text-[#9294a0]">
              Checking SPF/DKIM authentication, lookalike domains, and defanging links...
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* CLEAN VERDICT VIEW */}
        {/* ======================================================== */}
        {!scanning && result && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Verdict Banner */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isPhish
                  ? 'bg-[#201317] border-red-500/30'
                  : isEscalate
                  ? 'bg-[#211a12] border-amber-500/30'
                  : 'bg-[#121f18] border-emerald-500/30'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isPhish
                      ? 'bg-red-500/20 text-red-400'
                      : isEscalate
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {isPhish ? (
                    <AlertOctagon className="w-5 h-5" />
                  ) : isEscalate ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <h3
                    className={`text-sm font-bold tracking-wide uppercase ${
                      isPhish ? 'text-red-400' : isEscalate ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {isPhish
                      ? '🚨 Malicious Phishing Detected'
                      : isEscalate
                      ? '⚠️ Suspicious Email - Follow Up'
                      : '✅ Safe - Looks Legitimate'}
                  </h3>

                  <p className="text-xs text-[#d3d5de] mt-1 leading-relaxed">
                    {isPhish
                      ? 'Do NOT click any links, open attachments, or reply. This email is attempting to impersonate a brand or harvest credentials.'
                      : isEscalate
                      ? 'Signs of executive impersonation or unusual requests detected. Confirm with the sender via phone before acting.'
                      : 'Cryptographic authentication passed. No deceptive links or malware indicators found.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-left sm:text-right border-t sm:border-t-0 border-[#323542] pt-2 sm:pt-0">
                <span className="text-[10px] text-[#8e909c] block font-mono">RISK SCORE</span>
                <span
                  className={`text-lg font-bold font-mono ${
                    isPhish ? 'text-red-400' : isEscalate ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {(result.jev?.risk_score || 1.0).toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            {/* 3 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Sender Domain */}
              <div className="p-3.5 rounded-xl bg-[#181920] border border-[#272935]">
                <div className="text-[11px] text-[#8e909c] mb-1">SENDER DOMAIN</div>
                <div className="text-xs font-semibold text-white truncate" title={result.features?.sender?.from_domain}>
                  {result.features?.sender?.from_domain || 'Unknown'}
                </div>
                <div className="text-[11px] mt-1.5">
                  {result.features?.signals?.lookalike_domains?.length > 0 ? (
                    <span className="text-red-400 font-medium">⚠️ Fake lookalike domain!</span>
                  ) : (
                    <span className="text-[#8e909c]">Domain verified</span>
                  )}
                </div>
              </div>

              {/* Authentication */}
              <div className="p-3.5 rounded-xl bg-[#181920] border border-[#272935]">
                <div className="text-[11px] text-[#8e909c] mb-1">AUTHENTICATION</div>
                <div className="text-xs font-semibold">
                  {result.features?.authentication?.dmarc === 'PASS' ? (
                    <span className="text-emerald-400">DMARC Passed</span>
                  ) : (
                    <span className="text-red-400">DMARC Failed</span>
                  )}
                </div>
                <div className="text-[11px] text-[#8e909c] mt-1.5">
                  {result.features?.authentication?.dmarc === 'PASS'
                    ? 'Cryptographically authenticated'
                    : 'Unauthorized sending server'}
                </div>
              </div>

              {/* Links */}
              <div className="p-3.5 rounded-xl bg-[#181920] border border-[#272935]">
                <div className="text-[11px] text-[#8e909c] mb-1">EMBEDDED LINKS</div>
                <div className="text-xs font-semibold text-white">
                  {result.features?.urls?.length || 0} links found
                </div>
                <div className="text-[11px] text-emerald-400 mt-1.5">
                  🛡️ All links defanged safely
                </div>
              </div>

            </div>

            {/* Technical Details Toggle */}
            <div className="pt-1 text-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-[#8e909c] hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showDetails ? 'Hide technical signals' : 'View technical signals & links'}</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-[#13141a] border border-[#252733] text-left text-xs font-mono space-y-1.5 text-[#b5b8c4]">
                  <div><b>Policy Reasons:</b> {result.policy?.reasons?.join('; ') || 'Standard analysis rules applied.'}</div>
                  <div><b>AI Semantic Intent:</b> {result.jev?.classification}</div>
                  {result.features?.urls?.length > 0 && (
                    <div className="pt-2 border-t border-[#232530]">
                      <b>Defanged Links:</b>
                      {result.features.urls.map((u: any, i: number) => (
                        <div key={i} className="text-[#888b96] truncate mt-0.5">
                          • {u.original_url.replace('http', 'hxxp').replace('.', '[.]')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scan Another Button */}
            <div className="pt-3 flex justify-center">
              <button
                onClick={handleReset}
                className="px-5 py-2 rounded-xl bg-[#282a36] hover:bg-[#343746] text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-2 border border-[#3c3f50]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another Email</span>
              </button>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* CLEAN DRAG & DROP INPUT CONTAINER */}
        {/* ======================================================== */}
        {!scanning && !result && (
          <div className="space-y-4">
            
            {/* Dropzone & Text Area Container */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-2xl border transition-all p-3 bg-[#16171d] ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-[#282a35] focus-within:border-blue-500/60'
              }`}
            >
              {/* Dragging Overlay Indicator */}
              {isDragging && (
                <div className="absolute inset-0 z-20 rounded-2xl bg-[#16171d]/90 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-blue-500 text-blue-400">
                  <Upload className="w-8 h-8 mb-2 animate-bounce" />
                  <span className="text-sm font-semibold text-white">Drop your .eml file here</span>
                  <span className="text-xs text-[#8e909c] mt-0.5">We'll load its headers and text automatically</span>
                </div>
              )}

              {/* File loaded badge if dropped */}
              {loadedFileName && (
                <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-[#1f212b] border border-[#2f3240] text-xs">
                  <span className="text-white flex items-center gap-1.5 font-medium truncate">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    Loaded file: <b className="text-blue-300">{loadedFileName}</b>
                  </span>
                  <button
                    onClick={() => {
                      setEmailInput('');
                      setLoadedFileName(null);
                    }}
                    className="text-[#888b96] hover:text-white cursor-pointer text-[11px]"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Sample loaded badge if example chosen */}
              {activeSampleId && (
                <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-[#1f212b] border border-[#2f3240] text-xs">
                  <span className="text-white font-medium">
                    Loaded example: <b className="text-blue-300">{PRESET_SAMPLES.find(s => s.id === activeSampleId)?.name}</b>
                  </span>
                  <button
                    onClick={() => {
                      setEmailInput('');
                      setActiveSampleId(null);
                    }}
                    className="text-[#888b96] hover:text-white cursor-pointer text-[11px]"
                  >
                    Clear
                  </button>
                </div>
              )}

              <textarea
                value={emailInput}
                onChange={e => {
                  setEmailInput(e.target.value);
                  if (activeSampleId) setActiveSampleId(null);
                  if (loadedFileName) setLoadedFileName(null);
                }}
                placeholder="Paste the email headers or text here, or drag and drop a .eml file directly into this box..."
                rows={8}
                className="w-full bg-transparent text-xs text-[#ececee] placeholder-[#656774] resize-none focus:outline-none p-1 font-mono leading-relaxed"
              />

              {/* Bottom Action Strip */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#232530] mt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-lg bg-[#20222b] hover:bg-[#282a36] text-[#b4b7c4] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs border border-[#2e303d]"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Upload .eml</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".eml,.msg,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <span className="text-[11px] text-[#717380] font-mono hidden sm:inline">
                    Drag & drop supported
                  </span>
                </div>

                <button
                  onClick={handleScan}
                  disabled={!emailInput.trim()}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>Analyze Message</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center">
                {error}
              </div>
            )}

            {/* Clean Example Pills */}
            <div>
              <div className="text-center text-xs text-[#717380] mb-2 font-medium">
                Or select an example to preview first:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_SAMPLES.map(sample => {
                  const isSelected = activeSampleId === sample.id;
                  return (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#222533] border-blue-500/50'
                          : 'bg-[#16171d] border-[#262833] hover:border-[#383a48]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white truncate">{sample.name}</div>
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
      <footer className="py-5 px-6 border-t border-[#23252d] text-center text-xs text-[#6e707c] font-mono">
        <p>© 2026 PhishGuard • Open Source Email Security</p>
      </footer>

    </div>
  );
}
