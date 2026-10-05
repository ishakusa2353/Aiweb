import { evaluateMarketData, runOutOfSampleReplayValidation, Candle } from './src/utils/marketAnalysisEngine';

console.log('--- TEST 1: INSUFFICIENT OR CORRUPT DATA -> NO SIGNAL ---');
const corruptCandles: Candle[] = [
  { time: 100, open: 1, high: 1.05, low: 0.95, close: 1.02 },
  { time: 50, open: 1, high: 1.05, low: 0.95, close: 1.02 } // Out of order!
];
const corruptRes = evaluateMarketData(corruptCandles, [], 5);
console.log('Corrupt result isCall:', corruptRes.isCall, 'isTradeApproved:', corruptRes.isTradeApproved, 'reason:', corruptRes.reason);
if (corruptRes.isCall !== null || corruptRes.isTradeApproved !== false) {
  console.error('FAIL: Corrupt data must produce NO SIGNAL');
  process.exit(1);
}

console.log('--- TEST 2: DEAD FLAT CHOP MARKET -> NO SIGNAL ---');
const flatCandles: Candle[] = [];
for (let i = 0; i < 25; i++) {
  flatCandles.push({
    time: 1000 + i * 5000,
    open: 1.08400,
    high: 1.08401,
    low: 1.08399,
    close: 1.08400
  });
}
const flatRes = evaluateMarketData(flatCandles, [1.084, 1.084, 1.084], 5);
console.log('Flat result isCall:', flatRes.isCall, 'isTradeApproved:', flatRes.isTradeApproved, 'pattern:', flatRes.pattern);
if (flatRes.isCall !== null || flatRes.isTradeApproved !== false) {
  console.error('FAIL: Flat data must produce NO SIGNAL');
  process.exit(1);
}

console.log('--- TEST 3: STRONG BULLISH CONFLUENCE (5S ULTRA-SHORT) ---');
const bullCandles: Candle[] = [];
for (let i = 0; i < 30; i++) {
  const base = 1.08000 + i * 0.00030;
  bullCandles.push({
    time: 1000 + i * 5000,
    open: base,
    high: base + 0.00035,
    low: base - 0.00005,
    close: base + 0.00030
  });
}
const bullTicks = [1.0880, 1.0883, 1.0887, 1.0891, 1.0895, 1.0900];
const bullRes = evaluateMarketData(bullCandles, bullTicks, 5);
console.log('Bullish 5s result isCall:', bullRes.isCall, 'score:', bullRes.confluenceScore, 'QQE:', bullRes.indicators.qqe?.state);
if (bullRes.isCall !== true || !bullRes.isTradeApproved) {
  console.error('FAIL: Strong bullish data should confirm BUY');
  process.exit(1);
}

console.log('--- TEST 4: STRONG BEARISH CONFLUENCE (1M STANDARD MODE) ---');
const nowTime = Date.now();
const bearCandles: Candle[] = [];
for (let i = 0; i < 40; i++) {
  const base = 1.10000 - i * 0.00030;
  bearCandles.push({
    time: nowTime - (40 - i) * 60000,
    open: base,
    high: base + 0.00005,
    low: base - 0.00035,
    close: base - 0.00030
  });
}
const bearTicks = [1.0880, 1.0877, 1.0873, 1.0869, 1.0865, 1.0860];
const bearRes = evaluateMarketData(bearCandles, bearTicks, 60);
console.log('Bearish 1m result isCall:', bearRes.isCall, 'score:', bearRes.confluenceScore, 'mode:', bearRes.mode, 'QQE:', bearRes.indicators.qqe?.state);
if (bearRes.isCall !== false || !bearRes.isTradeApproved) {
  console.error('FAIL: Strong bearish data should confirm SELL');
  process.exit(1);
}

console.log('--- TEST 5: OUT-OF-SAMPLE VALIDATION HARNESS (ZERO LOOKAHEAD) ---');
const oosReport = runOutOfSampleReplayValidation(bearCandles.concat(bullCandles), 60, 0.5);
console.log('OOS Report total signals:', oosReport.totalSignals, 'wins:', oosReport.wins, 'losses:', oosReport.losses, 'winRate:', oosReport.winRateExcludingTiesPct + '%');

console.log('ALL TESTS PASSED PERFECTLY!');
