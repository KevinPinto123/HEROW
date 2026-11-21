import { randomInt, randomUUID } from 'node:crypto'
import { SERVER_SENDER, broadcast, defineChannel, memberIds } from '../realtime/hub.js'
import { CRISTALES, TURN_GAMES } from './rules.js'

// ───────── Arcade online: salas 1 vs 1 ─────────
// El servidor es el árbitro: valida cada jugada con las mismas reglas del navegador,
// controla los turnos y decide quién gana. Las jugadoras solo envían jugadas y
// reacciones de la lista permitida (no hay chat).
// No suma puntos de nivel de HEROW: el arcade es para divertirse.

export const ARCADE = {
  TURN_MS: 30_000, // si una no juega en 30 s, pierde la partida
  QUEUE_WAIT_MS: 25_000,
  DISCONNECT_GRACE_MS: 30_000,
  CODE_TTL_MS: 15 * 60_000,
  CRISTALES_START_MS: 3_500, // cuenta regresiva antes del duelo
  CRISTALES_GRACE_MS: 4_000, // margen para que llegue el último puntaje
  KEEP_ENDED_MS: 10 * 60_000,
}
export const ONLINE_GAMES = ['michi', 'conecta4', 'timbiriche', 'cristales']
export const REPORT_REASONS = ['nombre_ofensivo', 'trampa', 'me_incomoda', 'otro']

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // sin 0/O ni 1/I/L
const queues = new Map() // clave -> [{ player, resolve, timer }]
const queuedUser = new Map() // userId -> clave
const rooms = new Map() // roomId -> sala
const codes = new Map() // código -> { game, hostId, expires }
const codeOfHost = new Map() // userId -> código
const blocks = new Set() // "a|b" (orden alfabético): nunca se vuelven a emparejar

const channelOf = (id) => `arcade:${id}`
const pairKey = (a, b) => [a, b].sort().join('|')
const isBlocked = (a, b) => blocks.has(pairKey(a, b))

function publish(room, type, content) {
  const m = { id: room.events.length + 1, type, content, sender: { id: SERVER_SENDER }, at: Date.now() }
  room.events.push(m)
  broadcast(room.channelId, m)
}

defineChannel('arcade', {
  canJoin: (userId, name) => Boolean(getRoomFor(name.slice('arcade:'.length), userId)),
  history: (name) => rooms.get(name.slice('arcade:'.length))?.events ?? [],
  reactions: true,
  onMembers: (name, online) => {
    const room = rooms.get(name.slice('arcade:'.length))
    if (room) watchConnections(room, online)
  },
})

function watchConnections(room, online) {
  if (room.status !== 'playing') return
  room.players.forEach((p, idx) => {
    if (online.has(p.userId)) {
      p.seen = true
      clearTimeout(p.dropTimer)
      p.dropTimer = null
    } else if (p.seen && !p.dropTimer) {
      p.dropTimer = setTimeout(() => {
        p.dropTimer = null
        if (room.status === 'playing' && !memberIds(room.channelId).has(p.userId)) endRoom(room, 'left', 1 - idx)
      }, ARCADE.DISCONNECT_GRACE_MS)
      p.dropTimer.unref?.()
    }
  })
}

// ───────── Vista pública ─────────
function publicState(room) {
  if (room.game === 'cristales') {
    return { ...room.state, now: Date.now() }
  }
  return { ...room.state, turnRemainingMs: room.turnDeadline ? Math.max(0, room.turnDeadline - Date.now()) : null }
}

export function snapshot(room, userId) {
  return {
    id: room.id,
    game: room.game,
    channelId: room.channelId,
    private: room.private,
    players: room.players.map(p => ({ userId: p.userId, username: p.username, heroineId: p.heroineId })),
    you: room.players.findIndex(p => p.userId === userId),
    status: room.status,
    state: publicState(room),
    turnMs: ARCADE.TURN_MS,
    end: room.end,
  }
}

