import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'admin_settings.json');

export interface LicenseRecord {
  key: string;
  active: boolean;
  tier: 'VIP' | 'PRO' | 'TRIAL' | 'LIFETIME' | string;
  duration: string; // e.g. '2m', '5m', '10m', '1h', '24h', '7d', '30d', 'lifetime'
  duration_ms?: number;
  exp: number | null; // epoch timestamp ms (calculated upon first device login, or null for lifetime)
  first_login_at?: number | null; // recorded when first activated on device
  device_id?: string; // locked to the first device
  trader_id?: string;
  created_at: number;
  last_used_at?: number;
  note?: string;
}

// Helper to convert duration string to ms
export function parseDurationToMs(durationStr: string): number | null {
  const d = (durationStr || '').trim().toLowerCase();
  if (d === 'lifetime' || d === 'permanent' || d === 'unlimited') {
    return null;
  }
  const minMatch = d.match(/^([0-9.]+)\s*(m|min|mins|minute|minutes)$/);
  if (minMatch) {
    return Math.round(parseFloat(minMatch[1]) * 60 * 1000);
  }
  const hourMatch = d.match(/^([0-9.]+)\s*(h|hr|hrs|hour|hours)$/);
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 3600 * 1000);
  }
  const dayMatch = d.match(/^([0-9.]+)\s*(d|day|days)$/);
  if (dayMatch) {
    return Math.round(parseFloat(dayMatch[1]) * 86400 * 1000);
  }
  const yearMatch = d.match(/^([0-9.]+)\s*(y|yr|year|years)$/);
  if (yearMatch) {
    return Math.round(parseFloat(yearMatch[1]) * 365 * 86400 * 1000);
  }
  // Default 30 days if unknown
  return 30 * 86400 * 1000;
}

// Initial seed licenses for instant testing
const initialLocalLicenses: Record<string, LicenseRecord> = {
  'ISHAK-VIP-PRO-2025': {
    key: 'ISHAK-VIP-PRO-2025',
    active: true,
    tier: 'VIP',
    duration: '30d',
    duration_ms: 30 * 86400000,
    exp: Date.now() + 30 * 86400000,
    first_login_at: Date.now(),
    device_id: '',
    trader_id: '84920184',
    created_at: Date.now(),
    note: 'Master VIP Key (Pre-configured)'
  },
  'ISHAK-LIFETIME-DEMO': {
    key: 'ISHAK-LIFETIME-DEMO',
    active: true,
    tier: 'LIFETIME',
    duration: 'lifetime',
    duration_ms: undefined,
    exp: null,
    first_login_at: null,
    device_id: '',
    trader_id: '',
    created_at: Date.now(),
    note: 'Lifetime Demo Key (Permanent)'
  },
  'ISHAK-TEST-5MIN': {
    key: 'ISHAK-TEST-5MIN',
    active: true,
    tier: 'TRIAL',
    duration: '5m',
    duration_ms: 5 * 60000,
    exp: null, // Starts when logged in
    first_login_at: null,
    device_id: '',
    trader_id: '',
    created_at: Date.now(),
    note: '5 Minutes Custom Trial Key (Countdown starts on login)'
  }
};

class LicenseDatabase {
  private supabase: SupabaseClient | null = null;
  private localStore: Map<string, LicenseRecord> = new Map();
  private supabaseUrl: string = '';
  private supabaseKey: string = '';
  private isConfigured: boolean = false;
  private adminPassword: string = 'ishakdevos';

