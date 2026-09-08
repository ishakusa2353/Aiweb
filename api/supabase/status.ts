export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qbazzarqiplrqqfytajz.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses?select=count`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    return res.status(200).json({
      connected: resp.ok,
      supabaseUrl: SUPABASE_URL,
      status: resp.ok ? 'online' : 'error',
      timestamp: Date.now()
    });
  } catch (err: any) {
    return res.status(200).json({
      connected: false,
      supabaseUrl: SUPABASE_URL,
      status: 'offline',
      error: err.message,
      timestamp: Date.now()
    });
  }
}
