export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { name, desc, market, traction } = req.body || {};

  if (!name || !desc || !market) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `You are a VC evaluating a startup for investment.
Be brutally honest and specific. Do NOT be nice. Do NOT give generic feedback.

Startup: ${name}
Description: ${desc}
Target Market: ${market}
Traction: ${traction || 'None provided'}

Task:
1. Give a Fundability Score from 0-100 (be realistic, most early startups score 30-60)
2. Break score into four sub-scores (each 0-100):
   - Market Size
   - Traction
   - Problem Clarity
   - Business Model
3. Give exactly 4-5 specific reasons why a VC would pass on this. Be sharp and direct. Reference specific details from what was provided.

Respond ONLY in this exact JSON format, no other text:
{
  "score": <number>,
  "breakdown": {
    "market": <number>,
    "traction": <number>,
    "problem": <number>,
    "model": <number>
  },
  "feedback": [
    "<specific reason 1>",
    "<specific reason 2>",
    "<specific reason 3>",
    "<specific reason 4>",
    "<specific reason 5>"
  ]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a VC evaluating startups. Always respond with valid JSON only. No markdown, no extra text.'
          },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Groq API error:', response.status, errBody);
      return res.status(502).json({ error: 'AI service error. Try again.' });
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error('JSON parse failed:', rawText);
      return res.status(502).json({ error: 'Failed to parse AI response. Try again.' });
    }

    if (
      typeof parsed.score !== 'number' ||
      !parsed.breakdown ||
      !Array.isArray(parsed.feedback)
    ) {
      return res.status(502).json({ error: 'Unexpected AI response format. Try again.' });
    }

    return res.status(200).json({
      startupName: name,
      score:       Math.min(100, Math.max(0, Math.round(parsed.score))),
      breakdown: {
        market:   Math.min(100, Math.max(0, Math.round(parsed.breakdown.market   || 0))),
        traction: Math.min(100, Math.max(0, Math.round(parsed.breakdown.traction || 0))),
        problem:  Math.min(100, Math.max(0, Math.round(parsed.breakdown.problem  || 0))),
        model:    Math.min(100, Math.max(0, Math.round(parsed.breakdown.model    || 0))),
      },
      feedback: parsed.feedback.slice(0, 5)
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error. Try again.' });
  }
}
