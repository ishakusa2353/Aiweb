import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, Copy, Check, Ban, CheckCircle2, Clock, Trash2, ShieldCheck, RefreshCw, Search, Smartphone, RotateCcw, AlertTriangle, Database, Settings, Server, ExternalLink, Terminal, Send, MessageSquare, Share2, Wrench, ShieldAlert, Download } from 'lucide-react';
import { LicenseRecord } from '../types';
import { supabaseService } from '../lib/supabaseService';

interface KeyManagerViewProps {
  keys: LicenseRecord[];
  onRefresh: () => void;
  onGenerateKey: (data: {
    key?: string;
    tier: string;
    duration: string;
    customValue?: string;
    customUnit?: string;
    traderId?: string;
    note?: string;
  }) => Promise<boolean>;
  onToggleActive: (key: string, currentActive: boolean) => Promise<boolean>;
  onExtend: (key: string, value: number, unit?: 'minutes' | 'hours' | 'days') => Promise<boolean>;
  onDeleteKey: (key: string) => Promise<boolean>;
  isSupabaseActive: boolean;
}

export const KeyManagerView: React.FC<KeyManagerViewProps> = ({
  keys,
  onRefresh,
  onGenerateKey,
  onToggleActive,
  onExtend,
  onDeleteKey,
  isSupabaseActive,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked' | 'expired'>('all');

  // Maintenance mode state
  const [maintenanceMode, setMaintenanceModeState] = useState<boolean>(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState<boolean>(false);

  // PWA 1-Click App Install & Download state (100% Live DB Sync)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsAppInstalled(true);
          showActionToast('✅ APK সফলভাবে ফোনে ইনস্টল হয়েছে!');
        }
        setDeferredPrompt(null);
      } catch (e) {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  // Live countdown ticker (ticks every second for real-time live expiration countdown)
  const [, setLiveTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((t) => (t + 1) % 10000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial maintenance status
  useEffect(() => {
    supabaseService.getMaintenanceMode().then((status) => {
      setMaintenanceModeState(Boolean(status));
    });
  }, []);

  // Flash notification toast (replaces alert popups!)
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showActionToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleToggleMaintenance = async () => {
    setIsTogglingMaintenance(true);
    const nextState = !maintenanceMode;
    try {
      const result = await supabaseService.setMaintenanceMode(nextState);
      setMaintenanceModeState(result.maintenanceMode);
      if (result.maintenanceMode) {
        showActionToast('⚠️ Maintenance Mode অন করা হয়েছে! এখন ইউজারের বটে ক্লিক করলে দেখাবে "Bot In Maintenance"');
      } else {
        showActionToast('✅ Maintenance Mode বন্ধ করা হয়েছে! বট পুনরায় স্বাভাবিকভাবে কাজ করছে।');
      }
    } catch (e: any) {
      showActionToast('মেইনটেনেন্স মোড পরিবর্তন ব্যর্থ হয়েছে', true);
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  // Custom key generation modal state
  const [customKey, setCustomKey] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('VIP');
  const [timePreset, setTimePreset] = useState<'5m' | '10m' | '1h' | '2h' | '1d' | '30d' | 'lifetime' | 'custom'>('1h');
  const [customValue, setCustomValue] = useState<string>('1');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days' | 'lifetime'>('hours');
  
  // Device limit state
  const [deviceLimitMode, setDeviceLimitMode] = useState<'1' | '2' | '3' | 'unlimited' | 'custom'>('1');
  const [customDeviceLimit, setCustomDeviceLimit] = useState<string>('4');

  // Custom Extend Duration Modal State (User requirement: Custom minutes/hours/days extension)
  const [extendModalKey, setExtendModalKey] = useState<LicenseRecord | null>(null);
  const [extendCustomVal, setExtendCustomVal] = useState<number>(1);
  const [extendCustomUnit, setExtendCustomUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [isExtendingNow, setIsExtendingNow] = useState<boolean>(false);

  const [traderId, setTraderId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Customer delivery message modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);
  const [deliveryLicense, setDeliveryLicense] = useState<{
    key: string;
    tier?: string;
    duration?: string;
    exp?: number;
    first_login_at?: number;
    device_id?: string;
    device_limit?: number;
    trader_id?: string;
    note?: string;
  } | null>(null);
  const [copiedDeliveryStatus, setCopiedDeliveryStatus] = useState<boolean>(false);

  const getDeliveryMessage = (lic: {
    key: string;
    tier?: string;
    duration?: string;
    exp?: number;
    first_login_at?: number;
    device_id?: string;
    device_limit?: number;
    trader_id?: string;
    note?: string;
  }) => {
    let durLabel = '30 Days (৩০ দিন)';
    if (lic.duration === 'lifetime') durLabel = 'Lifetime (আজীবন)';
    else if (lic.duration === '5m') durLabel = '5 Minutes (৫ মিনিট)';
    else if (lic.duration === '10m') durLabel = '10 Minutes (১০ মিনিট)';
    else if (lic.duration === '1h') durLabel = '1 Hour (১ ঘণ্টা)';
    else if (lic.duration === '2h') durLabel = '2 Hours (২ ঘণ্টা)';
    else if (lic.duration === '1d' || lic.duration === '24h') durLabel = '1 Day (১ দিন)';
    else if (lic.duration === '30d') durLabel = '30 Days (৩০ দিন)';
    else if (lic.duration) durLabel = lic.duration;

    const devLimit = lic.device_limit !== undefined && lic.device_limit !== null ? Number(lic.device_limit) : 1;
    const devLimitLabel = devLimit === 0 || devLimit === -1
      ? 'Unlimited Devices'
      : `${devLimit} Device${devLimit > 1 ? 's' : ''}`;

    const expiryInfo = lic.first_login_at && lic.exp
      ? `Active (Expires: ${new Date(lic.exp).toLocaleString('en-US')})`
      : lic.duration === 'lifetime'
      ? 'Lifetime Access'
      : 'Countdown starts upon first login in the bot';

    return `⚡ ISHAK AI PRO - VIP LICENSE DELIVERY ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Congratulations! Your Quotex VIP Trading Bot License is ready.

🔑 License Key: ${lic.key}
💎 Membership Tier: ${(lic.tier || 'VIP').toUpperCase()}
⏱️ Time Limit: ${durLabel}
⌛ Expiry Status: ${expiryInfo}
📱 Device Limit: ${devLimitLabel}
${lic.trader_id ? `👤 Trader ID: ${lic.trader_id}\n` : ''}${lic.note ? `📝 Note: ${lic.note}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 How to Activate & Trade in Quotex:
1. Open Quotex in Kiwi Browser or Chrome.
2. Launch the Ishak AI Trading Bot widget on your chart.
3. Click the circular Bot Logo / VIP Key button.
4. Enter your VIP License Key and click "Verify & Unlock".
5. Choose your desired Market & Timeframe to start receiving 1-trade auto signals!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  };

  // Supabase quick connect modal state
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState<string>('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState<string>('');
  const [supabaseSqlSnippet, setSupabaseSqlSnippet] = useState<string>('');
  const [copiedSqlStatus, setCopiedSqlStatus] = useState<boolean>(false);
  const [isConnectingSupabase, setIsConnectingSupabase] = useState<boolean>(false);

  const openSupabaseModal = async () => {
    setShowSupabaseModal(true);
    setSupabaseUrlInput('https://qbazzarqiplrqqfytajz.supabase.co');
    setSupabaseSqlSnippet(`-- ⚡ ISHAK AI PRO - SUPABASE LICENSE DATABASE SCHEMA
CREATE TABLE IF NOT EXISTS public.ishak_licenses (
  key TEXT PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT true,
  tier TEXT NOT NULL DEFAULT 'VIP',
  duration TEXT NOT NULL DEFAULT '30d',
  duration_ms BIGINT,
  exp BIGINT,
  first_login_at BIGINT,
  device_id TEXT DEFAULT '',
  device_limit INT DEFAULT 1,
  trader_id TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  last_used_at BIGINT,
  note TEXT
);

-- If you already have the table, add the device_limit column:
ALTER TABLE public.ishak_licenses ADD COLUMN IF NOT EXISTS device_limit INT DEFAULT 1;

-- Enable RLS and public policies
ALTER TABLE public.ishak_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON public.ishak_licenses FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON public.ishak_licenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON public.ishak_licenses FOR UPDATE USING (true);
CREATE POLICY "Public Delete" ON public.ishak_licenses FOR DELETE USING (true);`);
  };

  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingSupabase(true);
    try {
      const cleanUrl = supabaseUrlInput.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
      const resp = await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl, key: supabaseKeyInput.trim() }),
      });

      setIsConnectingSupabase(false);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          showActionToast('✅ Supabase ক্লাউড ডাটাবেস সফলভাবে সংযুক্ত হয়েছে!');
          setShowSupabaseModal(false);
          onRefresh();
        } else {
          showActionToast('❌ সংযোগে সমস্যা: ' + (data.error || 'চেক করুন'), true);
        }
      } else {
        showActionToast('❌ সার্ভারে সংযোগ ব্যর্থ', true);
      }
    } catch {
      setIsConnectingSupabase(false);
      showActionToast('❌ সংযোগ যাচাই ব্যর্থ', true);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSqlSnippet);
    setCopiedSqlStatus(true);
    showActionToast('Supabase SQL কোড কপি হয়েছে!');
    setTimeout(() => setCopiedSqlStatus(false), 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showActionToast(`কপি হয়েছে: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalDeviceLimit = 1;
    if (deviceLimitMode === '1') finalDeviceLimit = 1;
    else if (deviceLimitMode === '2') finalDeviceLimit = 2;
    else if (deviceLimitMode === '3') finalDeviceLimit = 3;
    else if (deviceLimitMode === '4') finalDeviceLimit = 4;
    else if (deviceLimitMode === '5') finalDeviceLimit = 5;
    else if (deviceLimitMode === 'unlimited') finalDeviceLimit = 0;
    else if (deviceLimitMode === 'custom') finalDeviceLimit = Math.max(1, parseInt(customDeviceLimit || '1', 10));

    let finalDuration = '30d';
    if (timePreset === '5m') finalDuration = '5m';
    else if (timePreset === '10m') finalDuration = '10m';
    else if (timePreset === '1h') finalDuration = '1h';
    else if (timePreset === '2h') finalDuration = '2h';
    else if (timePreset === '1d') finalDuration = '1d';
    else if (timePreset === '30d') finalDuration = '30d';
    else if (timePreset === 'lifetime') finalDuration = 'lifetime';
    else if (timePreset === 'custom') {
      finalDuration = customUnit === 'lifetime' ? 'lifetime' : `${customValue}${customUnit === 'minutes' ? 'm' : customUnit === 'hours' ? 'h' : 'd'}`;
    }

    const payload: any = {
      key: customKey.trim() || undefined,
      tier: selectedTier,
      duration: finalDuration,
      deviceLimit: finalDeviceLimit,
      traderId: traderId.trim() || undefined,
      note: note.trim() || undefined,
    };

    if (timePreset === 'custom' && customUnit !== 'lifetime') {
      payload.customValue = customValue;
      payload.customUnit = customUnit;
    }

    const success = await onGenerateKey(payload);
    setIsSubmitting(false);

    if (success) {
      const generatedKey = customKey.trim().toUpperCase() || 'ISHAK-' + selectedTier.toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const genTraderId = traderId.trim() || undefined;
      const genNote = note.trim() || undefined;

      setCustomKey('');
      setTraderId('');
      setNote('');
      setShowCreateModal(false);
      showActionToast('✅ নতুন VIP লাইসেন্স তৈরি হয়েছে! কাস্টমার ডেলিভারি মেসেজ প্রস্তুত।');

      // Auto-open Customer Delivery Modal
      setDeliveryLicense({
        key: generatedKey,
        tier: selectedTier,
        duration: finalDuration,
        device_limit: finalDeviceLimit,
        trader_id: genTraderId,
        note: genNote,
      });
      setShowDeliveryModal(true);
    } else {
      showActionToast('❌ লাইসেন্স তৈরিতে সমস্যা হয়েছে!', true);
    }
  };

  const handleResetDevice = async (key: string) => {
    try {
      const success = await supabaseService.resetDevice(key);
      if (success) {
        onRefresh();
        showActionToast(`ডিভাইস আনলক হয়েছে: ${key}`);
      } else {
        showActionToast('ডিভাইস আনলক ব্যর্থ হয়েছে', true);
      }
    } catch (e) {
      showActionToast('ডিভাইস আনলক ব্যর্থ হয়েছে', true);
    }
  };

  const getDirectDurationLabel = (durationStr?: string, durationMs?: number): string => {
    if (!durationStr && !durationMs) return '৩০ দিন';
    const d = (durationStr || '').toLowerCase().trim();
    if (d === 'lifetime') return 'লাইফটাইম';
    if (d === '5m' || d === '5min' || d === '5 minutes') return '৫ মিনিট';
    if (d === '10m' || d === '10min' || d === '10 minutes') return '১০ মিনিট';
    if (d === '15m' || d === '15min' || d === '15 minutes') return '১৫ মিনিট';
    if (d === '30m' || d === '30min' || d === '30 minutes') return '৩০ মিনিট';
    if (d === '1h' || d === '1hour' || d === '1 hour' || d === '60m') return '১ ঘণ্টা';
    if (d === '2h' || d === '2hours' || d === '2 hours') return '২ ঘণ্টা';
    if (d === '3h' || d === '3hours' || d === '3 hours') return '৩ ঘণ্টা';
    if (d === '6h' || d === '6hours' || d === '6 hours') return '৬ ঘণ্টা';
    if (d === '12h' || d === '12hours' || d === '12 hours') return '১২ ঘণ্টা';
    if (d === '1d' || d === '24h' || d === '1 day') return '১ দিন (২৪ ঘণ্টা)';
    if (d === '2d' || d === '2 days') return '২ দিন';
    if (d === '3d' || d === '3 days') return '৩ দিন';
    if (d === '7d' || d === '7 days') return '৭ দিন';
    if (d === '15d' || d === '15 days') return '১৫ দিন';
    if (d === '30d' || d === '1m' || d === '30 days') return '৩০ দিন';
    if (d === '60d' || d === '60 days') return '৬০ দিন';
    if (d === '90d' || d === '90 days') return '৯০ দিন';
    if (d === '180d' || d === '6m') return '৬ মাস';
    if (d === '365d' || d === '1y') return '১ বছর';

    const parts = d.split(' ');
    if (parts.length === 2) {
      const val = parts[0];
      const unit = parts[1];
      if (unit.startsWith('min')) return `${val} মিনিট`;
      if (unit.startsWith('hour') || unit.startsWith('h')) return `${val} ঘণ্টা`;
      if (unit.startsWith('day') || unit.startsWith('d')) return `${val} দিন`;
    }

    if (durationMs && durationMs > 0) {
      if (durationMs % 86400000 === 0) return `${durationMs / 86400000} দিন`;
      if (durationMs % 3600000 === 0) return `${durationMs / 3600000} ঘণ্টা`;
      if (durationMs % 60000 === 0) return `${durationMs / 60000} মিনিট`;
    }

    return durationStr || '৩০ দিন';
  };

  const formatRemaining = (
    exp: number | null | undefined,
    firstLoginAt?: number | null,
    durationStr?: string,
    durationMs?: number
  ): { text: string; isExpired: boolean; notStarted?: boolean } => {
    if (durationStr === 'lifetime' || (exp === null && firstLoginAt)) {
      return { text: 'লাইফটাইম', isExpired: false };
    }
    if (!firstLoginAt && (exp === null || exp === undefined)) {
      return { text: getDirectDurationLabel(durationStr, durationMs), isExpired: false, notStarted: true };
    }
    if (!exp) {
      return { text: 'লাইফটাইম', isExpired: false };
    }
    const diff = exp - Date.now();
    if (diff <= 0) {
      return { text: 'মেয়াদ শেষ', isExpired: true };
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    if (days > 0) return { text: `${days} দিন ${hours} ঘণ্টা বাকি`, isExpired: false };
    if (hours > 0) return { text: `${hours} ঘণ্টা ${mins} মি. বাকি`, isExpired: false };
    if (mins > 0) return { text: `${mins} মিনিট ${secs} সে. বাকি`, isExpired: false };
    return { text: `${secs} সেকেন্ড বাকি`, isExpired: false };
  };

  // Filter keys
  const filteredKeys = keys.filter((k) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      k.key.toLowerCase().includes(term) ||
      (k.trader_id && k.trader_id.toLowerCase().includes(term)) ||
      (k.device_id && k.device_id.toLowerCase().includes(term)) ||
      (k.note && k.note.toLowerCase().includes(term));

    if (!matchSearch) return false;

    const { isExpired } = formatRemaining(k.exp, k.first_login_at, k.duration, k.duration_ms);
    if (filterStatus === 'active') return k.active && !isExpired;
    if (filterStatus === 'blocked') return !k.active;
    if (filterStatus === 'expired') return isExpired;
    return true;
  });

  const activeCount = keys.filter((k) => k.active && !formatRemaining(k.exp, k.first_login_at, k.duration, k.duration_ms).isExpired).length;
  const lockedDeviceCount = keys.filter((k) => k.device_id && k.device_id.trim() !== '').length;

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Dynamic Action Notification Toast (No browser alert popups!) */}
      {toastMessage && (
        <div className="fixed top-4 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 z-[999999] animate-bounce max-w-sm sm:max-w-md mx-auto sm:mx-0">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-black flex items-center gap-2 backdrop-blur-md ${
              toastMessage.isError
                ? 'bg-red-950/95 border-red-500 text-red-200'
                : 'bg-emerald-950/95 border-emerald-400 text-emerald-300'
            }`}
          >
            {toastMessage.isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span className="truncate">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top 3D Stat Cards - Mobile Compact Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-3 sm:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between text-gray-400 text-[11px] sm:text-xs mb-0.5 sm:mb-1">
            <span className="truncate">মোট কী</span>
            <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{keys.length}</div>
          <div className="text-[10px] sm:text-[11px] text-cyan-400/80 mt-1 flex items-center gap-1 truncate">
            <RefreshCw className="w-3 h-3 cursor-pointer hover:rotate-180 transition shrink-0" onClick={onRefresh} />
            <span className="truncate">সুপাবেস ডাটাবেস</span>
          </div>
        </div>

        <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-3 sm:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between text-gray-400 text-[11px] sm:text-xs mb-0.5 sm:mb-1">
            <span className="truncate">সক্রিয় কী</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{activeCount}</div>
          <div className="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">ভ্যালিড ও লাইভ</div>
        </div>

        <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-3 sm:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between text-gray-400 text-[11px] sm:text-xs mb-0.5 sm:mb-1">
            <span className="truncate">লকড ডিভাইস</span>
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">{lockedDeviceCount}</div>
          <div className="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">ডিভাইসে আবদ্ধ</div>
        </div>

        <div 
          onClick={openSupabaseModal}
          className="bg-[#0B132B] border border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-3 sm:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)] cursor-pointer transition group"
          title="Supabase ডাটাবেস সেটিংস দেখতে ক্লিক করুন"
        >
          <div className="flex items-center justify-between text-gray-400 text-[11px] sm:text-xs mb-0.5 sm:mb-1">
            <span className="truncate">স্টোরেজ</span>
            <div className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-cyan-400 font-bold group-hover:underline">সেটিংস</span>
            </div>
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isSupabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="truncate">{isSupabaseActive ? 'Supabase' : 'Server Memory'}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-cyan-400 mt-1 flex items-center justify-between">
            <span className="truncate">{isSupabaseActive ? 'লাইভ কানেক্টেড' : 'কানেক্ট করুন'}</span>
            <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-cyan-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* 📱 1-CLICK DIRECT APK INSTALL CARD (Direct to Phone Home Screen with Live DB Sync) */}
      <div className="bg-gradient-to-r from-cyan-950/90 via-[#0B132B] to-blue-950/90 border border-cyan-400/50 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0">
            📱
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>মোবাইল APK সরাসরি ইনস্টল (WebAPK)</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>লাইভ ডাটাবেজ কানেক্টেড</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-300 mt-0.5">
              কোনো ফাইল ডাউনলোড ছাড়াই ১-ক্লিকে সরাসরি ফোনের হোমস্ক্রিনে অ্যাপ হিসেবে ইনস্টল করে নিন।
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          <button
            onClick={handleInstallApp}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-[#070D1E] font-black text-xs shadow-lg shadow-cyan-500/30 hover:brightness-110 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isAppInstalled ? '✅ অ্যাপ ইনস্টল্ড (চালু আছে)' : '১-ক্লিকে ফোনে APK ইনস্টল করুন'}</span>
          </button>
        </div>
      </div>

      {/* 🛠️ MAINTENANCE MODE CONTROL CARD */}
      <div className={`border rounded-2xl p-3.5 sm:p-5 shadow-2xl transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
        maintenanceMode 
          ? 'bg-gradient-to-r from-red-950/90 via-rose-950/80 to-red-900/70 border-red-500/70 shadow-[0_0_35px_rgba(239,68,68,0.3)]' 
          : 'bg-gradient-to-r from-slate-900/90 via-[#0B132B] to-slate-900/90 border-cyan-500/30'
      }`}>
        <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shrink-0 border transition ${
            maintenanceMode 
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {maintenanceMode ? '⚠️' : '🛡️'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white">
                বট মেইনটেনেন্স মোড
              </h3>
              <span className={`px-2 py-0.2 rounded-full text-[9px] font-black border uppercase tracking-wider flex items-center gap-1 ${
                maintenanceMode
                  ? 'bg-red-500/20 text-red-300 border-red-500/60 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${maintenanceMode ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                <span>{maintenanceMode ? 'অন (Maintenance)' : 'অফ (সচল)'}</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
              {maintenanceMode
                ? '🔴 এই মোড চালু রয়েছে! ইউজারের বটে ক্লিক করলে "Bot In Maintenance" দেখাবে।'
                : '🟢 সাধারণ অবস্থা: অন করলে বট চালু হওয়া বন্ধ হয়ে মেইনটেনেন্স মেসেজ দেখাবে।'}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          <button
            type="button"
            disabled={isTogglingMaintenance}
            onClick={handleToggleMaintenance}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-xl cursor-pointer ${
              maintenanceMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
            }`}
          >
            {isTogglingMaintenance ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>{maintenanceMode ? '🟢 মেইনটেনেন্স বন্ধ করুন' : '🔴 মেইনটেনেন্স মোড অন করুন'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile-First Action & Quick Create Bar */}
      <div className="bg-[#0B132B] border border-cyan-500/20 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
        {/* Prominent Primary Create Key Button */}
        <button
          id="btn-create-key-primary"
          onClick={() => setShowCreateModal(true)}
          className="w-full py-3 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-[#070D1E] font-black text-xs sm:text-xs shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-98 flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>নতুন VIP কী তৈরি করুন (Create Key)</span>
        </button>

        {/* Search and Mobile Segmented Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="কী, ডিভাইস বা ট্রেডার আইডি দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Segmented Filter Tabs - Thumb Friendly */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterStatus === 'all'
                  ? 'bg-cyan-500 text-[#070D1E] shadow-sm'
                  : 'bg-slate-900/80 text-gray-300 hover:text-white border border-slate-800'
              }`}
            >
              সব ({keys.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterStatus === 'active'
                  ? 'bg-emerald-500 text-[#070D1E] shadow-sm'
                  : 'bg-slate-900/80 text-gray-300 hover:text-white border border-slate-800'
              }`}
            >
              সক্রিয় ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('blocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterStatus === 'blocked'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-slate-900/80 text-gray-300 hover:text-white border border-slate-800'
              }`}
            >
              ব্লকড
            </button>
            <button
              onClick={() => setFilterStatus('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterStatus === 'expired'
                  ? 'bg-amber-500 text-[#070D1E] shadow-sm'
                  : 'bg-slate-900/80 text-gray-300 hover:text-white border border-slate-800'
              }`}
            >
              মেয়াদ শেষ
            </button>
          </div>
        </div>
      </div>

      {/* License Keys Grid - Highly Clear, Responsive & Readable (1 col on mobile, 2 on tablet, 3-4 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredKeys.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 text-xs bg-[#0B132B]/60 rounded-2xl border border-slate-800">
            কোনো লাইসেন্স কি পাওয়া যায়নি
          </div>
        ) : (
          filteredKeys.map((k) => {
            const remaining = formatRemaining(k.exp, k.first_login_at, k.duration, k.duration_ms);
            const registeredDevices = (k.device_id || '')
              .split(',')
              .map((d) => d.trim())
              .filter(Boolean);
            const devLimit = k.device_limit !== undefined && k.device_limit !== null ? Number(k.device_limit) : 1;
            const isUnlimitedDev = devLimit === 0 || devLimit === -1;
            const isBound = registeredDevices.length > 0;

            return (
              <div
                key={k.key}
                className={`rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 flex flex-col justify-between shadow-xl relative overflow-hidden ${
                  !k.active
                    ? 'bg-red-950/20 border-red-500/40'
                    : remaining.isExpired
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-[#0A122A] border-cyan-500/30 hover:border-cyan-400/80 shadow-cyan-950/30'
                }`}
              >
                <div>
                  {/* Card Header: Tier Badge & Active/Status Pill */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0 shadow-sm ${
                          k.tier === 'LIFETIME'
                            ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
                            : k.tier === 'TRIAL'
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                            : 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                        }`}
                      >
                        {k.tier}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-cyan-200/80 font-bold">
                        {getDirectDurationLabel(k.duration, k.duration_ms)}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 shrink-0 shadow-sm ${
                        !k.active
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : remaining.isExpired
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${!k.active ? 'bg-red-400' : remaining.isExpired ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                      <span>{!k.active ? 'ব্লক' : remaining.isExpired ? 'মেয়াদ শেষ' : 'সক্রিয়'}</span>
                    </span>
                  </div>

                  {/* 🔑 PROMINENT LICENSE KEY BOX - Always Fully Visible, Crystal-Clear with 1-Tap Copy */}
                  <div className="bg-slate-950/95 p-2.5 rounded-xl border border-cyan-500/35 mb-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
                    <div className="flex items-center justify-between text-[9px] text-gray-400 font-semibold mb-1">
                      <span className="flex items-center gap-1 text-cyan-400">
                        <KeyRound className="w-3 h-3" />
                        <span>লাইসেন্স কি (License Key)</span>
                      </span>
                      <span className="text-[9px] text-gray-500">ট্যাপ করে কপি করুন</span>
                    </div>

                    <div className="text-cyan-300 font-mono font-black text-xs sm:text-[13px] break-all select-all tracking-wider py-1 leading-snug">
                      {k.key}
                    </div>

                    <button
                      onClick={() => handleCopy(k.key)}
                      className={`w-full mt-1.5 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md ${
                        copiedKey === k.key
                          ? 'bg-emerald-500 text-[#070D1E]'
                          : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/40'
                      }`}
                    >
                      {copiedKey === k.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === k.key ? 'সফলভাবে কপি হয়েছে!' : 'কী কপি করুন (Copy Key)'}</span>
                    </button>
                  </div>

                  {/* Detailed Information Box */}
                  <div className="space-y-1.5 text-[10px] sm:text-[11px] text-gray-300 mb-2.5 bg-slate-900/70 p-2 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>মেয়াদ:</span>
                      </span>
                      <b className={`font-mono truncate max-w-[65%] text-right font-bold ${remaining.isExpired ? 'text-red-400' : remaining.notStarted ? 'text-cyan-300' : 'text-emerald-400'}`}>
                        {remaining.text}
                      </b>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>ডিভাইস:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <b className={isBound ? 'text-amber-300 font-mono font-bold' : 'text-gray-400 font-mono'}>
                          {isUnlimitedDev ? `${registeredDevices.length}/আনলিমিটেড` : `${registeredDevices.length}/${devLimit}`}
                        </b>
                        {isBound && (
                          <button
                            onClick={() => handleResetDevice(k.key)}
                            title="ডিভাইস রিসেট করুন"
                            className="p-1 hover:text-cyan-300 text-gray-400 bg-slate-800 hover:bg-slate-700 rounded-md transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {k.trader_id && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-gray-400">ট্রেডার আইডি:</span>
                        <b className="text-amber-400 font-mono font-bold truncate max-w-[60%] text-right">{k.trader_id}</b>
                      </div>
                    )}

                    {k.note && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-gray-400">নোট:</span>
                        <span className="text-gray-300 truncate max-w-[65%] text-right">{k.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 Action Buttons Bar */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800">
                  <button
                    onClick={async () => {
                      await onToggleActive(k.key, k.active);
                      showActionToast(k.active ? 'কী ব্লক করা হয়েছে' : 'কী আনব্লক করা হয়েছে');
                    }}
                    className={`col-span-2 h-8 rounded-lg font-black text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
                      k.active
                        ? 'bg-red-950/40 text-red-400 hover:bg-red-900/50 border border-red-500/40'
                        : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-500/40'
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                    <span>{k.active ? 'ব্লক' : 'আনব্লক'}</span>
                  </button>

                  {/* ⏱️ Custom Extend Button (Replaced static +30D with Custom Duration Modal) */}
                  <button
                    onClick={() => {
                      setExtendModalKey(k);
                      setExtendCustomVal(1);
                      setExtendCustomUnit('hours');
                    }}
                    className="h-8 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 font-black text-[10px] sm:text-[11px] border border-cyan-400/40 flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                    title="কাস্টম মেয়াদ বৃদ্ধি করুন (মিনিট/ঘণ্টা/দিন)"
                  >
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>+মেয়াদ</span>
                  </button>

                  <button
                    onClick={() => {
                      setDeliveryLicense(k);
                      setShowDeliveryModal(true);
                    }}
                    className="h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm"
                    title="কাস্টমার ডেলিভারি মেসেজ"
                  >
                    <Send className="w-3 h-3 text-cyan-400" />
                  </button>

                  <button
                    onClick={async () => {
                      await onDeleteKey(k.key);
                      showActionToast('কী ডিলিট করা হয়েছে');
                    }}
                    className="col-span-4 h-7 rounded-lg bg-red-950/20 hover:bg-red-900/30 text-red-400/80 hover:text-red-300 border border-red-500/20 flex items-center justify-center gap-1.5 text-[10px] transition active:scale-95 cursor-pointer"
                    title="লাইসেন্স ডিলিট করুন"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ডিলিট করুন</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ⏱️ CUSTOM DURATION EXTENDER MODAL (User Requirement 2: মিনিট/ঘণ্টা/দিন কাস্টমভাবে মেয়াদ বৃদ্ধি) */}
      {extendModalKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999997] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B132B] border-2 border-cyan-400 rounded-3xl p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white">কাস্টম মেয়াদ বৃদ্ধি করুন</h3>
              </div>
              <button
                onClick={() => setExtendModalKey(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-gray-300 hover:text-white flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Target License Key Display */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-cyan-500/30">
              <span className="text-[10px] text-gray-400 block mb-0.5">টার্গেট লাইসেন্স:</span>
              <span className="font-mono font-bold text-xs text-cyan-300 break-all select-all">
                {extendModalKey.key}
              </span>
            </div>

            {/* Quick 1-Tap Presets */}
            <div>
              <label className="text-gray-300 text-xs block mb-1.5 font-bold">⚡ কুইক প্রেসীট (Quick Presets):</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '১৫ মি.', val: 15, unit: 'minutes' as const },
                  { label: '৩০ মি.', val: 30, unit: 'minutes' as const },
                  { label: '১ ঘণ্টা', val: 1, unit: 'hours' as const },
                  { label: '২ ঘণ্টা', val: 2, unit: 'hours' as const },
                  { label: '৬ ঘণ্টা', val: 6, unit: 'hours' as const },
                  { label: '১ দিন', val: 1, unit: 'days' as const },
                  { label: '৭ দিন', val: 7, unit: 'days' as const },
                  { label: '৩০ দিন', val: 30, unit: 'days' as const },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setExtendCustomVal(preset.val);
                      setExtendCustomUnit(preset.unit);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition ${
                      extendCustomVal === preset.val && extendCustomUnit === preset.unit
                        ? 'bg-cyan-500 text-[#070D1E] border-cyan-400 font-black shadow-md'
                        : 'bg-slate-900 text-gray-300 hover:text-white border-slate-800'
                    }`}
                  >
                    +{preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Inputs: Number + Unit Selector */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-gray-300 text-xs block font-bold">🛠️ কাস্টম মেয়াদ নির্ধারণ:</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">পরিমাণ (Amount):</span>
                  <input
                    type="number"
                    min="1"
                    value={extendCustomVal}
                    onChange={(e) => setExtendCustomVal(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold text-sm outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">একক (Unit):</span>
                  <select
                    value={extendCustomUnit}
                    onChange={(e) => setExtendCustomUnit(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="minutes">মিনিট (Minutes)</option>
                    <option value="hours">ঘণ্টা (Hours)</option>
                    <option value="days">দিন (Days)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtendModalKey(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-bold transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isExtendingNow}
                onClick={async () => {
                  if (!extendModalKey) return;
                  setIsExtendingNow(true);
                  const success = await onExtend(extendModalKey.key, extendCustomVal, extendCustomUnit);
                  setIsExtendingNow(false);
                  if (success) {
                    const unitName = extendCustomUnit === 'minutes' ? 'মিনিট' : extendCustomUnit === 'hours' ? 'ঘণ্টা' : 'দিন';
                    showActionToast(`✅ মেয়াদ সফলভাবে +${extendCustomVal} ${unitName} বৃদ্ধি করা হয়েছে!`);
                    setExtendModalKey(null);
                  } else {
                    showActionToast('মেয়াদ বৃদ্ধি ব্যর্থ হয়েছে!', true);
                  }
                }}
                className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#070D1E] font-black text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isExtendingNow ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>মেয়াদ বৃদ্ধি নিশ্চিত করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW KEY MODAL WITH TIME LIMIT & DEVICE LIMIT OPTIONS - MOBILE SHEET */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999996] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#0B132B] border-t-2 sm:border-2 border-cyan-400 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white">নতুন VIP লাইসেন্স তৈরি</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-gray-300 hover:text-white flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-300 block mb-1 font-medium">কাস্টম কী কোড (ঐচ্ছিক):</label>
                <input
                  type="text"
                  placeholder="ফাঁকা রাখলে অটোমেটিক VIP কোড তৈরি হবে"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-medium">লাইসেন্স টিয়ার:</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-cyan-400"
                >
                  <option value="VIP">VIP (ফুল ফিচার)</option>
                  <option value="PRO">PRO (প্রো)</option>
                  <option value="TRIAL">TRIAL (ট্রায়াল)</option>
                  <option value="LIFETIME">LIFETIME (আজীবন)</option>
                </select>
              </div>

              {/* ⏱️ TIME LIMIT SELECTION (5m, 10m, 1h, 2h, 1d, 30d, Lifetime, Custom) */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-cyan-500/30 space-y-2">
                <label className="text-gray-300 block font-medium flex items-center justify-between">
                  <span>⏱️ লাইসেন্স মেয়াদ (Duration):</span>
                  <span className="text-[10px] text-cyan-300 font-bold">
                    {timePreset === 'custom' ? `${customValue} ${customUnit === 'minutes' ? 'মিনিট' : customUnit === 'hours' ? 'ঘণ্টা' : customUnit === 'days' ? 'দিন' : 'লাইফটাইম'}` : getDirectDurationLabel(timePreset)}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimePreset('5m')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === '5m' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⚡ ৫ মিনিট
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('10m')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === '10m' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⏱️ ১০ মিনিট
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('1h')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === '1h' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⏳ ১ ঘণ্টা
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('2h')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === '2h' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⏳ ২ ঘণ্টা
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('1d')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === '1d' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📅 ১ দিন
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('30d')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === '30d' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📅 ৩০ দিন
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('lifetime')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === 'lifetime' ? 'bg-purple-500 text-white' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ♾️ লাইফটাইম
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('custom')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition ${
                      timePreset === 'custom' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    🛠️ কাস্টম
                  </button>
                </div>

                {timePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {customUnit !== 'lifetime' && (
                      <input
                        type="number"
                        min="1"
                        placeholder="সংখ্যা (উদা: ২, ১৫)"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono outline-none focus:border-cyan-400"
                      />
                    )}
                    <select
                      value={customUnit}
                      onChange={(e: any) => setCustomUnit(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold outline-none focus:border-cyan-400 col-span-1"
                    >
                      <option value="minutes">মিনিট (Minutes)</option>
                      <option value="hours">ঘণ্টা (Hours)</option>
                      <option value="days">দিন (Days)</option>
                      <option value="lifetime">লাইফটাইম (Lifetime)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 📱 DEVICE LIMIT SELECTION (1, 2, 3, Custom, Unlimited) */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-cyan-500/30 space-y-2">
                <label className="text-gray-300 block font-medium flex items-center justify-between">
                  <span>📱 ডিভাইস লিমিট (Device Limit):</span>
                  <span className="text-[10px] text-amber-400 font-bold">
                    {deviceLimitMode === 'unlimited' ? 'Unlimited Devices' : deviceLimitMode === 'custom' ? `${customDeviceLimit} Devices` : `${deviceLimitMode} Device`}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeviceLimitMode('1')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      deviceLimitMode === '1' ? 'bg-amber-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📱 1 Device
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceLimitMode('2')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      deviceLimitMode === '2' ? 'bg-amber-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📱 2 Devices
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceLimitMode('3')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      deviceLimitMode === '3' ? 'bg-amber-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📱 3 Devices
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceLimitMode('4')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      deviceLimitMode === '4' ? 'bg-amber-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📱 4 Devices
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceLimitMode('5')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      deviceLimitMode === '5' ? 'bg-amber-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📱 5 Devices
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceLimitMode('unlimited')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      deviceLimitMode === 'unlimited' ? 'bg-emerald-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    🌐 Unlimited
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceLimitMode('custom')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] col-span-3 transition ${
                      deviceLimitMode === 'custom' ? 'bg-amber-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⚙️ Custom Limit
                  </button>
                </div>

                {deviceLimitMode === 'custom' && (
                  <div className="pt-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="সর্বোচ্চ অনুমোদিত ডিভাইস সংখ্যা (যেমন: 4, 5, 10)"
                      value={customDeviceLimit}
                      onChange={(e) => setCustomDeviceLimit(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-400 font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-gray-300 block mb-1">ট্রেডার আইডি (ঐচ্ছিক, নির্দিষ্ট আইডিতে লক করতে):</label>
                <input
                  type="text"
                  placeholder="উদা: 84920184"
                  value={traderId}
                  onChange={(e) => setTraderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">নোট / ক্লায়েন্ট নাম (ঐচ্ছিক):</label>
                <input
                  type="text"
                  placeholder="উদা: রহিম ভাই - Quotex VIP"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#070D1E] font-black text-xs shadow-md hover:brightness-110 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'তৈরি হচ্ছে...' : 'জেনারেট ও লাইসেন্স ডেলিভারি তৈরি'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗄️ SUPABASE CLOUD DATABASE CONNECTION MODAL & SQL VIEWER */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0B132B] border-t-2 sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto space-y-4">
            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm sm:text-lg">
                    Supabase ডাটাবেস সেটিংস
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-400">
                    SQL কোড রান করুন ও প্রজেক্ট তথ্য দিয়ে পার্মানেন্টলি কানেক্ট করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSupabaseModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Status indicator */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
              isSupabaseActive
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-bold">
                  {isSupabaseActive ? 'Supabase ক্লাউড ডাটাবেস বর্তমানে সংযুক্ত রয়েছে!' : 'বর্তমানে লোকাল সিকিউর মেমরিতে চলছে (Supabase কানেক্ট করুন)'}
                </span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40">
                {isSupabaseActive ? 'Cloud Live' : 'Not Connected'}
              </span>
            </div>

            {/* 1. Supabase SQL Script Viewer with Copy */}
            <div className="bg-black/80 rounded-2xl p-4 border border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                  <Terminal className="w-4 h-4" />
                  <span>১ম ধাপ: Supabase SQL Editor-এ রান করার জন্য ১০০% নির্ভুল SQL কোড:</span>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {copiedSqlStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSqlStatus ? 'SQL কপি হয়েছে!' : 'SQL কোড কপি'}</span>
                </button>
              </div>

              <p className="text-[11px] text-gray-400">
                👉 Supabase এ গিয়ে বামপাশের <strong>SQL Editor</strong> &gt; <strong>New query</strong> তে পেস্ট করে <strong>Run</strong> বাটনে চাপ দিন (কোনো ইরর আসবে না)।
              </p>

              <textarea
                readOnly
                rows={5}
                value={supabaseSqlSnippet || `-- 🛡️ ISHAK AI VIP LICENSE DATABASE SCHEMA
CREATE TABLE IF NOT EXISTS public.ishak_licenses (
  key TEXT PRIMARY KEY,
  active BOOLEAN DEFAULT true,
  tier TEXT DEFAULT 'VIP',
  duration TEXT DEFAULT '30d',
  duration_ms BIGINT,
  exp BIGINT,
  first_login_at BIGINT,
  device_id TEXT DEFAULT '',
  trader_id TEXT DEFAULT '',
  created_at BIGINT,
  last_used_at BIGINT,
  note TEXT
);

ALTER TABLE public.ishak_licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server service full access" ON public.ishak_licenses;
CREATE POLICY "Allow server service full access" ON public.ishak_licenses FOR ALL USING (true) WITH CHECK (true);`}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full bg-[#050A18] border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 outline-none select-all"
              />
            </div>

            {/* 2. Connection Form */}
            <form onSubmit={handleConnectSupabase} className="space-y-3 pt-1">
              <div className="text-xs font-bold text-gray-200">
                ২য় ধাপ: Supabase প্রজেক্টের Credentials দিন (কানেক্ট হলে সারা জীবন ডাটা থাকবে):
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">
                  Project URL (Settings &gt; API &gt; Project URL):
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">
                  Service Role Secret / Anon Key (Settings &gt; API &gt; Project API keys):
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupabaseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isConnectingSupabase}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#070D1E] font-black text-xs shadow-md hover:brightness-110 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isConnectingSupabase ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  <span>{isConnectingSupabase ? 'কানেক্ট হচ্ছে...' : 'কানেক্ট ও সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📦 CUSTOMER DELIVERY MESSAGE MODAL - MOBILE SHEET */}
      {showDeliveryModal && deliveryLicense && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999998] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-[#0B132B] border-t-2 sm:border-2 border-cyan-400 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2.5 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">কাস্টমার ডেলিভারি মেসেজ</h3>
                  <p className="text-[10px] sm:text-[11px] text-cyan-400">কাস্টমারকে সরাসরি কপি বা শেয়ার করুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-gray-300 hover:text-white flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Key Banner */}
            <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/40 mb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">ডেলিভারি লাইসেন্স কি:</span>
                <span className="text-cyan-300 font-mono font-black text-sm select-all">{deliveryLicense.key}</span>
              </div>
              <button
                onClick={() => handleCopy(deliveryLicense.key)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 font-bold text-xs flex items-center gap-1.5 transition"
              >
                {copiedKey === deliveryLicense.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>শুধু কী কপি</span>
              </button>
            </div>

            {/* Message Preview Textarea */}
            <div className="flex-1 overflow-y-auto mb-3">
              <div className="relative">
                <textarea
                  readOnly
                  rows={13}
                  value={getDeliveryMessage(deliveryLicense)}
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-gray-200 text-xs font-mono leading-relaxed outline-none focus:border-cyan-400 select-all"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  const msg = getDeliveryMessage(deliveryLicense);
                  navigator.clipboard.writeText(msg);
                  setCopiedDeliveryStatus(true);
                  showActionToast('📋 সম্পূর্ণ কাস্টমার মেসেজ কপি হয়েছে!');
                  setTimeout(() => setCopiedDeliveryStatus(false), 2500);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#070D1E] font-black text-xs shadow-md shadow-cyan-500/25 hover:brightness-110 flex items-center justify-center gap-2 transition"
              >
                {copiedDeliveryStatus ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedDeliveryStatus ? 'মেসেজ কপি হয়েছে!' : '📋 এক ক্লিকে সম্পূর্ণ মেসেজ কপি করুন'}</span>
              </button>

              {/* Direct Share Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getDeliveryMessage(deliveryLicense))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>হোয়াটসঅ্যাপে পাঠান</span>
                </a>

                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-[11px] font-semibold transition"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📱 DIRECT APK 1-CLICK INSTALL GUIDE MODAL */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#0B132B] border-t-2 sm:border-2 border-cyan-400 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2.5 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-lg shadow-inner shrink-0">
                  📱
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">ফোনের হোমস্ক্রিনে APK ইনস্টল</h3>
                  <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>লাইভ ডাটাবেজ কানেক্টেড (Live Supabase Sync)</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-gray-300 hover:text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto mb-3 text-xs text-gray-200">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20">
                <p className="text-cyan-300 font-bold mb-1">⚡ অ্যাপের সুবিধা:</p>
                <ul className="text-[11px] text-gray-300 space-y-1 list-disc list-inside">
                  <li>ব্রাউজার অ্যাড্রেস বার বা ট্যাব ছাড়াই ফুলস্ক্রিন আসল APK হিসেবে চলে।</li>
                  <li>লাইভ ডাটাবেজের সাথে সবসময় যুক্ত—কী তৈরি, ব্লক বা এক্সটেন্ড সাথে সাথে কাজ করে।</li>
                  <li>এক ক্লিকে মোবাইল হোম স্ক্রিন থেকে দ্রুত চালু করা যায়।</li>
                </ul>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-cyan-500/30 space-y-2">
                <p className="text-white font-bold text-xs flex items-center gap-1.5">
                  <span>📱 যেভাবে ফোনে সরাসরি নিবেন:</span>
                </p>
                <div className="text-[11px] text-gray-300 space-y-2">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">১</span>
                    <span><b>Chrome / Kiwi (Android):</b> নিচের <b>"এখনই ইনস্টল করুন"</b> চাপুন। অথবা ব্রাউজারের উপরে ডানদিকের <b>৩ ডট (⋮)</b> থেকে <b>"Install app"</b> / <b>"Add to Home screen"</b> চাপলে ফোনে ডিরেক্ট APK তৈরি হয়ে যাবে।</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">২</span>
                    <span><b>Safari (iPhone):</b> ব্রাউজারের নিচে <b>Share (শেয়ার ↗)</b> চেপে <b>"Add to Home Screen"</b> চাপুন।</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  if (deferredPrompt) {
                    handleInstallApp();
                  } else {
                    showActionToast('অনুগ্রহ করে ব্রাউজারের ৩ ডট মেনু (⋮) থেকে Install app চাপুন');
                  }
                  setShowInstallGuide(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-[#070D1E] font-black text-xs shadow-md shadow-cyan-500/25 hover:brightness-110 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>এখনই ফোনে APK ইনস্টল করুন</span>
              </button>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold transition cursor-pointer"
              >
                বন্ধ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
