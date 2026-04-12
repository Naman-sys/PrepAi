import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import Groq from 'groq-sdk'
import { randomBytes } from 'crypto'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool, initDb } from './db.js'
import { hashPassword, signToken, verifyPassword } from './auth.js'
import { requireAuth } from './middleware.js'

const app = express()

const port = Number(process.env.PORT || process.env.API_PORT || 4000)
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'prepai_auth_token'
const USE_HTTP_ONLY_AUTH_COOKIE = String(process.env.AUTH_USE_HTTPONLY_COOKIE || 'false').toLowerCase() === 'true'
const AUTH_COOKIE_SECURE = String(process.env.AUTH_COOKIE_SECURE || (process.env.NODE_ENV === 'production' ? 'true' : 'false')).toLowerCase() === 'true'
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || ''
const groqClient = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
const oauthStateStore = new Map()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')
const indexHtmlPath = path.join(distPath, 'index.html')

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
})

const oauthStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OAuth attempts. Please try again shortly.' },
})

function pruneExpiredOAuthStates() {
  const now = Date.now()
  oauthStateStore.forEach((entry, key) => {
    if (!entry || entry.expiresAt <= now) {
      oauthStateStore.delete(key)
    }
  })
}

function createOAuthState(provider) {
  pruneExpiredOAuthStates()
  const state = randomBytes(24).toString('hex')
  oauthStateStore.set(state, {
    provider,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  })
  return state
}

function consumeOAuthState(state) {
  if (!state) return null
  const entry = oauthStateStore.get(state)
  oauthStateStore.delete(state)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry
}

function setAuthCookie(res, token) {
  if (!USE_HTTP_ONLY_AUTH_COOKIE) return
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: AUTH_COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

function clearAuthCookie(res) {
  if (!USE_HTTP_ONLY_AUTH_COOKIE) return
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: AUTH_COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  })
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('CORS blocked'))
  },
  credentials: true,
}))
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      mediaSrc: ["'self'", 'blob:'],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(express.static(distPath))

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
})

app.post('/api/ai/complete', async (req, res) => {
  if (!groqClient) {
    return res.status(400).json({ error: 'Groq API key is not configured on the server.' })
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' })
  }

  const model = String(req.body?.model || 'llama-3.1-8b-instant')
  const temperature = Number.isFinite(Number(req.body?.temperature)) ? Number(req.body.temperature) : 0.7
  const max_tokens = Number.isFinite(Number(req.body?.max_tokens)) ? Number(req.body.max_tokens) : 300
  const responseFormat = req.body?.response_format

  try {
    const completion = await groqClient.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    })

    const reply = completion.choices?.[0]?.message?.content?.trim() || ''
    return res.json({ reply })
  } catch (error) {
    console.error('[AI] Groq completion failed:', error)
    return res.status(500).json({ error: error?.message || 'Connection error.' })
  }
})

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  try {
    const existing = await pool.query('SELECT id FROM app_users WHERE email = $1', [email])
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already registered.' })
    }

    const passwordHash = await hashPassword(password)
    const result = await pool.query(
      'INSERT INTO app_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, passwordHash],
    )

    const user = result.rows[0]
    const token = signToken({ userId: user.id, email: user.email, name: user.name })
    setAuthCookie(res, token)
    return res.status(201).json({ token, user })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Registration failed.' })
  }
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  try {
    const result = await pool.query('SELECT id, name, email, password_hash FROM app_users WHERE email = $1', [email])
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const user = result.rows[0]
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const token = signToken({ userId: user.id, email: user.email, name: user.name })
    setAuthCookie(res, token)
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Login failed.' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res)
  return res.json({ ok: true })
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM app_users WHERE id = $1', [req.user.userId])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }
    return res.json({ user: result.rows[0] })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not load profile.' })
  }
})

