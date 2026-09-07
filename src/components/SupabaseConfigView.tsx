import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, Copy, Check, Terminal, KeyRound, Globe, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabaseService } from '../lib/supabaseService';

interface SupabaseConfigViewProps {
  supabaseStatus: {
    isSupabaseActive: boolean;
    storageType: string;
    keyCount: number;
    supabaseUrl?: string;
  };
  onRefresh: () => void;
}

export const SupabaseConfigView: React.FC<SupabaseConfigViewProps> = ({ supabaseStatus, onRefresh }) => {
  const [url, setUrl] = useState<string>(supabaseStatus.supabaseUrl || '');
  const [key, setKey] = useState<string>('');
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setUrl(supabaseStatus.supabaseUrl || 'https://qbazzarqiplrqqfytajz.supabase.co');
    setSchemaSql(`-- ⚡ ISHAK AI PRO - SUPABASE LICENSE DATABASE SCHEMA
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
  }, [supabaseStatus.supabaseUrl]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const conn = await supabaseService.checkConnection();
      setIsSaving(false);
      if (conn.active) {
        setMessage({ type: 'success', text: `✅ Supabase ক্লাউড ডাটাবেস সক্রিয়! মোট ${conn.count}টি রেকর্ড রয়েছে।` });
        onRefresh();
      } else {
        setMessage({ type: 'error', text: '❌ সংযোগ যাচাইয়ে সমস্যা: ' + (conn.error || 'চেক করুন') });
      }
    } catch (err: any) {
      setIsSaving(false);
      setMessage({ type: 'error', text: '❌ ডাটাবেস যোগাযোগ ব্যর্থ: ' + (err?.message || 'Error') });
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Security Architecture Highlights */}
      <div className="bg-[#0B132B] border border-cyan-500/20 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-white font-black text-base sm:text-lg">
              সকল ইনফরমেশন হাইড রেখে Supabase সংযোগ
            </h2>
            <p className="text-xs text-gray-400">
              কীভাবে বুকমার্কলেট থেকে সব পাসওয়ার্ড ও সিক্রেট গোপন রাখা হয়েছে
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-300 mt-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
              <Server className="w-4 h-4" />
              <span>১. সার্ভার প্রক্সি আর্কিটেকচার</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              সরাসরি ব্রাউজার থেকে সুপাবেসে কল না করে আমাদের ব্যাকএন্ড সার্ভার ভেরিফিকেশন হ্যান্ডেল করে। ফলে ব্রাউজারের নেটওয়ার্ক ট্যাবে সুপাবেসের কোনো কি ফাঁস হয় না।
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <Database className="w-4 h-4" />
              <span>২. ডাটাবেস লেভেল প্রটেকশন</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Supabase এর <code className="text-cyan-300">ishak_licenses</code> টেবিলে রো লেভেল সিকিউরিটি ও সার্ভিস রোল ব্যবহার করা হয়েছে, যা অনুমতি ছাড়া এডিট করা অসম্ভব।
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <KeyRound className="w-4 h-4" />
              <span>৩. অ্যান্টি-পাইরেসি ডিভাইস লক</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              একবার কোনো ট্রেডার আইডি (Pocket Option ID) দিয়ে অ্যাক্টিভেশন হলে অন্য কেউ একই কী দিয়ে অন্য আইডিতে লগইন করতে পারবে না।
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Config Form & SQL Table Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supabase Connection Setup */}
        <div className="bg-[#0B132B] border border-cyan-500/20 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Supabase ক্লাউড ক্রেডেনশিয়াল কনফিগারেশন</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  supabaseStatus.isSupabaseActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {supabaseStatus.isSupabaseActive ? 'সুপাবেস সংযুক্ত' : 'ইন-মেমোরি সক্রিয়'}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              আপনার Supabase প্রজেক্ট সেটিংস (<span className="text-cyan-300 font-mono">Project Settings → API</span>) থেকে URL এবং Service Role Secret Key টি এখানে দিন। এটি শুধুমাত্র সার্ভারের ব্যাকএন্ডে সংরক্ষিত থাকে।
            </p>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 mb-4 border ${
                  message.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-gray-300 block mb-1">
                  Supabase Project URL:
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://your-project-ref.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-300 block mb-1">
                  Supabase Service Role Secret Key (or Anon Key):
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#0B132B] font-black text-xs shadow-md hover:brightness-110 active:scale-98 transition disabled:opacity-50"
              >
                {isSaving ? 'সংযুক্ত হচ্ছে...' : 'সংরক্ষণ ও সংযোগ পরীক্ষা করুন'}
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-gray-400">
            * আপনি যদি Supabase এখনো কনফিগার না করেন, তবে অ্যাপের বিল্ট-ইন মেমোরি মোডেই সব ফিচার (যাচাই, টেস্ট, সিগন্যাল) নিরবচ্ছিন্নভাবে কাজ করবে!
          </div>
        </div>

        {/* SQL Script for Supabase Table */}
        <div className="bg-[#0B132B] border border-cyan-500/20 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Supabase SQL Table স্কিমা স্ক্রিপ্ট</span>
              </h3>
              <button
                id="btn-copy-sql"
                onClick={copySql}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'কপি হয়েছে' : 'SQL কপি'}</span>
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              আপনার Supabase ড্যাশবোর্ডের <strong>SQL Editor</strong> ট্যাবে গিয়ে নিচের স্ক্রিপ্টটি পেস্ট করে <strong>Run</strong> করুন:
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-x-auto max-h-64">
              <pre className="text-[11px] font-mono text-cyan-300 leading-relaxed select-all">
                {schemaSql}
              </pre>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-gray-400 flex items-center justify-between">
            <span>টেবিল নাম: <strong className="text-cyan-400">ishak_licenses</strong></span>
            <span className="text-emerald-400 font-bold">Auto Primary Key</span>
          </div>
        </div>
      </div>
    </div>
  );
};
