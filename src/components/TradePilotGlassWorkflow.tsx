import React, { useEffect, useRef, useState } from 'react';
import { Activity, Brain, CheckCircle2, ChevronRight, Gauge, Cpu, LineChart, TrendingUp, TrendingDown, Layers, Zap, X } from 'lucide-react';
import { Candle } from '../utils/marketAnalysisEngine';

export type WorkflowSlide = 'IDLE' | 'SLIDE1_SWEEP' | 'SLIDE2_CAPTURE' | 'SLIDE3_CIRCUIT_ANALYSIS' | 'SLIDE4_DIRECTION';

interface TradePilotGlassWorkflowProps {
  currentSlide: WorkflowSlide;
  pairName: string;
  candles: Candle[];
  runningCandle?: Candle | null;
  currentPrice: number;
  isCall: boolean;
  confidenceScore: number;
  resistancePrice: number;
  supportPrice: number;
  trendLabel: string;
  patternLabel: string;
  timeframeLabel?: string;
  onClose: () => void;
}

// Country flags helper
function getPairFlags(pair: string): { flag1: string; flag2: string } {
  const p = (pair || '').toUpperCase();
  if (p.includes('ARS')) return { flag1: '🇺🇸', flag2: '🇦🇷' };
  if (p.includes('DZD')) return { flag1: '🇺🇸', flag2: '🇩🇿' };
  if (p.includes('BDT')) return { flag1: '🇺🇸', flag2: '🇧🇩' };
  if (p.includes('INR')) return { flag1: '🇺🇸', flag2: '🇮🇳' };
  if (p.includes('PKR')) return { flag1: '🇺🇸', flag2: '🇵🇰' };
  if (p.includes('BRL')) return { flag1: '🇺🇸', flag2: '🇧🇷' };
  if (p.includes('TRY')) return { flag1: '🇺🇸', flag2: '🇹🇷' };
  if (p.includes('EUR')) return { flag1: '🇪🇺', flag2: '🇺🇸' };
  if (p.includes('GBP')) return { flag1: '🇬🇧', flag2: '🇺🇸' };
  if (p.includes('JPY')) return { flag1: '🇺🇸', flag2: '🇯🇵' };
  if (p.includes('AUD')) return { flag1: '🇦🇺', flag2: '🇺🇸' };
  if (p.includes('CAD')) return { flag1: '🇺🇸', flag2: '🇨🇦' };
  if (p.includes('CHF')) return { flag1: '🇺🇸', flag2: '🇨🇭' };
  return { flag1: '🇺🇸', flag2: '🌐' };
}

