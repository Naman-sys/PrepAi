# PrepAI

PrepAI is an AI-powered mock interview platform with:
- Verbal interview simulation
- Coding round with editor + test cases
- Session reports and PDF export
- Auth + multi-user history + dashboard (via backend API)

## 1) Environment Setup
Create a local .env file using .env.example.

Required values:
- VITE_GROQ_API_KEY
- VITE_API_BASE_URL (default: http://localhost:4000/api)
- DATABASE_URL (your Neon PostgreSQL URL)
- JWT_SECRET
- API_PORT (default: 4000)
- FRONTEND_ORIGIN (comma-separated, e.g. http://localhost:5173,http://localhost:5174)

## 2) Install Dependencies
Run once:

npm install

## 3) Run Backend API
In one terminal:

npm run server

The backend auto-creates tables:
- app_users
- interview_sessions

## 4) Run Frontend
In another terminal:

npm run dev

## 5) Key User Flows
- Landing -> Auth (register/login) -> Dashboard
- Dashboard -> Start Interview -> Verbal round -> Coding round -> Report
- Completed sessions are saved locally and, if logged in, saved to PostgreSQL per user.

## 6) Security Notes
- Never expose DATABASE_URL or JWT_SECRET in frontend code.
- Rotate credentials if they were shared publicly.
- Keep API calls to the backend only for auth/data persistence.

## 7) Render One-Link Deployment
This repo is set up to run as a single Render web service.

How it works:
- Vite builds the frontend into `dist/`
- Express serves `dist/` for the SPA
- `/api/*` routes stay on the same Render URL

Render settings:
- Build command: `npm install && npm run build`
- Start command: `npm run server`
- Render injects `PORT` automatically; the server listens on that value in production.

Required production env vars on Render:
- `DATABASE_URL`
- `JWT_SECRET`
- `GROQ_API_KEY` or `VITE_GROQ_API_KEY` if you want the frontend warning banner to disappear at build time
- `FRONTEND_URL` set to your Render app URL, for example `https://prepai.onrender.com`
- `BACKEND_URL` set to the same Render app URL
- `FRONTEND_ORIGIN` set to the same Render app URL

Notes:
- Keep the deployed frontend and backend on the same Render URL for a single-link setup.
- If you change the Render app name, update the URL values in `render.yaml` and your Render environment settings.

Production security checklist:
- Rotate all secrets currently stored in local `.env` before going live.
- Replace the development `JWT_SECRET` with a long random production value.
- Prefer `AUTH_USE_HTTPONLY_COOKIE=true` for production once you are ready to remove localStorage-based auth tokens.
- Move the Groq API key out of the browser before public release if you want stronger quota protection.
