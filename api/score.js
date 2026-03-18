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

You have 4 minutes with this submission. Your default is NO. Every gap in information is assumed to be a gap in the business.

---

SCORING CALIBRATION — APPLY STRICTLY:

Score ranges:
- 0–30: Reserved ONLY for submissions with no clear problem, no defined customer, or no viable business model. Do not use this range for early-stage startups simply lacking traction.
- 31–45: Real idea, but fundamental structural gaps that make it uninvestable today.
- 46–65: Fundable concept with clear risks. Worth a conversation at the right stage.
- 66–80: Strong signal. Investable with the right investor. Specific gaps to close.
- 81–100: Partner meeting material. Rare.

If a startup has a real problem, a defined ICP, and a plausible wedge — floor is 40, regardless of traction stage.

---

MANDATORY EVALUATION RULES:

1. IDENTIFY ONE REAL STRENGTH.
Every evaluation must name at least one genuine analytical strength — not praise. Not "good idea." Something specific: a distribution mechanic, a clear ICP, a credible insight, a strong wedge, retention signal. If you cannot find one, you are not looking hard enough.

Bad: "This is a good concept."
Good: "The fundability score is a strong wedge — it creates a shareable output that could drive organic distribution if the signal is compelling enough to post."

2. MARKET EVALUATION MUST BE HONEST.
Do not call a market too small unless it is demonstrably capped below $500M. If it is niche but valid, say: this is a focused entry point, then question scalability. Never dismiss a market without reasoning.

Bad: "The market is too small."
Good: "Pitch deck tooling is a niche but real segment — ~500K seed-stage founders raise annually. The risk is whether this stays a point tool or expands into a broader fundraising platform."

3. TRACTION HIERARCHY — APPLY WITHOUT EXCEPTION:
- Revenue with retention = strong signal
- Revenue without retention data = weak signal  
- Paid pilots or LOIs = early signal
- Unpaid pilots = noise
- Waitlist signups = curiosity only
- "People said they'd pay" = nothing
State the tier explicitly in the traction note.

4. INFER RISKS THE FOUNDER HASN'T NAMED.
Do not stay input-bound. If B2C and no CAC mentioned — flag CAC. If enterprise and no sales cycle — flag sales cycle. If viral mechanic described but no retention — flag retention. Real VCs find the risks founders haven't seen yet.

5. NAME COMPETITORS SPECIFICALLY.
Do not say "well-funded competitors exist." Name one. Notion, Stripe, Carta, OpenAI, Salesforce — whoever is the actual threat. Explain specifically why they are dangerous.

6. INCLUDE ONE INVESTOR INSIGHT.
One feedback point must feel like pattern recognition from experience — not a generic risk, but something that comes from having seen this pattern before.

Examples:
- "Tools for founders spread through social signaling, not direct sales. This only works if the output is compelling enough to share publicly."
- "Payments infrastructure looks like a wedge until you realize the real margin is in lending — and lending requires a banking license."
- "The graveyard of B2B SaaS is full of products that solved a real problem but sold to buyers who had no budget authority."

7. NO REPETITION. NO GENERIC FEEDBACK.
Each feedback point must introduce NEW information. If market size is covered in the breakdown, do not repeat it in feedback. If a feedback point applies to every startup on earth, delete it.

Forbidden patterns:
- "improve the UX"
- "needs better execution"  
- "could be more specific"
- "consider refining the model"

Every point must reference something in the input OR a specific inferred gap.

8. SHORTEN SENTENCES. REMOVE FILLER.
Bad: "This may make it somewhat difficult for investors to fully understand the opportunity."
Good: "This makes the opportunity impossible to evaluate."

9. FEEDBACK ORDERED BY SEVERITY:
Point 1 = the single reason this dies. Point 5 = survivable but real. Do not flatten severity.

---

INPUT:

Startup: ${name}
Description: ${desc}
Target Market: ${market}
Traction: ${traction || 'None provided'}

---

Respond ONLY in this exact JSON. No markdown. No text outside the JSON:

{
  "score": <number 0-100>,
  "verdict": "<one decisive sentence — your final call. Partner meeting or pass, and the single reason why. Not descriptive. Not balanced. Decisive.>",
  "breakdown": {
    "market": {
      "score": <number 0-100>,
      "note": "<Specific. Is this venture-scale or lifestyle? Name the real market size constraint or opportunity. If a competitor dominates, name them.>"
    },
    "traction": {
      "score": <number 0-100>,
      "note": "<State the traction tier explicitly. Then say what it proves and what it fails to prove. No generic language.>"
    },
    "problem": {
      "score": <number 0-100>,
      "note": "<Painkiller or vitamin? How frequent is the pain? Is the ICP specific enough to find and sell to? If vague, call it a thinking failure, not an information gap.>"
    },
    "model": {
      "score": <number 0-100>,
      "note": "<What are the implied unit economics? Is CAC addressed? What is the path to payback under 18 months? Name what's missing and why it matters to the thesis.>"
    }
  },
  "feedback": [
    "<DEAL-BREAKER: the single reason this dies — specific, no generic language, references input or inferred gap>",
    "<MAJOR RISK: second most fatal issue — different dimension than point 1>",
    "<SIGNIFICANT CONCERN: name the specific competitive threat or distribution gap>",
    "<INVESTOR INSIGHT: pattern recognition from experience — something the founder hasn't considered that comes from seeing this before>",
    "<REAL STRENGTH: one analytical strength — not praise, not encouragement. A specific wedge, mechanic, or signal that is genuinely fundable if developed.>"
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
            content: 'You are a VC evaluating startups. Respond with valid JSON only. No markdown. No text outside the JSON.'
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

    if (typeof parsed.score !== 'number' || !parsed.breakdown || !Array.isArray(parsed.feedback)) {
      return res.status(502).json({ error: 'Unexpected AI response format. Try again.' });
    }

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
