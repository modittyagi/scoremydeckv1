# ScoreMyDeck

AI tool that gives startups a Fundability Score and explains why investors would reject them.

## Project Structure

```
scoremydeck/
├── index.html        → Landing page (waitlist + marketing)
├── app.html          → The actual tool (score form + results)
├── vercel.json       → Vercel config (API timeout settings)
├── api/
│   └── score.js      → Serverless API endpoint (calls Claude)
└── README.md
```

## Deploy to Vercel

### 1. Add API Key
Vercel Dashboard → Project → Settings → Environment Variables

```
ANTHROPIC_API_KEY = sk-ant-your-key-here
```

### 2. Add Supabase Keys (for waitlist on landing page)
```
NEXT_PUBLIC_SUPABASE_URL  = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
```

### 3. Deploy
Push to GitHub and connect to Vercel, or use Vercel CLI:
```bash
npx vercel --prod
```

## How It Works

1. User visits `index.html` → joins waitlist (stored in Supabase)
2. User visits `app.html` → enters startup details
3. Frontend calls `POST /api/score` with the form data
4. API calls Claude with a VC evaluation prompt
5. Claude returns JSON: score, breakdown, feedback
6. Results render on screen with animated bars

## API

`POST /api/score`

Request body:
```json
{
  "name": "Startup name",
  "desc": "What it does",
  "market": "Target customer",
  "traction": "Optional traction info"
}
```

Response:
```json
{
  "startupName": "...",
  "score": 67,
  "breakdown": {
    "market": 70,
    "traction": 40,
    "problem": 80,
    "model": 60
  },
  "feedback": [
    "Specific VC rejection reason 1",
    "..."
  ]
}
```
