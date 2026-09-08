import { createClient } from '@supabase/supabase-js';

export function sanitizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

export const SUPABASE_URL = sanitizeSupabaseUrl(import.meta.env?.VITE_SUPABASE_URL as string);

export const SUPABASE_ANON_KEY =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string)?.trim() || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  !SUPABASE_URL.includes('placeholder') &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes('placeholder')
);

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: { persistSession: false },
  }
);
