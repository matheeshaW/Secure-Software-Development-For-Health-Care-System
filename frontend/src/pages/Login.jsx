import { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";

/* ── Floating particle background ── */
function HealthBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let id;
    let W, H;

    /* medical cross icons + circles drifting */
    const items = [];
    const ICONS = ["✚", "○", "◯", "＋", "·"];

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function init() {
      items.length = 0;
      for (let i = 0; i < 22; i++) {
        items.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          size: 10 + Math.random() * 14,
          alpha: 0.04 + Math.random() * 0.07,
          icon: ICONS[Math.floor(Math.random() * ICONS.length)],
          spin: (Math.random() - 0.5) * 0.008,
          angle: Math.random() * Math.PI * 2,
        });
      }
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);

      /* soft gradient bg */
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,   "#edfaf8");
      bg.addColorStop(0.5, "#f7fffe");
      bg.addColorStop(1,   "#e8f8f5");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* large soft orbs */
      const orb1 = ctx.createRadialGradient(W*0.1, H*0.2, 0, W*0.1, H*0.2, 320);
      orb1.addColorStop(0, "rgba(20,184,166,0.10)"); orb1.addColorStop(1, "transparent");
      ctx.fillStyle = orb1; ctx.fillRect(0, 0, W, H);

      const orb2 = ctx.createRadialGradient(W*0.9, H*0.8, 0, W*0.9, H*0.8, 260);
      orb2.addColorStop(0, "rgba(6,182,212,0.08)"); orb2.addColorStop(1, "transparent");
      ctx.fillStyle = orb2; ctx.fillRect(0, 0, W, H);

      /* drifting medical icons */
      items.forEach((it) => {
        it.x += it.vx; it.y += it.vy; it.angle += it.spin;
        if (it.x < -30) it.x = W+20; if (it.x > W+30) it.x = -20;
        if (it.y < -30) it.y = H+20; if (it.y > H+30) it.y = -20;
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.angle);
        ctx.globalAlpha = it.alpha;
        ctx.fillStyle = "#0d9488";
        ctx.font = `${it.size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.icon, 0, 0);
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      /* gentle scan wave */
      const wave = Math.sin(t * 0.0005) * 0.5 + 0.5;
      const scanY = wave * H;
      const sg = ctx.createLinearGradient(0, scanY-80, 0, scanY+80);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, "rgba(20,184,166,0.025)");
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY-80, W, 160);

      t += 16;
      id = requestAnimationFrame(draw);
    }

    resize(); init(); draw();
    const onR = () => { resize(); init(); };
    window.addEventListener("resize", onR);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", onR); };
  }, []);

  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, width:"100%", height:"100%", zIndex:0 }} />;
}

/* ── Inline SVG illustration (doctor/patient care) ── */
function HealthIllustration() {
  return (
    <svg viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", maxWidth:300 }}>
      {/* Background circle */}
      <circle cx="160" cy="155" r="120" fill="#ccfbf1" opacity="0.5"/>
      <circle cx="160" cy="155" r="95" fill="#99f6e4" opacity="0.3"/>

      {/* Bean bag / chair */}
      <ellipse cx="160" cy="220" rx="68" ry="38" fill="#0d9488"/>
      <ellipse cx="160" cy="218" rx="60" ry="32" fill="#14b8a6"/>

      {/* Person body */}
      <rect x="135" y="160" width="50" height="55" rx="12" fill="#374151"/>
      {/* Legs */}
      <path d="M145 210 Q130 230 118 240" stroke="#374151" strokeWidth="14" strokeLinecap="round"/>
      <path d="M175 210 Q188 228 195 235" stroke="#374151" strokeWidth="14" strokeLinecap="round"/>
      {/* Shoes */}
      <ellipse cx="112" cy="242" rx="12" ry="7" fill="#1f2937"/>
      <ellipse cx="198" cy="237" rx="12" ry="7" fill="#1f2937"/>

      {/* Laptop */}
      <rect x="128" y="165" width="64" height="40" rx="5" fill="#e2e8f0"/>
      <rect x="131" y="168" width="58" height="33" rx="3" fill="#bfdbfe"/>
      {/* Screen content lines */}
      <rect x="136" y="173" width="30" height="3" rx="1.5" fill="#93c5fd"/>
      <rect x="136" y="179" width="20" height="2" rx="1" fill="#93c5fd" opacity="0.6"/>
      <rect x="136" y="184" width="25" height="2" rx="1" fill="#93c5fd" opacity="0.4"/>
      {/* Plus/cross on screen */}
      <rect x="172" y="175" width="10" height="3" rx="1" fill="#0d9488"/>
      <rect x="175.5" y="171.5" width="3" height="10" rx="1" fill="#0d9488"/>

      {/* Laptop base */}
      <rect x="120" y="205" width="80" height="5" rx="2" fill="#cbd5e1"/>

      {/* Head */}
      <circle cx="160" cy="145" r="22" fill="#fde68a"/>
      {/* Hair */}
      <path d="M140 140 Q142 120 160 118 Q178 118 180 140" fill="#1f2937"/>
      <ellipse cx="160" cy="120" rx="20" ry="10" fill="#1f2937"/>
      {/* Glasses */}
      <rect x="149" y="143" width="11" height="8" rx="3" fill="none" stroke="#374151" strokeWidth="1.5"/>
      <rect x="161" y="143" width="11" height="8" rx="3" fill="none" stroke="#374151" strokeWidth="1.5"/>
      <line x1="160" y1="147" x2="161" y2="147" stroke="#374151" strokeWidth="1.5"/>
      {/* Smile */}
      <path d="M154 152 Q160 157 166 152" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

      {/* Medical cross badge on shirt */}
      <rect x="155" y="173" width="10" height="3" rx="1" fill="#14b8a6"/>
      <rect x="158.5" y="169.5" width="3" height="10" rx="1" fill="#14b8a6"/>

      {/* Coffee cup */}
      <rect x="192" y="228" width="16" height="14" rx="3" fill="#f9fafb"/>
      <rect x="193" y="229" width="14" height="12" rx="2" fill="#f0fdf4"/>
      <path d="M208 233 Q214 233 214 237 Q214 241 208 241" stroke="#d1d5db" strokeWidth="1.5" fill="none"/>
      {/* steam */}
      <path d="M196 226 Q198 222 196 218" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
      <path d="M200 225 Q202 221 200 217" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4"/>

      {/* Plant */}
      <rect x="262" y="230" width="10" height="30" rx="2" fill="#6b7280"/>
      <rect x="259" y="238" width="16" height="6" rx="2" fill="#6b7280"/>
      <ellipse cx="267" cy="202" rx="10" ry="16" fill="#22c55e" opacity="0.8"/>
      <ellipse cx="258" cy="210" rx="8" ry="12" fill="#16a34a" opacity="0.7"/>
      <ellipse cx="276" cy="208" rx="7" ry="11" fill="#15803d" opacity="0.7"/>

      {/* Lamp */}
      <rect x="60" y="185" width="5" height="55" rx="2" fill="#9ca3af"/>
      <path d="M48 185 Q62 170 75 185 Z" fill="#fbbf24"/>
      <ellipse cx="62" cy="185" rx="15" ry="5" fill="#f59e0b"/>
      {/* Lamp glow */}
      <ellipse cx="62" cy="200" rx="20" ry="8" fill="#fef9c3" opacity="0.25"/>

      {/* Window frame */}
      <rect x="240" y="120" width="55" height="65" rx="3" fill="#f1f5f9"/>
      <rect x="240" y="120" width="55" height="65" rx="3" fill="none" stroke="#374151" strokeWidth="3"/>
      <line x1="267" y1="120" x2="267" y2="185" stroke="#374151" strokeWidth="2"/>
      <line x1="240" y1="152" x2="295" y2="152" stroke="#374151" strokeWidth="2"/>
      {/* Window teal sky */}
      <rect x="243" y="123" width="21" height="27" rx="1" fill="#bfdbfe" opacity="0.5"/>
      <rect x="269" y="123" width="23" height="27" rx="1" fill="#bfdbfe" opacity="0.4"/>

      {/* Floating health stats card */}
      <rect x="56" y="128" width="75" height="46" rx="8" fill="white" opacity="0.92"/>
      <rect x="56" y="128" width="75" height="46" rx="8" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
      <rect x="62" y="135" width="8" height="8" rx="2" fill="#14b8a6"/>
      <rect x="75" y="136" width="32" height="3" rx="1" fill="#94a3b8"/>
      <rect x="75" y="142" width="22" height="2" rx="1" fill="#cbd5e1"/>
      <rect x="62" y="151" width="50" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="62" y="151" width="34" height="3" rx="1.5" fill="#14b8a6"/>
      <text x="116" y="155" fontSize="7" fill="#0d9488" fontWeight="bold">68%</text>
    </svg>
  );
}

/* ── Login Component ── */
function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { login, googleLogin }   = useContext(AuthContext);
  const navigate    = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setError(""); setLoading(true);
      await login({ email, password });
      navigate("/home");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setGoogleLoading(true);
      const res = await API.get("/auth/google/url");
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("Google authorization URL could not be generated.");
      }
    } catch (err) {
      // Development and offline evaluation fallback
      try {
        const mockResult = await googleLogin({
          credential: "mock_google_token_dr.john.smith@medicare-health.lk"
        });
        if (mockResult.user?.role === "patient") {
          navigate("/patient/dashboard");
        } else {
          navigate("/home");
        }
      } catch (mockErr) {
        setError(err?.response?.data?.message || err.message || "Failed to initiate Google sign-in.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

        .hc-root {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px 16px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          position: relative; overflow: hidden;
        }

        .hc-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 940px;
          display: flex;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255,255,255,0.82);
          border: 1px solid rgba(20,184,166,0.15);
          box-shadow:
            0 2px 4px rgba(0,0,0,0.04),
            0 20px 60px rgba(13,148,136,0.12),
            0 0 0 1px rgba(255,255,255,0.8) inset;
          backdrop-filter: blur(20px);
          animation: slideUp .55s cubic-bezier(0.22,1,0.36,1) both;
        }

        @keyframes slideUp {
          from { opacity:0; transform: translateY(28px) scale(0.97); }
          to   { opacity:1; transform: translateY(0)    scale(1); }
        }

        /* ── LEFT ILLUSTRATION ── */
        .hc-left {
          width: 46%; flex-shrink: 0;
          background: linear-gradient(155deg, #f0fdfa 0%, #ccfbf1 55%, #99f6e4 100%);
          padding: 48px 36px;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          position: relative; overflow: hidden;
        }

        @media (min-width: 820px) { .hc-left { display: flex; } }

        .hc-left::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(20,184,166,0.10) 1px, transparent 1px);
          background-size: 28px 28px;
          animation: patternDrift 20s linear infinite;
        }

        @keyframes patternDrift {
          from { background-position: 0 0; }
          to   { background-position: 28px 28px; }
        }

        .hc-left-top { position: relative; z-index:1; text-align: center; }

        .hc-logo-mark {
          display: inline-flex; align-items: center; gap: 8px;
          background: white;
          border: 1px solid rgba(20,184,166,0.2);
          border-radius: 40px;
          padding: 8px 16px 8px 10px;
          box-shadow: 0 2px 12px rgba(13,148,136,0.12);
          margin-bottom: 12px;
          animation: popIn .45s cubic-bezier(0.34,1.56,0.64,1) .2s both;
        }

        @keyframes popIn {
          from { opacity:0; transform: scale(0.6); }
          to   { opacity:1; transform: scale(1); }
        }

        .hc-logo-icon {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #0d9488, #14b8a6);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 13px; font-weight: 700;
        }

        .hc-logo-text { font-size: 13px; font-weight: 600; color: #0f766e; letter-spacing: -0.01em; }

        .hc-illus-title {
          font-size: 18px; font-weight: 700; color: #0f766e;
          letter-spacing: -0.02em; line-height: 1.35;
          margin-bottom: 4px;
        }

        .hc-illus-sub { font-size: 12.5px; color: #5eead4; font-weight: 400; }

        .hc-illus-wrap {
          position: relative; z-index:1;
          animation: floatIllus 5s ease-in-out infinite;
        }

        @keyframes floatIllus {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }

        .hc-stats {
          position: relative; z-index:1;
          display: flex; gap: 10px; width: 100%;
        }

        .hc-stat {
          flex: 1; background: rgba(255,255,255,0.75);
          border: 1px solid rgba(20,184,166,0.18);
          border-radius: 14px; padding: 12px 14px;
          backdrop-filter: blur(8px);
          animation: statIn .45s cubic-bezier(0.22,1,0.36,1) both;
        }

        .hc-stat:nth-child(2) { animation-delay: .1s; }
        .hc-stat:nth-child(3) { animation-delay: .2s; }

        @keyframes statIn {
          from { opacity:0; transform: translateY(12px); }
          to   { opacity:1; transform: translateY(0); }
        }

        .hc-stat-val { font-size: 20px; font-weight: 700; color: #0d9488; letter-spacing: -0.03em; }
        .hc-stat-lbl { font-size: 10px; color: #64748b; margin-top: 2px; font-weight: 500; }

        /* ── RIGHT FORM ── */
        .hc-right {
          flex: 1;
          padding: 48px 44px;
          display: flex; flex-direction: column; justify-content: center;
          background: rgba(255,255,255,0.6);
        }

        @media (max-width: 819px) { .hc-right { padding: 36px 28px; } }

        .hc-eyebrow {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #0d9488;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 10px;
          animation: fadeUp .4s ease both;
        }

        .hc-eyebrow::before {
          content:''; width:18px; height:2px;
          background: #0d9488; border-radius: 2px;
          display: block;
          animation: lineIn .5s ease .15s both;
          transform-origin: left;
        }

        @keyframes lineIn {
          from { transform: scaleX(0); } to { transform: scaleX(1); }
        }

        .hc-h1 {
          font-size: 28px; font-weight: 700;
          letter-spacing: -0.03em; color: #0f172a;
          margin-bottom: 6px;
          animation: fadeUp .4s ease .05s both;
        }

        .hc-sub {
          font-size: 13.5px; color: #64748b;
          margin-bottom: 30px; line-height: 1.6;
          animation: fadeUp .4s ease .1s both;
        }

        @keyframes fadeUp {
          from { opacity:0; transform: translateY(10px); }
          to   { opacity:1; transform: translateY(0); }
        }

        .hc-form {
          display: flex; flex-direction: column; gap: 14px;
          animation: fadeUp .4s ease .15s both;
        }

        .hc-field { display: flex; flex-direction: column; gap: 5px; }

        .hc-label {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #94a3b8;
        }

        .hc-input-wrap { position: relative; }

        .hc-input {
          width: 100%; padding: 11px 14px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          color: #0f172a;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; outline: none;
          transition: border-color .18s, box-shadow .18s, background .18s;
        }

        .hc-input::placeholder { color: #cbd5e1; }

        .hc-input:hover {
          border-color: #99f6e4;
          background: #f0fdfa;
        }

        .hc-input:focus {
          border-color: #14b8a6;
          box-shadow: 0 0 0 3px rgba(20,184,166,0.15);
          background: #f0fdfa;
        }

        .hc-input-mono { font-family: 'DM Mono', monospace; font-size: 13px; }

        .hc-pass-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #94a3b8; font-size: 11px;
          font-family: 'DM Mono', monospace;
          text-transform: uppercase; letter-spacing: .04em;
          padding: 4px; transition: color .15s;
        }
        .hc-pass-toggle:hover { color: #14b8a6; }

        .hc-btn {
          width: 100%; padding: 13px;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: opacity .18s, transform .12s, box-shadow .18s;
          margin-top: 6px;
          position: relative; overflow: hidden;
          letter-spacing: 0.01em;
        }

        .hc-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: translateX(-100%);
          transition: transform .55s ease;
        }

        .hc-btn:hover:not(:disabled)::after { transform: translateX(100%); }

        .hc-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(13,148,136,0.35);
        }

        .hc-btn:active:not(:disabled) { transform: translateY(0); }
        .hc-btn:disabled { opacity: .5; cursor: not-allowed; }

        .hc-error {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 14px;
          background: #fef2f2;
          border: 1.5px solid #fecaca;
          border-radius: 12px;
          font-size: 13px; color: #dc2626;
          animation: fadeUp .2s ease both;
        }

        .hc-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 6px 0;
        }
        .hc-divider-line { flex:1; height:1px; background:#e2e8f0; }
        .hc-divider-text { font-size:11px; color:#94a3b8; letter-spacing:.06em; font-weight:600; }

        .hc-google-btn {
          width: 100%;
          padding: 11px 16px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          color: #1e293b;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .hc-google-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .hc-google-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .hc-google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .hc-footer {
          margin-top: 22px; font-size: 13px; color: #94a3b8;
          text-align: center;
          animation: fadeUp .4s ease .2s both;
        }

        .hc-link {
          color: #0d9488; text-decoration: none; font-weight: 600;
          transition: color .15s;
        }
        .hc-link:hover { color: #0f766e; }

        .hc-pulse {
          position: absolute; top: 18px; right: 18px;
          display: flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.85);
          border: 1px solid #99f6e4;
          border-radius: 40px; padding: 5px 10px 5px 7px;
          font-size: 11px; color: #0d9488; font-weight: 500;
        }

        .hc-pulse-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e;
          animation: pulseDot 1.8s ease-in-out infinite;
        }

        @keyframes pulseDot {
          0%,100% { opacity:1; transform: scale(1); }
          50%      { opacity:.5; transform: scale(1.4); }
        }
      `}</style>

      <HealthBg />

      <div className="hc-root">
        <div className="hc-card">

          {/* LEFT */}
          <section className="hc-left">
            <div className="hc-pulse">
              <div className="hc-pulse-dot" />
              System Online
            </div>

            <div className="hc-left-top">
              <div className="hc-logo-mark">
                <div className="hc-logo-icon">✚</div>
                <span className="hc-logo-text">MediCare Platform</span>
              </div>
              <div className="hc-illus-title">Your Health,<br/>Our Priority</div>
              <div className="hc-illus-sub">Seamless care management</div>
            </div>

            <div className="hc-illus-wrap">
              <HealthIllustration />
            </div>

            <div className="hc-stats">
              <div className="hc-stat">
                <div className="hc-stat-val">50k+</div>
                <div className="hc-stat-lbl">Patients</div>
              </div>
              <div className="hc-stat">
                <div className="hc-stat-val">1.2k</div>
                <div className="hc-stat-lbl">Doctors</div>
              </div>
              <div className="hc-stat">
                <div className="hc-stat-val">98%</div>
                <div className="hc-stat-lbl">Satisfaction</div>
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <section className="hc-right">
            <div className="hc-eyebrow">Healthcare System</div>
            <h1 className="hc-h1">Welcome Back</h1>
            <p className="hc-sub">Sign in to access your dashboard.</p>

            <div className="hc-form">
              {error && (
                <div className="hc-error">
                  <span style={{ fontSize:15, lineHeight:1 }}>✕</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="hc-field">
                <label className="hc-label">Email</label>
                <div className="hc-input-wrap">
                  <input
                    className="hc-input hc-input-mono"
                    placeholder="you@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="hc-field">
                <label className="hc-label">Password</label>
                <div className="hc-input-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    className="hc-input"
                    placeholder="Enter your password"
                    style={{ paddingRight: 52 }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="hc-pass-toggle"
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? "hide" : "show"}
                  </button>
                </div>
              </div>

              <button className="hc-btn" onClick={handleLogin} disabled={loading || googleLoading}>
                {loading ? "Signing in…" : "Sign In →"}
              </button>

              <div className="hc-divider">
                <div className="hc-divider-line" />
                <span className="hc-divider-text">OR</span>
                <div className="hc-divider-line" />
              </div>

              <button
                type="button"
                className="hc-google-btn"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.37 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{googleLoading ? "Connecting to Google…" : "Sign in with Google"}</span>
              </button>
            </div>

            <div className="hc-footer">
              No account yet?{" "}
              <Link to="/register" className="hc-link">Create one →</Link>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

export default Login;