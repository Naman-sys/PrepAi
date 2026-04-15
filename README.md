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

- ## 7) Deployed link : https://prepai-1xlw.onrender.com
