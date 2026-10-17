import React, { useState, useEffect, useRef } from 'react';
import { getBackgroundMarketData, setSimulatedMarketPrice } from '../utils/backgroundMarketStream';

interface IshakRoundNumberTerminalProps {
  onClose?: () => void;
  onSwitchMode?: () => void;
  isLicenseVerified?: boolean;
}

export const IshakRoundNumberTerminal: React.FC<IshakRoundNumberTerminalProps> = ({
  onClose,
  onSwitchMode,
}) => {
  // Viewport calculation & boundary clamping with localStorage memory
  const [position, setPosition] = useState(() => {
    try {
      const savedX = localStorage.getItem('ishak_terminal_pos_x');
      const savedY = localStorage.getItem('ishak_terminal_pos_y');
      if (savedX && savedY) {
        return { x: parseInt(savedX, 10), y: parseInt(savedY, 10) };
      }
    } catch (e) {}

    const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
    const termW = winW <= 600 ? 236 : 304;
    return {
      x: Math.max(10, Math.min(winW - termW - 10, 20)),
      y: Math.max(12, Math.min(winH - 460, 60)),
    };
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Configuration state
  const [activePair, setActivePair] = useState<string>('USD/BDT (OTC)');
  const [currentPrice, setCurrentPrice] = useState<number>(122.348);
  const [roundPriceInput, setRoundPriceInput] = useState<string>('');
  const [durationInput, setDurationInput] = useState<number>(6);
  const [selectedChip, setSelectedChip] = useState<number>(6);

  // Simulation runtime state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('● STANDBY');
  const [interceptsCount, setInterceptsCount] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [inputError, setInputError] = useState<boolean>(false);

  // Refs for tracking animation & simulation
  const startPriceRef = useRef<number>(122.348);
  const targetPriceRef = useRef<number>(122.348);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Keep terminal inside bounds on screen resize
  useEffect(() => {
    const handleResize = () => {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
      const termW = winW <= 600 ? 236 : 304;
      const maxX = Math.max(6, winW - termW - 6);
      const maxY = Math.max(6, winH - 100);
      setPosition((prev) => ({
        x: Math.max(6, Math.min(maxX, prev.x)),
        y: Math.max(6, Math.min(maxY, prev.y)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save position to localStorage
  const updatePosition = (newPos: { x: number; y: number }) => {
    setPosition(newPos);
    try {
      localStorage.setItem('ishak_terminal_pos_x', String(newPos.x));
      localStorage.setItem('ishak_terminal_pos_y', String(newPos.y));
    } catch (e) {}
  };

  // Live price tick subscription from background stream
  useEffect(() => {
    const interval = setInterval(() => {
      const live = getBackgroundMarketData();
      if (live && live.currentPrice > 0) {
        setCurrentPrice(live.currentPrice);
        const pair = (live as unknown as { currentPair?: string }).currentPair || 'USD/BDT (OTC)';
        setActivePair(pair);

        if (isRunning) {
          setInterceptsCount((c) => c + 1);
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto snap to closest round price
  const suggestNearestRoundPrice = () => {
    if (currentPrice <= 0) return;
    let step = 0.001;
    if (currentPrice > 50) step = 0.1;
    if (currentPrice > 500) step = 1;
    const nearest = Math.round(currentPrice / step) * step;
    const decimals = currentPrice > 50 ? (currentPrice > 500 ? 2 : 3) : 5;
    setRoundPriceInput(nearest.toFixed(decimals));
    setInputError(false);
  };

  // Dragging event handlers (bounded strictly to viewport)
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
      const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
      const curW = isMinimized ? 48 : (winW <= 600 ? 236 : 304);
      const curH = isMinimized ? 48 : 390;
      const maxX = Math.max(6, winW - curW - 6);
      const maxY = Math.max(6, winH - curH - 6);

      updatePosition({
        x: Math.max(6, Math.min(maxX, dragRef.current.initX + dx)),
        y: Math.max(6, Math.min(maxY, dragRef.current.initY + dy)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !dragRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
      const curW = isMinimized ? 48 : (winW <= 600 ? 236 : 304);
      const curH = isMinimized ? 48 : 390;
      const maxX = Math.max(6, winW - curW - 6);
      const maxY = Math.max(6, winH - curH - 6);

      updatePosition({
        x: Math.max(6, Math.min(maxX, dragRef.current.initX + dx)),
        y: Math.max(6, Math.min(maxY, dragRef.current.initY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  // Duration preset chip selection
  const handleSelectChip = (sec: number) => {
    setSelectedChip(sec);
    setDurationInput(sec);
  };

  /**
   * START BUTTON:
   * "switch mode এ নাম্বার বসিয়ে start দিলে ওই নাম্বার পর্যন্ত ক্যান্ডেল যাবে"
   * Moves the candle smoothly from currentPrice to targetPrice over 1.5 seconds travel time,
   * then holds at target price until duration expires!
   */
  const handleStart = () => {
    const target = parseFloat(roundPriceInput);
    if (!target || isNaN(target) || target <= 0) {
      setInputError(true);
      suggestNearestRoundPrice();
      return;
    }

    const duration = durationInput || 6;
    const startP = currentPrice > 0 ? currentPrice : target;
    startPriceRef.current = startP;
    targetPriceRef.current = target;
    startTimeRef.current = Date.now();

    setInputError(false);
    setIsRunning(true);
    setStatusText(`● ACTIVE: TARGET ${target.toFixed(target > 50 ? 2 : 4)}`);
    setInterceptsCount(0);
    setProgressPercent(100);
    setCountdown(duration);

    // Smooth candle animation loop (1.5s travel time towards the target round number)
    const travelTimeMs = 1500;
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    
    animationIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1.0, elapsed / travelTimeMs);
      
      // Smooth sinusoidal easing
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      let simulatedPrice = startP + (target - startP) * eased;

      // Realistic minor micro-jitter when holding at target level
      if (progress >= 1.0) {
        const jitter = (Math.random() - 0.5) * (target > 50 ? 0.02 : 0.00004);
        simulatedPrice = target + jitter;
      }

      // Inject simulated price directly into background market stream
      setSimulatedMarketPrice(simulatedPrice);
      setCurrentPrice(simulatedPrice);
    }, 40);

    // Visual countdown & progress track loop
    let remaining = duration;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      const pct = Math.max(0, Math.round((remaining / duration) * 100));
      setProgressPercent(pct);

      if (remaining <= 0) {
        handleStop(); // Auto-stop when duration finishes
      }
    }, 1000);
  };

  /**
   * STOP BUTTON:
   * "আবার stop করলে আগের জায়গায় আসবে!! বাস এইটুকু কাজ! স্ক্যান বা ট্রেড প্লেস ওইটা switch mode এ চাই না!!"
   * Immediately stops candle simulation and reverts price back to original place!
   */
  const handleStop = () => {
    // Clear intervals
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Revert price back to original starting place!
    const originalPrice = startPriceRef.current;
    setSimulatedMarketPrice(null); // Clears override
    setCurrentPrice(originalPrice);

    setIsRunning(false);
    setStatusText('● STANDBY');
    setCountdown(0);
    setProgressPercent(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setSimulatedMarketPrice(null);
    };
  }, []);

  // 1. MINIMIZED STATE: Floating Cyber Pill with Radar Ring
  if (isMinimized) {
    return (
      <div
        id="minimizedPill"
        title="TradePilot VIP Round Controller - Click to Expand"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: 'fixed',
          zIndex: 2147483647,
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          backgroundColor: '#060913',
          boxShadow: '0 10px 28px rgba(0,0,0,0.9), 0 0 20px rgba(14,165,233,0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #38bdf8',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => setIsMinimized(false)}
      >
        {/* Animated Dashed Radar Ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: '1.5px dashed rgba(56, 189, 248, 0.45)',
            animation: 'spin 8s linear infinite',
            pointerEvents: 'none',
          }}
        />
        {/* Beacon Status Dot */}
        <div
          style={{
            position: 'absolute',
            top: '1px',
            right: '1px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isRunning ? '#10b981' : '#38bdf8',
            border: '2px solid #060913',
            boxShadow: `0 0 8px ${isRunning ? '#10b981' : '#38bdf8'}`,
          }}
        />
        <img
          src="https://i.ibb.co/qLkRtpxt/file-441.jpg"
          alt="TradePilot VIP Logo"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            objectFit: 'cover',
          }}
        />
      </div>
    );
  }

  // 2. EXPANDED CYBER HACKER HUD MATRIX TERMINAL (EXACT IMAGE 2 REPLICA)
  return (
    <div
      id="appCard"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed',
        zIndex: 2147483647,
        width: '304px',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 20px)',
        backgroundColor: '#060913',
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.22) 0%, transparent 75%),
          linear-gradient(rgba(56, 189, 248, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.06) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 18px 18px, 18px 18px',
        border: `1px solid ${isRunning ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)'}`,
        borderRadius: '14px',
        boxShadow: isRunning
          ? '0 20px 48px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.45)'
          : '0 20px 48px rgba(0, 0, 0, 0.9), 0 0 24px rgba(14, 165, 233, 0.2)',
        color: '#e2e8f0',
        fontSize: '13px',
        overflow: 'hidden',
        touchAction: 'none',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        userSelect: 'none',
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      }}
    >
      {/* HUD Corner Brackets */}
      <span
        style={{
          position: 'absolute',
          top: '-1px',
          left: '-1px',
          width: '14px',
          height: '14px',
          borderTop: '2px solid #38bdf8',
          borderLeft: '2px solid #38bdf8',
          borderTopLeftRadius: '12px',
          filter: 'drop-shadow(0 0 6px #38bdf8)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: '-1px',
          right: '-1px',
          width: '14px',
          height: '14px',
          borderTop: '2px solid #38bdf8',
          borderRight: '2px solid #38bdf8',
          borderTopRightRadius: '12px',
          filter: 'drop-shadow(0 0 6px #38bdf8)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: '-1px',
          left: '-1px',
          width: '14px',
          height: '14px',
          borderBottom: '2px solid #38bdf8',
          borderLeft: '2px solid #38bdf8',
          borderBottomLeftRadius: '12px',
          filter: 'drop-shadow(0 0 6px #38bdf8)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: '-1px',
          right: '-1px',
          width: '14px',
          height: '14px',
          borderBottom: '2px solid #38bdf8',
          borderRight: '2px solid #38bdf8',
          borderBottomRightRadius: '12px',
          filter: 'drop-shadow(0 0 6px #38bdf8)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Luminous Radar Scanline */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.8), transparent)',
          boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)',
          opacity: 0.35,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* HEADER (Draggable Handle) */}
      <div
        id="panelHeader"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          background: 'rgba(11, 17, 30, 0.92)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.22)',
          position: 'relative',
          zIndex: 3,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Logo Frame (Tap to minimize) */}
          <div
            id="headerLogo"
            title="Tap to minimize"
            onClick={() => setIsMinimized(true)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              border: '1.5px solid #d946ef',
              boxShadow: '0 0 10px rgba(217, 70, 239, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#050811',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <img
              src="https://i.ibb.co/qLkRtpxt/file-441.jpg"
              alt="TradePilot VIP Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: '12px',
                color: '#f8fafc',
                letterSpacing: '0.5px',
              }}
            >
              TRADEPILOT VIP TRADER
            </span>
            <span
              style={{
                fontSize: '8px',
                fontWeight: 700,
                color: '#38bdf8',
                letterSpacing: '0.7px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                  display: 'inline-block',
                }}
              />
              ROUND TERMINAL FREE BOT
            </span>
          </div>
        </div>

        {/* Header Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Mode Switch Button */}
          {onSwitchMode && (
            <button
              onClick={onSwitchMode}
              title="Switch back to Confluence Scanner Mode"
              style={{
                padding: '3px 6px',
                borderRadius: '5px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                fontSize: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>🔄</span> MODE
            </button>
          )}

          {/* Key Status Icon */}
          <div
            id="btnKeyStatus"
            title="VIP License: Active"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              background: 'rgba(18, 25, 42, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
            }}
          >
            🔑
          </div>

          {/* Minimize Header Action */}
          <button
            id="btnMinimizeHeader"
            title="Minimize"
            onClick={() => setIsMinimized(true)}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              background: 'rgba(18, 25, 42, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            —
          </button>

          {/* Close Header Action */}
          {onClose && (
            <button
              id="btnCloseHeader"
              onClick={onClose}
              title="Close Terminal"
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '5px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '9px',
                fontWeight: 'bold',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div
        style={{
          padding: '10px 12px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
          zIndex: 3,
        }}
      >
        {/* MARKET STRIP WITH ECG PULSE WAVE */}
        <div
          id="marketStrip"
          style={{
            background: 'rgba(10, 15, 27, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            borderRadius: '8px',
            padding: '7px 9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '7.5px',
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span style={{ color: '#38bdf8' }}>⚡</span> MARKET ASSET
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <span
                id="marketPair"
                style={{
                  fontWeight: 800,
                  fontSize: '12px',
                  color: '#38bdf8',
                  letterSpacing: '0.3px',
                  textShadow: '0 0 10px rgba(56, 189, 248, 0.4)',
                }}
              >
                {activePair}
              </span>
              <span
                id="marketLivePrice"
                style={{ fontSize: '10.5px', color: '#cbd5e1', fontFamily: 'monospace' }}
              >
                {currentPrice.toFixed(currentPrice > 50 ? (currentPrice > 500 ? 2 : 3) : 5)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <div
              style={{
                fontSize: '7.5px',
                fontWeight: 800,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '1px 5px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              ● LIVE
            </div>
            {/* ECG Pulse Wave SVG */}
            <div style={{ height: '10px', display: 'flex', alignItems: 'center' }}>
              <svg width="34" height="10" viewBox="0 0 42 14" fill="none">
                <path
                  d="M1 7H11L14 1L18 13L22 4L25 9L28 7H41"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* FIELD 1: ROUND NUMBER INPUT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              ROUND NUMBER
            </span>
            <button
              onClick={suggestNearestRoundPrice}
              type="button"
              style={{
                fontSize: '8px',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                padding: '1px 4px',
                cursor: 'pointer',
              }}
            >
              🎯 Auto Snap
            </button>
          </div>
          <input
            id="inputPrice"
            type="number"
            step="any"
            value={roundPriceInput}
            onChange={(e) => {
              setRoundPriceInput(e.target.value);
              setInputError(false);
            }}
            placeholder="Enter Round Price (e.g. 52.9900)"
            style={{
              width: '100%',
              background: '#070b14',
              border: `1px solid ${inputError ? '#ef4444' : 'rgba(56, 189, 248, 0.25)'}`,
              borderRadius: '7px',
              padding: '7px 9px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'ui-monospace, monospace',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: inputError ? '0 0 10px rgba(239, 68, 68, 0.35)' : 'none',
            }}
          />
        </div>

        {/* FIELD 2: TIME (SECOND) & PRESET CHIPS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              TIME (SECOND)
            </span>
            <span
              id="countdownText"
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                color: countdown > 0 ? '#10b981' : '#38bdf8',
              }}
            >
              {countdown > 0 ? `[${String(countdown).padStart(2, '0')}s]` : '[READY]'}
            </span>
          </div>

          <input
            id="inputDuration"
            type="number"
            min="1"
            max="3600"
            value={durationInput}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 6;
              setDurationInput(val);
              setSelectedChip(val);
            }}
            placeholder="Enter Seconds (default: 6)"
            style={{
              width: '100%',
              background: '#070b14',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '7px',
              padding: '6px 9px',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 600,
              fontFamily: 'ui-monospace, monospace',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Preset Chips Row */}
          <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
            {[5, 6, 10, 15, 30].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleSelectChip(sec)}
                style={{
                  flex: 1,
                  padding: '3px 0',
                  textAlign: 'center',
                  background: selectedChip === sec ? '#0284c7' : 'rgba(16, 22, 36, 0.9)',
                  border: `1px solid ${selectedChip === sec ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)'}`,
                  color: selectedChip === sec ? '#ffffff' : '#94a3b8',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: selectedChip === sec ? '0 0 8px rgba(56, 189, 248, 0.45)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Progress Track & Fill */}
          <div
            id="progressTrack"
            style={{
              height: '3px',
              background: '#121828',
              borderRadius: '2px',
              overflow: 'hidden',
              marginTop: '3px',
              display: isRunning ? 'block' : 'none',
            }}
          >
            <div
              id="progressFill"
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>

        {/* BUTTON ROW: START & STOP */}
        <div style={{ display: 'flex', gap: '7px', marginTop: '2px' }}>
          <button
            id="btnStart"
            type="button"
            onClick={handleStart}
            disabled={isRunning}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '7px',
              border: 'none',
              fontWeight: 800,
              fontSize: '11px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
              opacity: isRunning ? 0.4 : 1,
              transition: 'all 0.18s',
            }}
          >
            START
          </button>

          <button
            id="btnStop"
            type="button"
            onClick={handleStop}
            disabled={!isRunning}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: '7px',
              border: '1px solid rgba(239, 68, 68, 0.65)',
              fontWeight: 800,
              fontSize: '11px',
              cursor: !isRunning ? 'not-allowed' : 'pointer',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              opacity: !isRunning ? 0.4 : 1,
              transition: 'all 0.18s',
            }}
          >
            STOP
          </button>
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderTop: '1px solid rgba(56, 189, 248, 0.18)',
            paddingTop: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: '#64748b',
            }}
          >
            <span
              id="statusText"
              style={{
                color: isRunning ? '#38bdf8' : '#94a3b8',
              }}
            >
              {statusText}
            </span>
            <span
              id="ticksCount"
              style={{ color: '#38bdf8' }}
            >
              INTERCEPTS: {interceptsCount}
            </span>
          </div>

          <div
            id="footerMinimizePrompt"
            onClick={() => setIsMinimized(true)}
            title="Click to Minimize Terminal"
            style={{
              fontSize: '8px',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textAlign: 'center',
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            [ ❖ TAP LOGO OR HERE TO MINIMIZE ❖ ]
          </div>
        </div>
      </div>
    </div>
  );
};
