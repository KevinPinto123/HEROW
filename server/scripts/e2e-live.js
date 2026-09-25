// Prueba una partida EN VIVO real: 2 jugadoras temporales, emparejamiento,
// canal de Portal, 5 rondas y puntos guardados. Requiere el backend en marcha.
//   npm run test:live
import { Portal } from '@portalsdk/core'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })
const API = process.env.E2E_API ?? `http://localhost:${process.env.PORT ?? 3001}`
const PK = process.env.PORTAL_PUBLISHABLE_KEY ?? (await import('node:fs')).readFileSync(new URL('../../frontend/.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).find(l => l.startsWith('VITE_PORTAL_PUBLISHABLE_KEY='))?.split('=')[1]
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const wait = (ms) => new Promise(r => setTimeout(r, ms))

let failures = 0
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`✅ ${msg}${extra ? ` · ${extra}` : ''}`)
  else { failures++; console.error(`❌ ${msg}${extra ? ` · ${extra}` : ''}`) }
}

async function makePlayer(tag, heroineId, portalId) {
  const username = `live_${tag}_${Date.now().toString(36)}`
  const password = 'prueba-segura-123'
  const year = new Date().getFullYear() - 16
  const reg = await fetch(`${API}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, birth: { day: 2, month: 2, year } }),
  })
  if (reg.status !== 201) throw new Error(`registro ${tag}: HTTP ${reg.status}`)
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data } = await client.auth.signInWithPassword({ email: `${username}@players.herow.app`, password })
  const player = { tag, username, userId: data.user.id, token: data.session.access_token }
  player.call = async (method, path, body) => {
    const res = await fetch(API + path, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${player.token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: res.status, data: await res.json().catch(() => null) }
  }
  await player.call('POST', '/api/me/heroine', { heroineId, portalId })
  return player
}

const players = []
try {
  const a = await makePlayer('a', 'hamilton', 'robotics')
  const b = await makePlayer('b', 'quispe', 'robotics')
  players.push(a, b)
  ok(true, 'Dos jugadoras temporales creadas', `${a.username} vs ${b.username}`)

  // Emparejamiento: A espera, B llega 1 s después.
  const qa = a.call('POST', '/api/live/queue', { portal: 'robotics' })
  await wait(1000)
  const lobby = await b.call('GET', '/api/live/lobby')
  ok(lobby.data?.waiting?.robotics === a.username, 'El lobby muestra que A está esperando en Robótica')
  const [ra, rb] = await Promise.all([qa, b.call('POST', '/api/live/queue', { portal: 'robotics' })])
  ok(ra.data?.matched && rb.data?.matched && ra.data.match.id === rb.data.match.id, 'Emparejadas en la misma partida')
  const match = ra.data.match
  ok(match.players.length === 2 && ra.data.token && rb.data.token, 'Cada una recibe su token de Portal')

  // Conexión al canal en vivo.
  const events = { a: [], b: [] }
  const handles = {}
  for (const [key, res] of [['a', ra], ['b', rb]]) {
    const portal = new Portal({ apiKey: PK, token: res.data.token })
    const ch = portal.channel(match.channelId, { history: 50 })
    ch.on('message', (m) => { if (m.sender.id === 'herow-server') events[key].push(m) })
    ch.acquire()
    handles[key] = ch
  }
  for (let i = 0; i < 40 && (handles.a.status !== 'ready' || handles.b.status !== 'ready'); i++) await wait(250)
  ok(handles.a.status === 'ready' && handles.b.status === 'ready', 'Ambas conectadas al canal de Portal')
  await wait(500)
  const pres = handles.a.presence
  ok(pres?.kind === 'detailed' && pres.count === 2, 'Presencia: se ven las dos en la sala')

  // 5 rondas: A responde bien y rápido; B responde mal.
  const seen = new Set()
  for (let n = 1; n <= 5; n++) {
    for (let i = 0; i < 60 && !events.a.some(e => e.type === 'round' && e.content.n === n); i++) await wait(250)
    const round = events.a.find(e => e.type === 'round' && e.content.n === n)
    ok(Boolean(round), `Ronda ${n}: pregunta recibida en vivo`, round?.content.question.text.slice(0, 50))
    if (!round) break
    seen.add(round.content.question.text)
    ok(!('correctIndex' in round.content) && !('answer' in round.content.question), `Ronda ${n}: la respuesta correcta NO viaja al navegador`)
    // Truco de prueba: el snapshot tampoco la tiene; A prueba las 4 opciones en su cabeza, pero solo puede responder 1.
    const snap = await a.call('GET', `/api/live/${match.id}`)
    ok(snap.data?.round?.n === n && snap.data.round.result === null, `Ronda ${n}: snapshot sin resultado todavía`)
    const choiceA = 0
    const ansA = await a.call('POST', `/api/live/${match.id}/answer`, { n, choice: choiceA })
    const dup = await a.call('POST', `/api/live/${match.id}/answer`, { n, choice: 1 })
    if (n === 1) ok(ansA.status === 200 && dup.status === 409, 'No se puede responder dos veces la misma ronda')
    await wait(300)
    await b.call('POST', `/api/live/${match.id}/answer`, { n, choice: 3 })
    for (let i = 0; i < 40 && !events.b.some(e => e.type === 'result' && e.content.n === n); i++) await wait(250)
    const result = events.b.find(e => e.type === 'result' && e.content.n === n)?.content
    ok(Boolean(result), `Ronda ${n}: ambas reciben el resultado`, result && `A=${result.players[a.userId].outcome} B=${result.players[b.userId].outcome}`)
  }
  ok(seen.size === 5, 'Las 5 preguntas fueron distintas')

  for (let i = 0; i < 40 && !events.a.some(e => e.type === 'end'); i++) await wait(250)
  const end = events.a.find(e => e.type === 'end')?.content
  ok(Boolean(end) && end.reason === 'completed', 'La partida termina y se anuncia el final', end && `marcador ${JSON.stringify(Object.values(end.scores))}`)

  // Puntos guardados en la base para las dos.
  const ma = await a.call('GET', '/api/me')
  const mb = await b.call('GET', '/api/me')
  const robA = ma.data.skills.find(s => s.portal === 'robotics')
  const robB = mb.data.skills.find(s => s.portal === 'robotics')
  ok(robA.answered === 5 && robB.answered === 5, '5 rondas guardadas para cada una')
  ok(ma.data.profile.points === end.points[a.userId] && mb.data.profile.points === end.points[b.userId], 'Los puntos coinciden con el marcador', `A=${ma.data.profile.points} B=${mb.data.profile.points}`)
  const liveRounds = await admin.from('rounds').select('mode').eq('user_id', a.userId)
  ok(liveRounds.data.every(r => r.mode === 'live'), 'Las rondas quedan marcadas como "en vivo"')

  // Abandono: nueva partida y B se va.
  const q2 = a.call('POST', '/api/live/queue', { portal: 'robotics' })
  await wait(500)
  const [r2a] = await Promise.all([q2, b.call('POST', '/api/live/queue', { portal: 'robotics' })])
  await b.call('POST', `/api/live/${r2a.data.match.id}/leave`)
  const snap2 = await a.call('GET', `/api/live/${r2a.data.match.id}`)
  ok(snap2.data.status === 'ended' && snap2.data.end.reason === 'left' && snap2.data.end.winner === a.userId, 'Si la rival abandona, gana la que se queda')

  handles.a.release(); handles.b.release()
} catch (err) {
  failures++
  console.error('❌ Error inesperado:', err)
} finally {
  for (const p of players) await admin.auth.admin.deleteUser(p.userId)
  if (players.length) console.log('🧹 Jugadoras temporales borradas')
}
console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodo OK')
process.exit(failures ? 1 : 0)
