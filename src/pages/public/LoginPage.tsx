import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/backendService';
import { ArrowRight, Lock, Key, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (role: 'participant' | 'admin') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'participant' | 'admin'>('participant');
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      setIsLoading(true);
      const res = await loginUser(activeTab, {
        accessCode: accessCode || (activeTab === 'admin' ? 'admin123' : 'team-01'),
        password,
      });

      localStorage.setItem('robothon_auth_token', res.token);
      localStorage.setItem('robothon_user_role', activeTab);
      onLoginSuccess(activeTab);
      navigate(activeTab === 'admin' ? '/admin-dashboard' : '/team-dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative w-screen min-h-screen overflow-x-hidden overflow-y-auto selection:bg-[#D4621A] selection:text-[#FEF3E2] flex flex-col justify-between"
      style={{
        backgroundColor: '#FEF3E2',
        color: '#2A1A0E',
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      {/* 1. Top Minimal Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="text-xl font-normal tracking-tight text-[#2A1A0E]">
            Robothon 3.0
          </span>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs bg-[#2A1A0E] text-[#FEF3E2] tracking-tight">
            + Portal Access
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs border border-[#2A1A0E]/20 text-[#2A1A0E]/70 font-mono tracking-tight">
            Adaptive Scoring System
          </span>
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-xs font-normal underline hover:text-[#D4621A] ml-2 transition-colors"
          >
            Live Board →
          </button>
        </div>
      </header>

      {/* 2. Center Stage with Reaching Hands & Atmospheric Orb */}
      <div className="relative flex-1 flex flex-col items-center justify-center my-4 px-4 z-10">
        {/* Glowing Atmospheric Center Orb */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10"
          style={{
            width: 'min(90vw, 480px)',
            height: 'min(90vw, 480px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #F4AE52 0%, #D4621A 45%, rgba(254,243,226,0) 72%)',
            filter: 'blur(50px)',
            opacity: 0.65,
          }}
        />

        {/* Left Hand: Stylized Human Silhouette Reaching Inward */}
        <div
          className="absolute left-0 top-[38%] -translate-y-1/2 w-48 sm:w-72 lg:w-96 pointer-events-none opacity-40 lg:opacity-75 transition-opacity"
          style={{ transform: 'translateX(-15%)' }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 320 180" fill="none" className="w-full h-auto drop-shadow-md">
            {/* Forearm & Wrist */}
            <path
              d="M0 65 C60 60, 110 55, 160 58 C185 60, 205 68, 225 75 C240 70, 265 65, 290 62 C305 60, 318 64, 320 68 C318 73, 298 77, 275 80 C290 85, 305 92, 300 97 C285 100, 260 95, 240 92 C255 102, 270 112, 255 116 C235 115, 215 105, 195 98 C180 110, 160 118, 140 120 C90 125, 45 120, 0 115 Z"
              fill="#2A1A0E"
              opacity="0.9"
            />
            {/* Extended Index Finger Glow */}
            <circle cx="318" cy="67" r="4" fill="#F4AE52" className="animate-pulse" />
          </svg>
        </div>

        {/* Right Hand: Stylized Robotic / Bionic Silhouette Reaching Inward */}
        <div
          className="absolute right-0 top-[37%] -translate-y-1/2 w-48 sm:w-72 lg:w-96 pointer-events-none opacity-40 lg:opacity-75 transition-opacity"
          style={{ transform: 'translateX(15%)' }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 320 180" fill="none" className="w-full h-auto drop-shadow-md">
            {/* Bionic Arm Segments & Articulated Pistons */}
            <path
              d="M320 62 L240 58 L210 65 L175 62 L130 60 C110 59, 85 63, 0 66 C5 72, 35 74, 65 74 L105 76 L75 86 C85 91, 105 89, 135 84 L95 104 C108 108, 125 102, 155 94 L135 118 C150 122, 175 112, 195 102 L225 108 L260 115 L320 112 Z"
              fill="#2A1A0E"
              opacity="0.95"
            />
            {/* Mechanical Joints & Accents in Rust Orange */}
            <line x1="210" y1="65" x2="195" y2="102" stroke="#D4621A" strokeWidth="2.5" />
            <line x1="175" y1="62" x2="155" y2="94" stroke="#D4621A" strokeWidth="2.5" />
            <circle cx="105" cy="76" r="3.5" fill="#F4AE52" />
            <circle cx="0" cy="66" r="4.5" fill="#D4621A" className="animate-ping" />
          </svg>
        </div>

        {/* Center Headlines */}
        <div className="text-center mb-6 max-w-xl">
          <p className="text-xs uppercase tracking-widest text-[#8C7360] font-mono mb-1">
            Studio Neural Architecture
          </p>
          <h2
            className="text-4xl sm:text-5xl font-normal tracking-tight text-[#2A1A0E]"
            style={{ letterSpacing: '-0.035em' }}
          >
            Robothon 3.0
          </h2>
          <p
            className="text-xl sm:text-2xl mt-1 tracking-tight"
            style={{ letterSpacing: '-0.025em' }}
          >
            <span className="text-[#8C7360]">Engineering made </span>
            <span className="text-[#2A1A0E]">organic.</span>
          </p>
        </div>

        {/* Floating Translucent Login Module */}
        <div
          className="w-full max-w-[390px] rounded-2xl p-6 sm:p-7 shadow-2xl relative"
          style={{
            background: 'rgba(254, 243, 226, 0.82)',
            backdropFilter: 'blur(22px)',
            border: '1px solid rgba(42, 26, 14, 0.16)',
            boxShadow: '0 25px 50px -12px rgba(42, 26, 14, 0.18)',
          }}
        >
          {/* Pill Role Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[rgba(42,26,14,0.06)] border border-[rgba(42,26,14,0.08)] mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('participant');
                setAccessCode('');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-normal rounded-lg transition-all ${
                activeTab === 'participant'
                  ? 'bg-[#2A1A0E] text-[#FEF3E2] shadow-sm'
                  : 'text-[#2A1A0E]/60 hover:text-[#2A1A0E]'
              }`}
            >
              Participant Team
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setAccessCode('');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-normal rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-[#2A1A0E] text-[#FEF3E2] shadow-sm'
                  : 'text-[#2A1A0E]/60 hover:text-[#2A1A0E]'
              }`}
            >
              Tech Team Admin
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8C7360] font-mono mb-1">
                {activeTab === 'participant' ? 'Team Access Code' : 'Admin Security Key'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C7360]">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder={activeTab === 'participant' ? 'e.g. team-01 (default)' : 'admin123'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/70 border border-[#2A1A0E]/15 text-sm text-[#2A1A0E] placeholder-[#2A1A0E]/30 focus:outline-none focus:border-[#D4621A] transition-colors"
                />
              </div>
              <p className="text-[10px] text-[#8C7360] mt-1 font-mono">
                {activeTab === 'participant'
                  ? 'Default demo: AquaPulse Robotics'
                  : 'Passcode: admin123'}
              </p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8C7360] font-mono mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C7360]">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/70 border border-[#2A1A0E]/15 text-sm text-[#2A1A0E] placeholder-[#2A1A0E]/30 focus:outline-none focus:border-[#D4621A] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#D4621A] hover:bg-[#F4AE52] text-[#FEF3E2] hover:text-[#2A1A0E] font-normal text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 disabled:opacity-50"
              style={{ letterSpacing: '-0.025em' }}
            >
              {isLoading
                ? 'Authenticating...'
                : `Enter ${activeTab === 'participant' ? 'Participant Portal' : 'Admin Portal'}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Bottom Corner Anchors (From NeuralKinetics Reference) */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 text-xs border-t border-[#2A1A0E]/10">
        <div className="text-left max-w-md">
          <p className="font-mono text-[11px] text-[#8C7360] uppercase tracking-wider">
            Autonomous Naval & Rover Dynamics
          </p>
          <p className="text-[#2A1A0E]/75 mt-0.5 leading-relaxed">
            Unifying hardware precision with live telemetry to power the next round of Robothon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-mono border border-[#2A1A0E]/20 text-[#2A1A0E]/80">
            Round 1: Quiz
          </span>
          <span className="px-3 py-1 rounded-full text-[11px] font-mono border border-[#2A1A0E]/20 text-[#2A1A0E]/80">
            Top 50 Cut-off
          </span>
          <span className="px-3 py-1 rounded-full text-[11px] font-mono border border-[#2A1A0E]/20 text-[#2A1A0E]/80">
            Live Checkpoints
          </span>
        </div>
      </footer>
    </div>
  );
};
