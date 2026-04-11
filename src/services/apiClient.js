import { getAuthToken } from '../utils/authStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api')

async function request(path, options = {}) {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Cannot reach auth server. Start API with "npm run server" and check VITE_API_BASE_URL.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error || 'Request failed.'
    throw new Error(message)
  }

  return data
}

export const apiClient = {
  register: ({ name, email, password }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: ({ email, password }) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request('/auth/me'),

  createSession: (report) =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ report }),
    }),

  listSessions: () => request('/sessions'),

  getDashboardSummary: () => request('/dashboard/summary'),
}
