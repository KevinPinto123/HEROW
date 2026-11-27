import { supabase } from './supabase'

// Cliente del backend HEROW. En desarrollo /api pasa por el proxy de Vite.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || body?.error || `HTTP ${status}`)
    this.status = status
    this.code = body?.error
    this.body = body
  }
}

async function authHeader() {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth ? await authHeader() : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, { error: 'network', message: 'No hay conexión a internet. Lo que hagas se guardará y se enviará cuando vuelva la señal.' })
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

const post = (path, body = {}) => request(path, { method: 'POST', body })

// Panel de mentoras y del equipo: se identifican con su código/token, no con sesión de jugadora.
const asMentor = (code, path, opts = {}) => request(path, { ...opts, auth: false, headers: { 'X-Mentor-Code': code } })
const asAdmin = (token, path, opts = {}) => request(path, { ...opts, auth: false, headers: { 'X-Admin-Token': token } })

/** ¿Falló por falta de internet (y no por un dato inválido)? */
export const isNetworkError = (err) => err instanceof ApiError && err.status === 0

export const api = {
  health: () => request('/api/health'),

  register: (data) => post('/api/auth/register', data),

  /** Waitlist pública: colegios, aliados, inversores, docentes, familias. */
  joinWaitlist: (data) => post('/api/leads', data),
  waitlistCount: () => request('/api/leads/count'),

  me: () => request('/api/me'),
  dashboard: () => request('/api/me/dashboard'),
  guide: () => request('/api/me/guide'),
  setHeroine: (heroineId, portalId) => post('/api/me/heroine', { heroineId, portalId }),

  combatStart: (portal) => post('/api/combat/start', { portal }),
  combatAnswer: (roundId, choice) => post('/api/combat/answer', { roundId, choice }),

  missionBuild: (fields) => post('/api/missions/build', { fields }),
  missionReal: (url) => post('/api/missions/real', { url }),
  advanceLevel: () => post('/api/missions/advance'),

  opportunities: () => request('/api/opportunities'),
  setOpportunityStatus: (id, status) => post(`/api/opportunities/${id}/status`, { status }),

  // Modo en vivo (HEROW Live)
  liveLobby: () => request('/api/live/lobby'),
  liveQueue: (portal, ticket) => post('/api/live/queue', { portal, ticket }),
  liveCancel: (ticket) => post('/api/live/cancel', { ticket }),
  liveMatch: (id) => request(`/api/live/${id}`),
  liveAnswer: (id, n, choice) => post(`/api/live/${id}/answer`, { n, choice }),
  liveLeave: (id) => post(`/api/live/${id}/leave`),

  // Arcade online (el modo consola no usa el servidor)
  arcadeLobby: () => request('/api/arcade/lobby'),
  arcadeCode: (game) => post('/api/arcade/code', { game }),
  arcadeQueue: (game, { code, ticket } = {}) => post('/api/arcade/queue', { game, code, ticket }),
  arcadeCancel: (ticket) => post('/api/arcade/cancel', { ticket }),
  arcadeRoom: (id) => request(`/api/arcade/${id}`),
  arcadeMove: (id, move) => post(`/api/arcade/${id}/move`, { move }),
  arcadeLeave: (id) => post(`/api/arcade/${id}/leave`),
  arcadeReport: (id, reason) => post(`/api/arcade/${id}/report`, { reason }),

  // HEROW Conecta (jugadoras)
  conecta: () => request('/api/conecta'),
  conectaPublic: () => request('/api/conecta/public', { auth: false }),
  conectaRsvp: (eventId, going) => post(`/api/conecta/events/${eventId}/rsvp`, { going }),
  conectaAsk: (data) => post('/api/conecta/questions', data),
  conectaPowerup: () => request('/api/conecta/powerup'),
  conectaFollow: (mentorId, following) => post(`/api/conecta/mentors/${mentorId}/follow`, { following }),
  conectaReact: (questionId, kind, on) => post(`/api/conecta/answers/${questionId}/react`, { kind, on }),

  // Mentoras (código de acceso) y equipo (token)
  mentorApply: (data) => request('/api/mentors/apply', { method: 'POST', body: data, auth: false }),
  mentorMe: (code) => asMentor(code, '/api/mentors/me'),
  mentorUpdate: (code, data) => asMentor(code, '/api/mentors/me', { method: 'POST', body: data }),
  mentorEvent: (code, data) => asMentor(code, '/api/mentors/events', { method: 'POST', body: data }),
  mentorCancelEvent: (code, id) => asMentor(code, `/api/mentors/events/${id}/cancel`, { method: 'POST', body: {} }),
  mentorAnswer: (code, id, answer) => asMentor(code, `/api/mentors/questions/${id}/answer`, { method: 'POST', body: { answer } }),
  adminQueue: (token) => asAdmin(token, '/api/mentors/admin/queue'),
  adminMentor: (token, id, status) => asAdmin(token, `/api/mentors/admin/mentors/${id}/status`, { method: 'POST', body: { status } }),
  adminResetCode: (token, id) => asAdmin(token, `/api/mentors/admin/mentors/${id}/reset-code`, { method: 'POST', body: {} }),
  adminEvent: (token, id, status) => asAdmin(token, `/api/mentors/admin/events/${id}/status`, { method: 'POST', body: { status } }),
  adminQuestion: (token, id, action) => asAdmin(token, `/api/mentors/admin/questions/${id}/status`, { method: 'POST', body: { action } }),

  // Modo sin internet
  offlinePack: () => request('/api/offline/pack', { auth: false }),
  offlineSync: (answers) => post('/api/offline/sync', { answers }),
  offlineKit: () => request('/api/offline/kit', { auth: false }),

  /** Solo desarrollo (DEV_TOOLS=true en el servidor). */
  devPoints: (amount = 50) => post('/api/dev/points', { amount }),
  devDemoLogin: (account) => post('/api/dev/demo-login', { account }),

  /** messages: [{ role: 'user' | 'assistant', content }] → { reply, moderated? } */
  yesseniaChat: (messages) => post('/api/yessenia/chat', { messages }),
}
