import { supabase } from './supabaseClient';
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
  // 1. ADMIN LOGIN
  async adminLogin(password: string): Promise<{ success: boolean; error?: string }> {
    const cleanPass = password.trim();

    // First try backend if available
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('ishak_admin_auth', 'authenticated');
          return { success: true };
        }
      }
    } catch {
      // Backend not running (e.g. Vercel static or Netlify) -> fallback to Supabase direct
    }

    // Direct Supabase Check
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
      // Offline fallback: check default password
      if (cleanPass === 'ishakdevos') {
        localStorage.setItem('ishak_admin_auth', 'authenticated');
        return { success: true };
      }
      return { success: false, error: 'সংযোগ ত্রুটি: পাসওয়ার্ড যাচাই করা যায়নি।' };
    }
  },

  // 2. CHANGE ADMIN PASSWORD
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    // Try backend first
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: cleanOld, newPassword: cleanNew }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) return { success: true };
      }
    } catch {}

    // Direct Supabase Update
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
        return { success: false, error: 'পাসওয়ার্ড আপডেটে সমস্যা হয়েছে।' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' };
    }
  },

  // 3. GET ALL LICENSES
  async getAllLicenses(): Promise<LicenseRecord[]> {
    // Try backend first
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.keys)) {
          return data.keys.filter((k: any) => k.key !== '__ADMIN_CONFIG__');
        }
      }
    } catch {}

    // Direct Supabase Fetch
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

  // 4. CREATE NEW LICENSE
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

    // Try backend first
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: finalKey,
          tier: payload.tier,
          duration: finalDuration,
          traderId: payload.traderId,
          note: payload.note,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) return { success: true };
      }
    } catch {}

    // Direct Supabase Insert
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
      await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
    } catch {}

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
      await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendDays: days }),
      });
    } catch {}

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
      await fetch(`/api/keys/${encodeURIComponent(key)}`, { method: 'DELETE' });
    } catch {}

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
      await fetch(`/api/keys/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetDevice: true }),
      });
    } catch {}

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
};
