export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    const { password } = body || {};
    const cleanPass = (password || '').trim();

    // Default password check
    if (cleanPass === 'ishakdevos') {
      return res.status(200).json({ success: true, message: 'এডমিন লগইন সফল হয়েছে।' });
    }

    // Direct Supabase password check for __ADMIN_CONFIG__
    const SUPABASE_URL = 'https://qbazzarqiplrqqfytajz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiYXp6YXJxaXBscnFxZnl0YWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDc4NDUsImV4cCI6MjEwNDMyMzg0NX0.7BPbYW6P50Nh3OrkQU_T1GOwib-iKNUhLFoc1GxiNZo';

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ishak_licenses?key=eq.__ADMIN_CONFIG__&select=note`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      const storedPass = data?.[0]?.note || 'ishakdevos';
      if (cleanPass === storedPass) {
        return res.status(200).json({ success: true, message: 'এডমিন লগইন সফল হয়েছে।' });
      }
    }

    return res.status(401).json({ success: false, error: 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'সার্ভার ত্রুটি' });
  }
}
