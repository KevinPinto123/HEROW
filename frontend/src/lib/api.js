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

async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, { error: 'network', message: 'No hay conexión con el servidor. Revisa que esté encendido.' })
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

const post = (path, body = {}) => request(path, { method: 'POST', body })

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

  // Modo en vivo (Portal)
  liveLobby: () => request('/api/live/lobby'),
  liveQueue: (portal, ticket) => post('/api/live/queue', { portal, ticket }),
  liveCancel: (ticket) => post('/api/live/cancel', { ticket }),
  liveMatch: (id) => request(`/api/live/${id}`),
  liveAnswer: (id, n, choice) => post(`/api/live/${id}/answer`, { n, choice }),
  liveLeave: (id) => post(`/api/live/${id}/leave`),

  /** Solo desarrollo (DEV_TOOLS=true en el servidor). */
  devPoints: (amount = 50) => post('/api/dev/points', { amount }),
  devDemoLogin: (account) => post('/api/dev/demo-login', { account }),

  /** messages: [{ role: 'user' | 'assistant', content }] → { reply, moderated? } */
  yesseniaChat: (messages) => post('/api/yessenia/chat', { messages }),

  /** Token para Portal (multijugador). */
  portalToken: () => post('/api/portal/token').then(r => r.token),
}