export const TradePilotGlassWorkflow: React.FC<TradePilotGlassWorkflowProps> = ({
  currentSlide,
  pairName,
  candles,
  runningCandle,
  currentPrice,
  isCall,
  confidenceScore,
  resistancePrice,
  supportPrice,
  trendLabel,
  patternLabel,
  timeframeLabel = '1m',
  onClose,
}) => {
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  // Capture progress animation
  useEffect(() => {
    if (currentSlide === 'SLIDE2_CAPTURE') {
      setCaptureProgress(12);
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.floor((elapsed / 1400) * 88) + 12);
        setCaptureProgress(pct);
        if (elapsed >= 1400) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }
  }, [currentSlide]);

  // Slide 3 checklist progress
  useEffect(() => {
    if (currentSlide === 'SLIDE3_CIRCUIT_ANALYSIS') {
      setAnalysisStep(1);
      const t1 = setTimeout(() => setAnalysisStep(2), 500);
      const t2 = setTimeout(() => setAnalysisStep(3), 1100);
      const t3 = setTimeout(() => setAnalysisStep(4), 1700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [currentSlide]);

  // Render captured live chart on HTML5 canvas
  useEffect(() => {
    if (currentSlide === 'SLIDE2_CAPTURE' && captureCanvasRef.current) {
      const canvas = captureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Deep dark trading background with subtle grid
      ctx.fillStyle = '#070D1E';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Combine historical candles + running candle
      const allCandles = [...candles];
      if (runningCandle) allCandles.push(runningCandle);

      const renderCandles = allCandles.slice(-18);
      if (renderCandles.length === 0) return;

      let minP = Math.min(...renderCandles.map(c => c.low));
      let maxP = Math.max(...renderCandles.map(c => c.high));
      if (minP === maxP) {
        minP *= 0.9995;
        maxP *= 1.0005;
      }
      const pRange = maxP - minP;
      const padding = 20;
      const plotH = h - padding * 2;
      const getY = (val: number) => padding + plotH - ((val - minP) / pRange) * plotH;

      const candleW = Math.max(5, (w - 40) / renderCandles.length - 4);
      const stepX = (w - 40) / renderCandles.length;

      renderCandles.forEach((c, idx) => {
        const x = 20 + idx * stepX + stepX / 2;
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);
        const isBull = c.close >= c.open;

        ctx.strokeStyle = isBull ? '#00FF66' : '#FF1744';
        ctx.fillStyle = isBull ? '#00FF66' : '#FF1744';
        ctx.lineWidth = 1.5;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(3, Math.abs(closeY - openY));
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);
      });

      // Live price dashed line
      if (currentPrice > 0) {
        const curY = getY(currentPrice);
        ctx.strokeStyle = '#00E5FF';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, curY);
        ctx.lineTo(w, curY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price badge on right
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(w - 60, curY - 9, 58, 18);
        ctx.fillStyle = '#050B1E';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(currentPrice.toFixed(currentPrice < 10 ? 4 : 2), w - 31, curY + 3);
      }
    }
  }, [currentSlide, candles, runningCandle, currentPrice]);

  // Render zoomed-in last 2-3 candles on Slide 3
  useEffect(() => {
    if (currentSlide === 'SLIDE3_CIRCUIT_ANALYSIS' && zoomCanvasRef.current) {
      const canvas = zoomCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Deep dark background
      ctx.fillStyle = '#060B1C';
      ctx.fillRect(0, 0, w, h);

      const allCandles = [...candles];
      if (runningCandle) allCandles.push(runningCandle);
      const last3 = allCandles.slice(-4);
      if (last3.length === 0) return;

      let minP = Math.min(...last3.map(c => c.low));
      let maxP = Math.max(...last3.map(c => c.high));
      if (minP === maxP) {
        minP *= 0.9995;
        maxP *= 1.0005;
      }
      const pRange = maxP - minP;
      const pad = 15;
      const plotH = h - pad * 2;
      const getY = (val: number) => pad + plotH - ((val - minP) / pRange) * plotH;

      const stepX = w / last3.length;
      const candleW = 16;

      last3.forEach((c, idx) => {
        const x = idx * stepX + stepX / 2;
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);
        const isBull = c.close >= c.open;

        ctx.strokeStyle = isBull ? '#00E5FF' : '#FF2E54';
        ctx.fillStyle = isBull ? '#00E5FF' : '#FF2E54';
        ctx.lineWidth = 2;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(5, Math.abs(closeY - openY));
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);

        // Highlight running candle
        if (idx === last3.length - 1) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.strokeRect(x - candleW / 2 - 2, topY - 2, candleW + 4, bodyH + 4);
        }
      });
    }
  }, [currentSlide, candles, runningCandle]);

  if (currentSlide === 'IDLE') return null;

  const flags = getPairFlags(pairName);
  const confidenceVal = confidenceScore || (isCall ? 80 : 75);
  const strokeCircumference = 2 * Math.PI * 40;
  const strokeOffset = strokeCircumference - (confidenceVal / 100) * strokeCircumference;

  return (
    <>
      {/* ============================================================== */}
      {/* 🚀 SLIDE 1 — INITIAL SCAN: NEON LASER SCREEN SWEEP BEAM        */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE1_SWEEP' && (
        <div className="fixed inset-0 z-[2147483646] pointer-events-none select-none overflow-hidden">
          {/* Subtle Grid Flare */}
          <div className="absolute inset-0 bg-[#020512]/40 backdrop-blur-[2px]" />

          {/* Full Screen Left-to-Right Neon Laser Sweep Curtain */}
          <div
            className="absolute top-0 bottom-0 w-[4px]"
            style={{
              animation: 'ishakLaserSweepAcross 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              background: 'linear-gradient(180deg, transparent 0%, #00E5FF 20%, #FFFFFF 50%, #00FF66 80%, transparent 100%)',
              boxShadow: '0 0 15px #00E5FF, 0 0 35px #00FF66, 0 0 60px rgba(0,229,255,0.8), -30px 0 60px rgba(0,229,255,0.3)',
            }}
          >
            {/* Trailing soft laser curtain */}
            <div
              className="absolute top-0 bottom-0 right-0 w-[120px] pointer-events-none"
              style={{
                background: 'linear-gradient(270deg, transparent 0%, rgba(0, 229, 255, 0.18) 70%, rgba(0, 255, 102, 0.35) 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📸 SLIDE 2 — CHART CAPTURE (Real Quotex Market Chart Snapshot) */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE2_CAPTURE' && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-[350px] rounded-[24px] bg-gradient-to-b from-[#0F1738]/95 via-[#090E26]/95 to-[#040718]/98 border border-cyan-400/35 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(0,229,255,0.2),inset_0_1px_1.5px_rgba(255,255,255,0.3)] backdrop-blur-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00E5FF] animate-ping" />
                <span className="text-white font-extrabold text-[13px] tracking-wide">Market Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-bold">
                  {pairName}
                </span>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-400/40 text-red-300 flex items-center justify-center text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Real Chart Viewport */}
            <div className="relative w-full h-[175px] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
              <canvas ref={captureCanvasRef} width={310} height={175} className="w-full h-full block" />
              {/* Internal Chart Scanner Line */}
              <div
                className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00E5FF]"
                style={{
                  animation: 'ishakLaserVerticalSweep 1.4s ease-in-out infinite alternate',
                }}
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 border border-cyan-400/30 text-[9px] font-mono text-cyan-300 flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 text-emerald-400" />
                <span>Live Feed</span>
              </div>
            </div>

            {/* Subtext and Progress Bar */}
            <div className="mt-4 space-y-1.5 text-center">
              <div className="text-[13px] font-bold text-white flex items-center justify-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Capturing chart...</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Analyzing price action, indicators and market conditions...
              </p>
            </div>

            {/* Neon Progress Bar */}
            <div className="mt-3 relative w-full h-2 rounded-full bg-[#070D22] border border-cyan-500/25 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${captureProgress}%`,
                  background: 'linear-gradient(90deg, #00E5FF 0%, #00FF66 70%, #FFFFFF 100%)',
                  boxShadow: '0 0 12px #00E5FF',
                }}
              />
            </div>
            <div className="mt-1 flex justify-end">
              <span className="text-[10px] font-mono font-bold text-cyan-300">{captureProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🧠 SLIDE 3 — CHART ANALYSIS: AI CIRCUIT BOARD & CANDLE ZOOM    */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE3_CIRCUIT_ANALYSIS' && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-[360px] rounded-[28px] bg-gradient-to-b from-[#0C1133]/95 via-[#070B24]/95 to-[#030617]/98 border border-indigo-500/40 p-4 shadow-[0_25px_65px_rgba(0,0,0,0.95),0_0_40px_rgba(99,102,241,0.25),inset_0_1px_1.5px_rgba(255,255,255,0.3)] backdrop-blur-2xl">
            {/* Top Bar: Broker Quotex & OTC/Real Switch */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                  <div className="flex items-end gap-0.5">
                    <span className="w-1 h-3 bg-white rounded-full" />
                    <span className="w-1 h-4 bg-white rounded-full" />
                    <span className="w-1 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold tracking-widest text-slate-400 block leading-none">BROKER</span>
                  <span className="text-[15px] font-extrabold text-white tracking-tight">Quotex</span>
                </div>
              </div>

              {/* OTC / Real Pill Switch */}
              <div className="flex items-center p-1 rounded-xl bg-[#070C24] border border-indigo-500/30">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-bold shadow-[0_0_10px_rgba(99,102,241,0.6)]">
                  <span className="w-2 h-2 rounded-full border border-white animate-pulse" />
                  <span>OTC</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 text-slate-400 text-[11px] font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>Real</span>
                </div>
              </div>
            </div>

            {/* Inner Window: coco81 - Otc Chart Analyze */}
            <div className="relative rounded-[22px] bg-[#0A0F30]/80 border border-indigo-500/35 p-3.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.7)]">
              {/* macOS style Window Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-500/20">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>TradePilot - Otc Chart Analyze</span>
                </div>
                <div className="w-6" />
              </div>

              {/* 🌟 Interactive Circuit Diagram with 6 Nodes */}
              <div className="relative my-2 py-1">
                {/* SVG Circuit Path Lines */}
                <svg className="w-full h-[175px]" viewBox="0 0 300 175" fill="none">
                  <defs>
                    <linearGradient id="neonPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#A855F7" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#FF2E54" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="circuitGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#00E5FF" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {/* Connecting Traces from Nodes to Center (150, 85) */}
                  {/* Top-Left: Market Data (50, 30) -> Center */}
                  <path d="M 60 40 L 95 65 L 125 78" stroke="url(#neonPathGrad)" strokeWidth="2" filter="url(#circuitGlow)" />
                  {/* Top-Center: Trend (150, 25) -> Center */}
                  <path d="M 150 42 L 150 65" stroke="#00FF66" strokeWidth="2" filter="url(#circuitGlow)" />
                  {/* Top-Right: Indicators (245, 30) -> Center */}
                  <path d="M 240 40 L 205 65 L 175 78" stroke="#F59E0B" strokeWidth="2" filter="url(#circuitGlow)" />
                  {/* Mid-Left: Price Action (45, 95) -> Center */}
                  <path d="M 70 95 L 120 90" stroke="#38BDF8" strokeWidth="2" filter="url(#circuitGlow)" />
                  {/* Bottom-Left: AI Analysis (80, 145) -> Center */}
                  <path d="M 95 135 L 125 110" stroke="#EC4899" strokeWidth="2" filter="url(#circuitGlow)" />
                  {/* Bottom-Right: Decision (215, 145) -> Center */}
                  <path d="M 205 135 L 175 110" stroke="#EAB308" strokeWidth="2" filter="url(#circuitGlow)" />

                  {/* Moving Spark Pulses */}
                  <circle r="3" fill="#FFFFFF" filter="url(#circuitGlow)">
                    <animateMotion path="M 60 40 L 95 65 L 125 78" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#00FF66" filter="url(#circuitGlow)">
                    <animateMotion path="M 150 42 L 150 65" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#F59E0B" filter="url(#circuitGlow)">
                    <animateMotion path="M 240 40 L 205 65 L 175 78" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#EC4899" filter="url(#circuitGlow)">
                    <animateMotion path="M 95 135 L 125 110" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#EAB308" filter="url(#circuitGlow)">
                    <animateMotion path="M 205 135 L 175 110" dur="1.7s" repeatCount="indefinite" />
                  </circle>
                </svg>

                {/* Node Icons positioned over SVG coordinates */}
                {/* 1. Market Data (Top Left) */}
                <div className="absolute top-0 left-4 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-300 mt-1">Market Data</span>
                </div>

                {/* 2. Trend (Top Center) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.7)]">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-300 mt-1">Trend</span>
                </div>

                {/* 3. Indicators (Top Right) */}
                <div className="absolute top-0 right-4 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 border border-rose-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.7)]">
                    <Gauge className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-300 mt-1">Indicators</span>
                </div>

                {/* 4. Price Action (Middle Left) */}
                <div className="absolute top-[72px] left-2 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.7)]">
                    <LineChart className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-300 mt-1">Price Action</span>
                </div>

                {/* 5. Glowing Central Core */}
                <div className="absolute top-[62px] left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="relative w-14 h-14 rounded-full border-2 border-cyan-400/70 bg-[#070D28] flex items-center justify-center shadow-[0_0_25px_#00E5FF,inset_0_0_15px_rgba(168,85,247,0.5)]">
                    <div className="absolute inset-1 rounded-full border border-dashed border-purple-400/60 animate-spin" />
                    <div className="flex items-end gap-1">
                      <span className="w-1.5 h-4 bg-emerald-400 rounded-sm shadow-[0_0_6px_#00FF66]" />
                      <span className="w-1.5 h-6 bg-cyan-400 rounded-sm shadow-[0_0_6px_#00E5FF]" />
                      <span className="w-1.5 h-3.5 bg-rose-400 rounded-sm shadow-[0_0_6px_#FF2E54]" />
                    </div>
                  </div>
                </div>

                {/* 6. AI Analysis (Bottom Left) */}
                <div className="absolute bottom-0 left-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-pink-600 border border-fuchsia-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(217,70,239,0.7)]">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-300 mt-1">AI Analysis</span>
                </div>

                {/* 7. Decision (Bottom Right) */}
                <div className="absolute bottom-0 right-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 border border-yellow-300/60 flex items-center justify-center shadow-[0_0_12px_rgba(234,179,8,0.7)]">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-300 mt-1">Decision</span>
                </div>
              </div>

              {/* Zoomed Candlestick Inspection View */}
              <div className="mt-4 pt-3 border-t border-indigo-500/20">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[9.5px] font-bold text-cyan-300 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>Running & Last 2-3 Candles Zoom</span>
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">2.5x Scale</span>
                </div>
                <div className="w-full h-14 rounded-xl overflow-hidden border border-indigo-500/30 bg-[#05091C]">
                  <canvas ref={zoomCanvasRef} width={300} height={56} className="w-full h-full block" />
                </div>
              </div>

              {/* Checklist Elements */}
              <div className="grid grid-cols-2 gap-1.5 mt-2.5 px-1">
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 1 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 1 ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Trend Analysis</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 2 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 2 ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>RSI & MACD</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 3 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 3 ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Support / Resistance</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 4 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 4 ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Next 1M Momentum</span>
                </div>
              </div>

              {/* Bottom Pill: Analyzing chart... */}
              <div className="mt-3.5 flex items-center justify-center">
                <div className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-purple-900/60 via-indigo-800/60 to-cyan-900/60 border border-cyan-400/50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.35)] animate-pulse">
                  <Brain className="w-4 h-4 text-cyan-300" />
                  <span className="text-[12px] font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-emerald-300 to-purple-300">
                    Analyzing chart...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🎯 SLIDE 4 — DIRECTION RESULT (Matches Reference Screenshot)   */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE4_DIRECTION' && (
        <div className={`fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all duration-400 ${isDismissing ? 'scale-90 opacity-0 blur-sm' : 'scale-100 opacity-100 animate-[fadeIn_0.25s_ease-out]'}`}>
          <div className="relative w-full max-w-[360px] rounded-[30px] bg-gradient-to-b from-[#0D123B]/95 via-[#080C28]/95 to-[#040618]/98 border border-indigo-500/40 p-5 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_45px_rgba(0,229,255,0.25),inset_0_1px_1.5px_rgba(255,255,255,0.35)] backdrop-blur-2xl">
            {/* Top Bar: Broker Quotex & OTC/Real Switch */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 via-pink-600 to-indigo-600 flex items-center justify-center shadow-[0_0_14px_rgba(217,70,239,0.6)]">
                  <div className="flex items-end gap-0.5">
                    <span className="w-1 h-3 bg-white rounded-full" />
                    <span className="w-1 h-4 bg-white rounded-full" />
                    <span className="w-1 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold tracking-widest text-slate-400 block leading-none">BROKER</span>
                  <span className="text-[16px] font-extrabold text-white tracking-tight">Quotex</span>
                </div>
              </div>

              {/* OTC / Real Pill */}
              <div className="flex items-center p-1 rounded-xl bg-[#070C24] border border-indigo-500/30">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(99,102,241,0.6)]">
                  <span className="w-2 h-2 rounded-full border border-white animate-pulse" />
                  <span>OTC</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 text-slate-400 text-[11px] font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>Real</span>
                </div>
              </div>
            </div>

            {/* Asset Bar with Country Flags */}
            <div className="p-3 rounded-2xl bg-[#070D28]/90 border border-indigo-500/30 flex items-center justify-between mb-3.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center -space-x-1.5">
                  <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{flags.flag1}</span>
                  <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{flags.flag2}</span>
                </div>
                <div>
                  <span className="text-[15px] font-extrabold text-white tracking-wide block leading-none">
                    {pairName}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] text-slate-300 font-medium">Live read · {timeframeLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 🌟 Primary Action Card (CALL or PUT) */}
            {isCall ? (
              <div className="relative p-4 rounded-2xl border-[1.5px] border-[#00E5FF] bg-gradient-to-r from-[#042F2E]/90 via-[#064E3B]/90 to-[#022C22]/95 shadow-[0_0_30px_rgba(0,229,255,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.4)] mb-3.5">
                <div className="text-center text-[9px] uppercase font-bold tracking-[2.5px] text-cyan-300 mb-1">
                  — PLACE OPTION —
                </div>
                <div className="flex items-center gap-4">
                  {/* Glowing Arrow Button */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#10B981] to-[#047857] flex items-center justify-center border-2 border-white shadow-[0_0_20px_#00FF66]">
                    <div className="absolute inset-0 rounded-full border border-cyan-300 animate-ping opacity-30" />
                    <span className="text-2xl font-black text-white">↑</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-white tracking-wider block drop-shadow-[0_0_15px_#00FF66]">
                      CALL
                    </span>
                    <span className="text-[10px] text-cyan-200/90 font-medium leading-tight block">
                      Upward move expected · enter on the next candle
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative p-4 rounded-2xl border-[1.5px] border-[#FF2E54] bg-gradient-to-r from-[#4C0519]/90 via-[#881337]/90 to-[#3B0716]/95 shadow-[0_0_30px_rgba(255,46,84,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.4)] mb-3.5">
                <div className="text-center text-[9px] uppercase font-bold tracking-[2.5px] text-rose-300 mb-1">
                  — PLACE OPTION —
                </div>
                <div className="flex items-center gap-4">
                  {/* Glowing Arrow Button */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#F43F5E] to-[#BE123C] flex items-center justify-center border-2 border-white shadow-[0_0_20px_#FF2E54]">
                    <div className="absolute inset-0 rounded-full border border-pink-300 animate-ping opacity-30" />
                    <span className="text-2xl font-black text-white">↓</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-white tracking-wider block drop-shadow-[0_0_15px_#FF2E54]">
                      PUT
                    </span>
                    <span className="text-[10px] text-rose-200/90 font-medium leading-tight block">
                      Downward move expected · enter on the next candle
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2-Column Grid: CONFIDENCE & KEY LEVELS */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Confidence Box */}
              <div className="p-3.5 rounded-2xl bg-[#070D28]/90 border border-indigo-500/30 flex flex-col items-center justify-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-2">
                  CONFIDENCE
                </span>
                {/* Circular Gauge */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#0F1738" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={isCall ? '#00E5FF' : '#FF2E54'}
                      strokeWidth="8"
                      strokeDasharray={strokeCircumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      fill="none"
                      style={{
                        filter: `drop-shadow(0 0 6px ${isCall ? '#00E5FF' : '#FF2E54'})`,
                        transition: 'stroke-dashoffset 1s ease-out',
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-white tracking-tight">{confidenceVal}%</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold mt-1 ${isCall ? 'text-cyan-300' : 'text-pink-300'}`}>
                  High conviction
                </span>
                <span className="text-[8.5px] text-slate-400">threshold 75%</span>
              </div>

              {/* Key Levels Box */}
              <div className="p-3.5 rounded-2xl bg-[#070D28]/90 border border-indigo-500/30 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                  KEY LEVELS
                </span>

                {/* Vertical Gauge Bracket */}
                <div className="relative pl-3 my-auto space-y-2 border-l-2 border-cyan-400/60">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-cyan-300 block">RESISTANCE</span>
                    <span className="text-[12px] font-mono font-bold text-white">
                      {resistancePrice ? resistancePrice.toFixed(resistancePrice < 10 ? 4 : 2) : '1628.37'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#A855F7]" />
                    <span className="text-[8px] font-bold text-slate-400">PRICE ZONE</span>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase font-bold text-pink-400 block">SUPPORT</span>
                    <span className="text-[12px] font-mono font-bold text-white">
                      {supportPrice ? supportPrice.toFixed(supportPrice < 10 ? 4 : 2) : '1627.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row Pills: TREND & PATTERN */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-[#070D28]/90 border border-indigo-500/30 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-900/60 flex items-center justify-center text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[7.5px] uppercase font-bold text-slate-400 block leading-none">TREND</span>
                  <span className="text-[11px] font-bold text-white">{trendLabel || (isCall ? 'Uptrend' : 'Downtrend')}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070D28]/90 border border-indigo-500/30 flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-indigo-900/60 flex items-center justify-center text-purple-400 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[7.5px] uppercase font-bold text-slate-400 block leading-none">PATTERN</span>
                  <span className="text-[10px] font-bold text-white truncate block">
                    {patternLabel || (isCall ? 'Bullish Continuation...' : 'Bearish Engulfing...')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
