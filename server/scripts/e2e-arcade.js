// Prueba de punta a punta del ARCADE ONLINE contra un backend real:
// 2 jugadoras temporales, sala privada con código, michi completo por WebSocket,
// rival al azar en conecta 4, duelo de cristales y reporte. Borra las cuentas al final.
//   E2E_API=https://... npm run test:arcade:e2e   (requiere SUPABASE_* en el entorno)
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })
const API = process.env.E2E_API ?? `http://localhost:${process.env.PORT ?? 3001}`
const WS_URL = API.replace(/^http/, 'ws') + '/live/ws'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const until = async (fn, ms = 10_000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) return false; await wait(100) } return true }

let failures = 0
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`✅ ${msg}${extra ? ` · ${extra}` : ''}`)
  else { failures++; console.error(`❌ ${msg}${extra ? ` · ${extra}` : ''}`) }
}

async function makePlayer(tag) {
  const username = `arc_${tag}_${Date.now().toString(36)}`.slice(0, 20)
  const password = 'prueba-segura-123'
  const year = new Date().getFullYear() - 16
  const reg = await fetch(`${API}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, birth: { day: 3, month: 3, year } }),
  })
  if (reg.status !== 201) throw new Error(`registro ${tag}: HTTP ${reg.status}`)
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data } = await client.auth.signInWithPassword({ email: `${username}@players.herow.app`, password })
  const p = { tag, username, userId: data.user.id, token: data.session.access_token }
  p.call = async (method, path, body) => {
    const res = await fetch(API + path, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: res.status, data: await res.json().catch(() => null) }
  }
  return p
}

function connect(token, ch) {
  const ws = new WebSocket(WS_URL)
  const c = { ws, joined: false, events: [], reactions: [], errors: [] }
  ws.onopen = () => ws.send(JSON.stringify({ t: 'auth', token }))
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.t === 'ready') ws.send(JSON.stringify({ t: 'join', ch }))
    if (m.t === 'joined' && m.ch === ch) { c.joined = true; for (const x of m.history) c.events.push(x) }
    if (m.t === 'msg' && m.ch === ch) (m.m.type === 'reaction' ? c.reactions : c.events).push(m.m)
    if (m.t === 'error') c.errors.push(m.code)
  }
  c.send = (d) => ws.send(JSON.stringify(d))
  return c
}

/** Empareja a A y B. Con code: sala privada (A la crea). */
async function pairUp(a, b, game, code) {
  const qa = a.call('POST', '/api/arcade/queue', { game, code })
  await wait(700)
  const [ra, rb] = await Promise.all([qa, b.call('POST', '/api/arcade/queue', { game, code })])
  return [ra, rb]
}

const players = []
const sockets = []
try {
  const a = await makePlayer('a')
  const b = await makePlayer('b')
  const c = await makePlayer('c')
  players.push(a, b, c)
  ok(true, '3 jugadoras temporales creadas (sin heroína elegida: el arcade no la necesita)')

  // ── 1. Sala privada con código: michi completo ──
  const codeRes = await a.call('POST', '/api/arcade/code', { game: 'michi' })
  const code = codeRes.data?.code
  ok(/^[A-Z2-9]{5}$/.test(code ?? ''), 'A crea un código de sala', code)
  const fake = await b.call('POST', '/api/arcade/queue', { game: 'michi', code: 'ZZZZZ' })
  ok(fake.status === 404, 'Un código inventado no sirve')
  const [ra, rb] = await pairUp(a, b, 'michi', code)
  ok(ra.data?.matched && rb.data?.matched && ra.data.room.id === rb.data.room.id && ra.data.room.private, 'A y B entran a la misma sala privada')
  const room = ra.data.room
  ok(ra.data.room.you + rb.data.room.you === 1, 'Cada una sabe si es la jugadora 0 o 1')
  const reuse = await c.call('POST', '/api/arcade/queue', { game: 'michi', code })
  ok(reuse.status === 404, 'El código ya no sirve una vez usado')

  const wa = connect(a.token, room.channelId)
  const wb = connect(b.token, room.channelId)
  const spy = connect(c.token, room.channelId)
  sockets.push(wa, wb, spy)
  ok(await until(() => wa.joined && wb.joined), 'Ambas conectadas al canal de la sala')
  ok(await until(() => spy.errors.includes('forbidden')) && !spy.joined, 'Una jugadora ajena no puede entrar a la sala')

  const byIdx = [ra.data.room.you === 0 ? a : b, ra.data.room.you === 0 ? b : a]
  const wrong = await byIdx[1].call('POST', `/api/arcade/${room.id}/move`, { move: { cell: 4 } })
  ok(wrong.status === 409 && wrong.data.error === 'not_your_turn', 'El servidor rechaza jugar fuera de turno')
  // La jugadora 0 gana con la fila de arriba.
  for (const [idx, cell] of [[0, 0], [1, 3], [0, 1], [1, 4]]) {
    const r = await byIdx[idx].call('POST', `/api/arcade/${room.id}/move`, { move: { cell } })
    if (r.status !== 200) ok(false, `jugada ${cell}`, JSON.stringify(r.data))
  }
  const taken = await byIdx[0].call('POST', `/api/arcade/${room.id}/move`, { move: { cell: 4 } })
  ok(taken.status === 409 && taken.data.error === 'cell_taken', 'El servidor rechaza una casilla ocupada')
  wa.send({ t: 'react', ch: room.channelId, emoji: '🔥' })
  await byIdx[0].call('POST', `/api/arcade/${room.id}/move`, { move: { cell: 2 } })
  ok(await until(() => wb.events.some(e => e.type === 'end')), 'La partida termina y ambas lo reciben en vivo')
  const end = wb.events.find(e => e.type === 'end')?.content
  ok(end?.reason === 'completed' && end.winner === 0, 'Gana la jugadora 0 con tres en línea', JSON.stringify(end))
  ok(wb.events.filter(e => e.type === 'state').length === 5, 'Llegaron las 5 jugadas en vivo')
  ok(wb.reactions.some(r => r.sender.id === a.userId && r.content.emoji === '🔥'), 'Las reacciones llegan firmadas por el servidor')

  // ── 2. Rival al azar: conecta 4 y reporte ──
  const [r2a, r2b] = await pairUp(a, b, 'conecta4')
  ok(r2a.data?.matched && r2b.data?.matched && !r2a.data.room.private, 'Rival al azar en Conecta 4')
  const room2 = r2a.data.room
  const first = r2a.data.room.you === 0 ? a : b
  const mv = await first.call('POST', `/api/arcade/${room2.id}/move`, { move: { col: 3 } })
  ok(mv.status === 200, 'Primera ficha aceptada')
  const rep = await b.call('POST', `/api/arcade/${room2.id}/report`, { reason: 'nombre_ofensivo' })
  const snap2 = await a.call('GET', `/api/arcade/${room2.id}`)
  ok(rep.status === 200 && snap2.data?.end?.reason === 'reported', 'Reportar termina la partida')
  // Bloqueadas: ya no se emparejan entre ellas (C sí puede jugar con A).
  const qa = a.call('POST', '/api/arcade/queue', { game: 'conecta4' })
  await wait(700)
  const qb = b.call('POST', '/api/arcade/queue', { game: 'conecta4' })
  await wait(700)
  const lobby = await c.call('GET', '/api/arcade/lobby')
  ok(lobby.data?.waiting?.conecta4 === 2, 'A y B esperan por separado: el bloqueo funciona')
  const rc = await c.call('POST', '/api/arcade/queue', { game: 'conecta4' })
  ok(rc.data?.matched, 'C sí puede emparejarse')
  await a.call('POST', '/api/arcade/cancel', {})
  await b.call('POST', '/api/arcade/cancel', {})
  await Promise.all([qa, qb])
  if (rc.data?.room) await c.call('POST', `/api/arcade/${rc.data.room.id}/leave`)

  // ── 3. Duelo de cristales ──
  const [r3a, r3b] = await pairUp(a, c, 'cristales')
  const room3 = r3a.data?.room
  ok(room3 && room3.state.seed === r3b.data.room.state.seed, 'Duelo de cristales: el mismo tablero para las dos', `semilla ${room3?.state.seed}`)
  const startIn = room3.state.startsAt - room3.state.now
  ok(startIn > 2000 && startIn < 5000, 'Cuenta regresiva antes de empezar', `${startIn} ms`)
  await wait(startIn + 200)
  const s1 = await a.call('POST', `/api/arcade/${room3.id}/move`, { move: { score: 450 } })
  const s2 = await a.call('POST', `/api/arcade/${room3.id}/move`, { move: { score: 100 } })
  const s3 = await c.call('POST', `/api/arcade/${room3.id}/move`, { move: { score: 9_999_999 } })
  ok(s1.status === 200 && s2.status === 409 && s3.status === 409, 'Puntajes validados (no bajan, sin saltos imposibles)')
  await c.call('POST', `/api/arcade/${room3.id}/leave`)
  const snap3 = await a.call('GET', `/api/arcade/${room3.id}`)
  ok(snap3.data?.end?.reason === 'left' && snap3.data.players[snap3.data.end.winner].userId === a.userId, 'Si la rival sale, gana la que se queda')

  // ── 4. Sin sesión no hay arcade online ──
  const anon = await fetch(`${API}/api/arcade/lobby`)
  ok(anon.status === 401, 'Sin cuenta no se puede usar el arcade online')
} catch (err) {
  failures++
  console.error('❌ Error inesperado:', err)
} finally {
  for (const s of sockets) s.ws.close()
  for (const p of players) await admin.auth.admin.deleteUser(p.userId)
  if (players.length) console.log('🧹 Jugadoras temporales borradas')
}
console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodo OK')
process.exit(failures ? 1 : 0)
