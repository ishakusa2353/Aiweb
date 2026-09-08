export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    const { key, traderId, deviceId } = body || {};
    const cleanKey = (key || '').trim().toUpperCase();

    if (!cleanKey) {
      return res.status(400).json({ valid: false, reason: 'No VIP License Key provided!' });
    }

    const rawSupabaseUrl = process.env.SUPABASE_URL || 'https://qbazzarqiplrqqfytajz.supabase.co';
    const SUPABASE_URL = rawSupabaseUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!SUPABASE_KEY) {
      return res.status(503).json({ valid: false, reason: 'Verification service temporarily unavailable. Please try again.' });
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses?key=eq.${encodeURIComponent(cleanKey)}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!resp.ok) {
      return res.status(503).json({ valid: false, reason: 'Service temporarily unavailable. Please try again.' });
    }

    const rows = await resp.json();
    if (!rows || !rows.length) {
      return res.status(404).json({ valid: false, reason: 'Invalid or unrecognized VIP License Key!' });
    }

    const row = rows[0];
    if (row.active === false) {
      return res.status(403).json({ valid: false, reason: 'This license has been deactivated.' });
    }

    // Device check
    if (row.device_id && deviceId && row.device_id !== deviceId) {
      return res.status(403).json({ valid: false, reason: 'This license is linked to another device.' });
    }

    const now = Date.now();
    const exp = row.exp ? Number(row.exp) : null;
    if (exp && now > exp) {
      return res.status(403).json({ valid: false, reason: 'This license key has expired.' });
    }

    return res.status(200).json({
      valid: true,
      exp: exp,
      tier: row.tier || 'VIP',
      duration: row.duration || '30d'
    });
  } catch (err: any) {
    console.error('License verification error:', err);
    return res.status(500).json({ valid: false, reason: 'Service temporarily unavailable. Please try again.' });
  }
}
