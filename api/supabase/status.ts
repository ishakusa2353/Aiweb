export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = 'https://qbazzarqiplrqqfytajz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiYXp6YXJxaXBscnFxZnl0YWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDc4NDUsImV4cCI6MjEwNDMyMzg0NX0.7BPbYW6P50Nh3OrkQU_T1GOwib-iKNUhLFoc1GxiNZo';

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
