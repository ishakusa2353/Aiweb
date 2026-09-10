import React, { useState } from 'react';
import { KeyRound, Plus, Copy, Check, Ban, CheckCircle2, Clock, Trash2, ShieldCheck, RefreshCw, Search, Smartphone, RotateCcw, AlertTriangle, Database, Settings, Server, ExternalLink, Terminal, Send, MessageSquare, Share2 } from 'lucide-react';
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
  onExtend: (key: string, days: number) => Promise<boolean>;
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

  // Flash notification toast (replaces alert popups!)
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showActionToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Custom key generation modal state
  const [customKey, setCustomKey] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('VIP');
  const [timePreset, setTimePreset] = useState<'5m' | '10m' | '1h' | '1d' | 'lifetime' | 'custom'>('5m');
  const [customValue, setCustomValue] = useState<string>('5');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days' | 'lifetime'>('minutes');
  
  // Device limit state
  const [deviceLimitMode, setDeviceLimitMode] = useState<'1' | '2' | '3' | 'unlimited' | 'custom'>('1');
  const [customDeviceLimit, setCustomDeviceLimit] = useState<string>('4');

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
    let durLabel = '30 Days';
    if (lic.duration === 'lifetime') durLabel = 'Lifetime (আজীবন)';
    else if (lic.duration === '5m') durLabel = '5 Minutes';
    else if (lic.duration === '10m') durLabel = '10 Minutes';
    else if (lic.duration === '1h') durLabel = '1 Hour';
    else if (lic.duration === '1d' || lic.duration === '24h') durLabel = '1 Day (24 Hours)';
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
  trader_id TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  last_used_at BIGINT,
  note TEXT
);

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
    else if (timePreset === '1d') finalDuration = '1d';
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

  const formatRemaining = (
    exp: number | null | undefined,
    firstLoginAt?: number | null,
    durationStr?: string
  ): { text: string; isExpired: boolean; notStarted?: boolean } => {
    if (durationStr === 'lifetime' || (exp === null && firstLoginAt)) {
      return { text: 'লাইফটাইম (Lifetime)', isExpired: false };
    }
    if (!firstLoginAt && exp === null) {
      return { text: `প্রথম লগইনে শুরু (${durationStr || '30d'})`, isExpired: false, notStarted: true };
    }
    if (!exp) {
      return { text: 'লাইফটাইম (Lifetime)', isExpired: false };
    }
    const diff = exp - Date.now();
    if (diff <= 0) {
      return { text: 'মেয়াদ শেষ (Expired)', isExpired: true };
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    if (days > 0) return { text: `${days} দিন ${hours} ঘণ্টা`, isExpired: false };
    if (hours > 0) return { text: `${hours} ঘণ্টা ${mins} মি.`, isExpired: false };
    if (mins > 0) return { text: `${mins} মিনিট ${secs} সে.`, isExpired: false };
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

    const { isExpired } = formatRemaining(k.exp, k.first_login_at, k.duration);
    if (filterStatus === 'active') return k.active && !isExpired;
    if (filterStatus === 'blocked') return !k.active;
    if (filterStatus === 'expired') return isExpired;
    return true;
  });

  const activeCount = keys.filter((k) => k.active && !formatRemaining(k.exp, k.first_login_at, k.duration).isExpired).length;
  const lockedDeviceCount = keys.filter((k) => k.device_id && k.device_id.trim() !== '').length;

  return (
    <div className="space-y-6">
      {/* Dynamic Action Notification Toast (No browser alert popups!) */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[999999] animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-black flex items-center gap-2 backdrop-blur-md ${
              toastMessage.isError
                ? 'bg-red-950/90 border-red-500 text-red-200'
                : 'bg-emerald-950/90 border-emerald-400 text-emerald-300'
            }`}
          >
            {toastMessage.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top 3D Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>মোট লাইসেন্স কি</span>
            <KeyRound className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{keys.length}</div>
          <div className="text-[11px] text-cyan-400/80 mt-1 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 cursor-pointer hover:rotate-180 transition" onClick={onRefresh} />
            <span>সুপাবেস ডাটাবেস</span>
          </div>
        </div>

        <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>সক্রিয় লাইসেন্স (Active)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">ভ্যালিড ও সুরক্ষিত</div>
        </div>

        <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>লক করা ডিভাইস (Single Device)</span>
            <Smartphone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{lockedDeviceCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">শেয়ারিং রোধে লকড</div>
        </div>

        <div 
          onClick={openSupabaseModal}
          className="bg-[#0B132B] border border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] cursor-pointer transition group"
          title="Supabase ডাটাবেস সেটিংস ও SQL কোড দেখতে ক্লিক করুন"
        >
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>ডাটাবেস স্টোরেজ</span>
            <div className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
              <span className="text-[10px] text-cyan-400 font-bold group-hover:underline">সেটিংস</span>
            </div>
          </div>
          <div className="text-base font-bold text-white truncate flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isSupabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isSupabaseActive ? 'Supabase Cloud' : 'Server Memory'}</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-1 flex items-center justify-between">
            <span>{isSupabaseActive ? 'সুপাবেসে লাইভ কানেক্টেড' : 'ক্লিক করে কানেক্ট করুন'}</span>
            <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-cyan-400" />
          </div>
        </div>
      </div>

      {/* 🤖 TELEGRAM BOT INTEGRATION BANNER (Supabase-TG Live) */}
      <div className="bg-gradient-to-r from-blue-950/80 via-[#0B132B] to-cyan-950/80 border border-cyan-400/40 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>টেলিগ্রাম বট লাইভ কানেক্টেড</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                  🟢 Supabase-TG Active
                </span>
              </h3>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              বট ইউজারনেম: <b className="text-cyan-300">@IshakTrading_bot</b> | এডমিন পাসওয়ার্ড: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">ishakdevos</code> (বটের ভেতর পরিবর্তনযোগ্য)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://t.me/IshakTrading_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:brightness-110 flex items-center gap-1.5 transition"
          >
            <span>টেলিগ্রাম বট খুলুন</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-[#0B132B] border border-cyan-500/20 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="কী, ডিভাইস বা ট্রেডার আইডি দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-gray-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-400"
          >
            <option value="all">সব কি ({keys.length})</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="blocked">ব্লকড (Blocked)</option>
            <option value="expired">মেয়াদোত্তীর্ণ (Expired)</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#070D1E] font-black text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কী তৈরি</span>
          </button>
        </div>
      </div>

      {/* License Keys Grid - Compact, Modern, High-Density Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredKeys.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs bg-[#0B132B]/50 rounded-2xl border border-slate-800">
            কোনো লাইসেন্স কি পাওয়া যায়নি
          </div>
        ) : (
          filteredKeys.map((k) => {
            const remaining = formatRemaining(k.exp, k.first_login_at, k.duration);
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
                className={`rounded-xl p-3 border transition-all duration-200 flex flex-col justify-between shadow-md hover:shadow-cyan-950/40 ${
                  !k.active
                    ? 'bg-red-950/20 border-red-500/40'
                    : remaining.isExpired
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-[#0B132B] border-cyan-500/30 hover:border-cyan-400'
                }`}
              >
                <div>
                  {/* Card Header: Tier & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          k.tier === 'LIFETIME'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : k.tier === 'TRIAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {k.tier}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {k.duration === 'lifetime' ? '♾️ Lifetime' : k.duration || '30d'}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                        !k.active
                          ? 'bg-red-500/20 text-red-400'
                          : remaining.isExpired
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${!k.active ? 'bg-red-400' : remaining.isExpired ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span>{!k.active ? 'ব্লকড' : remaining.isExpired ? 'মেয়াদ শেষ' : 'সক্রিয়'}</span>
                    </span>
                  </div>

                  {/* Key Code & Instant Copy */}
                  <div className="flex items-center justify-between bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-800 mb-2.5">
                    <span className="text-cyan-300 font-mono font-bold text-xs select-all truncate">
                      {k.key}
                    </span>
                    <button
                      onClick={() => handleCopy(k.key)}
                      className="text-gray-400 hover:text-cyan-400 transition ml-2 shrink-0 p-1"
                      title="কপি করুন"
                    >
                      {copiedKey === k.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Compact Info Grid */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10.5px] text-gray-300 mb-2.5 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>মেয়াদ:</span>
                      </span>
                      <b className={remaining.isExpired ? 'text-red-400 font-mono' : remaining.notStarted ? 'text-cyan-400' : 'text-emerald-400 font-mono'}>
                        {remaining.text}
                      </b>
                    </div>

                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-amber-400" />
                        <span>ডিভাইস:</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <b className={isBound ? 'text-amber-300 font-mono text-[10px]' : 'text-gray-400 text-[10px]'}>
                          {isUnlimitedDev
                            ? `${registeredDevices.length} / Unlimited`
                            : `${registeredDevices.length} / ${devLimit} Dev`}
                        </b>
                        {isBound && (
                          <button
                            onClick={() => handleResetDevice(k.key)}
                            title="ডিভাইস লক রিসেট করুন"
                            className="p-0.5 hover:text-cyan-400 text-gray-400"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {k.trader_id && (
                      <div className="flex items-center justify-between col-span-2">
                        <span className="text-gray-400">ট্রেডার ID:</span>
                        <b className="text-amber-400 font-mono">{k.trader_id}</b>
                      </div>
                    )}

                    {k.note && (
                      <div className="col-span-2 text-[10px] text-gray-400 italic truncate pt-0.5 border-t border-slate-800">
                        "{k.note}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Compact Actions Toolbar */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/90 text-xs">
                  <button
                    onClick={async () => {
                      await onToggleActive(k.key, k.active);
                      showActionToast(k.active ? 'কী ব্লক করা হয়েছে' : 'কী আনব্লক করা হয়েছে');
                    }}
                    className={`flex-1 py-1 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                      k.active
                        ? 'bg-red-950/40 text-red-400 hover:bg-red-900/40 border border-red-500/30'
                        : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-500/30'
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                    <span>{k.active ? 'ব্লক' : 'আনব্লক'}</span>
                  </button>

                  <button
                    onClick={async () => {
                      await onExtend(k.key, 30);
                      showActionToast('মেয়াদ +৩০ দিন বৃদ্ধি করা হয়েছে');
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] border border-cyan-500/20"
                    title="+৩০ দিন বাড়ান"
                  >
                    +30d
                  </button>

                  <button
                    onClick={() => {
                      setDeliveryLicense(k);
                      setShowDeliveryModal(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-bold flex items-center gap-1 transition"
                    title="কাস্টমার ডেলিভারি মেসেজ"
                  >
                    <Send className="w-3 h-3 text-cyan-400" />
                    <span>মেসেজ</span>
                  </button>

                  <button
                    onClick={async () => {
                      await onDeleteKey(k.key);
                      showActionToast('কী সফলভাবে ডিলিট করা হয়েছে');
                    }}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20"
                    title="ডিলিট করুন"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE NEW KEY MODAL WITH TIME LIMIT & DEVICE LIMIT OPTIONS */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B132B] border-2 border-cyan-400 rounded-2xl p-5 shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white">নতুন VIP লাইসেন্স তৈরি (Device & Time Controls)</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold"
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

              {/* ⏱️ TIME LIMIT SELECTION (5m, 10m, 1h, 1d, Lifetime, Custom) */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-cyan-500/30 space-y-2">
                <label className="text-gray-300 block font-medium flex items-center justify-between">
                  <span>⏱️ টাইম লিমিট (Time Limit):</span>
                  <span className="text-[10px] text-cyan-300 font-bold uppercase">
                    {timePreset === 'custom' ? `${customValue} ${customUnit}` : timePreset}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimePreset('5m')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      timePreset === '5m' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⚡ 5 Minutes
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('10m')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      timePreset === '10m' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⏱️ 10 Minutes
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('1h')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      timePreset === '1h' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⏳ 1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('1d')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      timePreset === '1d' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    📅 1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('lifetime')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      timePreset === 'lifetime' ? 'bg-purple-500 text-white' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    ♾️ Lifetime
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePreset('custom')}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition ${
                      timePreset === 'custom' ? 'bg-cyan-500 text-[#070D1E]' : 'bg-slate-950 text-gray-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    🛠️ Custom
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
                <p className="text-[10px] text-amber-400/90 leading-tight">
                  * লাইসেন্সের সময় ১ম বার বটে ব্যবহারের পর থেকে কাউন্টডাউন শুরু হবে!
                </p>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base sm:text-lg">
                    Supabase ক্লাউড ডাটাবেস কানেকশন ও SQL কোড
                  </h3>
                  <p className="text-xs text-gray-400">
                    আপনার লাইসেন্স ডাটাবেসে স্থায়ীভাবে সংরক্ষণ করতে নিচের SQL রান করুন ও তথ্য দিন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSupabaseModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition"
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

      {/* 📦 CUSTOMER DELIVERY MESSAGE MODAL */}
      {showDeliveryModal && deliveryLicense && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999998] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0B132B] border-2 border-cyan-400 rounded-2xl p-5 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <div>
                  <h3 className="text-sm font-black text-white">কাস্টমার ডেলিভারি মেসেজ (Ready-to-Send)</h3>
                  <p className="text-[11px] text-cyan-400">এই মেসেজটি কপি করে কাস্টমারকে সরাসরি পাঠিয়ে দিন</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold hover:bg-red-500 transition"
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
                  href={`https://t.me/share/url?url=&text=${encodeURIComponent(getDeliveryMessage(deliveryLicense))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>টেলিগ্রামে পাঠান</span>
                </a>

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
    </div>
  );
};
