import React, { useState } from 'react';
import { KeyRound, Plus, Copy, Check, Ban, CheckCircle2, Clock, Trash2, ShieldCheck, RefreshCw, Search, Smartphone, RotateCcw, AlertTriangle } from 'lucide-react';
import { LicenseRecord } from '../types';

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
  const [durationType, setDurationType] = useState<'preset' | 'custom'>('custom');
  const [presetDuration, setPresetDuration] = useState<string>('30d');
  const [customValue, setCustomValue] = useState<string>('5');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days' | 'lifetime'>('minutes');
  const [traderId, setTraderId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showActionToast(`কপি হয়েছে: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: any = {
      key: customKey.trim() || undefined,
      tier: selectedTier,
      traderId: traderId.trim() || undefined,
      note: note.trim() || undefined,
    };

    if (durationType === 'preset') {
      payload.duration = presetDuration;
    } else {
      payload.customValue = customValue;
      payload.customUnit = customUnit;
      payload.duration = customUnit === 'lifetime' ? 'lifetime' : `${customValue}${customUnit === 'minutes' ? 'm' : customUnit === 'hours' ? 'h' : 'd'}`;
    }

    const success = await onGenerateKey(payload);
    setIsSubmitting(false);

    if (success) {
      setCustomKey('');
      setTraderId('');
      setNote('');
      setShowCreateModal(false);
      showActionToast('✅ নতুন VIP লাইসেন্স সফলভাবে তৈরি হয়েছে!');
    } else {
      showActionToast('❌ লাইসেন্স তৈরিতে সমস্যা হয়েছে!', true);
    }
  };

  const handleResetDevice = async (key: string) => {
    try {
      const res = await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetDevice: true }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        showActionToast(`ডিভাইস আনলক হয়েছে: ${key}`);
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

        <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span>ডাটাবেস স্টোরেজ</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-white truncate">
            {isSupabaseActive ? 'Supabase Cloud' : 'Server Memory'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">ইনফরমেশন হাইড সিকিউর</div>
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

      {/* License Keys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredKeys.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs bg-[#0B132B]/50 rounded-2xl border border-slate-800">
            কোনো লাইসেন্স কি পাওয়া যায়নি
          </div>
        ) : (
          filteredKeys.map((k) => {
            const remaining = formatRemaining(k.exp, k.first_login_at, k.duration);
            const isBound = !!k.device_id;

            return (
              <div
                key={k.key}
                className={`rounded-2xl p-4 border transition flex flex-col justify-between shadow-lg ${
                  !k.active
                    ? 'bg-red-950/10 border-red-500/30'
                    : remaining.isExpired
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : 'bg-[#0B132B] border-cyan-500/30 hover:border-cyan-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        k.tier === 'LIFETIME'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : k.tier === 'TRIAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {k.tier}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        !k.active
                          ? 'bg-red-500/20 text-red-400'
                          : remaining.isExpired
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {!k.active ? 'ব্লকড' : remaining.isExpired ? 'মেয়াদ শেষ' : 'সক্রিয়'}
                    </span>
                  </div>

                  {/* Key Code & Copy */}
                  <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 mb-3">
                    <span className="text-cyan-300 font-mono font-bold text-xs select-all truncate">
                      {k.key}
                    </span>
                    <button
                      onClick={() => handleCopy(k.key)}
                      className="text-gray-400 hover:text-cyan-400 transition ml-2 shrink-0"
                      title="কপি করুন"
                    >
                      {copiedKey === k.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Device & Trader ID Info */}
                  <div className="space-y-1 text-[11px] text-gray-300 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        <span>ডিভাইস লক:</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <b className={isBound ? 'text-amber-400 font-mono text-[10px]' : 'text-gray-500 text-[10px]'}>
                          {isBound ? 'লকড (Locked)' : 'আনলক (Open)'}
                        </b>
                        {isBound && (
                          <button
                            onClick={() => handleResetDevice(k.key)}
                            title="ডিভাইস লক রিসেট করুন"
                            className="p-1 hover:text-cyan-400 text-gray-400"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">ট্রেডার আইডি:</span>
                      <b className="text-white font-mono">{k.trader_id || 'মুক্ত (Open)'}</b>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>মেয়াদ বাকি:</span>
                      </span>
                      <b className={remaining.isExpired ? 'text-red-400' : remaining.notStarted ? 'text-cyan-400' : 'text-emerald-400 font-mono'}>
                        {remaining.text}
                      </b>
                    </div>

                    {k.note && (
                      <div className="text-[10px] text-gray-400 italic pt-1 truncate">
                        "{k.note}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
                  <button
                    onClick={async () => {
                      await onToggleActive(k.key, k.active);
                      showActionToast(k.active ? 'কী ব্লক করা হয়েছে' : 'কী আনব্লক করা হয়েছে');
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
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
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold"
                    title="+৩০ দিন বাড়ান"
                  >
                    +30d
                  </button>

                  <button
                    onClick={async () => {
                      await onDeleteKey(k.key);
                      showActionToast('কী সফলভাবে ডিলিট করা হয়েছে');
                    }}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20"
                    title="ডিলিট করুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE NEW KEY MODAL WITH CUSTOM MINUTES/HOURS/DAYS */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B132B] border-2 border-cyan-400 rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white">কাস্টম VIP লাইসেন্স তৈরি (Supabase Cloud)</h3>
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
                <label className="text-gray-300 block mb-1">কাস্টম কী কোড (ঐচ্ছিক):</label>
                <input
                  type="text"
                  placeholder="ফাঁকা রাখলে অটোমেটিক কোড তৈরি হবে"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">লাইসেন্স টিয়ার:</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="VIP">VIP</option>
                    <option value="PRO">PRO</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="LIFETIME">LIFETIME</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 block mb-1">মেয়াদ মোড:</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDurationType('custom')}
                      className={`py-1 rounded-lg font-bold text-[10px] ${
                        durationType === 'custom' ? 'bg-cyan-500 text-[#070D1E]' : 'text-gray-400'
                      }`}
                    >
                      কাস্টম টাইম
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationType('preset')}
                      className={`py-1 rounded-lg font-bold text-[10px] ${
                        durationType === 'preset' ? 'bg-cyan-500 text-[#070D1E]' : 'text-gray-400'
                      }`}
                    >
                      প্রিসেট দিন
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Duration Selector (Minutes, Hours, Days, Lifetime) */}
              {durationType === 'custom' ? (
                <div className="bg-slate-900/90 p-3 rounded-xl border border-cyan-500/30 space-y-2">
                  <label className="text-[11px] text-cyan-300 font-bold block">
                    কাস্টম সময় সেট করুন (মিনিট / ঘণ্টা / দিন / পার্মানেন্ট):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {customUnit !== 'lifetime' ? (
                      <input
                        type="number"
                        min="1"
                        placeholder="সংখ্যা (উদা: ২, ৫, ১০)"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono outline-none focus:border-cyan-400"
                      />
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-purple-500/40 text-purple-300 font-bold text-center">
                        আনলিমিটেড লাইফটাইম
                      </div>
                    )}
                    <select
                      value={customUnit}
                      onChange={(e: any) => setCustomUnit(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-bold outline-none focus:border-cyan-400"
                    >
                      <option value="minutes">মিনিট (Minutes)</option>
                      <option value="hours">ঘণ্টা (Hours)</option>
                      <option value="days">দিন (Days)</option>
                      <option value="lifetime">পার্মানেন্ট (Lifetime)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-amber-400/90 leading-tight">
                    * লাইসেন্স এর মেয়াদ ১ম ডিভাইস থেকে লগইন করার পর থেকে শেষ হতে শুরু করবে!
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-gray-300 block mb-1">প্রিসেট মেয়াদ:</label>
                  <select
                    value={presetDuration}
                    onChange={(e) => setPresetDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="24h">২৪ ঘণ্টা (1 Day)</option>
                    <option value="7d">৭ দিন (1 Week)</option>
                    <option value="30d">৩০ দিন (1 Month)</option>
                    <option value="90d">৯০ দিন (3 Months)</option>
                    <option value="1y">১ বছর (1 Year)</option>
                    <option value="lifetime">লাইফটাইম (Lifetime)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-gray-300 block mb-1">ট্রেডার আইডি (ঐচ্ছিক, ফাঁকা রাখলে ১ম ব্যবহারে লক হবে):</label>
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
                  placeholder="উদা: রহিম ভাই - PocketOption / Quotex"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#070D1E] font-black text-xs shadow-md hover:brightness-110 active:scale-98 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'তৈরি হচ্ছে...' : 'জেনারেট ও ডাটাবেসে সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
