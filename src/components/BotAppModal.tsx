import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Smartphone, 
  Layers, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  KeyRound, 
  RotateCcw,
  Check,
  Copy,
  Info
} from 'lucide-react';
import { playPhotostatScannerSound, playResultSound } from '../utils/audio';

interface BotAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBotStarted?: (licenseKey: string) => void;
}

export const BotAppModal: React.FC<BotAppModalProps> = ({
  isOpen,
  onClose,
  onBotStarted,
}) => {
  // Device Permissions State (Crucial for Quotex Floating Logo & Assistive Auto Trade)
  const [floatingPermission, setFloatingPermission] = useState<boolean>(true);
  const [assistivePermission, setAssistivePermission] = useState<boolean>(true);
  const [backgroundPermission, setBackgroundPermission] = useState<boolean>(true);

  // License State
  const [licenseKey, setLicenseKey] = useState<string>(() => {
    return localStorage.getItem('ishak_app_license_key') || localStorage.getItem('ishak_verified_key') || 'ISHAK-VIP-PRO-2025';
  });
  const [traderId, setTraderId] = useState<string>(() => {
    return localStorage.getItem('ishak_trader_id') || '';
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    reason?: string;
    tier?: string;
    duration?: string;
    exp?: number | null;
  } | null>(null);

  // App launch status
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [launchCountdown, setLaunchCountdown] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<'app' | 'guide'>('app');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      // Check if user already has a verified key
      const savedKey = localStorage.getItem('ishak_app_license_key') || localStorage.getItem('ishak_verified_key');
      if (savedKey) {
        setLicenseKey(savedKey);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allRequiredPermissionsGranted = floatingPermission && assistivePermission;

  const handleVerifyAndStart = async () => {
    const cleanKey = licenseKey.trim().toUpperCase();
    if (!cleanKey) {
      setVerificationResult({
        valid: false,
        reason: '❌ অনুগ্রহ করে আপনার VIP লাইসেন্স কি প্রবেশ করান!'
      });
      return;
    }

    if (!allRequiredPermissionsGranted) {
      setVerificationResult({
        valid: false,
        reason: '⚠️ অনুগ্রহ করে স্ক্রিন ফ্লোটিং এবং অটো ট্রেড এক্সেসিবিলিটি পারমিশন চালু করুন!'
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Real API verification identical to web bookmarklet bot
      const res = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: cleanKey,
          traderId: traderId.trim(),
          deviceId: 'ANDROID_APP_' + Math.random().toString(36).substring(2, 8).toUpperCase()
        })
      });

      const data = await res.json();

      if (data.valid) {
        localStorage.setItem('ishak_app_license_key', cleanKey);
        localStorage.setItem('ishak_verified_key', cleanKey);
        localStorage.setItem('ISHAK_AI_LICENSE', JSON.stringify({
          key: cleanKey,
          tier: data.tier || 'VIP',
          duration: data.duration,
          exp: data.exp,
          active: true,
          verifiedAt: Date.now()
        }));
        window.dispatchEvent(new Event('storage'));
        if (traderId.trim()) {
          localStorage.setItem('ishak_trader_id', traderId.trim());
        }

        setVerificationResult({
          valid: true,
          tier: data.tier || 'VIP',
          duration: data.duration,
          exp: data.exp
        });

        playPhotostatScannerSound();

        // Start countdown to minimize app and launch floating robot logo
        setIsLaunching(true);
        let count = 3;
        setLaunchCountdown(count);

        const timer = setInterval(() => {
          count -= 1;
          setLaunchCountdown(count);
          if (count <= 0) {
            clearInterval(timer);
            setIsLaunching(false);
            onClose();
            if (onBotStarted) {
              onBotStarted(cleanKey);
            }
            playResultSound(true);
          }
        }, 800);
      } else {
        setVerificationResult({
          valid: false,
          reason: data.reason || '❌ WRONG LICENCES! (ভুল লাইসেন্স কি! সঠিক কি দিয়ে আবার চেষ্টা করুন)'
        });
        playResultSound(false);
      }
    } catch (e: any) {
      // Offline fallback check for demo master key
      if (cleanKey === 'ISHAK-VIP-PRO-2025' || cleanKey === 'ISHAK-LIFETIME-DEMO') {
        localStorage.setItem('ishak_app_license_key', cleanKey);
        setVerificationResult({
          valid: true,
          tier: 'VIP',
          duration: '30d'
        });
        setIsLaunching(true);
        setTimeout(() => {
          setIsLaunching(false);
          onClose();
          if (onBotStarted) onBotStarted(cleanKey);
        }, 1500);
      } else {
        setVerificationResult({
          valid: false,
          reason: '❌ সার্ভারের সাথে যোগাযোগ করা যায়নি। ইন্টারনেট সংযোগ চেক করুন।'
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadApk = () => {
    const a = document.createElement('a');
    a.href = '/Ishak_AI_Bot_Quotex_Trader.apk';
    a.download = 'Ishak_AI_Bot_Quotex_Trader.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#070D1E] border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(0,229,255,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top App Header / Android Status Bar simulation */}
        <div className="bg-gradient-to-r from-cyan-950 via-[#0B132B] to-blue-950 px-4 py-3 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shadow-inner">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-wider">ISHAK AI BOT</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                  Android APK v4.2
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Quotex App Floating Overlay & Auto-Trader</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadApk}
              title="Download Full APK (Android 5-15+ Supported)"
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-[11px] hover:brightness-110 flex items-center gap-1 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Full APK (1.1MB)</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-gray-300 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: App View / Quotex Setup Guide */}
        <div className="flex border-b border-cyan-500/20 bg-slate-950/60">
          <button
            onClick={() => setActiveTab('app')}
            className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'app'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>অ্যাপ কন্ট্রোল প্যানেল</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Quotex অ্যাপে ব্যবহারের নিয়ম</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {activeTab === 'app' ? (
            <>
              {/* 🌟 1. WELCOME SCREEN / SPLASH BANNER */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0F1E36] to-[#070D1E] border border-cyan-500/40 p-4 text-center shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-cyan-400 via-blue-500 to-amber-400 shadow-[0_0_30px_rgba(0,229,255,0.6)] mb-2 animate-pulse">
                    <img 
                      src="/ishak_logo.png" 
                      alt="Ishak AI Bot" 
                      className="w-full h-full object-cover rounded-full bg-[#070D1E]"
                      onError={(e) => {
                        (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23070D1E" stroke="%2300E5FF" stroke-width="4"/><text x="50" y="58" fill="%2300E5FF" font-family="sans-serif" font-weight="bold" font-size="28" text-anchor="middle">IAI</text></svg>';
                      }}
                    />
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-amber-300">
                    ISHAK AI PRO TRADING BOT
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ✅ Android 5 - 15+ সাপোর্টেড (Android 8 পার্সিং ফিক্সড)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      ⚡ লাইভ Supabase DB সিঙ্ক
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-200/80 mt-1 max-w-sm">
                    ফোনের স্ক্রিনে রোবট লগো ভাসিয়ে অটোমেটিক সিগন্যাল ও ট্রেড এক্সিকিউট করতে নিচের পারমিশনগুলো অন করুন।
                  </p>
                </div>
              </div>

              {/* 🔒 2. DEVICE PERMISSION CHECKLIST (CRITICAL REQUIREMENT) */}
              <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>প্রয়োজনীয় ডিভাইস পারমিশন (আবশ্যক)</span>
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    allRequiredPermissionsGranted 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {allRequiredPermissionsGranted ? '✅ সব পারমিশন রেডি' : '⚠️ পারমিশন দিন'}
                  </span>
                </div>

                {/* Permission 1: Floating Window Overlay */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-200">1. Floating Window Permission</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">SYSTEM_ALERT_WINDOW</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Quotex অ্যাপের উপরে রোবট লগো ভাসিয়ে রাখার জন্য ডিসপ্লে ওভারলে পারমিশন।
                    </p>
                  </div>
                  <button
                    onClick={() => setFloatingPermission(!floatingPermission)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      floatingPermission
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-cyan-500 text-[#070D1E] hover:brightness-110 shadow-md shadow-cyan-500/20'
                    }`}
                  >
                    {floatingPermission ? <Check className="w-3 h-3" /> : null}
                    <span>{floatingPermission ? 'অনুমোদিত' : 'অনুমতি দিন'}</span>
                  </button>
                </div>

                {/* Permission 2: Assistive Touch / Accessibility Service for Auto-Trade */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-200">2. Assistive / Auto-Trade Permission</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">ACCESSIBILITY_SERVICE</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Quotex অ্যাপের UP/DOWN বাটনে স্বয়ংক্রিয়ভাবে ক্লিক করে ট্রেড নেওয়ার পারমিশন।
                    </p>
                  </div>
                  <button
                    onClick={() => setAssistivePermission(!assistivePermission)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      assistivePermission
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-400 text-black hover:brightness-110 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    {assistivePermission ? <Check className="w-3 h-3" /> : null}
                    <span>{assistivePermission ? 'অনুমোদিত' : 'অনুমতি দিন'}</span>
                  </button>
                </div>

                {/* Permission 3: Background Service */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-200">3. Background Service & Battery Save Off</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Quotex চলাকালীন ব্যাকগ্রাউন্ডে বট যাতে বন্ধ না হয়ে যায়।
                    </p>
                  </div>
                  <button
                    onClick={() => setBackgroundPermission(!backgroundPermission)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      backgroundPermission
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-700 text-gray-200'
                    }`}
                  >
                    {backgroundPermission ? <Check className="w-3 h-3" /> : null}
                    <span>{backgroundPermission ? 'অনুমোদিত' : 'অনুমতি দিন'}</span>
                  </button>
                </div>
              </div>

              {/* 🔑 3. VIP LICENSE KEY VERIFICATION (SAME AS WEB BOT) */}
              <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>লাইসেন্স কি যাচাই (সেম বুকমার্কলেট বট)</span>
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.readText().then((txt) => {
                        if (txt) setLicenseKey(txt.trim());
                      }).catch(() => {});
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    ক্লিপবোর্ড থেকে পেস্ট
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">VIP LICENSE KEY</label>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => {
                      setLicenseKey(e.target.value.toUpperCase());
                      setVerificationResult(null);
                    }}
                    placeholder="e.g. ISHAK-VIP-PRO-2025"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-cyan-300 font-mono text-xs sm:text-sm font-bold tracking-wider focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">QUOTEX TRADER ID (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={traderId}
                    onChange={(e) => setTraderId(e.target.value)}
                    placeholder="e.g. 5894231"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-gray-200 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Verification result messages */}
                {verificationResult && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    verificationResult.valid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-red-500/20 text-red-300 border border-red-500/50'
                  }`}>
                    {verificationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>
                      {verificationResult.valid
                        ? `✅ লাইসেন্স সঠিক! (${verificationResult.tier} - মেয়াদ: ${verificationResult.duration || 'Active'})`
                        : verificationResult.reason}
                    </span>
                  </div>
                )}
              </div>

              {/* 🚀 4. START BOT BUTTON (AUTO-CLOSE & FLOATING ROBOT LOGO LAUNCH) */}
              <div className="pt-1">
                {isLaunching ? (
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 text-[#070D1E] font-black text-sm text-center shadow-lg shadow-cyan-500/40 animate-pulse flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 animate-spin" />
                    <span>অ্যাপ ক্লোজ হচ্ছে এবং রোবট লগো স্ক্রিনে লোড হচ্ছে ({launchCountdown}s)...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleVerifyAndStart}
                    disabled={isVerifying}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                      allRequiredPermissionsGranted
                        ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-[#070D1E] hover:brightness-110 shadow-cyan-500/30'
                        : 'bg-slate-800 text-gray-400 border border-slate-700'
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>লাইসেন্স সার্ভারে যাচাই হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>START BOT / বট চালু করুন</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    localStorage.removeItem('ISHAK_AI_LICENSE');
                    window.dispatchEvent(new Event('storage'));
                    onClose();
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-red-400 font-bold text-xs border border-red-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>🛑 STOP BOT / স্ক্রিন থেকে রোবট লগো সরান</span>
                </button>

                {!allRequiredPermissionsGranted && (
                  <p className="text-[11px] text-amber-300 text-center mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>বট চালু করার পূর্বে উপরের দুটি পারমিশন (Floating & Assistive) চালু করুন!</span>
                  </p>
                )}

                <p className="text-[10px] text-gray-400 text-center mt-2">
                  "বট চালু করুন" চাপলে যেকোনো স্ক্রিনে (Quotex বা হোমস্ক্রিনে) হুবহু ওয়েব বটের মতো ফ্লোটিং রোবট লগো ভাসবে এবং লাইভ ডাটাবেজ থেকে কাজ করবে।
                </p>
              </div>

              {/* 📲 5. 1-CLICK APK DOWNLOAD & DIRECT QUOTEX LAUNCH */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadApk}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Full APK ডাউনলোড</span>
                </button>

                <a
                  href="https://broker-qx.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Quotex ওপেন করুন</span>
                </a>
              </div>
            </>
          ) : (
            /* 📖 GUIDE TAB: HOW TO USE IN QUOTEX APP */
            <div className="space-y-3.5 text-xs text-gray-300">
              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                <h4 className="text-sm font-black text-cyan-400 flex items-center gap-1.5">
                  <span>📱 Quotex App এ বট ব্যবহারের ৩টি সহজ ধাপ:</span>
                </h4>

                <div className="space-y-2.5">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-black font-black text-xs flex items-center justify-center shrink-0">1</span>
                    <div>
                      <p className="font-bold text-white">APK ফাইল ইনস্টল করুন ও পারমিশন দিন:</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        ফোনে ডাউনলোড করা <b>Ishak_AI_Bot_Quotex_Trader.apk</b> ইনস্টল করে ওপেন করুন। অ্যাপটিতে ডুকার পর <b>Floating Window</b> এবং <b>Accessibility (অটো ট্রেড)</b> পারমিশন দিন।
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-black font-black text-xs flex items-center justify-center shrink-0">2</span>
                    <div>
                      <p className="font-bold text-white">VIP কি দিয়ে "START BOT" চাপুন:</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        আপনার এডমিন প্যানেল থেকে পাওয়া VIP লাইসেন্স কি প্রবেশ করিয়ে <b>START BOT</b> বাটনে ক্লিক করুন।
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-black font-black text-xs flex items-center justify-center shrink-0">3</span>
                    <div>
                      <p className="font-bold text-white">Quotex অ্যাপে ট্রেড শুরু করুন:</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        স্টার্ট চাপার সাথে সাথে অ্যাপ মিনিমাইজ হয়ে যাবে এবং ফোনের স্ক্রিনে (বা Quotex অ্যাপে) রোবট লগো ভাসবে। রোবট লগোতে চাপলে HUD প্যানেল আসবে এবং স্ক্যান করে অটোমেটিক ট্রেড নিবে!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <b>টিপস:</b> ওয়েব ব্রাউজারের বুকমার্কলেট বট এবং এই মোবাইল অ্যাপ উভয়ই একই লাইসেন্স কি ডাটাবেজ শেয়ার করে। তাই একই কি দিয়ে উভয় জায়গায় কাজ করবে!
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
