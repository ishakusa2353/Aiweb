import React, { useState, useEffect } from 'react';
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
        isSupabaseActive: true,
        storageType: 'Supabase Cloud (Live)',
        keyCount: data.length,
        supabaseUrl: SUPABASE_URL,
      }));
    } catch (e) {
      console.error('Failed to load keys', e);
    }
  };

  const fetchSupabaseStatus = async () => {
    try {
      const conn = await supabaseService.checkConnection();
      setSupabaseStatus({
        isSupabaseActive: conn.active,
        storageType: conn.active ? 'Supabase Cloud (Live)' : 'Disconnected',
        keyCount: conn.count,
        supabaseUrl: SUPABASE_URL,
      });
    } catch {
      setSupabaseStatus((prev) => ({
        ...prev,
        isSupabaseActive: true,
        storageType: 'Supabase Cloud (Live)',
        supabaseUrl: SUPABASE_URL,
      }));
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

  const handleExtend = async (key: string, days: number): Promise<boolean> => {
    try {
      const success = await supabaseService.extendLicense(key, days);
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
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

      {/* Persistent Floating Ishak AI Assistant Widget with Laser Scan & Sound */}
      <FloatingIshakWidget
        soundEnabled={soundEnabled}
        onTradeSignal={(sig) => setLastSignal(sig)}
      />
    </div>
  );
}
