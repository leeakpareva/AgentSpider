// Vercel serverless function for crawler endpoint

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Note: Web crawling functionality is limited on Vercel
  // This is a placeholder that returns a message
  res.status(200).json({ 
    message: 'Crawler functionality is not available in the Vercel deployment. This feature requires a Raspberry Pi environment.',
    url: url,
    status: 'unavailable'
  });
}