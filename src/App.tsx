import React, { useState, useEffect } from 'react';
import { KeyRound, Zap, Code2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SimulatorView } from './components/SimulatorView';
import { KeyManagerView } from './components/KeyManagerView';
import { BookmarkletView } from './components/BookmarkletView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { FloatingIshakWidget } from './components/FloatingIshakWidget';
import { LicenseRecord, SignalData } from './types';
import { supabaseService } from './lib/supabaseService';
import { SUPABASE_URL } from './lib/supabaseClient';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('ishak_admin_auth');
  });
  const [isChangePassOpen, setIsChangePassOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'simulator' | 'bookmarklet'>('keys');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [keys, setKeys] = useState<LicenseRecord[]>([]);
  const [lastSignal, setLastSignal] = useState<SignalData | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isSupabaseActive: boolean;
    storageType: string;
    keyCount: number;
    supabaseUrl?: string;
  }>({
    isSupabaseActive: true,
    storageType: 'Supabase Cloud (Live)',
    keyCount: 0,
    supabaseUrl: SUPABASE_URL,
  });

  const fetchKeys = async () => {
    try {
      const data = await supabaseService.getAllLicenses();
      setKeys(data);
      setSupabaseStatus((prev) => ({
        ...prev,
        keyCount: data.length,
      }));
    } catch (e) {
      console.error('Failed to load keys', e);
    }
  };

  const fetchSupabaseStatus = async () => {
    try {
      const resp = await fetch('/api/supabase/status');
      if (resp.ok) {
        const data = await resp.json();
        setSupabaseStatus({
          isSupabaseActive: data.isSupabaseActive,
          storageType: data.isSupabaseActive ? 'Supabase Cloud (Live)' : 'Server Secure Store',
          keyCount: data.keyCount || 0,
          supabaseUrl: data.supabaseUrl || SUPABASE_URL,
        });
        return;
      }
    } catch {
      // fallback
    }

    try {
      const conn = await supabaseService.checkConnection();
      setSupabaseStatus((prev) => ({
        ...prev,
        isSupabaseActive: conn.active,
        storageType: conn.active ? 'Supabase Cloud (Live)' : 'Server Secure Store',
        keyCount: conn.count,
      }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchKeys();
    }
    fetchSupabaseStatus();
  }, [isAuthenticated]);

  const handleGenerateKey = async (data: {
    key?: string;
    tier: string;
    duration: string;
    customValue?: string;
    customUnit?: string;
    traderId?: string;
    note?: string;
  }): Promise<boolean> => {
    try {
      const result = await supabaseService.createLicense(data);
      if (result.success) {
        await fetchKeys();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to create key', e);
      return false;
    }
  };

  const handleToggleActive = async (key: string, currentActive: boolean): Promise<boolean> => {
    try {
      const success = await supabaseService.toggleActive(key, currentActive);
      if (success) {
        await fetchKeys();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to toggle key status', e);
      return false;
    }
  };

  const handleExtend = async (key: string, value: number, unit: 'minutes' | 'hours' | 'days' = 'days'): Promise<boolean> => {
    try {
      const success = await supabaseService.extendLicense(key, value, unit);
      if (success) {
        await fetchKeys();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to extend key', e);
      return false;
    }
  };

  const handleDeleteKey = async (key: string): Promise<boolean> => {
    try {
      const success = await supabaseService.deleteLicense(key);
      if (success) {
        await fetchKeys();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to delete key', e);
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ishak_admin_auth');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Admin Login Modal if not authenticated */}
      {!isAuthenticated && (
        <AdminLoginModal
          onLoginSuccess={() => {
            setIsAuthenticated(true);
            fetchKeys();
          }}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
      />

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        supabaseStatus={supabaseStatus}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenChangePassword={() => setIsChangePassOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-16">
        {activeTab === 'keys' && (
          <KeyManagerView
            keys={keys}
            onRefresh={fetchKeys}
            onGenerateKey={handleGenerateKey}
            onToggleActive={handleToggleActive}
            onExtend={handleExtend}
            onDeleteKey={handleDeleteKey}
            isSupabaseActive={supabaseStatus.isSupabaseActive}
          />
        )}
        {activeTab === 'simulator' && <SimulatorView lastSignal={lastSignal} />}
        {activeTab === 'bookmarklet' && <BookmarkletView />}
      </main>

      {/* Sleek Mobile Bottom Navigation Dock (High-Tech Native App Feel) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070D1E]/95 backdrop-blur-2xl border-t border-cyan-500/25 px-3 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-10px_35px_rgba(0,0,0,0.9)] flex items-center justify-around"
      >
        <button
          onClick={() => setActiveTab('keys')}
          className={`flex-1 py-1 px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
            activeTab === 'keys'
              ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,229,255,0.25)]'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <div className="relative">
            <KeyRound className="w-5 h-5" />
            {supabaseStatus.keyCount > 0 && (
              <span className="absolute -top-1 -right-2.5 px-1 py-0.2 text-[9px] font-black rounded-full bg-cyan-400 text-[#070D1E] min-w-4 text-center leading-none">
                {supabaseStatus.keyCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-black tracking-tight">লাইসেন্স কি</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex-1 py-1 px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
            activeTab === 'simulator'
              ? 'text-amber-300 bg-amber-500/15 border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span className="text-[10px] font-black tracking-tight">বট প্রিভিউ</span>
        </button>

        <button
          onClick={() => setActiveTab('bookmarklet')}
          className={`flex-1 py-1 px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
            activeTab === 'bookmarklet'
              ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <Code2 className="w-5 h-5" />
          <span className="text-[10px] font-black tracking-tight">বুকমার্কলেট</span>
        </button>
      </nav>

      {/* Persistent Floating Ishak AI Assistant Widget with Laser Scan & Sound */}
      <FloatingIshakWidget
        soundEnabled={soundEnabled}
        onTradeSignal={(sig) => setLastSignal(sig)}
      />
    </div>
  );
}
