export interface LicenseRecord {
  key: string;
  active: boolean;
  tier?: string;
  duration?: string; // '2m', '5m', '10m', '1h', '24h', '7d', '30d', 'lifetime'
  duration_ms?: number; // total duration in milliseconds
  exp: number | null; // epoch ms (null if not started or lifetime)
  first_login_at?: number | null; // recorded when first activated on device
  device_id?: string; // device lock (supports comma-separated device IDs)
  device_limit?: number; // 1, 2, 3, custom N, or 0/unlimited
  trader_id?: string;
  created_at?: number;
  last_used_at?: number;
  note?: string;
}

export interface LicenseVerifyRequest {
  key: string;
  traderId?: string;
  deviceId?: string;
}

export interface LicenseVerifyResponse {
  valid: boolean;
  reason?: string;
  exp?: number | null;
  duration?: string;
  tier?: string;
  traderId?: string;
  deviceId?: string;
  isLifetime?: boolean;
  serverTime: number;
}

export interface MarketCategory {
  category: string;
  items: string[];
}

export interface SignalData {
  isCall: boolean | null;
  isRiskDetected?: boolean;
  isLowConfidence?: boolean;
  riskReason?: string;
  confidence?: string;
  accuracy?: string;
  rsi: number;
  pattern: string;
  logic: string;
  marketTrend: string;
  ema5: number;
  ema13: number;
  ema30: number;
  livePrice: number;
  signalId?: string;
  durationLabel?: string;
  finishTime?: string;
  payout?: string;
  investment?: string;
  liveExecutionTime?: string;
  statusLabel?: string;
}
