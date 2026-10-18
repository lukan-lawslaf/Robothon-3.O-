import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/backendService';
import { Anchor, Shield, Users, ArrowRight, Lock, Key } from 'lucide-react';

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
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-3 shadow-md">
            <Anchor className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Robothon 3.O</h2>
          <p className="text-xs text-slate-400 mt-1">
            Boat-Building & Live Scoring Platform
          </p>
        </div>

        {/* Tab Toggle: Participant vs Admin */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('participant');
              setAccessCode('');
              setPassword('');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'participant'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Participant Login
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setAccessCode('');
              setPassword('');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Tech Team Admin
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
              {activeTab === 'participant' ? 'Team ID / Access Code' : 'Admin ID'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={activeTab === 'participant' ? 'e.g. team-01 (or leave blank for demo)' : 'admin123'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeTab === 'participant'
                ? 'Tip: Leave blank to log in as default team "AquaPulse Robotics".'
                : 'Tip: Use passcode "admin123" for admin access.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : `Enter ${activeTab === 'participant' ? 'Participant Portal' : 'Admin Portal'}`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => navigate('/leaderboard')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            View Live Public Leaderboard →
          </button>
        </div>
      </div>
    </div>
  );
};