// ───────── Ciclo de la partida ─────────
function armTurn(room) {
  clearTimeout(room.turnTimer)
  room.turnDeadline = Date.now() + ARCADE.TURN_MS
  room.turnTimer = setTimeout(() => {
    if (room.status === 'playing') endRoom(room, 'timeout', 1 - room.state.turn)
  }, ARCADE.TURN_MS)
  room.turnTimer.unref?.()
}

function endRoom(room, reason, winner = null) {
  if (room.status === 'ended') return
  room.status = 'ended'
  clearTimeout(room.turnTimer)
  clearTimeout(room.endTimer)
  room.turnDeadline = null
  for (const p of room.players) clearTimeout(p.dropTimer)
  room.end = { reason, winner }
  publish(room, 'end', room.end)
  setTimeout(() => rooms.delete(room.id), ARCADE.KEEP_ENDED_MS).unref?.()
}

function createRoom(game, a, b, isPrivate) {
  const id = randomUUID()
  // Quién empieza se sortea.
  const players = Math.random() < 0.5 ? [{ ...a }, { ...b }] : [{ ...b }, { ...a }]
  const room = { id, game, channelId: channelOf(id), private: isPrivate, players, status: 'playing', events: [], end: null, createdAt: Date.now() }
  if (game === 'cristales') {
    const startsAt = Date.now() + ARCADE.CRISTALES_START_MS
    room.state = { seed: randomInt(1, 2 ** 31 - 1), startsAt, endsAt: startsAt + CRISTALES.DURATION_MS, scores: [0, 0] }
    room.endTimer = setTimeout(() => {
      const [s0, s1] = room.state.scores
      endRoom(room, 'completed', s0 === s1 ? null : s0 > s1 ? 0 : 1)
    }, room.state.endsAt - Date.now() + ARCADE.CRISTALES_GRACE_MS)
    room.endTimer.unref?.()
  } else {
    room.state = TURN_GAMES[game].init()
    armTurn(room)
  }
  rooms.set(id, room)
  return room
}

// ───────── Emparejamiento ─────────
function leaveQueue(userId, ticket = null) {
  const key = queuedUser.get(userId)
  if (!key) return
  const list = queues.get(key) ?? []
  const idx = list.findIndex(e => e.player.userId === userId)
  if (idx < 0) {
    queuedUser.delete(userId)
    return
  }
  if (ticket && list[idx].player.ticket !== ticket) return // es otra búsqueda: no tocar
  const [entry] = list.splice(idx, 1)
  if (!list.length) queues.delete(key)
  queuedUser.delete(userId)
  clearTimeout(entry.timer)
  entry.resolve({ matched: false, cancelled: true })
}
export const cancelQueue = leaveQueue

/** Código para jugar con una amiga. Una jugadora tiene como máximo un código activo. */
export function createCode(game, hostId) {
  const old = codeOfHost.get(hostId)
  if (old) codes.delete(old)
  let code
  do {
    code = Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
  } while (codes.has(code))
  codes.set(code, { game, hostId, expires: Date.now() + ARCADE.CODE_TTL_MS })
  codeOfHost.set(hostId, code)
  return code
}

function validCode(code, game) {
  const c = codes.get(code)
  if (!c) return null
  if (c.expires < Date.now()) {
    codes.delete(code)
    if (codeOfHost.get(c.hostId) === code) codeOfHost.delete(c.hostId)
    return null
  }
  return c.game === game ? c : null
}

/**
 * Busca rival (long-poll). Con código: sala privada con una amiga.
 * Responde { matched, roomId } · { matched:false, timeout } · { error }.
 */
