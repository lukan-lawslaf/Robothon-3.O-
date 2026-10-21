import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, isAdmin, verifyOcPin, isOcPinUnlocked } from '../../services/authService';
import { ArrowRight, Lock, Key, Shield, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'participant' | 'admin'>('participant');
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OC PIN Security Gate
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    localStorage.removeItem('oc_pin_unlocked');
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Video autoplay was prevented, retrying on interaction:', err);
        });
      }
    }
  }, []);

  const handleSelectTab = async (tab: 'participant' | 'admin') => {
    setErrorMessage(null);
    if (tab === 'admin') {
      const unlocked = await isOcPinUnlocked();
      if (!unlocked) {
        setEnteredPin('');
        setPinError('');
        setShowPinModal(true);
        return;
      }
    }
    setActiveTab(tab);
    setAccessCode('');
    setPassword('');
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = enteredPin.trim();
    if (!pin) {
      setPinError('Please enter the security PIN.');
      return;
    }
    try {
      setIsVerifyingPin(true);
      setPinError('');
      const ok = await verifyOcPin(pin);
      if (ok) {
        setShowPinModal(false);
        setActiveTab('admin');
        setEnteredPin('');
        setPinError('');
      } else {
        setPinError('Invalid OC Clearance PIN. Access Denied.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Invalid OC Clearance PIN. Access Denied.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      setIsLoading(true);
      const res = await loginUser(activeTab, {
        accessCode: accessCode.trim(),
        password,
      });

      navigate(isAdmin(res.account) ? '/admin-dashboard' : '/team-dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative w-full min-h-screen overflow-x-hidden overflow-y-auto selection:bg-[#ea580c] selection:text-white flex flex-col justify-between text-white bg-[#0e0a07]"
      style={{
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      {/* 0. Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source src="/Human_and_robotic_hands_touching_20261019014013.mp4" type="video/mp4" />
      </video>

      {/* 0. Vignette / Glass Tint Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(14, 10, 7, 0.25) 0%, rgba(10, 7, 5, 0.55) 70%, rgba(5, 3, 2, 0.8) 100%)',
          backdropFilter: 'blur(0.5px)',
        }}
      />

      {/* 1. Top Minimal Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
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
          
          <Link
            to="/leaderboard"
            className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-[#ea580c] text-white border border-white/20 hover:border-transparent transition-all shadow-md flex items-center gap-1.5 backdrop-blur-md"
          >
            <span>Live Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. Center Stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6 px-4">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[2]"
          style={{
            width: 'min(90vw, 520px)',
            height: 'min(90vw, 520px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234, 88, 12, 0.22) 0%, rgba(212, 98, 26, 0.08) 50%, transparent 75%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Center Headlines */}
        <div className="text-center mb-6 max-w-xl relative z-10">
          
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
          className="w-full max-w-[420px] rounded-2xl p-6 sm:p-8 relative z-10 shadow-2xl transition-all"
          style={{
            background: 'rgba(20, 14, 10, 0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(234, 88, 12, 0.3)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(234, 88, 12, 0.18)',
          }}
        >
          {/* Pill Role Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/60 border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => handleSelectTab('participant')}
              className={`py-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
              onClick={() => handleSelectTab('admin')}
              className={`py-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white shadow-lg font-semibold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin / Super Admin</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-[11px] uppercase tracking-wider text-stone-400 font-mono mb-1.5">
                {activeTab === 'participant' ? 'Participant email' : 'Admin ID or email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={activeTab === 'participant' ? 'email' : 'text'}
                  required
                  autoComplete="username"
                  id="login-email"
                  placeholder={activeTab === 'participant' ? 'e.g. leader@bmu.edu.in' : 'e.g. superadmin or admin1'}
                  aria-label={activeTab === 'participant' ? 'Participant email' : 'Admin ID or email'}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] transition-all"
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1.5 font-mono flex items-center justify-between">
                <span>
                  {activeTab === 'participant'
                    ? 'Use your registered team account'
                    : 'Permissions are assigned to your account'}
                </span>
              </p>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[11px] uppercase tracking-wider text-stone-400 font-mono mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  id="login-password"
                  aria-label="Account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] transition-all"
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

      {/* OC PIN Modal Gate */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-sm rounded-3xl p-6 sm:p-7 border border-[#ea580c]/50 shadow-2xl text-center space-y-4"
            style={{
              background: 'rgba(20, 14, 10, 0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#ea580c]/20 border border-[#ea580c]/40 flex items-center justify-center text-[#ea580c] mx-auto shadow-lg">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ea580c] font-bold block">
                ORGANIZING COMMITTEE SECURITY GATE
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Enter OC Clearance PIN
              </h3>
              <p className="text-xs text-stone-400 font-mono mt-1">
                Administrative access requires Organizing Committee security authorization.
              </p>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  required
                  aria-label="OC clearance PIN"
                  placeholder="Security PIN"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  className="w-48 mx-auto text-center tracking-[0.3em] text-xl font-mono font-bold py-2.5 rounded-xl bg-black/70 border border-[#ea580c]/50 text-white placeholder:text-stone-600 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-white/20 text-stone-300 font-mono text-xs hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPin}
                  className="py-2.5 px-4 rounded-xl bg-[#ea580c] text-white font-mono text-xs font-bold uppercase hover:bg-[#d4621a] shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingPin ? 'Verifying...' : 'Verify Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
    </div>
  );
};
