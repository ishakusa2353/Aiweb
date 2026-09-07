import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, ShieldCheck, AlertTriangle, Sparkles, Zap, Globe, FileCode, Lock, ArrowRight, Wand2, Download } from 'lucide-react';

export const BookmarkletView: React.FC = () => {
  const [bookmarkletCode, setBookmarkletCode] = useState<string>('');
  const [minifiedCode, setMinifiedCode] = useState<string>('');
  const [shortLoader, setShortLoader] = useState<string>('');
  const [obfuscatedLoader, setObfuscatedLoader] = useState<string>('');
  const [formattedObfuscated, setFormattedObfuscated] = useState<string>('');
  const [encodedUrl, setEncodedUrl] = useState<string>('');
  const [scriptUrl, setScriptUrl] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [customInputUrl, setCustomInputUrl] = useState<string>('');
  const [customGeneratedCode, setCustomGeneratedCode] = useState<string>('');
  const [ghUsername, setGhUsername] = useState<string>('ishakdevos');
  const [ghRepo, setGhRepo] = useState<string>('ishak-bot');

  const ghJsdelivrUrl = `https://cdn.jsdelivr.net/gh/${ghUsername || 'USER'}/${ghRepo || 'REPO'}@main/loader.js`;
  const ghEncoded = btoa(ghJsdelivrUrl);
  const generatedGhAtob = `javascript:(function(){var u=atob('${ghEncoded}');var s=document.createElement('script');s.src=u+'?t='+Date.now();document.head.appendChild(s);})();`;
  const generatedGhDirect = `javascript:(function(){var s=document.createElement('script');s.src='${ghJsdelivrUrl}?t='+Date.now();document.head.appendChild(s);})();`;

  useEffect(() => {
    fetch('/api/bookmarklet-code')
      .then((res) => res.json())
      .then((data) => {
        const domain = data.baseUrl || window.location.origin;
        const liveScriptUrl = data.scriptUrl || `${domain}/loader.js`;
        const b64 = data.encodedUrl || btoa(liveScriptUrl);

        setBaseUrl(domain);
        setBookmarkletCode(data.code || '');
        setMinifiedCode(data.bookmarkletUrl || (data.code || '').replace(/\n\s*/g, ' '));
        setScriptUrl(liveScriptUrl);
        setEncodedUrl(b64);
        setShortLoader(data.shortLoader || `javascript:(function(){var s=document.createElement('script');s.src='${liveScriptUrl}?t='+Date.now();document.body.appendChild(s);})();`);

        const obf = `javascript:(function(){var u=atob('${b64}');var s=document.createElement('script');s.src=u+'?t='+Date.now();document.head.appendChild(s);})();`;
        setObfuscatedLoader(obf);
        setFormattedObfuscated(`javascript:(function(){\n  var u = atob('${b64}');\n  var s = document.createElement('script');\n  s.src = u + '?t=' + Date.now();\n  document.head.appendChild(s);\n})();`);

        setCustomInputUrl(liveScriptUrl);
        setCustomGeneratedCode(obf);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadLoader = () => {
    const raw = bookmarkletCode.replace(/^javascript:/, '');
    const blob = new Blob([raw], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loader.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomInputUrl(url);
    try {
      const trimmed = url.trim();
      if (!trimmed) {
        setCustomGeneratedCode('');
        return;
      }
      const b64 = btoa(trimmed);
      setCustomGeneratedCode(
        `javascript:(function(){\n  var u = atob('${b64}');\n  var s = document.createElement('script');\n  s.src = u + '?t=' + Date.now();\n  document.head.appendChild(s);\n})();`
      );
    } catch (e) {
      // Invalid chars for btoa fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* 🌟 EXACT atob() SHORTCUT LOADER (User Requested Pattern) */}
      <div className="bg-gradient-to-r from-[#070D1E] via-[#0B132B] to-[#111F43] border-2 border-cyan-400 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/30">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-black tracking-wide border border-cyan-400/40">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>ENCAPSULATED atob() SHORT LOADER (আপনার চাওয়া ফরম্যাট)</span>
            </div>
            <h3 className="text-white font-black text-base sm:text-xl">
              Ishak AI আল্ট্রা-শর্ট হিডেন ইউআরএল লোডার
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
              আপনার দেওয়া হুবহু টেকনিক দিয়ে তৈরি করা হয়েছে! এটি <code className="text-cyan-300 font-mono">atob()</code> এর মাধ্যমে আপনার সার্ভার ইউআরএলটি এনক্রিপ্ট/হাইড করে রাখে এবং ব্রাউজারে রান হওয়ামাত্র সার্ভার থেকে বড় কোডটি লোড করে নেয়।
            </p>
          </div>

          <button
            id="btn-copy-atob-loader"
            onClick={() => handleCopy(obfuscatedLoader, 'atob')}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 text-[#070D1E] font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition shrink-0"
          >
            {copiedType === 'atob' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedType === 'atob' ? 'কপি সফল হয়েছে!' : 'শর্ট কোড কপি করুন'}</span>
          </button>
        </div>

        {/* Code Visual Box */}
        <div className="mt-4 bg-black/80 rounded-2xl p-4 border border-cyan-500/40 relative font-mono text-xs text-cyan-300 select-all leading-relaxed shadow-inner">
          <div className="text-gray-500 text-[10px] mb-1">// ⚡ ব্রাউজারের বুকমার্কে সেভ করার জন্য ১-লাইনের সুরক্ষিত শর্টকাট কোড:</div>
          <div className="break-all text-emerald-400 font-bold">
            {obfuscatedLoader || 'Loading...'}
          </div>
        </div>

        {/* Explanatory 3-Step Card */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-300">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <span>১. atob() ডিকোড মেকানিজম</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              <code className="text-cyan-300">atob('{encodedUrl.substring(0, 14)}...')</code> ব্যবহার করায় কোনো ইউজার আপনার মূল স্ক্রিপ্টের ডোমেন বা ইউআরএল সরাসরি এক নজরে দেখতে পারে না।
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span>২. লাইভ মেমোরি ইনজেকশন</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              <code className="text-emerald-300">document.head.appendChild(s)</code> স্ক্রিপ্ট ট্যাগ তৈরি করে পেজে ইনজেক্ট করে। ফলে ১ ক্লিকেই স্বয়ংক্রিয়ভাবে কোটেক্স প্ল্যাটফর্মে রোবট চলে আসে।
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-amber-400 font-bold flex items-center gap-1.5">
              <span>৩. ক্যাশ-বাইপাস রিয়েলটাইম আপডেট</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              <code className="text-amber-300">?t=Date.now()</code> থাকার কারণে ব্রাউজার কখনোই পুরানো ফাইল ক্যাশ করে রাখে না। আপনি সার্ভারে আপডেট দিলেই সবাই ইনস্ট্যান্ট নতুন ফিচার পেয়ে যায়।
            </p>
          </div>
        </div>

        {/* Live Serving Endpoints */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-gray-300">আপনার সক্রিয় স্ক্রিপ্ট এন্ডপয়েন্ট:</span>
            <code className="text-emerald-400 font-mono font-bold break-all">{scriptUrl}</code>
          </div>
          <a
            href={scriptUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 transition text-[11px] font-bold shrink-0"
          >
            সরাসরি কোড দেখুন ↗
          </a>
        </div>
      </div>

      {/* 🚀 GITHUB PUBLISHING WORKFLOW & DEDICATED LOADER.JS GENERATOR */}
      <div className="bg-gradient-to-br from-[#070D1E] via-[#0B132B] to-[#0A1A3A] border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black tracking-wide border border-emerald-400/40">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>GITHUB LOADER.JS WORKFLOW & SHORT SCRIPT GENERATOR</span>
            </div>
            <h3 className="text-white font-black text-lg sm:text-xl">
              গিটহাব (GitHub) রিপোজিটরির জন্য সম্পুর্ণ লম্বা loader.js ফাইল ও শর্টকাট কোড
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
              আপনি গিটহাবে এই লম্বা কোডটি দিয়ে <code className="text-emerald-300 font-mono">loader.js</code> ফাইল বানাবেন। এরপর নিচে আপনার GitHub ইউজারনেম দিলেই সাইট আপনাকে সরাসরি <strong>atob() এনক্রিপ্টেড শর্ট স্ক্রিপ্ট</strong> তৈরি করে দিবে, যা কোটেক্সে ব্রাউজার বুকমার্ক হিসেবে রান হবে!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-copy-gh-loader"
              onClick={() => handleCopy(bookmarkletCode.replace(/^javascript:/, ''), 'gh-raw')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-[#070D1E] font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition"
            >
              {copiedType === 'gh-raw' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedType === 'gh-raw' ? 'লম্বা কোড কপি হয়েছে!' : 'GitHub লম্বা কোড কপি করুন'}</span>
            </button>
          </div>
        </div>

        {/* 3 Step Instruction Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-black text-[10px]">১ম ধাপ</span>
            <h4 className="text-white font-bold text-sm">GitHub রিপোজিটরি তৈরি</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              GitHub-এ গিয়ে একটি নতুন <strong>Public</strong> রিপোজিটরি তৈরি করুন (উদাহরণস্বরূপ নাম দিন: <code className="text-cyan-300 font-mono">ishak-bot</code>)।
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px]">২য় ধাপ</span>
            <h4 className="text-white font-bold text-sm">loader.js ফাইলে কোড পেস্ট</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              রিপোজিটরিতে <strong>Add file &gt; Create new file</strong> দিন। ফাইলের নাম দিন <code className="text-emerald-300 font-mono">loader.js</code> এবং নিচের লম্বা কোডটি হুবহু পেস্ট করে <strong>Commit changes</strong> করুন।
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px]">৩য় ধাপ</span>
            <h4 className="text-white font-bold text-sm">শর্টকাট বুকমার্কলেট ব্যবহার</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              নিচের ঘরে আপনার গিটহাব ইউজারনেম বসালে স্বয়ংক্রিয়ভাবে একটি শর্টকাট কোড তৈরি হবে। ওই শর্টকাটটি বুকমার্কে সেভ করে কোটেক্সে ক্লিক করলেই আপনার গিটহাব থেকে মূল কোড রান হবে!
            </p>
          </div>
        </div>

        {/* Full Long Code Box Preview with Expand/Collapse */}
        <div className="bg-black/90 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold text-xs">
                GitHub এর loader.js ফাইলে দেওয়ার জন্য সম্পূর্ণ সোর্স কোড ({Math.round((bookmarkletCode.length / 1024) * 10) / 10} KB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadLoader}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition text-xs font-bold flex items-center gap-1.5"
                title="সরাসরি loader.js ফাইল ডাউনলোড করুন"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ফাইল ডাউনলোড (.js)</span>
              </button>
              <button
                onClick={() => handleCopy(bookmarkletCode.replace(/^javascript:/, ''), 'gh-raw')}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition text-xs font-bold flex items-center gap-1.5 font-mono"
              >
                {copiedType === 'gh-raw' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'gh-raw' ? 'কপি সফল!' : 'কোড কপি করুন'}</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              readOnly
              rows={8}
              value={bookmarkletCode.replace(/^javascript:/, '')}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full bg-[#050A18] border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-gray-300 leading-relaxed outline-none focus:border-emerald-400 shadow-inner select-all"
            />
            <div className="text-[10px] text-gray-500 mt-1">
              💡 টিপস: বক্সে ক্লিক করে <strong>Ctrl + A</strong> দিয়ে সব সিলেক্ট করে কপি করতে পারেন অথবা উপরের সবুজ বাটনে ক্লিক করলেই একবারে কপি হয়ে যাবে।
            </div>
          </div>
        </div>

        {/* Live GitHub Shortcut Code Generator */}
        <div className="bg-[#070D1E] border border-cyan-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Wand2 className="w-4 h-4" />
            <span>আপনার GitHub রিপোজিটরি থেকে ১-লাইনের শর্টকাট কোড জেনারেটর:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                আপনার GitHub ইউজারনেম (Username):
              </label>
              <input
                type="text"
                value={ghUsername}
                onChange={(e) => setGhUsername(e.target.value.trim())}
                placeholder="যেমন: ishakdevos"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                GitHub রিপোজিটরি নাম (Repository Name):
              </label>
              <input
                type="text"
                value={ghRepo}
                onChange={(e) => setGhRepo(e.target.value.trim())}
                placeholder="যেমন: ishak-bot"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-slate-700 text-white font-mono text-xs outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Generated GitHub Short Bookmarklet */}
          {ghUsername && ghRepo && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* Option A: atob Encrypted (Most Secure) */}
              <div className="bg-black/80 rounded-xl p-3.5 border border-cyan-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-white font-bold text-xs">
                      ১. atob() এনক্রিপ্টেড শর্ট স্ক্রিপ্ট (ইউজাররা আপনার আসল লিংক দেখতে পাবে না):
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(generatedGhAtob, 'gh-atob')}
                    className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 transition text-xs font-bold flex items-center gap-1"
                  >
                    {copiedType === 'gh-atob' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'gh-atob' ? 'কপি হয়েছে!' : 'শর্ট কোড কপি'}</span>
                  </button>
                </div>

                <div className="p-2.5 bg-[#050A18] rounded-lg font-mono text-xs text-cyan-300 break-all select-all">
                  {generatedGhAtob}
                </div>
              </div>

              {/* Option B: Standard jsDelivr CDN Shortcut */}
              <div className="bg-black/60 rounded-xl p-3.5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-gray-300 font-bold text-xs">
                      ২. সাধারণ ডিরেক্ট jsDelivr শর্টকাট (ওপেন লিঙ্ক):
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(generatedGhDirect, 'gh-direct')}
                    className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30 transition text-xs font-bold flex items-center gap-1"
                  >
                    {copiedType === 'gh-direct' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'gh-direct' ? 'কপি হয়েছে!' : 'ডিরেক্ট কোড কপি'}</span>
                  </button>
                </div>

                <div className="p-2.5 bg-[#050A18] rounded-lg font-mono text-xs text-emerald-400 break-all select-all">
                  {generatedGhDirect}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🛠️ CUSTOM DOMAIN / GITHUB atob() GENERATOR TOOL */}
      <div className="bg-[#0B132B] border border-cyan-500/20 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <Wand2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-bold text-sm sm:text-base">
            কাস্টম ডোমেন / গিটহাব URL থেকে atob শর্ট কোড জেনারেটর
          </h3>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          ভবিষ্যতে আপনি যদি আপনার নিজস্ব ডোমেন (যেমন: <code className="text-cyan-300 font-mono">https://mkt-trader.shop/loader.js</code>) অথবা GitHub Raw/Gist বা jsDelivr CDN ব্যবহার করতে চান, তবে নিচে সেই লিঙ্কটি বসিয়ে দিলে সাথে সাথে এনক্রিপ্ট হয়ে হুবহু শর্ট কোড তৈরি হয়ে যাবে:
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-300 block mb-1 font-semibold">
              আপনার স্ক্রিপ্টের লিঙ্ক (URL):
            </label>
            <input
              type="text"
              value={customInputUrl}
              onChange={(e) => handleCustomUrlChange(e.target.value)}
              placeholder="https://your-custom-domain.com/loader.js"
              className="w-full px-4 py-2.5 rounded-xl bg-[#070D1E] border border-slate-700 text-cyan-300 font-mono text-xs outline-none focus:border-cyan-400"
            />
          </div>

          {customGeneratedCode && (
            <div className="p-4 rounded-2xl bg-[#070D1E] border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-bold">তৈরিকৃত atob শর্ট কোড:</span>
                <button
                  onClick={() => handleCopy(customGeneratedCode.replace(/\n\s*/g, ' '), 'custom-gen')}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 transition text-xs font-bold flex items-center gap-1"
                >
                  {copiedType === 'custom-gen' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'custom-gen' ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                </button>
              </div>
              <pre className="font-mono text-xs text-emerald-400 overflow-x-auto p-2 bg-black/60 rounded-xl leading-relaxed select-all">
                {customGeneratedCode}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Full Standalone Script Section (Optional Offline / Direct Copy) */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-gray-400" />
              <span>বিকল্প: ফুল সেলফ-কন্টেইন্ড স্ক্রিপ্ট (Full Standalone Bookmarklet)</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              যদি কোনো এক্সটার্নাল রিকোয়েস্ট ছাড়া সম্পূর্ণ স্ক্রিপ্টটি একবারে বুকমার্কে সেভ করে রাখতে চান:
            </p>
          </div>

          <button
            onClick={() => handleCopy(minifiedCode, 'full-mini')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 font-bold text-xs flex items-center gap-1.5 transition shrink-0"
          >
            {copiedType === 'full-mini' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedType === 'full-mini' ? 'কপি হয়েছে!' : 'ফুল কোড কপি করুন'}</span>
          </button>
        </div>

        {/* Drag to Bookmarks Bar Pill (PC only) */}
        <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>পিসি শর্টকাট:</strong> নিচের বাটনটিকে মাউস দিয়ে ড্র্যাগ করে আপনার ব্রাউজারের বুকমার্কস বারে ছেড়ে দিন!
            </span>
          </div>

          <a
            href={obfuscatedLoader || '#'}
            onClick={(e) => {
              if (!obfuscatedLoader) e.preventDefault();
            }}
            className="px-4 py-2 rounded-xl bg-[#0B132B] border-2 border-cyan-400 text-cyan-300 font-black text-xs shadow-[0_0_12px_rgba(0,229,255,0.4)] hover:scale-105 transition cursor-grab active:cursor-grabbing shrink-0 flex items-center gap-2"
          >
            <span>⚡ Ishak AI Pro</span>
          </a>
        </div>
      </div>
    </div>
  );
};
