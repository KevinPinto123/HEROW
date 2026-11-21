import { WebSocketServer } from 'ws'
import { config } from '../config.js'
import { verifyAccessToken } from '../middleware/auth.js'

// ───────── HEROW Live: tiempo real propio (reemplaza a Portal) ─────────
// Un WebSocket en el mismo backend. Ventajas frente a un servicio externo:
//   - Gratis y sin límites de terceros: corre en el mismo servidor de Railway.
//   - La identidad la verifica el servidor (token de Supabase): nadie puede
//     hacerse pasar por el servidor ni por la otra jugadora.
//   - Al reconectar, la jugadora recibe todo el historial de la partida.
//
// Protocolo (JSON):
//   cliente → servidor: {t:'auth', token} · {t:'join', ch} · {t:'leave', ch} · {t:'react', ch, emoji}
//   servidor → cliente: {t:'ready', userId} · {t:'joined', ch, history} · {t:'msg', ch, m}
//                       {t:'presence', ch, count} · {t:'error', code, ch?}

export const WS_PATH = '/live/ws'
export const SERVER_SENDER = 'herow-server'
// Única forma de comunicarse entre jugadoras: reacciones de esta lista (sin chat libre).
export const REACTIONS = ['👏', '💜', '🔥', '😮', '💪', '🤝']

const AUTH_TIMEOUT_MS = 10_000
const HEARTBEAT_MS = 25_000
const REACTION_COOLDOWN_MS = 1_200
const MAX_SOCKETS_PER_USER = 6
const MAX_CHANNELS_PER_SOCKET = 8

/**
 * Tipos de canal. Cada uno define quién entra y qué historial recibe.
 *   canJoin(userId, name) → boolean · history(name) → mensajes[] · reactions: boolean
 *   onMembers(name, userIds) → se llama cuando cambia quién está conectada.
 */
const kinds = new Map() // prefijo -> definición
const channels = new Map() // nombre -> Set<socket>
const socketsByUser = new Map() // userId -> Set<socket>
let reactionSeq = 0

export function defineChannel(prefix, spec) {
  kinds.set(prefix, { canJoin: () => true, history: () => [], reactions: false, onMembers: null, ...spec })
}

function kindOf(name) {
  if (typeof name !== 'string' || name.length > 120) return null
  for (const [prefix, spec] of kinds) if (name === prefix || name.startsWith(`${prefix}:`)) return spec
  return null
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data))
}

function membersOf(name) {
  return new Set([...(channels.get(name) ?? [])].map(ws => ws.userId))
}

function announcePresence(name) {
  const members = membersOf(name)
  const set = channels.get(name)
  if (set) for (const ws of set) send(ws, { t: 'presence', ch: name, count: members.size })
  kindOf(name)?.onMembers?.(name, members)
}

/** Envía un mensaje a todas las conectadas a un canal. */
export function broadcast(name, m) {
  const set = channels.get(name)
  if (!set) return
  const data = JSON.stringify({ t: 'msg', ch: name, m })
  for (const ws of set) if (ws.readyState === ws.OPEN) ws.send(data)
}

/** Cuántas jugadoras distintas están conectadas a un canal. */
export function memberIds(name) {
  return membersOf(name)
}

function join(ws, name) {
  const spec = kindOf(name)
  if (!spec) return send(ws, { t: 'error', code: 'unknown_channel', ch: name })
  if (ws.channels.has(name)) return send(ws, { t: 'joined', ch: name, history: spec.history(name) })
  if (ws.channels.size >= MAX_CHANNELS_PER_SOCKET) return send(ws, { t: 'error', code: 'too_many_channels', ch: name })
  if (!spec.canJoin(ws.userId, name)) return send(ws, { t: 'error', code: 'forbidden', ch: name })
  ws.channels.add(name)
  if (!channels.has(name)) channels.set(name, new Set())
  channels.get(name).add(ws)
  send(ws, { t: 'joined', ch: name, history: spec.history(name) })
  announcePresence(name)
}

function leave(ws, name) {
  if (!ws.channels.delete(name)) return
  const set = channels.get(name)
  set?.delete(ws)
  if (set && set.size === 0) channels.delete(name)
  announcePresence(name)
}

function react(ws, name, emoji) {
  const spec = kindOf(name)
  if (!spec?.reactions || !ws.channels.has(name) || !REACTIONS.includes(emoji)) return
  const now = Date.now()
  if (now - ws.lastReaction < REACTION_COOLDOWN_MS) return
  ws.lastReaction = now
  broadcast(name, { id: `r${++reactionSeq}`, type: 'reaction', content: { emoji }, sender: { id: ws.userId }, at: now })
}

async function authenticate(ws, token) {
  const user = await verifyAccessToken(typeof token === 'string' ? token : null).catch(() => null)
  if (ws.readyState !== ws.OPEN) return
  if (!user) {
    send(ws, { t: 'error', code: 'unauthorized' })
    return ws.close(4001, 'unauthorized')
  }
  const mine = socketsByUser.get(user.id) ?? new Set()
  if (mine.size >= MAX_SOCKETS_PER_USER) {
    send(ws, { t: 'error', code: 'too_many_connections' })
    return ws.close(4008, 'too_many_connections')
  }
  clearTimeout(ws.authTimer)
  ws.userId = user.id
  mine.add(ws)
  socketsByUser.set(user.id, mine)
  send(ws, { t: 'ready', userId: user.id })
}

function onMessage(ws, raw) {
  let msg
  try {
    msg = JSON.parse(raw.toString())
  } catch {
    return
  }
  if (!msg || typeof msg !== 'object') return
  if (msg.t === 'auth') {
    if (!ws.userId && !ws.authing) {
      ws.authing = true
      authenticate(ws, msg.token).finally(() => { ws.authing = false })
    }
    return
  }
  if (!ws.userId) return send(ws, { t: 'error', code: 'unauthorized' })
  if (msg.t === 'join') join(ws, msg.ch)
  else if (msg.t === 'leave') leave(ws, msg.ch)
  else if (msg.t === 'react') react(ws, msg.ch, msg.emoji)
  else if (msg.t === 'ping') send(ws, { t: 'pong' })
}

function onClose(ws) {
  clearTimeout(ws.authTimer)
  for (const name of [...ws.channels]) leave(ws, name)
  if (ws.userId) {
    const mine = socketsByUser.get(ws.userId)
    mine?.delete(ws)
    if (mine?.size === 0) socketsByUser.delete(ws.userId)
  }
}

function originAllowed(origin) {
  if (!origin) return true // clientes que no son navegador (pruebas, scripts)
  return config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')
}

/** Engancha el WebSocket al servidor HTTP de Express. */
export function attachRealtime(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 })

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (pathname !== WS_PATH) return socket.destroy()
    if (!originAllowed(req.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      return socket.destroy()
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req))
  })

  wss.on('connection', (ws) => {
    ws.isAlive = true
    ws.userId = null
    ws.channels = new Set()
    ws.lastReaction = 0
    ws.authTimer = setTimeout(() => { if (!ws.userId) ws.close(4001, 'auth_timeout') }, AUTH_TIMEOUT_MS)
    ws.on('pong', () => { ws.isAlive = true })
    ws.on('message', raw => onMessage(ws, raw))
    ws.on('close', () => onClose(ws))
    ws.on('error', () => {})
  })

  // Latido: corta conexiones muertas (wifi caído, pestaña cerrada sin aviso).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate()
        continue
      }
      ws.isAlive = false
      ws.ping()
    }
  }, HEARTBEAT_MS)
  heartbeat.unref()
  wss.on('close', () => clearInterval(heartbeat))
  return wss
}
