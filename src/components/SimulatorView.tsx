import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Shield, Sparkles, CheckCircle2, Eye, EyeOff } from 'lucide-react';
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
  
  // ⚡ Running Candle Display Control & Active Duration
  const [showRunningCandle, setShowRunningCandle] = useState<boolean>(true);
  const [selectedDuration, setSelectedDuration] = useState<number>(() => {
    const saved = localStorage.getItem('ISHAK_TRADE_DURATION');
    return saved ? parseInt(saved, 10) : 5;
  });

  const [activeTrade, setActiveTrade] = useState<{
    id: string;
    type: 'CALL' | 'PUT';
    entryPrice: number;
    amount: number;
    duration: number;
    startTime: number;
    endTime: number;
    timeLeft: number;
  } | null>(null);

  const activeTradeRef = useRef(activeTrade);
  activeTradeRef.current = activeTrade;
  const tickCountRef = useRef(0);
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

  // Generate initial candle history (Harmonic market structure, ZERO Math.random)
  useEffect(() => {
    let current = 0.5720;
    const initial: Candle[] = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const open = current;
      const change = Math.sin(i * 0.45) * 0.00032 + ((i % 4) - 1.5) * 0.0001;
      const close = parseFloat((open + change).toFixed(5));
      const high = parseFloat((Math.max(open, close) + 0.00018 + (i % 3) * 0.00005).toFixed(5));
      const low = parseFloat((Math.min(open, close) - 0.00018 - (i % 2) * 0.00005).toFixed(5));
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

  // Tick generator & Duration-aligned Trade Progression Engine
  useEffect(() => {
    const interval = setInterval(() => {
      tickCountRef.current++;
      const trade = activeTradeRef.current;
      const now = Date.now();

      if (trade) {
        const remaining = Math.max(0, Math.ceil((trade.endTime - now) / 1000));
        
        // Active trade: strictly propels the candle and price in the winning direction during selected duration!
        // CALL (UP): price and candle climb higher
        // PUT (DOWN): price and candle drop lower
        const stepDelta = trade.type === 'CALL'
          ? 0.00016 + (tickCountRef.current % 3) * 0.00004
          : -0.00016 - (tickCountRef.current % 3) * 0.00004;

        setLivePrice((prev) => {
          const next = parseFloat((prev + stepDelta).toFixed(5));
          setCandles((prevCandles) => {
            if (prevCandles.length === 0) return prevCandles;
            const updated = [...prevCandles];
            const last = { ...updated[updated.length - 1] };
            last.close = next;
            if (trade.type === 'CALL') {
              last.high = Math.max(last.high, next);
            } else {
              last.low = Math.min(last.low, next);
            }
            updated[updated.length - 1] = last;
            return updated;
          });
          return next;
        });

        // Time finished: candle closes solidly in profit above (CALL) or below (PUT) strike price!
        if (now >= trade.endTime) {
          const profit = Math.round((trade.amount * payout) / 100);
          const totalReturn = trade.amount + profit;
          setBalance((prev) => prev + totalReturn);

          setTradeLogs((prev) =>
            prev.map((l) =>
              l.id === trade.id
                ? { ...l, status: `WON (ITM) 🟢 +$${profit.toFixed(2)}` }
                : l
            )
          );
          setActiveTrade(null);

          // ⚡ Open a fresh new candle from the closing price level so future trades have clean, unskewed momentum!
          setCandles((prev) => {
            if (prev.length === 0) return prev;
            const lastClosed = prev[prev.length - 1];
            const freshCandle: Candle = {
              time: now,
              open: lastClosed.close,
              high: lastClosed.close,
              low: lastClosed.close,
              close: lastClosed.close,
            };
            return [...prev.slice(1), freshCandle];
          });
        } else {
          setActiveTrade((prev) => (prev ? { ...prev, timeLeft: remaining } : null));
        }
      } else {
        // Dynamic market timeframe: every 20 ticks (5s), seal current candle and open a fresh one
        if (tickCountRef.current % 20 === 0) {
          setCandles((prev) => {
            if (prev.length === 0) return prev;
            const lastClosed = prev[prev.length - 1];
            const freshCandle: Candle = {
              time: now,
              open: lastClosed.close,
              high: lastClosed.close,
              low: lastClosed.close,
              close: lastClosed.close,
            };
            return [...prev.slice(1), freshCandle];
          });
        }

        // Idle market tick: harmonic dual-wave producing balanced UP (bullish) and DOWN (bearish) cycles
        const t = tickCountRef.current;
        const waveDelta = Math.sin(t * 0.22) * 0.00010 + Math.cos(t * 0.38) * 0.00007;
        setLivePrice((prev) => {
          const next = parseFloat(Math.max(0.5690, Math.min(0.5780, prev + waveDelta)).toFixed(5));
          setCandles((prevCandles) => {
            if (prevCandles.length === 0) return prevCandles;
            const updated = [...prevCandles];
            const last = { ...updated[updated.length - 1] };
            last.close = next;
            last.high = Math.max(last.high, next);
            last.low = Math.min(last.low, next);
            updated[updated.length - 1] = last;
            return updated;
          });
          return next;
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [payout]);

  // Handle Call click
  const handleCallTrade = () => {
    setCallButtonFlash(true);
    setTimeout(() => setCallButtonFlash(false), 500);

    const tradeId = 'T_' + Date.now().toString(36) + performance.now().toFixed(0);
    const dur = selectedDuration;
    const entry = livePrice;

    setActiveTrade({
      id: tradeId,
      type: 'CALL',
      entryPrice: entry,
      amount: investment,
      duration: dur,
      startTime: Date.now(),
      endTime: Date.now() + dur * 1000,
      timeLeft: dur,
    });

    const log = {
      id: tradeId,
      type: 'CALL' as const,
      amount: investment,
      price: entry,
      time: new Date().toLocaleTimeString(),
      status: `ACTIVE (${dur}S EXPIRY) ⏳`,
    };
    setTradeLogs((prev) => [log, ...prev.slice(0, 7)]);
    setBalance((prev) => prev - investment);
  };

  // Handle Put click
  const handlePutTrade = () => {
    setPutButtonFlash(true);
    setTimeout(() => setPutButtonFlash(false), 500);

    const tradeId = 'T_' + Date.now().toString(36) + performance.now().toFixed(0);
    const dur = selectedDuration;
    const entry = livePrice;

    setActiveTrade({
      id: tradeId,
      type: 'PUT',
      entryPrice: entry,
      amount: investment,
      duration: dur,
      startTime: Date.now(),
      endTime: Date.now() + dur * 1000,
      timeLeft: dur,
    });

    const log = {
      id: tradeId,
      type: 'PUT' as const,
      amount: investment,
      price: entry,
      time: new Date().toLocaleTimeString(),
      status: `ACTIVE (${dur}S EXPIRY) ⏳`,
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
              <button
                type="button"
                onClick={() => setShowRunningCandle((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                  showRunningCandle
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-rose-500/20 border-rose-500/60 text-rose-300 ring-2 ring-rose-500/30 animate-pulse'
                }`}
                title={showRunningCandle ? "ক্লিক করে ক্যান্ডেল আড়াল করুন (NOT FOUND টেস্ট করতে)" : "ক্লিক করে ক্যান্ডেল ফিরিয়ে আনুন"}
              >
                {showRunningCandle ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>রানিং ক্যান্ডেল দৃশ্যমান</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>চার্ট সরানো হয়েছে (ক্যান্ডেল লুকানো)</span>
                  </>
                )}
              </button>

              <div className="text-right">
                <div className="text-[10px] text-gray-400">লাইভ প্রাইস (Tick)</div>
                <div className="text-base font-mono font-black text-cyan-300 current-price">
                  {livePrice.toFixed(5)}
                </div>
              </div>
            </div>
          </div>

          {/* SVG Candlestick Simulation Canvas */}
          <div
            data-running-candle-state={showRunningCandle ? 'visible' : 'hidden'}
            className="relative my-4 flex-1 h-64 bg-slate-950/50 rounded-xl border border-slate-800/60 p-2 overflow-hidden flex items-end"
          >
            {/* Grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_30px] pointer-events-none" />

            {/* Warning Overlay when running candle is hidden/scrolled away */}
            {!showRunningCandle && (
              <div className="absolute inset-x-3 top-3 z-30 bg-rose-950/90 border border-rose-500/70 rounded-xl p-2.5 flex items-center justify-between text-xs text-rose-200 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span><strong>চার্ট স্ক্রিনের বাইরে সরানো হয়েছে:</strong> স্ক্রিনে কোনো লাইভ রানিং ক্যান্ডেল নেই!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRunningCandle(true)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] shadow transition"
                >
                  ক্যান্ডেল স্ক্রিনে আনুন
                </button>
              </div>
            )}

            {/* Live price horizontal dashed line */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-cyan-400/60 flex items-center justify-end pr-2 transition-all duration-300 pointer-events-none"
              style={{ bottom: '48%' }}
            >
              <span className="bg-cyan-500 text-[#0B132B] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                {livePrice.toFixed(5)}
              </span>
            </div>

            {/* Active Trade Strike Price Line & Countdown */}
            {activeTrade && (
              <div
                className={`absolute left-0 right-0 border-b-2 z-20 flex items-center justify-between px-3 transition-all duration-300 ${
                  activeTrade.type === 'CALL'
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-rose-400 bg-rose-500/10'
                }`}
                style={{ bottom: '48%' }}
              >
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                    activeTrade.type === 'CALL' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}>
                    {activeTrade.type === 'CALL' ? 'CALL ⬆ STRIKE' : 'PUT ⬇ STRIKE'}
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold">
                    {activeTrade.entryPrice.toFixed(5)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="text-[10px] font-bold text-cyan-300 animate-pulse">
                    বাকি: {activeTrade.timeLeft}s
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {activeTrade.type === 'CALL' ? 'ইন দ্য মানি (উপরে) 🟢' : 'ইন দ্য মানি (নিচে) 🟢'}
                  </span>
                </div>
              </div>
            )}

            {/* Candlestick Bars */}
            <div className="relative w-full h-full flex items-end justify-between gap-1 z-10 px-2 pb-2">
              {candles.map((c, idx) => {
                const isRunningCandle = idx === candles.length - 1;

                // If user hid the running candle (e.g. scrolled chart away)
                if (isRunningCandle && !showRunningCandle) {
                  return null;
                }

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
                  <div
                    key={idx}
                    id={isRunningCandle ? 'ishak-running-candle' : undefined}
                    data-running-candle={isRunningCandle ? 'true' : 'false'}
                    data-direction={isGreen ? 'UP' : 'DOWN'}
                    className={`relative flex-1 flex flex-col items-center h-full justify-end group ${
                      isRunningCandle ? 'ishak-active-candle' : ''
                    }`}
                  >
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
                      className={`w-full max-w-[12px] rounded-xs z-10 transition-all duration-200 ${
                        isGreen
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                          : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                      } ${isRunningCandle ? 'ring-1 ring-white/60' : ''}`}
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
              <label className="text-[11px] text-gray-400 block mb-1.5 flex items-center justify-between">
                <span>টাইম ডিউরেশন</span>
                <Clock className="w-3 h-3 text-cyan-400" />
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[5, 10, 15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setSelectedDuration(sec);
                      try {
                        localStorage.setItem('ISHAK_TRADE_DURATION', sec.toString());
                        window.dispatchEvent(new CustomEvent('ishak_duration_changed', { detail: sec }));
                      } catch (e) {}
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                      selectedDuration === sec
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                        : 'bg-[#111F43] border border-slate-700/80 text-gray-300 hover:text-white hover:border-cyan-500/40'
                    }`}
                  >
                    {sec >= 60 ? '1M' : `${sec}S`}
                  </button>
                ))}
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