  constructor() {
    let savedSupabaseUrl = '';
    let savedSupabaseKey = '';

    // Load or initialize admin settings
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.adminPassword && typeof parsed.adminPassword === 'string') {
          this.adminPassword = parsed.adminPassword;
        }
        if (parsed.supabaseUrl && typeof parsed.supabaseUrl === 'string') {
          savedSupabaseUrl = parsed.supabaseUrl;
        }
        if (parsed.supabaseKey && typeof parsed.supabaseKey === 'string') {
          savedSupabaseKey = parsed.supabaseKey;
        }
      } else {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ adminPassword: 'ishakdevos' }, null, 2));
      }
    } catch (e) {
      console.warn('Could not read admin settings file:', e);
    }

    for (const [k, v] of Object.entries(initialLocalLicenses)) {
      this.localStore.set(k.toUpperCase(), v);
    }

    const url = process.env.SUPABASE_URL || savedSupabaseUrl;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || savedSupabaseKey;
    if (url && key) {
      this.initSupabase(url, key, false);
    }

    // Auto-clean expired licenses every 10 seconds
    setInterval(() => {
      this.cleanupExpiredLicenses().catch(() => {});
    }, 10000);
  }

  public async cleanupExpiredLicenses(): Promise<number> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [k, rec] of this.localStore.entries()) {
      if (rec.exp !== null && rec.exp !== undefined && now > rec.exp) {
        expiredKeys.push(k);
      }
    }

    for (const k of expiredKeys) {
      this.localStore.delete(k);
    }

    if (this.supabase && this.isConfigured) {
      try {
        const { data, error } = await this.supabase
          .from('ishak_licenses')
          .select('key, exp')
          .not('exp', 'is', null)
          .lt('exp', now);

        if (!error && data && data.length > 0) {
          const dbExpiredKeys = data.map((d: any) => d.key);
          await this.supabase
            .from('ishak_licenses')
            .delete()
            .in('key', dbExpiredKeys);

          for (const k of dbExpiredKeys) {
            this.localStore.delete(k.toUpperCase());
            if (!expiredKeys.includes(k.toUpperCase())) {
              expiredKeys.push(k.toUpperCase());
            }
          }
        }
      } catch (err) {
        console.warn('Auto cleanup on Supabase error:', err);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`🗑️ Auto-deleted ${expiredKeys.length} expired license(s):`, expiredKeys);
    }

    return expiredKeys.length;
  }

  public initSupabase(url: string, key: string, saveToDisk = true): boolean {
    try {
      if (!url || !key) return false;
      this.supabaseUrl = url.trim();
      this.supabaseKey = key.trim();
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
        auth: { persistSession: false }
      });
      this.isConfigured = true;
      console.log('✅ Supabase client initialized successfully with URL:', this.supabaseUrl);

      if (saveToDisk) {
        try {
          let current: any = {};
          if (fs.existsSync(SETTINGS_FILE)) {
            current = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
          }
          current.supabaseUrl = this.supabaseUrl;
          current.supabaseKey = this.supabaseKey;
          fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
        } catch (e) {
          console.warn('Failed to save supabase config to settings file:', e);
        }
      }

      // Sync initial local licenses into Supabase table
      this.syncInitialToSupabase().catch((err) => console.warn('Supabase sync initial error:', err));

      return true;
    } catch (err) {
      console.error('Failed to init Supabase client:', err);
      this.supabase = null;
      this.isConfigured = false;
      return false;
    }
  }

  private async syncInitialToSupabase() {
    if (!this.supabase) return;
    for (const [_, item] of this.localStore.entries()) {
      try {
        await this.supabase.from('ishak_licenses').upsert({
          key: item.key,
          active: item.active,
          tier: item.tier,
          duration: item.duration,
          duration_ms: item.duration_ms,
          exp: item.exp,
          first_login_at: item.first_login_at,
          device_id: item.device_id || '',
          trader_id: item.trader_id || '',
          created_at: item.created_at,
          last_used_at: item.last_used_at,
          note: item.note || ''
        }, { onConflict: 'key' });
      } catch (err) {
        // Table might not be created yet if user hasn't run the SQL script
      }
    }
  }

  public isSupabaseActive(): boolean {
    return !!this.supabase && this.isConfigured;
  }

  public getSupabaseUrl(): string {
    return this.supabaseUrl || '';
  }

  public getSupabaseKey(): string {
    return this.supabaseKey || '';
  }

  public getStatus() {
    return {
      isSupabaseActive: !!this.supabase && this.isConfigured,
      supabaseUrl: this.supabaseUrl || '',
      storageType: (this.supabase && this.isConfigured) ? 'Supabase Cloud Database' : 'Secure High-Performance Server Store',
      keyCount: this.localStore.size
    };
  }

  public async getAllLicenses(): Promise<LicenseRecord[]> {
    await this.cleanupExpiredLicenses();

    if (this.supabase && this.isConfigured) {
      try {
        const { data, error } = await this.supabase
          .from('ishak_licenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((d: any) => ({
            key: d.key,
            active: d.active !== false,
            tier: d.tier || 'VIP',
            duration: d.duration || '30d',
            duration_ms: d.duration_ms ? Number(d.duration_ms) : (parseDurationToMs(d.duration || '30d') || undefined),
            exp: d.exp !== null && d.exp !== undefined ? Number(d.exp) : null,
            first_login_at: d.first_login_at ? Number(d.first_login_at) : null,
            device_id: d.device_id || '',
            trader_id: d.trader_id || '',
            created_at: d.created_at ? Number(d.created_at) : Date.now(),
            last_used_at: d.last_used_at ? Number(d.last_used_at) : undefined,
            note: d.note || ''
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to server memory:', err);
      }
    }

    return Array.from(this.localStore.values()).sort((a, b) => b.created_at - a.created_at);
  }

  public async getLicense(rawKey: string): Promise<LicenseRecord | null> {
    const key = rawKey.trim().toUpperCase();

    if (this.supabase && this.isConfigured) {
      try {
        const { data, error } = await this.supabase
          .from('ishak_licenses')
          .select('*')
          .eq('key', key)
          .maybeSingle();

        if (!error && data) {
          return {
            key: data.key,
            active: data.active !== false,
            tier: data.tier || 'VIP',
            duration: data.duration || '30d',
            duration_ms: data.duration_ms ? Number(data.duration_ms) : (parseDurationToMs(data.duration || '30d') || undefined),
            exp: data.exp !== null && data.exp !== undefined ? Number(data.exp) : null,
            first_login_at: data.first_login_at ? Number(data.first_login_at) : null,
            device_id: data.device_id || '',
            trader_id: data.trader_id || '',
            created_at: data.created_at ? Number(data.created_at) : Date.now(),
            last_used_at: data.last_used_at ? Number(data.last_used_at) : undefined,
            note: data.note || ''
          };
        }
      } catch (err) {
        console.warn('Supabase single lookup error, checking local store:', err);
      }
    }

    return this.localStore.get(key) || null;
  }

  public async saveLicense(record: LicenseRecord): Promise<boolean> {
    const key = record.key.trim().toUpperCase();
    const formatted: LicenseRecord = {
      ...record,
      key
    };

    this.localStore.set(key, formatted);

    if (this.supabase && this.isConfigured) {
      try {
        const { error } = await this.supabase
          .from('ishak_licenses')
          .upsert({
            key: formatted.key,
            active: formatted.active,
            tier: formatted.tier,
            duration: formatted.duration,
            duration_ms: formatted.duration_ms,
            exp: formatted.exp,
            first_login_at: formatted.first_login_at,
            device_id: formatted.device_id || '',
            trader_id: formatted.trader_id || '',
            created_at: formatted.created_at,
            last_used_at: formatted.last_used_at,
            note: formatted.note || ''
          });

        if (error) {
          console.error('Supabase upsert error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase save failed:', err);
      }
    }

    return true;
  }

  public async deleteLicense(rawKey: string): Promise<boolean> {
    const key = rawKey.trim().toUpperCase();
    this.localStore.delete(key);

    if (this.supabase && this.isConfigured) {
      try {
        await this.supabase
          .from('ishak_licenses')
          .delete()
          .eq('key', key);
      } catch (err) {
        console.warn('Supabase delete failed:', err);
      }
    }

    return true;
  }

  public verifyAdminPassword(inputPass: string): boolean {
    if (!inputPass) return false;
    return inputPass.trim() === this.adminPassword;
  }

  public changeAdminPassword(oldPass: string, newPass: string): { success: boolean; error?: string } {
    if (!oldPass || oldPass.trim() !== this.adminPassword) {
      return { success: false, error: 'বর্তমান পাসওয়ার্ড ভুল! সঠিক পাসওয়ার্ড দিন।' };
    }
    const cleanNew = (newPass || '').trim();
    if (cleanNew.length < 4) {
      return { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে!' };
    }

    this.adminPassword = cleanNew;
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ adminPassword: cleanNew }, null, 2));
      console.log('✅ Admin password updated and saved successfully.');
    } catch (err) {
      console.error('Failed to write admin settings file:', err);
    }

    return { success: true };
  }
}

export const licenseDb = new LicenseDatabase();
