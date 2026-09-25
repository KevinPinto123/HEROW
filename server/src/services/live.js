import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { HEROINES, ROUND_POINTS } from '../data/game.js'
import { getPlayerState } from './progress.js'
import { pickQuestion } from './questions.js'
import { db, must } from './supabase.js'

// ───────── Partidas 1 vs 1 en vivo ─────────
// El servidor es la única autoridad: elige preguntas, guarda la respuesta correcta,
// mide el tiempo, decide quién gana y reparte puntos. Portal solo transmite en vivo.

export const LIVE = {
  ROUNDS: 5,
  TIME_LIMIT_MS: 15_000,
  GRACE_MS: 2_500,
  START_DELAY_MS: 4_000, // tiempo para que ambas se conecten al canal
  BETWEEN_ROUNDS_MS: 5_000,
  QUEUE_WAIT_MS: 25_000,
}
export const SERVER_SENDER = 'herow-server'

const PORTAL_API = 'https://api.useportal.co'
const queues = new Map() // portal -> entrada en espera
const queuedUser = new Map() // userId -> portal
const matches = new Map() // matchId -> partida

/** Publica un evento del juego en el canal de la partida (mensaje persistente). */
async function publish(match, type, content) {
  try {
    const res = await fetch(`${PORTAL_API}/v1/channels/${match.channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.portal.secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: SERVER_SENDER, type, content }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) console.error(`[live] publish ${type}: HTTP ${res.status}`)
  } catch (err) {
    console.error(`[live] publish ${type}:`, err.message)
  }
}

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function publicPlayer(p) {
  return { userId: p.userId, username: p.username, heroineId: p.heroineId, heroineName: HEROINES[p.heroineId]?.name }
}

/** Vista de la partida para una jugadora (nunca incluye la respuesta correcta de la ronda abierta). */
export function snapshot(match) {
  const r = match.round
  return {
    id: match.id,
    channelId: match.channelId,
    portal: match.portal,
    rounds: LIVE.ROUNDS,
    players: match.players.map(publicPlayer),
    scores: match.scores,
    status: match.status,
    round: r && {
      n: r.n,
      question: r.public,
      timeLimitMs: LIVE.TIME_LIMIT_MS,
      elapsedMs: r.closed ? null : Date.now() - r.startedAt,
      answered: Object.keys(r.answers),
      result: r.result ?? null,
    },
    end: match.end ?? null,
  }
}

async function startRound(match) {
  if (match.status !== 'playing') return
  const n = (match.round?.n ?? 0) + 1
  const [a] = match.players
  const stat = must(await db.from('skill_stats').select('*').eq('user_id', a.userId).eq('portal_id', match.portal).maybeSingle())
  const q = await pickQuestion(a.userId, match.portal, stat)
  const order = shuffle(q.options.map((_, i) => i))
  match.round = {
    n,
    question: q,
    correctIndex: order.indexOf(q.answer),
    public: { type: q.type, difficulty: q.difficulty, text: q.text, options: order.map(i => q.options[i]) },
    startedAt: Date.now(),
    answers: {},
    closed: false,
  }
  match.round.timer = setTimeout(() => resolveRound(match), LIVE.TIME_LIMIT_MS + LIVE.GRACE_MS)
  await publish(match, 'round', { n, rounds: LIVE.ROUNDS, question: match.round.public, timeLimitMs: LIVE.TIME_LIMIT_MS })
}

async function resolveRound(match) {
  const r = match.round
  if (!r || r.closed) return
  r.closed = true
  clearTimeout(r.timer)

  const [p1, p2] = match.players
  const info = (p) => {
    const a = r.answers[p.userId]
    const correct = Boolean(a) && a.choice === r.correctIndex && a.ms <= LIVE.TIME_LIMIT_MS + LIVE.GRACE_MS
    return { answered: Boolean(a), choice: a?.choice ?? null, ms: a ? Math.min(a.ms, LIVE.TIME_LIMIT_MS) : LIVE.TIME_LIMIT_MS, correct }
  }
  const i1 = info(p1)
  const i2 = info(p2)
  const outcomeOf = (me, other) => {
    if (me.correct && (!other.correct || me.ms <= other.ms)) return 'win'
    if (!me.correct && !other.correct) return 'tie'
    return 'lose'
  }
  // Si las dos aciertan en el mismo milisegundo, ambas ganan (no hay empate injusto).
  const results = {
    [p1.userId]: { ...i1, outcome: outcomeOf(i1, i2) },
    [p2.userId]: { ...i2, outcome: outcomeOf(i2, i1) },
  }

  for (const [me, other] of [[p1, p2], [p2, p1]]) {
    const res = results[me.userId]
    res.points = ROUND_POINTS[res.outcome]
    match.scores[me.userId] = (match.scores[me.userId] ?? 0) + (res.outcome === 'win' ? 1 : 0)
    match.points[me.userId] = (match.points[me.userId] ?? 0) + res.points
    try {
      must(await db.rpc('apply_round', {
        p_user: me.userId, p_portal: match.portal, p_correct: res.correct,
        p_win: res.outcome === 'win', p_ms: res.ms, p_points: res.points,
      }))
      must(await db.from('rounds').insert({
        user_id: me.userId, portal_id: match.portal, question_id: r.question.id, difficulty: r.question.difficulty,
        correct: res.correct, ms: res.ms, outcome: res.outcome, points: res.points,
        rival_heroine: other.heroineId, mode: 'live',
      }))
      res.newlyUnlocked = (await getPlayerState(me.userId)).newlyUnlocked
    } catch (err) {
      console.error('[live] guardar ronda:', err.message)
      res.newlyUnlocked = []
    }
  }

  r.result = { n: r.n, correctIndex: r.correctIndex, explain: r.question.explain, players: results, scores: match.scores }
  await publish(match, 'result', r.result)

  if (r.n >= LIVE.ROUNDS) {
    setTimeout(() => endMatch(match, 'completed'), 2_000)
  } else {
    setTimeout(() => startRound(match).catch(err => console.error('[live] ronda:', err.message)), LIVE.BETWEEN_ROUNDS_MS)
  }
}

async function endMatch(match, reason, leaverId = null) {
  if (match.status === 'ended') return
  match.status = 'ended'
  clearTimeout(match.round?.timer)
  const [p1, p2] = match.players
  const s1 = match.scores[p1.userId] ?? 0
  const s2 = match.scores[p2.userId] ?? 0
  let winner = null
  if (reason === 'left') winner = leaverId === p1.userId ? p2.userId : p1.userId
  else if (s1 !== s2) winner = s1 > s2 ? p1.userId : p2.userId
  match.end = { reason, winner, leaverId, scores: match.scores, points: match.points }
  await publish(match, 'end', match.end)
  setTimeout(() => matches.delete(match.id), 10 * 60_000).unref()
}

function createMatch(portal, a, b) {
  const id = randomUUID()
  const match = {
    id,
    channelId: `herow-match-${id}`,
    portal,
    players: [a, b],
    scores: { [a.userId]: 0, [b.userId]: 0 },
    points: { [a.userId]: 0, [b.userId]: 0 },
    status: 'playing',
    round: null,
    createdAt: Date.now(),
  }
  matches.set(id, match)
  setTimeout(() => startRound(match).catch(err => {
    console.error('[live] primera ronda:', err.message)
    endMatch(match, 'error')
  }), LIVE.START_DELAY_MS)
  return match
}

/** Saca a la jugadora de la cola. Con ticket, solo si es esa misma búsqueda. */
function leaveQueue(userId, ticket = null) {
  const portal = queuedUser.get(userId)
  if (!portal) return
  const entry = queues.get(portal)
  if (entry?.player.userId !== userId) {
    queuedUser.delete(userId) // registro huérfano
    return
  }
  if (ticket && entry.player.ticket !== ticket) return // es otra búsqueda: no tocar
  clearTimeout(entry.timer)
  queues.delete(portal)
  queuedUser.delete(userId)
  entry.resolve({ matched: false, cancelled: true })
}

/** Espera a otra jugadora del mismo portal (long-poll). */
export function joinQueue(portal, player) {
  leaveQueue(player.userId)
  const waiting = queues.get(portal)
  if (waiting && waiting.player.userId !== player.userId) {
    clearTimeout(waiting.timer)
    queues.delete(portal)
    queuedUser.delete(waiting.player.userId)
    const match = createMatch(portal, waiting.player, player)
    waiting.resolve({ matched: true, matchId: match.id })
    return Promise.resolve({ matched: true, matchId: match.id })
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      queues.delete(portal)
      queuedUser.delete(player.userId)
      resolve({ matched: false, timeout: true })
    }, LIVE.QUEUE_WAIT_MS)
    queues.set(portal, { player, resolve, timer })
    queuedUser.set(player.userId, portal)
  })
}

// Una búsqueda nueva reemplaza a la anterior de la misma jugadora (joinQueue sin ticket).

export const cancelQueue = leaveQueue

export function getMatchFor(matchId, userId) {
  const match = matches.get(matchId)
  if (!match || !match.players.some(p => p.userId === userId)) return null
  return match
}

export async function submitAnswer(match, userId, n, choice) {
  const r = match.round
  if (match.status !== 'playing' || !r || r.n !== n || r.closed) return { ok: false, error: 'round_closed' }
  if (r.answers[userId]) return { ok: false, error: 'already_answered' }
  r.answers[userId] = { choice, ms: Date.now() - r.startedAt }
  await publish(match, 'answered', { n, userId })
  if (Object.keys(r.answers).length === match.players.length) await resolveRound(match)
  return { ok: true }
}

export async function leaveMatch(match, userId) {
  if (match.status === 'playing') await endMatch(match, 'left', userId)
}

/** Cuántas jugadoras esperan rival ahora mismo en cada portal. */
export function waitingByPortal() {
  return Object.fromEntries([...queues.entries()].map(([portal, e]) => [portal, e.player.username]))
}
