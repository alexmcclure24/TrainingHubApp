# Training Hub

A phone-friendly web app that builds each person a custom 4-week training block from a short questionnaire and gives them a log for their lifts, food, macros, bodyweight and test results.

## What's in version 1

- **Sign up / sign in**: open signup with an emailed sign-in link (no passwords).
- **Intake questionnaire**: stats, goal (recomp, fat loss, build, strength), experience, lifting days per week (2–6), session length, equipment (full gym, dumbbells, home) and start week.
- **Rule-based plan generator** (`src/lib/plan.ts`): 3 progressive weeks plus a test week. It picks the split for the number of days, the exercises for the equipment, sets and reps for the goal, effort calls for the experience level, and calories and macros for each week.
- **Dashboard**: week tabs, weekly summary, daily check-ins, food and macros with "what to eat next" suggestions, session cards with set logging, and a baseline vs. retest board.
- **Exports**: printable PDF session sheets and an Excel download of the whole log.
- **Demo mode**: with no database connected, the app runs fully and saves data in the browser.

Planned for version 2: AI-written plans and chat logging ("bench 185×6, 185×6, 185×5 to failure").

## Running it

See **[SETUP.md](SETUP.md)** for the step-by-step guide to putting it online.

For developers:

```bash
npm install
npm run dev      # http://localhost:5173 (demo mode unless .env.local is set)
npm test         # plan generator tests
npm run build
```

## How it's built

- React + TypeScript + Vite (static site, no server code)
- Supabase handles logins and the database. Everything lives in one `entries` table, protected so each person can only read and write their own rows (`supabase/schema.sql`).
- Vercel (or any static host) hosts the site.
