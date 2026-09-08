import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { SignalData } from '../types';

interface SimulatorViewProps {
  lastSignal?: SignalData | null;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ lastSignal }) => {
  const [balance, setBalance] = useState<number>(10250.0);
  const [investment, setInvestment] = useState<number>(100);
  const [market, setMarket] = useState<string>('AUD/CHF (OTC)');
  const [payout, setPayout] = useState<number>(93);
  const [livePrice, setLivePrice] = useState<number>(0.5742);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [tradeLogs, setTradeLogs] = useState<Array<{ id: string; type: 'CALL' | 'PUT' | 'HOLD'; amount: number; price: number; time: string; status: string }>>([]);
  const [callButtonFlash, setCallButtonFlash] = useState(false);
  const [putButtonFlash, setPutButtonFlash] = useState(false);
  const executedSignalsRef = useRef<Set<string>>(new Set());

  // Strict Rule: ONE SIGNAL = ONE TRADE
  useEffect(() => {
    if (!lastSignal) return;

    const sigId = lastSignal.signalId || `${lastSignal.liveExecutionTime}_${lastSignal.isCall}`;
    if (executedSignalsRef.current.has(sigId)) {
      return;
    }
    executedSignalsRef.current.add(sigId);

    // If low confidence or risk detected: capital preservation, NO TRADE
    if (lastSignal.isLowConfidence || lastSignal.isRiskDetected || lastSignal.isCall === null) {
      const log = {
        id: sigId.substring(0, 8),
        type: 'HOLD' as const,
        amount: 0,
        price: livePrice,
        time: new Date().toLocaleTimeString(),
        status: 'LOW CONFIDENCE — TRADE WITHHELD',
      };
      setTradeLogs((prev) => [log, ...prev.slice(0, 7)]);
      return;
    }

    // Execute single trade
    if (lastSignal.isCall === true) {
      handleCallTrade();
    } else if (lastSignal.isCall === false) {
      handlePutTrade();
    }
  }, [lastSignal]);

  // Generate initial candle history
  useEffect(() => {
    let current = 0.5720;
    const initial: Candle[] = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const open = current;
      const change = (Math.random() - 0.49) * 0.0006;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 0.0003;
      const low = Math.min(open, close) - Math.random() * 0.0003;
      initial.push({
        time: now - i * 5000,
        open,
        high,
        low,
        close,
      });
      current = close;
    }
    setCandles(initial);
    setLivePrice(current);
  }, []);

  // Tick generator
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => {
        const delta = (Math.random() - 0.495) * 0.0002;
        const next = Math.max(0.56, Math.min(0.59, prev + delta));
        return parseFloat(next.toFixed(5));
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Handle Call click
  const handleCallTrade = () => {
    setCallButtonFlash(true);
    setTimeout(() => setCallButtonFlash(false), 500);

    const log = {
      id: Math.random().toString(36).substring(2, 7),
      type: 'CALL' as const,
      amount: investment,
      price: livePrice,
      time: new Date().toLocaleTimeString(),
      status: 'EXECUTED (Auto/Manual)',
    };
    setTradeLogs((prev) => [log, ...prev.slice(0, 7)]);
    setBalance((prev) => prev - investment);
  };

  // Handle Put click
  const handlePutTrade = () => {
    setPutButtonFlash(true);
    setTimeout(() => setPutButtonFlash(false), 500);

    const log = {
      id: Math.random().toString(36).substring(2, 7),
      type: 'PUT' as const,
      amount: investment,
      price: livePrice,
      time: new Date().toLocaleTimeString(),
      status: 'EXECUTED (Auto/Manual)',
    };
    setTradeLogs((prev) => [log, ...prev.slice(0, 7)]);
    setBalance((prev) => prev - investment);
  };

  return (
    <div className="space-y-4">
      {/* Simulation Info Card */}
      <div className="bg-gradient-to-r from-slate-900/90 via-[#0B132B] to-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span>লাইভ ট্রেডিং প্ল্যাটফর্ম সিমুলেটর</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Pocket Option / Quotex Compatible
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              নিচে ডানে থাকা <strong className="text-cyan-400">Ishak AI</strong> বাটনটিতে একবার ক্লিক করুন মার্কেট স্ক্যান ও অটো-ক্লিকের সিগন্যাল পরীক্ষা করতে!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-gray-300">
            ট্রেডার আইডি: <span className="text-amber-400 font-mono font-bold">84920184</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-gray-300">
            ব্যালেন্স: <span className="text-emerald-400 font-mono font-bold">${balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Trading Platform Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart View (3 Cols on lg) */}
        <div className="lg:col-span-3 bg-[#0B132B] border border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-xl min-h-[440px]">
          {/* Chart Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-white font-black text-sm tracking-wide current-asset">
                {market}
              </span>
              <span className="text-xs bg-cyan-950/80 text-cyan-400 font-bold px-2 py-0.5 rounded border border-cyan-500/30">
                +{payout}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-gray-400">লাইভ প্রাইস (Tick)</div>
                <div className="text-base font-mono font-black text-cyan-300 current-price">
                  {livePrice.toFixed(5)}
                </div>
              </div>
            </div>
          </div>

          {/* SVG Candlestick Simulation Canvas */}
          <div className="relative my-4 flex-1 h-64 bg-slate-950/50 rounded-xl border border-slate-800/60 p-2 overflow-hidden flex items-end">
            {/* Grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_30px] pointer-events-none" />

            {/* Live price horizontal dashed line */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-cyan-400/60 flex items-center justify-end pr-2 transition-all duration-300 pointer-events-none"
              style={{ bottom: '48%' }}
            >
              <span className="bg-cyan-500 text-[#0B132B] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                {livePrice.toFixed(5)}
              </span>
            </div>

            {/* Candlestick Bars */}
            <div className="relative w-full h-full flex items-end justify-between gap-1 z-10 px-2 pb-2">
              {candles.map((c, idx) => {
                const isGreen = c.close >= c.open;
                const minPrice = 0.5700;
                const maxPrice = 0.5760;
                const range = maxPrice - minPrice || 0.006;
                const openY = ((c.open - minPrice) / range) * 100;
                const closeY = ((c.close - minPrice) / range) * 100;
                const highY = ((c.high - minPrice) / range) * 100;
                const lowY = ((c.low - minPrice) / range) * 100;

                const bottom = Math.min(openY, closeY);
                const height = Math.max(4, Math.abs(closeY - openY));

                return (
                  <div key={idx} className="relative flex-1 flex flex-col items-center h-full justify-end group">
                    {/* Wick */}
                    <div
                      className={`w-[1px] absolute ${isGreen ? 'bg-emerald-400' : 'bg-rose-500'}`}
                      style={{
                        bottom: `${Math.max(2, Math.min(95, lowY))}%`,
                        height: `${Math.max(6, Math.min(90, highY - lowY))}%`,
                      }}
                    />
                    {/* Body */}
                    <div
                      className={`w-full max-w-[12px] rounded-xs z-10 ${
                        isGreen ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                      }`}
                      style={{
                        bottom: `${Math.max(2, Math.min(95, bottom))}%`,
                        height: `${Math.max(4, Math.min(90, height))}%`,
                        position: 'absolute',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indicators Bar */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-4">
              <span>RSI (14): <strong className="text-white">52.4 (Neutral)</strong></span>
              <span>EMA (5): <strong className="text-cyan-400">{livePrice.toFixed(4)}</strong></span>
              <span>EMA (13): <strong className="text-amber-400">0.5738</strong></span>
            </div>
            <div className="text-[11px] text-gray-500 hidden sm:block">
              Auto-Trade Event Listener: <strong className="text-emerald-400">Active</strong>
            </div>
          </div>
        </div>

        {/* Trade Control Panel (1 Col on lg) */}
        <div className="bg-[#0B132B] border border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">
              ডিল কন্ট্রোল (Deal Form)
            </h3>

            {/* Time selector */}
            <div className="mb-3">
              <label className="text-[11px] text-gray-400 block mb-1 flex items-center justify-between">
                <span>টাইম ডিউরেশন</span>
                <Clock className="w-3 h-3 text-cyan-400" />
              </label>
              <div className="bg-[#111F43] border border-slate-700 rounded-xl p-2 text-white text-xs font-bold flex justify-between items-center">
                <span>00:01:00</span>
                <span className="text-cyan-400 text-[10px]">1 মিনিট</span>
              </div>
            </div>

            {/* Investment Input */}
            <div className="mb-3">
              <label className="text-[11px] text-gray-400 block mb-1 flex items-center justify-between">
                <span>বিনিয়োগ (Investment)</span>
                <DollarSign className="w-3 h-3 text-emerald-400" />
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setInvestment((v) => Math.max(10, v - 10))}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition"
                >
                  -
                </button>
                <input
                  type="text"
                  value={`$${investment}`}
                  onChange={(e) => {
                    const num = parseInt(e.target.value.replace(/\D/g, ''), 10);
                    if (!isNaN(num)) setInvestment(num);
                  }}
                  className="flex-1 text-center bg-[#111F43] border border-slate-700 text-white font-bold text-xs py-1.5 rounded-lg outline-none deal-form__price"
                />
                <button
                  onClick={() => setInvestment((v) => v + 10)}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Payout Display */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 mb-4 text-xs">
              <div className="flex justify-between text-gray-400 mb-1">
                <span>পেআউট লাভ:</span>
                <span className="text-cyan-400 font-bold deal-form__profit">+{payout}%</span>
              </div>
              <div className="flex justify-between text-white font-bold">
                <span>মোট প্রাপ্তি:</span>
                <span className="text-emerald-400 font-mono text-sm">
                  ${(investment + (investment * payout) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* CALL Button */}
            <button
              id="platform-call-button"
              onClick={handleCallTrade}
              className={`btn-call button-call section-deal__button--up w-full py-3.5 px-4 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-between shadow-lg transition-all duration-150 active:scale-95 mb-2.5 ${
                callButtonFlash
                  ? 'bg-emerald-400 shadow-[0_0_25px_#34D399] scale-102 ring-4 ring-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>হায়ার / CALL</span>
              </div>
              <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded font-mono">
                +{payout}%
              </span>
            </button>

            {/* PUT Button */}
            <button
              id="platform-put-button"
              onClick={handlePutTrade}
              className={`btn-put button-put section-deal__button--down w-full py-3.5 px-4 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-between shadow-lg transition-all duration-150 active:scale-95 ${
                putButtonFlash
                  ? 'bg-rose-400 shadow-[0_0_25px_#F43F5E] scale-102 ring-4 ring-white'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                <span>লোয়ার / PUT</span>
              </div>
              <span className="text-xs bg-rose-700/80 px-2 py-0.5 rounded font-mono">
                +{payout}%
              </span>
            </button>
          </div>

          {/* Trade Execution Logs */}
          <div className="pt-2 border-t border-slate-800 text-xs">
            <span className="text-gray-400 text-[10px] block mb-1">সাম্প্রতিক ট্রেড লগ:</span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {tradeLogs.length === 0 ? (
                <div className="text-gray-500 text-[11px] italic">কোনো ট্রেড এখনো নেওয়া হয়নি</div>
              ) : (
                tradeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-[10px] p-1.5 rounded bg-slate-900/90 border border-slate-800"
                  >
                    <span
                      className={
                        log.type === 'CALL'
                          ? 'text-emerald-400 font-bold'
                          : log.type === 'PUT'
                          ? 'text-rose-400 font-bold'
                          : 'text-amber-400 font-bold'
                      }
                    >
                      {log.type === 'HOLD' ? 'HOLD ⚠️ (Withheld)' : `${log.type} $${log.amount}`}
                    </span>
                    <span className="text-gray-400 font-mono">{log.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
