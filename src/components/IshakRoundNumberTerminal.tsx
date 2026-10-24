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
    const termW = winW <= 600 ? 250 : 310;
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
  const [durationInput, setDurationInput] = useState<number>(5);
  const [selectedChip, setSelectedChip] = useState<number>(5);

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
      const termW = winW <= 600 ? 250 : 310;
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

  // Quick adjust round price by delta
  const adjustRoundPrice = (delta: number) => {
    const base = parseFloat(roundPriceInput) || currentPrice;
    const decimals = currentPrice > 50 ? (currentPrice > 500 ? 2 : 3) : 5;
    const nextVal = Math.max(0, base + delta);
    setRoundPriceInput(nextVal.toFixed(decimals));
    setInputError(false);
  };

  // Dragging event handlers (bounded strictly to viewport)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('.interactive-ctrl')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('.interactive-ctrl')) return;
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
      const curW = isMinimized ? 52 : (winW <= 600 ? 250 : 310);
      const curH = isMinimized ? 52 : 400;
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
      const curW = isMinimized ? 52 : (winW <= 600 ? 250 : 310);
      const curH = isMinimized ? 52 : 400;
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
   * Instantly snaps / moves to target round price and holds there until Stop is clicked!
   */
  const handleStart = () => {
    const target = parseFloat(roundPriceInput);
    if (!target || isNaN(target) || target <= 0) {
      setInputError(true);
      suggestNearestRoundPrice();
      return;
    }

    const startP = currentPrice > 0 ? currentPrice : target;
    startPriceRef.current = startP;
    targetPriceRef.current = target;
    startTimeRef.current = Date.now();

    setInputError(false);
    setIsRunning(true);
    setStatusText(`● VEX ACTIVE: ${target.toFixed(target > 50 ? 2 : 4)}`);
    setInterceptsCount(0);
    setProgressPercent(100);

    // Fast smooth snap to the target round price (300ms) then hold
    const travelTimeMs = 300;
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    
    animationIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1.0, elapsed / travelTimeMs);
      
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      let simulatedPrice = startP + (target - startP) * eased;

      if (progress >= 1.0) {
        const jitter = (Math.random() - 0.5) * (target > 50 ? 0.02 : 0.00004);
        simulatedPrice = target + jitter;
      }

      setSimulatedMarketPrice(simulatedPrice);
      setCurrentPrice(simulatedPrice);
    }, 40);
  };

  /**
   * STOP BUTTON:
   * Immediately stops candle simulation and reverts price back to original place!
   */
  const handleStop = () => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const originalPrice = startPriceRef.current;
    setSimulatedMarketPrice(null);
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

  // 1. MINIMIZED STATE: Futuristic Glowing Squircle VEX Crest with Running Orbital Animation
  if (isMinimized) {
    return (
      <div
        id="minimizedPill"
        title="TradePilot Vex - Tap to Expand"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: 'fixed',
          zIndex: 2147483647,
          width: '54px',
          height: '54px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={(e) => {
          e.stopPropagation();
          setIsMinimized(false);
        }}
      >
        {/* Continuous Square Orbital Beam Animation */}
        <div className="absolute -inset-1.5 rounded-[18px] pointer-events-none flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-[18px] pointer-events-none animate-[ishakSpinCW_3.2s_linear_infinite] opacity-80"
            style={{
              background: isRunning
                ? 'conic-gradient(from 0deg, transparent 0%, rgba(255,46,84,0.9) 30%, transparent 60%, rgba(255,100,130,0.8) 80%, transparent 100%)'
                : 'conic-gradient(from 0deg, transparent 0%, rgba(0,229,255,0.85) 25%, transparent 50%, rgba(255,46,84,0.85) 75%, transparent 100%)',
              mask: 'radial-gradient(circle, transparent 65%, black 66%)',
              WebkitMask: 'radial-gradient(circle, transparent 65%, black 66%)',
              filter: `drop-shadow(0 0 8px ${isRunning ? '#ff2e54' : '#00E5FF'})`,
            }}
          />
          {/* Traveling Square Perimeter Beam SVG */}
          <svg className="w-full h-full relative z-1" viewBox="0 0 66 66" fill="none">
            <defs>
              <linearGradient id="vexSquareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isRunning ? '#ff2e54' : '#00E5FF'} stopOpacity="1" />
                <stop offset="35%" stopColor="#A855F7" stopOpacity="0.9" />
                <stop offset="70%" stopColor={isRunning ? '#ff5e7e' : '#FF2E54'} stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00FF66" stopOpacity="0.5" />
              </linearGradient>
              <filter id="vexSquareGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={isRunning ? '#ff2e54' : '#00E5FF'} floodOpacity="0.9" />
              </filter>
            </defs>
            <rect
              x="3"
              y="3"
              width="60"
              height="60"
              rx="16"
              ry="16"
              stroke={isRunning ? 'rgba(255,46,84,0.25)' : 'rgba(0,229,255,0.25)'}
              strokeWidth="1.5"
            />
            <rect
              x="3"
              y="3"
              width="60"
              height="60"
              rx="16"
              ry="16"
              pathLength="100"
              stroke="url(#vexSquareGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="28 72"
              filter="url(#vexSquareGlow)"
              style={{
                strokeDashoffset: 0,
                animation: 'ishakSquareDash 2.4s linear infinite',
              }}
            />
          </svg>
        </div>

        {/* Squircle Crest */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '48px',
            height: '48px',
            borderRadius: '15px',
            background: 'linear-gradient(135deg, #090e24 0%, #030612 100%)',
            boxShadow: isRunning
              ? '0 10px 30px rgba(0,0,0,0.95), 0 0 25px #ff2e54, inset 0 0 12px rgba(255,46,84,0.4)'
              : '0 10px 30px rgba(0,0,0,0.95), 0 0 20px rgba(0,229,255,0.45), inset 0 0 10px rgba(0,229,255,0.25)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${isRunning ? '#ff2e54' : '#00e5ff'}`,
            transition: 'all 0.25s',
          }}
        >
          <div style={{ position: 'relative', width: '26px', height: '26px', borderRadius: '7px', overflow: 'hidden' }}>
            <img
              src="https://i.ibb.co/qLkRtpxt/file-441.jpg"
              alt="TradePilot Vex"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div
            style={{
              marginTop: '1.5px',
              fontSize: '7px',
              fontWeight: 900,
              letterSpacing: '0.6px',
              padding: '0.5px 4px',
              borderRadius: '999px',
              background: isRunning ? 'linear-gradient(90deg, #ff2e54, #ff5e7e)' : 'linear-gradient(90deg, #00e5ff, #0099ff)',
              color: '#050a18',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              boxShadow: isRunning ? '0 0 8px #ff2e54' : '0 0 8px #00e5ff',
            }}
          >
            {isRunning ? 'ACTIVE' : 'VEX'}
          </div>
        </div>
      </div>
    );
  }

  // 2. EXPANDED STATE: Premium Liquid Glassmorphism & Neon VEX Terminal (265px)
  return (
    <div
      id="appCard"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed',
        zIndex: 2147483647,
        width: '265px',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 20px)',
        background: 'linear-gradient(165deg, rgba(14, 24, 60, 0.45) 0%, rgba(6, 12, 32, 0.55) 100%)',
        borderTop: isRunning ? '2px solid rgba(255, 46, 84, 0.85)' : '1.5px solid rgba(255, 255, 255, 0.45)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.18)',
        borderRight: '1px solid rgba(255, 255, 255, 0.18)',
        borderBottom: '2px solid rgba(0, 0, 0, 0.8)',
        borderRadius: '20px',
        boxShadow: isRunning
          ? '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(255, 46, 84, 0.35), inset 0 1.5px 2px rgba(255, 255, 255, 0.45), inset 0 -2.5px 5px rgba(0, 0, 0, 0.7)'
          : '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 229, 255, 0.2), inset 0 1.5px 2px rgba(255, 255, 255, 0.45), inset 0 -2.5px 5px rgba(0, 0, 0, 0.7)',
        color: '#e2e8f0',
        fontSize: '11.5px',
        overflow: 'hidden',
        touchAction: 'none',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        userSelect: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Cyber Accent Strip */}
      <div
        style={{
          height: '2px',
          background: isRunning
            ? 'linear-gradient(90deg, #ff2e54, #ff8fa3, #ff2e54)'
            : 'linear-gradient(90deg, #00e5ff, #a855f7, #00e5ff)',
          boxShadow: isRunning ? '0 0 10px #ff2e54' : '0 0 10px #00e5ff',
        }}
      />

      {/* HEADER: Draggable Grip Handle with Glassmorphism */}
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
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(10, 18, 45, 0.3) 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Logo Crest (Tap to Minimize) */}
          <div
            className="interactive-ctrl"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            title="Tap to minimize"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '9px',
              border: '1.5px solid #00e5ff',
              boxShadow: '0 0 10px rgba(0,229,255,0.4)',
              overflow: 'hidden',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <img
              src="https://i.ibb.co/qLkRtpxt/file-441.jpg"
              alt="TradePilot Vex"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Redesigned Brand Header: TradePilot Vex */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 900, fontSize: '12px', letterSpacing: '0.4px', fontFamily: '"Orbitron", sans-serif' }}>
                <span style={{ color: '#00e5ff', textShadow: '0 0 8px rgba(0,229,255,0.8)' }}>Trade</span>
                <span style={{ color: '#ff2e54', textShadow: '0 0 8px rgba(255,46,84,0.8)' }}>Pilot</span>
              </span>
              <span
                style={{
                  fontSize: '8px',
                  fontWeight: 900,
                  padding: '1px 4px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #ff2e54, #8b0029)',
                  color: '#ffffff',
                  letterSpacing: '0.5px',
                  fontFamily: 'monospace',
                  boxShadow: '0 0 8px rgba(255,46,84,0.5)',
                }}
              >
                VEX
              </span>
            </div>
            <span style={{ fontSize: '7.5px', color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', marginTop: '1px' }}>
              TP VEX CONTROL ENGINE
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Mode Return Button (Return Bot) */}
          {onSwitchMode && (
            <button
              className="interactive-ctrl"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSwitchMode();
              }}
              type="button"
              title="Return to Standard TradePilot Bot"
              style={{
                padding: '4px 7px',
                borderRadius: '7px',
                background: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid rgba(0, 229, 255, 0.35)',
                color: '#00e5ff',
                fontSize: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span>↩</span> BOT
            </button>
          )}

          {/* Minimize Button */}
          <button
            className="interactive-ctrl"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            type="button"
            title="Minimize"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            —
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              className="interactive-ctrl"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              type="button"
              title="Close"
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '7px',
                background: 'rgba(255, 46, 84, 0.2)',
                border: '1px solid rgba(255, 46, 84, 0.5)',
                color: '#ff8fa3',
                fontSize: '10px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* BODY CONTENT: Restructured layout & colors with Liquid Glassmorphism */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* 1. Market & Live Price Bar - 3D Glassmorphic Bevel */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(8, 14, 38, 0.4) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
            borderRight: '1px solid rgba(255, 255, 255, 0.12)',
            borderBottom: '1.5px solid rgba(0, 0, 0, 0.6)',
            borderRadius: '14px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              MARKET ASSET
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#00e5ff', letterSpacing: '0.2px', textShadow: '0 0 10px rgba(0,229,255,0.45)' }}>
              {activePair}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '7.5px', color: '#10b981', fontWeight: 900, letterSpacing: '0.5px' }}>
              ● LIVE QUOTE
            </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
              {currentPrice.toFixed(currentPrice > 50 ? (currentPrice > 500 ? 2 : 3) : 5)}
            </span>
          </div>
        </div>

        {/* 2. Target Round Number Input with Quick Adjust Stepper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              TARGET ROUND PRICE
            </span>
            <button
              onClick={suggestNearestRoundPrice}
              type="button"
              style={{
                fontSize: '8.5px',
                color: '#00e5ff',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 229, 255, 0.15) 100%)',
                backdropFilter: 'blur(8px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.35)',
                borderLeft: '1px solid rgba(0, 229, 255, 0.3)',
                borderRight: '1px solid rgba(0, 229, 255, 0.3)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.5)',
                borderRadius: '6px',
                padding: '2px 7px',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              🎯 Auto Snap
            </button>
          </div>

          {/* Stepper + Input with Glassmorphism */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => adjustRoundPrice(currentPrice > 50 ? -0.1 : -0.001)}
              type="button"
              style={{
                width: '32px',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(15, 23, 42, 0.5) 100%)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                borderBottom: '1.5px solid rgba(0, 0, 0, 0.6)',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              -
            </button>

            <input
              id="inputPrice"
              type="number"
              step="any"
              value={roundPriceInput}
              onChange={(e) => {
                setRoundPriceInput(e.target.value);
                setInputError(false);
              }}
              placeholder={`e.g. ${(currentPrice || 122.500).toFixed(currentPrice > 50 ? 2 : 4)}`}
              style={{
                flex: 1,
                background: 'rgba(5, 10, 28, 0.55)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderTop: inputError ? '1.5px solid #ff2e54' : '1px solid rgba(255, 255, 255, 0.25)',
                borderLeft: '1px solid rgba(0, 229, 255, 0.3)',
                borderRight: '1px solid rgba(0, 229, 255, 0.3)',
                borderBottom: '1.5px solid rgba(0, 0, 0, 0.6)',
                borderRadius: '8px',
                padding: '8px 10px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                fontFamily: 'monospace',
                textAlign: 'center',
                outline: 'none',
                boxShadow: inputError ? '0 0 14px rgba(255,46,84,0.5), inset 0 1px 2px rgba(0,0,0,0.5)' : 'inset 0 1.5px 3px rgba(0,0,0,0.5)',
              }}
            />

            <button
              onClick={() => adjustRoundPrice(currentPrice > 50 ? 0.1 : 0.001)}
              type="button"
              style={{
                width: '32px',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(15, 23, 42, 0.5) 100%)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                borderBottom: '1.5px solid rgba(0, 0, 0, 0.6)',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* 3. Action Buttons: Dual Side-by-Side: STOP (Left) and START (Right) */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          {/* STOP Button on the LEFT */}
          <button
            id="btnStop"
            type="button"
            onClick={handleStop}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: '12px',
              borderTop: isRunning ? '1.5px solid rgba(255, 100, 130, 0.8)' : '1px solid rgba(255, 46, 84, 0.5)',
              borderLeft: '1px solid rgba(255, 46, 84, 0.3)',
              borderRight: '1px solid rgba(255, 46, 84, 0.3)',
              borderBottom: '2px solid rgba(0, 0, 0, 0.7)',
              fontWeight: 900,
              fontSize: '12.5px',
              cursor: 'pointer',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              background: isRunning
                ? 'linear-gradient(135deg, rgba(255, 46, 84, 0.85) 0%, rgba(139, 0, 41, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(139, 0, 41, 0.4) 100%)',
              color: '#ffffff',
              boxShadow: isRunning
                ? '0 6px 20px rgba(255, 46, 84, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                : '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(14px)',
              fontFamily: '"Orbitron", sans-serif',
              transition: 'all 0.18s ease-in-out',
            }}
          >
            Stop
          </button>

          {/* START Button on the RIGHT */}
          <button
            id="btnStart"
            type="button"
            onClick={handleStart}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: '12px',
              borderTop: !isRunning ? '1.5px solid rgba(255, 255, 255, 0.6)' : '1px solid rgba(0, 229, 255, 0.4)',
              borderLeft: '1px solid rgba(0, 229, 255, 0.3)',
              borderRight: '1px solid rgba(0, 229, 255, 0.3)',
              borderBottom: '2px solid rgba(0, 0, 0, 0.7)',
              fontWeight: 900,
              fontSize: '12.5px',
              cursor: 'pointer',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              background: !isRunning
                ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.9) 0%, rgba(2, 132, 199, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(0, 229, 255, 0.35) 100%)',
              color: !isRunning ? '#030718' : '#7dd3fc',
              boxShadow: !isRunning
                ? '0 6px 20px rgba(0, 229, 255, 0.45), inset 0 1.5px 2px rgba(255, 255, 255, 0.5)'
                : '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(14px)',
              fontFamily: '"Orbitron", sans-serif',
              transition: 'all 0.18s ease-in-out',
            }}
          >
            Start
          </button>
        </div>

        {/* 5. Footer Strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '9px',
            fontWeight: 700,
            color: '#64748b',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '6px',
          }}
        >
          <span style={{ color: isRunning ? '#ff2e54' : '#00e5ff', fontWeight: 800 }}>
            {statusText}
          </span>
          <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
            INTERCEPTS: {interceptsCount}
          </span>
        </div>
      </div>
    </div>
  );
};
