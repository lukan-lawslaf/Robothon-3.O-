import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../../services/backendService';
import { ArrowRight, Lock, Key, Sparkles, Shield, Users } from 'lucide-react';

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
      className="relative w-screen min-h-screen overflow-x-hidden overflow-y-auto selection:bg-[#ea580c] selection:text-white flex flex-col justify-between text-white"
      style={{
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover pointer-events-none -z-20 scale-105"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
      />

      {/* Cinematic Vignette / Glass Tint Overlay */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(15, 10, 7, 0.55) 0%, rgba(10, 7, 5, 0.85) 75%, rgba(5, 3, 2, 0.95) 100%)',
          backdropFilter: 'blur(1.5px)',
        }}
      />

      {/* 1. Top Minimal Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img
            src="/robotics_club_logo.svg"
            alt="Robotics Club"
            className="h-8 w-auto object-contain drop-shadow"
          />
          <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />
          <div className="flex items-center">
            <span className="font-bold tracking-wider text-white text-base">ROBOTHON</span>
            <span className="font-bold text-[#ea580c] text-base ml-1">3.0</span>
          </div>
          <span className="hidden sm:inline-block px-3 py-0.5 rounded-full text-[11px] font-mono bg-white/10 text-white/90 border border-white/15 tracking-tight backdrop-blur-md">
            + Portal Access
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block px-3 py-1 rounded-full text-xs border border-white/15 bg-black/30 backdrop-blur-md text-white/80 font-mono tracking-tight">
            Adaptive Scoring System
          </span>
          <Link
            to="/leaderboard"
            className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-[#ea580c] text-white border border-white/20 hover:border-transparent transition-all shadow-md flex items-center gap-1.5"
          >
            <span>Live Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. Center Stage with Translucent Floating Login Module */}
      <div className="relative flex-1 flex flex-col items-center justify-center my-6 px-4 z-10">
        {/* Subtle glowing ambient pulse behind card */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10"
          style={{
            width: 'min(90vw, 520px)',
            height: 'min(90vw, 520px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234, 88, 12, 0.22) 0%, rgba(212, 98, 26, 0.08) 50%, transparent 75%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Center Headlines */}
        <div className="text-center mb-6 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono text-[11px] uppercase tracking-wider mb-3 backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-[#ea580c]" />
            Studio Neural Architecture
          </div>
          <h1
            className="text-3xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-md"
            style={{ letterSpacing: '-0.035em' }}
          >
            ROBOTHON <span className="text-[#ea580c]">3.0</span>
          </h1>
          <p
            className="text-sm sm:text-base mt-2 tracking-tight text-stone-300 font-normal"
            style={{ letterSpacing: '-0.015em' }}
          >
            Engineering precision meets autonomous telemetry.
          </p>
        </div>

        {/* Floating Glassmorphism Login Card */}
        <div
          className="w-full max-w-[420px] rounded-2xl p-6 sm:p-8 relative shadow-2xl transition-all"
          style={{
            background: 'rgba(20, 14, 10, 0.78)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(234, 88, 12, 0.25)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(234, 88, 12, 0.15)',
          }}
        >
          {/* Pill Role Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/50 border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('participant');
                setAccessCode('');
                setErrorMessage(null);
              }}
              className={`py-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'participant'
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white shadow-lg font-semibold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Participant Team</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setAccessCode('');
                setErrorMessage(null);
              }}
              className={`py-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white shadow-lg font-semibold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Tech Admin</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-mono mb-1.5">
                {activeTab === 'participant' ? 'Team Access Code' : 'Admin Security Key'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder={activeTab === 'participant' ? 'e.g. team-01 (default)' : 'admin123'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] transition-all"
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1.5 font-mono flex items-center justify-between">
                <span>
                  {activeTab === 'participant'
                    ? 'Default: AquaPulse Robotics'
                    : 'Passcode: admin123'}
                </span>
                <span className="text-orange-400/80">Round 2 Ready</span>
              </p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-mono mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#f97316] hover:to-[#ea580c] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50 hover:shadow-orange-500/25 transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              style={{ letterSpacing: '-0.015em' }}
            >
              {isLoading
                ? 'Authenticating...'
                : `Enter ${activeTab === 'participant' ? 'Participant Portal' : 'Admin Portal'}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Bottom Corner Anchors */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 text-xs border-t border-white/10">
        <div className="text-left max-w-md">
          <p className="font-mono text-[11px] text-orange-400/90 uppercase tracking-wider">
            Autonomous Naval & Rover Dynamics
          </p>
          <p className="text-stone-400 mt-0.5 leading-relaxed">
            Unifying hardware precision with live telemetry to power the next round of Robothon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-mono border border-white/15 bg-black/40 text-stone-300 backdrop-blur-md">
            Round 1: Quiz
          </span>
          <span className="px-3 py-1 rounded-full text-[11px] font-mono border border-white/15 bg-black/40 text-stone-300 backdrop-blur-md">
            Top 50 Cut-off
          </span>
          <span className="px-3 py-1 rounded-full text-[11px] font-mono border border-white/15 bg-black/40 text-orange-300/90 backdrop-blur-md">
            Live Checkpoints
          </span>
        </div>
      </footer>
    </div>
  );
};