app.post('/api/sessions', requireAuth, async (req, res) => {
  const report = req.body?.report
  if (!report || typeof report !== 'object') {
    return res.status(400).json({ error: 'report object is required.' })
  }

  const verbalAnswered = Array.isArray(report.questionBreakdown)
    ? report.questionBreakdown.length
    : 0
  const codingAttempted = Array.isArray(report.codingBreakdown)
    ? report.codingBreakdown.filter((entry) => !entry?.skipped).length
    : 0

  if (verbalAnswered === 0 && codingAttempted === 0) {
    return res.status(400).json({ error: 'Session not saved because no questions were completed.' })
  }

  const domain = report.domain || null
  const difficulty = report.difficulty || null
  const overallScore = Number(report.overallScore || 0)
  const codingScore = Number(report.codingOverallScore || 0)

  try {
    const result = await pool.query(
      `INSERT INTO interview_sessions (user_id, domain, difficulty, overall_score, coding_score, report_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [req.user.userId, domain, difficulty, overallScore, codingScore, report],
    )
    return res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to save session.' })
  }
})

app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, domain, difficulty, overall_score, coding_score, created_at, report_json
       FROM interview_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.userId],
    )

    const rows = result.rows.map((row) => ({
      id: row.id,
      domain: row.domain,
      difficulty: row.difficulty,
      overallScore: Number(row.overall_score || 0),
      codingScore: Number(row.coding_score || 0),
      createdAt: row.created_at,
      report: row.report_json,
    }))

    return res.json({ sessions: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch sessions.' })
  }
})

app.get('/api/dashboard/summary', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT domain, overall_score, coding_score, created_at
       FROM interview_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.user.userId],
    )

    const sessions = result.rows
    const total = sessions.length
    const avgOverall = total
      ? sessions.reduce((sum, row) => sum + Number(row.overall_score || 0), 0) / total
      : 0
    const avgCoding = total
      ? sessions.reduce((sum, row) => sum + Number(row.coding_score || 0), 0) / total
      : 0

    const domainMap = {}
    sessions.forEach((row) => {
      const key = row.domain || 'Unknown'
      if (!domainMap[key]) {
        domainMap[key] = { total: 0, scoreSum: 0 }
      }
      domainMap[key].total += 1
      domainMap[key].scoreSum += Number(row.overall_score || 0)
    })

    const byDomain = Object.entries(domainMap).map(([domain, value]) => ({
      domain,
      count: value.total,
      avgScore: value.total ? value.scoreSum / value.total : 0,
    }))

    return res.json({
      totalSessions: total,
      avgOverall,
      avgCoding,
      byDomain,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch dashboard summary.' })
  }
})

// Google OAuth endpoint
app.get('/api/auth/google', oauthStartLimiter, (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`
  
  if (!googleClientId) {
    return res.status(400).json({ error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable.' })
  }
  
  const state = createOAuthState('google')
  const scope = 'openid profile email'
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`
  
  res.redirect(googleAuthUrl)
})

// GitHub OAuth endpoint
app.get('/api/auth/github', oauthStartLimiter, (req, res) => {
  const githubClientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/github/callback`
  
  if (!githubClientId) {
    return res.status(400).json({ error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID environment variable.' })
  }
  
  const state = createOAuthState('github')
  const scope = 'user:email'
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`
  
  res.redirect(githubAuthUrl)
})

// Google OAuth callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error, state } = req.query
  
  if (error) {
    return res.redirect(`${FRONTEND_URL}?auth_error=${error}`)
  }

  const stateEntry = consumeOAuthState(String(state || ''))
  if (!stateEntry || stateEntry.provider !== 'google') {
    return res.redirect(`${FRONTEND_URL}?auth_error=invalid_state`)
  }
  
  if (!code) {
    return res.redirect(`${FRONTEND_URL}?auth_error=no_code`)
  }
  
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`
    
    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials not configured')
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    
    const tokens = await tokenResponse.json()
    if (!tokens.access_token) {
      throw new Error('Failed to obtain access token')
    }
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    
    const googleUser = await userResponse.json()
    
    if (!googleUser.email) {
      throw new Error('Could not retrieve email from Google')
    }
    
    // Find or create user
    let userResult = await pool.query('SELECT id, name, email FROM app_users WHERE email = $1', [googleUser.email])
    
    if (userResult.rowCount === 0) {
      // Create new user from Google data
      userResult = await pool.query(
        'INSERT INTO app_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [googleUser.name || googleUser.email, googleUser.email, ''],
      )
    }
    
    const user = userResult.rows[0]
    const token = signToken({ userId: user.id, email: user.email, name: user.name })
    setAuthCookie(res, token)
    
    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}?auth_token=${token}&auth_user=${encodeURIComponent(JSON.stringify({ id: user.id, name: user.name, email: user.email }))}`)
  } catch (error) {
    console.error('[OAuth] Google callback error:', error)
    res.redirect(`${FRONTEND_URL}?auth_error=${encodeURIComponent(error.message)}`)
  }
})

// GitHub OAuth callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code, error, state } = req.query
  
  if (error) {
    return res.redirect(`${FRONTEND_URL}?auth_error=${error}`)
  }

  const stateEntry = consumeOAuthState(String(state || ''))
  if (!stateEntry || stateEntry.provider !== 'github') {
    return res.redirect(`${FRONTEND_URL}?auth_error=invalid_state`)
  }
  
  if (!code) {
    return res.redirect(`${FRONTEND_URL}?auth_error=no_code`)
  }
  
  try {
    const githubClientId = process.env.GITHUB_CLIENT_ID
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/github/callback`
    
    if (!githubClientId || !githubClientSecret) {
      throw new Error('GitHub OAuth credentials not configured')
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })
    
    const tokens = await tokenResponse.json()
    if (!tokens.access_token) {
      throw new Error('Failed to obtain access token from GitHub')
    }
    
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    
    const githubUser = await userResponse.json()
    
    // Get email if not in user object
    let email = githubUser.email
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const emails = await emailResponse.json()
      email = emails.find((e) => e.primary)?.email || emails[0]?.email
    }
    
    if (!email) {
      throw new Error('Could not retrieve email from GitHub')
    }
    
    // Find or create user
    let userResult = await pool.query('SELECT id, name, email FROM app_users WHERE email = $1', [email])
    
    if (userResult.rowCount === 0) {
      // Create new user from GitHub data
      userResult = await pool.query(
        'INSERT INTO app_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [githubUser.name || githubUser.login, email, ''],
      )
    }
    
    const user = userResult.rows[0]
    const token = signToken({ userId: user.id, email: user.email, name: user.name })
        setAuthCookie(res, token)
    
    // Redirect to frontend with token
        res.redirect(`${FRONTEND_URL}?auth_token=${token}&auth_user=${encodeURIComponent(JSON.stringify({ id: user.id, name: user.name, email: user.email }))}`)
  } catch (error) {
    console.error('[OAuth] GitHub callback error:', error)
        res.redirect(`${FRONTEND_URL}?auth_error=${encodeURIComponent(error.message)}`)
  }
})

async function start() {
  try {
    await initDb()
    app.listen(port, () => {
      console.log(`[server] API running on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('[server] Failed to start:', error)
    process.exit(1)
  }
}

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    next()
    return
  }

  if (!existsSync(indexHtmlPath)) {
    res.status(200).send('PrepAI API is running. Build the frontend first so this route can serve the SPA.')
    return
  }

  res.sendFile(indexHtmlPath, (error) => {
    if (error) {
      next(error)
    }
  })
})

start()
