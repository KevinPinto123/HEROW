// Prueba de punta a punta contra el backend en marcha (npm run dev).
// Crea una usuaria temporal, juega, hace una misión, sube de nivel y la borra.
//   npm run test:e2e
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })
const API = process.env.E2E_API ?? `http://localhost:${process.env.PORT ?? 3001}`
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })

let token
let failures = 0
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`✅ ${msg}${extra ? ` · ${extra}` : ''}`)
  else { failures++; console.error(`❌ ${msg}${extra ? ` · ${extra}` : ''}`) }
}
async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

const year = new Date().getFullYear()
const username = `e2e_${Date.now().toString(36)}`
const password = 'prueba-segura-123'
let userId

try {
  // ── Registro ──
  let r = await call('POST', '/api/auth/register', { username, password, birth: { day: 1, month: 1, year: year - 20 } })
  ok(r.status === 403, 'Rechaza a una chica de 20 años', r.data?.message)
  r = await call('POST', '/api/auth/register', { username, password, birth: { day: 1, month: 1, year: year - 16 }, guardianContact: 'mama@example.com' })
  ok(r.status === 201, 'Registra a una chica de 16 años', `HTTP ${r.status}`)
  r = await call('POST', '/api/auth/register', { username, password, birth: { day: 1, month: 1, year: year - 16 } })
  ok(r.status === 409, 'No permite usuario repetido')

  // ── Login ──
  const { data: login, error } = await client.auth.signInWithPassword({ email: `${username}@players.herow.app`, password })
  ok(!error, 'Inicia sesión con usuario y contraseña', error?.message)
  token = login.session.access_token
  userId = login.user.id

  r = await call('GET', '/api/me')
  ok(r.status === 200 && r.data.profile.level === 1 && !r.data.profile.heroineId, 'Perfil nuevo: nivel 1 sin heroína')

  // ── Heroína inicial ──
  r = await call('POST', '/api/me/heroine', { heroineId: 'curie', portalId: 'code' })
  ok(r.status === 400, 'No deja elegir una heroína de otro portal')
  r = await call('POST', '/api/me/heroine', { heroineId: 'curie', portalId: 'science' })
  ok(r.status === 200 && r.data.profile.heroineId === 'curie', 'Elige a Marie Curie (Ciencia)')
  ok(r.data.collection.filter(h => h.unlocked).length === 1, 'Solo Marie Curie desbloqueada al inicio')
  r = await call('POST', '/api/me/heroine', { heroineId: 'lovelace', portalId: 'code' })
  ok(r.status === 403, 'No deja usar una heroína bloqueada')

  // ── Combate ──
  let wins = 0
  for (let i = 0; i < 6; i++) {
    const start = await call('POST', '/api/combat/start', { portal: 'science' })
    if (i === 0) {
      ok(start.status === 200 && start.data.question.options.length === 4, 'Empieza una ronda', `dificultad ${start.data.question.difficulty}`)
      ok(!('answer' in start.data.question) && !('correctIndex' in start.data), 'El navegador NO recibe la respuesta correcta')
    }
    const ans = await call('POST', '/api/combat/answer', { roundId: start.data.roundId, choice: i % 3 === 0 ? null : 0 })
    if (i === 0) ok(ans.data.timedOut === true && ans.data.playerCorrect === false, 'Si se acaba el tiempo, cuenta como fallo')
    if (ans.data.outcome === 'win') wins++
    const again = await call('POST', '/api/combat/answer', { roundId: start.data.roundId, choice: 0 })
    if (i === 0) ok(again.status === 404, 'Una ronda no se puede responder dos veces')
  }
  r = await call('GET', '/api/me')
  const sci = r.data.skills.find(s => s.portal === 'science')
  ok(sci.answered === 6, 'Registra 6 rondas en Ciencia', `${sci.correct} aciertos, ${wins} victorias, ${r.data.profile.points} pts`)
  ok(r.data.recent.length === 6, 'Historial de rondas guardado')

  // ── Dashboard ──
  r = await call('GET', '/api/me/dashboard')
  ok(r.status === 200 && typeof r.data.guide === 'string' && r.data.guide.length > 20, 'Dashboard con mensaje de la guía', `"${r.data.guide?.slice(0, 90)}…"`)
  const opps = r.data.opportunities
  ok(Array.isArray(opps.recommended), 'Oportunidades recomendadas', `${opps.recommended.length} para ti`)

  // ── Misión nivel 2 ──
  ok(r.data.next.targetLevel === 2 && r.data.next.mission.id === 'perfil', 'La misión del nivel 2 es el perfil profesional')
  r = await call('POST', '/api/missions/build', { fields: { headline: 'corto' } })
  ok(r.status === 400, 'Valida largo mínimo de los campos', r.data?.message)
  r = await call('POST', '/api/missions/real', { url: 'https://www.linkedin.com/in/prueba' })
  ok(r.status === 400, 'No acepta el paso real antes de aprobar la misión')
  r = await call('POST', '/api/missions/build', {
    fields: {
      headline: 'Estudiante de 5to de secundaria · Futura científica de datos',
      about: 'Me encanta entender cómo funciona el mundo con datos. En HEROW descubrí el portal de Ciencia y aprendí sobre el método científico y la doble hélice del ADN. En mi colegio organicé un experimento con plantas para medir cuánto crecen con distinta luz y registré los resultados en una hoja de cálculo.',
      skills: 'Hojas de cálculo, método científico, trabajo en equipo, Python básico',
      inspiration: 'Marie Curie, porque trabajó con constancia en condiciones difíciles y ganó dos Premios Nobel en ciencias distintas.',
      goal: 'Terminar un curso gratuito de biología en Coursera antes de diciembre.',
    },
  })
  ok(r.status === 200 && r.data.submission.status === 'approved', 'YessenIA aprueba un buen perfil', `puntaje ${r.data.submission?.score}`)
  r = await call('POST', '/api/missions/real', { url: 'https://www.google.com/' })
  ok(r.status === 400, 'Rechaza un enlace que no es de perfil', r.data?.message)
  r = await call('POST', '/api/missions/real', { url: 'https://www.linkedin.com/in/prueba-herow' })
  ok(r.status === 200 && r.data.state.next.realDone, 'Acepta el enlace de LinkedIn')

  r = await call('POST', '/api/missions/advance')
  ok(r.status === 409, 'No sube de nivel sin los 500 puntos')
  r = await call('POST', '/api/dev/points', { amount: 500 })
  ok(r.status === 200, 'Atajo de desarrollo suma puntos')
  r = await call('POST', '/api/missions/advance')
  ok(r.status === 200 && r.data.state.profile.level === 2, '¡Sube al nivel 2!', `nuevas heroínas: ${r.data.state.newlyUnlocked.join(', ') || 'ninguna'}`)
  ok(r.data.state.collection.find(h => h.id === 'costa')?.unlocked, 'Completar la misión desbloquea a Mariana Costa')
  ok(r.data.state.next.mission.id === 'post' && r.data.state.next.pointsNeeded === 1000, 'La siguiente misión es el post (1000 pts)')

  // ── Oportunidades ──
  const list = (await call('GET', '/api/opportunities')).data
  const first = list.recommended[0]
  if (first) {
    r = await call('POST', `/api/opportunities/${first.id}/status`, { status: 'applied' })
    ok(r.status === 200 && r.data.opportunities.applied.some(o => o.id === first.id), 'Marca una oportunidad como "Postulé"', first.title)
  } else {
    console.log('⚪ Aún no hay oportunidades (el agente sigue analizando): se omite esa prueba')
  }

  // ── YessenIA con contexto ──
  r = await call('POST', '/api/yessenia/chat', { messages: [{ role: 'user', content: '¿En qué nivel estoy y qué me recomiendas hacer?' }] })
  ok(r.status === 200 && r.data.reply, 'YessenIA responde con su contexto', `"${r.data.reply?.slice(0, 110)}…"`)

  // ── Seguridad ──
  token = undefined
  r = await call('GET', '/api/me')
  ok(r.status === 401, 'Sin sesión no se accede al perfil')
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const leak = await anon.from('profiles').select('*')
  ok((leak.data ?? []).length === 0, 'RLS: nadie lee la base directo desde el navegador')
} catch (err) {
  failures++
  console.error('❌ Error inesperado:', err)
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId)
    console.log('🧹 Usuaria temporal borrada')
  }
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodo OK')
process.exit(failures ? 1 : 0)
