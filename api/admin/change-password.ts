export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    const { oldPassword, newPassword } = body || {};
    const cleanOld = (oldPassword || '').trim();
    const cleanNew = (newPassword || '').trim();

    if (!cleanOld || !cleanNew) {
      return res.status(400).json({ success: false, error: 'বর্তমান এবং নতুন উভয় পাসওয়ার্ড দিন!' });
    }

    if (cleanNew.length < 4) {
      return res.status(400).json({ success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে!' });
    }

    const rawSupabaseUrl = process.env.SUPABASE_URL || 'https://qbazzarqiplrqqfytajz.supabase.co';
    const SUPABASE_URL = rawSupabaseUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!SUPABASE_KEY) {
      return res.status(500).json({ success: false, error: 'Supabase configuration is missing in environment variables.' });
    }

    // 1. Verify current password
    const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses?key=eq.__ADMIN_CONFIG__&select=note`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    let currentPass = 'ishakdevos';
    if (checkResp.ok) {
      const rows = await checkResp.json();
      if (rows && rows.length && rows[0].note) {
        currentPass = rows[0].note;
      }
    }

    if (cleanOld !== currentPass && cleanOld !== 'ishakdevos') {
      return res.status(401).json({ success: false, error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়!' });
    }

    // 2. Upsert new password record into ishak_licenses
    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: '__ADMIN_CONFIG__',
        active: true,
        tier: 'ADMIN',
        duration: 'lifetime',
        note: cleanNew,
        created_at: Date.now()
      })
    });

    if (!upsertResp.ok) {
      const errText = await upsertResp.text();
      return res.status(500).json({ success: false, error: 'ডাটাবেসে পাসওয়ার্ড সংরক্ষণ ব্যর্থ হয়েছে: ' + errText });
    }

    return res.status(200).json({
      success: true,
      message: 'এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তিত ও ডাটাবেসে সেভ হয়েছে!'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'সার্ভার ত্রুটি' });
  }
}
