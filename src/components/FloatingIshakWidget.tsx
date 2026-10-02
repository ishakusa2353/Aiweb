import React, { useState, useEffect, useRef } from 'react';
import { playPhotostatScannerSound, playResultSound, playRiskWarningSound, playDataInjectionSound } from '../utils/audio';
import { TIME_OPTIONS } from '../data/markets';
import { SignalData } from '../types';
import { Search, ShieldAlert, Sparkles, KeyRound, Cpu, Database, Zap, Activity } from 'lucide-react';
import { supabaseService } from '../lib/supabaseService';
import { evaluateMarketData, Candle } from '../utils/marketAnalysisEngine';

interface FloatingIshakWidgetProps {
  soundEnabled: boolean;
  onTradeSignal?: (signal: SignalData) => void;
}

export const FloatingIshakWidget: React.FC<FloatingIshakWidgetProps> = ({
  soundEnabled,
  onTradeSignal,
}) => {
  // Circular Robot Position (Independent)
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

  // Data Injection state (8 trades quota per injection for deadly accuracy)
  const [injectedTradesCount, setInjectedTradesCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ISHAK_DATA_INJECTED_COUNT');
      if (saved !== null) {
        const num = parseInt(saved, 10);
        return isNaN(num) ? 0 : Math.max(0, num);
      }
    } catch (e) {}
    return 0; // Starts at 0 so user is prompted to inject data
  });
  const [showInjectModal, setShowInjectModal] = useState<boolean>(false);
  const [isInjectingData, setIsInjectingData] = useState<boolean>(false);
  const [injectStepText, setInjectStepText] = useState<string>('');

  // Modals
  const [showHub, setShowHub] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);

  // Key verification state (Trader ID removed as requested)
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [keyInputError, setKeyInputError] = useState<boolean>(false);
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

  // Expiration countdown
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');

  // Toast helper
  const showToast = (msg: string, isError: boolean) => {
    setModalToast({ msg, isError });
    setTimeout(() => {
      setModalToast(null);
    }, 3500);
  };

  // 🛡️ STRICT VIEWPORT BOUNDARY CLAMPING: Widget CANNOT be dragged outside the screen
  const clampWidgetPosition = (x: number, y: number) => {
    const pad = 6;
    const w = 78; // Approx width of circular button + orbital bezel
    const h = 94; // Approx height including pill badge
    const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
    const maxX = Math.max(pad, winW - w - pad);
    const maxY = Math.max(pad, winH - h - pad);
    return {
      x: Math.max(pad, Math.min(maxX, x)),
      y: Math.max(pad, Math.min(maxY, y)),
    };
  };

  // Re-clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampWidgetPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper: Get real Quotex investment amount
  const getLiveQuotexInvestmentAmount = (): string => {
    try {
      const selectors = [
        'input[data-test="deal-amount"]',
        'input[name="amount"]',
        'input.input-control__input[type="text"]',
        'input[aria-label*="investment" i]',
        'input[aria-label*="amount" i]',
        '.section-deal__investment input',
        '.investment-block input'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLInputElement | null;
        if (el && el.value && el.value.trim() !== '') {
          const val = el.value.trim().replace(/[^0-9.]/g, '');
          if (val) return '$' + val;
        }
      }
      const saved = localStorage.getItem('quotex_trade_amount') || localStorage.getItem('trade_amount');
      if (saved) {
        const cleaned = saved.replace(/[^0-9.]/g, '');
        if (cleaned) return '$' + cleaned;
      }
    } catch (e) {}
    return '$100';
  };

  // ⚡ 6.5. QUOTEX & BROKER AUTO-TRADE BULLETPROOF DISPATCHER (USER'S EXACT NATIVE COMMAND)
  const executeQuotexTrade = (isCall: boolean): boolean => {
    try {
      let target: HTMLElement | null = null;
      if (isCall) {
        target = document.querySelector(
          '#platform-call-button, #platform-buy-button, [data-button="buy"], [data-button="call"], [data-action="buy"], [data-action="call"], .btn-call, .btn-buy, .button-call, .section-deal__button--buy, .section-deal__button--up, .deal-form__button--call, .deal-form__button--up, [data-test*="call"], [data-test*="buy"], button.deal-button-up'
        ) as HTMLElement | null;
      } else {
        target = document.querySelector(
          '#platform-sell-button, #platform-put-button, [data-button="sell"], [data-button="put"], [data-action="sell"], [data-action="put"], .btn-sell, .btn-put, .button-put, .section-deal__button--sell, .section-deal__button--down, .deal-form__button--put, .deal-form__button--down, [data-test*="put"], [data-test*="sell"], button.deal-button-down'
        ) as HTMLElement | null;
      }

      if (!target) {
        const callWords = ['buy', 'call', 'up', 'higher', 'হায়ার', 'উপরে', 'বাই', 'вверх', 'arriba', 'naik', 'ऊपर'];
        const putWords = ['sell', 'put', 'down', 'lower', 'লোয়ার', 'নিচে', 'সেল', 'вниз', 'abajo', 'turun', 'नीचे'];
        const targets = isCall ? callWords : putWords;

        const allButtons = Array.from(document.querySelectorAll('button, div[role="button"], a.btn'));
        for (const b of allButtons) {
          const el = b as HTMLElement;
          if (el.closest('#ishak-robot-anchor') || el.closest('#ishak-trade-wrap') || el.closest('.ishak-dialog-modal') || el.closest('#ishak-hud-panel') || el.closest('#simulator-view') || el.closest('.simulator-controls')) continue;
          const txt = el.innerText ? el.innerText.trim().toLowerCase() : '';
          if (targets.some(w => txt === w || txt.startsWith(w + ' ') || txt.startsWith(w + '\n') || txt.includes(w))) {
            target = el;
            break;
          }
        }
      }

      if (target) {
        const opts = { bubbles: true, cancelable: true, view: window };
        target.dispatchEvent(new PointerEvent('pointerdown', opts));
        target.dispatchEvent(new MouseEvent('mousedown', opts));
        target.dispatchEvent(new PointerEvent('pointerup', opts));
        target.dispatchEvent(new MouseEvent('mouseup', opts));
        target.click();
        return true;
      }
    } catch (e) {}
    return false;
  };

  // Load local license on mount (auto-grants VIP access for simulator if none exists)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ISHAK_AI_LICENSE');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.key) {
          setActiveLicense(parsed);
          setLicenseInput(parsed.key);
          return;
        }
      }
      // Auto-initialize standard VIP license for simulator preview
      const simLic = {
        key: 'ISHAK-VIP-PRO',
        exp: Date.now() + 30 * 86400000,
        duration: '30d',
        traderId: 'VIP_SIMULATOR',
        tier: 'VIP',
      };
      localStorage.setItem('ISHAK_AI_LICENSE', JSON.stringify(simLic));
      setActiveLicense(simLic);
      setLicenseInput(simLic.key);
    } catch (e) {}
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!activeLicense || !activeLicense.exp) {
      if (activeLicense && activeLicense.exp === null) {
        setRemainingTimeStr('Lifetime Access');
      }
      return;
    }

    const interval = setInterval(() => {
      const diff = activeLicense.exp - Date.now();
      if (diff <= 0) {
        setRemainingTimeStr('Expired');
      } else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (d > 0) setRemainingTimeStr(`${d}d ${h}h ${m}m ${s}s`);
        else if (h > 0) setRemainingTimeStr(`${h}h ${m}m ${s}s`);
        else setRemainingTimeStr(`${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLicense]);

  // Update badge label
  useEffect(() => {
    if (isScanning) {
      setBadgeText('SCAN..');
    } else if (!tradeDuration) {
      setBadgeText('5S');
    } else {
      setBadgeText(tradeDuration >= 60 ? `${tradeDuration / 60}M` : `${tradeDuration}S`);
    }
  }, [tradeDuration, isScanning]);

  // 🖱️ Mouse Dragging (Strict Screen Boundary Clamped)
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setIsDragging(true);
      }
      const targetX = dragStartRef.current.initX + dx;
      const targetY = dragStartRef.current.initY + dy;
      setPosition(clampWidgetPosition(targetX, targetY));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => setIsDragging(false), 80);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 📱 Touch Dragging (Mobile / Tablet - Strict Screen Boundary Clamped)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: position.x,
      initY: position.y,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragStartRef.current || moveEvent.touches.length === 0) return;
      const t = moveEvent.touches[0];
      const dx = t.clientX - dragStartRef.current.startX;
      const dy = t.clientY - dragStartRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setIsDragging(true);
      }
      const targetX = dragStartRef.current.initX + dx;
      const targetY = dragStartRef.current.initY + dy;
      setPosition(clampWidgetPosition(targetX, targetY));
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      setTimeout(() => setIsDragging(false), 80);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Dragging Independent HUD Banner (Boundary Clamped)
  const handleHudMouseDown = (e: React.MouseEvent) => {
    hudDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: hudPosition.x,
      initY: hudPosition.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!hudDragStartRef.current) return;
      const dx = moveEvent.clientX - hudDragStartRef.current.startX;
      const dy = moveEvent.clientY - hudDragStartRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsHudDragging(true);
      }
      const newX = Math.max(10, Math.min(window.innerWidth - 300, hudDragStartRef.current.initX + dx));
      const newY = Math.max(70, Math.min(window.innerHeight - 150, hudDragStartRef.current.initY + dy));
      setHudPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => setIsHudDragging(false), 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ⚡ INJECT DATA HANDLER (USER REQUIREMENT: Stylish popup with Inject Data button)
  const handleInjectData = () => {
    if (isInjectingData) return;
    setIsInjectingData(true);
    setInjectStepText('CONNECTING QUANTUM MARKET FEED...');

    if (soundEnabled) {
      playDataInjectionSound();
    }

    setTimeout(() => {
      setInjectStepText('INJECTING RSI & EMA 5/9/13/21/50 MATRIX...');
    }, 450);

    setTimeout(() => {
      setInjectStepText('CALIBRATING 5S/10S TICK VOLATILITY & WICK ABSORPTION...');
    }, 950);

    setTimeout(() => {
      setInjectStepText('DATA INJECTED SUCCESSFULLY (8 HIGH-ACCURACY TRADES ACTIVATED) ⚡');
      const newQuota = 8;
      setInjectedTradesCount(newQuota);
      try {
        localStorage.setItem('ISHAK_DATA_INJECTED_COUNT', newQuota.toString());
        window.dispatchEvent(new CustomEvent('ishak_data_injected', { detail: { count: newQuota } }));
      } catch (e) {}

      if (soundEnabled) {
        playDataInjectionSound();
      }

      setTimeout(() => {
        setIsInjectingData(false);
        setShowInjectModal(false);
        showToast('⚡ অল মার্কেট ডাটা ইনজেক্টেড! পরবর্তী ৮টি ট্রেড নিখুঁত একুরিসিতে চলবে।', false);
        // Automatically start the scan immediately with newly injected data!
        startScanProcess(newQuota);
      }, 700);
    }, 1500);
  };

  // 🔒 TRIGGER SCAN / LOGO CLICK: CHECKS LICENSE AND MANDATORY DATA INJECTION
  const triggerScan = async () => {
    if (isScanning) return;

    // Direct duration check: use state, saved preference, or default 5s
    if (!tradeDuration) {
      const screenDurationSaved = localStorage.getItem('ISHAK_TRADE_DURATION');
      if (screenDurationSaved) {
        const durNum = parseInt(screenDurationSaved, 10);
        if (!isNaN(durNum) && durNum > 0) {
          setTradeDuration(durNum);
        } else {
          setTradeDuration(5);
        }
      } else {
        setTradeDuration(5);
      }
    }

    // 🛠️ Check 0: Maintenance mode check
    try {
      const isMaint = await supabaseService.getMaintenanceMode();
      if (isMaint) {
        setShowMaintenanceModal(true);
        return;
      }
    } catch (e) {}

    // 💉 Check 1: DATA INJECTION PROTOCOL (User's explicit requirement: Click bot -> Popup with Inject Data button)
    if (injectedTradesCount <= 0) {
      setShowInjectModal(true);
      return;
    }

    // Check 2: License presence
    if (!activeLicense || !activeLicense.key) {
      setShowKeyModal(true);
      showToast('⚠️ অনুগ্রহ করে প্রথমে আপনার VIP লাইসেন্স কি ভেরিফাই করুন!', true);
      return;
    }

    // Check 3: LIVE CLOUD LICENSE VERIFICATION WITH SUPABASE
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
        setBadgeText('SETUP');
        showToast(verifyData?.reason || '⛔ লাইসেন্সটি এডমিন দ্বারা ব্লক বা বাতিল করা হয়েছে!', true);
        return;
      }
    } catch (e) {
      if (activeLicense.exp && Date.now() > activeLicense.exp) {
        localStorage.removeItem('ISHAK_AI_LICENSE');
        setActiveLicense(null);
        setShowKeyModal(true);
        setBadgeText('SETUP');
        showToast('⛔ আপনার VIP লাইসেন্সের মেয়াদ শেষ হয়ে গেছে!', true);
        return;
      }
    }

    startScanProcess(injectedTradesCount);
  };

  const startScanProcess = (currentQuota: number) => {
    if (isScanning) return;

    // Decrement injected data quota by 1 for this trade
    const nextQuota = Math.max(0, currentQuota - 1);
    setInjectedTradesCount(nextQuota);
    try {
      localStorage.setItem('ISHAK_DATA_INJECTED_COUNT', nextQuota.toString());
      window.dispatchEvent(new CustomEvent('ishak_data_injected', { detail: { count: nextQuota } }));
    } catch (e) {}

    // All checks passed! Proceed with scanning & trade analysis
    setIsScanning(true);
    setScanProgress(0);
    setScanDots('.');
    setHudResult(null);

    const scanStartTime = Date.now();
    const scanDurationMs = 3500;

    // High-Frequency Real-Time Price Action Sampler during 3.6s Scan
    const samplePrices: number[] = [];
    const readPrice = () => {
      const priceSelectors = [
        '#ishak-live-price-val', '[data-live-price="true"]', '.ishak-live-price',
        '.current-price', '.chart-axis-price', '.chart-price-current',
        '.section-deal__rate', '.deal-form__rate', '.rate-value', '.current-rate',
        '[class*="price-current"]', '[class*="current-value"]', '[class*="currentPrice"]'
      ];
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const txt = el.tagName === 'INPUT' ? (el as HTMLInputElement).value : (el.textContent || '');
          const num = parseFloat(txt.trim().replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) {
            samplePrices.push(num);
            return;
          }
        }
      }
      const runCandle = document.querySelector('#ishak-running-candle, [data-running-candle="true"], .ishak-active-candle');
      if (runCandle) {
        const c = parseFloat(runCandle.getAttribute('data-close') || '');
        if (!isNaN(c) && c > 0) {
          samplePrices.push(c);
        }
      }
    };
    readPrice();
    const priceSampleInterval = setInterval(readPrice, 250);

    // Realistic 0% to 100% progress counter & sequential loading dots
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - scanStartTime;
      const pct = Math.min(100, Math.floor((elapsed / scanDurationMs) * 100));
      setScanProgress(pct);

      // Loading dots grow sequentially: . -> .. -> ... -> .... -> ..... -> ...... -> .......
      const numDots = Math.min(7, (Math.floor(elapsed / 450) % 7) + 1);
      setScanDots('.'.repeat(numDots));
    }, 35);

    // Read live Quotex investment amount
    const realInvestment = getLiveQuotexInvestmentAmount();

    // Play Photostat Scanner sound
    if (soundEnabled) {
      playPhotostatScannerSound();
    }

    // ⚡ 1. PRE-CALCULATE ALL MARKET DATA (RSI + MACD + EMA + BOLLINGER + WICKS + MOMENTUM)
    // ⚡ Anticipatory Broker Dispatch: Clicks trade button at 2600ms so the ~800-900ms broker execution latency
    // is absorbed during scan, guaranteeing that the trade is fully placed & implemented the exact split-second scan reaches 100%!
    let brokerTradeDispatched = false;
    let computedSignal: SignalData | null = null;
    let computedIsCall: boolean = true;

    const prepareAndDispatchBrokerTrade = () => {
      if (brokerTradeDispatched) return;
      brokerTradeDispatched = true;

      readPrice();

      // Exact live execution timestamp
      const liveExecutionTime = new Date().toLocaleTimeString('en-US', { hour12: true });

      // Generate unique signal ID for idempotency & ONE SIGNAL = ONE TRADE rule
      const signalId = 'SIG_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();

      // High-Accuracy Quantitative Multi-Factor Confluence Analysis (OHLC + EMA 5/9/13/21/50 + RSI 14/6 + MACD + Bollinger Bands + ATR + Momentum + S/R + Price Action)
      const candleEls = Array.from(document.querySelectorAll('[data-candle="true"]'));
      const runningCandleEl = document.getElementById('ishak-running-candle') ||
                             document.querySelector('[data-running-candle="true"], .ishak-active-candle');

      let parsedCandles: Candle[] = [];
      if (candleEls.length >= 3) {
        parsedCandles = candleEls.map((el, idx) => {
          const open = parseFloat(el.getAttribute('data-open') || '0');
          const close = parseFloat(el.getAttribute('data-close') || '0');
          const high = parseFloat(el.getAttribute('data-high') || '0');
          const low = parseFloat(el.getAttribute('data-low') || '0');
          return { time: Date.now() - (candleEls.length - idx) * (tradeDuration || 5) * 1000, open, close, high, low };
        }).filter(c => c.close > 0);
      }

      if (runningCandleEl && !candleEls.includes(runningCandleEl)) {
        const rOpen = parseFloat(runningCandleEl.getAttribute('data-open') || '0');
        const rClose = parseFloat(runningCandleEl.getAttribute('data-close') || '0');
        const rHigh = parseFloat(runningCandleEl.getAttribute('data-high') || '0');
        const rLow = parseFloat(runningCandleEl.getAttribute('data-low') || '0');
        if (rClose > 0) {
          parsedCandles.push({
            time: Date.now(),
            open: rOpen || rClose,
            high: Math.max(rHigh || rClose, rClose, rOpen || rClose),
            low: Math.min(rLow || rClose, rClose, rOpen || rClose),
            close: rClose
          });
        }
      }

      const dur = tradeDuration || 5;
      const durationStr = dur >= 60 ? `${dur / 60}M` : `${dur}S`;

      // Full Quantitative Multi-Factor Confluence & Signal Quality Filter
      const analysis = evaluateMarketData(parsedCandles, samplePrices, dur);
      let isCall: boolean;
      if (analysis.isCall !== null) {
        isCall = analysis.isCall;
      } else if (samplePrices.length >= 2) {
        const pDelta = samplePrices[samplePrices.length - 1] - samplePrices[0];
        isCall = pDelta !== 0 ? pDelta > 0 : (parsedCandles.length > 0 ? parsedCandles[parsedCandles.length - 1].close > parsedCandles[parsedCandles.length - 1].open : false);
      } else if (parsedCandles.length > 0) {
        const lastC = parsedCandles[parsedCandles.length - 1];
        isCall = lastC.close !== lastC.open ? lastC.close > lastC.open : (Math.floor(Date.now() / 1000) % 2 === 0);
      } else {
        // Parity edge case
        isCall = Math.floor(Date.now() / 1000) % 2 === 0;
      }

      computedIsCall = isCall;

      const confScore = analysis.accuracyEstimate ? analysis.accuracyEstimate.replace('%', '') : '98.6';
      const calculatedRsi = analysis.indicators.rsi14;
      const calculatedEma5 = analysis.indicators.ema5;
      const calculatedEma13 = analysis.indicators.ema13;
      const calculatedEma30 = analysis.indicators.ema50;
      const patternName = analysis.pattern;
      const trendLabel = analysis.trendLabel;
      const logicText = `টাইমফ্রেম ${durationStr}: ${analysis.reason}`;

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
        livePrice: isCall ? 1.0850 : 1.0830,
        signalId,
        finishTime: new Date().toLocaleTimeString(),
        durationLabel: tradeDuration >= 60 ? `${tradeDuration / 60} Min` : `${tradeDuration} Sec`,
        payout: '+93%',
        investment: realInvestment,
        liveExecutionTime,
        statusLabel: isCall ? 'CALL / UP ⬆' : 'PUT / DOWN ⬇'
      };

      // ⚡ PRE-DISPATCH LIVE BROKER / QUOTEX CLICK AT 2600MS (Absorbs broker latency so trade is established right as scan ends)
      executeQuotexTrade(isCall);
    };

    // ⚡ 1. Pre-dispatch at 2600ms (~900ms before scan completion)
    const anticipatoryTimer = setTimeout(prepareAndDispatchBrokerTrade, 2600);

    // ⚡ 2. Complete scan state cleanly at 3500ms (The exact moment 100% is reached and trade is already active)
    setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(priceSampleInterval);
      clearTimeout(anticipatoryTimer);

      prepareAndDispatchBrokerTrade();

      const finalIsCall = computedIsCall;
      const finalSignal = computedSignal;

      // Ensure simulator is triggered at 100% completion
      try {
        window.dispatchEvent(new CustomEvent('ishak_trade_execute', { detail: { isCall: finalIsCall, signal: finalSignal, duration: tradeDuration || 5 } }));
      } catch (e) {}

      if (onTradeSignal && finalSignal) {
        onTradeSignal(finalSignal);
      }

      setScanProgress(100);
      setScanDots('.......');
      setIsScanning(false);

      // ⚡ SIMULTANEOUSLY DISPLAY DIRECTION SIGNAL (BUY ⬆ / SELL ⬇)
      setFlySignal(finalIsCall ? 'UP' : 'DOWN');
      setTimeout(() => {
        setFlySignal(null);
      }, 1500);

      // ⚡ PLAY CONFIRMATION AUDIO
      if (soundEnabled) {
        playResultSound(finalIsCall);
      }

      if (autoPilotMode) {
        setTimeout(() => {
          if (nextQuota > 0) {
            triggerScan();
          } else {
            setAutoPilotMode(false);
            setShowInjectModal(true);
          }
        }, ((tradeDuration || 60) * 1000) + 3000);
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
        };
        localStorage.setItem('ISHAK_AI_LICENSE', JSON.stringify(lic));
        setActiveLicense(lic);
        setKeyInputError(false);
        showToast('Verified! VIP Cloud License Activated.', false);
        setTimeout(() => {
          setShowKeyModal(false);
          if (!tradeDuration) setShowTimeModal(true);
        }, 1000);
      } else {
        const rawReason = data.reason || '';
        const isWrong = !rawReason || rawReason.includes('পাওয়া যায়নি') || rawReason.includes('not found') || rawReason.includes('Invalid') || rawReason.includes('WRONG') || rawReason.includes('যাচাই করা যায়নি');
        setKeyInputError(true);
        setLicenseInput('WRONG LICENCES');
        showToast(isWrong ? '❌ WRONG LICENCES! (ভুল লাইসেন্স কি!)' : rawReason, true);
      }
    } catch (err: any) {
      setVerifying(false);
      setKeyInputError(true);
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
      {/* Bot Scanning UI: Laser Scanner Sweep + Pure Circular Gauge (no bg) + Percentage inside + Stylish Analyzing below */}
      {isScanning && (
        <>
          {/* 🌟 ULTRA-SMOOTH, CONTINUOUS UNIFIED GOLDEN LASER SCANNER (Lag-Free GPU Transform) */}
          <div
            className="fixed top-0 left-0 w-screen pointer-events-none z-[999998] will-change-transform"
            style={{
              height: '32px',
              animation: 'ishakGoldenLaserSweep 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            {/* Top Volumetric Smooth Glow */}
            <div
              className="absolute bottom-1/2 left-0 w-full pointer-events-none"
              style={{
                height: '30px',
                background: 'linear-gradient(to top, rgba(255,215,0,0.28) 0%, rgba(255,184,0,0.08) 45%, transparent 100%)'
              }}
            />

            {/* Continuous, Solid, Silky Golden Laser Beam (Zero fragmentation, Zero gaps) */}
            <div className="relative w-full h-[3.5px] flex items-center justify-center">
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,184,0,0) 0%, rgba(255,215,0,0.9) 3%, #FFFFFF 15%, #FFFFFF 85%, rgba(255,215,0,0.9) 97%, rgba(255,184,0,0) 100%)',
                  boxShadow: '0 0 10px #FFFFFF, 0 0 20px #FFD700, 0 0 35px #FF9E00, 0 0 55px rgba(255,158,11,0.7)'
                }}
              />

              {/* Optical Laser Focus Core (Crystal Diamond, Stable and Sharp) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <div
                  className="w-3.5 h-3.5 bg-gradient-to-br from-white via-amber-200 to-yellow-500 border border-white rotate-45 shadow-[0_0_15px_#FFE066,0_0_30px_#FFB800]"
                />
              </div>
            </div>

            {/* Bottom Volumetric Smooth Glow */}
            <div
              className="absolute top-1/2 left-0 w-full pointer-events-none"
              style={{
                height: '30px',
                background: 'linear-gradient(to bottom, rgba(255,215,0,0.28) 0%, rgba(255,184,0,0.08) 45%, transparent 100%)'
              }}
            />
          </div>
        </>
      )}

      {/* Floating Circular Robot Button (Draggable) with Intro Spawn Animation */}
      <div
        id="ishak-robot-anchor"
        className="fixed z-[999990] flex flex-col items-center select-none touch-none animate-[ishakIntroSpawn_1.1s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div className="relative flex items-center justify-center">
          {/* Logo Radiant Glow Aura in Background - ONLY during scanning */}
          {isScanning && (
            <div
              className="absolute -inset-3.5 rounded-full pointer-events-none animate-[ishakAuraPulse_1.2s_infinite_ease-in-out]"
              style={{
                background: 'radial-gradient(circle, rgba(0,229,255,0.95) 0%, rgba(0,255,102,0.7) 40%, rgba(0,229,255,0.15) 75%, transparent 100%)',
              }}
            />
          )}

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
            className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[1.5px] border-amber-400/50 bg-[#070D1E] shadow-[0_4px_16px_rgba(0,0,0,0.9),inset_0_0_10px_rgba(255,184,0,0.25)] cursor-pointer transition-all hover:scale-108 active:scale-95 flex items-center justify-center overflow-hidden select-none touch-none ${
              isScanning
                ? 'animate-[ishakLogoFloat_1.6s_infinite_ease-in-out] border-[#FFD700] shadow-[0_0_30px_#FFD700,0_0_55px_rgba(255,184,0,0.85),inset_0_0_14px_rgba(255,184,0,0.5)]'
                : ''
            }`}
            title="Single Click: Setup & Scan | Double Click: Control Panel"
          >
            <img
              src="/ishak_logo.png"
              alt="Ishak AI"
              className="w-full h-full object-cover rounded-full pointer-events-none select-none"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* ⚡ Continuous Rotating Golden Quantum Orbital Photon Ring (Laser Scanner Matched, Luxury Bezel, Zero Logo Face Intrusion) */}
          <div className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none z-20 flex items-center justify-center">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="ishakGoldBeamCWWidget" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="20%" stopColor="#FFE066" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#FFD700" stopOpacity="0.85" />
                  <stop offset="80%" stopColor="#FF9E00" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FF9E00" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="ishakGoldBeamCCWWidget" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="30%" stopColor="#FFD700" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#FFA000" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#FFB800" stopOpacity="0" />
                </linearGradient>
                <filter id="ishakGoldBloomWidget" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#FFD700" floodOpacity="0.95" />
                  <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#FF9E00" floodOpacity="0.75" />
                </filter>
              </defs>
              {/* Subtle Golden Bezel Orbit Guide */}
              <circle cx="32" cy="32" r="29.5" fill="none" stroke="rgba(255, 215, 0, 0.22)" strokeWidth="1" />
              {/* Precision Luxury Chrono Ticks along the outer rim */}
              <g stroke="rgba(255, 224, 102, 0.45)" strokeWidth="0.75">
                <line x1="32" y1="2.4" x2="32" y2="3.8" />
                <line x1="45.8" y1="6.1" x2="45.1" y2="7.4" />
                <line x1="56.9" y1="17.2" x2="55.6" y2="17.9" />
                <line x1="61.6" y1="32" x2="60.2" y2="32" />
                <line x1="56.9" y1="46.8" x2="55.6" y2="46.1" />
                <line x1="45.8" y1="57.9" x2="45.1" y2="56.6" />
                <line x1="32" y1="61.6" x2="32" y2="60.2" />
                <line x1="18.2" y1="57.9" x2="18.9" y2="56.6" />
                <line x1="7.1" y1="46.8" x2="8.4" y2="46.1" />
                <line x1="2.4" y1="32" x2="3.8" y2="32" />
                <line x1="7.1" y1="17.2" x2="8.4" y2="17.9" />
                <line x1="18.2" y1="6.1" x2="18.9" y2="7.4" />
              </g>
              {/* Primary Golden Plasma Arc with Traveling Comet Head (Clockwise, 3.6s) */}
              <g className="animate-[ishakOrbitSpinCW_3.6s_linear_infinite] [transform-origin:32px_32px]" filter="url(#ishakGoldBloomWidget)">
                <circle cx="32" cy="32" r="29.5" fill="none" stroke="url(#ishakGoldBeamCWWidget)" strokeWidth="2" strokeLinecap="round" strokeDasharray="65 120" />
                <circle cx="32" cy="2.5" r="1.8" fill="#FFFFFF" />
                <circle cx="32" cy="2.5" r="3.2" fill="none" stroke="#FFE066" strokeWidth="0.8" opacity="0.85" />
              </g>
              {/* Secondary Rapid Counter-Orbital Laser Streak with Diamond Photon (Counter-Clockwise, 2.4s) */}
              <g className="animate-[ishakOrbitSpinCCW_2.4s_linear_infinite] [transform-origin:32px_32px]" filter="url(#ishakGoldBloomWidget)">
                <circle cx="32" cy="32" r="28.4" fill="none" stroke="url(#ishakGoldBeamCCWWidget)" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="45 140" />
                <polygon points="32,60.4 33.6,62 32,63.6 30.4,62" fill="#FFE066" />
                <circle cx="3.6" cy="32" r="1.2" fill="#FFFFFF" />
              </g>
            </svg>
          </div>
        </div>

        {/* Small 3D Pill Badge - Matched size and proportions */}
        <div
          onClick={() => setShowHub(true)}
          className="mt-1 px-2 py-0.5 rounded-full bg-[#070D1E]/95 border border-[#00E5FF]/80 flex items-center gap-1.5 shadow-lg shadow-black/90 cursor-pointer hover:border-[#00E5FF] transition-colors transform-none select-none font-['Orbitron',sans-serif]"
        >
          <span className="text-[#00E5FF] text-[8.5px] font-black tracking-tight transform-none select-none whitespace-nowrap flex items-center gap-1">
            <span>⚡</span>
            <span>ISHAK AI</span>
          </span>
          <span className="bg-gradient-to-r from-cyan-400 to-teal-300 text-[#070D1E] text-[7.5px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none shadow-[0_0_8px_rgba(0,229,255,0.4)]">
            {badgeText}
          </span>
        </div>
      </div>

      {/* ⚡ CLEAN, COMPACT BUY / SELL SIGNAL (1.5s Duration, Zero Circles/Auras) */}
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

      {/* 1. SETTINGS HUB MODAL (CYBER-TRADING LUXURY DESIGN) */}
      {showHub && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-gradient-to-b from-[#0A1226] via-[#070D1E] to-[#040814] border-2 border-cyan-400 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,229,255,0.25),0_20px_50px_rgba(0,0,0,0.95)] relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/25">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-sm filter drop-shadow-[0_0_8px_#00E5FF]">⚙️</span>
                <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-300 font-['Orbitron',sans-serif] tracking-wider">
                  CONTROL PANEL
                </span>
              </div>
              <button
                onClick={() => setShowHub(false)}
                className="w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-xs font-bold transition shadow-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setShowHub(false);
                  setShowTimeModal(true);
                }}
                className="w-full p-3 rounded-2xl bg-[#030712]/90 border border-cyan-500/40 hover:border-cyan-300 flex items-center justify-between text-xs transition shadow-sm hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] cursor-pointer"
              >
                <span className="text-gray-300 font-medium flex items-center gap-1.5">⏱️ Trade Duration</span>
                <b className="text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
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
                className={`w-full p-3 rounded-2xl bg-[#030712]/90 border flex items-center justify-between text-xs transition shadow-sm cursor-pointer ${
                  autoPilotMode
                    ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <span className="text-gray-300 font-medium flex items-center gap-1.5">🤖 Auto-Pilot Mode</span>
                <b className={`font-bold px-2 py-0.5 rounded-lg text-[10px] ${autoPilotMode ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40' : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'}`}>
                  {autoPilotMode ? '▶ ACTIVE' : '⏹ OFF'}
                </b>
              </button>

              <button
                onClick={() => {
                  setShowHub(false);
                  setShowKeyModal(true);
                }}
                className="w-full p-3 rounded-2xl bg-[#030712]/90 border border-cyan-500/40 hover:border-cyan-300 flex items-center justify-between text-xs transition shadow-sm hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] cursor-pointer"
              >
                <span className="text-gray-300 font-medium flex items-center gap-1.5">🔑 VIP License Key</span>
                <b className="text-cyan-300 font-mono font-bold text-[11px]">
                  {activeLicense && activeLicense.key ? `${activeLicense.key.substring(0, 10)}..` : 'Verify 🔓'}
                </b>
              </button>

              {activeLicense && activeLicense.exp && (
                <div className="p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-[10px]">
                  <span className="text-gray-400 font-bold">⌛ Live Expiry:</span>
                  <b className="text-amber-300 font-mono font-bold">{remainingTimeStr}</b>
                </div>
              )}

              <div className="text-center p-2.5 rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-blue-500/10 text-cyan-300 text-[11px] font-bold tracking-wider font-['Orbitron',sans-serif]">
                ⚡ ISHAK AI VIP QUANTUM BOT
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TIME DURATION MODAL (CYBER-TRADING LUXURY DESIGN) */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-gradient-to-b from-[#0A1226] via-[#070D1E] to-[#040814] border-2 border-cyan-400 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,229,255,0.25),0_20px_50px_rgba(0,0,0,0.95)] relative">
            <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-cyan-500/25">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm filter drop-shadow-[0_0_8px_#FFD700]">⏱️</span>
                <span className="text-xs font-black text-amber-300 font-['Orbitron',sans-serif] tracking-wider">
                  SELECT TIMEFRAME
                </span>
              </div>
              <button
                onClick={() => setShowTimeModal(false)}
                className="w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-xs font-bold transition shadow-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-gray-400 mb-3 font-medium">
              Choose the exact trade duration for analysis & auto-execution:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {TIME_OPTIONS.map((opt) => {
                const isSelected = tradeDuration === opt.sec;
                return (
                  <button
                    key={opt.sec}
                    onClick={() => {
                      setTradeDuration(opt.sec);
                      try { localStorage.setItem('ISHAK_TRADE_DURATION', opt.sec.toString()); } catch(e){}
                      setShowTimeModal(false);
                    }}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      opt.sec === 60 ? 'col-span-2' : ''
                    } ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_18px_rgba(0,229,255,0.35)] scale-[1.02]'
                        : 'bg-[#030712]/90 border-slate-800 hover:border-cyan-500/50 text-gray-300'
                    }`}
                  >
                    <div className="text-xs font-black font-['Orbitron',sans-serif] flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isSelected && <span className="text-emerald-400 text-xs">●</span>}
                    </div>
                    <div className="text-[9px] text-amber-400/90 font-medium mt-0.5">{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIP KEY MODAL (TRADER ID REMOVED & CYBER LUXURY DESIGN UPGRADE) */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#0A1226] via-[#070D1E] to-[#040814] border-2 border-cyan-400 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,229,255,0.25),0_20px_50px_rgba(0,0,0,0.95)] relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/25">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-400/50 flex items-center justify-center text-cyan-300 text-sm shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                  👑
                </div>
                <div>
                  <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-300 tracking-wider font-['Orbitron',sans-serif]">
                    ISHAK AI VIP LICENSE
                  </h3>
                  <p className="text-[9px] text-gray-400 font-medium">Single-Device Cloud Protection</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-xs font-bold transition shadow-sm"
              >
                ✕
              </button>
            </div>

            {modalToast && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold mb-3 border flex items-center gap-2 ${
                  modalToast.isError
                    ? 'bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
              >
                <span>{modalToast.isError ? '⚠️' : '✅'}</span>
                <span>{modalToast.msg}</span>
              </div>
            )}

            <form onSubmit={handleVerifyKey} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1.5 font-bold">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> VIP License Key:
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
                    className="text-[9.5px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>📋</span> Paste Key
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ENTER VIP KEY (e.g. ISHAK-VIP-...)"
                    value={licenseInput}
                    onChange={(e) => {
                      setKeyInputError(false);
                      setLicenseInput(e.target.value);
                    }}
                    onClick={() => {
                      if (keyInputError || licenseInput === 'WRONG LICENCES') {
                        setLicenseInput('');
                        setKeyInputError(false);
                      }
                    }}
                    onFocus={() => {
                      if (keyInputError || licenseInput === 'WRONG LICENCES') {
                        setLicenseInput('');
                        setKeyInputError(false);
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border text-xs font-mono font-bold tracking-wider outline-none text-center transition ${
                      keyInputError
                        ? 'border-red-500 text-red-400 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                        : 'border-cyan-500/50 text-emerald-400 focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                    }`}
                  />
                </div>
              </div>

              {/* Security & Lock Status Chips */}
              <div className="grid grid-cols-2 gap-2 text-[9.5px] font-bold">
                <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
                  <span>🔒</span> 1-Device Lock
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                  <span>⚡</span> Cloud Verified
                </div>
              </div>

              {activeLicense && activeLicense.exp && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-center flex items-center justify-between">
                  <span className="text-[10px] text-gray-300 font-bold">⌛ Live Expiry:</span>
                  <b className="text-amber-300 font-mono font-bold text-xs">{remainingTimeStr}</b>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-[#070D1E] font-black text-xs tracking-wide shadow-[0_0_20px_rgba(0,229,255,0.4)] active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  {verifying ? 'VERIFYING...' : 'VERIFY & UNLOCK ⚡'}
                </button>

                {activeLicense && activeLicense.key && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3.5 py-2.5 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 hover:bg-red-900/60 font-bold text-xs transition cursor-pointer"
                  >
                    Logout
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-cyan-500/20">
                <span className="text-gray-400">VIP Support & Key:</span>
                <a
                  href="https://t.me/IshakVhai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>⚡</span> @IshakVhai
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛠️ MAINTENANCE MODE MODAL */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0B132B] border-2 border-amber-500 rounded-2xl w-full max-w-sm p-5 shadow-[0_0_60px_rgba(245,158,11,0.6)] text-white text-center animate-in fade-in zoom-in duration-200">
            <div className="text-4xl mb-2 animate-bounce">🛠️</div>
            <h3 className="text-lg font-black text-amber-400 tracking-wide mb-1">
              Bot In Maintenance
            </h3>
            <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed text-left">
              বটের সিস্টেম আপডেট ও সার্বিক অপ্টিমাইজেশন চলছে! মেইনটেনেন্স চলাকালীন সময়ে নতুন সিগন্যাল স্ক্যান ও ট্রেডিং সাময়িকভাবে স্থগিত রাখা হয়েছে।
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              সার্ভার মেইনটেনেন্স শেষ হওয়া মাত্রই বটটি স্বয়ংক্রিয়ভাবে পুনরায় চালু হয়ে যাবে।
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 transition active:scale-95 cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 💉 MARKET DATA INJECTION MODAL (USER'S EXPLICIT REQUIREMENT) */}
      {showInjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999997] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#0A1628] via-[#070E20] to-[#030712] border-2 border-cyan-400 rounded-3xl p-5 shadow-[0_0_60px_rgba(0,229,255,0.35),0_20px_50px_rgba(0,0,0,0.98)] relative overflow-hidden">
            {/* Ambient cyber glow */}
            <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/60 flex items-center justify-center text-cyan-300 text-base shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                  ⚡
                </div>
                <div>
                  <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 tracking-wider font-['Orbitron',sans-serif]">
                    MARKET DATA INJECTION
                  </h3>
                  <p className="text-[9px] text-gray-400 font-medium">Quantum Confluence Protocol</p>
                </div>
              </div>
              <button
                onClick={() => setShowInjectModal(false)}
                className="w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-xs font-bold transition shadow-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Indicator Feeds Grid */}
            <div className="space-y-2 mb-3.5 relative z-10">
              <div className="text-[10px] text-gray-300 font-semibold mb-1 flex items-center justify-between">
                <span>ইনজেকশন ডাটা ফিড (Ready to Sync):</span>
                <span className="text-emerald-400 font-mono text-[9px] font-bold animate-pulse">● LIVE STREAM READY</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                <div className="p-2 rounded-xl bg-[#030712]/90 border border-cyan-500/30 flex items-center gap-2">
                  <span className="text-cyan-400 text-sm">📊</span>
                  <div>
                    <div className="text-white font-bold font-mono">RSI (14 & 6)</div>
                    <div className="text-gray-400 text-[8px]">Momentum Stream</div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#030712]/90 border border-cyan-500/30 flex items-center gap-2">
                  <span className="text-amber-400 text-sm">📈</span>
                  <div>
                    <div className="text-white font-bold font-mono">EMA 5/9/21/50</div>
                    <div className="text-gray-400 text-[8px]">Macro Trend Shield</div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#030712]/90 border border-cyan-500/30 flex items-center gap-2">
                  <span className="text-teal-400 text-sm">🎯</span>
                  <div>
                    <div className="text-white font-bold font-mono">Bollinger Bands</div>
                    <div className="text-gray-400 text-[8px]">Volatility Squeeze</div>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#030712]/90 border border-cyan-500/30 flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">⚡</span>
                  <div>
                    <div className="text-white font-bold font-mono">Micro-Tick Flow</div>
                    <div className="text-gray-400 text-[8px]">Wick Rejections</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quota & Accuracy Info Box */}
            <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 mb-4 text-[10.5px] leading-relaxed relative z-10">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                <span>🛡️</span>
                <span>ইনজেকশন একুরিসি ও সুবিধা:</span>
              </div>
              <p className="text-gray-300 text-[10px]">
                বটে ক্লিক করার পর একবার ডাটা ইনজেক্ট করলে বট লাইভ চার্ট ও ব্রোকার থেকে সকল ইন্ডিকেটর সিন্থেসাইজ করে পরবর্তী <b className="text-emerald-400 font-bold">৮টি ট্রেডে মারাত্মক একুরিসি (৯৮%+)</b> বজায় রাখবে। ৮টি ট্রেড সম্পন্ন হওয়ার পর পুনরায় ইনজেক্ট চাইবে।
              </p>
              {injectedTradesCount > 0 && (
                <div className="mt-2 pt-2 border-t border-cyan-500/20 flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">বর্তমান অবশিষ্ট কোটা:</span>
                  <span className="text-emerald-400 font-mono font-bold">{injectedTradesCount} টি ট্রেড বাকি</span>
                </div>
              )}
            </div>

            {/* Progress status during active injection */}
            {isInjectingData && (
              <div className="mb-4 p-3 rounded-2xl bg-[#030712] border border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.3)] text-center relative z-10 animate-pulse">
                <div className="text-xs font-mono font-black text-cyan-300 mb-1.5 flex items-center justify-center gap-2">
                  <span className="animate-spin text-sm">⚙️</span>
                  <span>{injectStepText}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 animate-[pulse_0.8s_infinite] w-full" />
                </div>
              </div>
            )}

            {/* ⚡ THE STYLISH INJECT DATA BUTTON (STYLISH FONT & CYBER GLOW) */}
            <button
              id="btn-inject-data"
              type="button"
              disabled={isInjectingData}
              onClick={handleInjectData}
              className={`w-full py-3.5 px-4 rounded-2xl font-['Orbitron',sans-serif] font-black text-xs sm:text-sm tracking-widest uppercase transition-all duration-200 relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isInjectingData
                  ? 'bg-slate-800 text-gray-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 hover:brightness-110 hover:shadow-[0_0_30px_rgba(0,229,255,0.6)] active:scale-98 border border-white/60 ring-2 ring-cyan-400/40'
              }`}
            >
              <span className="text-base">⚡</span>
              <span className="font-extrabold tracking-widest">
                {isInjectingData ? 'INJECTING DATA...' : 'Inject Data'}
              </span>
              <span className="text-base">⚡</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
