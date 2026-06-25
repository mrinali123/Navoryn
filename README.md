# Roamly

**AI-powered travel itinerary planner** — describe your trip once and get a fully structured day-by-day plan with real places, optimal timing, restaurant picks, weather forecasts, and a built-in budget tracker.

Built as a solo full-stack project to explore LLM-driven UX: the interesting challenge was making AI output reliable enough to drive a real UI — parsing streaming JSON, handling model rate limits gracefully, and keeping the experience fast even when generation takes time.

**[Live Demo →](https://roamly-ten.vercel.app)**

---

## Features

- **AI itinerary generation** — Groq-powered, streams progress in real time; respects arrival/departure times, pace preference, budget, interests, dietary needs, and must-visit places
- **Constraint engine** — deterministic rule layer validates and auto-repairs AI output before saving (deduplication, meal completeness, time window enforcement, travel feasibility)
- **Day-by-day view** — per-day weather forecast, sightseeing places with GPS coordinates and timing rationale, restaurant picks, and quick tips
- **Interactive map** — Leaflet map with numbered pins for every place; real road routing via OSRM
- **Budget tracker** — log expenses by category, visualize spending with charts
- **Trip sharing** — public share link or email-invite collaborators
- **AI chat assistant** — ask questions about your trip, get suggestions, iterate on plans
- **PDF export** — download the full itinerary as a formatted PDF
- **Offline support** — PWA with localStorage and IndexedDB cache; saved trips work without internet

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth & Database | Supabase (Postgres + Row Level Security) |
| AI | Groq API (`llama-3.1-8b-instant`) |
| Maps | Leaflet + react-leaflet + OSRM routing |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| Email | Nodemailer (Gmail SMTP) + Resend fallback |
| Logging | pino + AsyncLocalStorage |
| Testing | Vitest + Testing Library |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (free tier works)

### Install

```bash
git clone https://github.com/mrinali123/Roamly.git
cd Roamly
npm install
```

### Environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) — optional, for invite emails |
| `GMAIL_USER` | Your Gmail address — for invite emails via SMTP |
| `GMAIL_APP_PASSWORD` | Google Account → Security → App Passwords |

### Database

In your Supabase project, open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it. That single file creates all tables, indexes, RLS policies, and functions needed to run the app.

Then add your app URLs to **Supabase → Authentication → URL Configuration → Redirect URLs**:

```
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Tests

```bash
npm test
```

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes (itinerary, chat, share, expenses, PDF export)
│   ├── auth/                 # Sign in, sign up, reset password pages
│   ├── dashboard/            # Main dashboard
│   ├── trips/
│   │   ├── new/              # Multi-step trip planning form
│   │   └── [id]/             # Trip detail view + edit
│   └── share/[token]/        # Public shared trip view (no auth required)
├── components/
│   ├── itinerary/            # PlaceCard, WeatherCard, MealsCard, DayTimeline
│   ├── chat/                 # AI chat panel (trip-specific + general)
│   ├── budget/               # BudgetTracker, ExpenseForm, SpendingChart
│   ├── dashboard/            # HeroCarousel, TripCard, StatCard
│   └── ui/                   # Shared primitives (GlassCard, Skeleton, ErrorBoundary)
├── lib/
│   ├── db/trips.ts           # All Supabase queries
│   ├── constraint-engine.ts  # Post-AI validation and repair layer
│   ├── prompts/              # AI prompt builders (itinerary + chat)
│   └── supabase/             # Client, server, and Edge middleware helpers
└── types/                    # TypeScript interfaces (trip, budget, weather)
```

## Deployment

Push to GitHub and import into [Vercel](https://vercel.com). Add all environment variables in Vercel → Project Settings → Environment Variables. No other config needed — Vercel auto-deploys on every push to `main`.

## License

MIT
