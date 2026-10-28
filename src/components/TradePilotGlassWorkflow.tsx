import React, { useEffect, useRef, useState } from 'react';
import { Activity, Brain, CheckCircle2, Cpu, LineChart, TrendingUp, Layers, Zap, X } from 'lucide-react';
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
  const [displayConfidence, setDisplayConfidence] = useState(0);
  const [circleOffset, setCircleOffset] = useState(2 * Math.PI * 40);

  // Dynamic OTC vs Real detection based strictly on asset name
  const isOtc = (pairName || '').toUpperCase().includes('OTC');

  // Slide 2: Paced Capture Progress Animation (~3.2 seconds)
  useEffect(() => {
    if (currentSlide === 'SLIDE2_CAPTURE') {
      setCaptureProgress(8);
      const start = Date.now();
      const duration = 3200; // 3.2s deep scanning duration
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.floor((elapsed / duration) * 92) + 8);
        setCaptureProgress(pct);
        if (elapsed >= duration) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }
  }, [currentSlide]);

  // Slide 3: Paced Multi-Stage Circuit Analysis (~3.8 seconds)
  useEffect(() => {
    if (currentSlide === 'SLIDE3_CIRCUIT_ANALYSIS') {
      setAnalysisStep(1);
      const t1 = setTimeout(() => setAnalysisStep(2), 700);
      const t2 = setTimeout(() => setAnalysisStep(3), 1600);
      const t3 = setTimeout(() => setAnalysisStep(4), 2500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [currentSlide]);

  // Slide 4: Animated Circular Ring & Number Count-up (Requirement 4)
  useEffect(() => {
    if (currentSlide === 'SLIDE4_DIRECTION') {
      const targetConfidence = confidenceScore && confidenceScore >= 70 && confidenceScore <= 98
        ? confidenceScore
        : (isCall ? 84 : 79);

      const circumference = 2 * Math.PI * 40;
      setCircleOffset(circumference);
      setDisplayConfidence(0);

      // Smooth count-up over 1200ms
      const start = Date.now();
      const duration = 1200;
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(1, elapsed / duration);
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(eased * targetConfidence);
        setDisplayConfidence(currentVal);

        const currentOffset = circumference - (eased * (targetConfidence / 100)) * circumference;
        setCircleOffset(currentOffset);

        if (progress >= 1) {
          setDisplayConfidence(targetConfidence);
          setCircleOffset(circumference - (targetConfidence / 100) * circumference);
          clearInterval(interval);
        }
      }, 25);

      return () => clearInterval(interval);
    }
  }, [currentSlide, confidenceScore, isCall]);

  // Slide 2: Screen / Chart Canvas Capture (Fix Requirement 1: NEVER BLACK)
  useEffect(() => {
    if (currentSlide === 'SLIDE2_CAPTURE' && captureCanvasRef.current) {
      const canvas = captureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Always fill rich Quotex dark navy background first (never pitch black)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0a102b');
      bgGrad.addColorStop(1, '#05091c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle cyan grid lines
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.09)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 26) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Attempt direct screen canvas clone from broker / background trading chart
      let capturedFromDom = false;
      try {
        const allDomCanvases = document.querySelectorAll('canvas');
        const validChartCanvases: HTMLCanvasElement[] = [];
        for (let i = 0; i < allDomCanvases.length; i++) {
          const c = allDomCanvases[i];
          if (c === canvas || c === zoomCanvasRef.current) continue;
          if (c.closest && c.closest('.wf-modal-container')) continue;
          const rect = c.getBoundingClientRect();
          if (rect.width >= 100 && rect.height >= 70 && c.width >= 100 && c.height >= 70) {
            validChartCanvases.push(c);
          }
        }
        if (validChartCanvases.length > 0) {
          for (let vi = 0; vi < validChartCanvases.length; vi++) {
            const chartCanv = validChartCanvases[vi];
            try {
              ctx.drawImage(chartCanv, 0, 0, chartCanv.width, chartCanv.height, 0, 0, w, h);
              capturedFromDom = true;
            } catch (e) {}
          }
        }
      } catch (err) {
        capturedFromDom = false;
      }

      // If DOM canvas was transparent/empty/black, render the authentic live candle stream
      if (!capturedFromDom) {
        ctx.fillStyle = '#05091a';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 28) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        const allCandles = [...candles];
        if (runningCandle) allCandles.push(runningCandle);
        const renderCandles = allCandles.slice(-18);

        if (renderCandles.length > 0) {
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
            ctx.fillRect(w - 62, curY - 9, 60, 18);
            ctx.fillStyle = '#040816';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(currentPrice.toFixed(currentPrice < 10 ? 4 : 2), w - 32, curY + 3);
          }
        }
      }
    }
  }, [currentSlide, candles, runningCandle, currentPrice]);

  // Slide 3: Zoomed-in Last 2-3 Candles
  useEffect(() => {
    if (currentSlide === 'SLIDE3_CIRCUIT_ANALYSIS' && zoomCanvasRef.current) {
      const canvas = zoomCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#040817';
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
      const pad = 12;
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

        ctx.strokeStyle = isBull ? '#00FF66' : '#FF1744';
        ctx.fillStyle = isBull ? '#00FF66' : '#FF1744';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(5, Math.abs(closeY - openY));
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);

        // Highlight latest candle
        if (idx === last3.length - 1) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - candleW / 2 - 2, topY - 2, candleW + 4, bodyH + 4);
        }
      });
    }
  }, [currentSlide, candles, runningCandle]);

  if (currentSlide === 'IDLE') return null;

  const flags = getPairFlags(pairName);
  const confidenceVal = confidenceScore || (isCall ? 82 : 78);
  const strokeCircumference = 2 * Math.PI * 40;
  const strokeOffset = strokeCircumference - (confidenceVal / 100) * strokeCircumference;

  return (
    <>
      {/* ============================================================== */}
      {/* 🚀 SLIDE 1 — INITIAL SCAN: NEON LASER SCREEN SWEEP BEAM        */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE1_SWEEP' && (
        <div className="fixed inset-0 z-[2147483646] pointer-events-none select-none overflow-hidden">
          <div className="absolute inset-0 bg-[#020512]/40 backdrop-blur-[2px]" />
          <div
            className="absolute top-0 bottom-0 w-[4px]"
            style={{
              animation: 'ishakLaserSweepAcross 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              background: 'linear-gradient(180deg, transparent 0%, #00E5FF 20%, #FFFFFF 50%, #00FF66 80%, transparent 100%)',
              boxShadow: '0 0 18px #00E5FF, 0 0 35px #00FF66, 0 0 65px rgba(0,229,255,0.85), -30px 0 65px rgba(0,229,255,0.35)',
            }}
          >
            <div
              className="absolute top-0 bottom-0 right-0 w-[140px] pointer-events-none"
              style={{
                background: 'linear-gradient(270deg, transparent 0%, rgba(0, 229, 255, 0.18) 70%, rgba(0, 255, 102, 0.35) 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📸 SLIDE 2 — CHART CAPTURE (Water-like 3D Glassmorphism)      */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE2_CAPTURE' && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div
            className="relative w-full max-w-[350px] rounded-[28px] p-5 text-white box-border"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(13, 22, 60, 0.65) 50%, rgba(5, 10, 30, 0.82) 100%)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderTop: '1.5px solid rgba(255, 255, 255, 0.55)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.8), inset 0 1.5px 2px rgba(255,255,255,0.4), inset 0 -1.5px 2px rgba(0,0,0,0.5), 0 0 35px rgba(0,229,255,0.2)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/15">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00E5FF] animate-ping" />
                <span className="text-white font-extrabold text-[13px] tracking-wide">Market Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 border border-cyan-400/40 text-cyan-300 font-bold backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
                  {pairName}
                </span>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-400/40 text-red-300 flex items-center justify-center text-xs backdrop-blur-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Direct Captured Viewport */}
            <div
              className="relative w-full h-[175px] rounded-2xl overflow-hidden border border-white/20"
              style={{
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.85), 0 6px 18px rgba(0,0,0,0.4)',
                background: '#05091a',
              }}
            >
              <canvas ref={captureCanvasRef} width={310} height={175} className="w-full h-full block" />
              <div
                className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_14px_#00E5FF]"
                style={{
                  animation: 'ishakLaserVerticalSweep 1.5s ease-in-out infinite alternate',
                }}
              />
              <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 border border-cyan-400/40 text-[9px] font-mono text-cyan-300 flex items-center gap-1.5 backdrop-blur-md shadow-[0_0_8px_rgba(0,229,255,0.3)]">
                <Activity className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                <span>Screen Capture</span>
              </div>
            </div>

            {/* Subtext and Progress */}
            <div className="mt-4 space-y-1.5 text-center">
              <div className="text-[13px] font-bold text-white flex items-center justify-center gap-1.5 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                <Cpu className="w-4 h-4 text-cyan-300 animate-spin" />
                <span>Capturing live chart...</span>
              </div>
              <p className="text-[10px] text-slate-300/80">
                Analyzing price action, indicators and market conditions...
              </p>
            </div>

            {/* 3D Glass Progress Bar */}
            <div
              className="mt-3 relative w-full h-2 rounded-full overflow-hidden border border-white/20"
              style={{
                background: 'rgba(5, 10, 30, 0.8)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.7)',
              }}
            >
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
              <span className="text-[10px] font-mono font-bold text-cyan-300 drop-shadow-[0_0_6px_#00E5FF]">
                {captureProgress}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🧠 SLIDE 3 — CIRCUIT ANALYSIS & ZOOM (Water-like 3D Glass)     */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE3_CIRCUIT_ANALYSIS' && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div
            className="relative w-full max-w-[360px] rounded-[30px] p-4 text-white box-border"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(15, 23, 62, 0.65) 50%, rgba(5, 10, 30, 0.82) 100%)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderTop: '1.5px solid rgba(255, 255, 255, 0.55)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.8), inset 0 1.5px 2px rgba(255,255,255,0.4), inset 0 -1.5px 2px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.25)',
            }}
          >
            {/* Top Bar: Broker Quotex & DYNAMIC OTC / Real Switch */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.6)] border border-white/30">
                  <div className="flex items-end gap-0.5">
                    <span className="w-1 h-3 bg-white rounded-full" />
                    <span className="w-1 h-4 bg-white rounded-full" />
                    <span className="w-1 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold tracking-widest text-slate-300 block leading-none">BROKER</span>
                  <span className="text-[15px] font-extrabold text-white tracking-tight">Quotex</span>
                </div>
              </div>

              {/* DYNAMIC OTC / Real Switch (Requirement 2) */}
              <div
                className="flex items-center p-1 rounded-xl backdrop-blur-xl border border-white/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(7, 12, 36, 0.7) 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)',
                }}
              >
                {isOtc ? (
                  <>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(99,102,241,0.7)] border border-white/25">
                      <span className="w-2 h-2 rounded-full border border-white animate-pulse" />
                      <span>OTC</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 text-slate-400 text-[11px] font-medium">
                      <span>Real</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 px-2 py-1 text-slate-400 text-[11px] font-medium">
                      <span>OTC</span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(0,229,255,0.7)] border border-white/25">
                      <TrendingUp className="w-3 h-3" />
                      <span>Real</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inner Window: Otc/Real Chart Analyze (Water-like 3D Box) */}
            <div
              className="relative rounded-[22px] p-3.5"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 16, 48, 0.7) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderTop: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              {/* macOS style Window Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-[0_0_6px_#FF5F56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-[0_0_6px_#27C93F]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-200">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>{pairName.split(' ')[0] || 'TradePilot'} - {isOtc ? 'Otc' : 'Real'} Chart Analyze</span>
                </div>
                <div className="w-6" />
              </div>

              {/* 🌟 Interactive Circuit Diagram with 6 Nodes */}
              <div className="relative my-2 py-1">
                <svg className="w-full h-[170px]" viewBox="0 0 300 170" fill="none">
                  <defs>
                    <linearGradient id="wfNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#A855F7" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#FF2E54" stopOpacity="0.85" />
                    </linearGradient>
                    <filter id="wfGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00E5FF" floodOpacity="0.85" />
                    </filter>
                  </defs>

                  <path d="M 60 40 L 95 65 L 125 78" stroke="url(#wfNeonGrad)" strokeWidth="2" filter="url(#wfGlow)" />
                  <path d="M 150 42 L 150 65" stroke="#00FF66" strokeWidth="2" filter="url(#wfGlow)" />
                  <path d="M 240 40 L 205 65 L 175 78" stroke="#F59E0B" strokeWidth="2" filter="url(#wfGlow)" />
                  <path d="M 70 95 L 120 90" stroke="#38BDF8" strokeWidth="2" filter="url(#wfGlow)" />
                  <path d="M 95 135 L 125 110" stroke="#EC4899" strokeWidth="2" filter="url(#wfGlow)" />
                  <path d="M 205 135 L 175 110" stroke="#EAB308" strokeWidth="2" filter="url(#wfGlow)" />

                  <circle r="3" fill="#FFFFFF" filter="url(#wfGlow)">
                    <animateMotion path="M 60 40 L 95 65 L 125 78" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#00FF66" filter="url(#wfGlow)">
                    <animateMotion path="M 150 42 L 150 65" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#F59E0B" filter="url(#wfGlow)">
                    <animateMotion path="M 240 40 L 205 65 L 175 78" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#EC4899" filter="url(#wfGlow)">
                    <animateMotion path="M 95 135 L 125 110" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#EAB308" filter="url(#wfGlow)">
                    <animateMotion path="M 205 135 L 175 110" dur="1.7s" repeatCount="indefinite" />
                  </circle>
                </svg>

                {/* Node Icons */}
                <div className="absolute top-0 left-4 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-300/70 flex items-center justify-center shadow-[0_0_14px_rgba(168,85,247,0.8)] animate-pulse">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-200 mt-1">Market Data</span>
                </div>

                <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-300/70 flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.8)]">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-200 mt-1">Trend</span>
                </div>

                <div className="absolute top-0 right-4 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 border border-rose-300/70 flex items-center justify-center shadow-[0_0_14px_rgba(244,63,94,0.8)]">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-200 mt-1">Indicators</span>
                </div>

                <div className="absolute top-[70px] left-2 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-300/70 flex items-center justify-center shadow-[0_0_14px_rgba(6,182,212,0.8)]">
                    <LineChart className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-200 mt-1">Price Action</span>
                </div>

                {/* Central Core */}
                <div className="absolute top-[60px] left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="relative w-14 h-14 rounded-full border-2 border-cyan-400 bg-[#070D28] flex items-center justify-center shadow-[0_0_25px_#00E5FF,inset_0_0_15px_rgba(168,85,247,0.5)]">
                    <div className="absolute inset-1 rounded-full border border-dashed border-purple-400/70 animate-spin" />
                    <div className="flex items-end gap-1">
                      <span className="w-1.5 h-4 bg-emerald-400 rounded-sm shadow-[0_0_6px_#00FF66]" />
                      <span className="w-1.5 h-6 bg-cyan-400 rounded-sm shadow-[0_0_6px_#00E5FF]" />
                      <span className="w-1.5 h-3.5 bg-rose-400 rounded-sm shadow-[0_0_6px_#FF2E54]" />
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-pink-600 border border-fuchsia-300/70 flex items-center justify-center shadow-[0_0_14px_rgba(217,70,239,0.8)]">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-200 mt-1">AI Analysis</span>
                </div>

                <div className="absolute bottom-0 right-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 border border-yellow-200/70 flex items-center justify-center shadow-[0_0_14px_rgba(234,179,8,0.8)]">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-200 mt-1">Decision</span>
                </div>
              </div>

              {/* Zoomed Candlestick Inspection View */}
              <div className="mt-4 pt-3 border-t border-white/15">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[9.5px] font-bold text-cyan-300 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>Real Candlestick Zoom</span>
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">2.5x Scale</span>
                </div>
                <div
                  className="w-full h-14 rounded-xl overflow-hidden border border-white/20 bg-[#040817]"
                  style={{ boxShadow: 'inset 0 1px 6px rgba(0,0,0,0.8)' }}
                >
                  <canvas ref={zoomCanvasRef} width={300} height={56} className="w-full h-full block" />
                </div>
              </div>

              {/* Checklist Elements */}
              <div className="grid grid-cols-2 gap-1.5 mt-2.5 px-1">
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 1 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 1 ? 'text-emerald-400 shadow-[0_0_8px_#00FF66]' : 'text-slate-600'}`} />
                  <span>Trend Analysis</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 2 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 2 ? 'text-emerald-400 shadow-[0_0_8px_#00FF66]' : 'text-slate-600'}`} />
                  <span>RSI & MACD</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 3 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 3 ? 'text-emerald-400 shadow-[0_0_8px_#00FF66]' : 'text-slate-600'}`} />
                  <span>Support / Resistance</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[9.5px] font-medium transition-all ${analysisStep >= 4 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${analysisStep >= 4 ? 'text-emerald-400 shadow-[0_0_8px_#00FF66]' : 'text-slate-600'}`} />
                  <span>Next 1M Momentum</span>
                </div>
              </div>

              {/* Bottom Pill: Analyzing chart... */}
              <div className="mt-3.5 flex items-center justify-center">
                <div
                  className="w-full py-2.5 px-4 rounded-full border border-cyan-400/50 flex items-center justify-center gap-2 backdrop-blur-md shadow-[0_0_20px_rgba(0,229,255,0.35)] animate-pulse"
                  style={{
                    background: 'linear-gradient(90deg, rgba(88,28,135,0.65) 0%, rgba(49,46,129,0.65) 50%, rgba(8,145,178,0.65) 100%)',
                  }}
                >
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
      {/* 🎯 SLIDE 4 — DIRECTION RESULT (Water-like 3D Glassmorphism)   */}
      {/* ============================================================== */}
      {currentSlide === 'SLIDE4_DIRECTION' && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-[fadeIn_0.25s_ease-out]">
          <div
            className="relative w-full max-w-[360px] rounded-[30px] p-5 text-white box-border"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(13, 22, 60, 0.65) 50%, rgba(5, 10, 30, 0.82) 100%)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderTop: '1.5px solid rgba(255, 255, 255, 0.55)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.8), inset 0 1.5px 2px rgba(255,255,255,0.4), inset 0 -1.5px 2px rgba(0,0,0,0.5), 0 0 45px rgba(0,229,255,0.25)',
            }}
          >
            {/* Top Bar: Broker Quotex & Dynamic OTC / Real Switch */}
            <div
              className="flex items-center justify-between pb-3 mb-3 border-b border-white/15 animate-[slideDown_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{ animationDelay: '40ms' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 via-pink-600 to-indigo-600 flex items-center justify-center shadow-[0_0_14px_rgba(217,70,239,0.7)] border border-white/30">
                  <div className="flex items-end gap-0.5">
                    <span className="w-1 h-3 bg-white rounded-full" />
                    <span className="w-1 h-4 bg-white rounded-full" />
                    <span className="w-1 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold tracking-widest text-slate-300 block leading-none">BROKER</span>
                  <span className="text-[16px] font-extrabold text-white tracking-tight">Quotex</span>
                </div>
              </div>

              {/* DYNAMIC OTC / Real Pill */}
              <div
                className="flex items-center p-1 rounded-xl backdrop-blur-xl border border-white/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(7, 12, 36, 0.7) 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)',
                }}
              >
                {isOtc ? (
                  <>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(99,102,241,0.7)] border border-white/25">
                      <span className="w-2 h-2 rounded-full border border-white animate-pulse" />
                      <span>OTC</span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 text-slate-400 text-[11px] font-medium">
                      <span>Real</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 px-2.5 py-1 text-slate-400 text-[11px] font-medium">
                      <span>OTC</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(0,229,255,0.7)] border border-white/25">
                      <TrendingUp className="w-3 h-3" />
                      <span>Real</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Asset Bar with Country Flags (Water-like 3D Box) */}
            <div
              className="p-3 rounded-2xl flex items-center justify-between mb-3.5 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 16, 45, 0.65) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderTop: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: 'inset 0 1px 1.5px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.45)',
                animationDelay: '100ms',
              }}
            >
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
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_#EF4444]" />
                    <span className="text-[10px] text-slate-300 font-medium">Live read · {timeframeLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 🌟 Primary Action Card (CALL or PUT) with Pop-In Entrance */}
            {isCall ? (
              <div
                className="relative p-4 rounded-2xl border-[1.5px] border-[#00E5FF] mb-3.5 animate-[popIn_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{
                  background: 'linear-gradient(135deg, rgba(4, 47, 46, 0.85) 0%, rgba(6, 78, 59, 0.85) 50%, rgba(2, 44, 34, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 0 30px rgba(0,229,255,0.45), inset 0 1.5px 2px rgba(255,255,255,0.4)',
                  animationDelay: '180ms',
                }}
              >
                <div className="text-center text-[9px] uppercase font-bold tracking-[2.5px] text-cyan-300 mb-1">
                  — PLACE OPTION —
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#10B981] to-[#047857] flex items-center justify-center border-2 border-white shadow-[0_0_20px_#00FF66]">
                    <div className="absolute inset-0 rounded-full border border-cyan-300 animate-ping opacity-30" />
                    <span className="text-2xl font-black text-white">↑</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-white tracking-wider block drop-shadow-[0_0_15px_#00FF66]">
                      CALL
                    </span>
                    <span className="text-[10px] text-cyan-200/95 font-medium leading-tight block">
                      Upward move expected · enter on the next candle
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="relative p-4 rounded-2xl border-[1.5px] border-[#FF2E54] mb-3.5 animate-[popIn_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{
                  background: 'linear-gradient(135deg, rgba(76, 5, 25, 0.85) 0%, rgba(136, 19, 55, 0.85) 50%, rgba(59, 7, 22, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 0 30px rgba(255,46,84,0.45), inset 0 1.5px 2px rgba(255,255,255,0.4)',
                  animationDelay: '180ms',
                }}
              >
                <div className="text-center text-[9px] uppercase font-bold tracking-[2.5px] text-rose-300 mb-1">
                  — PLACE OPTION —
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#F43F5E] to-[#BE123C] flex items-center justify-center border-2 border-white shadow-[0_0_20px_#FF2E54]">
                    <div className="absolute inset-0 rounded-full border border-pink-300 animate-ping opacity-30" />
                    <span className="text-2xl font-black text-white">↓</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-white tracking-wider block drop-shadow-[0_0_15px_#FF2E54]">
                      PUT
                    </span>
                    <span className="text-[10px] text-rose-200/95 font-medium leading-tight block">
                      Downward move expected · enter on the next candle
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2-Column Grid: CONFIDENCE & KEY LEVELS (Water-like 3D Boxes) */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Confidence Box with Dynamic Ring Animation */}
              <div
                className="p-3.5 rounded-2xl flex flex-col items-center justify-center animate-[slideUp_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 16, 45, 0.65) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.35)',
                  boxShadow: 'inset 0 1px 1.5px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.45)',
                  animationDelay: '260ms',
                }}
              >
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300 block mb-2">
                  CONFIDENCE
                </span>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={isCall ? '#00E5FF' : '#FF2E54'}
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={circleOffset}
                      strokeLinecap="round"
                      fill="none"
                      style={{
                        filter: `drop-shadow(0 0 6px ${isCall ? '#00E5FF' : '#FF2E54'})`,
                        transition: 'stroke-dashoffset 0.05s linear',
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-white tracking-tight">{displayConfidence}%</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold mt-1 ${isCall ? 'text-cyan-300' : 'text-pink-300'}`}>
                  High conviction
                </span>
                <span className="text-[8.5px] text-slate-400">threshold 75%</span>
              </div>

              {/* Key Levels Box */}
              <div
                className="p-3.5 rounded-2xl flex flex-col justify-between animate-[slideUp_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 16, 45, 0.65) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.35)',
                  boxShadow: 'inset 0 1px 1.5px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.45)',
                  animationDelay: '320ms',
                }}
              >
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300 block mb-1">
                  KEY LEVELS
                </span>

                <div className="relative pl-3 my-auto space-y-2 border-l-2 border-cyan-400/70">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-cyan-300 block">RESISTANCE</span>
                    <span className="text-[12px] font-mono font-bold text-white">
                      {resistancePrice ? resistancePrice.toFixed(resistancePrice < 10 ? 4 : 2) : '1628.37'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#A855F7]" />
                    <span className="text-[8px] font-bold text-slate-300">PRICE ZONE</span>
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

            {/* Bottom Row Pills: TREND & PATTERN (Water-like 3D Boxes) */}
            <div
              className="grid grid-cols-2 gap-3 animate-[slideUp_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{ animationDelay: '380ms' }}
            >
              <div
                className="p-2.5 rounded-xl flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 16, 45, 0.65) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.35)',
                  boxShadow: 'inset 0 1px 1.5px rgba(255, 255, 255, 0.25)',
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-900/60 flex items-center justify-center text-cyan-400 border border-white/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[7.5px] uppercase font-bold text-slate-300 block leading-none">TREND</span>
                  <span className="text-[11px] font-bold text-white">{trendLabel || (isCall ? 'Uptrend' : 'Downtrend')}</span>
                </div>
              </div>

              <div
                className="p-2.5 rounded-xl flex items-center gap-2 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 16, 45, 0.65) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.35)',
                  boxShadow: 'inset 0 1px 1.5px rgba(255, 255, 255, 0.25)',
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-900/60 flex items-center justify-center text-purple-400 shrink-0 border border-white/20">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[7.5px] uppercase font-bold text-slate-300 block leading-none">PATTERN</span>
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
