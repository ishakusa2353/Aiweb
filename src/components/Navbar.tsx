import React from 'react';
import { ShieldCheck, Zap, KeyRound, Code2, Database, Volume2, VolumeX, BookOpen, Lock, LogOut } from 'lucide-react';

interface NavbarProps {
  activeTab: 'keys' | 'simulator' | 'bookmarklet';
  setActiveTab: (tab: 'keys' | 'simulator' | 'bookmarklet') => void;
  supabaseStatus: {
    isSupabaseActive: boolean;
    storageType: string;
    keyCount: number;
  };
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  supabaseStatus,
  soundEnabled,
  setSoundEnabled,
  onOpenChangePassword,
  onLogout,
}) => {
  return (
    <header className="border-b border-cyan-400/35 border-t border-t-white/15 bg-gradient-to-r from-[#141d4c]/90 via-[#0e163d]/95 to-[#171f52]/90 backdrop-blur-2xl sticky top-0 z-50 shadow-[0_12px_36px_rgba(2,6,23,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.35)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <img
                src="/ishak_logo.png?v=20261004"
                alt="Ishak AI"
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl border-t border-t-cyan-300/80 border-b border-b-black/90 shadow-[0_6px_18px_rgba(0,229,255,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 border-2 border-[#0B132B] rounded-full animate-pulse shadow-[0_0_8px_#00FF88]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-black text-sm sm:text-base tracking-wide flex items-center gap-1 font-['Orbitron',sans-serif]">
                  ISHAK AI <span className="text-cyan-300 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg bg-gradient-to-b from-cyan-400/25 to-indigo-950/80 border-t border-t-cyan-300/60 border-b border-b-black/80 font-black shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]">VIP</span>
                </span>
              </div>
              <p className="text-[10px] text-cyan-200/70 hidden lg:block font-medium">
                লাইসেন্স কি ম্যানেজার ও অটো-এক্সপায়ার সিস্টেম
              </p>
            </div>
          </div>

          {/* Desktop Nav Tabs (Hidden on Mobile, handled by Bottom Dock) */}
          <nav className="hidden md:flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto py-1 scrollbar-none">
            <button
              id="nav-tab-keys"
              onClick={() => setActiveTab('keys')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer active:translate-y-0.5 border-b border-b-black/90 ${
                activeTab === 'keys'
                  ? 'bg-gradient-to-b from-cyan-400 via-teal-400 to-indigo-600 text-[#050b1e] border-t border-t-white/60 shadow-[0_6px_20px_rgba(0,229,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]'
                  : 'bg-gradient-to-b from-[#182352]/80 to-[#0b112c]/90 text-gray-200 hover:text-white border-t border-t-white/15 hover:border-t-cyan-400/50 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>কি ম্যানেজমেন্ট ({supabaseStatus.keyCount})</span>
            </button>

            <button
              id="nav-tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer active:translate-y-0.5 border-b border-b-black/90 ${
                activeTab === 'simulator'
                  ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 text-[#050b1e] border-t border-t-white/60 shadow-[0_6px_20px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]'
                  : 'bg-gradient-to-b from-[#182352]/80 to-[#0b112c]/90 text-gray-200 hover:text-white border-t border-t-white/15 hover:border-t-amber-400/50 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>বট প্রিভিউ</span>
            </button>

            <button
              id="nav-tab-bookmarklet"
              onClick={() => setActiveTab('bookmarklet')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer active:translate-y-0.5 border-b border-b-black/90 ${
                activeTab === 'bookmarklet'
                  ? 'bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-700 text-[#050b1e] border-t border-t-white/60 shadow-[0_6px_20px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]'
                  : 'bg-gradient-to-b from-[#182352]/80 to-[#0b112c]/90 text-gray-200 hover:text-white border-t border-t-white/15 hover:border-t-emerald-400/50 shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>বুকমার্কলেট ও গিটহাব কোড</span>
            </button>
          </nav>

          {/* Right Controls: Sound, Change Password & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              id="toggle-sound-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'সাউন্ড অন' : 'সাউন্ড অফ'}
              className="p-2.5 rounded-2xl bg-gradient-to-b from-[#182352]/90 to-[#0d1433]/95 border-t border-t-cyan-300/40 border-b border-b-black/90 text-cyan-300 hover:text-white shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] transition active:translate-y-0.5 cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 filter drop-shadow-[0_0_4px_#00E5FF]" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            </button>

            <button
              id="btn-change-password"
              onClick={onOpenChangePassword}
              title="এডমিন পাসওয়ার্ড পরিবর্তন করুন"
              className="px-3 py-2 rounded-2xl bg-gradient-to-b from-[#182352]/90 to-[#0d1433]/95 border-t border-t-cyan-300/40 border-b border-b-black/90 text-gray-200 hover:text-white text-xs font-black flex items-center gap-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] transition active:translate-y-0.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">পাসওয়ার্ড</span>
            </button>

            <button
              id="btn-logout"
              onClick={onLogout}
              title="লগআউট করুন"
              className="p-2.5 rounded-2xl bg-gradient-to-b from-rose-500/25 to-rose-950/85 border-t border-t-rose-400/50 border-b border-b-black/90 text-rose-300 hover:text-white shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] transition active:translate-y-0.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
