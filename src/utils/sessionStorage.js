const STORAGE_KEY = 'prepai_sessions'
const MAX_SESSIONS = 20

/**
 * Load all saved sessions from localStorage.
 * @returns {Array} Array of session objects
 */
export function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Save a new session report to localStorage.
 * Trims to MAX_SESSIONS to avoid unlimited growth.
 * @param {Object} sessionData
 * @returns {string} session id
 */
export function saveSession(sessionData) {
  try {
    const sessions = loadSessions()
    const id = `session_${Date.now()}`
    const entry = {
      id,
      date: new Date().toISOString(),
      ...sessionData,
    }

    const updated = [entry, ...sessions].slice(0, MAX_SESSIONS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return id
  } catch {
    return null
  }
}

/**
 * Delete a specific session by id.
 * @param {string} id
 */
export function deleteSession(id) {
  try {
    const sessions = loadSessions().filter((s) => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

/**
 * Clear all saved sessions.
 */
export function clearAllSessions() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Get a single session by id.
 * @param {string} id
 * @returns {Object|null}
 */
export function getSession(id) {
  return loadSessions().find((s) => s.id === id) || null
}
