export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawSupabaseUrl = process.env.SUPABASE_URL || 'https://qbazzarqiplrqqfytajz.supabase.co';
  const SUPABASE_URL = rawSupabaseUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Database credentials not configured in environment variables.' });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. GET ALL LICENSES
    if (req.method === 'GET') {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses?key=neq.__ADMIN_CONFIG__&order=created_at.desc`, {
        headers
      });

      if (!resp.ok) {
        return res.status(resp.status).json({ success: false, error: 'Failed to fetch licenses from database' });
      }

      const rows = await resp.json();
      return res.status(200).json({ success: true, keys: rows, isSupabaseActive: true });
    }

    // 2. CREATE NEW LICENSE
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      const { key, tier, duration, customValue, customUnit, traderId, note } = body || {};

      let finalKey = (key || '').trim().toUpperCase();
      if (!finalKey) {
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const stamp = Date.now().toString(36).substring(3, 7).toUpperCase();
        finalKey = `ISHAK-${(tier || 'VIP').toUpperCase()}-${rand}-${stamp}`;
      }

      let parsedDurationMs: number | null = 30 * 86400 * 1000;
      let finalDurationStr = duration || '30d';

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
      }

      const newRecord = {
        key: finalKey,
        active: true,
        tier: (tier || 'VIP').toUpperCase(),
        duration: finalDurationStr,
        duration_ms: parsedDurationMs,
        exp: null,
        first_login_at: null,
        device_id: '',
        trader_id: (traderId || '').trim(),
        created_at: Date.now(),
        last_used_at: null,
        note: (note || '').trim()
      };

      const insResp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newRecord)
      });

      if (!insResp.ok) {
        const errText = await insResp.text();
        return res.status(400).json({ success: false, error: 'Database insert failed: ' + errText });
      }

      const result = await insResp.json();
      return res.status(201).json({ success: true, key: result[0] || newRecord });
    }

    // 3. DELETE LICENSE
    if (req.method === 'DELETE') {
      const { key } = req.query || {};
      if (!key) {
        return res.status(400).json({ success: false, error: 'Key query parameter required' });
      }

      const delResp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses?key=eq.${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers
      });

      if (!delResp.ok) {
        return res.status(500).json({ success: false, error: 'Delete failed' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
