import fs from 'fs';
import path from 'path';
import { QUOTEX_MARKETS } from '../src/data/markets.ts';

export const MASTER_SIGNING_SALT = "ISHAK_VIP_2026_MASTER";

export function computeKeyChecksum(base: string): string {
  const full = (base + ":" + MASTER_SIGNING_SALT).toUpperCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < full.length; i++) {
    hash ^= full.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return ('0000' + hash.toString(16).toUpperCase()).slice(-4);
}

export function generateOfflineSignedKey(tier: string = 'VIP', duration: string = '30D'): string {
  const cleanTier = (tier || 'VIP').toUpperCase();
  const cleanDur = (duration || '30D').toUpperCase();
  const token = Math.random().toString(36).substring(2, 6).toUpperCase();
  const base = `ISHAK-${cleanTier}-${cleanDur}-${token}`;
  const sig = computeKeyChecksum(base);
  return `${base}-${sig}`;
}

export function generateBookmarkletCode(
  baseUrl: string,
  supabaseUrl: string = process.env.SUPABASE_URL || '',
  supabaseKey: string = process.env.SUPABASE_ANON_KEY || '',
  builtinLicenses: Record<string, any> = {}
): string {
  const cleanSupabaseUrl = (supabaseUrl || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const loaderPath = path.join(process.cwd(), 'public', 'loader.js');
  let script = '';
  if (fs.existsSync(loaderPath)) {
    script = fs.readFileSync(loaderPath, 'utf8');
  } else {
    const rootPath = path.join(process.cwd(), 'loader.js');
    if (fs.existsSync(rootPath)) {
      script = fs.readFileSync(rootPath, 'utf8');
    }
  }

  if (cleanSupabaseUrl) {
    script = script.replace(/var SUPABASE_URL = "[^"]*";/, `var SUPABASE_URL = "${cleanSupabaseUrl}";`);
  }
  if (supabaseKey) {
    script = script.replace(/var SUPABASE_KEY = "[^"]*";/, `var SUPABASE_KEY = "${supabaseKey}";`);
  }

  if (!script.startsWith('javascript:')) {
    script = 'javascript:' + script;
  }
  return script;
}

export function generateRawScriptCode(
  baseUrl: string,
  supabaseUrl: string = '',
  supabaseKey: string = '',
  builtinLicenses: Record<string, any> = {}
): string {
  const bookmarkletCode = generateBookmarkletCode(baseUrl, supabaseUrl, supabaseKey, builtinLicenses);
  return bookmarkletCode.startsWith('javascript:')
    ? bookmarkletCode.substring('javascript:'.length)
    : bookmarkletCode;
}
