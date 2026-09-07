import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, Sparkles, Terminal } from 'lucide-react';
import { supabaseService } from '../lib/supabaseService';

interface AdminLoginModalProps {
  onLoginSuccess: (token: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('অনুগ্রহ করে এডমিন পাসওয়ার্ড প্রদান করুন!');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await supabaseService.adminLogin(password.trim());
      if (result.success) {
        onLoginSuccess('authenticated');
      } else {
        setError(result.error || 'ভুল এডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।');
      }
    } catch (err: any) {
      setError('পাসওয়ার্ড যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050A18]/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#0F1A36] via-[#0B132B] to-[#070D1E] border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(0,229,255,0.25)] overflow-hidden">
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Avatar and Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <img
              src="https://i.ibb.co/B5k2894W/a1fd0ad10f4d.jpg"
              alt="Ishak AI"
              className="w-16 h-16 rounded-full border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.6)] object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-[#0B132B] rounded-full animate-ping" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-[#0B132B] rounded-full" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>ADMIN SECURITY GATEWAY</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              ISHAK AI PRO CLOUD
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              এডমিন প্যানেলে প্রবেশ করতে আপনার নিরাপত্তা পাসওয়ার্ড লিখুন
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 animate-in shake duration-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>এডমিন পাসওয়ার্ড:</span>
              </label>
              <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>সুরক্ষিত</span>
              </span>
            </div>

            <div className="relative">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="এখানে এডমিন পাসওয়ার্ড লিখুন..."
                autoFocus
                className="w-full px-4 py-3 pr-11 rounded-2xl bg-black/60 border border-cyan-500/40 text-white placeholder-gray-500 text-sm font-mono tracking-wider outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-300 p-1 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="admin-login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 active:scale-[0.98] text-[#050A18] font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,229,255,0.4)] transition disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>প্যানেলে প্রবেশ করুন</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>256-Bit Encrypted</span>
          </div>
          <span className="text-gray-500">ভিতর থেকে পাসওয়ার্ড বদলানো যাবে</span>
        </div>
      </div>
    </div>
  );
};
