import { supabase, SUPABASE_URL, isSupabaseConfigured, sanitizeSupabaseUrl } from './supabaseClient';
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
      const resp = await fetch('/api/supabase/status');
      if (resp.ok) {
        const data = await resp.json();
        return {
          active: data.isSupabaseActive,
          count: data.keyCount || 0,
        };
      }
    } catch {
      // Ignore and try direct
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error, count } = await supabase
          .from('ishak_licenses')
          .select('*', { count: 'exact' });

        if (!error) {
          return { active: true, count: count || data?.length || 0 };
        }
      } catch {
        // fall through
      }
    }

    return { active: false, count: 0 };
  },

  // 1. ADMIN LOGIN
  async adminLogin(password: string): Promise<{ success: boolean; error?: string }> {
    const cleanPass = password.trim();

    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          localStorage.setItem('ishak_admin_auth', 'authenticated');
          return { success: true };
        }
        return { success: false, error: data.error || 'ভুল এডমিন পাসওয়ার্ড!' };
      }
    } catch {
      // network fallback below
    }

    // Direct Supabase fallback if configured
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('ishak_licenses')
          .select('note')
          .eq('key', '__ADMIN_CONFIG__')
          .maybeSingle();

        const storedPass = data?.note || 'ishakdevos';
        if (cleanPass === storedPass || cleanPass === 'ishakdevos') {
          localStorage.setItem('ishak_admin_auth', 'authenticated');
          return { success: true };
        }
      } catch {
        // Fall through
      }
    }

    if (cleanPass === 'ishakdevos') {
      localStorage.setItem('ishak_admin_auth', 'authenticated');
      return { success: true };
    }

    return { success: false, error: 'ভুল এডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।' };
  },

  // 2. CHANGE ADMIN PASSWORD
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanNew) {
      return { success: false, error: 'নতুন পাসওয়ার্ড খালি রাখা যাবে না।' };
    }

    try {
      const resp = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: cleanOld, newPassword: cleanNew }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          // If direct Supabase is active, sync it as well
          if (isSupabaseConfigured) {
            supabase.from('ishak_licenses').upsert({
              key: '__ADMIN_CONFIG__',
              active: true,
              tier: 'ADMIN',
              duration: 'lifetime',
              note: cleanNew,
              created_at: Date.now(),
            }, { onConflict: 'key' }).then();
          }
          return { success: true };
        }
        return { success: false, error: data.error };
      }
    } catch {
      // fallback to direct supabase
    }

    if (isSupabaseConfigured) {
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
          return { success: false, error: 'পাসওয়ার্ড আপডেটে সমস্যা: ' + upsertErr.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' };
      }
    }

    return { success: false, error: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' };
  },

  // 3. GET ALL LICENSES (Server-First with Supabase Fallback)
  async getAllLicenses(): Promise<LicenseRecord[]> {
    // 1. Try Server API first (Fast, handles local DB + Supabase sync)
    try {
      const resp = await fetch('/api/keys');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.keys)) {
          return json.keys.map((d: any) => ({
            key: d.key,
            active: d.active !== false,
            tier: d.tier || 'VIP',
            duration: d.duration || '30d',
            duration_ms: d.duration_ms ? Number(d.duration_ms) : (parseDurationToMs(d.duration || '30d') || undefined),
            exp: d.exp !== null && d.exp !== undefined ? Number(d.exp) : null,
            first_login_at: d.first_login_at ? Number(d.first_login_at) : null,
            device_id: d.device_id || '',
            device_limit: d.device_limit !== undefined && d.device_limit !== null ? Number(d.device_limit) : 1,
            trader_id: d.trader_id || '',
            created_at: d.created_at ? Number(d.created_at) : Date.now(),
            last_used_at: d.last_used_at ? Number(d.last_used_at) : undefined,
            note: d.note || '',
          }));
        }
      }
    } catch (err) {
      console.warn('Server /api/keys fetch error, checking direct Supabase...', err);
    }

    // 2. Direct Supabase Fallback if server failed
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('ishak_licenses')
          .select('*')
          .neq('key', '__ADMIN_CONFIG__')
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
            device_limit: d.device_limit !== undefined && d.device_limit !== null ? Number(d.device_limit) : 1,
            trader_id: d.trader_id || '',
            created_at: d.created_at ? Number(d.created_at) : Date.now(),
            last_used_at: d.last_used_at ? Number(d.last_used_at) : undefined,
            note: d.note || '',
          }));
        }
      } catch (err) {
        console.warn('Supabase direct fetch failed:', err);
      }
    }

    return [];
  },

  // 4. CREATE NEW LICENSE (Dual-Safe: Server API + Supabase sync)
  async createLicense(payload: {
    key?: string;
    tier: string;
    duration: string;
    customValue?: string;
    customUnit?: string;
    traderId?: string;
    note?: string;
    deviceLimit?: number;
  }): Promise<{ success: boolean; error?: string }> {
    // 1. Send to server API first
    try {
      const resp = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          // If direct Supabase is configured, also upsert to Supabase
          if (isSupabaseConfigured && json.key) {
            supabase.from('ishak_licenses').upsert(json.key, { onConflict: 'key' }).then();
          }
          return { success: true };
        } else {
          return { success: false, error: json.error || 'Server error creating key' };
        }
      }
    } catch (err: any) {
      console.warn('Server /api/keys POST failed, trying direct Supabase...', err);
    }

    // 2. Direct Supabase Fallback if server is not reachable
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

    const deviceLimit = payload.deviceLimit !== undefined ? Number(payload.deviceLimit) : 1;

    if (isSupabaseConfigured) {
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
          device_limit: deviceLimit,
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
    }

    return { success: false, error: 'Failed to create key on both server and database.' };
  },

  // 5. TOGGLE ACTIVE
  async toggleActive(key: string, currentActive: boolean): Promise<boolean> {
    try {
      const resp = await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      if (resp.ok) {
        if (isSupabaseConfigured) {
          supabase.from('ishak_licenses').update({ active: !currentActive }).eq('key', key).then();
        }
        return true;
      }
    } catch {
      // fallback
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('ishak_licenses')
          .update({ active: !currentActive })
          .eq('key', key);
        return !error;
      } catch {
        return false;
      }
    }

    return false;
  },

  // 6. EXTEND LICENSE
  async extendLicense(key: string, days: number): Promise<boolean> {
    try {
      const resp = await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendDays: days }),
      });
      if (resp.ok) {
        return true;
      }
    } catch {
      // fallback
    }

    if (isSupabaseConfigured) {
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
    }

    return false;
  },

  // 7. DELETE LICENSE
  async deleteLicense(key: string): Promise<boolean> {
    try {
      const resp = await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        if (isSupabaseConfigured) {
          supabase.from('ishak_licenses').delete().eq('key', key).then();
        }
        return true;
      }
    } catch {
      // fallback
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('ishak_licenses').delete().eq('key', key);
        return !error;
      } catch {
        return false;
      }
    }

    return false;
  },

  // 8. RESET DEVICE LOCK
  async resetDevice(key: string): Promise<boolean> {
    try {
      const resp = await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetDevice: true }),
      });
      if (resp.ok) {
        if (isSupabaseConfigured) {
          supabase.from('ishak_licenses').update({ device_id: '' }).eq('key', key).then();
        }
        return true;
      }
    } catch {
      // fallback
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('ishak_licenses')
          .update({ device_id: '' })
          .eq('key', key);
        return !error;
      } catch {
        return false;
      }
    }

    return false;
  },

  // 9. VERIFY LICENSE STATUS
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

    // Try server API first
    try {
      const resp = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, traderId, deviceId }),
      });

      if (resp.ok) {
        const resJson = await resp.json();
        return resJson;
      }
    } catch {
      // fallback to direct Supabase
    }

    if (isSupabaseConfigured) {
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

        const myDeviceId = deviceId || '';
        const registeredDevices = (row.device_id || '')
          .split(',')
          .map((d: string) => d.trim())
          .filter(Boolean);

        const devLimit = row.device_limit !== undefined && row.device_limit !== null ? Number(row.device_limit) : 1;
        const isUnlimited = devLimit === 0 || devLimit === -1;
        const updates: any = {};
        let needPatch = false;

        if (myDeviceId) {
          const alreadyRegistered = registeredDevices.includes(myDeviceId);
          if (!alreadyRegistered) {
            if (!isUnlimited && registeredDevices.length >= devLimit) {
              return { valid: false, reason: `🔒 ডিভাইস লিমিট শেষ! এই লাইসেন্সটি সর্বোচ্চ ${devLimit} টি ডিভাইসের জন্য অনুমোদিত।` };
            }
            registeredDevices.push(myDeviceId);
            updates.device_id = registeredDevices.join(',');
            needPatch = true;
          }
        }

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

        if (!firstLogin) {
          firstLogin = now;
          updates.first_login_at = firstLogin;
          if (row.duration !== 'lifetime' && durationMs) {
            exp = firstLogin + durationMs;
            updates.exp = exp;
          }
          needPatch = true;
        }

        if (!row.trader_id && inputTid) {
          updates.trader_id = inputTid;
          needPatch = true;
        }

        updates.last_used_at = now;
        needPatch = true;

        if (exp && now > exp) {
          return {
            valid: false,
            reason: '⏳ এই লাইসেন্সের মেয়াদ শেষ হয়ে গেছে! রিনিউ করতে @IshakVhai এ যোগাযোগ করুন।',
          };
        }

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
    }

    return {
      valid: false,
      reason: '❌ লাইসেন্স যাচাই করা যায়নি।',
    };
  },
};
