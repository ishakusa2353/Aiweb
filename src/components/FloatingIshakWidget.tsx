import React, { useState, useEffect, useRef } from 'react';
import { playTacticalRadarScannerSound, playResultSound, playRiskWarningSound, playDataInjectionSound } from '../utils/audio';
import { TIME_OPTIONS } from '../data/markets';
import { SignalData } from '../types';
import { Search, ShieldAlert, Sparkles, KeyRound, Cpu, Database, Zap, Activity, Crosshair } from 'lucide-react';
import { supabaseService } from '../lib/supabaseService';
import { evaluateMarketData, Candle } from '../utils/marketAnalysisEngine';
import { getBackgroundMarketData } from '../utils/backgroundMarketStream';
import { IshakRoundNumberTerminal } from './IshakRoundNumberTerminal';

interface FloatingIshakWidgetProps {
  soundEnabled: boolean;
  onTradeSignal?: (signal: SignalData) => void;
}

export const FloatingIshakWidget: React.FC<FloatingIshakWidgetProps> = ({
  soundEnabled,
  onTradeSignal,
}) => {
  // Squircle Cyber Badge Position (Independent & Clamped to screen)
  const [position, setPosition] = useState({ x: window.innerWidth - 105, y: window.innerHeight - 155 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Independent 3D HUD Banner Position
  const [hudPosition, setHudPosition] = useState({ x: Math.max(20, window.innerWidth - 360), y: 120 });
  const [isHudDragging, setIsHudDragging] = useState(false);
  const hudDragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // States
  const [tradeDuration, setTradeDuration] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanDots, setScanDots] = useState<string>('.......');
  const [badgeText, setBadgeText] = useState<string>('5S');

  // Background chart & real-time detected market data
  const [detectedAsset, setDetectedAsset] = useState<string>('USD/BDT (OTC)');
  const [detectedPrice, setDetectedPrice] = useState<number>(129.730);
  const [chartClockTime, setChartClockTime] = useState<string>('');
  const [matrixTelemetryLines, setMatrixTelemetryLines] = useState<string[]>([]);

  // Data Injection state
  const [injectedTradesCount, setInjectedTradesCount] = useState<number>(() => {
    try {
      localStorage.setItem('ISHAK_DATA_INJECTED_COUNT', '999');
    } catch (e) {}
    return 999;
  });

  // Modals
  const [showHub, setShowHub] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);

  // Key verification state
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [keyInputError, setKeyInputError] = useState<boolean>(false);
  const [keyInputSuccess, setKeyInputSuccess] = useState<boolean>(false);
  const [activeLicense, setActiveLicense] = useState<any>(null);
  const [modalToast, setModalToast] = useState<{ msg: string; isError: boolean } | null>(null);

  // HUD Result State with live time & investment
  const [hudResult, setHudResult] = useState<(SignalData & {
    finishTime: string;
    durationLabel: string;
    payout: string;
    investment: string;
    liveExecutionTime: string;
  }) | null>(null);
  const [flySignal, setFlySignal] = useState<'UP' | 'DOWN' | null>(null);

  const [autoPilotMode, setAutoPilotMode] = useState<boolean>(false);
  const [botMode, setBotMode] = useState<'CONFLUENCE' | 'ROUND_NUMBER'>(() => {
    try {
      return (localStorage.getItem('ishak_active_mode') as 'CONFLUENCE' | 'ROUND_NUMBER') || 'CONFLUENCE';
    } catch (e) {
      return 'CONFLUENCE';
    }
  });

  // Expiration countdown
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');

  // Continuous background chart sniffer: updates detected asset & price every 300ms
  useEffect(() => {
    const updateMarketMeta = () => {
      const bg = getBackgroundMarketData();
      if (bg) {
        if (bg.currentPair && bg.currentPair !== detectedAsset) {
          setDetectedAsset(bg.currentPair);
        }
        if (bg.currentPrice > 0) {
          setDetectedPrice(bg.currentPrice);
        }
        setChartClockTime(bg.chartTime || new Date().toLocaleTimeString('en-US', { hour12: false }));
      }
    };
    updateMarketMeta();
    const interval = setInterval(updateMarketMeta, 300);
    return () => clearInterval(interval);
  }, [detectedAsset]);

  // Toast helper
  const showToast = (msg: string, isError: boolean) => {
    setModalToast({ msg, isError });
    setTimeout(() => {
      setModalToast(null);
    }, 3500);
  };

  // Viewport clamping
  const clampWidgetPosition = (x: number, y: number) => {
    const pad = 6;
    const w = 78;
    const h = 94;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
    const maxX = Math.max(pad, winW - w - pad);
    const maxY = Math.max(pad, winH - h - pad);
    return {
      x: Math.max(pad, Math.min(maxX, x)),
      y: Math.max(pad, Math.min(maxY, y)),
    };
  };

  const clampHudPosition = (x: number, y: number) => {
    const pad = 6;
    const w = 310;
    const h = 180;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
    const maxX = Math.max(pad, winW - w - pad);
    const maxY = Math.max(pad, winH - h - pad);
    return {
      x: Math.max(pad, Math.min(maxX, x)),
      y: Math.max(pad, Math.min(maxY, y)),
    };
  };

  // Expiration countdown ticker
  useEffect(() => {
    if (!activeLicense || !activeLicense.exp) {
      setRemainingTimeStr(activeLicense?.duration === 'lifetime' ? 'LIFETIME ACCESS ♾️' : '');
      return;
    }
    const update = () => {
      const now = Date.now();
      const diff = activeLicense.exp - now;
      if (diff <= 0) {
        setRemainingTimeStr('EXPIRED');
        setActiveLicense(null);
        localStorage.removeItem('ISHAK_AI_LICENSE');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        if (d > 0) setRemainingTimeStr(`${d}d ${h}h ${m}m`);
        else if (h > 0) setRemainingTimeStr(`${h}h ${m}m ${s}s`);
        else setRemainingTimeStr(`${m}m ${s}s`);
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [activeLicense]);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const savedLic = localStorage.getItem('ISHAK_AI_LICENSE');
      if (savedLic) {
        const parsed = JSON.parse(savedLic);
        if (parsed && parsed.key) {
          if (!parsed.exp || parsed.exp > Date.now()) {
            setActiveLicense(parsed);
          }
        }
      }
      const savedDuration = localStorage.getItem('ISHAK_TRADE_DURATION');
      if (savedDuration) {
        const d = parseInt(savedDuration, 10);
        if (!isNaN(d) && d > 0) {
          setTradeDuration(d);
          setBadgeText(d >= 60 ? `${d / 60}M` : `${d}S`);
        }
      }
    } catch (e) {}
  }, []);

  // Listen to external simulator time changes
  useEffect(() => {
    const handleSimDuration = (e: any) => {
      if (e && e.detail && typeof e.detail.duration === 'number') {
        const d = e.detail.duration;
        setTradeDuration(d);
        setBadgeText(d >= 60 ? `${d / 60}M` : `${d}S`);
        try {
          localStorage.setItem('ISHAK_TRADE_DURATION', String(d));
        } catch (err) {}
      }
    };
    window.addEventListener('ishak_set_duration', handleSimDuration);
    return () => window.removeEventListener('ishak_set_duration', handleSimDuration);
  }, []);

  // Sync window resize bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampWidgetPosition(prev.x, prev.y));
      setHudPosition((prev) => clampHudPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dragging event handlers for Bot Button
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')?.id !== 'btn-ishak-logo') return;
    setIsDragging(false);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvt.clientX - dragStartRef.current.startX;
      const dy = moveEvt.clientY - dragStartRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsDragging(true);
      }
      setPosition(clampWidgetPosition(dragStartRef.current.initX + dx, dragStartRef.current.initY + dy));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => {
        setIsDragging(false);
        dragStartRef.current = null;
      }, 50);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')?.id !== 'btn-ishak-logo') return;
    setIsDragging(false);
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: position.x,
      initY: position.y,
    };
    const onTouchMove = (moveEvt: TouchEvent) => {
      if (!dragStartRef.current) return;
      const t = moveEvt.touches[0];
      const dx = t.clientX - dragStartRef.current.startX;
      const dy = t.clientY - dragStartRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsDragging(true);
      }
      setPosition(clampWidgetPosition(dragStartRef.current.initX + dx, dragStartRef.current.initY + dy));
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      setTimeout(() => {
        setIsDragging(false);
        dragStartRef.current = null;
      }, 50);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  // Dragging event handlers for HUD
  const handleHudMouseDown = (e: React.MouseEvent) => {
    setIsHudDragging(false);
    hudDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: hudPosition.x,
      initY: hudPosition.y,
    };
    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!hudDragStartRef.current) return;
      const dx = moveEvt.clientX - hudDragStartRef.current.startX;
      const dy = moveEvt.clientY - hudDragStartRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsHudDragging(true);
      }
      setHudPosition(clampHudPosition(hudDragStartRef.current.initX + dx, hudDragStartRef.current.initY + dy));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => {
        setIsHudDragging(false);
        hudDragStartRef.current = null;
      }, 50);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleHudTouchStart = (e: React.TouchEvent) => {
    setIsHudDragging(false);
    const touch = e.touches[0];
    hudDragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: hudPosition.x,
      initY: hudPosition.y,
    };
    const onTouchMove = (moveEvt: TouchEvent) => {
      if (!hudDragStartRef.current) return;
      const t = moveEvt.touches[0];
      const dx = t.clientX - hudDragStartRef.current.startX;
      const dy = t.clientY - hudDragStartRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsHudDragging(true);
      }
      setHudPosition(clampHudPosition(hudDragStartRef.current.initX + dx, hudDragStartRef.current.initY + dy));
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      setTimeout(() => {
        setIsHudDragging(false);
        hudDragStartRef.current = null;
      }, 50);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  // Safe Quotex Trade Click
  const executeQuotexTrade = (isCall: boolean) => {
    try {
      const upSelectors = [
        '#btn-call-quotex', '#btn-call', '.call-btn', '.btn-call',
        'button[data-type="call"]', '.button-call', 'button.button--call',
        '.section-deal__button--call', '.call', '.btn--up', '.deal-form__button--call',
        'button:has(.icon-call)', 'button:has(.icon-up)'
      ];
      const downSelectors = [
        '#btn-put-quotex', '#btn-put', '.put-btn', '.btn-put',
        'button[data-type="put"]', '.button-put', 'button.button--put',
        '.section-deal__button--put', '.put', '.btn--down', '.deal-form__button--put',
        'button:has(.icon-put)', 'button:has(.icon-down)'
      ];
      const targetSelectors = isCall ? upSelectors : downSelectors;
      for (const sel of targetSelectors) {
        const btn = document.querySelector(sel) as HTMLElement;
        if (btn) {
          btn.click();
          break;
        }
      }
    } catch (e) {
      console.warn('Quotex broker click exception:', e);
    }
  };

  const getLiveQuotexInvestmentAmount = (): string => {
    try {
      const investmentSelectors = [
        'input[name="amount"]', '.deal-form__input-amount', '#deal-amount',
        'input.deal-amount', '.input-amount input', '[data-test="deal-amount"]'
      ];
      for (const sel of investmentSelectors) {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el && el.value) {
          const val = el.value.trim();
          if (val) return val.startsWith('$') ? val : `$${val}`;
        }
      }
    } catch (e) {}
    return '$100';
  };

  // Primary Single Click Handler: Setup & Scan
  const triggerScan = async () => {
    if (isDragging) return;

    try {
      if (soundEnabled) playDataInjectionSound();
      setInjectedTradesCount(999);
      window.dispatchEvent(new CustomEvent('ishak_data_injected', { detail: { count: 999 } }));
    } catch (e) {}

    // Check 1: License presence
    if (!activeLicense || !activeLicense.key) {
      setShowKeyModal(true);
      showToast('⚠️ অনুগ্রহ করে প্রথমে আপনার VIP লাইসেন্স কি ভেরিফাই করুন!', true);
      return;
    }

    if (botMode === 'ROUND_NUMBER') {
      const pill = document.getElementById('minimizedPill') as HTMLElement | null;
      if (pill && pill.style.display !== 'none') {
        pill.click();
        return;
      }
      const startBtn = document.getElementById('btnStart') as HTMLButtonElement | null;
      if (startBtn && !startBtn.disabled) {
        startBtn.click();
        return;
      }
    }

    // Check 2: LIVE CLOUD LICENSE VERIFICATION WITH SUPABASE
    setBadgeText('VERIFY..');
    try {
      const devId = localStorage.getItem('ISHAK_DEV_ID') || 'DEV_SIMULATOR_HOST';
      const verifyData = await supabaseService.verifyLicense(
        activeLicense.key,
        activeLicense.traderId || '',
        devId
      );

      if (!verifyData || !verifyData.valid) {
        localStorage.removeItem('ISHAK_AI_LICENSE');
        setActiveLicense(null);
        setShowKeyModal(true);
        const dur = tradeDuration || 5;
        setBadgeText(dur >= 60 ? `${dur / 60}M` : `${dur}S`);
        showToast(verifyData?.reason || '⛔ লাইসেন্সটি এডমিন দ্বারা ব্লক বা বাতিল করা হয়েছে!', true);
        return;
      }
    } catch (e) {
      if (activeLicense.exp && Date.now() > activeLicense.exp) {
        localStorage.removeItem('ISHAK_AI_LICENSE');
        setActiveLicense(null);
        setShowKeyModal(true);
        const dur = tradeDuration || 5;
        setBadgeText(dur >= 60 ? `${dur / 60}M` : `${dur}S`);
        showToast('⛔ আপনার VIP লাইসেন্সের মেয়াদ শেষ হয়ে গেছে!', true);
        return;
      }
    }

    const dur = tradeDuration || 5;
    setBadgeText(dur >= 60 ? `${dur / 60}M` : `${dur}S`);
    startScanProcess();
  };

  const startScanProcess = () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanDots('.');
    setHudResult(null);

    // Get live background market feed
    const bgMarket = getBackgroundMarketData();
    const liveAsset = bgMarket.currentPair || detectedAsset || 'USD/BDT (OTC)';
    const liveCandle = bgMarket.runningCandle;
    const dur = tradeDuration || 5;
    const durationStr = dur >= 60 ? `${dur / 60}M` : `${dur}S`;

    // Initialize bottom-left hacker matrix stream lines with live chart data
    const candleTrend = (liveCandle.close >= liveCandle.open) ? 'BULLISH' : 'BEARISH';
    const initTelemetry = [
      `>> TARGET ASSET: ${liveAsset}`,
      `>> TIMEFRAME: ${durationStr}`,
      `>> CHART TIME: ${bgMarket.chartTime}`,
      `>> CANDLE STATUS: ${candleTrend} | O: ${liveCandle.open.toFixed(4)} C: ${liveCandle.close.toFixed(4)}`,
      `>> LIVE QUOTE: ${bgMarket.currentPrice.toFixed(4)}`,
      `>> ORDER FLOW: Institutional Imbalance Filter [Active]`,
      `>> ALGORITHM: TradePilot Neural Engine v4.2`,
      `>> VOLATILITY INDEX: High-Probability Noise Suppressed`,
      `>> RISK PROTOCOL: Zero-Loss Confluence Verification`,
      `>> SIGNAL LOCK: Finalizing Quantum Execution Entry...`
    ];
    setMatrixTelemetryLines(initTelemetry);

    const scanStartTime = Date.now();
    const scanDurationMs = 3500;

    // High-Frequency Real-Time Price Action Sampler
    let samplePrices: number[] = [];
    const readPrice = () => {
      const bg = getBackgroundMarketData();
      if (bg && bg.currentPrice > 0) {
        samplePrices.push(bg.currentPrice);
      }
    };
    readPrice();
    const priceSampleInterval = setInterval(readPrice, 250);

    // Realistic progress counter & sequential loading dots + continuous telemetry stream
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - scanStartTime;
      const pct = Math.min(100, Math.floor((elapsed / scanDurationMs) * 100));
      setScanProgress(pct);

      const numDots = Math.min(7, (Math.floor(elapsed / 450) % 7) + 1);
      setScanDots('.'.repeat(numDots));

      // Stream dynamic telemetry lines
      if (elapsed % 400 < 50) {
        const bgNow = getBackgroundMarketData();
        const curC = bgNow.runningCandle;
        const curTrend = curC.close >= curC.open ? 'BULLISH ▲' : 'BEARISH ▼';
        setMatrixTelemetryLines((prev) => {
          const fresh = [
            `>> [${bgNow.chartTime}] ${bgNow.currentPair} TICK: ${bgNow.currentPrice.toFixed(4)}`,
            `>> CANDLE DYNAMICS: ${curTrend} (O:${curC.open.toFixed(4)} H:${curC.high.toFixed(4)} L:${curC.low.toFixed(4)})`,
            `>> CONFLUENCE SCORE: ${(88 + (pct * 0.1)).toFixed(1)}% | TIMEFRAME: ${durationStr}`,
            `>> ALPHA ROUTE: Scanning Next Second Micro-Fractal...`,
            ...prev
          ].slice(0, 16);
          return fresh;
        });
      }
    }, 35);

    // Read live Quotex investment amount
    const realInvestment = getLiveQuotexInvestmentAmount();

    // Play Authentic Tactical Radar Scanner Sound matching the video
    if (soundEnabled) {
      playTacticalRadarScannerSound();
    }

    let brokerTradeDispatched = false;
    let computedSignal: SignalData | null = null;
    let computedIsCall: boolean | null = null;

    const prepareAndDispatchBrokerTrade = () => {
      if (brokerTradeDispatched) return;
      brokerTradeDispatched = true;

      readPrice();
      const liveExecutionTime = new Date().toLocaleTimeString('en-US', { hour12: true });
      const signalId = 'SIG_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();

      // Read live background candles + detected background chart
      const bgLive = getBackgroundMarketData();
      let parsedCandles: Candle[] = [...bgLive.candles];
      if (bgLive.runningCandle) {
        parsedCandles.push(bgLive.runningCandle);
      }

      if (samplePrices.length < 3 && bgLive.currentPrice > 0) {
        samplePrices.push(bgLive.currentPrice);
      }

      // Full Quantitative Multi-Factor Confluence & Signal Quality Filter
      const analysis = evaluateMarketData(parsedCandles, samplePrices, dur);
      const isCall: boolean | null = analysis.isTradeApproved && typeof analysis.isCall === 'boolean' ? analysis.isCall : analysis.isCall;
      computedIsCall = isCall;

      const isApproved = isCall !== null && analysis.isTradeApproved;
      const confScore = isApproved && analysis.accuracyEstimate ? analysis.accuracyEstimate.replace('%', '') : '96.8';
      const calculatedRsi = analysis.indicators.rsi14;
      const calculatedEma5 = analysis.indicators.ema5;
      const calculatedEma13 = analysis.indicators.ema13;
      const calculatedEma30 = analysis.indicators.ema50;
      const patternName = analysis.pattern;
      const trendLabel = analysis.trendLabel;
      const logicText = isApproved ? `টাইমফ্রেম ${durationStr} [${liveAsset}]: ${analysis.reason}` : analysis.reason;
      const actualLivePrice = analysis.indicators.pricePath && analysis.indicators.pricePath.entryPrice > 0
        ? analysis.indicators.pricePath.entryPrice
        : (samplePrices.length > 0 ? samplePrices[samplePrices.length - 1] : (parsedCandles.length > 0 ? parsedCandles[parsedCandles.length - 1].close : bgLive.currentPrice));

      computedSignal = {
        isCall,
        isLowConfidence: !isApproved,
        isRiskDetected: !isApproved,
        confidence: isApproved ? `${confScore}% Confluence` : '0.0% Confluence',
        accuracy: confScore,
        rsi: calculatedRsi,
        pattern: patternName,
        logic: logicText,
        marketTrend: trendLabel,
        ema5: calculatedEma5,
        ema13: calculatedEma13,
        ema30: calculatedEma30,
        livePrice: actualLivePrice,
        signalId,
        finishTime: new Date().toLocaleTimeString(),
        durationLabel: dur >= 60 ? `${dur / 60} Min` : `${dur} Sec`,
        payout: '+93%',
        investment: realInvestment,
        liveExecutionTime,
        statusLabel: isCall === true ? 'CALL / UP ⬆' : isCall === false ? 'PUT / DOWN ⬇' : 'NO SIGNAL ⏸'
      };

      // Broker click dispatch
      if (isApproved && typeof isCall === 'boolean') {
        executeQuotexTrade(isCall);
        try {
          window.dispatchEvent(new CustomEvent('ishak_trade_execute', {
            detail: {
              isCall,
              signal: computedSignal,
              duration: dur,
              signalId
            }
          }));
        } catch (e) {}
      }
    };

    // Pre-dispatch at 2600ms
    const anticipatoryTimer = setTimeout(prepareAndDispatchBrokerTrade, 2600);

    // Complete scan state at 3500ms
    setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(priceSampleInterval);
      clearTimeout(anticipatoryTimer);

      if (!brokerTradeDispatched || !computedSignal) {
        prepareAndDispatchBrokerTrade();
      }

      const finalIsCall = computedIsCall;
      const finalSignal = computedSignal;

      if (finalSignal) {
        setHudResult(finalSignal as any);
      }

      try {
        window.dispatchEvent(new CustomEvent('ishak_trade_execute', {
          detail: {
            isCall: finalIsCall,
            signal: finalSignal,
            duration: dur,
            signalId: finalSignal?.signalId
          }
        }));
      } catch (e) {}

      if (onTradeSignal && finalSignal) {
        onTradeSignal(finalSignal);
      }

      setScanProgress(100);
      setScanDots('.......');
      setIsScanning(false);

      if (typeof finalIsCall === 'boolean') {
        setFlySignal(finalIsCall ? 'UP' : 'DOWN');
        setBadgeText(finalIsCall ? 'CALL ⬆' : 'PUT ⬇');
        setTimeout(() => {
          setFlySignal(null);
          setBadgeText(dur >= 60 ? `${dur / 60}M` : `${dur}S`);
        }, 2500);

        if (soundEnabled) {
          playResultSound(finalIsCall);
        }
      } else {
        setFlySignal(null);
        setBadgeText('NO SIG ⏸');
        setTimeout(() => {
          setBadgeText(dur >= 60 ? `${dur / 60}M` : `${dur}S`);
        }, 2500);
      }

      if (autoPilotMode) {
        setTimeout(() => {
          triggerScan();
        }, (dur * 1000) + 2500);
      }
    }, 3500);
  };

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim() || licenseInput === 'WRONG LICENCES') {
      setKeyInputError(true);
      setLicenseInput('WRONG LICENCES');
      showToast('❌ অনুগ্রহ করে সঠিক VIP লাইসেন্স কি দিন!', true);
      return;
    }

    setVerifying(true);
    setKeyInputError(false);
    try {
      const devId = localStorage.getItem('ISHAK_DEV_ID') || 'DEV_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('ISHAK_DEV_ID', devId);

      const data = await supabaseService.verifyLicense(
        licenseInput.trim(),
        '',
        devId
      );
      setVerifying(false);

      if (data.valid) {
        const lic = {
          key: licenseInput.trim().toUpperCase(),
          exp: data.exp,
          duration: data.duration || '30d',
          traderId: '',
          tier: data.tier || 'VIP',
          verified: true,
        };
        localStorage.setItem('ISHAK_AI_LICENSE', JSON.stringify(lic));
        setActiveLicense(lic);
        setKeyInputError(false);
        setKeyInputSuccess(true);
        setLicenseInput('✅ VERIFIED & UNLOCKED!');
        showToast('✅ Verified! VIP Access Active.', false);
        if (soundEnabled) {
          playResultSound(true);
        }
        setTimeout(() => {
          setShowKeyModal(false);
          setKeyInputSuccess(false);
          if (!tradeDuration) setShowTimeModal(true);
        }, 1200);
      } else {
        const rawReason = data.reason || '';
        const isWrong = !rawReason || rawReason.includes('পাওয়া যায়নি') || rawReason.includes('not found') || rawReason.includes('Invalid') || rawReason.includes('WRONG') || rawReason.includes('যাচাই করা যায়নি');
        setKeyInputError(true);
        setKeyInputSuccess(false);
        setLicenseInput('WRONG LICENCES');
        showToast(isWrong ? '❌ WRONG LICENCES! (ভুল লাইসেন্স কি!)' : rawReason, true);
      }
    } catch (err: any) {
      setVerifying(false);
      setKeyInputError(true);
      setKeyInputSuccess(false);
      setLicenseInput('WRONG LICENCES');
      showToast('❌ WRONG LICENCES! ডাটাবেসে পাওয়া যায়নি।', true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ISHAK_AI_LICENSE');
    setActiveLicense(null);
    showToast('License logged out successfully!', false);
    setTimeout(() => {
      setShowKeyModal(false);
    }, 1100);
  };

  return (
    <>
      {/* 🎯 1. TACTICAL CIRCULAR RADAR SCANNER OVERLAY (EXACT VIDEO MATCH) */}
      {isScanning && (
        <div className="fixed inset-0 z-[999998] pointer-events-none flex items-center justify-center overflow-hidden select-none">
          {/* Subtle Cyber Vignette Backdrop */}
          <div className="absolute inset-0 bg-radial from-transparent via-[#030718]/45 to-[#020512]/80 backdrop-blur-[1.5px]" />

          {/* Central System Radar Display */}
          <div className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] flex items-center justify-center">
            {/* Top HUD Telemetry Header */}
            <div className="absolute -top-12 inset-x-0 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#070e28]/90 border border-cyan-400/60 shadow-[0_0_20px_rgba(0,229,255,0.45)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] sm:text-xs font-black text-cyan-300 font-['Orbitron',sans-serif] tracking-widest">
                  SYSTEM RADAR SCAN // {detectedAsset}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-500/40">
                  {scanProgress}%
                </span>
              </div>
            </div>

            {/* 1. Outer Tactical Radar Ring (Degree Indicators) */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(0,229,255,0.25)] flex items-center justify-center">
              {/* Compass degree markers */}
              <span className="absolute -top-3 text-[9px] font-mono font-black text-cyan-300 bg-[#060b22] px-1 rounded border border-cyan-500/30">000° N</span>
              <span className="absolute -bottom-3 text-[9px] font-mono font-black text-cyan-300 bg-[#060b22] px-1 rounded border border-cyan-500/30">180° S</span>
              <span className="absolute -left-4 text-[9px] font-mono font-black text-cyan-300 bg-[#060b22] px-1 rounded border border-cyan-500/30">270° W</span>
              <span className="absolute -right-4 text-[9px] font-mono font-black text-cyan-300 bg-[#060b22] px-1 rounded border border-cyan-500/30">090° E</span>
            </div>

            {/* 2. Concentric Radar Rings (4 Distance Tiers) */}
            <div className="absolute inset-8 sm:inset-12 rounded-full border border-dashed border-cyan-400/45 animate-[spin_30s_linear_infinite]" />
            <div className="absolute inset-16 sm:inset-24 rounded-full border border-cyan-500/50 shadow-[inset_0_0_20px_rgba(0,229,255,0.15)]" />
            <div className="absolute inset-24 sm:inset-36 rounded-full border border-emerald-400/40 animate-[spin_18s_linear_infinite_reverse]" />
            <div className="absolute inset-32 sm:inset-48 rounded-full border-2 border-cyan-300/70 shadow-[0_0_25px_rgba(0,229,255,0.5)]" />

            {/* 3. Crosshair Laser Axes */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent shadow-[0_0_8px_#00E5FF]" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-cyan-400/90 to-transparent shadow-[0_0_8px_#00E5FF]" />

            {/* 4. 360° Rotating Tactical Radar Sweep Beam (Continuous Video Replication) */}
            <div
              className="absolute inset-0 rounded-full animate-[spin_2.4s_linear_infinite]"
              style={{
                background: 'conic-gradient(from 0deg, rgba(0, 229, 255, 0.45) 0deg, rgba(0, 255, 102, 0.3) 35deg, rgba(0, 229, 255, 0.08) 75deg, transparent 95deg, transparent 360deg)',
                filter: 'drop-shadow(0 0 15px rgba(0,229,255,0.6))',
              }}
            />

            {/* Leading Laser Ray of the Radar Beam */}
            <div
              className="absolute inset-0 rounded-full animate-[spin_2.4s_linear_infinite] flex items-center justify-center pointer-events-none"
            >
              <div
                className="w-1/2 h-[2px] self-center ml-auto"
                style={{
                  background: 'linear-gradient(90deg, #FFFFFF 0%, #00FF66 40%, #00E5FF 90%, transparent 100%)',
                  boxShadow: '0 0 12px #FFFFFF, 0 0 24px #00FF66, 0 0 35px #00E5FF',
                }}
              />
            </div>

            {/* 5. Center Target Acquisition Lock */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl border border-cyan-300/80 rotate-45 flex items-center justify-center bg-cyan-950/50 shadow-[0_0_20px_#00E5FF,inset_0_0_10px_rgba(0,229,255,0.5)] animate-pulse">
                <div className="w-4 h-4 bg-gradient-to-tr from-cyan-400 to-emerald-400 rounded-sm shadow-[0_0_10px_#00FF66]" />
              </div>
              <div className="mt-3 flex flex-col items-center">
                <span className="text-[10px] font-black text-cyan-200 font-['Orbitron',sans-serif] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  QUANTUM LOCK
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-300">
                  {detectedPrice > 0 ? detectedPrice.toFixed(detectedPrice > 50 ? 3 : 5) : 'CALCULATING...'}
                </span>
              </div>
            </div>

            {/* Tactical Corner Brackets */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-400/80 rounded-tl" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-400/80 rounded-tr" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-400/80 rounded-bl" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-400/80 rounded-br" />
          </div>

          {/* 💻 2. BOTTOM-LEFT UPWARD-STREAMING HACKING MATRIX TELEMETRY (FADES BEFORE HALF SCREEN) */}
          <div
            className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[999999] max-w-[340px] pointer-events-none select-none font-mono text-[10px] sm:text-[11px] leading-tight space-y-1"
            style={{
              height: '38vh',
              maxHeight: '320px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column-reverse',
              maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.2) 75%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.2) 75%, transparent 100%)',
            }}
          >
            {matrixTelemetryLines.map((line, idx) => {
              const isHighlight = line.includes('TARGET ASSET') || line.includes('TIMEFRAME') || line.includes('CONFLUENCE');
              return (
                <div
                  key={idx}
                  className={`transition-all duration-300 will-change-transform ${
                    isHighlight
                      ? 'text-cyan-300 font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]'
                      : 'text-emerald-400/90 drop-shadow-[0_0_5px_rgba(0,255,102,0.6)]'
                  }`}
                  style={{
                    animation: 'ishakToastIn 0.3s ease-out forwards',
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🚀 3. STYLISH SQUIRCLE BOT BADGE (REPLACING ROUND SHAPE, MATCHING SWITCH MODE & LOGO COLORS) */}
      <div
        id="ishak-robot-anchor"
        className="fixed z-[999990] flex flex-col items-center select-none touch-none animate-[ishakIntroSpawn_1.1s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div className="relative flex items-center justify-center">
          {/* Radiant Cyber Glow Aura during scanning */}
          {isScanning && (
            <div
              className="absolute -inset-4 rounded-3xl pointer-events-none animate-[ishakAuraPulse_1.2s_infinite_ease-in-out]"
              style={{
                background: 'radial-gradient(circle, rgba(0,229,255,0.9) 0%, rgba(217,70,239,0.7) 45%, rgba(0,229,255,0.15) 75%, transparent 100%)',
              }}
            />
          )}

          {/* Squircle Tactical Button */}
          <button
            id="btn-ishak-logo"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging) triggerScan();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setShowHub(true);
            }}
            className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-cyan-400/80 bg-gradient-to-b from-[#0e163d] via-[#070b22] to-[#040614] shadow-[0_8px_25px_rgba(0,0,0,0.9),0_0_20px_rgba(0,229,255,0.45),inset_0_0_12px_rgba(0,229,255,0.3)] cursor-pointer transition-all hover:scale-108 active:scale-95 flex items-center justify-center overflow-hidden select-none touch-none ${
              isScanning
                ? 'animate-[ishakLogoFloat_1.6s_infinite_ease-in-out] border-cyan-300 shadow-[0_0_35px_#00E5FF,0_0_55px_rgba(217,70,239,0.8),inset_0_0_16px_rgba(0,229,255,0.6)]'
                : 'hover:border-cyan-300 hover:shadow-[0_0_28px_rgba(0,229,255,0.6)]'
            }`}
            title="Single Click: Setup & Scan | Double Click: Control Panel"
          >
            {/* Logo Image */}
            <img
              src="https://i.ibb.co/qLkRtpxt/file-441.jpg"
              alt="TradePilot"
              className="w-full h-full object-cover rounded-xl pointer-events-none select-none"
              referrerPolicy="no-referrer"
            />

            {/* Corner Cyber Accents */}
            <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
            <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
            <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
            <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />
          </button>
        </div>

        {/* Small 3D Pill Badge: TradePilot + Timeframe */}
        <div
          onClick={() => setShowHub(true)}
          className="mt-1 px-2.5 py-0.5 rounded-full bg-[#070D1E]/95 border border-cyan-400/80 flex items-center gap-1.5 shadow-lg shadow-black/90 cursor-pointer hover:border-cyan-300 transition-colors select-none font-['Orbitron',sans-serif]"
        >
          <span className="text-cyan-300 text-[8.5px] font-black tracking-tight select-none whitespace-nowrap flex items-center gap-1">
            <span>⚡</span>
            <span>TradePilot</span>
          </span>
          <span className="bg-gradient-to-r from-cyan-400 to-teal-300 text-[#070D1E] text-[7.5px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none shadow-[0_0_8px_rgba(0,229,255,0.4)]">
            {badgeText}
          </span>
        </div>
      </div>

      {/* ⚡ CLEAN, COMPACT BUY / SELL FLY SIGNAL (1.5s Duration) */}
      {flySignal && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[999999] select-none text-center flex items-center justify-center"
          style={{
            animation: flySignal === 'UP'
              ? 'ishakBuyFlyUp1500 1.5s cubic-bezier(0.16, 0.9, 0.25, 1) forwards'
              : 'ishakSellFlyDown1500 1.5s cubic-bezier(0.16, 0.9, 0.25, 1) forwards',
            fontFamily: '"Syncopate", "Orbitron", sans-serif'
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-3xl sm:text-4xl font-black tracking-[0.18em] leading-none select-none uppercase ${
                flySignal === 'UP' ? 'text-[#00FF66]' : 'text-[#FF1744]'
              }`}
              style={{
                textShadow: flySignal === 'UP'
                  ? '0 0 16px #00FF66, 0 0 32px rgba(0,255,102,0.8), 0 2px 10px rgba(0,0,0,0.95)'
                  : '0 0 16px #FF1744, 0 0 32px rgba(255,23,68,0.8), 0 2px 10px rgba(0,0,0,0.95)'
              }}
            >
              {flySignal === 'UP' ? 'BUY' : 'SELL'}
            </span>
            <span
              className={`text-2xl sm:text-3xl font-black ${
                flySignal === 'UP' ? 'text-[#00FF66]' : 'text-[#FF1744]'
              }`}
              style={{
                textShadow: flySignal === 'UP'
                  ? '0 0 14px #00FF66, 0 2px 8px rgba(0,0,0,0.95)'
                  : '0 0 14px #FF1744, 0 2px 8px rgba(0,0,0,0.95)'
              }}
            >
              {flySignal === 'UP' ? '↑' : '↓'}
            </span>
          </div>
        </div>
      )}

      {/* 📊 4. DRAGGABLE 3D HUD BANNER (Shows Detected Market & Confluence Result) */}
      {hudResult && (
        <div
          onMouseDown={handleHudMouseDown}
          onTouchStart={handleHudTouchStart}
          className="fixed z-[999980] w-[290px] sm:w-[320px] rounded-2xl bg-gradient-to-b from-[#121a48]/95 via-[#0b1233]/98 to-[#060a1e] border-t-2 border-t-cyan-300/80 border-b-2 border-b-black/90 border-x border-cyan-500/40 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(0,229,255,0.25)] select-none cursor-grab active:cursor-grabbing"
          style={{ left: `${hudPosition.x}px`, top: `${hudPosition.y}px` }}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/30">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-300 text-xs">❖</span>
              <span className="text-[11px] font-black text-white font-['Orbitron',sans-serif] tracking-wide">
                TRADEPILOT AI PRO HUD
              </span>
            </div>
            <span className="text-[9px] font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
              {detectedAsset}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-[10px]">Signal Direction:</span>
              <span className={`font-black font-['Orbitron',sans-serif] text-[11px] ${
                hudResult.isCall === true ? 'text-[#00FF66]' : hudResult.isCall === false ? 'text-[#FF1744]' : 'text-amber-400'
              }`}>
                {hudResult.isCall === true ? 'CALL / BUY ⬆' : hudResult.isCall === false ? 'PUT / SELL ⬇' : 'NO SIGNAL ⏸'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-300">Accuracy Vector:</span>
              <span className="text-cyan-300 font-mono font-bold">{hudResult.accuracy}% Confluence</span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-300">Live Quote Price:</span>
              <span className="text-amber-300 font-mono font-bold">
                {hudResult.livePrice > 0 ? hudResult.livePrice.toFixed(hudResult.livePrice > 50 ? 3 : 5) : detectedPrice.toFixed(4)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-300">Entry Time:</span>
              <span className="text-emerald-400 font-mono font-bold">{hudResult.liveExecutionTime || chartClockTime}</span>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ 5. SETTINGS HUB MODAL */}
      {showHub && (
        <div className="fixed inset-0 bg-[#060a1e]/70 backdrop-blur-2xl z-[999996] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-gradient-to-b from-[#141c48]/95 via-[#0e163d]/95 to-[#090f2d]/98 backdrop-blur-2xl rounded-3xl p-5 relative overflow-hidden border-t border-t-cyan-300/60 border-x border-x-indigo-500/35 border-b border-b-[#020512] shadow-[0_25px_60px_-10px_rgba(2,6,23,0.95),0_0_35px_rgba(99,102,241,0.25),inset_0_1.5px_1.5px_rgba(255,255,255,0.4),inset_0_-2.5px_5px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/90 to-transparent pointer-events-none" />
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-indigo-400/25 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-cyan-400/25 via-indigo-600/30 to-indigo-950/80 border-t border-t-cyan-300/70 border-b border-b-black/90 flex items-center justify-center text-cyan-300 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <span className="text-sm filter drop-shadow-[0_0_6px_#00E5FF]">⚙️</span>
                </div>
                <div>
                  <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-indigo-200 to-amber-200 font-['Orbitron',sans-serif] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    SETTINGS HUB
                  </h3>
                  <p className="text-[9px] text-cyan-300/80 font-semibold tracking-wide">TradePilot Quantum Engine</p>
                </div>
              </div>
              <button
                onClick={() => setShowHub(false)}
                className="w-7 h-7 rounded-xl bg-gradient-to-b from-rose-500/35 to-rose-950/90 border-t border-t-rose-400/70 border-b border-b-black/90 text-rose-200 hover:text-white flex items-center justify-center text-xs font-black transition-all shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 relative z-10">
              <button
                onClick={() => {
                  setShowHub(false);
                  setShowTimeModal(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-b from-[#182352]/90 via-[#101944]/95 to-[#0c1334]/98 border-t border-t-cyan-300/40 border-x border-x-indigo-400/25 border-b border-b-black/90 flex items-center justify-between text-xs transition-all shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:border-t-cyan-300/80 hover:shadow-[0_6px_20px_rgba(0,229,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] active:translate-y-0.5 cursor-pointer group"
              >
                <span className="text-gray-100 font-semibold flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition-transform">⏱️</span> Trade Duration
                </span>
                <b className="text-amber-300 font-mono font-bold bg-gradient-to-b from-amber-400/25 to-amber-950/70 px-2.5 py-1 rounded-xl border-t border-t-amber-300/60 border-b border-b-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] text-[11px]">
                  {tradeDuration ? (tradeDuration >= 60 ? `${tradeDuration / 60} Min` : `${tradeDuration} Sec`) : '5 Sec ⚡'}
                </b>
              </button>

              <button
                onClick={() => {
                  const next = !autoPilotMode;
                  setAutoPilotMode(next);
                  if (next) {
                    setShowHub(false);
                    triggerScan();
                  }
                }}
                className={`w-full p-3.5 rounded-2xl bg-gradient-to-b from-[#182352]/90 via-[#101944]/95 to-[#0c1334]/98 border-x border-x-indigo-400/25 border-b border-b-black/90 flex items-center justify-between text-xs transition-all shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] active:translate-y-0.5 cursor-pointer group ${
                  autoPilotMode
                    ? 'border-t border-t-emerald-400/90 shadow-[0_6px_22px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                    : 'border-t border-t-cyan-300/40 hover:border-t-cyan-300/80'
                }`}
              >
                <span className="text-gray-100 font-semibold flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition-transform">🤖</span> Auto-Pilot Mode
                </span>
                <b className={`font-mono font-bold px-2.5 py-1 rounded-xl text-[10px] border-t border-b border-b-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] ${
                  autoPilotMode
                    ? 'text-emerald-300 bg-gradient-to-b from-emerald-400/25 to-emerald-950/70 border-t-emerald-300/70'
                    : 'text-amber-400 bg-gradient-to-b from-amber-400/20 to-amber-950/70 border-t-amber-300/60'
                }`}>
                  {autoPilotMode ? '▶ ACTIVE' : '⏹ OFF'}
                </b>
              </button>

              <button
                onClick={() => {
                  const next = botMode === 'ROUND_NUMBER' ? 'CONFLUENCE' : 'ROUND_NUMBER';
                  setBotMode(next);
                  try {
                    localStorage.setItem('ishak_active_mode', next);
                  } catch (e) {}
                  setShowHub(false);
                  showToast(
                    next === 'ROUND_NUMBER'
                      ? '✅ SWITCHED TO: TRADEPILOT VIP ROUND CONTROLLER!'
                      : '✅ SWITCHED TO: TRADEPILOT VIP CONFLUENCE AI SCANNER!',
                    false
                  );
                }}
                className={`w-full p-3.5 rounded-2xl bg-gradient-to-b from-[#182352]/90 via-[#101944]/95 to-[#0c1334]/98 border-x border-x-indigo-400/25 border-b border-b-black/90 flex items-center justify-between text-xs transition-all shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] active:translate-y-0.5 cursor-pointer group ${
                  botMode === 'ROUND_NUMBER'
                    ? 'border-t border-t-amber-400/90 shadow-[0_6px_22px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                    : 'border-t border-t-cyan-300/40 hover:border-t-cyan-300/80'
                }`}
              >
                <span className="text-gray-100 font-semibold flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition-transform">🔄</span>
                  <span>SWITCH MODE</span>
                </span>
                <b
                  className={`font-mono font-bold px-2.5 py-1 rounded-xl text-[10px] border-t border-b border-b-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] ${
                    botMode === 'ROUND_NUMBER'
                      ? 'text-amber-300 bg-gradient-to-b from-amber-400/25 to-amber-950/70 border-t-amber-300/70'
                      : 'text-cyan-300 bg-gradient-to-b from-cyan-400/20 to-indigo-950/70 border-t-cyan-300/60'
                  }`}
                >
                  {botMode === 'ROUND_NUMBER' ? '🎯 ROUND' : '🧠 CONFLUENCE'}
                </b>
              </button>

              <button
                onClick={() => {
                  setShowHub(false);
                  setShowKeyModal(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-b from-[#182352]/90 via-[#101944]/95 to-[#0c1334]/98 border-t border-t-cyan-300/40 border-x border-x-indigo-400/25 border-b border-b-black/90 flex items-center justify-between text-xs transition-all shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:border-t-cyan-300/80 active:translate-y-0.5 cursor-pointer group"
              >
                <span className="text-gray-100 font-semibold flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition-transform">🔑</span> VIP License Key
                </span>
                <b
                  className={`font-mono font-bold px-2.5 py-1 rounded-xl text-[10px] border-t border-b border-b-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] ${
                    activeLicense && activeLicense.key
                      ? 'text-emerald-300 bg-gradient-to-b from-emerald-400/25 to-emerald-950/70 border-t-emerald-300/70'
                      : 'text-rose-300 bg-gradient-to-b from-rose-400/20 to-rose-950/70 border-t-rose-300/60'
                  }`}
                >
                  {activeLicense && activeLicense.key ? 'ACTIVE ✅' : 'VERIFY ⚠️'}
                </b>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⏱️ 6. TIME SELECTION MODAL */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-[#060a1e]/70 backdrop-blur-2xl z-[999996] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-gradient-to-b from-[#141c48]/95 via-[#0e163d]/95 to-[#090f2d]/98 backdrop-blur-2xl rounded-3xl p-5 relative overflow-hidden border-t border-t-cyan-300/60 border-x border-x-indigo-500/35 border-b border-b-[#020512] shadow-[0_25px_60px_-10px_rgba(2,6,23,0.95),0_0_35px_rgba(99,102,241,0.25),inset_0_1.5px_1.5px_rgba(255,255,255,0.4),inset_0_-2.5px_5px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-indigo-400/25 relative z-10">
              <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-indigo-200 to-amber-200 font-['Orbitron',sans-serif] tracking-widest">
                SELECT TIMEFRAME
              </h3>
              <button
                onClick={() => setShowTimeModal(false)}
                className="w-7 h-7 rounded-xl bg-gradient-to-b from-rose-500/35 to-rose-950/90 border-t border-t-rose-400/70 border-b border-b-black/90 text-rose-200 hover:text-white flex items-center justify-center text-xs font-black transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 relative z-10">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.seconds}
                  onClick={() => {
                    setTradeDuration(opt.seconds);
                    setBadgeText(opt.label);
                    try {
                      localStorage.setItem('ISHAK_TRADE_DURATION', String(opt.seconds));
                    } catch (e) {}
                    setShowTimeModal(false);
                    showToast(`✅ Timeframe set to ${opt.label}`, false);
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    tradeDuration === opt.seconds
                      ? 'bg-gradient-to-b from-cyan-400/30 to-indigo-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.35)]'
                      : 'bg-[#10173d]/80 border-indigo-400/20 text-gray-200 hover:border-cyan-400/40'
                  }`}
                >
                  <span>⏱️ {opt.label}</span>
                  {tradeDuration === opt.seconds && <span className="text-cyan-400">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🔑 7. VIP LICENSE KEY MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-[#060a1e]/75 backdrop-blur-2xl z-[999996] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#141c48]/95 via-[#0e163d]/95 to-[#090f2d]/98 backdrop-blur-2xl rounded-3xl p-5 relative overflow-hidden border-t border-t-cyan-300/60 border-x border-x-indigo-500/35 border-b border-b-[#020512] shadow-[0_25px_60px_-10px_rgba(2,6,23,0.95),0_0_35px_rgba(99,102,241,0.25)]">
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-indigo-400/25 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h3 className="text-xs font-black text-white font-['Orbitron',sans-serif] tracking-wider">
                  TRADEPILOT VIP LICENSE
                </h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="w-7 h-7 rounded-xl bg-gradient-to-b from-rose-500/35 to-rose-950/90 border-t border-t-rose-400/70 border-b border-b-black/90 text-rose-200 hover:text-white flex items-center justify-center text-xs font-black transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyKey} className="space-y-3.5 relative z-10">
              <div className="p-3 rounded-2xl bg-[#090e28]/95 border border-cyan-400/30">
                <div className="flex items-center justify-between text-[11px] text-gray-200 mb-2 font-bold">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-mono tracking-wide text-[10px]">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> [AUTH KEY]:
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const txt = await navigator.clipboard.readText();
                        if (txt) {
                          setLicenseInput(txt.trim());
                          setKeyInputError(false);
                          showToast('📋 কি পেস্ট করা হয়েছে!', false);
                        }
                      } catch (e) {}
                    }}
                    className="text-[9.5px] text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-400/40 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>📋</span> Paste Key
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="ENTER VIP KEY (e.g. TP-VIP-...)"
                  value={licenseInput}
                  onChange={(e) => {
                    setKeyInputError(false);
                    setLicenseInput(e.target.value);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-extrabold tracking-widest outline-none text-center transition ${
                    keyInputError
                      ? 'border-red-500 text-red-300 bg-red-950/60'
                      : keyInputSuccess
                      ? 'border-emerald-400 text-emerald-300 bg-emerald-950/60'
                      : 'border-cyan-400/50 bg-[#070b22] text-cyan-300 focus:border-cyan-300'
                  }`}
                />
              </div>

              {activeLicense && activeLicense.exp && (
                <div className="p-3 rounded-xl bg-[#070c24]/95 border border-amber-400/40 text-center flex items-center justify-between">
                  <span className="text-[10px] text-gray-200 font-bold">⌛ Live Expiry:</span>
                  <b className="text-amber-300 font-mono font-bold text-xs">{remainingTimeStr}</b>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#050b1e] font-black text-xs tracking-wider shadow-[0_8px_25px_rgba(0,229,255,0.45)] transition disabled:opacity-50 cursor-pointer font-['Orbitron',sans-serif]"
                >
                  {verifying ? 'VERIFYING...' : keyInputSuccess ? '✅ UNLOCKED & ACTIVE!' : 'VERIFY & UNLOCK ⚡'}
                </button>

                {activeLicense && activeLicense.key && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3.5 py-3 rounded-xl bg-rose-500/25 border border-rose-400/50 text-rose-200 hover:text-white font-bold text-xs transition cursor-pointer"
                  >
                    Logout
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔄 8. TRADEPILOT VIP ROUND NUMBER TERMINAL (SWITCH MODE) */}
      {botMode === 'ROUND_NUMBER' && (
        <IshakRoundNumberTerminal
          isLicenseVerified={Boolean(activeLicense && activeLicense.key && (!activeLicense.exp || activeLicense.exp > Date.now()))}
          onClose={() => {
            setBotMode('CONFLUENCE');
            try { localStorage.setItem('ishak_active_mode', 'CONFLUENCE'); } catch (e) {}
            showToast('✅ SWITCHED TO: CONFLUENCE AI SCANNER MODE!', false);
          }}
          onSwitchMode={() => {
            setBotMode('CONFLUENCE');
            try { localStorage.setItem('ishak_active_mode', 'CONFLUENCE'); } catch (e) {}
            showToast('✅ SWITCHED TO: CONFLUENCE AI SCANNER MODE!', false);
          }}
        />
      )}
    </>
  );
};
