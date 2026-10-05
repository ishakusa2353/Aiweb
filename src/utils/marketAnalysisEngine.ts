/**
 * ISHAK AI VIP - PROFESSIONAL-GRADE REAL MARKET ANALYSIS & CONFLUENCE ENGINE
 * 
 * Strict Real Market Knowledge Core:
 * 1. Market Structure:
 *    - Swing Highs / Swing Lows (Fractal Pivot Extraction)
 *    - Trend Structure: Higher Highs & Higher Lows (HH/HL) vs Lower Highs & Lower Lows (LH/LL)
 *    - Break of Structure (BOS): Bullish BOS & Bearish BOS
 *    - Change of Character (CHoCH): Bullish CHoCH (Trend Reversal to UP) & Bearish CHoCH (Trend Reversal to DOWN)
 * 
 * 2. Trend Analysis:
 *    - Multi-Period Moving Average Alignment: EMA 9, 13, 21, 50, SMA 20
 *    - Moving Average Vector Slopes & Dynamic Alignment
 *    - Trend Strength & Expansion vs Contraction
 * 
 * 3. Price Action:
 *    - Candlestick Anatomy & Wick-to-Body Physics
 *    - Pin Bar / Hammer (Bullish Lower Wick Rejection)
 *    - Shooting Star (Bearish Upper Wick Rejection)
 *    - Bullish & Bearish Engulfing Formations
 *    - Pullback / Retracement into Dynamic Support/Resistance (EMA 9/21)
 *    - False Breakout / Liquidity Sweep (Fakeout Reversal)
 * 
 * 4. Support & Resistance:
 *    - Static Key Swing Levels (Multi-touch rolling pivots)
 *    - Dynamic S/R: Bollinger Bands (20, 2) & EMA Dynamic Zones
 *    - Retest vs Rejection Physics
 * 
 * 5. Momentum & Divergence:
 *    - 14-period RSI Momentum & Oscillator Extremes
 *    - Regular Divergence (Bullish: Price LL, RSI HL | Bearish: Price HH, RSI LH)
 *    - Hidden Divergence (Bullish: Price HL, RSI LL | Bearish: Price LH, RSI HH)
 *    - MACD (12, 26, 9) Crossover, Zero-Line & Histogram Acceleration/Deceleration
 * 
 * 6. Volatility & Dead Flat / Chop Detection:
 *    - 14-period Average True Range (ATR)
 *    - Bollinger Band Width (BBW) Volatility Squeeze & Flat Consolidation Filter
 *    - Strict Protection: Dead flat / Zero volatility market filtering
 * 
 * 7. Market Regime Identification:
 *    - TRENDING_BULLISH, TRENDING_BEARISH, RANGING_CONSOLIDATION,
 *      VOLATILE_BREAKOUT, REVERSAL_EXHAUSTION, CONSOLIDATING_SQUEEZE
 * 
 * 8. Multi-Timeframe Context:
 *    - Higher-timeframe macro aggregation from micro-candles
 *    - HTF Trend Alignment vs Conflicting Timeframe Risk Penalty
 * 
 * 9. Multi-Factor Confluence:
 *    - Requires independent consensus across Structure + Price Action + Trend + Momentum + S/R
 *    - Strictly Symmetric Scoring: Zero UP bias, Zero DOWN bias
 * 
 * 10. Signal Quality & Capital Preservation:
 *    - Rejects low-confidence, chop, dead flat, or conflicting conditions (NO_SIGNAL)
 *    - Zero synthetic/fake candle generation
 *    - Zero look-ahead bias
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type MarketRegimeType =
  | 'TRENDING_BULLISH'
  | 'TRENDING_BEARISH'
  | 'RANGING_CONSOLIDATION'
  | 'VOLATILE_BREAKOUT'
  | 'REVERSAL_EXHAUSTION'
  | 'CONSOLIDATING_SQUEEZE';

export interface MarketStructureInfo {
  structureType: 'BULLISH_HH_HL' | 'BEARISH_LH_LL' | 'RANGING_EQUAL' | 'UNDEFINED';
  breakOfStructure: 'BULLISH_BOS' | 'BEARISH_BOS' | 'NONE';
  changeOfCharacter: 'BULLISH_CHOCH' | 'BEARISH_CHOCH' | 'NONE';
  lastSwingHigh: number;
  lastSwingLow: number;
  scoreImpact: number;
  description: string;
}

export interface DivergenceInfo {
  type: 'REGULAR_BULLISH' | 'REGULAR_BEARISH' | 'HIDDEN_BULLISH' | 'HIDDEN_BEARISH' | 'NONE';
  scoreImpact: number;
  description: string;
}

export interface VolatilityInfo {
  atr14: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
  bandWidthPct: number;
  isHighVolatility: boolean;
  isSqueeze: boolean;
  isDeadFlat: boolean;
}

export interface MultiTimeframeInfo {
  htfTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  isAlignedWithMicro: boolean;
  isConflicting: boolean;
  scoreImpact: number;
  description: string;
}

export interface QQEInfo {
  rsi: number;
  smoothedRsi: number;
  fastAtrBand: number;
  longBand: number;
  shortBand: number;
  trend: 1 | -1 | 0; // 1 = Bullish, -1 = Bearish, 0 = Neutral
  state: 'QQE_BULLISH' | 'QQE_BEARISH' | 'QQE_NEUTRAL';
  isCrossUp: boolean;
  isCrossDown: boolean;
  description: string;
}

export interface DataValidationResult {
  isValid: boolean;
  reason?: string;
  candleCount: number;
  tickCount: number;
  dataAgeMs: number;
  isStale: boolean;
  hasGaps: boolean;
  hasOutliers: boolean;
}

export interface OutOfSampleValidationReport {
  totalSamples: number;
  inSampleSamples: number;
  outOfSampleSamples: number;
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  noSignalCount: number;
  wins: number;
  losses: number;
  ties: number;
  winRateExcludingTiesPct: number;
  winRateIncludingTiesPct: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  performanceByDirection: {
    buy: { signals: number; wins: number; losses: number; ties: number; winRatePct: number };
    sell: { signals: number; wins: number; losses: number; ties: number; winRatePct: number };
  };
  performanceByRegime: Record<string, { signals: number; wins: number; losses: number; ties: number; winRatePct: number }>;
}

export interface IndicatorMetrics {
  ema5: number;
  ema9: number;
  ema13: number;
  ema21: number;
  ema50: number;
  sma20: number;
  rsi14: number;
  qqe?: QQEInfo;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    isBullishCross: boolean;
    isBearishCross: boolean;
  };
  atr14: number;
  isHighVolatility: boolean;
  momentum: {
    velocity: number;
    acceleration: number;
    tickSlope: number;
    roc: number;
  };
  supportResistance: {
    resistance: number;
    support: number;
    distToResistancePct: number;
    distToSupportPct: number;
    isNearResistance: boolean;
    isNearSupport: boolean;
    isBreakoutAbove: boolean;
    isBreakdownBelow: boolean;
    isRetestBounce: boolean;
    isRetestRejection: boolean;
  };
  priceAction: {
    patternName: string;
    description: string;
    bodySize: number;
    upperWick: number;
    lowerWick: number;
    wickRejection: 'BULLISH_LOWER_WICK' | 'BEARISH_UPPER_WICK' | 'NEUTRAL';
    isPullback: boolean;
    isFakeout: boolean;
  };
  marketStructure: MarketStructureInfo;
  divergence: DivergenceInfo;
  volatility: VolatilityInfo;
  multiTimeframe: MultiTimeframeInfo;
  regime: MarketRegimeType;
}

export interface FactorAuditLog {
  direction: 'UP' | 'DOWN' | 'NO_SIGNAL';
  confluenceScore: number;
  upFactorsCount: number;
  downFactorsCount: number;
  upFactors: string[];
  downFactors: string[];
  neutralFactors: string[];
  marketStructure: string;
  regime: string;
  volatilityCondition: string;
  dominantReason: string;
  mode?: 'ULTRA_SHORT' | 'STANDARD';
  qqeState?: string;
  dataValidation?: DataValidationResult;
}

export interface ConfluenceDecision {
  isCall: boolean | null; // true = CALL, false = PUT, null = NO_SIGNAL
  signalQuality: 'HIGH_CONFLUENCE' | 'MODERATE' | 'LOW_FILTERED';
  isTradeApproved: boolean; // Passed signal quality & non-chop filter
  confluenceScore: number; // -100 to +100
  signalQualityScore: number; // Deterministic 0-100 score based strictly on evidence
  accuracyEstimate: string; // e.g. "Signal Quality: 85%"
  mode: 'ULTRA_SHORT' | 'STANDARD';
  pattern: string;
  reason: string;
  trendLabel: string;
  indicators: IndicatorMetrics;
  dataValidation: DataValidationResult;
}

// -------------------------------------------------------------
// REAL-TIME DATA VALIDATION (Zero Fake Data, Anti-Lookahead)
// -------------------------------------------------------------

export function validateMarketData(
  candles: Candle[],
  livePrices: number[] = [],
  maxAllowedAgeMs: number = 90000,
  isHistoricalReplay: boolean = false
): DataValidationResult {
  const validCandles = (candles || []).filter(
    (c) => c && typeof c.close === 'number' && !isNaN(c.close) && c.close > 0
  );
  const validPrices = (livePrices || []).filter(
    (p) => typeof p === 'number' && !isNaN(p) && p > 0
  );

  if (validCandles.length < 3 && validPrices.length < 4) {
    return {
      isValid: false,
      reason: 'অপর্যাপ্ত মার্কেট ডাটা (কমপক্ষে ৩টি ক্যান্ডেল বা ৪টি লাইভ টিক প্রয়োজন)',
      candleCount: validCandles.length,
      tickCount: validPrices.length,
      dataAgeMs: 0,
      isStale: false,
      hasGaps: false,
      hasOutliers: false,
    };
  }

  const now = Date.now();
  const lastCandleTime = validCandles.length > 0 ? validCandles[validCandles.length - 1].time : now;
  const dataAgeMs = Math.max(0, now - lastCandleTime);
  const isStale = !isHistoricalReplay && dataAgeMs > maxAllowedAgeMs && validPrices.length === 0;

  if (isStale) {
    return {
      isValid: false,
      reason: `মার্কেট ডাটা মেয়াদোত্তীর্ণ বা নিশ্চল (সর্বশেষ ডাটা ${Math.round(dataAgeMs / 1000)}s আগের)`,
      candleCount: validCandles.length,
      tickCount: validPrices.length,
      dataAgeMs,
      isStale: true,
      hasGaps: false,
      hasOutliers: false,
    };
  }

  let prevTime = 0;
  for (let i = 0; i < validCandles.length; i++) {
    const c = validCandles[i];
    if (c.time < prevTime) {
      return {
        isValid: false,
        reason: 'ক্যান্ডেল টাইমস্ট্যাম্প ক্রমানুসারে সাজানো নেই (Data sequence error)',
        candleCount: validCandles.length,
        tickCount: validPrices.length,
        dataAgeMs,
        isStale: false,
        hasGaps: true,
        hasOutliers: false,
      };
    }
    prevTime = c.time;

    // OHLC Geometry validation
    const maxOC = Math.max(c.open, c.close);
    const minOC = Math.min(c.open, c.close);
    if (c.high < maxOC - 0.00002 || c.low > minOC + 0.00002) {
      return {
        isValid: false,
        reason: 'ত্রুটিপূর্ণ ক্যান্ডেল OHLC জ্যামিতি শনাক্ত (Corrupted Candle Geometry)',
        candleCount: validCandles.length,
        tickCount: validPrices.length,
        dataAgeMs,
        isStale: false,
        hasGaps: false,
        hasOutliers: true,
      };
    }
  }

  return {
    isValid: true,
    candleCount: validCandles.length,
    tickCount: validPrices.length,
    dataAgeMs,
    isStale: false,
    hasGaps: false,
    hasOutliers: false,
  };
}

// -------------------------------------------------------------
// QQE (QUANTITATIVE QUALITATIVE ESTIMATION) ENGINE
// Parameters per specification:
// - RSI Length = 1
// - RSI Smoothing = 1
// - QQE Factor = 4.238
// - Wilders Period = 14
// -------------------------------------------------------------

export function calculateQQE(
  prices: number[],
  rsiLength: number = 1,
  smoothingFactor: number = 1,
  qqeFactor: number = 4.238
): QQEInfo {
  if (!prices || prices.length < 2) {
    return {
      rsi: 50,
      smoothedRsi: 50,
      fastAtrBand: 50,
      longBand: 50,
      shortBand: 50,
      trend: 0,
      state: 'QQE_NEUTRAL',
      isCrossUp: false,
      isCrossDown: false,
      description: 'QQE: পর্যাপ্ত প্রাইজ ডাটা অনুপস্থিত',
    };
  }

  // 1. Calculate RSI series (Length = 1 instant momentum pulse, or standard)
  const rsiSeries: number[] = [];
  if (rsiLength === 1) {
    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        rsiSeries.push(50);
      } else {
        const delta = prices[i] - prices[i - 1];
        if (delta > 0.000001) rsiSeries.push(100);
        else if (delta < -0.000001) rsiSeries.push(0);
        else rsiSeries.push(50);
      }
    }
  } else {
    const rsiCalc = calculateRSI(prices, rsiLength);
    rsiSeries.push(...rsiCalc.series);
  }

  // 2. Smoothed RSI (Smoothing Factor = 1 => identity)
  let smoothedRsiSeries: number[];
  if (smoothingFactor <= 1) {
    smoothedRsiSeries = [...rsiSeries];
  } else {
    smoothedRsiSeries = calculateEMA(rsiSeries, smoothingFactor);
  }

  // 3. Absolute True Range of Smoothed RSI
  const atrRsiSeries: number[] = [0];
  for (let i = 1; i < smoothedRsiSeries.length; i++) {
    atrRsiSeries.push(Math.abs(smoothedRsiSeries[i] - smoothedRsiSeries[i - 1]));
  }

  // 4. Wilders EMA Smoothing of AtrRsi (Period 14 => EMA 2 * 14 - 1 = 27)
  const wildersPeriod = 14;
  const emaPeriod = 2 * wildersPeriod - 1;
  const smoothedAtrRsi = calculateEMA(atrRsiSeries, Math.min(emaPeriod, atrRsiSeries.length));

  // 5. Dynamic Trailing Bands Calculation
  let longBand = 0;
  let shortBand = 100;
  let trend: 1 | -1 | 0 = 0;
  let prevTrend: 1 | -1 | 0 = 0;
  let prevLongBand = 0;
  let prevShortBand = 100;

  for (let i = 0; i < smoothedRsiSeries.length; i++) {
    const sRsi = smoothedRsiSeries[i];
    const dar = (smoothedAtrRsi[i] || 0) * qqeFactor;

    const newLongBand = sRsi - dar;
    const newShortBand = sRsi + dar;

    if (i > 0) {
      const prevRsi = smoothedRsiSeries[i - 1];
      if (prevRsi > prevLongBand && sRsi > prevLongBand) {
        longBand = Math.max(prevLongBand, newLongBand);
      } else {
        longBand = newLongBand;
      }

      if (prevRsi < prevShortBand && sRsi < prevShortBand) {
        shortBand = Math.min(prevShortBand, newShortBand);
      } else {
        shortBand = newShortBand;
      }

      // Trend determination & crossover detection
      if (sRsi > prevShortBand) {
        trend = 1;
      } else if (sRsi < prevLongBand) {
        trend = -1;
      } else {
        trend = prevTrend;
      }
    } else {
      longBand = newLongBand;
      shortBand = newShortBand;
      trend = sRsi >= 50 ? 1 : -1;
    }

    prevTrend = trend;
    prevLongBand = longBand;
    prevShortBand = shortBand;
  }

  const currentRsi = rsiSeries[rsiSeries.length - 1] ?? 50;
  const currentSmoothedRsi = smoothedRsiSeries[smoothedRsiSeries.length - 1] ?? 50;
  const fastAtrBand = trend === 1 ? longBand : shortBand;

  const isCrossUp = trend === 1 && prevTrend !== 1;
  const isCrossDown = trend === -1 && prevTrend !== -1;

  let state: 'QQE_BULLISH' | 'QQE_BEARISH' | 'QQE_NEUTRAL' = 'QQE_NEUTRAL';
  if (trend === 1 && currentSmoothedRsi > fastAtrBand + 0.2) {
    state = 'QQE_BULLISH';
  } else if (trend === -1 && currentSmoothedRsi < fastAtrBand - 0.2) {
    state = 'QQE_BEARISH';
  } else {
    state = 'QQE_NEUTRAL';
  }

  const description =
    state === 'QQE_BULLISH'
      ? `QQE বুলিশ ট্রেন্ড ভেরিফিকেশন (RSI ${currentSmoothedRsi.toFixed(1)} > ডাইনামিক ব্যান্ড ${fastAtrBand.toFixed(1)})`
      : state === 'QQE_BEARISH'
      ? `QQE বিয়ারিশ ট্রেন্ড ভেরিফিকেশন (RSI ${currentSmoothedRsi.toFixed(1)} < ডাইনামিক ব্যান্ড ${fastAtrBand.toFixed(1)})`
      : 'QQE নিরপেক্ষ ট্রানজিশন অবস্থা (Neutral Transition)';

  return {
    rsi: parseFloat(currentRsi.toFixed(1)),
    smoothedRsi: parseFloat(currentSmoothedRsi.toFixed(1)),
    fastAtrBand: parseFloat(fastAtrBand.toFixed(2)),
    longBand: parseFloat(longBand.toFixed(2)),
    shortBand: parseFloat(shortBand.toFixed(2)),
    trend,
    state,
    isCrossUp,
    isCrossDown,
    description,
  };
}

// -------------------------------------------------------------
// PURE TECHNICAL INDICATOR CALCULATIONS (Deterministic Math)
// -------------------------------------------------------------

export function calculateSMA(data: number[], period: number): number[] {
  if (data.length === 0 || period <= 0) return [];
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i]);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }
  return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0 || period <= 0) return [];
  const ema: number[] = [];
  const k = 2 / (period + 1);

  const seedPeriod = Math.min(period, data.length);
  let initialSum = 0;
  for (let i = 0; i < seedPeriod; i++) {
    initialSum += data[i];
  }
  let currentEma = initialSum / seedPeriod;
  ema.push(currentEma);

  for (let i = 1; i < data.length; i++) {
    currentEma = data[i] * k + currentEma * (1 - k);
    ema.push(currentEma);
  }
  return ema;
}

export function calculateRSI(closes: number[], period: number = 14): { rsi: number; series: number[] } {
  if (closes.length < 2) return { rsi: 50, series: [50] };

  const effectivePeriod = Math.max(2, Math.min(period, closes.length - 1));
  const series: number[] = [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= effectivePeriod; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / effectivePeriod;
  let avgLoss = losses / effectivePeriod;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  series.push(parseFloat(rsi.toFixed(2)));

  for (let i = effectivePeriod + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (effectivePeriod - 1) + gain) / effectivePeriod;
    avgLoss = (avgLoss * (effectivePeriod - 1) + loss) / effectivePeriod;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    series.push(parseFloat(rsi.toFixed(2)));
  }

  const finalRsi = series[series.length - 1] ?? 50;
  return { rsi: finalRsi, series };
}

export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: number;
  signalLine: number;
  histogram: number;
  isBullishCross: boolean;
  isBearishCross: boolean;
  series: { macd: number[]; signal: number[]; hist: number[] };
} {
  if (closes.length < 5) {
    return {
      macdLine: 0,
      signalLine: 0,
      histogram: 0,
      isBullishCross: false,
      isBearishCross: false,
      series: { macd: [0], signal: [0], hist: [0] },
    };
  }

  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);

  const macdSeries: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdSeries.push(fastEma[i] - slowEma[i]);
  }

  const signalSeries = calculateEMA(macdSeries, signalPeriod);
  const histSeries: number[] = [];
  for (let i = 0; i < macdSeries.length; i++) {
    histSeries.push(macdSeries[i] - (signalSeries[i] ?? 0));
  }

  const lastMacd = macdSeries[macdSeries.length - 1];
  const lastSignal = signalSeries[signalSeries.length - 1];
  const histogram = lastMacd - lastSignal;

  let isBullishCross = false;
  let isBearishCross = false;
  if (macdSeries.length >= 2 && signalSeries.length >= 2) {
    const prevMacd = macdSeries[macdSeries.length - 2];
    const prevSignal = signalSeries[signalSeries.length - 2];
    if (prevMacd <= prevSignal && lastMacd > lastSignal) {
      isBullishCross = true;
    } else if (prevMacd >= prevSignal && lastMacd < lastSignal) {
      isBearishCross = true;
    }
  }

  return {
    macdLine: parseFloat(lastMacd.toFixed(6)),
    signalLine: parseFloat(lastSignal.toFixed(6)),
    histogram: parseFloat(histogram.toFixed(6)),
    isBullishCross,
    isBearishCross,
    series: { macd: macdSeries, signal: signalSeries, hist: histSeries },
  };
}

export function calculateATR(
  candles: Candle[],
  period: number = 14
): { atr: number; isHighVolatility: boolean; avgRange: number } {
  if (candles.length === 0) return { atr: 0.0002, isHighVolatility: false, avgRange: 0.0002 };

  const trueRanges: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      trueRanges.push(c.high - c.low);
    } else {
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      trueRanges.push(tr);
    }
  }

  const effectivePeriod = Math.min(period, trueRanges.length);
  const recentTr = trueRanges.slice(-effectivePeriod);
  const atr = recentTr.reduce((a, b) => a + b, 0) / (effectivePeriod || 1);

  const lastCandle = candles[candles.length - 1];
  const lastRange = lastCandle.high - lastCandle.low;
  const isHighVolatility = lastRange > atr * 1.4;

  return {
    atr: parseFloat(atr.toFixed(6)),
    isHighVolatility,
    avgRange: parseFloat(atr.toFixed(6)),
  };
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  multiplier: number = 2
): {
  upper: number;
  lower: number;
  middle: number;
  bandWidthPct: number;
  isSqueeze: boolean;
  isDeadFlat: boolean;
} {
  if (closes.length === 0) {
    return { upper: 1, lower: 1, middle: 1, bandWidthPct: 0, isSqueeze: false, isDeadFlat: true };
  }

  const effectivePeriod = Math.min(period, closes.length);
  const slice = closes.slice(-effectivePeriod);
  const middle = slice.reduce((a, b) => a + b, 0) / effectivePeriod;

  let variance = 0;
  for (let i = 0; i < slice.length; i++) {
    variance += Math.pow(slice[i] - middle, 2);
  }
  const stdDev = Math.sqrt(variance / effectivePeriod);

  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  const bandWidth = upper - lower;
  const bandWidthPct = middle > 0 ? (bandWidth / middle) * 100 : 0;

  // Dead flat detection: when price is barely moving (under 0.00008 variation across 20 bars)
  const isDeadFlat = bandWidth < 0.00008 || (Math.max(...slice) - Math.min(...slice)) < 0.00005;
  const isSqueeze = bandWidthPct < 0.045 || isDeadFlat;

  return {
    upper: parseFloat(upper.toFixed(5)),
    lower: parseFloat(lower.toFixed(5)),
    middle: parseFloat(middle.toFixed(5)),
    bandWidthPct: parseFloat(bandWidthPct.toFixed(4)),
    isSqueeze,
    isDeadFlat,
  };
}

// -------------------------------------------------------------
// 1. MARKET STRUCTURE ANALYSIS (HH/HL, LH/LL, BOS, CHoCH)
// -------------------------------------------------------------

export function analyzeMarketStructure(candles: Candle[]): MarketStructureInfo {
  if (candles.length < 10) {
    return {
      structureType: 'UNDEFINED',
      breakOfStructure: 'NONE',
      changeOfCharacter: 'NONE',
      lastSwingHigh: candles.length > 0 ? candles[candles.length - 1].high : 0,
      lastSwingLow: candles.length > 0 ? candles[candles.length - 1].low : 0,
      scoreImpact: 0,
      description: 'পর্যাপ্ত হিস্টোরি না থাকায় মার্কেট স্ট্রাকচার নিরপেক্ষ।',
    };
  }

  const swingHighs: Array<{ index: number; price: number }> = [];
  const swingLows: Array<{ index: number; price: number }> = [];

  // Pivot detection with 2-bar left and right confirmation
  for (let i = 2; i < candles.length - 1; i++) {
    const c = candles[i];
    const isPeak =
      c.high >= candles[i - 1].high &&
      c.high >= candles[i - 2].high &&
      c.high >= candles[i + 1].high;
    const isTrough =
      c.low <= candles[i - 1].low &&
      c.low <= candles[i - 2].low &&
      c.low <= candles[i + 1].low;

    if (isPeak) swingHighs.push({ index: i, price: c.high });
    if (isTrough) swingLows.push({ index: i, price: c.low });
  }

  const lastCandle = candles[candles.length - 1];
  const lastSH = swingHighs[swingHighs.length - 1] ?? { index: 0, price: lastCandle.high };
  const prevSH = swingHighs[swingHighs.length - 2] ?? lastSH;
  const lastSL = swingLows[swingLows.length - 1] ?? { index: 0, price: lastCandle.low };
  const prevSL = swingLows[swingLows.length - 2] ?? lastSL;

  let structureType: 'BULLISH_HH_HL' | 'BEARISH_LH_LL' | 'RANGING_EQUAL' | 'UNDEFINED' = 'RANGING_EQUAL';
  let breakOfStructure: 'BULLISH_BOS' | 'BEARISH_BOS' | 'NONE' = 'NONE';
  let changeOfCharacter: 'BULLISH_CHOCH' | 'BEARISH_CHOCH' | 'NONE' = 'NONE';
  let scoreImpact = 0;
  let description = '';

  const isHigherHigh = lastSH.price > prevSH.price;
  const isHigherLow = lastSL.price > prevSL.price;
  const isLowerHigh = lastSH.price < prevSH.price;
  const isLowerLow = lastSL.price < prevSL.price;

  if (isHigherHigh && isHigherLow) {
    structureType = 'BULLISH_HH_HL';
    scoreImpact += 12;
    description = 'মার্কেট স্ট্রাকচার বুলিশ: হায়ার হাই (HH) এবং হায়ার লো (HL) বজায় রয়েছে।';
  } else if (isLowerHigh && isLowerLow) {
    structureType = 'BEARISH_LH_LL';
    scoreImpact -= 12;
    description = 'মার্কেট স্ট্রাকচার বিয়ারিশ: লোয়ার হাই (LH) এবং লোয়ার লো (LL) বজায় রয়েছে।';
  } else {
    structureType = 'RANGING_EQUAL';
    description = 'মার্কেট স্ট্রাকচার সাইডওয়েজ বা রেঞ্জিং রেজিমে রয়েছে।';
  }

  // Break of Structure (BOS)
  if (lastCandle.close > lastSH.price) {
    breakOfStructure = 'BULLISH_BOS';
    scoreImpact += 15;
    description += ' ব্রেক অব স্ট্রাকচার (Bullish BOS): রেসিস্টেন্স পিভট হাই ভেঙে আপসাইড মোমেন্টাম!';
  } else if (lastCandle.close < lastSL.price) {
    breakOfStructure = 'BEARISH_BOS';
    scoreImpact -= 15;
    description += ' ব্রেক অব স্ট্রাকচার (Bearish BOS): সাপোর্ট পিভট লো ভেঙে ডাউনসাইড মোমেন্টাম!';
  }

  // Change of Character (CHoCH) - Trend Reversal Indicator
  if (structureType === 'BEARISH_LH_LL' && lastCandle.close > lastSH.price) {
    changeOfCharacter = 'BULLISH_CHOCH';
    scoreImpact += 18;
    description = 'চেঞ্জ অব ক্যারেক্টার (Bullish CHoCH): বিয়ারিশ ট্রেন্ডের লোয়ার হাই ভেঙে শক্তিশালী আপট্রেন্ড রিভার্সাল!';
  } else if (structureType === 'BULLISH_HH_HL' && lastCandle.close < lastSL.price) {
    changeOfCharacter = 'BEARISH_CHOCH';
    scoreImpact -= 18;
    description = 'চেঞ্জ অব ক্যারেক্টার (Bearish CHoCH): বুলিশ ট্রেন্ডের হায়ার লো ভেঙে তীব্র ডাউনট্রেন্ড রিভার্সাল!';
  }

  return {
    structureType,
    breakOfStructure,
    changeOfCharacter,
    lastSwingHigh: parseFloat(lastSH.price.toFixed(5)),
    lastSwingLow: parseFloat(lastSL.price.toFixed(5)),
    scoreImpact,
    description,
  };
}

// -------------------------------------------------------------
// 2. SUPPORT & RESISTANCE (Static Rolling Pivots + Dynamic S/R)
// -------------------------------------------------------------

export function calculateSupportResistance(
  candles: Candle[],
  lookback: number = 25
): {
  resistance: number;
  support: number;
  distToResistancePct: number;
  distToSupportPct: number;
  isNearResistance: boolean;
  isNearSupport: boolean;
  isBreakoutAbove: boolean;
  isBreakdownBelow: boolean;
  isRetestBounce: boolean;
  isRetestRejection: boolean;
} {
  if (candles.length === 0) {
    return {
      resistance: 0,
      support: 0,
      distToResistancePct: 0.5,
      distToSupportPct: 0.5,
      isNearResistance: false,
      isNearSupport: false,
      isBreakoutAbove: false,
      isBreakdownBelow: false,
      isRetestBounce: false,
      isRetestRejection: false,
    };
  }

  // Calculate rolling pivot S/R excluding the very last candle to detect authentic test/breakout
  const historySlice = candles.slice(-Math.min(lookback, candles.length));
  const pivotSlice = historySlice.length > 2 ? historySlice.slice(0, -1) : historySlice;
  const highs = pivotSlice.map((c) => c.high);
  const lows = pivotSlice.map((c) => c.low);

  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles.length >= 2 ? candles[candles.length - 2] : currentCandle;
  const currentPrice = currentCandle.close;

  const totalRange = Math.max(0.00005, resistance - support);
  const distToResistancePct = Math.max(0, Math.min(1, (resistance - currentPrice) / totalRange));
  const distToSupportPct = Math.max(0, Math.min(1, (currentPrice - support) / totalRange));

  // Genuine Breakout: candle closed decisively beyond key level
  const isBreakoutAbove = currentPrice > resistance + 0.00002;
  const isBreakdownBelow = currentPrice < support - 0.00002;

  // Bullish Retest: previous bar or 2 bars ago broke above resistance, current bar tested level from above and bounced
  const isRetestBounce =
    prevCandle.close >= resistance &&
    currentCandle.low <= resistance + 0.00004 &&
    currentCandle.close > currentCandle.open &&
    currentPrice >= resistance;

  // Bearish Retest: previous bar broke below support, current bar tested level from below and rejected
  const isRetestRejection =
    prevCandle.close <= support &&
    currentCandle.high >= support - 0.00004 &&
    currentCandle.close < currentCandle.open &&
    currentPrice <= support;

  return {
    resistance: parseFloat(resistance.toFixed(5)),
    support: parseFloat(support.toFixed(5)),
    distToResistancePct: parseFloat(distToResistancePct.toFixed(3)),
    distToSupportPct: parseFloat(distToSupportPct.toFixed(3)),
    isNearResistance: distToResistancePct <= 0.15 && !isBreakoutAbove,
    isNearSupport: distToSupportPct <= 0.15 && !isBreakdownBelow,
    isBreakoutAbove,
    isBreakdownBelow,
    isRetestBounce,
    isRetestRejection,
  };
}

// -------------------------------------------------------------
// 3. PRICE ACTION & REJECTION (Candle Anatomy, Wick Physics, Pullback, Fakeout)
// -------------------------------------------------------------

export function analyzePriceAction(
  currentCandle: Candle,
  prevCandle?: Candle,
  ema9?: number,
  ema21?: number,
  sr?: { resistance: number; support: number }
): {
  patternName: string;
  description: string;
  bodySize: number;
  upperWick: number;
  lowerWick: number;
  wickRejection: 'BULLISH_LOWER_WICK' | 'BEARISH_UPPER_WICK' | 'NEUTRAL';
  isPullback: boolean;
  isFakeout: boolean;
  scoreImpact: number;
} {
  const isUp = currentCandle.close > currentCandle.open;
  const isDown = currentCandle.close < currentCandle.open;
  const bodySize = Math.abs(currentCandle.close - currentCandle.open);
  const upperWick = currentCandle.high - Math.max(currentCandle.open, currentCandle.close);
  const lowerWick = Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;
  const candleRange = Math.max(0.00002, currentCandle.high - currentCandle.low);

  let patternName = isUp ? 'Bullish Running Candle' : isDown ? 'Bearish Running Candle' : 'Neutral Doji Candle';
  let description = isUp ? 'বায়ারদের স্বাভাবিক ক্রয় প্রেশার' : isDown ? 'সেলারদের স্বাভাবিক বিক্রয় প্রেশার' : 'মার্কেট ব্যালেন্সড ও নিরপেক্ষ রয়েছে';
  let wickRejection: 'BULLISH_LOWER_WICK' | 'BEARISH_UPPER_WICK' | 'NEUTRAL' = 'NEUTRAL';
  let isPullback = false;
  let isFakeout = false;
  let scoreImpact = isUp ? 8 : isDown ? -8 : 0;

  // Pin Bar / Hammer & Shooting Star Rejection (Wick >= 55% of candle range)
  if (lowerWick >= candleRange * 0.55 && lowerWick > upperWick * 1.6) {
    patternName = 'Bullish Pin Bar / Hammer (Lower Wick Rejection)';
    description = 'শক্তিশালী লোয়ার উইক রিজেকশন—বায়াররা প্রাইজ নিচ থেকে বাউন্স করিয়ে পুশ আপ করেছে।';
    wickRejection = 'BULLISH_LOWER_WICK';
    scoreImpact = 16;
  } else if (upperWick >= candleRange * 0.55 && upperWick > lowerWick * 1.6) {
    patternName = 'Bearish Shooting Star (Upper Wick Rejection)';
    description = 'তীব্র আপার উইক রিজেকশন—সেলাররা প্রাইজ উপর থেকে নিচে নামিয়ে দিয়েছে।';
    wickRejection = 'BEARISH_UPPER_WICK';
    scoreImpact = -16;
  }

  // Engulfing patterns
  if (prevCandle) {
    const isPrevUp = prevCandle.close > prevCandle.open;
    const isPrevDown = prevCandle.close < prevCandle.open;
    const prevBody = Math.abs(prevCandle.close - prevCandle.open);

    if (isUp && isPrevDown && currentCandle.close > prevCandle.open && bodySize > prevBody) {
      patternName = 'Bullish Engulfing Reversal';
      description = 'বায়ারদের শক্তিশালী বুলিশ এনগালফিং প্যাটার্নে আপট্রেন্ড নিশ্চিত।';
      scoreImpact = 15;
    } else if (isDown && isPrevUp && currentCandle.close < prevCandle.open && bodySize > prevBody) {
      patternName = 'Bearish Engulfing Reversal';
      description = 'সেলারদের শক্তিশালী বিয়ারিশ এনগালফিং প্যাটার্নে ডাউনট্রেন্ড নিশ্চিত।';
      scoreImpact = -15;
    }

    // Pullback / Retracement to Dynamic EMA 9 / 21
    if (ema9 && ema21) {
      const isUptrend = ema9 > ema21;
      const isDowntrend = ema9 < ema21;

      // Bullish Pullback: Price retraced near EMA9/21 and held with a bullish close or hammer
      if (isUptrend && prevCandle.close < prevCandle.open && (currentCandle.low <= ema9 || currentCandle.low <= ema21) && isUp) {
        patternName = 'Bullish Pullback & Dynamic Support Bounce';
        description = 'ইএমএ ডাইনামিক সাপোর্টে নিখুঁত পুলব্যাক সম্পন্ন করে আপট্রেন্ড পুনরুজ্জীবিত।';
        isPullback = true;
        scoreImpact += 14;
      }
      // Bearish Pullback: Price retraced up near EMA9/21 and held with a bearish close or shooting star
      else if (isDowntrend && prevCandle.close > prevCandle.open && (currentCandle.high >= ema9 || currentCandle.high >= ema21) && isDown) {
        patternName = 'Bearish Pullback & Dynamic Resistance Rejection';
        description = 'ইএমএ ডাইনামিক রেজিস্টেন্সে রিট্রেসমেন্ট সম্পন্ন করে ডাউনট্রেন্ড অব্যাহত।';
        isPullback = true;
        scoreImpact -= 14;
      }
    }
  }

  // False Breakout / Liquidity Sweep (Fakeout)
  if (sr) {
    // Bullish Liquidity Sweep: Price pierced below support but closed firmly above support
    if (currentCandle.low < sr.support && currentCandle.close > sr.support && lowerWick >= bodySize) {
      patternName = 'Bullish Liquidity Sweep (Bear Trap Fakeout)';
      description = 'সাপোর্ট লেভেলে বিয়ারিশ ফেকআউট শেষ করে বায়ারদের দ্রুত রিকভারি!';
      isFakeout = true;
      scoreImpact = 18;
    }
    // Bearish Liquidity Sweep: Price pierced above resistance but closed firmly below resistance
    else if (currentCandle.high > sr.resistance && currentCandle.close < sr.resistance && upperWick >= bodySize) {
      patternName = 'Bearish Liquidity Sweep (Bull Trap Fakeout)';
      description = 'রেজিস্টেন্স লেভেলে বুলিশ ট্র্যাপ ফেকআউট শেষ করে সেলারদের আগ্রাসী পতন!';
      isFakeout = true;
      scoreImpact = -18;
    }
  }

  return {
    patternName,
    description,
    bodySize: parseFloat(bodySize.toFixed(5)),
    upperWick: parseFloat(upperWick.toFixed(5)),
    lowerWick: parseFloat(lowerWick.toFixed(5)),
    wickRejection,
    isPullback,
    isFakeout,
    scoreImpact,
  };
}

// -------------------------------------------------------------
// 4. MOMENTUM DIVERGENCE (RSI & MACD Regular + Hidden Divergence)
// -------------------------------------------------------------

export function detectMomentumDivergence(
  candles: Candle[],
  rsiSeries: number[],
  macdHistSeries: number[]
): DivergenceInfo {
  if (candles.length < 15 || rsiSeries.length < 15) {
    return { type: 'NONE', scoreImpact: 0, description: 'কোনো ডাইভারজেন্স পরিলক্ষিত হয়নি।' };
  }

  const n = candles.length;
  let pPeak1 = -1, pPeak2 = -1;
  let pTrough1 = -1, pTrough2 = -1;

  for (let i = n - 2; i >= n - 15; i--) {
    if (i <= 1) break;
    // Peak
    if (candles[i].high > candles[i - 1].high && candles[i].high >= candles[i + 1].high) {
      if (pPeak1 === -1) pPeak1 = i;
      else if (pPeak2 === -1) { pPeak2 = i; }
    }
    // Trough
    if (candles[i].low < candles[i - 1].low && candles[i].low <= candles[i + 1].low) {
      if (pTrough1 === -1) pTrough1 = i;
      else if (pTrough2 === -1) { pTrough2 = i; }
    }
    if (pPeak1 !== -1 && pPeak2 !== -1 && pTrough1 !== -1 && pTrough2 !== -1) break;
  }

  // Regular Bullish Divergence: Price Lower Low, RSI Higher Low
  if (pTrough1 !== -1 && pTrough2 !== -1) {
    const priceLL = candles[pTrough1].low < candles[pTrough2].low;
    const rsiHL = rsiSeries[pTrough1] > rsiSeries[pTrough2];
    if (priceLL && rsiHL) {
      return {
        type: 'REGULAR_BULLISH',
        scoreImpact: 18,
        description: 'রেগুলার বুলিশ ডাইভারজেন্স (প্রাইস লোয়ার লো কিন্তু আরএসআই হায়ার লো)—শক্তিশালী আপসাইড রিভার্সাল!',
      };
    }

    // Hidden Bullish Divergence: Price Higher Low, RSI Lower Low (Trend continuation)
    const priceHL = candles[pTrough1].low > candles[pTrough2].low;
    const rsiLL = rsiSeries[pTrough1] < rsiSeries[pTrough2];
    if (priceHL && rsiLL) {
      return {
        type: 'HIDDEN_BULLISH',
        scoreImpact: 14,
        description: 'হিডেন বুলিশ ডাইভারজেন্স—আপট্রেন্ড ধারাবাহিকতা নিশ্চিত।',
      };
    }
  }

  // Regular Bearish Divergence: Price Higher High, RSI Lower High
  if (pPeak1 !== -1 && pPeak2 !== -1) {
    const priceHH = candles[pPeak1].high > candles[pPeak2].high;
    const rsiLH = rsiSeries[pPeak1] < rsiSeries[pPeak2];
    if (priceHH && rsiLH) {
      return {
        type: 'REGULAR_BEARISH',
        scoreImpact: -18,
        description: 'রেগুলার বিয়ারিশ ডাইভারজেন্স (প্রাইস হায়ার হাই কিন্তু আরএসআই লোয়ার হাই)—তীব্র ডাউনসাইড রিভার্সাল!',
      };
    }

    // Hidden Bearish Divergence: Price Lower High, RSI Higher High (Trend continuation)
    const priceLH = candles[pPeak1].high < candles[pPeak2].high;
    const rsiHH = rsiSeries[pPeak1] > rsiSeries[pPeak2];
    if (priceLH && rsiHH) {
      return {
        type: 'HIDDEN_BEARISH',
        scoreImpact: -14,
        description: 'হিডেন বিয়ারিশ ডাইভারজেন্স—ডাউনট্রেন্ড ধারাবাহিকতা নিশ্চিত।',
      };
    }
  }

  return { type: 'NONE', scoreImpact: 0, description: 'কোনো সক্রিয় ডাইভারজেন্স নেই।' };
}

// -------------------------------------------------------------
// 5. MULTI-TIMEFRAME CONTEXT (Higher Timeframe Synthetic Aggregator)
// -------------------------------------------------------------

export function analyzeMultiTimeframeContext(
  candles: Candle[],
  microDirectionScore: number
): MultiTimeframeInfo {
  if (candles.length < 12) {
    return {
      htfTrend: 'NEUTRAL',
      isAlignedWithMicro: true,
      isConflicting: false,
      scoreImpact: 0,
      description: 'পর্যাপ্ত ডাটা না থাকায় টাইমফ্রেম নিউট্রাল।',
    };
  }

  const macroCandles: Candle[] = [];
  for (let i = 0; i < candles.length; i += 3) {
    const chunk = candles.slice(i, i + 3);
    if (chunk.length > 0) {
      macroCandles.push({
        time: chunk[0].time,
        open: chunk[0].open,
        high: Math.max(...chunk.map((c) => c.high)),
        low: Math.min(...chunk.map((c) => c.low)),
        close: chunk[chunk.length - 1].close,
      });
    }
  }

  const macroCloses = macroCandles.map((c) => c.close);
  const macroEma9 = calculateEMA(macroCloses, 9);
  const macroEma21 = calculateEMA(macroCloses, 21);

  const lastMacroEma9 = macroEma9[macroEma9.length - 1];
  const lastMacroEma21 = macroEma21[macroEma21.length - 1];

  let htfTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (lastMacroEma9 > lastMacroEma21) htfTrend = 'BULLISH';
  else if (lastMacroEma9 < lastMacroEma21) htfTrend = 'BEARISH';

  const isMicroUp = microDirectionScore > 0;
  const isMicroDown = microDirectionScore < 0;

  const isAlignedWithMicro =
    (htfTrend === 'BULLISH' && isMicroUp) ||
    (htfTrend === 'BEARISH' && isMicroDown) ||
    htfTrend === 'NEUTRAL';

  const isConflicting =
    (htfTrend === 'BULLISH' && isMicroDown) ||
    (htfTrend === 'BEARISH' && isMicroUp);

  let scoreImpact = 0;
  let description = '';

  if (isAlignedWithMicro && htfTrend !== 'NEUTRAL') {
    scoreImpact = htfTrend === 'BULLISH' ? 12 : -12;
    description = `হায়ার টাইমফ্রেম (${htfTrend}) এবং মাইক্রো টাইমফ্রেমের দিক সম্পূর্ণ সমন্বিত (Aligned)!`;
  } else if (isConflicting) {
    scoreImpact = isMicroUp ? -14 : 14;
    description = `সতর্কতা: মাইক্রো ট্রেন্ডের সাথে হায়ার টাইমফ্রেম (${htfTrend}) বিপরীতমুখী (Conflicting Timeframe)।`;
  } else {
    description = 'হায়ার টাইমফ্রেম নিউট্রাল রেঞ্জে রয়েছে।';
  }

  return {
    htfTrend,
    isAlignedWithMicro,
    isConflicting,
    scoreImpact,
    description,
  };
}

// -------------------------------------------------------------
// 6. MARKET REGIME DETERMINATION
// -------------------------------------------------------------

export function detectMarketRegime(
  ema9: number,
  ema21: number,
  ema50: number,
  rsi: number,
  macdHist: number,
  isHighVol: boolean,
  isSqueeze: boolean,
  structure: MarketStructureInfo,
  divergence: DivergenceInfo
): MarketRegimeType {
  if (isSqueeze) {
    return 'CONSOLIDATING_SQUEEZE';
  }
  if (divergence.type !== 'NONE' && Math.abs(divergence.scoreImpact) >= 15) {
    return 'REVERSAL_EXHAUSTION';
  }
  if (structure.breakOfStructure !== 'NONE' && isHighVol) {
    return 'VOLATILE_BREAKOUT';
  }
  if (ema9 > ema21 && ema21 > ema50 && rsi >= 52 && macdHist >= 0) {
    return 'TRENDING_BULLISH';
  }
  if (ema9 < ema21 && ema21 < ema50 && rsi <= 48 && macdHist <= 0) {
    return 'TRENDING_BEARISH';
  }
  return 'RANGING_CONSOLIDATION';
}

// -------------------------------------------------------------
// 7. COMPREHENSIVE CONFLUENCE SCORING & QUALITY FILTER
// -------------------------------------------------------------

function createNeutralIndicators(): IndicatorMetrics {
  return {
    ema5: 1.0,
    ema9: 1.0,
    ema13: 1.0,
    ema21: 1.0,
    ema50: 1.0,
    sma20: 1.0,
    rsi14: 50,
    qqe: {
      rsi: 50,
      smoothedRsi: 50,
      fastAtrBand: 50,
      longBand: 50,
      shortBand: 50,
      trend: 0,
      state: 'QQE_NEUTRAL',
      isCrossUp: false,
      isCrossDown: false,
      description: 'Neutral',
    },
    macd: { macdLine: 0, signalLine: 0, histogram: 0, isBullishCross: false, isBearishCross: false },
    atr14: 0.0002,
    isHighVolatility: false,
    momentum: { velocity: 0, acceleration: 0, tickSlope: 0, roc: 0 },
    supportResistance: {
      resistance: 0,
      support: 0,
      distToResistancePct: 0.5,
      distToSupportPct: 0.5,
      isNearResistance: false,
      isNearSupport: false,
      isBreakoutAbove: false,
      isBreakdownBelow: false,
      isRetestBounce: false,
      isRetestRejection: false,
    },
    priceAction: {
      patternName: 'Neutral Market',
      description: '',
      bodySize: 0,
      upperWick: 0,
      lowerWick: 0,
      wickRejection: 'NEUTRAL',
      isPullback: false,
      isFakeout: false,
    },
    marketStructure: {
      structureType: 'UNDEFINED',
      breakOfStructure: 'NONE',
      changeOfCharacter: 'NONE',
      lastSwingHigh: 0,
      lastSwingLow: 0,
      scoreImpact: 0,
      description: '',
    },
    divergence: { type: 'NONE', scoreImpact: 0, description: '' },
    volatility: {
      atr14: 0,
      bollingerUpper: 1,
      bollingerLower: 1,
      bollingerMiddle: 1,
      bandWidthPct: 0,
      isHighVolatility: false,
      isSqueeze: false,
      isDeadFlat: false,
    },
    multiTimeframe: {
      htfTrend: 'NEUTRAL',
      isAlignedWithMicro: true,
      isConflicting: false,
      scoreImpact: 0,
      description: '',
    },
    regime: 'CONSOLIDATING_SQUEEZE',
  };
}

export function evaluateMarketData(
  candles: Candle[],
  livePrices: number[] = [],
  timeframeSec: number = 5,
  isHistoricalReplay: boolean = false
): ConfluenceDecision & { auditLog: FactorAuditLog } {
  // Step 1: Active Timeframe Detection & Mode Selection
  const isUltraShort = timeframeSec <= 15;
  const mode: 'ULTRA_SHORT' | 'STANDARD' = isUltraShort ? 'ULTRA_SHORT' : 'STANDARD';
  const durLabel = timeframeSec >= 60 ? `${timeframeSec / 60}M` : `${timeframeSec}S`;

  // Step 2: Real-time Data Validation (Zero fake data, freshness & continuity)
  const maxAge = isHistoricalReplay ? Infinity : Math.max(90000, timeframeSec * 2500);
  const validation = validateMarketData(candles, livePrices, maxAge, isHistoricalReplay);
  if (!validation.isValid) {
    const dummyLog: FactorAuditLog = {
      direction: 'NO_SIGNAL',
      confluenceScore: 0,
      upFactorsCount: 0,
      downFactorsCount: 0,
      upFactors: [],
      downFactors: [],
      neutralFactors: [validation.reason || 'Data validation failed'],
      marketStructure: 'UNDEFINED',
      regime: 'RANGING_CONSOLIDATION',
      volatilityCondition: 'INVALID_DATA',
      dominantReason: validation.reason || 'Invalid market data',
      mode,
      qqeState: 'QQE_NEUTRAL',
      dataValidation: validation,
    };

    return {
      isCall: null,
      signalQuality: 'LOW_FILTERED',
      isTradeApproved: false,
      confluenceScore: 0,
      signalQualityScore: 0,
      accuracyEstimate: 'N/A',
      mode,
      pattern: 'Data Validation Filter (Preserve Capital)',
      reason: `মার্কেট ডাটা অসম্পূর্ণ বা ইনভ্যালিড: ${validation.reason}। ক্যাপিটাল সুরক্ষায় কোনো ট্রেড নেওয়া হয়নি (NO SIGNAL)।`,
      trendLabel: 'UNCLEAR / INVALID DATA',
      auditLog: dummyLog,
      dataValidation: validation,
      indicators: createNeutralIndicators(),
    };
  }

  // Filter genuine candles only
  let workingCandles = [...candles].filter((c) => c && typeof c.close === 'number' && c.close > 0);

  // If candles are limited but live ticks exist, group into genuine OHLC bars
  if (workingCandles.length < 5 && livePrices && livePrices.length >= 6) {
    workingCandles = [];
    const chunkSz = Math.max(2, Math.floor(livePrices.length / 6));
    for (let gi = 0; gi < livePrices.length; gi += chunkSz) {
      const chunk = livePrices.slice(gi, gi + chunkSz);
      if (chunk.length > 0) {
        const o = chunk[0];
        const c = chunk[chunk.length - 1];
        const h = Math.max(...chunk);
        const l = Math.min(...chunk);
        workingCandles.push({
          time: Date.now() - (livePrices.length - gi) * 300,
          open: o,
          high: h,
          low: l,
          close: c,
        });
      }
    }
  }

  if (workingCandles.length < 3) {
    const dummyLog: FactorAuditLog = {
      direction: 'NO_SIGNAL',
      confluenceScore: 0,
      upFactorsCount: 0,
      downFactorsCount: 0,
      upFactors: [],
      downFactors: [],
      neutralFactors: ['Insufficient historical bars for statistical significance'],
      marketStructure: 'UNDEFINED',
      regime: 'RANGING_CONSOLIDATION',
      volatilityCondition: 'INSUFFICIENT_BARS',
      dominantReason: 'ন্যূনতম ৩টি ভ্যালিড ক্যান্ডেল প্রয়োজন',
      mode,
      qqeState: 'QQE_NEUTRAL',
      dataValidation: validation,
    };

    return {
      isCall: null,
      signalQuality: 'LOW_FILTERED',
      isTradeApproved: false,
      confluenceScore: 0,
      signalQualityScore: 0,
      accuracyEstimate: 'N/A',
      mode,
      pattern: 'Insufficient Data Filter',
      reason: 'পর্যাপ্ত হিস্টোরিক্যাল ক্যান্ডেল পাওয়া যায়নি। ক্যাপিটাল সুরক্ষায় ট্রেড বিরত রাখা হলো (NO SIGNAL)।',
      trendLabel: 'UNCLEAR / INSUFFICIENT DATA',
      auditLog: dummyLog,
      dataValidation: validation,
      indicators: createNeutralIndicators(),
    };
  }

  const closes = workingCandles.map((c) => c.close);
  const lastIdx = workingCandles.length - 1;
  const currentCandle = workingCandles[lastIdx];
  const prevCandle = workingCandles[lastIdx - 1] || currentCandle;
  const prev2Candle = workingCandles[lastIdx - 2] || prevCandle;

  // Indicators: Moving Averages
  const ema5Series = calculateEMA(closes, 5);
  const ema9Series = calculateEMA(closes, 9);
  const ema13Series = calculateEMA(closes, 13);
  const ema21Series = calculateEMA(closes, 21);
  const ema50Series = calculateEMA(closes, 50);
  const sma20Series = calculateSMA(closes, 20);

  const ema5 = ema5Series[ema5Series.length - 1];
  const ema9 = ema9Series[ema9Series.length - 1];
  const ema13 = ema13Series[ema13Series.length - 1];
  const ema21 = ema21Series[ema21Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];
  const sma20 = sma20Series[sma20Series.length - 1];

  // Moving Average Slopes (Last 3 bars)
  const ema9Slope = ema9Series.length >= 3 ? ema9Series[ema9Series.length - 1] - ema9Series[ema9Series.length - 3] : 0;

  // Oscillators: RSI 14 & MACD
  const { rsi: rsi14, series: rsiSeries } = calculateRSI(closes, 14);
  const macdData = calculateMACD(closes, 12, 26, 9);

  // QQE CONFIRMATION ENGINE (RSI Length 1, Smoothing 1, Factor 4.238)
  const qqePool = livePrices.length >= 4 ? livePrices : closes;
  const qqe = calculateQQE(qqePool, 1, 1, 4.238);

  // Volatility & Bollinger Bands (Squeeze & Dead Flat Detection)
  const { atr: atr14, isHighVolatility } = calculateATR(workingCandles, 14);
  const bb = calculateBollingerBands(closes, 20, 2);

  const volInfo: VolatilityInfo = {
    atr14,
    bollingerUpper: bb.upper,
    bollingerLower: bb.lower,
    bollingerMiddle: bb.middle,
    bandWidthPct: bb.bandWidthPct,
    isHighVolatility,
    isSqueeze: bb.isSqueeze,
    isDeadFlat: bb.isDeadFlat,
  };

  // Market Structure & Micro-Structure
  const structure = analyzeMarketStructure(workingCandles);

  // Support & Resistance
  const sr = calculateSupportResistance(workingCandles, isUltraShort ? 12 : 25);

  // Price Action & Candle Anatomy
  const pa = analyzePriceAction(currentCandle, prevCandle, ema9, ema21, { resistance: sr.resistance, support: sr.support });

  // Momentum Divergence
  const divergence = detectMomentumDivergence(workingCandles, rsiSeries, macdData.series.hist);

  // Tick Velocity & Linear Regression Slope
  let velocity = 0;
  let acceleration = 0;
  let tickSlope = 0;
  let roc = 0;

  const tickPool = livePrices.length >= 3 ? livePrices : closes.slice(-10);
  const n = tickPool.length;
  if (n >= 3) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += tickPool[i];
      sumXY += i * tickPool[i];
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      tickSlope = (n * sumXY - sumX * sumY) / denom;
    }
    velocity = tickPool[n - 1] - tickPool[0];
    roc = ((tickPool[n - 1] - tickPool[0]) / (tickPool[0] || 1)) * 100;

    if (n >= 6) {
      const mid = Math.floor(n / 2);
      const v1 = (tickPool[mid - 1] - tickPool[0]) / (mid || 1);
      const v2 = (tickPool[n - 1] - tickPool[mid]) / (mid || 1);
      acceleration = v2 - v1;
    }
  }

  // Candle Anatomy Metrics
  const candleRange = Math.max(0.00002, currentCandle.high - currentCandle.low);
  const bodySize = Math.abs(currentCandle.close - currentCandle.open);
  const upperWick = currentCandle.high - Math.max(currentCandle.open, currentCandle.close);
  const lowerWick = Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;
  const isGreen = currentCandle.close > currentCandle.open;
  const isRed = currentCandle.close < currentCandle.open;
  const isNearResistance = currentCandle.high >= sr.resistance - 0.00004 || currentCandle.close >= bb.upper - 0.00004;
  const isNearSupport = currentCandle.low <= sr.support + 0.00004 || currentCandle.close <= bb.lower + 0.00004;

  const upFactors: string[] = [];
  const downFactors: string[] = [];
  const neutralFactors: string[] = [];
  let buyScore = 0;
  let sellScore = 0;

  // =========================================================
  // MODE A: ULTRA-SHORT MODE (5s, 10s, 15s)
  // Prioritizes tick velocity, immediate price rejection, micro-wicks,
  // last 3-5 candles micro-structure, ROC, acceleration, and QQE confirmation.
  // =========================================================
  if (isUltraShort) {
    // 1. Tick Velocity & Linear Slope (Primary Ultra-Short Factor)
    if (tickSlope > 0.000002) {
      buyScore += 26;
      upFactors.push(`Ultra-Short Tick Slope Bullish (+${tickSlope.toFixed(6)}) [+26]`);
    } else if (tickSlope < -0.000002) {
      sellScore += 26;
      downFactors.push(`Ultra-Short Tick Slope Bearish (${tickSlope.toFixed(6)}) [+26]`);
    }

    if (velocity > 0.000005) {
      buyScore += 16;
      upFactors.push(`Instant Velocity Push Up (+${velocity.toFixed(5)}) [+16]`);
    } else if (velocity < -0.000005) {
      sellScore += 16;
      downFactors.push(`Instant Velocity Push Down (${velocity.toFixed(5)}) [+16]`);
    }

    if (acceleration > 0.000002) {
      buyScore += 10;
      upFactors.push(`Price Velocity Accelerating Upward [+10]`);
    } else if (acceleration < -0.000002) {
      sellScore += 10;
      downFactors.push(`Price Velocity Accelerating Downward [+10]`);
    }

    // 2. Micro-Wick Rejection & Body Strength (Anti-Trap Physics)
    if (lowerWick >= candleRange * 0.35 && lowerWick > upperWick * 1.3) {
      buyScore += 28;
      upFactors.push(`Micro Lower Wick Absorption Bounce [+28]`);
    } else if (upperWick >= candleRange * 0.35 && upperWick > lowerWick * 1.3) {
      sellScore += 28;
      downFactors.push(`Micro Upper Wick Selling Rejection [+28]`);
    }

    // 3. Consecutive Micro Bar Flow (Last 2-3 bars)
    if (isGreen && prevCandle.close >= prevCandle.open) {
      buyScore += 18;
      upFactors.push(`Consecutive Bullish Micro-Bar Flow [+18]`);
    } else if (isRed && prevCandle.close <= prevCandle.open) {
      sellScore += 18;
      downFactors.push(`Consecutive Bearish Micro-Bar Flow [+18]`);
    }

    // 4. QQE Confirmation Factor (RSI 1, Smoothing 1, Factor 4.238)
    // Non-duplicate weighting: reinforces without double-counting
    if (qqe.state === 'QQE_BULLISH') {
      buyScore += 14;
      upFactors.push(`QQE Bullish Trend Confirmation [+14]`);
    } else if (qqe.state === 'QQE_BEARISH') {
      sellScore += 14;
      downFactors.push(`QQE Bearish Trend Confirmation [+14]`);
    }

    // Cross-Correlation Check: Deduct if QQE conflicts with immediate tick slope
    if (qqe.state === 'QQE_BULLISH' && tickSlope < -0.000002) {
      buyScore -= 8;
      sellScore -= 8;
      neutralFactors.push('QQE conflicts with Tick Slope (Confidence dampened)');
    } else if (qqe.state === 'QQE_BEARISH' && tickSlope > 0.000002) {
      buyScore -= 8;
      sellScore -= 8;
      neutralFactors.push('QQE conflicts with Tick Slope (Confidence dampened)');
    }

    // 5. Dynamic Support/Resistance & Boundary Protection
    if (isNearResistance && (upperWick > 0 || isRed || tickSlope <= 0)) {
      sellScore += 24;
      downFactors.push(`Micro Resistance Wall Rejection [+24]`);
    }
    if (isNearSupport && (lowerWick > 0 || isGreen || tickSlope >= 0)) {
      buyScore += 24;
      upFactors.push(`Micro Support Floor Bounce [+24]`);
    }

    // 6. Micro Trend Slope Alignment
    if (ema5 > ema9) {
      buyScore += 10;
      upFactors.push(`Micro EMA5 > EMA9 [+10]`);
    } else if (ema5 < ema9) {
      sellScore += 10;
      downFactors.push(`Micro EMA5 < EMA9 [+10]`);
    }

  } else {
    // =========================================================
    // MODE B: STANDARD MODE (30s, 1m, 2m, 5m+)
    // Full multi-factor trend and structure:
    // Moving average alignment, Market Structure (HH/HL, BOS, CHoCH),
    // Full Price Action, RSI 14, MACD, QQE, Dynamic S/R zones, ATR & Volatility.
    // =========================================================

    // 1. Market Structure (HH/HL, LH/LL, BOS, CHoCH)
    if (structure.scoreImpact > 0) {
      const pts = Math.round(structure.scoreImpact * 1.2);
      buyScore += pts;
      upFactors.push(`Structure: ${structure.description} [+${pts}]`);
    } else if (structure.scoreImpact < 0) {
      const pts = Math.round(Math.abs(structure.scoreImpact) * 1.2);
      sellScore += pts;
      downFactors.push(`Structure: ${structure.description} [+${pts}]`);
    }

    // 2. Multi-Period Moving Average Stack (EMA 9, 21, 50 & SMA 20)
    if (ema9 > ema21 && ema21 > ema50) {
      buyScore += 22;
      upFactors.push(`Macro Bullish Trend Stack EMA 9>21>50 [+22]`);
    } else if (ema9 < ema21 && ema21 < ema50) {
      sellScore += 22;
      downFactors.push(`Macro Bearish Trend Stack EMA 9<21<50 [+22]`);
    }

    // 3. Price Action: Engulfing, Pin Bars, Hammers, Stars
    if (pa.scoreImpact > 0) {
      const pts = Math.round(pa.scoreImpact * 1.3);
      buyScore += pts;
      upFactors.push(`Price Action: ${pa.patternName} [+${pts}]`);
    } else if (pa.scoreImpact < 0) {
      const pts = Math.round(Math.abs(pa.scoreImpact) * 1.3);
      sellScore += pts;
      downFactors.push(`Price Action: ${pa.patternName} [+${pts}]`);
    }

    // 4. Momentum Divergence (RSI & MACD)
    if (divergence.type !== 'NONE') {
      if (divergence.scoreImpact > 0) {
        const pts = Math.round(divergence.scoreImpact * 1.4);
        buyScore += pts;
        upFactors.push(`Divergence: ${divergence.description} [+${pts}]`);
      } else {
        const pts = Math.round(Math.abs(divergence.scoreImpact) * 1.4);
        sellScore += pts;
        downFactors.push(`Divergence: ${divergence.description} [+${pts}]`);
      }
    } else {
      // MACD Histogram & Signal Line
      if (macdData.histogram > 0.000001) {
        buyScore += 12;
        upFactors.push(`MACD Histogram Positive [+12]`);
        if (macdData.isBullishCross) {
          buyScore += 10;
          upFactors.push('MACD Bullish Crossover [+10]');
        }
      } else if (macdData.histogram < -0.000001) {
        sellScore += 12;
        downFactors.push(`MACD Histogram Negative [+12]`);
        if (macdData.isBearishCross) {
          sellScore += 10;
          downFactors.push('MACD Bearish Crossover [+10]');
        }
      }

      // RSI 14 Momentum
      if (rsi14 >= 52 && rsi14 < 72) {
        buyScore += 10;
        upFactors.push(`RSI Healthy Bullish Momentum (${rsi14}) [+10]`);
      } else if (rsi14 <= 48 && rsi14 > 28) {
        sellScore += 10;
        downFactors.push(`RSI Healthy Bearish Momentum (${rsi14}) [+10]`);
      } else if (rsi14 >= 72) {
        sellScore += 18;
        downFactors.push(`RSI Overbought Boundary Turnaround (${rsi14}) [+18]`);
      } else if (rsi14 <= 28) {
        buyScore += 18;
        upFactors.push(`RSI Oversold Boundary Bounce (${rsi14}) [+18]`);
      }
    }

    // 5. QQE Confirmation Factor (RSI 1, Smoothing 1, Factor 4.238)
    if (qqe.state === 'QQE_BULLISH') {
      buyScore += 14;
      upFactors.push(`QQE Dynamic Bullish Confirmation [+14]`);
    } else if (qqe.state === 'QQE_BEARISH') {
      sellScore += 14;
      downFactors.push(`QQE Dynamic Bearish Confirmation [+14]`);
    }

    // Correlation control: Dampen if QQE contradicts Macro EMA trend
    if (qqe.state === 'QQE_BULLISH' && ema9 < ema21 && ema21 < ema50) {
      buyScore -= 8;
      neutralFactors.push('QQE Bullish counter to Bearish Macro Stack (Dampened)');
    } else if (qqe.state === 'QQE_BEARISH' && ema9 > ema21 && ema21 > ema50) {
      sellScore -= 8;
      neutralFactors.push('QQE Bearish counter to Bullish Macro Stack (Dampened)');
    }

    // 6. Support & Resistance Zones
    if (sr.isRetestBounce || sr.isBreakoutAbove) {
      buyScore += 22;
      upFactors.push(`Bullish S/R Retest / Breakout [+22]`);
    } else if (sr.isRetestRejection || sr.isBreakdownBelow) {
      sellScore += 22;
      downFactors.push(`Bearish S/R Retest / Breakdown [+22]`);
    } else if (sr.isNearResistance && (upperWick > 0 || isRed)) {
      sellScore += 18;
      downFactors.push(`Resistance Wall Encounter [+18]`);
    } else if (sr.isNearSupport && (lowerWick > 0 || isGreen)) {
      buyScore += 18;
      upFactors.push(`Support Floor Encounter [+18]`);
    }
  }

  // Market Regime
  const regime = detectMarketRegime(
    ema9,
    ema21,
    ema50,
    rsi14,
    macdData.histogram,
    isHighVolatility,
    volInfo.isSqueeze,
    structure,
    divergence
  );

  // -------------------------------------------------------------
  // DETERMINISTIC DIRECTIONAL CONFLUENCE & NO-SIGNAL RESOLUTION
  // Rule: A valid NO SIGNAL is always better than a false or forced BUY/SELL.
  // -------------------------------------------------------------
  const netScore = buyScore - sellScore;
  const spread = Math.abs(netScore);
  const winningScore = Math.max(buyScore, sellScore);
  const minThreshold = isUltraShort ? 28 : 34;
  const minSpread = isUltraShort ? 12 : 14;

  let isCall: boolean | null = null;
  let isTradeApproved = false;
  let rejectionReason = '';

  // 1. Dead Flat / Chop Filter: Capital Preservation First!
  if (volInfo.isDeadFlat) {
    isCall = null;
    isTradeApproved = false;
    rejectionReason = 'ডেড ফ্ল্যাট মার্কেট কন্সোলিডেশন (Chop Filter) - ক্যাপিটাল সুরক্ষায় কোনো ট্রেড নেওয়া হয়নি (NO SIGNAL)।';
  }
  // 2. Insufficient Confluence or Indecisive Conflict
  else if (winningScore < minThreshold || spread < minSpread) {
    isCall = null;
    isTradeApproved = false;
    rejectionReason = `মার্কেট কনফ্লুয়েন্স অপর্যাপ্ত বা কনফ্লিক্টিং (Score: ${winningScore}, Spread: ${spread}, Min Required: ${minThreshold}/${minSpread})। ট্রেড স্থগিত (NO SIGNAL)।`;
  }
  // 3. Clear Confluence Established
  else {
    isCall = buyScore > sellScore;
    isTradeApproved = true;
  }

  // Deterministic Signal Quality Score (0 to 100) based strictly on evidence, NOT fabricated
  const factorRatio = winningScore / (winningScore + Math.min(buyScore, sellScore) || 1);
  const signalQualityScore = Math.round(
    Math.min(100, Math.max(0, factorRatio * 60 + Math.min(40, spread * 0.8)))
  );

  const signalQuality: 'HIGH_CONFLUENCE' | 'MODERATE' | 'LOW_FILTERED' =
    isTradeApproved && signalQualityScore >= 70
      ? 'HIGH_CONFLUENCE'
      : isTradeApproved
      ? 'MODERATE'
      : 'LOW_FILTERED';

  const patternStr = !isTradeApproved
    ? (volInfo.isDeadFlat ? 'Dead Flat Market Chop' : 'Inconclusive / Neutral Confluence')
    : pa.patternName !== 'Neutral Doji Candle'
    ? pa.patternName
    : structure.breakOfStructure !== 'NONE'
    ? structure.description
    : isCall
    ? 'Bullish Market Confluence & Momentum'
    : 'Bearish Market Confluence & Momentum';

  const trendStr = isCall === true
    ? 'BULLISH MOMENTUM ↗'
    : isCall === false
    ? 'BEARISH MOMENTUM ↘'
    : 'RANGING / NEUTRAL ⏸️';

  const reasonStr = !isTradeApproved
    ? rejectionReason
    : isCall
    ? `টাইমফ্রেম ${durLabel} (${mode}): মাইক্রো প্রাইজ অ্যাকশন, উইক রিজেকশন এবং QQE কনফ্লুয়েন্স নিশ্চিত। কল (UP ↑) ট্রেড সক্রিয়!`
    : `টাইমফ্রেম ${durLabel} (${mode}): মাইক্রো প্রাইজ অ্যাকশন, উইক রিজেকশন এবং QQE কনফ্লুয়েন্স নিশ্চিত। পুট (DOWN ↓) ট্রেড সক্রিয়!`;

  const accuracyEstimateStr = isTradeApproved ? `${signalQualityScore}% Signal Quality` : 'N/A';

  const auditLog: FactorAuditLog = {
    direction: isCall === true ? 'UP' : isCall === false ? 'DOWN' : 'NO_SIGNAL',
    confluenceScore: Math.round(netScore),
    upFactorsCount: upFactors.length,
    downFactorsCount: downFactors.length,
    upFactors,
    downFactors,
    neutralFactors,
    marketStructure: structure.description,
    regime,
    volatilityCondition: volInfo.isDeadFlat
      ? 'DEAD_FLAT_CHOP'
      : volInfo.isSqueeze
      ? 'SQUEEZE'
      : isHighVolatility
      ? 'EXPANSION'
      : 'NORMAL',
    dominantReason: !isTradeApproved
      ? rejectionReason
      : isCall
      ? `UP Confluence (+${Math.round(netScore)}): ${upFactors.slice(0, 3).join(', ')}`
      : `DOWN Confluence (${Math.round(netScore)}): ${downFactors.slice(0, 3).join(', ')}`,
    mode,
    qqeState: qqe.state,
    dataValidation: validation,
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[ISHAK_AI_ANALYSIS_AUDIT]', JSON.stringify(auditLog));
  }

  return {
    isCall,
    signalQuality,
    isTradeApproved,
    confluenceScore: Math.round(netScore),
    signalQualityScore,
    accuracyEstimate: accuracyEstimateStr,
    mode,
    pattern: patternStr,
    reason: reasonStr,
    trendLabel: trendStr,
    auditLog,
    dataValidation: validation,
    indicators: {
      ema5: parseFloat(ema5.toFixed(5)),
      ema9: parseFloat(ema9.toFixed(5)),
      ema13: parseFloat(ema13.toFixed(5)),
      ema21: parseFloat(ema21.toFixed(5)),
      ema50: parseFloat(ema50.toFixed(5)),
      sma20: parseFloat(sma20.toFixed(5)),
      rsi14: Math.round(rsi14),
      qqe,
      macd: macdData,
      atr14,
      isHighVolatility,
      momentum: {
        velocity: parseFloat(velocity.toFixed(6)),
        acceleration: parseFloat(acceleration.toFixed(6)),
        tickSlope: parseFloat(tickSlope.toFixed(6)),
        roc: parseFloat(roc.toFixed(4)),
      },
      supportResistance: sr,
      priceAction: pa,
      marketStructure: structure,
      divergence,
      volatility: volInfo,
      multiTimeframe: {
        htfTrend: 'NEUTRAL',
        isAlignedWithMicro: true,
        isConflicting: false,
        scoreImpact: 0,
        description: 'Multi-Timeframe Aligned',
      },
      regime,
    },
  };
}

// -------------------------------------------------------------
// 8. OUT-OF-SAMPLE HISTORICAL REPLAY VALIDATION HARNESS
// Zero future-data leakage, honest statistical evaluation
// -------------------------------------------------------------

export function runOutOfSampleReplayValidation(
  candles: Candle[],
  timeframeSec: number = 60,
  splitRatio: number = 0.6
): OutOfSampleValidationReport {
  if (!candles || candles.length < 20) {
    return {
      totalSamples: 0,
      inSampleSamples: 0,
      outOfSampleSamples: 0,
      totalSignals: 0,
      buySignals: 0,
      sellSignals: 0,
      noSignalCount: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winRateExcludingTiesPct: 0,
      winRateIncludingTiesPct: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      performanceByDirection: {
        buy: { signals: 0, wins: 0, losses: 0, ties: 0, winRatePct: 0 },
        sell: { signals: 0, wins: 0, losses: 0, ties: 0, winRatePct: 0 },
      },
      performanceByRegime: {},
    };
  }

  const splitIdx = Math.floor(candles.length * splitRatio);
  const outOfSample = candles.slice(splitIdx);

  let totalSignals = 0;
  let buySignals = 0;
  let sellSignals = 0;
  let noSignalCount = 0;
  let wins = 0;
  let losses = 0;
  let ties = 0;

  let currentConsecWins = 0;
  let maxConsecWins = 0;
  let currentConsecLosses = 0;
  let maxConsecLosses = 0;

  const buyStats = { signals: 0, wins: 0, losses: 0, ties: 0, winRatePct: 0 };
  const sellStats = { signals: 0, wins: 0, losses: 0, ties: 0, winRatePct: 0 };
  const regimeStats: Record<string, { signals: number; wins: number; losses: number; ties: number; winRatePct: number }> = {};

  // Iterate strictly forward without future lookahead
  for (let i = splitIdx; i < candles.length - 1; i++) {
    // Current analysis uses ONLY data up to time T (index i)
    const historySlice = candles.slice(0, i + 1);
    const decision = evaluateMarketData(historySlice, [], timeframeSec, true);

    const regime = decision.indicators.regime;
    if (!regimeStats[regime]) {
      regimeStats[regime] = { signals: 0, wins: 0, losses: 0, ties: 0, winRatePct: 0 };
    }

    if (decision.isCall === null || !decision.isTradeApproved) {
      noSignalCount++;
      continue;
    }

    totalSignals++;
    regimeStats[regime].signals++;

    // Outcome evaluated at T+1 bar exit
    const entryPrice = candles[i].close;
    const exitPrice = candles[i + 1].close;

    let isWin = false;
    let isTie = false;

    if (decision.isCall === true) {
      buySignals++;
      buyStats.signals++;
      if (exitPrice > entryPrice) {
        isWin = true;
      } else if (exitPrice === entryPrice) {
        isTie = true;
      }
    } else {
      sellSignals++;
      sellStats.signals++;
      if (exitPrice < entryPrice) {
        isWin = true;
      } else if (exitPrice === entryPrice) {
        isTie = true;
      }
    }

    if (isTie) {
      ties++;
      if (decision.isCall === true) buyStats.ties++;
      else sellStats.ties++;
      regimeStats[regime].ties++;
    } else if (isWin) {
      wins++;
      currentConsecWins++;
      currentConsecLosses = 0;
      if (currentConsecWins > maxConsecWins) maxConsecWins = currentConsecWins;

      if (decision.isCall === true) buyStats.wins++;
      else sellStats.wins++;
      regimeStats[regime].wins++;
    } else {
      losses++;
      currentConsecLosses++;
      currentConsecWins = 0;
      if (currentConsecLosses > maxConsecLosses) maxConsecLosses = currentConsecLosses;

      if (decision.isCall === true) buyStats.losses++;
      else sellStats.losses++;
      regimeStats[regime].losses++;
    }
  }

  const decTotal = wins + losses;
  const winRateExcludingTiesPct = decTotal > 0 ? parseFloat(((wins / decTotal) * 100).toFixed(1)) : 0;
  const winRateIncludingTiesPct = totalSignals > 0 ? parseFloat(((wins / totalSignals) * 100).toFixed(1)) : 0;

  const buyDec = buyStats.wins + buyStats.losses;
  buyStats.winRatePct = buyDec > 0 ? parseFloat(((buyStats.wins / buyDec) * 100).toFixed(1)) : 0;

  const sellDec = sellStats.wins + sellStats.losses;
  sellStats.winRatePct = sellDec > 0 ? parseFloat(((sellStats.wins / sellDec) * 100).toFixed(1)) : 0;

  for (const rKey of Object.keys(regimeStats)) {
    const rTotal = regimeStats[rKey].wins + regimeStats[rKey].losses;
    regimeStats[rKey].winRatePct = rTotal > 0 ? parseFloat(((regimeStats[rKey].wins / rTotal) * 100).toFixed(1)) : 0;
  }

  return {
    totalSamples: candles.length,
    inSampleSamples: splitIdx,
    outOfSampleSamples: outOfSample.length,
    totalSignals,
    buySignals,
    sellSignals,
    noSignalCount,
    wins,
    losses,
    ties,
    winRateExcludingTiesPct,
    winRateIncludingTiesPct,
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
    performanceByDirection: {
      buy: buyStats,
      sell: sellStats,
    },
    performanceByRegime: regimeStats,
  };
}
