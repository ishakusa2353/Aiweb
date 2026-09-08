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

    const SUPABASE_URL = 'https://qbazzarqiplrqqfytajz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiYXp6YXJxaXBscnFxZnl0YWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDc4NDUsImV4cCI6MjEwNDMyMzg0NX0.7BPbYW6P50Nh3OrkQU_T1GOwib-iKNUhLFoc1GxiNZo';

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses?key=eq.${encodeURIComponent(cleanKey)}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!resp.ok) {
      return res.status(502).json({ valid: false, reason: 'Supabase service unreachable' });
    }

    const rows = await resp.json();
    if (!rows || !rows.length) {
      return res.status(404).json({ valid: false, reason: '❌ লাইসেন্স ডাটাবেসে পাওয়া যায়নি!' });
    }

    const row = rows[0];
    if (row.active === false) {
      return res.status(403).json({ valid: false, reason: '⛔ এই লাইসেন্সটি ব্লক করা আছে!' });
    }

    // Device check
    if (row.device_id && deviceId && row.device_id !== deviceId) {
      return res.status(403).json({ valid: false, reason: '🔒 এই লাইসেন্সটি অন্য ডিভাইসে যুক্ত আছে!' });
    }

    const now = Date.now();
    const exp = row.exp ? Number(row.exp) : null;
    if (exp && now > exp) {
      return res.status(403).json({ valid: false, reason: '⏳ লাইসেন্সের মেয়াদ শেষ হয়ে গেছে!' });
    }

    return res.status(200).json({
      valid: true,
      exp: exp,
      tier: row.tier || 'VIP',
      duration: row.duration || '30d'
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, reason: err.message || 'Verification error' });
  }
}
