import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { licenseDb, LicenseRecord, parseDurationToMs } from "./server/db.ts";
import { generateBookmarkletCode, generateRawScriptCode } from "./server/bookmarkletTemplate.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
          reason: "This license key was not found or has been deleted from the database!"
        });
      }

      if (license.active === false) {
        return res.status(403).json({
          valid: false,
          reason: "This license key has been blocked by the administrator."
        });
      }

      // 🔒 DEVICE LOCK DETECTION:
      // Single device policy: If already logged in on a device, reject other devices.
      if (license.device_id && license.device_id.trim() !== "") {
        if (inputDeviceId && license.device_id !== inputDeviceId) {
          return res.status(403).json({
            valid: false,
            reason: "This license is already bound to another device! Single device lock active."
          });
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
      let needSave = false;
      if (!license.first_login_at) {
        license.first_login_at = Date.now();
        // If not a lifetime key, calculate exp from duration_ms starting NOW
        if (license.duration !== 'lifetime' && license.duration_ms) {
          license.exp = license.first_login_at + license.duration_ms;
        }
        needSave = true;
      }

      // Bind deviceId if not bound yet
      if (!license.device_id && inputDeviceId) {
        license.device_id = inputDeviceId;
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

  app.post("/api/admin/change-password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "বর্তমান এবং নতুন উভয় পাসওয়ার্ড দিন!" });
    }
    const result = licenseDb.changeAdminPassword(oldPassword, newPassword);
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
      const { key, tier, duration, customValue, customUnit, traderId, note } = req.body;

      let finalKey = (key || "").trim().toUpperCase();
      if (!finalKey) {
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        finalKey = `ISHAK-${(tier || "VIP").toUpperCase()}-${rand}-${Date.now().toString(36).substring(3).toUpperCase()}`;
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

      const newRecord: LicenseRecord = {
        key: finalKey,
        active: true,
        tier: (tier || "VIP").toUpperCase(),
        duration: finalDurationStr,
        duration_ms: parsedDurationMs,
        exp: null, // Calculated strictly on first login!
        first_login_at: null,
        device_id: "",
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

      const { active, traderId, extendDays, extendMinutes, resetDevice, note } = req.body;

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
      schemaSql: `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS ishak_licenses (
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

-- Enable RLS:
ALTER TABLE ishak_licenses ENABLE ROW LEVEL SECURITY;

-- Allow server backend with service role:
CREATE POLICY "Allow server service full access" ON ishak_licenses FOR ALL USING (true);`
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
  const serveBotScript = (req: express.Request, res: express.Response) => {
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const rawCode = generateRawScriptCode(baseUrl);
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(rawCode);
  };

  app.get("/bot.js", serveBotScript);
  app.get("/loader.js", serveBotScript);

  // 5. BOOKMARKLET GENERATION ENDPOINT
  app.get("/api/bookmarklet-code", (req, res) => {
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const code = generateBookmarkletCode(baseUrl);
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
  });
}

startServer();
