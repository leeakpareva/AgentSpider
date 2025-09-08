// Vercel serverless function for chat endpoint
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const { message, systemData } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful Raspberry Pi assistant. You have access to the following system data: ${JSON.stringify(systemData)}. Provide concise, helpful responses about the system status, troubleshooting, and optimization tips.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    res.status(200).json({ 
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}