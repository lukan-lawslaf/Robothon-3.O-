import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types/auth';
import { login } from '../../services/authService';
import { Button } from '../../components/common/Button';
import { Anchor, Shield, Users, ArrowRight, Lock, Key } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>('participant');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      setIsLoading(true);
      const res = await login({ accessCode: accessCode || (role === 'admin' ? 'admin123' : 'team-01'), role });
      localStorage.setItem('robothon_auth_token', res.token);
      localStorage.setItem('robothon_user_role', role);
      onLoginSuccess(role);
      navigate(role === 'admin' ? '/admin' : '/participant');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Emblem */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 p-0.5 shadow-xl shadow-cyan-500/20 mb-3">
            <div className="w-full h-full bg-[#070d1e] rounded-[14px] flex items-center justify-center">
              <Anchor className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Robothon 3.O</h2>
          <p className="text-xs text-slate-400 mt-1">Autonomous & RC Boat-Building Competition</p>
        </div>

        {/* Role Toggle Switch */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('participant');
              setAccessCode('');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              role === 'participant'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Participant Team
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setAccessCode('');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              role === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Tech Admin
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {role === 'participant' ? 'Team Access Code' : 'Admin Security Passcode'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                {role === 'participant' ? <Key className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <input
                type={role === 'admin' ? 'password' : 'text'}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={role === 'participant' ? 'e.g. team-01 (or leave blank for demo)' : 'admin123'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {role === 'participant'
                ? 'Tip: Leave blank to preview as Team "AquaPulse Robotics".'
                : 'Tip: Use passcode "admin123" for admin access.'}
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
          >
            Enter {role === 'participant' ? 'Participant Portal' : 'Admin Portal'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            View Live Leaderboard without logging in →
          </button>
        </div>
      </div>
    </div>
  );
};
