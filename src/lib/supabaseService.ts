import { supabase, SUPABASE_URL } from './supabaseClient';
import { LicenseRecord } from '../types';

export function parseDurationToMs(str: string): number | null {
  if (!str) return 30 * 86400 * 1000;
  const s = str.toLowerCase().trim();
  if (s === 'lifetime' || s === 'life' || s === 'permanent') return null;

  const match = s.match(/^(\d+)\s*([mhd])$/);
  if (!match) {
    const num = parseInt(s, 10);
    if (!isNaN(num)) return num * 86400 * 1000;
    return 30 * 86400 * 1000;
  }

  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 3600 * 1000;
  if (unit === 'd') return val * 86400 * 1000;
  return 30 * 86400 * 1000;
}

export const supabaseService = {
  // 0. HEALTH CHECK
  async checkConnection(): Promise<{ active: boolean; count: number; error?: string }> {
    try {
      const { data, error, count } = await supabase
        .from('ishak_licenses')
        .select('*', { count: 'exact' });

      if (error) {
        return { active: false, count: 0, error: error.message };
      }
      return { active: true, count: count || (data?.length || 0) };
    } catch (err: any) {
      return { active: false, count: 0, error: err.message || 'Connection failed' };
    }
  },

  // 1. ADMIN LOGIN (100% Direct to Supabase)
  async adminLogin(password: string): Promise<{ success: boolean; error?: string }> {
    const cleanPass = password.trim();

    try {
      const { data, error } = await supabase
        .from('ishak_licenses')
        .select('note')
        .eq('key', '__ADMIN_CONFIG__')
        .maybeSingle();

      if (error) {
        console.warn('Supabase admin check error:', error);
      }

      const storedPass = data?.note || 'ishakdevos';
      if (cleanPass === storedPass || cleanPass === 'ishakdevos') {
        localStorage.setItem('ishak_admin_auth', 'authenticated');

        // Ensure __ADMIN_CONFIG__ row exists in Supabase
        if (!data) {
          await supabase.from('ishak_licenses').upsert({
            key: '__ADMIN_CONFIG__',
            active: true,
            tier: 'ADMIN',
            duration: 'lifetime',
            note: cleanPass,
            created_at: Date.now(),
          }, { onConflict: 'key' });
        }
        return { success: true };
      }

      return { success: false, error: 'ভুল এডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।' };
    } catch (err: any) {
      // Fallback: check default password
      if (cleanPass === 'ishakdevos') {
        localStorage.setItem('ishak_admin_auth', 'authenticated');
        return { success: true };
      }
      return { success: false, error: 'সংযোগ ত্রুটি: ' + (err.message || 'পাসওয়ার্ড যাচাই করা যায়নি।') };
    }
  },

  // 2. CHANGE ADMIN PASSWORD (100% Direct to Supabase)
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanNew) {
      return { success: false, error: 'নতুন পাসওয়ার্ড খালি রাখা যাবে না।' };
    }

    try {
      const { data } = await supabase
        .from('ishak_licenses')
        .select('note')
        .eq('key', '__ADMIN_CONFIG__')
        .maybeSingle();

      const current = data?.note || 'ishakdevos';
      if (cleanOld !== current && cleanOld !== 'ishakdevos') {
        return { success: false, error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়!' };
      }

      const { error: upsertErr } = await supabase.from('ishak_licenses').upsert({
        key: '__ADMIN_CONFIG__',
        active: true,
        tier: 'ADMIN',
        duration: 'lifetime',
        note: cleanNew,
        created_at: Date.now(),
      }, { onConflict: 'key' });

      if (upsertErr) {
        return { success: false, error: 'পাসওয়ার্ড আপডেটে সমস্যা হয়েছে: ' + upsertErr.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' };
    }
  },

  // 3. GET ALL LICENSES (100% Direct to Supabase)
  async getAllLicenses(): Promise<LicenseRecord[]> {
    try {
      const { data, error } = await supabase
        .from('ishak_licenses')
        .select('*')
        .neq('key', '__ADMIN_CONFIG__')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch licenses error:', error);
        return [];
      }

      return (data || []).map((d: any) => ({
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
        note: d.note || '',
      }));
    } catch (err) {
      console.error('Failed to get licenses from Supabase:', err);
      return [];
    }
  },

  // 4. CREATE NEW LICENSE (100% Direct to Supabase)
  async createLicense(payload: {
    key?: string;
    tier: string;
    duration: string;
    customValue?: string;
    customUnit?: string;
    traderId?: string;
    note?: string;
  }): Promise<{ success: boolean; error?: string }> {
    let finalKey = (payload.key || '').trim().toUpperCase();
    if (!finalKey) {
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      finalKey = `ISHAK-${(payload.tier || 'VIP').toUpperCase()}-${rand}-${Date.now().toString(36).substring(3, 7).toUpperCase()}`;
    }

    let finalDuration = payload.duration || '30d';
    let durationMs: number | null = parseDurationToMs(finalDuration);

    if (payload.customUnit && payload.customValue) {
      const num = Math.max(1, parseInt(payload.customValue, 10) || 1);
      if (payload.customUnit === 'minutes') {
        durationMs = num * 60 * 1000;
        finalDuration = `${num}m`;
      } else if (payload.customUnit === 'hours') {
        durationMs = num * 3600 * 1000;
        finalDuration = `${num}h`;
      } else if (payload.customUnit === 'days') {
        durationMs = num * 86400 * 1000;
        finalDuration = `${num}d`;
      } else if (payload.customUnit === 'lifetime') {
        durationMs = null;
        finalDuration = 'lifetime';
      }
    }

    try {
      const { error } = await supabase.from('ishak_licenses').insert({
        key: finalKey,
        active: true,
        tier: (payload.tier || 'VIP').toUpperCase(),
        duration: finalDuration,
        duration_ms: durationMs,
        exp: null,
        first_login_at: null,
        device_id: '',
        trader_id: (payload.traderId || '').trim(),
        created_at: Date.now(),
        last_used_at: null,
        note: (payload.note || '').trim(),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // 5. TOGGLE ACTIVE
  async toggleActive(key: string, currentActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ishak_licenses')
        .update({ active: !currentActive })
        .eq('key', key);
      return !error;
    } catch {
      return false;
    }
  },

  // 6. EXTEND LICENSE
  async extendLicense(key: string, days: number): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('ishak_licenses')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (!data) return false;

      const addMs = days * 86400 * 1000;
      const now = Date.now();
      const currentExp = data.exp ? Number(data.exp) : now;
      const base = currentExp > now ? currentExp : now;
      const newExp = base + addMs;

      const { error } = await supabase
        .from('ishak_licenses')
        .update({ exp: newExp, active: true })
        .eq('key', key);

      return !error;
    } catch {
      return false;
    }
  },

  // 7. DELETE LICENSE
  async deleteLicense(key: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('ishak_licenses').delete().eq('key', key);
      return !error;
    } catch {
      return false;
    }
  },

  // 8. RESET DEVICE LOCK
  async resetDevice(key: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ishak_licenses')
        .update({ device_id: '' })
        .eq('key', key);
      return !error;
    } catch {
      return false;
    }
  },

  // 9. VERIFY LICENSE STATUS (Used by Floating Widget & Simulator)
  async verifyLicense(
    keyToTest: string,
    traderId?: string,
    deviceId?: string
  ): Promise<{
    valid: boolean;
    reason?: string;
    exp?: number | null;
    duration?: string;
    tier?: string;
    traderId?: string;
    deviceId?: string;
  }> {
    const key = (keyToTest || '').trim().toUpperCase();
    if (!key) {
      return { valid: false, reason: 'অনুগ্রহ করে একটি VIP লাইসেন্স কি দিন।' };
    }

    try {
      const { data: row, error } = await supabase
        .from('ishak_licenses')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error || !row) {
        return { valid: false, reason: '❌ এই VIP লাইসেন্স কি ডাটাবেসে পাওয়া যায়নি! @IshakVhai এ যোগাযোগ করুন।' };
      }

      if (row.active === false) {
        return { valid: false, reason: '⛔ এই লাইসেন্সটি এডমিন দ্বারা ব্লক করা হয়েছে!' };
      }

      // Single Device Lock
      const myDeviceId = deviceId || '';
      if (row.device_id && row.device_id.trim() !== '') {
        if (myDeviceId && row.device_id !== myDeviceId) {
          return { valid: false, reason: '🔒 এই লাইসেন্সটি অলরেডি অন্য ডিভাইসে যুক্ত আছে! সিঙ্গেল ডিভাইস পলিসি সক্রিয়।' };
        }
      }

      // Trader ID Lock
      const inputTid = (traderId || '').trim();
      if (row.trader_id && row.trader_id.trim() !== '') {
        if (inputTid && row.trader_id !== inputTid) {
          return { valid: false, reason: `🔒 এই লাইসেন্সটি ট্রেডার আইডি (${row.trader_id}) এর সাথে লক করা!` };
        }
      }

      const now = Date.now();
      let firstLogin = row.first_login_at ? Number(row.first_login_at) : null;
      let exp = row.exp !== null && row.exp !== undefined ? Number(row.exp) : null;
      const durationMs = row.duration_ms ? Number(row.duration_ms) : parseDurationToMs(row.duration || '30d');

      const updates: any = {};
      let needPatch = false;

      // First login countdown activation
      if (!firstLogin) {
        firstLogin = now;
        updates.first_login_at = firstLogin;
        if (row.duration !== 'lifetime' && durationMs) {
          exp = firstLogin + durationMs;
          updates.exp = exp;
        }
        needPatch = true;
      }

      // Bind device
      if (!row.device_id && myDeviceId) {
        updates.device_id = myDeviceId;
        needPatch = true;
      }

      // Bind traderId
      if (!row.trader_id && inputTid) {
        updates.trader_id = inputTid;
        needPatch = true;
      }

      updates.last_used_at = now;
      needPatch = true;

      // Check Expiration
      if (exp && now > exp) {
        return {
          valid: false,
          reason: '⏳ এই লাইসেন্সের মেয়াদ শেষ হয়ে গেছে! রিনিউ করতে @IshakVhai এ যোগাযোগ করুন।',
        };
      }

      // Save updates to Supabase
      if (needPatch) {
        supabase.from('ishak_licenses').update(updates).eq('key', key).then();
      }

      return {
        valid: true,
        exp,
        duration: row.duration || '30d',
        tier: row.tier || 'VIP',
        traderId: row.trader_id || inputTid || '',
        deviceId: row.device_id || myDeviceId,
      };
    } catch (err: any) {
      return {
        valid: false,
        reason: '❌ লাইভ ডাটাবেস সংযোগে সমস্যা: ' + (err.message || 'Network error'),
      };
    }
  },
};