export function joinQueue(game, player, code = null) {
  leaveQueue(player.userId)
  let key = game
  if (code) {
    const c = validCode(code, game)
    if (!c) return Promise.resolve({ matched: false, error: 'code_not_found' })
    if (c.hostId === player.userId) c.expires = Date.now() + ARCADE.CODE_TTL_MS // la anfitriona sigue esperando
    key = `${game}#${code}`
  }
  const list = queues.get(key) ?? []
  const idx = list.findIndex(e => e.player.userId !== player.userId && !isBlocked(e.player.userId, player.userId))
  if (idx >= 0) {
    const [waiting] = list.splice(idx, 1)
    if (!list.length) queues.delete(key)
    clearTimeout(waiting.timer)
    queuedUser.delete(waiting.player.userId)
    if (code) {
      const c = codes.get(code)
      codes.delete(code)
      if (c && codeOfHost.get(c.hostId) === code) codeOfHost.delete(c.hostId)
    }
    const room = createRoom(game, waiting.player, player, Boolean(code))
    waiting.resolve({ matched: true, roomId: room.id })
    return Promise.resolve({ matched: true, roomId: room.id })
  }
  return new Promise((resolve) => {
    const entry = { player, resolve, timer: null }
    entry.timer = setTimeout(() => {
      const l = queues.get(key) ?? []
      const i = l.indexOf(entry)
      if (i >= 0) l.splice(i, 1)
      if (!l.length) queues.delete(key)
      if (queuedUser.get(player.userId) === key) queuedUser.delete(player.userId)
      resolve({ matched: false, timeout: true })
    }, ARCADE.QUEUE_WAIT_MS)
    list.push(entry)
    queues.set(key, list)
    queuedUser.set(player.userId, key)
  })
}

/** Cuántas jugadoras esperan rival en cada juego (solo salas públicas). */
export function waitingByGame() {
  return Object.fromEntries(ONLINE_GAMES.map(g => [g, queues.get(g)?.length ?? 0]))
}

export function getRoomFor(roomId, userId) {
  const room = rooms.get(roomId)
  if (!room || !room.players.some(p => p.userId === userId)) return null
  return room
}

// ───────── Jugadas ─────────
export function submitMove(room, userId, move) {
  const idx = room.players.findIndex(p => p.userId === userId)
  if (idx < 0) return { ok: false, error: 'not_in_room' }
  if (room.status !== 'playing') return { ok: false, error: 'game_over' }

  if (room.game === 'cristales') {
    const now = Date.now()
    const score = move?.score
    const prev = room.state.scores[idx]
    if (!Number.isInteger(score) || score < prev || score - prev > CRISTALES.MAX_STEP || score > CRISTALES.MAX_SCORE) {
      return { ok: false, error: 'invalid_score' }
    }
    if (now < room.state.startsAt - 500 || now > room.state.endsAt + ARCADE.CRISTALES_GRACE_MS) return { ok: false, error: 'out_of_time' }
    if (score === prev) return { ok: true }
    room.state.scores[idx] = score
    publish(room, 'score', { player: idx, score, scores: room.state.scores })
    return { ok: true }
  }

  const r = TURN_GAMES[room.game].move(room.state, idx, move)
  if (!r.ok) return r
  room.state = r.state
  if (room.state.over) {
    room.turnDeadline = null
    clearTimeout(room.turnTimer)
    publish(room, 'state', { state: publicState(room), by: idx })
    endRoom(room, 'completed', room.state.draw ? null : room.state.winner)
  } else {
    armTurn(room)
    publish(room, 'state', { state: publicState(room), by: idx })
  }
  return { ok: true }
}

export function leaveRoom(room, userId) {
  const idx = room.players.findIndex(p => p.userId === userId)
  if (idx >= 0 && room.status === 'playing') endRoom(room, 'left', 1 - idx)
}

/** Reporta a la rival: queda registrado, no se vuelven a emparejar y la partida termina. */
export function reportRival(room, userId, reason) {
  const idx = room.players.findIndex(p => p.userId === userId)
  if (idx < 0) return
  const rival = room.players[1 - idx]
  blocks.add(pairKey(userId, rival.userId))
  console.warn(`[arcade] REPORTE motivo=${reason} juego=${room.game} sala=${room.id} reporta=${userId} reportada=${rival.userId} (${rival.username})`)
  if (room.status === 'playing') endRoom(room, 'reported', null)
}

/** Solo para pruebas. */
export function _resetArcade() {
  for (const room of rooms.values()) {
    clearTimeout(room.turnTimer)
    clearTimeout(room.endTimer)
  }
  for (const list of queues.values()) for (const e of list) clearTimeout(e.timer)
  for (const m of [queues, queuedUser, rooms, codes, codeOfHost]) m.clear()
  blocks.clear()
}
