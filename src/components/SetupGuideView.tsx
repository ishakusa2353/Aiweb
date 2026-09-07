import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Copy, 
  Check, 
  ExternalLink, 
  Database, 
  Github, 
  Lock, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  ChevronRight,
  Terminal,
  Zap
} from 'lucide-react';

interface SetupGuideViewProps {
  supabaseStatus: {
    isSupabaseActive: boolean;
    storageType: string;
    keyCount: number;
    supabaseUrl?: string;
  };
  onGoToSupabase: () => void;
  onGoToBookmarklet: () => void;
  onOpenChangePass: () => void;
}

export const SetupGuideView: React.FC<SetupGuideViewProps> = ({
  supabaseStatus,
  onGoToSupabase,
  onGoToBookmarklet,
  onOpenChangePass,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const sqlCode = `-- Supabase SQL Editor এ পেস্ট করে Run দিন:
CREATE TABLE IF NOT EXISTS ishak_licenses (
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

-- RLS সক্রিয়করণ:
ALTER TABLE ishak_licenses ENABLE ROW LEVEL SECURITY;

-- অ্যাক্সেস পারমিশন পলিসি:
CREATE POLICY "Allow server service full access" ON ishak_licenses FOR ALL USING (true);`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Architecture & Overview */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#0F1C3F] to-[#070D1E] border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_40px_rgba(0,229,255,0.15)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-black uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>ISHAK AI MASTER ARCHITECTURE GUIDE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              কী কী ইনফরমেশন লাগবে এবং কীভাবে কাজ করবেন (সম্পূর্ণ গাইড)
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              আপনার রোবট সিস্টেমটি ১০০% নিরাপদ, প্রফেশনাল এবং আজীবন কার্যকর রাখার জন্য নিচের <span className="text-cyan-400 font-bold">৫টি গুরুত্বপূর্ণ তথ্য</span> প্রয়োজন। সবগুলো তথ্য সাজিয়ে কীভাবে ধাপে ধাপে চালু করবেন তা নিচে সহজভাবে দেখানো হলো।
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto shrink-0">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-700/80 space-y-1">
              <span className="text-[11px] text-gray-400 block font-medium">ডাটাবেস কানেকশন</span>
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span className={`w-2 h-2 rounded-full ${supabaseStatus.isSupabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className={supabaseStatus.isSupabaseActive ? 'text-emerald-300' : 'text-amber-300'}>
                  {supabaseStatus.isSupabaseActive ? 'Supabase Active' : 'লোকাল মেমোরি'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-700/80 space-y-1">
              <span className="text-[11px] text-gray-400 block font-medium">এডমিন সিকিউরিটি</span>
              <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>লকড (ishakdevos)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Essential Information Checklist Cards */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            <span>প্রয়োজনীয় ৫টি ইনফরমেশনের বিস্তারিত তালিকা (Checklist)</span>
          </h3>
          <span className="text-xs text-gray-400 font-mono">5 OF 5 SPECIFICATIONS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Supabase URL */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/20 space-y-2 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Database className="w-4 h-4" />
                <span>১. Supabase Project URL</span>
              </div>
              {supabaseStatus.isSupabaseActive ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">সংযুক্ত</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">প্রয়োজন</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              সুপাবেস প্রজেক্টের Settings ➔ API পেজ থেকে পাওয়া যায় (যেমন: <code className="text-cyan-300">https://xyz.supabase.co</code>)।
            </p>
            <button
              onClick={onGoToSupabase}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 pt-1"
            >
              <span>সেটআপ ট্যাবে যান</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Supabase Key */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/20 space-y-2 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>২. Supabase API Key</span>
              </div>
              {supabaseStatus.isSupabaseActive ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">সেভড</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">প্রয়োজন</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              সুপাবেস Settings ➔ API থেকে <code className="text-teal-300">service_role secret</code> বা <code className="text-teal-300">anon public key</code>।
            </p>
            <button
              onClick={onGoToSupabase}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 pt-1"
            >
              <span>কী কনফিগার করুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. GitHub Repository */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/20 space-y-2 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Github className="w-4 h-4" />
                <span>৩. GitHub রিপোজিটরি ও ফাইল</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">loader.js</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              আপনার গিটহাবে একটি পাবলিক রিপোজিটরি (যেমন: <code className="text-purple-300">ishak-bot</code>) এবং তার ভেতরে <code className="text-purple-300">loader.js</code> ফাইল।
            </p>
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 pt-1"
            >
              <span>নতুন রিপোজিটরি খুলুন ↗</span>
            </a>
          </div>

          {/* 4. jsDelivr CDN লিঙ্ক */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/20 space-y-2 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Zap className="w-4 h-4" />
                <span>৪. jsDelivr ফাস্ট সিডিএন লিঙ্ক</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ফ্রি</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              গিটহাব ফাইলের লিঙ্ক যেমন: <br />
              <code className="text-emerald-300 break-all text-[10px]">https://cdn.jsdelivr.net/gh/ইউজারনেম/ishak-bot@main/loader.js</code>
            </p>
            <button
              onClick={onGoToBookmarklet}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 pt-1"
            >
              <span>atob শর্ট কোড বানান</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5. Admin Password */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/20 space-y-2 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>৫. এডমিন নিরাপত্তা পাসওয়ার্ড</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">ishakdevos</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              বর্তমান ডিফল্ট পাসওয়ার্ড: <code className="text-amber-300 font-bold">ishakdevos</code>। আপনি যেকোনো সময় ভিতর থেকে পরিবর্তন করতে পারবেন।
            </p>
            <button
              onClick={onOpenChangePass}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 pt-1"
            >
              <span>পাসওয়ার্ড পরিবর্তন করুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 6. Device Lock Rule */}
          <div className="p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/20 space-y-2 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <Cpu className="w-4 h-4" />
                <span>৬. অটো ডিভাইস লক প্রটেকশন</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">সক্রিয়</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              কোনো ট্রেডার কি শেয়ার করলে তা ব্লক হবে। ইউজার ডিভাইস বদলালে অ্যাডমিন প্যানেলের "রিসেট ডিভাইস" বাটনে ১-ক্লিকেই আনলক করতে পারবেন।
            </p>
            <span className="text-[11px] text-sky-300/70 block pt-1 font-mono">1 Key = 1 Device Protected</span>
          </div>
        </div>
      </div>

      {/* Step-by-Step Practical Walkthrough with Code Snippets */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span>স্টেপ-বাই-স্টেপ প্র্যাকটিক্যাল এক্সিকিউশন গাইড</span>
        </h3>

        {/* Step 1: SQL Code */}
        <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wide">ধাপ ১</span>
              <h4 className="text-white font-bold text-base">Supabase-এ ডাটাবেস টেবিল তৈরি (SQL Query)</h4>
            </div>
            <button
              onClick={() => handleCopy(sqlCode, 'sql')}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 transition text-xs font-bold flex items-center gap-1.5"
            >
              {copiedIndex === 'sql' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedIndex === 'sql' ? 'SQL কপি হয়েছে!' : 'SQL কোড কপি করুন'}</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">
            [Supabase.com](https://supabase.com) এ লগইন করে আপনার প্রজেক্টের <strong>SQL Editor</strong>-এ গিয়ে নিচের কোড পেস্ট করে <strong>Run</strong> দিন:
          </p>
          <pre className="p-4 rounded-2xl bg-black/70 border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto select-all leading-relaxed">
            {sqlCode}
          </pre>
        </div>

        {/* Step 2: GitHub File */}
        <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3">
          <span className="text-xs font-black text-purple-400 uppercase tracking-wide">ধাপ ২</span>
          <h4 className="text-white font-bold text-base">GitHub-এ loader.js ফাইল আপলোড ও পাবলিশ</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            ১. GitHub-এ <strong>ishak-bot</strong> নামে একটি Public Repo খুলুন।<br />
            ২. সেখানে <strong>loader.js</strong> নামে নতুন ফাইল বানিয়ে আমাদের সার্ভারের ফুল কোডটি পেস্ট করে Commit দিন।<br />
            ৩. সরাসরি এই লিঙ্কে গেলে সম্পূর্ণ আপডেট কোড পেয়ে যাবেন:
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-slate-800 text-xs">
            <code className="text-emerald-400 font-mono break-all">
              {window.location.origin}/loader.js
            </code>
            <a
              href="/loader.js"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-bold transition shrink-0 ml-3"
            >
              কোড দেখুন ↗
            </a>
          </div>
        </div>

        {/* Step 3: atob Bookmarklet */}
        <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">ধাপ ৩</span>
          <h4 className="text-white font-bold text-base">১-লাইনের atob শর্ট কোড বুকমার্কে সেভ ও টেস্ট</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            আমাদের অ্যাপের <strong>"বুকমার্কলেট কোড"</strong> ট্যাবে গিয়ে কাস্টম ইউআরএল জেনারেটরে আপনার লিঙ্কটি দিলেই ইনস্ট্যান্ট ১-লাইনের শর্ট কোড পেয়ে যাবেন। সেটি কোটেক্স পেজে বুকমার্কে সেভ করে ক্লিক করলেই রোবট পেজে হাজির হয়ে যাবে!
          </p>
        </div>
      </div>
    </div>
  );
};
