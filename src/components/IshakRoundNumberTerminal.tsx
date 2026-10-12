import React, { useState, useEffect, useRef } from 'react';
import { calculateRoundLevels, evaluateRoundNumberSignal, RoundLevelInfo, RoundNumberSignal } from '../utils/roundNumberEngine';
import { getBackgroundMarketData } from '../utils/backgroundMarketStream';
import { playPhotostatScannerSound, playResultSound } from '../utils/audio';

interface IshakRoundNumberTerminalProps {
  onClose?: () => void;
  onSwitchMode?: () => void;
  isLicenseVerified: boolean;
  onExecuteTrade?: (isCall: boolean, duration: number) => void;
}

export const IshakRoundNumberTerminal: React.FC<IshakRoundNumberTerminalProps> = ({
  onClose,
  onSwitchMode,
  isLicenseVerified,
  onExecuteTrade,
}) => {
  // Draggable window state
  const [position, setPosition] = useState({ x: 24, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Terminal state
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);

  // Live market and round number tracking
  const [activePair, setActivePair] = useState<string>('USD/BDT (OTC)');
  const [currentPrice, setCurrentPrice] = useState<number>(122.348);
  const [levels, setLevels] = useState<RoundLevelInfo>(() => calculateRoundLevels(122.348));
  const [activeSignal, setActiveSignal] = useState<RoundNumberSignal | null>(null);
  const [ticksCount, setTicksCount] = useState<number>(0);
  const [recentTicks, setRecentTicks] = useState<number[]>([]);

  // Subscribed to live market ticks
  useEffect(() => {
    const interval = setInterval(() => {
      const live = getBackgroundMarketData();
      if (live && live.currentPrice > 0) {
        setCurrentPrice(live.currentPrice);
        const pair = (live as unknown as { currentPair?: string }).currentPair || 'USD/BDT (OTC)';
        setActivePair(pair);
        setLevels(calculateRoundLevels(live.currentPrice));
        setTicksCount((c) => c + 1);
        setRecentTicks((prev) => {
          const next = [...prev, live.currentPrice];
          return next.slice(-20);
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Update signal when price or ticks change
  useEffect(() => {
    if (currentPrice > 0) {
      const sig = evaluateRoundNumberSignal(currentPrice, recentTicks);
      setActiveSignal(sig);
    }
  }, [currentPrice, recentTicks]);

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    const t = e.touches[0];
    setIsDragging(true);
    dragRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      initX: position.x,
      initY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 380, dragRef.current.initX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 200, dragRef.current.initY + dy)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !dragRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 380, dragRef.current.initX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 200, dragRef.current.initY + dy)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // Trigger Round Number Scan & Trade execution
  const handleScanAndExecute = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    playPhotostatScannerSound();

    const start = Date.now();
    const duration = 2200; // 2.2s precision radar scan

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.round((elapsed / duration) * 100));
      setScanProgress(p);

      if (elapsed >= duration) {
        clearInterval(timer);
        setIsScanning(false);
        const finalSignal = evaluateRoundNumberSignal(currentPrice, recentTicks);
        playResultSound(finalSignal.action === 'CALL');
        setActiveSignal(finalSignal);

        if (autoTradeEnabled && onExecuteTrade && finalSignal.action !== 'WAIT') {
          onExecuteTrade(finalSignal.action === 'CALL', selectedDuration);
        }
      }
    }, 60);
  };

  if (isMinimized) {
    return (
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-[999990] select-none cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#080d1a]/95 border border-[#00E5FF]/60 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.3)] backdrop-blur-xl">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-xs font-black text-black">
            ⚡
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#00E5FF] font-['Orbitron',sans-serif] tracking-wider">
              ISHAK ROUND TRACKER
            </span>
            <span className="text-[9px] text-gray-300 font-mono">
              {currentPrice.toFixed(levels.decimals)} • {activeSignal?.action || 'SCAN'}
            </span>
          </div>
          <button className="text-gray-400 hover:text-white text-xs pl-1">▲</button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="fixed z-[999990] w-[345px] sm:w-[375px] max-w-[calc(100vw-24px)] select-none rounded-[24px] overflow-hidden bg-gradient-to-b from-[#0a1024]/98 via-[#060a18]/98 to-[#030611]/99 border-t border-t-cyan-400/80 border-x border-x-indigo-500/30 border-b border-b-black shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(0,229,255,0.2),inset_0_1.5px_1.5px_rgba(255,255,255,0.35)] backdrop-blur-2xl font-sans"
    >
      {/* Top Specular Rim */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent pointer-events-none" />

      {/* HEADER (Follows CB Terminal Format, 100% Ishak VIP Style & Logo) */}
      <div className="p-3.5 px-4 flex items-center justify-between border-b border-indigo-500/20 bg-gradient-to-r from-[#0d1633]/80 via-transparent to-[#0d1633]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl border border-amber-400/70 bg-[#091224] p-0.5 overflow-hidden shadow-[0_0_14px_rgba(255,215,0,0.35)] flex items-center justify-center">
            <img
              src="https://i.ibb.co/Mx90bFy4/file-421.jpg"
              alt="Ishak VIP Logo"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-[12px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-amber-200 font-['Orbitron',sans-serif] tracking-wider leading-none">
                ISHAK VIP TRADER
              </h2>
              <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                ROUND v2.0
              </span>
            </div>
            <p className="text-[9px] text-[#00E5FF] font-semibold tracking-wide flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Round Number SNR Terminal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onSwitchMode}
            title="Switch back to Confluence Scanner Mode"
            className="px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-400/40 text-cyan-300 hover:text-white text-[9px] font-black font-['Orbitron',sans-serif] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span> MODE
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="w-6 h-6 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          >
            —
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5 space-y-3">
        {/* ROW 1: ACTIVE ASSET & LIVE TICK PRICE CARD */}
        <div className="p-3 rounded-2xl bg-[#091024]/90 border border-indigo-500/25 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Active Market Pair</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                {activePair.includes('OTC') ? 'OTC ALGO' : 'REAL FOREX'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              ⚡ {ticksCount} ticks
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-extrabold text-white tracking-wide">{activePair}</span>
            <div className="text-right">
              <span className="text-xl font-black font-mono text-[#00E5FF] tracking-tight drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]">
                {currentPrice.toFixed(levels.decimals)}
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2: ROUND NUMBER SNR DUAL RADAR GRID (CB FORMAT) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Upper Resistance Round Number */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-rose-950/25 to-[#091024]/90 border border-rose-500/35 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-extrabold text-rose-400 uppercase tracking-wider">
                ▲ RESISTANCE SNR
              </span>
              <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30">
                {levels.upperType.replace('_', ' ')}
              </span>
            </div>
            <div className="font-mono text-base font-black text-rose-200">
              {levels.upperLevel.toFixed(levels.decimals)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
              <span className="text-gray-400">Distance:</span>
              <span className="text-rose-300 font-mono">+{levels.distanceToUpperPips} pips</span>
            </div>
          </div>

          {/* Lower Support Round Number */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-emerald-950/25 to-[#091024]/90 border border-emerald-500/35 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-extrabold text-emerald-400 uppercase tracking-wider">
                ▼ SUPPORT SNR
              </span>
              <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {levels.lowerType.replace('_', ' ')}
              </span>
            </div>
            <div className="font-mono text-base font-black text-emerald-200">
              {levels.lowerLevel.toFixed(levels.decimals)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
              <span className="text-gray-400">Distance:</span>
              <span className="text-emerald-300 font-mono">-{levels.distanceToLowerPips} pips</span>
            </div>
          </div>
        </div>

        {/* ROW 3: ROUND LEVEL PROXIMITY GAUGE BAR */}
        <div className="p-2.5 rounded-xl bg-[#091024]/70 border border-indigo-500/20">
          <div className="flex justify-between text-[9px] font-bold text-gray-400 mb-1">
            <span className="text-emerald-400">Support (0%)</span>
            <span className="text-cyan-300 font-mono">Channel: {levels.proximityPercent}%</span>
            <span className="text-rose-400">Resistance (100%)</span>
          </div>
          <div className="relative h-2 rounded-full bg-gray-900 overflow-hidden border border-gray-800">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-300"
              style={{ width: `${levels.proximityPercent}%` }}
            />
            {/* Price Cursor Marker */}
            <div
              className="absolute top-0 bottom-0 w-2 -ml-1 bg-white rounded-full shadow-[0_0_8px_white] transition-all duration-300"
              style={{ left: `${levels.proximityPercent}%` }}
            />
          </div>
        </div>

        {/* ROW 4: REAL-TIME ROUND SIGNAL & DIAGNOSIS CARD */}
        {activeSignal && (
          <div
            className={`p-3 rounded-2xl border transition-all ${
              activeSignal.action === 'CALL'
                ? 'bg-gradient-to-b from-emerald-950/40 to-[#07131e] border-emerald-400/60 shadow-[0_4px_20px_rgba(16,185,129,0.2)]'
                : 'bg-gradient-to-b from-rose-950/40 to-[#160714] border-rose-400/60 shadow-[0_4px_20px_rgba(239,68,68,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{activeSignal.action === 'CALL' ? '🟢' : '🔴'}</span>
                <span
                  className={`text-sm font-black font-['Orbitron',sans-serif] tracking-wider ${
                    activeSignal.action === 'CALL' ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  RECOMMENDED: {activeSignal.action} {activeSignal.action === 'CALL' ? '↑ (BUY)' : '↓ (SELL)'}
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  activeSignal.action === 'CALL'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                }`}
              >
                {activeSignal.confidence}% ACCURACY
              </span>
            </div>
            <p className="text-[10.5px] text-gray-200 font-medium leading-tight">
              {activeSignal.reason}
            </p>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-gray-400 font-mono">
              <span>Strategy: {activeSignal.strategy.replace('_', ' ')}</span>
              <span>Proximity: {activeSignal.proximityPips} pips</span>
            </div>
          </div>
        )}

        {/* ROW 5: DURATION CHIPS & AUTO TRADE TOGGLE */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {[5, 10, 15, 30, 60].map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedDuration(sec)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  selectedDuration === sec
                    ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_0_10px_rgba(255,184,0,0.5)] font-black'
                    : 'bg-[#0f173b]/80 text-gray-300 hover:text-white border border-indigo-500/20'
                }`}
              >
                {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoTradeEnabled(!autoTradeEnabled)}
            className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
              autoTradeEnabled
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-rose-500/20 border-rose-400/50 text-rose-300'
            }`}
          >
            <span>{autoTradeEnabled ? '⚡' : '○'}</span>
            <span>AUTO-TRADE {autoTradeEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* SCAN PROGRESS BAR */}
        {isScanning && (
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-cyan-300 font-['Orbitron',sans-serif]">
              <span>LASER ROUND RADAR SCANNING...</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-cyan-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-amber-300 to-emerald-400 transition-all duration-75"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* MAIN ACTION BUTTON */}
        <button
          data-rn-scan="true"
          onClick={handleScanAndExecute}
          disabled={isScanning || !isLicenseVerified}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00E5FF] via-[#00B4D8] to-[#0077B6] hover:brightness-110 active:scale-[0.98] text-[#050C1D] text-xs font-black tracking-widest font-['Orbitron',sans-serif] uppercase shadow-[0_6px_25px_rgba(0,229,255,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.6)] cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>⚡</span>
          <span>{isScanning ? 'RADAR ANALYZING...' : `SCAN & EXECUTE (${selectedDuration}s)`}</span>
          <span>⚡</span>
        </button>

        {/* FOOTER BADGE */}
        <div className="text-center pt-1 border-t border-indigo-500/20 flex items-center justify-between text-[9px] text-gray-400">
          <span className={`font-bold flex items-center gap-1 ${isLicenseVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span>{isLicenseVerified ? '✓' : '⚠️'}</span> {isLicenseVerified ? 'VIP License Active' : 'License Required'}
          </span>
          <span className="font-semibold text-gray-500">Official MD Ishak Algo Engine</span>
        </div>
      </div>
    </div>
  );
};
