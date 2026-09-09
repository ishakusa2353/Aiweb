import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { licenseDb, LicenseRecord, parseDurationToMs } from "./server/db.ts";
import { generateBookmarkletCode, generateRawScriptCode, generateOfflineSignedKey } from "./server/bookmarkletTemplate.ts";
import { startTelegramBot } from "./server/telegramBot.ts";

// Safe directory resolver for both dev tsx and bundled CJS production
const getRootDir = () => process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware for bookmarklet execution from any trading domain (Quotex, Pocket Option, etc.)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Ishak AI License Server", timestamp: Date.now() });
  });

  // 1. SECURE LICENSE VERIFICATION ENDPOINT
  // All client bookmarklets hit this endpoint. No Supabase tokens, bot secrets, or direct table credentials are leaked!
  app.post("/api/verify-license", async (req, res) => {
    try {
      const { key, traderId, deviceId } = req.body;
      const cleanKey = (key || "").trim().toUpperCase();
      const inputDeviceId = (deviceId || "").trim();
      const inputTraderId = (traderId || "").trim();

      if (!cleanKey) {
        return res.status(400).json({
          valid: false,
          reason: "No VIP License Key provided!"
        });
      }

      const license = await licenseDb.getLicense(cleanKey);

      if (!license) {
        return res.status(404).json({
          valid: false,
          reason: "❌ WRONG LICENCES! (ভুল লাইসেন্স কি! সঠিক কি দিয়ে আবার চেষ্টা করুন)"
        });
      }

      if (license.active === false) {
        return res.status(403).json({
          valid: false,
          reason: "This license key has been blocked by the administrator."
        });
      }

      // 🔒 DEVICE LIMIT ENFORCEMENT:
      // Supports 1 Device, 2 Devices, 3 Devices, Custom N Devices, or 0 (Unlimited)
      const registeredDevices = (license.device_id || "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const deviceLimit = license.device_limit !== undefined ? Number(license.device_limit) : 1;
      const isUnlimitedDevices = deviceLimit === 0 || deviceLimit === -1;
      let needSave = false;

      if (inputDeviceId) {
        const alreadyRegistered = registeredDevices.includes(inputDeviceId);
        if (!alreadyRegistered) {
          if (!isUnlimitedDevices && registeredDevices.length >= deviceLimit) {
            return res.status(403).json({
              valid: false,
              reason: `🔒 Device limit exceeded! This license is restricted to ${deviceLimit} device(s).`
            });
          }
          // Register this device
          registeredDevices.push(inputDeviceId);
          license.device_id = registeredDevices.join(",");
          needSave = true;
        }
      }

      // 🔒 TRADER ID LOCK (Anti-Sharing Protection)
      if (license.trader_id && license.trader_id.trim() !== "") {
        if (inputTraderId && license.trader_id !== inputTraderId) {
          return res.status(403).json({
            valid: false,
            reason: `This license is locked to Trader ID (${license.trader_id})!`
          });
        }
      }

      // ⏱️ FIRST LOGIN ACTIVATION:
      // License countdown starts strictly upon first device login!
      if (!license.first_login_at) {
        license.first_login_at = Date.now();
        // If not a lifetime key, calculate exp from duration_ms starting NOW
        const durMs = license.duration_ms || parseDurationToMs(license.duration || '30d');
        if (license.duration !== 'lifetime' && durMs) {
          license.duration_ms = durMs;
          license.exp = license.first_login_at + durMs;
        }
        needSave = true;
      }

      // Bind traderId if not bound yet
      if (!license.trader_id && inputTraderId) {
        license.trader_id = inputTraderId;
        needSave = true;
      }

      license.last_used_at = Date.now();
      needSave = true;

      if (needSave) {
        await licenseDb.saveLicense(license);
      }

      // Check Expiration: Auto-delete expired key from database immediately!
      if (license.exp && Date.now() > license.exp) {
        await licenseDb.deleteLicense(license.key);
        return res.status(403).json({
          valid: false,
          expired: true,
          reason: "This license key has expired and has been permanently deleted from database! Bot trading terminated."
        });
      }

      return res.json({
        valid: true,
        key: license.key,
        exp: license.exp,
        duration: license.duration,
        tier: license.tier || "VIP",
        traderId: license.trader_id || inputTraderId || "",
        deviceId: license.device_id || inputDeviceId || "",
        isLifetime: license.duration === 'lifetime' || license.exp === null,
        serverTime: Date.now()
      });
    } catch (err: any) {
      console.error("Verification error:", err);
      return res.status(500).json({
        valid: false,
        reason: "Server verification error occurred. Please try again shortly."
      });
    }
  });

  // 🛡️ JSONP verification endpoint (bypasses browser connect-src CSP on Quotex)
  app.get("/api/verify-jsonp", async (req, res) => {
    const rawCallback = req.query.callback;
    const callbackName = typeof rawCallback === "string" ? rawCallback.replace(/[^a-zA-Z0-9_$.]/g, "") : "ishak_cb";
    const inputKey = typeof req.query.key === "string" ? req.query.key.trim().toUpperCase() : "";
    const inputTraderId = typeof req.query.traderId === "string" ? req.query.traderId.trim() : "";
    const inputDeviceId = typeof req.query.deviceId === "string" ? req.query.deviceId.trim() : "";

    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    if (!inputKey) {
      return res.send(`${callbackName}(${JSON.stringify({ valid: false, reason: "License key is required" })});`);
    }

    try {
      const license = await licenseDb.getLicense(inputKey);
      if (!license) {
        return res.send(`${callbackName}(${JSON.stringify({ valid: false, reason: "❌ WRONG LICENCES! (ভুল লাইসেন্স কি! সঠিক কি দিয়ে আবার চেষ্টা করুন)" })});`);
      }
      if (!license.active) {
        return res.send(`${callbackName}(${JSON.stringify({ valid: false, reason: "এই লাইসেন্সটি ব্লক বা নিষ্ক্রিয় করা হয়েছে!" })});`);
      }
      // 🔒 DEVICE LIMIT ENFORCEMENT:
      const registeredDevices = (license.device_id || "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const deviceLimit = license.device_limit !== undefined ? Number(license.device_limit) : 1;
      const isUnlimitedDevices = deviceLimit === 0 || deviceLimit === -1;
      let needSave = false;

      if (inputDeviceId) {
        const alreadyRegistered = registeredDevices.includes(inputDeviceId);
        if (!alreadyRegistered) {
          if (!isUnlimitedDevices && registeredDevices.length >= deviceLimit) {
            return res.send(`${callbackName}(${JSON.stringify({ valid: false, reason: `ডিভাইস লিমিট শেষ! এই লাইসেন্সটি সর্বোচ্চ ${deviceLimit} টি ডিভাইসের জন্য অনুমোদিত।` })});`);
          }
          registeredDevices.push(inputDeviceId);
          license.device_id = registeredDevices.join(",");
          needSave = true;
        }
      }
      if (license.trader_id && inputTraderId && license.trader_id !== inputTraderId) {
        return res.send(`${callbackName}(${JSON.stringify({ valid: false, reason: `এই লাইসেন্সটি ট্রেডার আইডি (${license.trader_id}) এর সাথে লক করা!` })});`);
      }

      if (!license.first_login_at) {
        license.first_login_at = Date.now();
        const durMs = license.duration_ms || parseDurationToMs(license.duration || '30d');
        if (license.duration !== 'lifetime' && durMs) {
          license.duration_ms = durMs;
          license.exp = license.first_login_at + durMs;
        }
        needSave = true;
      }
      if (!license.trader_id && inputTraderId) {
        license.trader_id = inputTraderId;
        needSave = true;
      }
      license.last_used_at = Date.now();
      needSave = true;

      if (needSave) {
        await licenseDb.saveLicense(license);
      }

      if (license.exp && Date.now() > license.exp) {
        await licenseDb.deleteLicense(license.key);
        return res.send(`${callbackName}(${JSON.stringify({ valid: false, expired: true, reason: "এই লাইসেন্স কিটির মেয়াদ শেষ হয়ে গেছে!" })});`);
      }

      return res.send(`${callbackName}(${JSON.stringify({
        valid: true,
        key: license.key,
        exp: license.exp,
        duration: license.duration,
        tier: license.tier || "VIP",
        traderId: license.trader_id || inputTraderId || "",
        deviceId: license.device_id || inputDeviceId || "",
        isLifetime: license.duration === 'lifetime' || license.exp === null,
        serverTime: Date.now()
      })});`);
    } catch (err: any) {
      return res.send(`${callbackName}(${JSON.stringify({ valid: false, reason: "সার্ভার যাচাই ত্রুটি: " + err.message })});`);
    }
  });

  // 1.5 ADMIN AUTHENTICATION ENDPOINTS
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: "পাসওয়ার্ড আবশ্যক!" });
    }
    const isValid = licenseDb.verifyAdminPassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "ভুল এডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।" });
    }
    const token = Buffer.from(`ishak_admin_session_${Date.now()}`).toString("base64");
    return res.json({ success: true, token });
  });

  app.post("/api/admin/change-password", async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "বর্তমান এবং নতুন উভয় পাসওয়ার্ড দিন!" });
    }
    const result = await licenseDb.changeAdminPassword(oldPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, message: "এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!" });
  });

  // 2. ADMIN LICENSE MANAGEMENT ENDPOINTS
  app.get("/api/keys", async (req, res) => {
    try {
      const keys = await licenseDb.getAllLicenses();
      res.json({ success: true, keys, isSupabaseActive: licenseDb.isSupabaseActive() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/keys", async (req, res) => {
    try {
      const { key, tier, duration, customValue, customUnit, traderId, note, deviceLimit } = req.body;

      let finalKey = (key || "").trim().toUpperCase();
      if (!finalKey) {
        let durCode = (duration || "30D").toUpperCase();
        if (customUnit && customValue) {
          durCode = customUnit === 'lifetime' ? 'LIFE' : `${customValue}${customUnit === 'minutes' ? 'M' : customUnit === 'hours' ? 'H' : 'D'}`.toUpperCase();
        }
        finalKey = generateOfflineSignedKey(tier || "VIP", durCode);
      }

      const existing = await licenseDb.getLicense(finalKey);
      if (existing) {
        return res.status(400).json({ success: false, error: "License key already exists!" });
      }

      let parsedDurationMs: number | null = null;
      let finalDurationStr = duration || "30d";

      if (customUnit && customValue) {
        const num = Math.max(1, parseInt(customValue, 10) || 1);
        if (customUnit === 'minutes') {
          parsedDurationMs = num * 60 * 1000;
          finalDurationStr = `${num}m`;
        } else if (customUnit === 'hours') {
          parsedDurationMs = num * 3600 * 1000;
          finalDurationStr = `${num}h`;
        } else if (customUnit === 'days') {
          parsedDurationMs = num * 86400 * 1000;
          finalDurationStr = `${num}d`;
        } else if (customUnit === 'lifetime') {
          parsedDurationMs = null;
          finalDurationStr = 'lifetime';
        }
      } else {
        parsedDurationMs = parseDurationToMs(finalDurationStr);
      }

      const parsedDeviceLimit = deviceLimit !== undefined ? Number(deviceLimit) : 1;

      const newRecord: LicenseRecord = {
        key: finalKey,
        active: true,
        tier: (tier || "VIP").toUpperCase(),
        duration: finalDurationStr,
        duration_ms: parsedDurationMs,
        exp: null, // Calculated strictly on first login!
        first_login_at: null,
        device_id: "",
        device_limit: parsedDeviceLimit,
        trader_id: (traderId || "").trim(),
        created_at: Date.now(),
        last_used_at: null,
        note: (note || "").trim()
      };

      await licenseDb.saveLicense(newRecord);
      res.status(201).json({ success: true, key: newRecord });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/keys/:key", async (req, res) => {
    try {
      const keyParam = req.params.key.trim().toUpperCase();
      const existing = await licenseDb.getLicense(keyParam);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Key not found" });
      }

      const { active, traderId, extendDays, extendMinutes, resetDevice, note, deviceLimit } = req.body;

      if (typeof active === "boolean") {
        existing.active = active;
      }
      if (typeof traderId === "string") {
        existing.trader_id = traderId.trim();
      }
      if (typeof note === "string") {
        existing.note = note.trim();
      }
      if (resetDevice === true) {
        existing.device_id = "";
      }
      if (deviceLimit !== undefined) {
        existing.device_limit = Number(deviceLimit);
      }
      if (extendDays && existing.exp) {
        existing.exp += Number(extendDays) * 86400000;
      }
      if (extendMinutes && existing.exp) {
        existing.exp += Number(extendMinutes) * 60000;
      }

      await licenseDb.saveLicense(existing);
      res.json({ success: true, key: existing });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/keys/:key", async (req, res) => {
    try {
      const keyParam = req.params.key.trim().toUpperCase();
      await licenseDb.deleteLicense(keyParam);
      res.json({ success: true, deletedKey: keyParam });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. SUPABASE CONFIGURATION & STATUS ENDPOINT
  app.get("/api/supabase/status", (req, res) => {
    const status = licenseDb.getStatus();
    res.json({
      ...status,
      schemaSql: `-- ========================================================
-- 🛡️ ISHAK AI VIP LICENSE DATABASE SCHEMA (SUPABASE)
-- Run this entire script in Supabase -> SQL Editor -> New query -> Run
-- ========================================================

-- 1. Create the licenses table if not exists
CREATE TABLE IF NOT EXISTS public.ishak_licenses (
  key TEXT PRIMARY KEY,
  active BOOLEAN DEFAULT true,
  tier TEXT DEFAULT 'VIP',
  duration TEXT DEFAULT '30d',
  duration_ms BIGINT,
  exp BIGINT,
  first_login_at BIGINT,
  device_id TEXT DEFAULT '',
  trader_id TEXT DEFAULT '',
  created_at BIGINT,
  last_used_at BIGINT,
  note TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.ishak_licenses ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policy if it already exists to avoid "policy already exists" error
DROP POLICY IF EXISTS "Allow server service full access" ON public.ishak_licenses;
DROP POLICY IF EXISTS "Public access policy" ON public.ishak_licenses;

-- 4. Create clean full access policy (for service role and backend proxy)
CREATE POLICY "Allow server service full access" 
  ON public.ishak_licenses 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 5. Insert initial master keys safely (will not error if already exists)
INSERT INTO public.ishak_licenses (key, active, tier, duration, exp, created_at, note)
VALUES 
  ('ISHAK-VIP-PRO-2025', true, 'VIP', '30d', NULL, EXTRACT(EPOCH FROM NOW()) * 1000, 'Master VIP Key'),
  ('ISHAK-LIFETIME-DEMO', true, 'LIFETIME', 'lifetime', NULL, EXTRACT(EPOCH FROM NOW()) * 1000, 'Lifetime Key')
ON CONFLICT (key) DO NOTHING;`
    });
  });

  app.post("/api/supabase/config", (req, res) => {
    const { url, key } = req.body;
    if (!url || !key) {
      return res.status(400).json({ success: false, error: "Both url and key are required" });
    }
    const success = licenseDb.initSupabase(url, key);
    res.json({ success, status: licenseDb.getStatus() });
  });

  // 4. DIRECT JAVASCRIPT SERVING ENDPOINTS (/bot.js & /loader.js)
  // Allows loading the complete updated bot code from an external URL!
  const serveBotScript = async (req: express.Request, res: express.Response) => {
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const supabaseUrl = licenseDb.getSupabaseUrl();
    const supabaseKey = licenseDb.getSupabaseKey();

    // Fetch active licenses to bake into the script for offline / CSP-safe instant execution
    const all = await licenseDb.getAllLicenses().catch(() => []);
    const builtinLicenses: Record<string, any> = {};
    for (const item of all) {
      if (item.active) {
        builtinLicenses[item.key.toUpperCase()] = {
          active: item.active,
          tier: item.tier,
          duration: item.duration,
          duration_ms: item.duration_ms,
          exp: item.exp,
          first_login_at: item.first_login_at,
          trader_id: item.trader_id || '',
          device_id: item.device_id || ''
        };
      }
    }

    const rawCode = generateRawScriptCode(baseUrl, supabaseUrl, supabaseKey, builtinLicenses);
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(rawCode);
  };

  app.get("/bot.js", serveBotScript);
  app.get("/loader.js", serveBotScript);

  // 5. BOOKMARKLET GENERATION ENDPOINT
  app.get("/api/bookmarklet-code", async (req, res) => {
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const supabaseUrl = licenseDb.getSupabaseUrl();
    const supabaseKey = licenseDb.getSupabaseKey();

    const all = await licenseDb.getAllLicenses().catch(() => []);
    const builtinLicenses: Record<string, any> = {};
    for (const item of all) {
      if (item.active) {
        builtinLicenses[item.key.toUpperCase()] = {
          active: item.active,
          tier: item.tier,
          duration: item.duration,
          duration_ms: item.duration_ms,
          exp: item.exp,
          first_login_at: item.first_login_at,
          trader_id: item.trader_id || '',
          device_id: item.device_id || ''
        };
      }
    }

    const code = generateBookmarkletCode(baseUrl, supabaseUrl, supabaseKey, builtinLicenses);
    const scriptUrl = `${baseUrl}/loader.js`;
    const encodedUrl = Buffer.from(scriptUrl).toString("base64");
    
    // Obfuscated Base64 Short Loader (Exact system requested by user)
    const obfuscatedLoader = `javascript:(function(){var u=atob('${encodedUrl}');var s=document.createElement('script');s.src=u+'?t='+Date.now();document.head.appendChild(s);})();`;
    const formattedObfuscatedLoader = `javascript:(function(){\\n  var u = atob('${encodedUrl}');\\n  var s = document.createElement('script');\\n  s.src = u + '?t=' + Date.now();\\n  document.head.appendChild(s);\\n})();`;

    const shortLoader = `javascript:(function(){var s=document.createElement('script');s.src='${scriptUrl}?t='+Date.now();document.body.appendChild(s);})();`;

    res.json({
      baseUrl,
      code,
      bookmarkletUrl: code.replace(/\\n\\s*/g, " "),
      scriptUrl,
      encodedUrl,
      obfuscatedLoader,
      formattedObfuscatedLoader,
      shortLoader
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Ishak AI Supabase Server running at http://0.0.0.0:${PORT}`);
    // Start Telegram Bot Polling Engine
    startTelegramBot().catch((err) => {
      console.error("Failed to start Telegram Bot:", err);
    });
  });
}

startServer();
