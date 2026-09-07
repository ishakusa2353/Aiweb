import { MarketCategory } from '../types';

export const QUOTEX_MARKETS: MarketCategory[] = [
  {
    category: 'QUOTEX OTC CURRENCIES (২৪/৭)',
    items: [
      'AUD/CAD (OTC)',
      'AUD/CHF (OTC)',
      'AUD/JPY (OTC)',
      'AUD/NZD (OTC)',
      'AUD/USD (OTC)',
      'CAD/CHF (OTC)',
      'CAD/JPY (OTC)',
      'CHF/JPY (OTC)',
      'EUR/AUD (OTC)',
      'EUR/CAD (OTC)',
      'EUR/CHF (OTC)',
      'EUR/GBP (OTC)',
      'EUR/JPY (OTC)',
      'EUR/NZD (OTC)',
      'EUR/USD (OTC)',
      'GBP/AUD (OTC)',
      'GBP/CAD (OTC)',
      'GBP/CHF (OTC)',
      'GBP/JPY (OTC)',
      'GBP/NZD (OTC)',
      'GBP/USD (OTC)',
      'NZD/CAD (OTC)',
      'NZD/CHF (OTC)',
      'NZD/JPY (OTC)',
      'NZD/USD (OTC)',
      'USD/BDT (OTC)',
      'USD/BRL (OTC)',
      'USD/CAD (OTC)',
      'USD/CHF (OTC)',
      'USD/DZD (OTC)',
      'USD/EGP (OTC)',
      'USD/IDR (OTC)',
      'USD/INR (OTC)',
      'USD/JPY (OTC)',
      'USD/MXN (OTC)',
      'USD/MYR (OTC)',
      'USD/NGN (OTC)',
      'USD/PHP (OTC)',
      'USD/PKR (OTC)',
      'USD/RUB (OTC)',
      'USD/THB (OTC)',
      'USD/TRY (OTC)',
      'USD/VND (OTC)',
      'USD/ZAR (OTC)'
    ]
  },
  {
    category: 'QUOTEX REAL FOREX (লাইভ মার্কেট)',
    items: [
      'EUR/USD',
      'GBP/USD',
      'USD/JPY',
      'USD/CHF',
      'USD/CAD',
      'AUD/USD',
      'NZD/USD',
      'EUR/JPY',
      'GBP/JPY',
      'EUR/GBP',
      'AUD/CAD',
      'AUD/CHF',
      'AUD/JPY',
      'CAD/JPY',
      'EUR/AUD',
      'EUR/CAD',
      'EUR/CHF',
      'GBP/AUD',
      'GBP/CAD',
      'GBP/CHF',
      'NZD/JPY',
      'USD/NOK',
      'USD/SEK',
      'USD/TRY',
      'USD/SGD'
    ]
  },
  {
    category: 'COMMODITIES & METALS (OTC & REAL)',
    items: [
      'Gold (OTC)',
      'Silver (OTC)',
      'Crude Oil (OTC)',
      'UKBrent (OTC)',
      'USCrude (OTC)',
      'GOLD (XAU/USD)',
      'SILVER (XAG/USD)',
      'UKBrent',
      'USCrude'
    ]
  },
  {
    category: 'CRYPTO & STOCKS OTC (QUOTEX)',
    items: [
      'Bitcoin (OTC)',
      'Ethereum (OTC)',
      'Litecoin (OTC)',
      'Ripple (OTC)',
      'BTC/USD',
      'ETH/USD',
      'Boeing Company (OTC)',
      'Intel (OTC)',
      'Microsoft (OTC)',
      'Apple (OTC)',
      'Johnson & Johnson (OTC)',
      'McDonald\'s (OTC)',
      'Meta (OTC)',
      'Pfizer (OTC)',
      'American Express (OTC)'
    ]
  }
];

export const MARKETS_DATABASE = QUOTEX_MARKETS;

export const TIME_OPTIONS = [
  { sec: 5, label: '5 Seconds', sub: 'Turbo ⚡' },
  { sec: 10, label: '10 Seconds', sub: 'Quick ⚡' },
  { sec: 15, label: '15 Seconds', sub: 'Fast ⚡' },
  { sec: 30, label: '30 Seconds', sub: 'Momentum 🚀' },
  { sec: 60, label: '1 Minute', sub: 'Optimal / Recommended ⭐' },
  { sec: 120, label: '2 Minutes', sub: 'Trend Follow 📊' },
  { sec: 300, label: '5 Minutes', sub: 'Pro Swing 💎' }
];
