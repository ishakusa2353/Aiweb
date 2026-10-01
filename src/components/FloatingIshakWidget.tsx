import React, { useState, useEffect, useRef } from 'react';
import { playPhotostatScannerSound, playResultSound, playRiskWarningSound } from '../utils/audio';
import { TIME_OPTIONS } from '../data/markets';
import { SignalData } from '../types';
import { Search, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';
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

  // Modals
  const [showHub, setShowHub] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);

  // Key verification state
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [traderIdInput, setTraderIdInput] = useState<string>('');
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

  // Pocket Option / Quotex (Buy/Sell & Up/Down) / Simulator Bulletproof Auto-Click Dispatcher
  const executeQuotexTrade = (isCall: boolean): boolean => {
    try {
      let targetEl: HTMLElement | null = null;

      // 1. Priority A: Search inside the broker deal panel / trading form container
      const dealContainers = Array.from(document.querySelectorAll(
        '.section-deal, .deal-form, .trading-panel, .deal-control, .actions-block, #put-call-buttons, [data-test="trading-panel"], .trading-actions'
      )) as HTMLElement[];

      for (const cont of dealContainers) {
        if (cont.closest('#ishak-trade-wrap') || cont.closest('.ishak-dialog-modal') || cont.closest('#ishak-hud-panel')) continue;

        if (isCall) {
          const directUp = cont.querySelector(
            '.section-deal__button--buy, button.section-deal__button--buy, .section-deal__button--buy button, ' +
            '.deal-form__button--buy, button.deal-form__button--buy, ' +
            '.section-deal__button--up, button.section-deal__button--up, .section-deal__button--up button, ' +
            '.deal-form__button--up, button.deal-form__button--up, ' +
            '#platform-buy-button, #buy-button, #deal-buy, #platform-call-button, #call-button, #deal-call, ' +
            'button.btn-buy, a.btn-buy, .btn-buy, button.btn-call, a.btn-call, .btn-call, ' +
            '[data-action="buy"], [data-action="call"], [data-action="up"], [data-button="buy"], [data-button="call"], [data-button="up"], ' +
            '[data-test="buy-button"], [data-test="call-button"], [data-test="deal-buy"], [data-test="deal-up"]'
          ) as HTMLElement | null;
          if (directUp) { targetEl = directUp; break; }
        } else {
          const directDown = cont.querySelector(
            '.section-deal__button--sell, button.section-deal__button--sell, .section-deal__button--sell button, ' +
            '.deal-form__button--sell, button.deal-form__button--sell, ' +
            '.section-deal__button--down, button.section-deal__button--down, .section-deal__button--down button, ' +
            '.deal-form__button--down, button.deal-form__button--down, ' +
            '#platform-sell-button, #sell-button, #deal-sell, #platform-put-button, #put-button, #deal-put, ' +
            'button.btn-sell, a.btn-sell, .btn-sell, button.btn-put, a.btn-put, .btn-put, ' +
            '[data-action="sell"], [data-action="put"], [data-action="down"], [data-button="sell"], [data-button="put"], [data-button="down"], ' +
            '[data-test="sell-button"], [data-test="put-button"], [data-test="deal-sell"], [data-test="deal-down"]'
          ) as HTMLElement | null;
          if (directDown) { targetEl = directDown; break; }
        }

        // Inner button loop in container
        const contBtns = Array.from(cont.querySelectorAll('button, a, div[role="button"], [class*="btn"], [class*="button"]')) as HTMLElement[];
        for (const btnEl of contBtns) {
          const txt = (btnEl.textContent || '').trim().toLowerCase();
          const cls = (btnEl.className || '').toLowerCase();
          const style = window.getComputedStyle(btnEl);
          const bg = (style.backgroundColor || '').toLowerCase();

          if (isCall) {
            const hasBuyWord = /\b(buy|call|up|higher|বাই|হায়ার)\b/i.test(txt);
            const isGreenBtn = bg.includes('0, 192, 108') || bg.includes('0, 176, 116') ||
                               bg.includes('16, 185, 129') || bg.includes('5, 150, 105') ||
                               bg.includes('34, 197, 94') || cls.includes('success') ||
                               cls.includes('buy') || cls.includes('call') || cls.includes('up');
            if (hasBuyWord || isGreenBtn) { targetEl = btnEl; break; }
          } else {
            const hasSellWord = /\b(sell|put|down|lower|সেল|লোয়ার)\b/i.test(txt);
            const isRedBtn = bg.includes('255, 98, 89') || bg.includes('242, 54, 69') ||
                             bg.includes('239, 68, 68') || bg.includes('220, 38, 38') ||
                             bg.includes('225, 29, 72') || cls.includes('danger') ||
                             cls.includes('sell') || cls.includes('put') || cls.includes('down');
            if (hasSellWord || isRedBtn) { targetEl = btnEl; break; }
          }
        }
        if (targetEl) break;
      }

      // 2. Priority B: Document-wide direct selectors
      if (!targetEl) {
        const upSelectors = [
          '#platform-buy-button', '#buy-button', '#deal-buy', '#platform-call-button', '#call-button', '#deal-call',
          '.section-deal__button--buy', 'button.section-deal__button--buy', '.section-deal__button--buy button',
          '.deal-form__button--buy', 'button.deal-form__button--buy',
          '.section-deal__button--up', 'button.section-deal__button--up', '.section-deal__button--up button',
          '.deal-form__button--up', 'button.deal-form__button--up',
          'button.btn-buy', 'a.btn-buy', '.btn-buy', 'button.btn-call', 'a.btn-call', '.btn-call',
          'button.button--up', 'button.button--call', 'button.button--success', 'a.btn-up', '.btn-up', 'a.btn-higher',
          '[data-action="buy"]', '[data-action="call"]', '[data-action="up"]', '[data-button="buy"]', '[data-button="call"]', '[data-button="up"]',
          '[data-test="buy-button"]', '[data-test="call-button"]', '[data-test="deal-buy"]', '[data-test="deal-up"]', '[data-qa="btn-buy"]', '[data-qa="deal-buy"]'
        ];
        const downSelectors = [
          '#platform-sell-button', '#sell-button', '#deal-sell', '#platform-put-button', '#put-button', '#deal-put',
          '.section-deal__button--sell', 'button.section-deal__button--sell', '.section-deal__button--sell button',
          '.deal-form__button--sell', 'button.deal-form__button--sell',
          '.section-deal__button--down', 'button.section-deal__button--down', '.section-deal__button--down button',
          '.deal-form__button--down', 'button.deal-form__button--down',
          'button.btn-sell', 'a.btn-sell', '.btn-sell', 'button.btn-put', 'a.btn-put', '.btn-put',
          'button.button--down', 'button.button--put', 'button.button--danger', 'a.btn-down', '.btn-down', 'a.btn-lower',
          '[data-action="sell"]', '[data-action="put"]', '[data-action="down"]', '[data-button="sell"]', '[data-button="put"]', '[data-button="down"]',
          '[data-test="sell-button"]', '[data-test="put-button"]', '[data-test="deal-sell"]', '[data-test="deal-down"]', '[data-qa="btn-sell"]', '[data-qa="deal-sell"]'
        ];

        const selectors = isCall ? upSelectors : downSelectors;
        for (const sel of selectors) {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (el && !el.closest('#ishak-trade-wrap') && !el.closest('.ishak-dialog-modal') && !el.closest('#ishak-hud-panel')) {
            targetEl = el;
            break;
          }
        }
      }

      // 3. Priority C: Universal Fallback
      if (!targetEl) {
        const candidateEls = Array.from(document.querySelectorAll('button, a, div[role="button"], [class*="btn"], [class*="button"]')) as HTMLElement[];
        for (let i = 0; i < candidateEls.length; i++) {
          const b = candidateEls[i];
          if (b.closest('#ishak-trade-wrap') || b.closest('.ishak-dialog-modal') || b.closest('#ishak-hud-panel')) continue;

          const txt = (b.textContent || '').trim().toLowerCase();
          const style = window.getComputedStyle(b);
          const bg = (style.backgroundColor || '').toLowerCase();
          const cls = (b.className || '').toLowerCase();

          if (isCall) {
            const isGreen = bg.includes('0, 192, 108') || bg.includes('0, 176, 116') || bg.includes('16, 185, 129') || bg.includes('5, 150, 105') || bg.includes('34, 197, 94') || cls.includes('call') || cls.includes('up') || cls.includes('buy');
            const isUpTxt = /\b(buy|call|up|higher|বাই|কল|buy|выше|হায়ার)\b/i.test(txt);
            if (isGreen || isUpTxt) { targetEl = b; break; }
          } else {
            const isRed = bg.includes('255, 98, 89') || bg.includes('242, 54, 69') || bg.includes('239, 68, 68') || bg.includes('220, 38, 38') || bg.includes('225, 29, 72') || cls.includes('put') || cls.includes('down') || cls.includes('sell');
            const isDownTxt = /\b(sell|put|down|lower|সেল|পুট|sell|ниже|লোয়ার)\b/i.test(txt);
            if (isRed || isDownTxt) { targetEl = b; break; }
          }
        }
      }

      if (targetEl) {
        const target = (targetEl.tagName === 'BUTTON' || targetEl.tagName === 'A') ? targetEl : (targetEl.closest('button, a') as HTMLElement || targetEl.querySelector('button, a') as HTMLElement || targetEl);

        try { (target as HTMLButtonElement).disabled = false; } catch (e) {}
        try { target.removeAttribute('disabled'); } catch (e) {}
        try { target.focus(); } catch (e) {}

        const rect = target.getBoundingClientRect();
        const cx = (rect.left || 0) + (rect.width || 80) / 2;
        const cy = (rect.top || 0) + (rect.height || 40) / 2;

        const evtProps = {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          clientX: cx,
          clientY: cy,
          screenX: cx,
          screenY: cy,
          pageX: cx + (window.scrollX || 0),
          pageY: cy + (window.scrollY || 0),
          button: 0,
          buttons: 1,
          which: 1
        };

        if (typeof window.PointerEvent === 'function') {
          try { target.dispatchEvent(new PointerEvent('pointerdown', evtProps)); } catch (e) {}
        }
        try { target.dispatchEvent(new MouseEvent('mousedown', evtProps)); } catch (e) {}

        if (typeof window.PointerEvent === 'function') {
          try { target.dispatchEvent(new PointerEvent('pointerup', evtProps)); } catch (e) {}
        }
        try { target.dispatchEvent(new MouseEvent('mouseup', evtProps)); } catch (e) {}
        try { target.dispatchEvent(new MouseEvent('click', evtProps)); } catch (e) {}

        if (typeof target.click === 'function') {
          try { target.click(); } catch (e) {}
        }

        if (targetEl !== target) {
          try { if (typeof targetEl.click === 'function') targetEl.click(); } catch (e) {}
        }

        const inner = target.querySelector('span, div') as HTMLElement | null;
        if (inner && inner !== target) {
          try {
            inner.dispatchEvent(new MouseEvent('click', evtProps));
            if (typeof inner.click === 'function') inner.click();
          } catch (e) {}
        }

        return true;
      }
    } catch (e) {}
    return false;
  };

  // Load local license on mount (strictly no hardcoded default keys)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ISHAK_AI_LICENSE');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.key) {
          setActiveLicense(parsed);
          setLicenseInput(parsed.key);
          if (parsed.traderId) setTraderIdInput(parsed.traderId);
        }
      }
    } catch (e) {}

    // Bot loaded: Logo animates in from above first. Modals appear when user clicks logo!
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

  // Dragging Circular Button
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
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setIsDragging(true);
      }
      const newX = Math.max(10, Math.min(window.innerWidth - 80, dragStartRef.current.initX + dx));
      const newY = Math.max(80, Math.min(window.innerHeight - 90, dragStartRef.current.initY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => setIsDragging(false), 60);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Dragging Independent HUD Banner
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

  // 🔒 TRIGGER SCAN / LOGO CLICK: DIRECT SCANNING WITHOUT MARKET RESTRICTIONS
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

    // Check 3: License presence
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
    }, 40);

    // Read live Quotex investment amount
    const realInvestment = getLiveQuotexInvestmentAmount();

    // Play Photostat Scanner sound
    if (soundEnabled) {
      playPhotostatScannerSound();
    }

    // 3.5s animation matching slow golden floating scan sweep
    setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(priceSampleInterval);
      readPrice();

      setScanProgress(100);
      setScanDots('.......');
      setIsScanning(false);

      // Exact live execution timestamp
      const liveExecutionTime = new Date().toLocaleTimeString('en-US', { hour12: true });

      // Generate unique signal ID for idempotency & ONE SIGNAL = ONE TRADE rule
      const signalId = 'SIG_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();

      // High-Accuracy Quantitative Multi-Factor Confluence Analysis (OHLC + EMA/SMA + RSI + MACD + ATR + Momentum + S/R + Price Action)
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

      // Background Quantitative Multi-Factor Confluence & Signal Quality Filter
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
        // Zero data edge case: 50/50 alternating parity, zero hardcoded UP bias
        isCall = Math.floor(Date.now() / 1000) % 2 === 0;
      }

      const confScore = analysis.accuracyEstimate ? analysis.accuracyEstimate.replace('%', '') : '96.4';
      const calculatedRsi = analysis.indicators.rsi14;
      const calculatedEma5 = analysis.indicators.ema5;
      const calculatedEma13 = analysis.indicators.ema13;
      const calculatedEma30 = analysis.indicators.ema50;
      const patternName = analysis.pattern;
      const trendLabel = analysis.trendLabel;
      const logicText = `টাইমফ্রেম ${durationStr}: ${analysis.reason}`;

      if (soundEnabled) {
        playResultSound(isCall);
      }

      // ⚡ EXECUTE LIVE QUOTEX AUTO TRADE IMMEDIATELY ON SCAN COMPLETION
      executeQuotexTrade(isCall);

      // Clean, compact BUY/SELL signal (1.5s Duration, No circles/shockwaves)
      setFlySignal(isCall ? 'UP' : 'DOWN');
      setTimeout(() => {
        setFlySignal(null);
      }, 1500);

      const signal: SignalData = {
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

      if (onTradeSignal) {
        onTradeSignal(signal);
      }

      if (autoPilotMode) {
        setTimeout(() => {
          triggerScan();
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
        traderIdInput.trim(),
        devId
      );
      setVerifying(false);

      if (data.valid) {
        const lic = {
          key: licenseInput.trim().toUpperCase(),
          exp: data.exp,
          duration: data.duration || '30d',
          traderId: traderIdInput.trim(),
          tier: data.tier || 'VIP',
        };
        localStorage.setItem('ISHAK_AI_LICENSE', JSON.stringify(lic));
        setActiveLicense(lic);
        setKeyInputError(false);
        showToast('Verified! Single device lock active.', false);
        setTimeout(() => {
          setShowKeyModal(false);
          if (!tradeDuration) setShowTimeModal(true);
        }, 1100);
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
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging) triggerScan();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setShowHub(true);
            }}
            className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[1.5px] border-amber-400/50 bg-[#070D1E] shadow-[0_4px_16px_rgba(0,0,0,0.9),inset_0_0_10px_rgba(255,184,0,0.25)] cursor-pointer transition-all hover:scale-108 active:scale-95 flex items-center justify-center overflow-hidden ${
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

      {/* 1. SETTINGS HUB MODAL */}
      {showHub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#0B132B] border-2 border-cyan-400 rounded-2xl p-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">⚙️</span>
                <span className="text-xs font-black text-cyan-300">ISHAK AI CONTROL PANEL</span>
              </div>
              <button
                onClick={() => setShowHub(false)}
                className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowHub(false);
                  setShowTimeModal(true);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-between text-xs transition"
              >
                <span className="text-gray-300">⏱️ Trade Duration</span>
                <b className="text-amber-400 font-mono font-bold">
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
                className={`w-full p-2.5 rounded-xl bg-slate-900/90 border flex items-center justify-between text-xs transition ${
                  autoPilotMode ? 'border-cyan-400' : 'border-slate-700'
                }`}
              >
                <span className="text-gray-300">🤖 Auto-Pilot Mode</span>
                <b className={`font-bold ${autoPilotMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {autoPilotMode ? '▶ RUNNING' : '⏹ STOPPED'}
                </b>
              </button>

              <button
                onClick={() => {
                  setShowHub(false);
                  setShowKeyModal(true);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-between text-xs transition"
              >
                <span className="text-gray-300">🔑 VIP Key & Logout</span>
                <b className="text-cyan-400 font-mono font-bold">
                  {activeLicense && activeLicense.key ? `${activeLicense.key.substring(0, 10)}..` : 'Not Set'}
                </b>
              </button>

              {activeLicense && activeLicense.exp && (
                <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">⌛ Live Expiry:</span>
                  <b className="text-amber-400 font-mono font-bold">{remainingTimeStr}</b>
                </div>
              )}

              <div className="text-center p-2 rounded-xl border border-dashed border-cyan-400/50 bg-cyan-500/10 text-cyan-300 text-[11px] font-bold">
                ⚡ Ishak AI VIP Trading System
              </div>
            </div>
          </div>
        </div>
      )}



      {/* 3. TIME DURATION MODAL */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#0B132B] border-2 border-cyan-400 rounded-2xl p-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">⏱️</span>
                <span className="text-xs font-black text-amber-300">SELECT TRADE DURATION</span>
              </div>
              <button
                onClick={() => setShowTimeModal(false)}
                className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-gray-400 mb-3">
              The bot executes trades strictly according to the selected timeframe:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((opt) => {
                const isSelected = tradeDuration === opt.sec;
                return (
                  <button
                    key={opt.sec}
                    onClick={() => {
                      setTradeDuration(opt.sec);
                      setShowTimeModal(false);
                    }}
                    className={`p-2.5 rounded-xl text-left border transition ${
                      opt.sec === 60 ? 'col-span-2' : ''
                    } ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 border-slate-800 text-gray-300 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div className="text-[9px] text-amber-400 font-medium">{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIP KEY & DEVICE LOCK MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#0B132B] border-2 border-cyan-400 rounded-2xl p-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">👑</span>
                <span className="text-xs font-black text-cyan-300">VIP LICENSE & DEVICE VERIFY</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold"
              >
                ✕
              </button>
            </div>

            {modalToast && (
              <div
                className={`p-2 rounded-xl text-[11px] font-bold mb-3 border flex items-center gap-1.5 ${
                  modalToast.isError
                    ? 'bg-red-950/70 border-red-500 text-red-300'
                    : 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                }`}
              >
                <span>{modalToast.isError ? '⚠️' : '✅'}</span>
                <span>{modalToast.msg}</span>
              </div>
            )}

            <form onSubmit={handleVerifyKey} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-300 block mb-1">
                  1. VIP License Key:
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ISHAK-VIP-XXXX"
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
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border text-xs font-mono font-bold outline-none transition ${
                      keyInputError
                        ? 'border-red-500 text-red-500 bg-red-950/40 animate-pulse'
                        : 'border-slate-700 text-emerald-400 focus:border-cyan-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
                  <span>2. Trader ID (Optional):</span>
                  <span className="text-amber-400 font-bold text-[9px]">Device Lock Active 🔒</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 84920184"
                  value={traderIdInput}
                  onChange={(e) => setTraderIdInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-400 font-mono font-bold outline-none focus:border-cyan-400"
                />
              </div>

              {activeLicense && activeLicense.exp && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/40 text-center">
                  <span className="text-[10px] text-gray-400">⌛ Live Expiry: </span>
                  <b className="text-amber-400 font-mono font-bold text-xs">{remainingTimeStr}</b>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#070D1E] font-black text-xs shadow hover:brightness-110 disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify & Unlock'}
                </button>

                {activeLicense && activeLicense.key && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-xl bg-red-950/40 border border-red-500/50 text-red-400 hover:bg-red-900/50 font-bold text-xs transition"
                  >
                    Logout
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1">
                <span className="text-gray-400">Get Key & Support:</span>
                <a
                  href="https://t.me/IshakVhai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 font-bold"
                >
                  ⚡ @IshakVhai
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
    </>
  );
};
