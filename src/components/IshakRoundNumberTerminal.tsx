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
    setStatusText(`● VEX ACTIVE: ${target.toFixed(target > 50 ? 2 : 4)}`);
    setInterceptsCount(0);
    setProgressPercent(100);
    setCountdown(duration);

    // Smooth sinusoidal travel time towards the target price
    const travelTimeMs = 1500;
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

    let remaining = duration;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      const pct = Math.max(0, Math.round((remaining / duration) * 100));
      setProgressPercent(pct);

      if (remaining <= 0) {
        handleStop();
      }
    }, 1000);
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

  // 1. MINIMIZED STATE: Futuristic Glowing Squircle VEX Crest (NEW UNIQUE STYLE)
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
          borderRadius: '16px',
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
          touchAction: 'none',
          userSelect: 'none',
          transition: 'all 0.25s',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => setIsMinimized(false)}
      >
        {/* Glowing Corner Notches */}
        <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden' }}>
          <img
            src="https://i.ibb.co/qLkRtpxt/file-441.jpg"
            alt="TradePilot Vex"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Micro VEX Pill Indicator */}
        <div
          style={{
            marginTop: '2px',
            fontSize: '7.5px',
            fontWeight: 900,
            letterSpacing: '0.8px',
            padding: '1px 5px',
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
    );
  }

  // 2. EXPANDED STATE: Complete Redesigned Dark Obsidian Glass & Neon VEX Terminal
  return (
    <div
      id="appCard"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed',
        zIndex: 2147483647,
        width: '310px',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 20px)',
        background: 'linear-gradient(165deg, rgba(8, 14, 36, 0.98) 0%, rgba(4, 7, 20, 0.99) 100%)',
        border: `1.5px solid ${isRunning ? '#ff2e54' : 'rgba(0, 229, 255, 0.4)'}`,
        borderRadius: '20px',
        boxShadow: isRunning
          ? '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(255, 46, 84, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
          : '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 229, 255, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        color: '#e2e8f0',
        fontSize: '12px',
        overflow: 'hidden',
        touchAction: 'none',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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

      {/* HEADER: Draggable Grip Handle */}
      <div
        id="panelHeader"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          background: 'rgba(6, 11, 28, 0.9)',
          borderBottom: '1px solid rgba(0, 229, 255, 0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {/* Logo Crest (Tap to Minimize) */}
          <div
            onClick={() => setIsMinimized(true)}
            title="Tap to minimize"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: '1.5px solid #00e5ff',
              boxShadow: '0 0 12px rgba(0,229,255,0.4)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontWeight: 900, fontSize: '13px', letterSpacing: '0.5px', fontFamily: '"Orbitron", sans-serif' }}>
                <span style={{ color: '#00e5ff', textShadow: '0 0 8px rgba(0,229,255,0.8)' }}>Trade</span>
                <span style={{ color: '#ff2e54', textShadow: '0 0 8px rgba(255,46,84,0.8)' }}>Pilot</span>
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 900,
                  padding: '1px 5px',
                  borderRadius: '5px',
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
            <span style={{ fontSize: '8.5px', color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '1px' }}>
              TP VEX CONTROL ENGINE
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mode Return Button */}
          {onSwitchMode && (
            <button
              onClick={onSwitchMode}
              type="button"
              title="Return to Standard TradePilot"
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                background: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid rgba(0, 229, 255, 0.35)',
                color: '#00e5ff',
                fontSize: '8.5px',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>↩</span> STD
            </button>
          )}

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            type="button"
            title="Minimize"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '8px',
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
              onClick={onClose}
              type="button"
              title="Close"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '8px',
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

      {/* BODY CONTENT: Restructured layout & colors */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 1. Market & Live Price Bar */}
        <div
          style={{
            background: 'rgba(4, 9, 24, 0.85)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '12px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '7.5px', color: '#64748b', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              MARKET ASSET
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#00e5ff', letterSpacing: '0.2px', textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
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
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              TARGET ROUND PRICE
            </span>
            <button
              onClick={suggestNearestRoundPrice}
              type="button"
              style={{
                fontSize: '8.5px',
                color: '#00e5ff',
                background: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '6px',
                padding: '2px 6px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              🎯 Auto Snap
            </button>
          </div>

          {/* Stepper + Input */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => adjustRoundPrice(currentPrice > 50 ? -0.1 : -0.001)}
              type="button"
              style={{
                width: '32px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
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
                background: '#040715',
                border: `1.5px solid ${inputError ? '#ff2e54' : 'rgba(0, 229, 255, 0.35)'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                fontFamily: 'monospace',
                textAlign: 'center',
                outline: 'none',
                boxShadow: inputError ? '0 0 12px rgba(255,46,84,0.45)' : 'none',
              }}
            />

            <button
              onClick={() => adjustRoundPrice(currentPrice > 50 ? 0.1 : 0.001)}
              type="button"
              style={{
                width: '32px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* 3. Duration & Chip Selectors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              DURATION (SECONDS)
            </span>
            <span style={{ fontSize: '10px', fontWeight: 900, color: countdown > 0 ? '#ff2e54' : '#00e5ff', fontFamily: 'monospace' }}>
              {countdown > 0 ? `[00:${String(countdown).padStart(2, '0')}]` : `[${durationInput}s READY]`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[5, 6, 10, 15, 30, 60].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleSelectChip(sec)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  textAlign: 'center',
                  background: selectedChip === sec
                    ? 'linear-gradient(135deg, #00e5ff, #0088cc)'
                    : 'rgba(11, 18, 38, 0.85)',
                  border: `1px solid ${selectedChip === sec ? '#00e5ff' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: selectedChip === sec ? '#040818' : '#94a3b8',
                  borderRadius: '6px',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.15s',
                }}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Progress Indicator when Running */}
          {isRunning && (
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #ff2e54, #00e5ff)',
                  transition: 'width 1s linear',
                }}
              />
            </div>
          )}
        </div>

        {/* 4. Action Buttons: Restructured Tactical Control */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          {!isRunning ? (
            <button
              id="btnStart"
              type="button"
              onClick={handleStart}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)',
                color: '#030718',
                boxShadow: '0 6px 20px rgba(0, 229, 255, 0.45)',
                fontFamily: '"Orbitron", sans-serif',
                transition: 'all 0.15s',
              }}
            >
              ⚡ START VEX TRAVEL
            </button>
          ) : (
            <button
              id="btnStop"
              type="button"
              onClick={handleStop}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: '10px',
                border: '1.5px solid #ff2e54',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, rgba(255, 46, 84, 0.25), rgba(139, 0, 41, 0.4))',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(255, 46, 84, 0.5)',
                fontFamily: '"Orbitron", sans-serif',
                transition: 'all 0.15s',
              }}
            >
              ⏹ STOP & REVERT PRICE
            </button>
          )}
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
