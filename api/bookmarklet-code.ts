export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = req.headers['host'] || 'itadmin-gilt.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;
  const scriptUrl = `${baseUrl}/loader.js`;
  const encodedUrl = Buffer.from(scriptUrl).toString('base64');
  const shortLoader = `javascript:(function(){var s=document.createElement('script');s.src='${scriptUrl}?t='+Date.now();document.body.appendChild(s);})();`;

  return res.status(200).json({
    baseUrl,
    scriptUrl,
    encodedUrl,
    shortLoader,
    bookmarkletUrl: shortLoader
  });
}
