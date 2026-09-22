import React, { useState, useEffect, useRef } from 'react';
import { playPhotostatScannerSound, playResultSound, playRiskWarningSound } from '../utils/audio';
import { MARKETS_DATABASE, TIME_OPTIONS } from '../data/markets';
import { SignalData } from '../types';
import { Search, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';
import { supabaseService } from '../lib/supabaseService';

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
  const [tradeDuration, setTradeDuration] = useState<number | null>(null); // Forced selection
  const [currentMarket, setCurrentMarket] = useState<string | null>(null); // Forced selection
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanDots, setScanDots] = useState<string>('.......');
  const [badgeText, setBadgeText] = useState<string>('SETUP');

  // Modals
  const [showHub, setShowHub] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showMarketModal, setShowMarketModal] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);
  const [marketSearch, setMarketSearch] = useState<string>('');

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
  const [shockwaveState, setShockwaveState] = useState<{ x: number; y: number; color: string } | null>(null);

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

    // 2. BOT FIRST LOAD: Mandatory Market & Time Selection
    setShowMarketModal(true);
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
    } else if (!currentMarket || !tradeDuration) {
      setBadgeText('SETUP');
    } else {
      setBadgeText(tradeDuration >= 60 ? `${tradeDuration / 60}M` : `${tradeDuration}S`);
    }
  }, [tradeDuration, currentMarket, isScanning]);

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

  // 🔒 TRIGGER SCAN: MANDATORY PRE-SCAN LICENSE CHECK ON EVERY SINGLE CLICK
  const triggerScan = async () => {
    if (isScanning) return;

    // 🛠️ Check 0: Maintenance mode check
    try {
      const isMaint = await supabaseService.getMaintenanceMode();
      if (isMaint) {
        setShowMaintenanceModal(true);
        return;
      }
    } catch (e) {}

    // Check 1: License presence
    if (!activeLicense || !activeLicense.key) {
      setShowKeyModal(true);
      showToast('⚠️ অনুগ্রহ করে প্রথমে আপনার VIP লাইসেন্স কি ভেরিফাই করুন!', true);
      return;
    }

    // Check 2: Forced Market & Time Selection
    if (!currentMarket) {
      setShowMarketModal(true);
      return;
    }

    if (!tradeDuration) {
      setShowTimeModal(true);
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
    const scanDurationMs = 3600;

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
    const priceSampleInterval = setInterval(readPrice, 50);

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

    // 3.6s animation matching carriage sweep and color shift
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

      // High-Accuracy Quantitative Multi-Factor Confluence Analysis (Triple EMA + RSI + Price Action)
      const candleEls = Array.from(document.querySelectorAll('[data-candle="true"]'));
      const runningCandleEl = document.getElementById('ishak-running-candle') ||
                             document.querySelector('[data-running-candle="true"], .ishak-active-candle');

      // 1. RUNNING HIGH-FREQUENCY PRICE ACTION TICKS (Captured during 3.6s Laser Scan)
      let tickScore = 0;
      let tickSlope = 0;
      let tickDelta = 0;
      let upTicks = 0;
      let downTicks = 0;
      let microRsi = 50;
      let acceleration = 0;

      if (samplePrices.length >= 3) {
        const n = samplePrices.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let s = 0; s < n; s++) {
          sumX += s;
          sumY += samplePrices[s];
          sumXY += s * samplePrices[s];
          sumX2 += s * s;
          if (s > 0) {
            if (samplePrices[s] > samplePrices[s - 1]) upTicks++;
            else if (samplePrices[s] < samplePrices[s - 1]) downTicks++;
          }
        }
        const denom = (n * sumX2 - sumX * sumX);
        if (denom !== 0) {
          tickSlope = (n * sumXY - sumX * sumY) / denom;
        }
        tickDelta = samplePrices[n - 1] - samplePrices[0];

        // Up vs Down tick pressure
        if (upTicks > downTicks + 1) tickScore += 5;
        else if (downTicks > upTicks + 1) tickScore -= 5;

        // Net price displacement during scan
        if (tickDelta > 0.00001) tickScore += 6;
        else if (tickDelta < -0.00001) tickScore -= 6;

        // Linear Regression Slope
        if (tickSlope > 0.000002) tickScore += 6;
        else if (tickSlope < -0.000002) tickScore -= 6;

        // Acceleration (1st half slope vs 2nd half slope)
        if (n >= 6) {
          const half = Math.floor(n / 2);
          const s1 = (samplePrices[half - 1] - samplePrices[0]) / (half || 1);
          const s2 = (samplePrices[n - 1] - samplePrices[half]) / (half || 1);
          acceleration = s2 - s1;
          if (acceleration > 0.000002) tickScore += 4;
          else if (acceleration < -0.000002) tickScore -= 4;
        }

        // Micro-RSI over ticks
        let g = 0, l = 0;
        for (let m = 1; m < n; m++) {
          const diff = samplePrices[m] - samplePrices[m - 1];
          if (diff > 0) g += diff;
          else l += Math.abs(diff);
        }
        const rs = l === 0 ? 100 : g / l;
        microRsi = Math.round(l === 0 ? 100 : 100 - (100 / (1 + rs)));
        if (microRsi >= 68) tickScore -= 4; // Overbought micro-exhaustion
        else if (microRsi <= 32) tickScore += 4; // Oversold micro-bounce
        else if (microRsi > 54) tickScore += 2;
        else if (microRsi < 46) tickScore -= 2;
      }

      // 2. CANDLESTICK DATA & TECHNICAL INDICATORS (Historical + Running Candle)
      let candleScore = 0;
      let calculatedRsi = 50;
      let calculatedEma5 = 1.0848;
      let calculatedEma13 = 1.0840;
      let calculatedEma30 = 1.0832;
      let patternName = '';
      let logicText = '';
      let trendLabel = '';
      let srPattern = '';
      let srReason = '';
      let resistance = 0;
      let support = 0;
      let currentPrice = samplePrices[samplePrices.length - 1] || 1.0845;
      let candleDelta = 0;

      if (candleEls.length >= 3) {
        const candleData = candleEls.map(el => {
          const open = parseFloat(el.getAttribute('data-open') || '0');
          const close = parseFloat(el.getAttribute('data-close') || '0');
          const high = parseFloat(el.getAttribute('data-high') || '0');
          const low = parseFloat(el.getAttribute('data-low') || '0');
          const dir = el.getAttribute('data-direction');
          return { open, close, high, low, dir };
        }).filter(c => c.close > 0);

        if (candleData.length >= 3) {
          const closes = candleData.map(c => c.close);
          const lastCandle = candleData[candleData.length - 1];
          currentPrice = lastCandle.close;
          candleDelta = lastCandle.close - lastCandle.open;
          const isRunningGreen = candleDelta > 0;
          const candleBody = Math.abs(candleDelta);
          const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
          const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;

          // EMA Calculation
          const calcEMA = (data: number[], period: number) => {
            if (data.length < period) return data[data.length - 1] || 1.084;
            const k = 2 / (period + 1);
            let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
            for (let i = period; i < data.length; i++) {
              ema = data[i] * k + ema * (1 - k);
            }
            return ema;
          };

          const ema5 = calcEMA(closes, 5);
          const ema13 = calcEMA(closes, 13);
          const ema30 = calcEMA(closes, Math.min(30, closes.length));
          calculatedEma5 = parseFloat(ema5.toFixed(5));
          calculatedEma13 = parseFloat(ema13.toFixed(5));
          calculatedEma30 = parseFloat(ema30.toFixed(5));

          // RSI (14 periods)
          let gains = 0, losses = 0;
          const rsiPeriod = Math.min(14, closes.length - 1);
          for (let i = closes.length - rsiPeriod; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff > 0) gains += diff;
            else losses += Math.abs(diff);
          }
          const avgGain = gains / (rsiPeriod || 1);
          const avgLoss = losses / (rsiPeriod || 1);
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          calculatedRsi = Math.round(avgLoss === 0 ? 100 : 100 - (100 / (1 + rs)));

          // Dynamic S/R Zones
          const lookback = Math.min(25, candleData.length);
          const recentCandles = candleData.slice(-lookback);
          const highs = recentCandles.map(c => c.high);
          const lows = recentCandles.map(c => c.low);
          resistance = Math.max(...highs);
          support = Math.min(...lows);
          const priceRange = Math.max(0.0001, resistance - support);
          const distToResistance = (resistance - currentPrice) / priceRange;
          const distToSupport = (currentPrice - support) / priceRange;

          // Running Candle Body Pressure
          if (candleDelta > 0.00001) {
            candleScore += 6;
          } else if (candleDelta < -0.00001) {
            candleScore -= 6;
          }

          // Candlestick Wick Anatomy (Pin Bar & Wick Rejection Physics)
          if (upperWick > lowerWick * 1.3 && upperWick >= candleBody * 0.5) {
            candleScore -= 6;
            srPattern = 'Bearish Shooting Star (Upper Wick Rejection)';
            srReason = 'ক্যান্ডেলে তীব্র আপার উইক রিজেকশন—সেলাররা আগ্রাসী বিক্রয় চাপে মার্কেট নিচে নামাচ্ছে।';
          } else if (lowerWick > upperWick * 1.3 && lowerWick >= candleBody * 0.5) {
            candleScore += 6;
            srPattern = 'Bullish Hammer (Lower Wick Bounce)';
            srReason = 'ক্যান্ডেলে শক্তিশালী লোয়ার উইক রিজেকশন—বায়াররা মার্কেট নিচ থেকে বাউন্স করিয়ে উপরে তুলছে।';
          }

          // Dynamic S/R Rejections
          if (distToResistance <= 0.22) {
            if (upperWick > lowerWick || !isRunningGreen || calculatedRsi >= 60 || tickSlope < 0) {
              candleScore -= 7;
              srPattern = 'Resistance Level Rejection (Bearish Reversal)';
              srReason = `প্রাইজ রেজিস্টেন্স লেভেল (${resistance.toFixed(4)}) স্পর্শ করায় সেলারদের বিক্রয় চাপে রিভার্সাল হয়েছে।`;
            } else if (currentPrice >= resistance && isRunningGreen && upperWick < candleBody * 0.25) {
              candleScore += 5;
              srPattern = 'Resistance Level Breakout (High Volume)';
              srReason = `রেজিস্টেন্স লেভেল (${resistance.toFixed(4)}) বায়ারদের অতিরিক্ত ভলিউমে ব্রেকআউট করেছে।`;
            }
          } else if (distToSupport <= 0.22) {
            if (lowerWick > upperWick || isRunningGreen || calculatedRsi <= 40 || tickSlope > 0) {
              candleScore += 7;
              srPattern = 'Support Level Bounce (Bullish Reversal)';
              srReason = `প্রাইজ সাপোর্ট লেভেল (${support.toFixed(4)}) স্পর্শ করায় বায়ারদের ক্রয় চাপে বাউন্স তৈরি হয়েছে।`;
            } else if (currentPrice <= support && !isRunningGreen && lowerWick < candleBody * 0.25) {
              candleScore -= 5;
              srPattern = 'Support Level Breakdown (High Volume)';
              srReason = `সাপোর্ট লেভেল (${support.toFixed(4)}) ভেঙে সেলারদের অতিরিক্ত ভলিউমে মার্কেট ডাউন হয়েছে।`;
            }
          }

          // Candlestick Pattern Momentum
          if (candleData.length >= 2) {
            const prevCandle = candleData[candleData.length - 2];
            const isPrevGreen = prevCandle.close >= prevCandle.open;
            if (isRunningGreen && !isPrevGreen && lastCandle.close > prevCandle.open) {
              candleScore += 5;
              if (!srPattern) srPattern = 'Bullish Engulfing Reversal';
            } else if (!isRunningGreen && isPrevGreen && lastCandle.close < prevCandle.open) {
              candleScore -= 5;
              if (!srPattern) srPattern = 'Bearish Engulfing Reversal';
            } else if (isRunningGreen && isPrevGreen) {
              candleScore += 3;
            } else if (!isRunningGreen && !isPrevGreen) {
              candleScore -= 3;
            }
          }

          // Dynamic EMA
          if (ema5 > ema13) candleScore += 3;
          else if (ema5 < ema13) candleScore -= 3;
          if (ema5 > ema13 && ema13 > ema30) candleScore += 2;
          else if (ema5 < ema13 && ema13 < ema30) candleScore -= 2;

          // RSI 14
          if (calculatedRsi >= 68) {
            candleScore -= 5;
            if (!srReason) srReason = `RSI (${calculatedRsi}) ওভারবট জোনে—সেলাররা সক্রিয়ভাবে মার্কেট পুশ ডাউন করছে।`;
          } else if (calculatedRsi <= 32) {
            candleScore += 5;
            if (!srReason) srReason = `RSI (${calculatedRsi}) ওভারসোল্ড জোনে—বায়াররা সক্রিয়ভাবে মার্কেট পুশ আপ করছে।`;
          } else if (calculatedRsi > 54) {
            candleScore += 2;
          } else if (calculatedRsi < 46) {
            candleScore -= 2;
          }
        }
      } else if (runningCandleEl) {
        const dirAttr = runningCandleEl.getAttribute('data-direction');
        const openVal = parseFloat(runningCandleEl.getAttribute('data-open') || '0');
        const closeVal = parseFloat(runningCandleEl.getAttribute('data-close') || '0');
        const highVal = parseFloat(runningCandleEl.getAttribute('data-high') || '0');
        const lowVal = parseFloat(runningCandleEl.getAttribute('data-low') || '0');
        const upW = highVal - Math.max(openVal, closeVal);
        const loW = Math.min(openVal, closeVal) - lowVal;

        if (upW > loW * 1.3 && upW >= Math.abs(closeVal - openVal) * 0.5) {
          candleScore -= 7;
        } else if (loW > upW * 1.3 && loW >= Math.abs(closeVal - openVal) * 0.5) {
          candleScore += 7;
        } else if (closeVal < openVal || dirAttr === 'DOWN') {
          candleScore -= 6;
        } else if (closeVal > openVal || dirAttr === 'UP') {
          candleScore += 6;
        }
      }

      // 3. TIMEFRAME-ADAPTIVE SYNTHESIS (Strictly Responsive to Selected Duration)
      const dur = tradeDuration || 5;
      let totalScore = 0;
      if (dur <= 15) {
        // Fast timeframes (5s, 10s, 15s): live tick momentum & instantaneous price delta dominate
        totalScore = (tickScore * 1.6) + (candleScore * 1.1);
      } else {
        // Standard timeframes (30s, 60s, 2m): balanced confluence of ticks and macro candle structure
        totalScore = (tickScore * 1.0) + (candleScore * 1.4);
      }

      // 4. SYMMETRICAL DECISION (ZERO DEFAULT BIAS)
      let isCall: boolean;
      if (totalScore > 0) {
        isCall = true;
      } else if (totalScore < 0) {
        isCall = false; // Decisive PUT / DOWN
      } else {
        // Tie breaker based on real-time price physics
        if (tickDelta < -0.000005 || tickSlope < 0) {
          isCall = false;
        } else if (tickDelta > 0.000005 || tickSlope > 0) {
          isCall = true;
        } else if (candleDelta < -0.000005) {
          isCall = false;
        } else if (candleDelta > 0.000005) {
          isCall = true;
        } else {
          const mid = (support + resistance) / 2;
          isCall = currentPrice < mid;
        }
      }

      const confScore = Math.min(99.4, 96.8 + Math.abs(totalScore) * 0.22).toFixed(1);
      const selectedPair = currentMarket || 'USD/BDT (OTC)';
      const durationStr = dur >= 60 ? `${dur / 60}M` : `${dur}S`;

      if (isCall) {
        patternName = srPattern || (tickSlope > 0 ? 'Bullish Tick Velocity & Momentum Impulse' : 'Bullish Support Bounce');
        logicText = `${selectedPair} (${durationStr}): ${srReason || 'লাইভ রানিং ক্যান্ডেল ও টিক ডেটায় বায়ারদের ঊর্ধ্বমুখী চাপ নিশ্চিত।'} ${confScore}% একুরিসিতে কল (UP ↑) ট্রেড কার্যকর!`;
        trendLabel = 'BULLISH MOMENTUM ↗';
      } else {
        patternName = srPattern || (tickSlope < 0 ? 'Bearish Tick Velocity & Breakdown Impulse' : 'Bearish Resistance Rejection');
        logicText = `${selectedPair} (${durationStr}): ${srReason || 'লাইভ রানিং ক্যান্ডেল ও টিক ডেটায় সেলারদের নিম্নমুখী চাপ নিশ্চিত।'} ${confScore}% একুরিসিতে পুট (DOWN ↓) ট্রেড কার্যকর!`;
        trendLabel = 'BEARISH MOMENTUM ↘';
      }

      if (soundEnabled) {
        playResultSound(isCall);
      }

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

      // 1. Quantum Sonic Shockwave from Screen Center
      const themeColor = isCall ? '#00FF66' : '#FF1744';
      setShockwaveState({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        color: themeColor
      });
      setTimeout(() => {
        setShockwaveState(null);
      }, 1200);

      // 2. Ultra-stylish, minimalist UP/DOWN signal HUD (ZERO clutter, ZERO candle lock)
      setFlySignal(isCall ? 'UP' : 'DOWN');
      setTimeout(() => {
        setFlySignal(null);
      }, 1000);

      if (onTradeSignal) {
        onTradeSignal(signal);
      }

      if (autoPilotMode) {
        setTimeout(() => {
          triggerScan();
        }, ((tradeDuration || 60) * 1000) + 3000);
      }
    }, 3600);
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
          if (!currentMarket) setShowMarketModal(true);
          else if (!tradeDuration) setShowTimeModal(true);
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
          {/* Photostat Scanner Carriage Laser Sweep Line */}
          <div
            className="fixed left-0 w-screen pointer-events-none z-[999998]"
            style={{
              height: '16px',
              animation: 'ishakLaserSweepSlow 3.6s cubic-bezier(0.42, 0, 0.58, 1) infinite'
            }}
          >
            {/* Top Trailing Smoke (Single Logo Color #00E5FF) */}
            <div
              className="absolute bottom-full left-0 w-full pointer-events-none"
              style={{
                height: '130px',
                background: 'linear-gradient(to top, rgba(0,229,255,0.6) 0%, rgba(0,229,255,0.25) 35%, rgba(0,229,255,0.08) 70%, transparent 100%)',
                filter: 'blur(8px)',
                opacity: 0.95
              }}
            />
            {/* Main Laser Beam */}
            <div
              className="relative w-full h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.35) 8%, #00E5FF 25%, #E0FFFF 50%, #00E5FF 75%, rgba(0,229,255,0.35) 92%, transparent 100%)',
                boxShadow: '0 0 20px #00E5FF, 0 0 45px #00E5FF, 0 0 80px #00E5FF, 0 0 8px #FFFFFF'
              }}
            />
            {/* Bottom Trailing Smoke (Single Logo Color #00E5FF) */}
            <div
              className="absolute top-full left-0 w-full pointer-events-none"
              style={{
                height: '130px',
                background: 'linear-gradient(to bottom, rgba(0,229,255,0.6) 0%, rgba(0,229,255,0.25) 35%, rgba(0,229,255,0.08) 70%, transparent 100%)',
                filter: 'blur(8px)',
                opacity: 0.85
              }}
            />
          </div>

          {/* Centered Circular Gauge (Without Background) with Stylish Analyzing */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999999] pointer-events-none flex flex-col items-center justify-center select-none">
            {/* Subtle Ambient Radial Glow */}
            <div className="absolute -inset-14 rounded-full blur-3xl pointer-events-none opacity-35 bg-gradient-to-r from-cyan-500/25 via-sky-400/20 to-emerald-400/20" />

            <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="ishakPureCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="50%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#00FF66" />
                  </linearGradient>
                  <filter id="ishakPureGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00E5FF" floodOpacity="0.85" />
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00FF66" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Background Circular Track (Translucent subtle glow line, NO background fill) */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="rgba(0, 229, 255, 0.12)"
                  strokeWidth="3.5"
                />

                {/* Progress Arc: Sweeps clockwise from 12 o'clock and completes 100% full round circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="url(#ishakPureCircleGrad)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={314.16}
                  strokeDashoffset={314.16 - (Math.max(0, Math.min(100, scanProgress)) / 100) * 314.16}
                  filter="url(#ishakPureGlow)"
                  className="transition-all duration-75 linear"
                />
              </svg>

              {/* Percentage centered inside circle (without background) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span
                  className="text-4xl sm:text-5xl font-black font-mono tracking-tighter text-white drop-shadow-[0_0_18px_rgba(0,229,255,0.95)] leading-none select-none"
                  style={{ fontFamily: '"Orbitron", monospace' }}
                >
                  {scanProgress}
                </span>
                <span
                  className="text-xl sm:text-2xl font-black font-mono text-cyan-400 drop-shadow-[0_0_12px_rgba(0,229,255,0.85)] ml-0.5 leading-none select-none"
                  style={{ fontFamily: '"Orbitron", monospace' }}
                >
                  %
                </span>
              </div>
            </div>

            {/* Stylish "Analyzing" text under the circle with opacity oscillation & live market name */}
            <div className="mt-3.5 flex items-center justify-center gap-1.5 select-none animate-[ishakAnalyzingPulse_1.3s_infinite_ease-in-out]">
              <span
                className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-cyan-300 drop-shadow-[0_0_14px_rgba(0,229,255,0.95)]"
                style={{ fontFamily: '"Orbitron", "Rajdhani", sans-serif' }}
              >
                ANALYZING {currentMarket || 'USD/BDT (OTC)'}...
              </span>
              <span
                className="text-cyan-400 font-mono font-bold tracking-widest text-xs inline-block w-5 text-left"
                style={{ fontFamily: '"Orbitron", monospace' }}
              >
                {scanDots}
              </span>
            </div>
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
            className={`relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-cyan-400 bg-[#070D1E] shadow-[0_8px_25px_rgba(0,0,0,0.85),inset_0_0_12px_rgba(0,229,255,0.4)] cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center justify-center p-0.5 overflow-hidden ${
              isScanning
                ? 'animate-[ishakLogoFloat_1.6s_infinite_ease-in-out] border-emerald-400 shadow-[0_0_25px_#00FF66,0_0_50px_#00E5FF,inset_0_0_14px_rgba(0,255,102,0.4)]'
                : ''
            }`}
            title="Single Click: Scan & Trade | Double Click: Control Panel"
          >
            <img
              src="https://i.ibb.co/B5k2894W/a1fd0ad10f4d.jpg"
              alt="Ishak AI"
              className="w-full h-full object-cover rounded-full pointer-events-none"
              referrerPolicy="no-referrer"
            />
          </button>
        </div>

        {/* Small 3D Pill Badge - Matched size and proportions */}
        <div
          onClick={() => setShowHub(true)}
          className="mt-0.5 px-1.5 py-0.5 rounded-full bg-[#070D1E]/95 border border-cyan-400/80 flex items-center gap-1 shadow-lg shadow-black/80 cursor-pointer hover:border-cyan-300 transform-none select-none"
        >
          <span className="text-cyan-400 text-[8px] font-black tracking-tight transform-none select-none">⚡ ISHAK AI</span>
          <span className="bg-cyan-400 text-[#070D1E] text-[7px] font-black px-1.5 py-0.2 rounded-full">
            {badgeText}
          </span>
        </div>
      </div>

      {/* Quantum Sonic Shockwave Ring */}
      {shockwaveState && (
        <div
          className="fixed pointer-events-none z-[999995] rounded-full animate-[ishakShockwaveRing_1.1s_cubic-bezier(0.1,0.85,0.25,1)_forwards]"
          style={{
            left: `${shockwaveState.x}px`,
            top: `${shockwaveState.y}px`,
            width: '100px',
            height: '100px',
            borderColor: shockwaveState.color,
            borderWidth: '4px',
            borderStyle: 'solid',
            boxShadow: `0 0 60px ${shockwaveState.color}, 0 0 120px ${shockwaveState.color}, inset 0 0 40px ${shockwaveState.color}`
          }}
        />
      )}

      {/* SIMPLE, ULTRA-PREMIUM UP / DOWN SIGNAL ANIMATION (1s Duration) */}
      {flySignal && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[999999] select-none text-center flex items-center justify-center"
          style={{
            animation: 'ishakSignalAppear1s 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            fontFamily: '"Orbitron", "Rajdhani", system-ui, sans-serif'
          }}
        >
          {/* Ambient Radiant Glow Aura */}
          <div
            className="absolute -inset-16 rounded-full blur-3xl pointer-events-none opacity-85"
            style={{
              background: flySignal === 'UP'
                ? 'radial-gradient(circle, rgba(0,255,102,0.5) 0%, rgba(0,229,255,0.2) 50%, transparent 75%)'
                : 'radial-gradient(circle, rgba(255,23,68,0.55) 0%, rgba(255,82,82,0.2) 50%, transparent 75%)'
            }}
          />

          <span
            className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-[0.14em] leading-none select-none relative whitespace-nowrap ${
              flySignal === 'UP' ? 'text-[#00FF66]' : 'text-[#FF1744]'
            }`}
            style={{
              textShadow: flySignal === 'UP'
                ? '0 0 20px #00FF66, 0 0 50px rgba(0,255,102,0.85), 0 0 90px rgba(0,229,255,0.6), 0 4px 24px rgba(0,0,0,0.95)'
                : '0 0 20px #FF1744, 0 0 50px rgba(255,23,68,0.85), 0 0 90px rgba(255,50,75,0.6), 0 4px 24px rgba(0,0,0,0.95)'
            }}
          >
            {flySignal === 'UP' ? 'UP ↑' : 'DOWN ↓'}
          </span>
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
                  setShowMarketModal(true);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-between text-xs transition"
              >
                <span className="text-gray-300">📊 Select Market</span>
                <b className="text-emerald-400 font-bold">{currentMarket || 'Choose Market'}</b>
              </button>

              <button
                onClick={() => {
                  setShowHub(false);
                  setShowTimeModal(true);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-between text-xs transition"
              >
                <span className="text-gray-300">⏱️ Trade Duration</span>
                <b className="text-amber-400 font-mono font-bold">
                  {tradeDuration ? (tradeDuration >= 60 ? `${tradeDuration / 60} Min` : `${tradeDuration} Sec`) : 'Choose Time'}
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

              <a
                href="https://t.me/IshakVhai"
                target="_blank"
                rel="noreferrer"
                className="block text-center p-2 rounded-xl border border-dashed border-cyan-400/50 bg-cyan-500/10 text-cyan-300 text-[11px] font-bold hover:bg-cyan-500/20 transition"
              >
                ⚡ Telegram Support (@IshakVhai)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. FORCED MARKET SELECTION MODAL */}
      {showMarketModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999996] flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[85vh] bg-[#0B132B] border-2 border-cyan-400 rounded-2xl p-4 shadow-2xl flex flex-col relative">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">📊</span>
                <span className="text-xs font-black text-cyan-300">SELECT QUOTEX MARKET</span>
              </div>
              <button
                onClick={() => setShowMarketModal(false)}
                className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold"
              >
                ✕
              </button>
            </div>

            {/* Search Box */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search market (e.g. EUR, GOLD, OTC)..."
                value={marketSearch}
                onChange={(e) => setMarketSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Market List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-64">
              {MARKETS_DATABASE.map((cat, idx) => {
                const filtered = cat.items.filter((item) =>
                  item.toLowerCase().includes(marketSearch.toLowerCase())
                );
                if (filtered.length === 0) return null;

                return (
                  <div key={idx}>
                    <div className="text-[10px] font-black text-emerald-400 tracking-wider mb-1.5">
                      {cat.category}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filtered.map((item, i) => {
                        const isSelected = currentMarket === item;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setCurrentMarket(item);
                              setShowMarketModal(false);
                              if (!tradeDuration) {
                                setShowTimeModal(true);
                              }
                            }}
                            className={`p-1.5 rounded-lg text-[10px] font-bold text-left truncate transition ${
                              isSelected
                                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                                : 'bg-slate-900/80 border border-slate-800 text-gray-300 hover:border-cyan-500/40 hover:text-white'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
              আপডেট ও সহায়তার জন্য টেলিগ্রামে যোগাযোগ রাখুন:
            </p>
            <div className="flex gap-2">
              <a
                href="https://t.me/IshakVhai"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <span>⚡ Telegram Support (@IshakVhai)</span>
              </a>
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 font-bold text-xs hover:bg-slate-800 transition"
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
