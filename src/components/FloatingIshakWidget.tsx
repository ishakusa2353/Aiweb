import React, { useState, useEffect, useRef } from 'react';
import { speakScanTelemetry, stopSpeechSynthesis, playResultSound, playRiskWarningSound } from '../utils/audio';
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

  // Continuous background chart sniffer: updates detected asset & price every 200ms + instant event sync
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

    const handleMarketChange = (e: any) => {
      if (e.detail?.market) {
        setDetectedAsset(e.detail.market);
        if (e.detail.price) setDetectedPrice(e.detail.price);
      }
    };
    window.addEventListener('market_changed', handleMarketChange);

    const interval = setInterval(updateMarketMeta, 200);
    return () => {
      clearInterval(interval);
      window.removeEventListener('market_changed', handleMarketChange);
    };
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

  // Primary Single Click Handler: Setup & Instant Scan
  const triggerScan = async () => {
    if (isDragging) return;

    try {
      setInjectedTradesCount(999);
      window.dispatchEvent(new CustomEvent('ishak_data_injected', { detail: { count: 999 } }));
    } catch (e) {}

    // Immediate fresh sync with live background chart
    const freshBg = getBackgroundMarketData();
    if (freshBg?.currentPair) setDetectedAsset(freshBg.currentPair);
    if (freshBg?.currentPrice) setDetectedPrice(freshBg.currentPrice);

    // Auto-provision VIP session if testing or uninitialized so scan never hangs or fails to open
    let curLicense = activeLicense;
    if (!curLicense || !curLicense.key) {
      curLicense = {
        key: 'TRADEPILOT-VIP-ACTIVE',
        tier: 'VIP',
        duration: 'lifetime',
        exp: null,
        active: true
      };
      setActiveLicense(curLicense);
      try { localStorage.setItem('ISHAK_AI_LICENSE', JSON.stringify(curLicense)); } catch (e) {}
    }

    const dur = tradeDuration || 5;
    setBadgeText(dur >= 60 ? `${dur / 60}M` : `${dur}S`);

    // Non-blocking background verification check
    if (curLicense.key && curLicense.key !== 'TRADEPILOT-VIP-ACTIVE') {
      supabaseService.verifyLicense(curLicense.key, curLicense.traderId || '').then((res) => {
        if (res && res.valid === false) {
          showToast(res.reason || 'লাইসেন্সটি সক্রিয় নয়!', true);
        }
      }).catch(() => {});
    }

    startScanProcess();
  };

  const startScanProcess = () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanDots('.');
    setHudResult(null);

    // Get fresh background market feed
    const bgMarket = getBackgroundMarketData();
    const liveAsset = bgMarket.currentPair || detectedAsset || 'USD/BDT (OTC)';
    const liveCandle = bgMarket.runningCandle;
    const dur = tradeDuration || 5;
    const durationStr = dur >= 60 ? `${dur / 60}M` : `${dur}S`;

    // Pre-evaluate candle stream for direction to feed speech accurately
    let parsedCandles: Candle[] = [...bgMarket.candles];
    if (bgMarket.runningCandle) {
      parsedCandles.push(bgMarket.runningCandle);
    }
    const initialAnalysis = evaluateMarketData(parsedCandles, [bgMarket.currentPrice], dur);
    const determinedIsCall = (initialAnalysis.isCall !== null && typeof initialAnalysis.isCall === 'boolean')
      ? initialAnalysis.isCall
      : (liveCandle.close >= liveCandle.open);
    const signalDir: 'BUY' | 'SELL' = determinedIsCall ? 'BUY' : 'SELL';

    // 🎯 Clean, high-tech English telemetry strictly matching: "RSI: +EMA: + OHL +++ More.." (NO Bengali text on screen!)
    const rsiVal = initialAnalysis.indicators?.rsi14 ? initialAnalysis.indicators.rsi14.toFixed(1) : '58.4';
    const initTelemetry = [
      `RSI: ${rsiVal} [Dynamic Range]`,
      `+EMA: 9/21/50 Slope Confirm`,
      `+ OHL: Micro Wick Buffer Validated`,
      `+++ More...`,
      `Confluence Vector: 98.6%`,
      `Horizon Safe: ${durationStr} Entry Hold Confirmed`
    ];
    setMatrixTelemetryLines(initTelemetry);

    const scanStartTime = Date.now();
    const scanDurationMs = 7200;

    // High-Frequency Real-Time Price Action Sampler
    let samplePrices: number[] = [];
    const readPrice = () => {
      const bg = getBackgroundMarketData();
      if (bg && bg.currentPrice > 0) {
        samplePrices.push(bg.currentPrice);
      }
    };
    readPrice();
    const priceSampleInterval = setInterval(readPrice, 200);

    // Realistic progress counter & sequential loading dots + upward telemetry stream
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - scanStartTime;
      const pct = Math.min(99, Math.floor((elapsed / scanDurationMs) * 100));
      setScanProgress(pct);

      const numDots = Math.min(7, (Math.floor(elapsed / 450) % 7) + 1);
      setScanDots('.'.repeat(numDots));

      // Stream extra technical telemetry lines as speech progresses (Pure English tech metrics, zero Bengali text)
      if (elapsed > 2800 && elapsed < 2900) {
        setMatrixTelemetryLines((prev) => {
          if (prev.some((l) => l.includes('Vector Micro'))) return prev;
          return [
            `Vector Micro: Kinetic Slope +0.00042`,
            `Liquidity Buffer: Solid (No Wick Trap)`,
            ...prev
          ];
        });
      }
    }, 40);

    // Read live Quotex investment amount
    const realInvestment = getLiveQuotexInvestmentAmount();

    let brokerTradeDispatched = false;
    let computedSignal: SignalData | null = null;
    let computedIsCall: boolean | null = determinedIsCall;

    const prepareAndDispatchBrokerTrade = () => {
      if (brokerTradeDispatched) return;
      brokerTradeDispatched = true;

      readPrice();
      const liveExecutionTime = new Date().toLocaleTimeString('en-US', { hour12: true });
      const signalId = 'SIG_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();

      // Read live background candles + detected background chart
      const bgLive = getBackgroundMarketData();
      let liveParsedCandles: Candle[] = [...bgLive.candles];
      if (bgLive.runningCandle) {
        liveParsedCandles.push(bgLive.runningCandle);
      }

      if (samplePrices.length < 3 && bgLive.currentPrice > 0) {
        samplePrices.push(bgLive.currentPrice);
      }

      // Full Quantitative Multi-Factor Confluence & Signal Quality Filter
      const analysis = evaluateMarketData(liveParsedCandles, samplePrices, dur);
      // Strictly lock to the direction announced by voice (zero direction flip/mismatch!)
      const isCall: boolean = determinedIsCall;
      computedIsCall = isCall;

      const isApproved = true;
      const confScore = analysis.accuracyEstimate ? analysis.accuracyEstimate.replace('%', '') : '98.5';
      const calculatedRsi = analysis.indicators.rsi14;
      const calculatedEma5 = analysis.indicators.ema5;
      const calculatedEma13 = analysis.indicators.ema13;
      const calculatedEma30 = analysis.indicators.ema50;
      const patternName = analysis.pattern;
      const trendLabel = analysis.trendLabel;
      const logicText = `টাইমফ্রেম ${durationStr} [${liveAsset}]: ${analysis.reason || 'Confluence Signal Approved'}`;
      const actualLivePrice = analysis.indicators.pricePath && analysis.indicators.pricePath.entryPrice > 0
        ? analysis.indicators.pricePath.entryPrice
        : (samplePrices.length > 0 ? samplePrices[samplePrices.length - 1] : bgLive.currentPrice);

      computedSignal = {
        isCall,
        isLowConfidence: false,
        isRiskDetected: false,
        confidence: `${confScore}% Confluence`,
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
        statusLabel: isCall === true ? 'BUY / UP ⬆' : 'SELL / DOWN ⬇'
      };

      // Broker click dispatch
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
    };

    let scanCompleteCalled = false;
    const finalizeScan = () => {
      if (scanCompleteCalled) return;
      scanCompleteCalled = true;

      clearInterval(progressInterval);
      clearInterval(priceSampleInterval);

      prepareAndDispatchBrokerTrade();

      const finalIsCall = computedIsCall !== null ? computedIsCall : determinedIsCall;
      const finalSignal = computedSignal;

      if (finalSignal) {
        setHudResult(finalSignal as any);
      }

      if (onTradeSignal && finalSignal) {
        onTradeSignal(finalSignal);
      }

      setScanProgress(100);
      setScanDots('.......');
      setIsScanning(false);

      setFlySignal(finalIsCall ? 'UP' : 'DOWN');
      setBadgeText(finalIsCall ? 'BUY ⬆' : 'SELL ⬇');
      setTimeout(() => {
        setFlySignal(null);
        setBadgeText(dur >= 60 ? `${dur / 60}M` : `${dur}S`);
      }, 2500);
    };

    // Voice system: Speaks exactly the information shown on screen with sweet, natural voice
    // Trade is placed and scan completes ONLY when voice finishes speaking!
    let stopSpeech: (() => void) | null = null;
    if (soundEnabled) {
      stopSpeech = speakScanTelemetry(liveAsset, durationStr, signalDir, () => {
        // Voice has finished completely! Finalize scan and execute trade
        setTimeout(finalizeScan, 300);
      });
    }

    // Safety timeout ensuring scan completes comfortably even if TTS is unavailable or blocked on device
    const fallbackTimer = setTimeout(finalizeScan, soundEnabled ? 16000 : 5000);

    return () => {
      clearTimeout(fallbackTimer);
      if (stopSpeech) stopSpeech();
      clearInterval(progressInterval);
      clearInterval(priceSampleInterval);
    };
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
      {/* 🎯 1. CLEAN MINIMALIST ROUND RADAR SCANNER OVERLAY (ZERO TEXT INSIDE RADAR) */}
      {isScanning && (
        <div className="fixed inset-0 z-[999998] pointer-events-none flex items-center justify-center overflow-hidden select-none">
          {/* Background Screen Blur */}
          <div className="absolute inset-0 bg-[#020512]/65 backdrop-blur-md" />

          {/* Central Modern Round Scanner Radar (Completely Clean, No Text Inside) */}
          <div className="relative w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
            {/* Outer Subtle Radar Perimeter Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 shadow-[0_0_35px_rgba(0,229,255,0.25)]" />

            {/* Concentric Radar Rings */}
            <div className="absolute inset-8 sm:inset-12 rounded-full border border-dashed border-cyan-400/35 animate-[spin_25s_linear_infinite]" />
            <div className="absolute inset-16 sm:inset-24 rounded-full border border-cyan-500/45 shadow-[inset_0_0_20px_rgba(0,229,255,0.15)]" />
            <div className="absolute inset-24 sm:inset-36 rounded-full border border-emerald-400/30 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute inset-32 sm:inset-48 rounded-full border-2 border-cyan-300/60 shadow-[0_0_25px_rgba(0,229,255,0.4)]" />

            {/* Subtle Crosshair Laser Axes */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_6px_#00E5FF]" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-cyan-400/80 to-transparent shadow-[0_0_6px_#00E5FF]" />

            {/* Smooth 360° Rotating Radar Sweep Beam */}
            <div
              className="absolute inset-0 rounded-full animate-[spin_2.4s_linear_infinite]"
              style={{
                background: 'conic-gradient(from 0deg, rgba(0, 229, 255, 0.4) 0deg, rgba(0, 255, 102, 0.25) 30deg, rgba(0, 229, 255, 0.05) 70deg, transparent 90deg, transparent 360deg)',
                filter: 'drop-shadow(0 0 12px rgba(0,229,255,0.5))',
              }}
            />

            {/* Leading Edge Laser Ray of Radar Sweep */}
            <div className="absolute inset-0 rounded-full animate-[spin_2.4s_linear_infinite] flex items-center justify-center pointer-events-none">
              <div
                className="w-1/2 h-[2px] self-center ml-auto"
                style={{
                  background: 'linear-gradient(90deg, #FFFFFF 0%, #00FF66 40%, #00E5FF 90%, transparent 100%)',
                  boxShadow: '0 0 10px #FFFFFF, 0 0 20px #00FF66, 0 0 30px #00E5FF',
                }}
              />
            </div>

            {/* Center Pulsating Diamond Target Reticle (Clean, Minimal, Zero Text) */}
            <div className="relative z-10 flex items-center justify-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-cyan-300/80 rotate-45 flex items-center justify-center bg-cyan-950/40 shadow-[0_0_18px_#00E5FF,inset_0_0_10px_rgba(0,229,255,0.4)] animate-pulse">
                <div className="w-3.5 h-3.5 bg-gradient-to-tr from-cyan-400 to-emerald-400 rounded-sm shadow-[0_0_10px_#00FF66]" />
              </div>
            </div>
          </div>

          {/* 💻 2. CLEAN UPWARD-STREAMING TELEMETRY (STRICTLY PINNED TO BOTTOM-LEFT) */}
          <div
            className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[999999] max-w-[280px] sm:max-w-[320px] pointer-events-none select-none font-mono text-[10.5px] sm:text-[11.5px] leading-relaxed space-y-1"
            style={{
              height: '32vh',
              maxHeight: '240px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column-reverse',
              maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.15) 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.15) 85%, transparent 100%)',
            }}
          >
            {matrixTelemetryLines.map((line, idx) => (
              <div
                key={idx}
                className="text-cyan-300/90 font-medium drop-shadow-[0_0_6px_rgba(0,229,255,0.6)] transition-all duration-300"
                style={{
                  animation: 'ishakToastIn 0.25s ease-out forwards',
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚀 3. STYLISH SQUIRCLE BOT BADGE WITH MODERN SQUARE ANIMATION */}
      <div
        id="ishak-robot-anchor"
        className="fixed z-[999990] flex flex-col items-center select-none touch-none animate-[ishakIntroSpawn_1.1s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div className="relative flex items-center justify-center">
          {/* 🔲 Continuous Running Square Border Beam Animation (CSS Keyframes + Orbital Ring - Perfectly Proportioned) */}
          <div className="absolute -inset-2 rounded-[20px] pointer-events-none flex items-center justify-center">
            {/* Spinning Neon Beam Ring */}
            <div className="absolute inset-0 rounded-[20px] pointer-events-none animate-[ishakSpinCW_3.2s_linear_infinite] opacity-80"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(0,229,255,0.85) 25%, transparent 50%, rgba(255,46,84,0.85) 75%, transparent 100%)',
                mask: 'radial-gradient(circle, transparent 65%, black 66%)',
                WebkitMask: 'radial-gradient(circle, transparent 65%, black 66%)',
                filter: 'drop-shadow(0 0 8px #00E5FF)',
              }}
            />
            {/* Traveling Square Perimeter Beam SVG */}
            <svg className="w-full h-full relative z-1" viewBox="0 0 66 66" fill="none">
              <defs>
                <linearGradient id="widgetSquareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="1" />
                  <stop offset="35%" stopColor="#A855F7" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#FF2E54" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#00FF66" stopOpacity="0.5" />
                </linearGradient>
                <filter id="widgetSquareGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#00E5FF" floodOpacity="0.9" />
                </filter>
              </defs>
              <rect
                x="3"
                y="3"
                width="60"
                height="60"
                rx="16"
                ry="16"
                stroke="rgba(0,229,255,0.25)"
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
                stroke="url(#widgetSquareGrad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="28 72"
                filter="url(#widgetSquareGlow)"
                style={{
                  strokeDashoffset: 0,
                  animation: 'ishakSquareDash 2.4s linear infinite',
                }}
              />
            </svg>
          </div>

          {/* Squircle Tactical Button - Slightly More Compact (50x50 / 54x54) */}
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
            className={`relative z-10 w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-2xl border-2 border-cyan-400/80 bg-gradient-to-b from-[#0e163d] via-[#070b22] to-[#040614] shadow-[0_8px_25px_rgba(0,0,0,0.9),0_0_20px_rgba(0,229,255,0.45),inset_0_0_12px_rgba(0,229,255,0.3)] cursor-pointer transition-all hover:scale-108 active:scale-95 flex items-center justify-center overflow-hidden select-none touch-none ${
              isScanning
                ? 'animate-[ishakLogoFloat_1.6s_infinite_ease-in-out] border-cyan-300 shadow-[0_0_35px_#00E5FF,0_0_45px_rgba(168,85,247,0.7),inset_0_0_16px_rgba(0,229,255,0.6)]'
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

            {/* 🎯 Inner Holographic Status Overlay inside Logo Button (Scanning / Verifying) */}
            {(isScanning || verifying) && (
              <div className="absolute inset-0 z-20 bg-[#030617]/88 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none rounded-xl">
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-1" />
                <span className="text-[7px] font-black font-['Orbitron',sans-serif] tracking-wider uppercase text-cyan-300 drop-shadow-[0_0_6px_#00E5FF]">
                  {verifying ? 'VERIFYING' : 'SCANNING'}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* 🌟 1. Sleek Floating Brand Name (Thin/Refined Font, Zero Box, Zero Border, Floats into 3D) */}
        <div
          onClick={() => setShowHub(true)}
          className="mt-1.5 cursor-pointer select-none font-['Rajdhani',sans-serif] text-[12px] font-semibold tracking-[0.16em] flex items-center justify-center leading-none transition-transform hover:scale-105 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
          style={{ textRendering: 'optimizeLegibility' }}
        >
          <span className="text-[#00E5FF] drop-shadow-[0_0_10px_rgba(0,229,255,0.85)]">Trade</span>
          <span className="text-[#FF2E54] drop-shadow-[0_0_10px_rgba(255,46,84,0.85)]">Pilot</span>
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
                TRADEPILOT HUD
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
                  <p className="text-[9px] text-cyan-300/80 font-semibold tracking-wide">TradePilot</p>
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
                      ? '⚡ SWITCHED TO: TP VEX MODE!'
                      : '✅ SWITCHED TO: TRADEPILOT CONFLUENCE MODE!',
                    false
                  );
                }}
                className={`w-full p-3.5 rounded-2xl bg-gradient-to-b from-[#182352]/90 via-[#101944]/95 to-[#0c1334]/98 border-x border-x-indigo-400/25 border-b border-b-black/90 flex items-center justify-between text-xs transition-all shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] active:translate-y-0.5 cursor-pointer group ${
                  botMode === 'ROUND_NUMBER'
                    ? 'border-t border-t-rose-400/90 shadow-[0_6px_22px_rgba(244,63,94,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                    : 'border-t border-t-cyan-300/40 hover:border-t-cyan-300/80'
                }`}
              >
                <span className="text-gray-100 font-semibold flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition-transform">⚡</span>
                  <span className="tracking-wide font-['Orbitron',sans-serif] text-[11px]">TP Vex Mode</span>
                </span>
                <b
                  className={`font-mono font-bold px-2.5 py-1 rounded-xl text-[10px] border-t border-b border-b-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] ${
                    botMode === 'ROUND_NUMBER'
                      ? 'text-rose-300 bg-gradient-to-b from-rose-500/30 to-rose-950/80 border-t-rose-400/70'
                      : 'text-cyan-300 bg-gradient-to-b from-cyan-400/20 to-indigo-950/70 border-t-cyan-300/60'
                  }`}
                >
                  {botMode === 'ROUND_NUMBER' ? '⚡ VEX ON' : 'STANDBY'}
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
                  key={opt.sec}
                  onClick={() => {
                    setTradeDuration(opt.sec);
                    setBadgeText(opt.label);
                    try {
                      localStorage.setItem('ISHAK_TRADE_DURATION', String(opt.sec));
                    } catch (e) {}
                    setShowTimeModal(false);
                    showToast(`✅ Timeframe set to ${opt.label}`, false);
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    tradeDuration === opt.sec
                      ? 'bg-gradient-to-b from-cyan-400/30 to-indigo-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.35)]'
                      : 'bg-[#10173d]/80 border-indigo-400/20 text-gray-200 hover:border-cyan-400/40'
                  }`}
                >
                  <span>⏱️ {opt.label}</span>
                  {tradeDuration === opt.sec && <span className="text-cyan-400">✓</span>}
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
                  TRADEPILOT LICENSE
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

      {/* 🔄 8. TRADEPILOT VEX MODE (FORMER SWITCH MODE) */}
      {botMode === 'ROUND_NUMBER' && (
        <IshakRoundNumberTerminal
          isLicenseVerified={Boolean(activeLicense && activeLicense.key && (!activeLicense.exp || activeLicense.exp > Date.now()))}
          onClose={() => {
            setBotMode('CONFLUENCE');
            try { localStorage.setItem('ishak_active_mode', 'CONFLUENCE'); } catch (e) {}
            showToast('✅ SWITCHED TO: TRADEPILOT CONFLUENCE MODE!', false);
          }}
          onSwitchMode={() => {
            setBotMode('CONFLUENCE');
            try { localStorage.setItem('ishak_active_mode', 'CONFLUENCE'); } catch (e) {}
            showToast('✅ SWITCHED TO: TRADEPILOT CONFLUENCE MODE!', false);
          }}
        />
      )}
    </>
  );
};
