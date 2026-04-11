import { verifyToken } from './auth.js'

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'prepai_auth_token'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] || ''
  const token = bearerToken || cookieToken

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    const payload = verifyToken(token)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
