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
    <header className="border-b border-cyan-500/20 bg-[#0B132B]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <img
                src="https://i.ibb.co/B5k2894W/a1fd0ad10f4d.jpg"
                alt="Ishak AI"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.6)] object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#0B132B] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-black text-sm sm:text-base tracking-wide flex items-center gap-1">
                  ISHAK AI <span className="text-cyan-400 text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30">VIP</span>
                </span>
              </div>
              <p className="text-[10px] text-gray-400 hidden md:block">
                লাইসেন্স কি ম্যানেজার ও অটো-এক্সপায়ার সিস্টেম
              </p>
            </div>
          </div>

          {/* Nav Tabs: Focused on User's Core Needs */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none">
            <button
              id="nav-tab-keys"
              onClick={() => setActiveTab('keys')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'keys'
                  ? 'bg-cyan-500 text-[#0B132B] shadow-[0_0_12px_rgba(0,229,255,0.5)]'
                  : 'text-gray-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>কি ম্যানেজমেন্ট ({supabaseStatus.keyCount})</span>
            </button>

            <button
              id="nav-tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-cyan-500 text-[#0B132B] shadow-[0_0_12px_rgba(0,229,255,0.5)]'
                  : 'text-gray-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>বট প্রিভিউ</span>
            </button>

            <button
              id="nav-tab-bookmarklet"
              onClick={() => setActiveTab('bookmarklet')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'bookmarklet'
                  ? 'bg-cyan-500 text-[#0B132B] shadow-[0_0_12px_rgba(0,229,255,0.5)]'
                  : 'text-gray-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>বুকমার্কলেট ও গিটহাব কোড</span>
            </button>
          </nav>

          {/* Right Controls: Sound, Change Password & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              id="toggle-sound-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'সাউন্ড অন' : 'সাউন্ড অফ'}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-cyan-400 hover:bg-cyan-500/10 transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
            </button>

            <button
              id="btn-change-password"
              onClick={onOpenChangePassword}
              title="এডমিন পাসওয়ার্ড পরিবর্তন করুন"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">পাসওয়ার্ড</span>
            </button>

            <button
              id="btn-logout"
              onClick={onLogout}
              title="লগআউট করুন"
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
