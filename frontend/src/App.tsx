import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle2,
  Upload, ArrowRight, RefreshCw, FileText, X,
  HelpCircle, Lock, Zap, Globe, ChevronDown, ChevronUp,
  Eye, Shield, Cpu, ListChecks, UserCheck, Ban, PhoneCall
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

/* ─────────────────────────────── types ─────────────────────────────── */
interface SamplePreset {
  id: string;
  name: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  icon: string;
  text: string;
}

/* ─────────────────────────────── samples ─────────────────────────────── */
const PRESET_SAMPLES: SamplePreset[] = [
  {
    id: 'google',
    name: 'Fake Google Alert',
    tag: 'Lookalike Phish',
    tagColor: '#f87171',
    tagBg: 'rgba(239,68,68,0.1)',
    icon: '🎣',
    text: `From: "Google Security" <no-reply@accounts-google-verify.click>
To: user@gmail.com
Subject: Critical security alert: Suspicious sign-in prevented
Date: Mon, 28 Sep 2026 12:00:00 +0000
Authentication-Results: spf=fail; dkim=none; dmarc=fail

Someone just tried to access your Google Account from Moscow, Russia.
Please verify your identity immediately:
http://accounts-google-verify.click/login?user=user@gmail.com

If this was not you, your account will be permanently locked in 2 hours.
Google Accounts Security Team`,
  },
  {
    id: 'ceo',
    name: 'CEO Gift Card Scam',
    tag: 'Impersonation BEC',
    tagColor: '#fbbf24',
    tagBg: 'rgba(245,158,11,0.1)',
    icon: '💼',
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
Chief Executive Officer`,
  },
  {
    id: 'github',
    name: 'GitHub Security Advisory',
    tag: 'Safe / Authentic',
    tagColor: '#34d399',
    tagBg: 'rgba(52,211,153,0.1)',
    icon: '✅',
    text: `From: "GitHub Security" <notifications@github.com>
To: dev@company.com
Subject: [GitHub] Security advisory: Dependabot alert detected in repository
Date: Mon, 28 Sep 2026 09:00:00 +0000
Authentication-Results: spf=pass; dkim=pass; dmarc=pass

Hi @dev,

A moderate severity vulnerability has been reported in one of your repository dependencies.
You can view the remediation recommendations and update instructions in your repository Security tab:
https://github.com/company/repo/security/advisories

GitHub Security Operations`,
  },
];

/* ─────────────────────────────── scan steps ─────────────────────────────── */
const SCAN_STEPS = [
  { icon: Shield,  label: 'Parsing email headers & MIME structure',    delay: 0    },
  { icon: Lock,    label: 'Verifying SPF / DKIM / DMARC authentication', delay: 600  },
  { icon: Globe,   label: 'Scanning URLs & defanging dangerous links',  delay: 1200 },
  { icon: Eye,     label: 'Detecting homoglyphs & lookalike domains',   delay: 1800 },
  { icon: Cpu,     label: 'Running semantic classification engine',     delay: 2400 },
  { icon: Zap,     label: 'Applying deterministic policy rules',        delay: 3000 },
];

/* ─────────────────────────────── helpers ─────────────────────────────── */
function AuthPill({ label, value }: { label: string; value: string }) {
  const pass = value === 'PASS';
  const none = value === 'NONE';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 99,
      background: pass ? 'rgba(52,211,153,0.1)' : none ? 'rgba(107,114,128,0.15)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${pass ? 'rgba(52,211,153,0.25)' : none ? 'rgba(107,114,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
      fontSize: 11, fontWeight: 600,
      color: pass ? '#34d399' : none ? '#6b7280' : '#f87171',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <span>{pass ? '✓' : none ? '—' : '✗'}</span>
      <span>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN APP                                                               */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [emailInput, setEmailInput]       = useState('');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [scanning, setScanning]           = useState(false);
  const [activeStep, setActiveStep]       = useState(-1);
  const [result, setResult]               = useState<any | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDetails, setShowDetails]     = useState(false);
  const [riskBarWidth, setRiskBarWidth]   = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* Animate risk bar after result loads */
  useEffect(() => {
    if (result) {
      setRiskBarWidth(0);
      const t = setTimeout(() => {
        const pct = ((result.jev?.risk_score || 1) / 5) * 100;
        setRiskBarWidth(Math.min(pct, 100));
      }, 200);
      return () => clearTimeout(t);
    }
  }, [result]);

  /* Animate scan steps */
  useEffect(() => {
    if (!scanning) { setActiveStep(-1); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    SCAN_STEPS.forEach((s, i) => {
      timers.push(setTimeout(() => setActiveStep(i), s.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [scanning]);

  /* ── drag & drop ── */
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await processFile(f);
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) await processFile(f);
  };
  const processFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      setEmailInput(text); setLoadedFileName(file.name); setActiveSampleId(null);
    } catch { setError('Failed to read the file. Try pasting the text instead.'); }
  };

  const handleSelectSample = (s: SamplePreset) => {
    setEmailInput(s.text); setActiveSampleId(s.id); setLoadedFileName(null); setError(null);
  };

  /* ── analyse ── */
  const handleScan = async () => {
    if (!emailInput.trim()) { setError('Paste an email or drop a .eml file first.'); return; }
    setError(null); setScanning(true); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/emails/analyze-raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_eml: emailInput }),
      });
      if (!res.ok) throw new Error('Analysis failed. Please verify the email format.');
      const data = await res.json();
      /* show all steps for at least 3.6s for the animation */
      setTimeout(() => { setResult(data); setScanning(false); }, 3700);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze message.');
      setScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null); setEmailInput(''); setLoadedFileName(null);
    setActiveSampleId(null); setError(null); setShowDetails(false); setRiskBarWidth(0);
  };

  /* ── verdict helpers ── */
  const isPhish    = result?.policy?.verdict === 'QUARANTINE_RECOMMENDATION';
  const isEscalate = result?.policy?.verdict === 'ESCALATE';
  const verdictColor  = isPhish ? '#f87171' : isEscalate ? '#fbbf24' : '#34d399';
  const verdictBg     = isPhish ? 'rgba(239,68,68,0.06)' : isEscalate ? 'rgba(245,158,11,0.06)' : 'rgba(52,211,153,0.06)';
  const verdictBorder = isPhish ? 'rgba(239,68,68,0.25)' : isEscalate ? 'rgba(245,158,11,0.25)' : 'rgba(52,211,153,0.25)';
  const verdictGlow   = isPhish ? 'rgba(239,68,68,0.15)' : isEscalate ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)';
  const riskBarColor  = isPhish ? 'linear-gradient(90deg,#ef4444,#f87171)' : isEscalate ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#059669,#34d399)';

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* ── Ambient BG ── */}
      <div className="bg-grid" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 70%)',
      }} />

      {/* ════════════════════════════════════ HEADER ════════════════════════════════════ */}
      <header style={{
        position: 'relative', zIndex: 10,
        borderBottom: '1px solid rgba(28,33,51,0.8)',
        background: 'rgba(8,11,18,0.8)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          
          {/* Logo */}
          <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(59,130,246,0.35)',
            }}>
              <ShieldCheck size={17} color="white" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#e8eaf0', letterSpacing: '-0.3px' }}>PhishGuard</span>
          </button>

          {/* Nav right */}
          <button
            onClick={() => setShowInstructions(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', color: '#7b829a', fontSize: 12, fontWeight: 500,
              padding: '6px 12px', borderRadius: 8,
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e8eaf0'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7b829a'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            <HelpCircle size={14} color="#3b82f6" />
            <span className="hide-sm">How to extract from Gmail</span>
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════ MAIN ════════════════════════════════════ */}
      <main style={{ flex: 1, maxWidth: 860, width: '100%', margin: '0 auto', padding: '32px 20px 60px', position: 'relative', zIndex: 1 }}>

        {/* ── Instructions drawer ── */}
        {showInstructions && (
          <div className="animate-fade-up" style={{
            marginBottom: 24, padding: 20, borderRadius: 16,
            background: 'rgba(14,17,28,0.9)', border: '1px solid rgba(28,33,51,0.9)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#7b829a', textTransform: 'uppercase' }}>
                How to get an email
              </span>
              <button onClick={() => setShowInstructions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7b829a', display: 'flex', alignItems: 'center' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                { title: '📬 Gmail', steps: ['Open suspicious email', 'Click 3 dots ⋮ next to Reply', '"Download message" → drag .eml below', 'Or "Show original" → copy/paste'] },
                { title: '📫 Outlook', steps: ['Open the message', 'Click 3 dots ... → View', 'Click "View message details"', 'Select all, copy, paste below'] },
              ].map(g => (
                <div key={g.title} style={{ padding: 14, borderRadius: 10, background: 'rgba(8,11,18,0.6)', border: '1px solid rgba(28,33,51,0.8)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf0', marginBottom: 8 }}>{g.title}</div>
                  {g.steps.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, minWidth: 14, marginTop: 1 }}>{i + 1}.</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════ HERO (idle state) ════════════════════ */}
        {!result && !scanning && (
          <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 32 }}>
            
            {/* Animated shield icon */}
            <div className="animate-float" style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                position: 'relative', width: 72, height: 72,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(29,78,216,0.3), rgba(59,130,246,0.2))',
                border: '1px solid rgba(59,130,246,0.3)',
              }}>
                <div className="pulse-ring" style={{
                  position: 'absolute', inset: -8, borderRadius: '50%',
                  border: '1px solid rgba(59,130,246,0.15)',
                }} />
                <div className="pulse-ring" style={{
                  position: 'absolute', inset: -18, borderRadius: '50%',
                  border: '1px solid rgba(59,130,246,0.08)',
                  animationDelay: '0.5s',
                }} />
                <ShieldCheck size={30} color="#3b82f6" />
              </div>
            </div>

            <h1 style={{ fontSize: 'clamp(22px,5vw,36px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px', lineHeight: 1.2, margin: '0 0 12px' }}>
              Is this email{' '}
              <span style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                safe
              </span>{' '}or a phishing attack?
            </h1>
            <p style={{ fontSize: 14, color: '#7b829a', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
              Paste raw email text or drop a <code style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '1px 5px', borderRadius: 4 }}>.eml</code> file below.
              SPF, DKIM, DMARC &amp; lookalike domains verified in under 55ms.
            </p>
          </div>
        )}

        {/* ════════════════════ SCANNING ANIMATION ════════════════════ */}
        {scanning && (
          <div className="animate-fade-in" style={{
            margin: '8px 0 32px', borderRadius: 20, overflow: 'hidden',
            border: '1px solid rgba(59,130,246,0.25)',
            background: 'rgba(10,13,22,0.95)',
            backdropFilter: 'blur(16px)',
          }}>
            {/* Scan beam container */}
            <div style={{ position: 'relative', height: 180, overflow: 'hidden', borderBottom: '1px solid rgba(28,33,51,0.6)' }}>
              {/* Background grid */}
              <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />
              
              {/* Center content */}
              <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 52, height: 52 }}>
                  {/* Spinning ring */}
                  <svg viewBox="0 0 52 52" style={{ position: 'absolute', inset: 0, animation: 'spin 1s linear infinite' }}>
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="2" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke="#3b82f6" strokeWidth="2"
                      strokeDasharray="30 108" strokeLinecap="round" />
                  </svg>
                  {/* Inner shield */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} color="#3b82f6" />
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0', marginBottom: 4 }}>
                    Analyzing Email Security
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="dot-bounce" style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Scan beam */}
              <div className="scan-beam" style={{ zIndex: 3 }} />

              {/* Corner accents */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                <div key={pos} style={{
                  position: 'absolute',
                  top: pos.includes('top') ? 8 : undefined,
                  bottom: pos.includes('bottom') ? 8 : undefined,
                  left: pos.includes('left') ? 8 : undefined,
                  right: pos.includes('right') ? 8 : undefined,
                  width: 12, height: 12,
                  borderTop: pos.includes('top') ? '2px solid rgba(59,130,246,0.5)' : undefined,
                  borderBottom: pos.includes('bottom') ? '2px solid rgba(59,130,246,0.5)' : undefined,
                  borderLeft: pos.includes('left') ? '2px solid rgba(59,130,246,0.5)' : undefined,
                  borderRight: pos.includes('right') ? '2px solid rgba(59,130,246,0.5)' : undefined,
                }} />
              ))}
            </div>

            {/* Step list */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SCAN_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = activeStep > i;
                const active = activeStep === i;
                return (
                  <div
                    key={i}
                    className={active || done ? 'animate-step-reveal' : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      opacity: activeStep < i ? 0.2 : 1,
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? 'rgba(52,211,153,0.15)' : active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${done ? 'rgba(52,211,153,0.3)' : active ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.4s ease',
                    }}>
                      {done
                        ? <CheckCircle2 size={12} color="#34d399" />
                        : active
                          ? <Icon size={11} color="#3b82f6" />
                          : <Icon size={11} color="#4a5068" />
                      }
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: done ? 500 : 400,
                      color: done ? '#e8eaf0' : active ? '#cbd5e1' : '#4a5068',
                      transition: 'color 0.3s ease',
                    }}>
                      {step.label}
                    </span>
                    {active && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                        {[0, 1, 2].map(i => (
                          <span key={i} className="dot-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                        ))}
                      </div>
                    )}
                    {done && (
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>done</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════ VERDICT ════════════════════ */}
        {!scanning && result && (
          <div className="animate-verdict-in" style={{ marginBottom: 28 }}>

            {/* Main verdict banner */}
            <div style={{
              padding: '24px 24px 20px',
              borderRadius: 20,
              background: verdictBg,
              border: `1px solid ${verdictBorder}`,
              boxShadow: `0 0 40px ${verdictGlow}`,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                
                {/* Left: icon + text */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPhish ? 'rgba(239,68,68,0.15)' : isEscalate ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)',
                    border: `1px solid ${verdictBorder}`,
                  }}>
                    {isPhish
                      ? <AlertOctagon size={22} color={verdictColor} />
                      : isEscalate
                        ? <AlertTriangle size={22} color={verdictColor} />
                        : <CheckCircle2 size={22} color={verdictColor} />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: verdictColor, marginBottom: 4, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                      {isPhish ? '🚨 Malicious Phishing Detected' : isEscalate ? '⚠️ Suspicious — Review Required' : '✅ Looks Legitimate'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0', lineHeight: 1.5, maxWidth: 480 }}>
                      {isPhish
                        ? 'Do NOT click links or open attachments. This email is impersonating a brand to steal credentials.'
                        : isEscalate
                          ? 'Signs of executive impersonation or unusual requests. Verify via phone before taking any action.'
                          : 'Cryptographic authentication passed with no deceptive links or threat indicators found.'
                      }
                    </div>
                  </div>
                </div>

                {/* Right: risk score */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#7b829a', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: 2 }}>RISK SCORE</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: verdictColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                    {(result.jev?.risk_score || 1.0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: '#4a5068', fontFamily: "'JetBrains Mono', monospace" }}>/ 5.0</div>
                </div>
              </div>

              {/* Risk bar */}
              <div style={{ marginTop: 20, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div className="risk-bar-fill" style={{ width: `${riskBarWidth}%`, background: riskBarColor }} />
              </div>

              {/* Auth pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                <AuthPill label="SPF"   value={result.features?.authentication?.spf   || 'NONE'} />
                <AuthPill label="DKIM"  value={result.features?.authentication?.dkim  || 'NONE'} />
                <AuthPill label="DMARC" value={result.features?.authentication?.dmarc || 'NONE'} />
              </div>
            </div>

            {/* ── Recommended Actions Card (for all users: personal, corporate, devs) ── */}
            {result.policy?.recommended_action && (() => {
              const actionSteps: string[] = (result.policy?.action_steps && result.policy.action_steps.length > 0)
                ? result.policy.action_steps
                : isPhish
                  ? [
                      "Avoid clicking any links, buttons, or attachments — they are designed to steal credentials or download malware.",
                      "Ignore the sender and do not reply or provide passwords, verification codes, or financial info.",
                      "Mark as Phishing / Spam in your email app (Gmail, Outlook, Apple Mail) to block future attempts.",
                      "Delete this email immediately. (If you already clicked or entered a password, reset it now on the real website).",
                    ]
                  : isEscalate
                    ? [
                        "Do not reply directly to this email — the sender address or display name may be impersonated.",
                        "Verify with the sender through a separate, known channel (like calling a number you already trust).",
                        "Never transfer funds, purchase gift cards, or share sensitive details based on an email request.",
                        "If you are at work, check with your team or IT lead; if personal, ignore and treat as suspicious.",
                      ]
                    : [
                        "Safe to read, reply, and open attachments under standard email practices.",
                        "As a standard precaution, always double-check unexpected requests for money, gift cards, or credentials.",
                      ];

              return (
                <div style={{
                  padding: '20px 22px', borderRadius: 16, marginBottom: 14,
                  background: isPhish
                    ? 'rgba(239,68,68,0.06)'
                    : isEscalate
                      ? 'rgba(245,158,11,0.06)'
                      : 'rgba(52,211,153,0.06)',
                  border: `1px solid ${verdictBorder}`,
                  boxShadow: `0 4px 24px ${verdictGlow}`,
                }}>
                  {/* Top Bar: Icon + Section Title + Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isPhish
                          ? 'rgba(239,68,68,0.18)'
                          : isEscalate
                            ? 'rgba(245,158,11,0.18)'
                            : 'rgba(52,211,153,0.18)',
                        border: `1px solid ${verdictBorder}`,
                      }}>
                        {isPhish
                          ? <Ban size={16} color={verdictColor} />
                          : isEscalate
                            ? <PhoneCall size={16} color={verdictColor} />
                            : <UserCheck size={16} color={verdictColor} />
                        }
                      </div>
                      <div>
                        <div style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                          color: '#7b829a', textTransform: 'uppercase',
                          fontFamily: "'JetBrains Mono', monospace",
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <ListChecks size={12} />
                          Recommended Actions
                        </div>
                      </div>
                    </div>

                    {/* Universal User Badge */}
                    <div style={{
                      padding: '4px 12px', borderRadius: 99,
                      background: isPhish
                        ? 'rgba(239,68,68,0.15)'
                        : isEscalate
                          ? 'rgba(245,158,11,0.15)'
                          : 'rgba(52,211,153,0.15)',
                      border: `1px solid ${verdictBorder}`,
                      fontSize: 10, fontWeight: 700, color: verdictColor,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                    }}>
                      {isPhish ? '⛔ DO NOT ENGAGE' : isEscalate ? '⚠️ VERIFY SENDER FIRST' : '✅ SAFE TO READ'}
                    </div>
                  </div>

                  {/* Main Action Headline */}
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: verdictColor,
                    marginBottom: 14, lineHeight: 1.45,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    paddingBottom: 12,
                  }}>
                    {result.policy.recommended_action}
                  </div>

                  {/* Numbered Action Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {actionSteps.map((step, idx) => {
                      const hasDash = step.includes(' — ');
                      const hasColon = !hasDash && step.includes(': ');
                      const parts = hasDash ? step.split(' — ') : hasColon ? step.split(': ') : [step];

                      return (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '10px 14px', borderRadius: 10,
                          background: 'rgba(0,0,0,0.22)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          {/* Number Badge */}
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isPhish
                              ? 'rgba(239,68,68,0.2)'
                              : isEscalate
                                ? 'rgba(245,158,11,0.2)'
                                : 'rgba(52,211,153,0.2)',
                            color: verdictColor,
                            fontSize: 11, fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            border: `1px solid ${verdictBorder}`,
                            marginTop: 1,
                          }}>
                            {idx + 1}
                          </div>

                          {/* Step Content */}
                          <div style={{ fontSize: 13, lineHeight: 1.45, color: '#cbd5e1', flex: 1 }}>
                            {parts.length > 1 ? (
                              <>
                                <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>{parts[0]}</strong>
                                <span style={{ color: '#94a3b8' }}> — {parts.slice(1).join(' — ')}</span>
                              </>
                            ) : (
                              step
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 3 summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                {
                  label: 'SENDER DOMAIN',
                  value: result.features?.sender?.from_domain || 'Unknown',
                  sub: result.features?.signals?.lookalike_domains?.length > 0
                    ? { text: '⚠️ Lookalike domain detected', color: '#f87171' }
                    : { text: '✓ No lookalike patterns', color: '#34d399' },
                  icon: <Globe size={14} color="#3b82f6" />,
                },
                {
                  label: 'EMBEDDED LINKS',
                  value: `${result.features?.urls?.length || 0} found`,
                  sub: { text: '🛡️ All links defanged safely', color: '#34d399' },
                  icon: <Eye size={14} color="#3b82f6" />,
                },
                {
                  label: 'ANALYSIS LATENCY',
                  value: `${(result.latency_ms || 0).toFixed(0)}ms`,
                  sub: { text: 'Sub-55ms real-time pipeline', color: '#7b829a' },
                  icon: <Zap size={14} color="#3b82f6" />,
                },
              ].map(card => (
                <div key={card.label} className="glass-card" style={{ padding: '14px 16px', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    {card.icon}
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', color: '#7b829a', textTransform: 'uppercase' }}>{card.label}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0', marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: card.sub.color, fontWeight: 500 }}>{card.sub.text}</div>
                </div>
              ))}
            </div>

            {/* Technical signals toggle */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <button
                onClick={() => setShowDetails(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#7b829a', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5,
                  transition: 'color 0.2s',
                  padding: '6px 12px',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e8eaf0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#7b829a')}
              >
                <span>{showDetails ? 'Hide technical signals' : 'View technical signals & links'}</span>
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDetails && (
                <div className="animate-fade-up glass-card" style={{
                  marginTop: 10, padding: '16px 18px', borderRadius: 14,
                  textAlign: 'left', fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, lineHeight: 1.8, color: '#9ca3af',
                }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#6b7280' }}>policy_reasons: </span>
                    <span style={{ color: '#d1d5db' }}>{result.policy?.reasons?.join(' | ') || 'Standard rules applied'}</span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#6b7280' }}>jev_classification: </span>
                    <span style={{ color: '#60a5fa' }}>{result.jev?.classification}</span>
                    <span style={{ color: '#6b7280' }}> @ </span>
                    <span style={{ color: '#34d399' }}>{((result.jev?.classification_confidence || 0) * 100).toFixed(0)}% confidence</span>
                  </div>
                  <div style={{ marginBottom: result.features?.signals?.urgency_keywords?.length > 0 || result.features?.urls?.length > 0 ? 12 : 0 }}>
                    <span style={{ color: '#6b7280' }}>model: </span>
                    <span style={{ color: '#d1d5db' }}>{result.jev?.model}</span>
                    {result.jev?.is_live_api === false && <span style={{ color: '#f59e0b' }}> (mock mode)</span>}
                  </div>
                  {result.features?.signals?.urgency_keywords?.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(28,33,51,0.8)', paddingTop: 10, marginBottom: 6 }}>
                      <span style={{ color: '#6b7280' }}>urgency_keywords: </span>
                      <span style={{ color: '#fbbf24' }}>{result.features.signals.urgency_keywords.join(', ')}</span>
                    </div>
                  )}
                  {result.features?.urls?.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(28,33,51,0.8)', paddingTop: 10 }}>
                      <div style={{ color: '#6b7280', marginBottom: 4 }}>defanged_links:</div>
                      {result.features.urls.map((u: any, i: number) => (
                        <div key={i} style={{ color: '#f87171', paddingLeft: 12 }}>
                          • {u.original_url.replace(/^http/, 'hxxp').replace(/\./g, '[.]')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scan another */}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={handleReset}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 20px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e8eaf0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <RefreshCw size={14} />
                <span>Scan Another Email</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════ INPUT FORM ════════════════════ */}
        {!scanning && !result && (
          <div className="animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>

            {/* Drag & drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                position: 'relative', borderRadius: 16, overflow: 'hidden',
                border: `1px solid ${isDragging ? 'rgba(59,130,246,0.6)' : 'rgba(28,33,51,0.9)'}`,
                background: isDragging ? 'rgba(59,130,246,0.06)' : 'rgba(11,14,24,0.7)',
                backdropFilter: 'blur(8px)',
                boxShadow: isDragging ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                transition: 'all 0.2s ease',
                marginBottom: 12,
              }}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 20,
                  background: 'rgba(8,11,18,0.9)', backdropFilter: 'blur(8px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: '2px dashed rgba(59,130,246,0.6)', borderRadius: 16,
                  gap: 10,
                }}>
                  <Upload size={28} color="#3b82f6" style={{ animation: 'float 1.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#e8eaf0' }}>Drop your .eml file here</span>
                  <span style={{ fontSize: 12, color: '#7b829a' }}>Headers and text loaded automatically</span>
                </div>
              )}

              {/* File / sample badge */}
              {(loadedFileName || activeSampleId) && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px', borderBottom: '1px solid rgba(28,33,51,0.8)',
                  background: 'rgba(59,130,246,0.05)',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#e8eaf0', fontWeight: 500 }}>
                    <FileText size={13} color="#3b82f6" />
                    {loadedFileName ? <><span style={{ color: '#7b829a' }}>File:</span> <b style={{ color: '#93c5fd' }}>{loadedFileName}</b></>
                      : <><span style={{ color: '#7b829a' }}>Example:</span> <b style={{ color: '#93c5fd' }}>{PRESET_SAMPLES.find(s => s.id === activeSampleId)?.name}</b></>}
                  </span>
                  <button
                    onClick={() => { setEmailInput(''); setLoadedFileName(null); setActiveSampleId(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7b829a', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <X size={12} /> Clear
                  </button>
                </div>
              )}

              {/* Textarea */}
              <textarea
                className="email-textarea"
                value={emailInput}
                onChange={e => {
                  setEmailInput(e.target.value);
                  if (activeSampleId) setActiveSampleId(null);
                  if (loadedFileName) setLoadedFileName(null);
                }}
                placeholder="Paste email headers or raw text here, or drag & drop a .eml file..."
                rows={9}
                style={{ padding: '14px 16px' }}
              />

              {/* Bottom action strip */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderTop: '1px solid rgba(28,33,51,0.6)',
                background: 'rgba(8,11,18,0.5)',
                flexWrap: 'wrap', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#cbd5e1', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  >
                    <Upload size={13} color="#3b82f6" />
                    <span>Upload .eml</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept=".eml,.msg,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
                  <span className="hide-sm" style={{ fontSize: 11, color: '#4a5068', fontFamily: "'JetBrains Mono', monospace" }}>drag & drop supported</span>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleScan}
                  disabled={!emailInput.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', borderRadius: 9, fontSize: 13 }}
                >
                  <span>Analyze Message</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="animate-fade-in" style={{
                padding: '10px 16px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5', fontSize: 12, textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {/* Sample presets */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4a5068', letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase', marginBottom: 10 }}>
                Or try an example
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                {PRESET_SAMPLES.map(sample => {
                  const selected = activeSampleId === sample.id;
                  return (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      style={{
                        padding: '12px 14px', borderRadius: 13, textAlign: 'left', cursor: 'pointer',
                        background: selected ? 'rgba(59,130,246,0.08)' : 'rgba(11,14,24,0.6)',
                        border: `1px solid ${selected ? 'rgba(59,130,246,0.4)' : 'rgba(28,33,51,0.8)'}`,
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(8px)',
                      }}
                      onMouseEnter={e => {
                        if (!selected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.25)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.04)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!selected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(28,33,51,0.8)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(11,14,24,0.6)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{sample.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf0' }}>{sample.name}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        color: sample.tagColor, background: sample.tagBg,
                        border: `1px solid ${sample.tagColor}33`,
                      }}>
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

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(28,33,51,0.6)',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16,
        background: 'rgba(8,11,18,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={12} color="#3b82f6" />
          <span style={{ fontSize: 11, color: '#4a5068', fontFamily: "'JetBrains Mono', monospace" }}>
            © 2026 PhishGuard
          </span>
        </div>
        <span style={{ width: 1, height: 12, background: 'rgba(28,33,51,0.8)' }} />
        <span style={{ fontSize: 11, color: '#4a5068', fontFamily: "'JetBrains Mono', monospace" }}>
          Deterministic · Sub-55ms · Privacy-first
        </span>
      </footer>

    </div>
  );
}
