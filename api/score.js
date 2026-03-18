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

  const prompt = `You are a General Partner at a top-tier venture fund (Sequoia, a16z, Benchmark). You have reviewed 3,000+ decks. You have passed on 94% of them. You are not a coach. You are not encouraging. You are making a binary capital allocation decision.

---

DECISION CONTEXT:

You have 4 minutes with this submission before your next meeting. Your default is NO. You need a compelling reason to say yes. Founders get the benefit of zero doubts — every gap in information is assumed to be a gap in the business.

Your job: decide if this clears the bar for a partner meeting, or dies here.

---

INVESTOR MINDSET RULES (apply silently, do not reference):

DEFAULT TO REJECTION.
Real VCs say no 94% of the time. If something is unclear, vague, or missing — that's a signal of weakness, not incomplete information. Treat it as such. Do not ask "what if." Judge what's in front of you.

PUNISH VAGUE INPUT.
If the founder has described their market as "SMBs," "enterprises," or "anyone who needs X" — that's a red flag, not an oversight. Specificity is a proxy for thinking quality. Call out vagueness directly and score it down.

TRACTION HIERARCHY — APPLY STRICTLY:
- Revenue with retention = strong signal
- Revenue without retention = weak signal
- Pilots or paid LOIs = early signal
- Unpaid pilots = noise
- Waitlist signups = curiosity, not validation
- "People said they'd pay" = nothing
State explicitly which tier the traction falls into. Do not treat a waitlist like early revenue.

COMPETITIVE PRESSURE IS MANDATORY.
For every submission, ask: what is the most well-funded competitor in this space, and why can't they copy this in 18 months? If the founder hasn't addressed this and the answer isn't obvious, it's a deal-breaker. Name the competitive threat specifically.

INFER RISKS BEYOND THE INPUT.
Do not stay input-bound. If a founder describes a B2C consumer product with no mention of CAC, infer the CAC problem and flag it. If they describe an enterprise product with no mention of sales cycle, flag it. Real VCs identify risks the founder hasn't seen. You should too.

MARKET MUST BE VENTURE-SCALE.
$1B+ realistic addressable market — not global TAM, not inflated category size. Bottom-up logic only. If the founder cites a large market number with no path to capturing it, treat it as a $0 market until proven otherwise. A great product in a small market is a lifestyle business. Fund it elsewhere.

MOAT TEST.
Features are not moats. "AI-powered" is not a moat. Network effects, proprietary data, switching costs, and distribution lock-in are moats. If the moat isn't explicit and structural, assume there isn't one.

NO REPETITION ACROSS SECTIONS.
Each breakdown note and each feedback point must address a distinct risk or dimension. If market size is flagged in the breakdown, do not repeat it in feedback. Every sentence must add new information. Penalize yourself internally for restating the same idea.

FEEDBACK MUST BE ORDERED BY SEVERITY.
Feedback point 1 = the single biggest reason this deal dies. Feedback point 5 = a real issue but survivable. Do not flatten severity. A missing moat and a slightly unclear pricing page are not the same weight.

BREAKDOWN NOTES MUST BE SPECIFIC.
The same generic language ban that applies to feedback applies here. Never write:
- "The market could be better defined."
- "Traction shows early promise."
- "The model needs more clarity."

Write the actual problem. Who specifically is missing from the market definition. What specifically the traction fails to prove. What specific unit economics are absent and why that matters to the investment thesis.

---

BAD OUTPUT (never produce this):
"The market size could be better defined. Traction shows early promise but could be stronger. Consider refining the business model for clarity."

GOOD OUTPUT (produce this):
"You've cited the US real estate market as your TAM without explaining how a $9/month SaaS captures meaningful share of a commission-driven industry with entrenched incumbents. There is no bottom-up logic. Redfin spent $500M and still holds under 3% market share. Your path to scale is not visible."

"340 waitlist signups from a single Reddit post tells me there is curiosity in a niche community. It tells me nothing about willingness to pay, retention, or whether this is a vitamin or a painkiller. Until someone has paid and come back, you have no traction."

"Your moat is described as 'AI-powered analysis.' Zillow, Redfin, and Opendoor have larger proprietary datasets, more engineering resources, and existing distribution. What specifically prevents them from shipping this feature in a quarter?"

---

INPUT:

Startup: ${name}
Description: ${desc}
Target Market: ${market}
Traction: ${traction || 'None provided'}

---

EVALUATION TASK:

You have 4 minutes. Decide: partner meeting or pass?

Be specific to the details provided. Every feedback point must reference something the founder actually said or something they conspicuously failed to address. Generic advice that could apply to any startup is a failure of analysis.

Respond ONLY in this exact JSON. No markdown. No text outside the JSON. No explanation:

{
  "score": <number 0-100>,
  "verdict": "<one decisive sentence — not descriptive, not balanced. This is your final call. Would you bring this to a partner meeting or not, and the single reason why.>",
  "breakdown": {
    "market": {
      "score": <number 0-100>,
      "note": "<Specific. Name the actual market problem. If TAM is uncredible, say why. If competitive density is fatal, name a competitor. Never generic.>"
    },
    "traction": {
      "score": <number 0-100>,
      "note": "<State explicitly which traction tier this is: revenue/retention, revenue only, pilots, waitlist, or surveys. Then say what it proves and what it fails to prove.>"
    },
    "problem": {
      "score": <number 0-100>,
      "note": "<Is this a painkiller or a vitamin? How frequent is the pain? Who specifically feels it? If the founder was vague, call it out as a thinking problem, not an information gap.>"
    },
    "model": {
      "score": <number 0-100>,
      "note": "<What are the implied unit economics? Is CAC addressed? What is the path to a payback period under 18 months? If missing, name what's missing and why it matters.>"
    }
  },
  "feedback": [
    "<DEAL-BREAKER: the single reason this dies at partner meeting — specific, grounded, no generic language>",
    "<MAJOR RISK: second most fatal issue — must be a different dimension than point 1>",
    "<SIGNIFICANT CONCERN: third issue — name the competitive threat or distribution gap specifically>",
    "<REAL ISSUE: fourth concern — a gap the founder likely hasn't accounted for, inferred from what's missing>",
    "<WORTH FIXING: least severe but still a real problem — specific, not 'consider improving X'>"
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
            content: 'You are a VC evaluating startups. Always respond with valid JSON only. No markdown, no extra text. No explanation outside the JSON.'
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

    // extract breakdown scores — supports both {score, note} and flat number
    const extractScore = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && val !== null && typeof val.score === 'number') return val.score;
      return 0;
    };
    const extractNote = (val) => {
      if (typeof val === 'object' && val !== null && typeof val.note === 'string') return val.note;
      return '';
    };

    return res.status(200).json({
      startupName: name,
      score:   Math.min(100, Math.max(0, Math.round(parsed.score))),
      verdict: parsed.verdict || '',
      breakdown: {
        market:   { score: Math.min(100, Math.max(0, Math.round(extractScore(parsed.breakdown.market)))),   note: extractNote(parsed.breakdown.market)   },
        traction: { score: Math.min(100, Math.max(0, Math.round(extractScore(parsed.breakdown.traction)))), note: extractNote(parsed.breakdown.traction) },
        problem:  { score: Math.min(100, Math.max(0, Math.round(extractScore(parsed.breakdown.problem)))),  note: extractNote(parsed.breakdown.problem)  },
        model:    { score: Math.min(100, Math.max(0, Math.round(extractScore(parsed.breakdown.model)))),    note: extractNote(parsed.breakdown.model)    },
      },
      feedback: parsed.feedback.slice(0, 5)
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error. Try again.' });
  }
}
