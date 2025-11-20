const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

async function safeFetch(path, options = {}, cacheKey = null) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }))
    return data
  } catch (e) {
    if (cacheKey) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) return JSON.parse(cached).data
    }
    throw e
  }
}

export const api = {
  baseUrl: BASE_URL,
  getCourses: () => safeFetch('/api/courses', {}, 'cache:courses'),
  createCourse: (payload) => safeFetch('/api/courses', { method: 'POST', body: JSON.stringify(payload) }),

  getSchedule: (course_id) => {
    const q = course_id ? `?course_id=${course_id}` : ''
    return safeFetch(`/api/classsessions${q}`, {}, `cache:classsessions:${course_id || 'all'}`)
  },
  createClassSession: (payload) => safeFetch('/api/classsessions', { method: 'POST', body: JSON.stringify(payload) }),

  getAssignments: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return safeFetch(`/api/assignments${q ? `?${q}` : ''}`, {}, `cache:assignments:${q || 'all'}`)
  },
  createAssignment: (payload) => safeFetch('/api/assignments', { method: 'POST', body: JSON.stringify(payload) }),

  getNotes: (subject) => safeFetch(`/api/notes${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`, {}, `cache:notes:${subject || 'all'}`),
  createNote: (payload) => safeFetch('/api/notes', { method: 'POST', body: JSON.stringify(payload) }),

  createFocusSession: (payload) => safeFetch('/api/focus-sessions', { method: 'POST', body: JSON.stringify(payload) }),
  listFocusSessions: () => safeFetch('/api/focus-sessions', {}, 'cache:focus'),

  chatbot: (q) => safeFetch(`/api/chatbot?q=${encodeURIComponent(q)}`),
}
