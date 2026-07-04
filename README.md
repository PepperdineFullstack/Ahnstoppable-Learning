# Ahnstoppable Learning

Live discussion board for use during lectures. Students post questions and comments in real time while the professor runs the class — with anonymous posting for students, live "do you understand?" checks, a talent-point leaderboard, and professor moderation.

## Structure

```
frontend/   React 19 + Vite + Tailwind SPA (deployed on Vercel)
backend/    Express 5 + Socket.IO + PostgreSQL API (needs a persistent host — not Vercel)
```

Sign-in supports **email/password** and **Google OAuth** (Passport). Accounts are either `student` or `professor` — professors create classes (join codes), post discussion topics, see real author names, moderate comments, and watch the live understanding tally.

## Prerequisites

- Node.js 20+
- PostgreSQL running locally

## Setup

### 1. Database

```bash
createdb AhnstoppableLearning
psql -d AhnstoppableLearning -f backend/schema.sql
```

(For a database created before the OAuth update, run `psql -d AhnstoppableLearning -f backend/migrations/001_oauth_understand.sql` instead.)

### 2. Backend

```bash
cd backend
cp .env.example .env   # then fill in real values
npm install
npm run dev            # http://localhost:4000
```

`.env` values:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | e.g. `postgresql://postgres:PASSWORD@localhost:5432/AhnstoppableLearning` |
| `JWT_SECRET` | long random string used to sign auth tokens |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/api/auth/google/callback` (must be an authorized redirect URI in Google Cloud Console) |
| `CLIENT_URL` | frontend origin, `http://localhost:5173` in dev |
| `CORS_ORIGIN` | comma-separated allowed origins, `http://localhost:5173` in dev |

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm install
npm run dev            # http://localhost:5173
```

## Deployment

- **Frontend (Vercel):** set the project's **Root Directory to `frontend`**, and add a `VITE_API_URL` environment variable pointing at the deployed backend. `frontend/vercel.json` handles the SPA rewrite.
- **Backend:** requires a persistent Node server for Socket.IO (Render, Railway, Fly, etc. — Vercel serverless won't hold socket connections). Set all the `.env` values there, with `CLIENT_URL`/`CORS_ORIGIN` pointing at the Vercel URL, and add the production callback URL in Google Cloud Console.
