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
  const token1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const token2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const token3 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const base = `TP-${cleanTier}-${cleanDur}-${token1}-${token2}-${token3}`;
  const sig = computeKeyChecksum(base);
  return `${base}-${sig}`;
}

export function wrapWithBase64Protection(code: string): string {
  let cleanCode = code.trim();
  if (cleanCode.startsWith('javascript:')) {
    cleanCode = cleanCode.substring('javascript:'.length).trim();
  }
  const b64 = Buffer.from(cleanCode, 'utf8').toString('base64');
  return `javascript:(function(){var _0xTP="${b64}";try{var _c="";if(typeof atob!=="undefined"){var _r=atob(_0xTP);try{_c=decodeURIComponent(escape(_r));}catch(e){var _b=new Uint8Array(_r.length);for(var _i=0;_i<_r.length;_i++){_b[_i]=_r.charCodeAt(_i);}_c=new TextDecoder("utf-8").decode(_b);}}else if(typeof Buffer!=="undefined"){_c=Buffer.from(_0xTP,"base64").toString("utf-8");}var _fn=new Function(_c);_fn();}catch(_err){console.error("TradePilot execution error:",_err);}})();`;
}

export function generateBookmarkletCode(
  baseUrl: string,
  supabaseUrl: string = process.env.SUPABASE_URL || '',
  supabaseKey: string = process.env.SUPABASE_ANON_KEY || '',
  builtinLicenses: Record<string, any> = {}
): string {
  const cleanSupabaseUrl = (supabaseUrl || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  
  // Prefer the master unobfuscated source if available
  const srcPath = path.join(process.cwd(), 'public', 'loader.src.js');
  const loaderPath = path.join(process.cwd(), 'public', 'loader.js');
  const rootPath = path.join(process.cwd(), 'loader.js');
  
  let script = '';
  if (fs.existsSync(srcPath)) {
    script = fs.readFileSync(srcPath, 'utf8');
  } else if (fs.existsSync(loaderPath)) {
    script = fs.readFileSync(loaderPath, 'utf8');
  } else if (fs.existsSync(rootPath)) {
    script = fs.readFileSync(rootPath, 'utf8');
  }

  // If already wrapped in Base64 and no src available, return as is
  if (script.includes('var _0xTP="') && !fs.existsSync(srcPath)) {
    if (!script.startsWith('javascript:')) {
      script = 'javascript:' + script;
    }
    return script;
  }

  if (cleanSupabaseUrl) {
    script = script.replace(/var SUPABASE_URL = "[^"]*";/, `var SUPABASE_URL = "${cleanSupabaseUrl}";`);
  }
  if (supabaseKey) {
    script = script.replace(/var SUPABASE_KEY = "[^"]*";/, `var SUPABASE_KEY = "${supabaseKey}";`);
  }
  if (baseUrl) {
    script = script.replace(/var BACKEND_SERVER_URL = "[^"]*";/, `var BACKEND_SERVER_URL = "${baseUrl}";`);
  }
  const directLogoUrl = "https://i.ibb.co/qLkRtpxt/file-441.jpg";
  script = script.replace(/var LOGO_URL = "[^"]*";/, `var LOGO_URL = "${directLogoUrl}";`);

  // Wrap with Base64 protection (Requirement 2)
  return wrapWithBase64Protection(script);
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
