// Prueba de punta a punta de HEROW Conecta (mentoras) y del modo sin internet,
// contra el backend en marcha (npm run dev) con el schema.sql actualizado.
// Crea una jugadora y una mentora temporales y las borra al final.
//   npm run test:conecta:e2e      (necesita ADMIN_TOKEN o LEADS_ADMIN_TOKEN en server/.env)
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })
const API = process.env.E2E_API ?? `http://localhost:${process.env.PORT ?? 3001}`
const ADMIN = process.env.ADMIN_TOKEN || process.env.LEADS_ADMIN_TOKEN
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })

if (!ADMIN) {
  console.error('❌ Falta ADMIN_TOKEN (o LEADS_ADMIN_TOKEN) en server/.env')
  process.exit(1)
}

let failures = 0
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`✅ ${msg}${extra ? ` · ${extra}` : ''}`)
  else { failures++; console.error(`❌ ${msg}${extra ? ` · ${extra}` : ''}`) }
}
async function call(method, path, body, headers = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

const stamp = Date.now().toString(36)
const username = `e2ec_${stamp}`
const password = 'prueba-segura-123'
const mentorEmail = `mentora_${stamp}@example.com`
let userId
let mentorId

try {
  // ── Jugadora ──
  const year = new Date().getFullYear()
  let r = await call('POST', '/api/auth/register', { username, password, birth: { day: 1, month: 1, year: year - 16 } })
  ok(r.status === 201, 'Registra a una jugadora de 16 años')
  const { data: login } = await client.auth.signInWithPassword({ email: `${username}@players.herow.app`, password })
  userId = login.user.id
  const girl = { Authorization: `Bearer ${login.session.access_token}` }
  await call('POST', '/api/me/heroine', { heroineId: 'lovelace', portalId: 'code' }, girl)

  r = await call('GET', '/api/conecta', null, girl)
  if (r.status === 503) throw new Error('La base no tiene las tablas nuevas: ejecuta supabase/schema.sql en Supabase')
  ok(r.status === 200 && Array.isArray(r.data.events), 'La jugadora abre Conecta')
  r = await call('GET', '/api/conecta')
  ok(r.status === 401, 'Conecta exige sesión')

  // ── Mentora: postula ──
  const application = {
    name: 'Ana Prueba', email: mentorEmail, role: 'Ingeniera de datos', org: 'Empresa Demo',
    linkedin: 'https://www.linkedin.com/in/ana-prueba', portals: ['code'], region: 'Cusco',
    story: 'A los 16 años no sabía qué era programar. Una profesora me enseñó Python y desde ahí no paré.',
    advice: 'Equivocarse es parte de aprender.', powerup: 'Yo también dudé. Hoy trabajo con datos. Tú puedes.',
    consent: true, ethics: true,
  }
  r = await call('POST', '/api/mentors/apply', { ...application, story: 'Escríbeme al 987 654 321 y te cuento cómo empecé en esto.' })
  ok(r.status === 400, 'Bloquea una postulación con teléfono en la historia', r.data?.message)
  r = await call('POST', '/api/mentors/apply', { ...application, ethics: false })
  ok(r.status === 400, 'Exige aceptar el código de cuidado')
  r = await call('POST', '/api/mentors/apply', application)
  ok(r.status === 201 && /^HRW-/.test(r.data.code), 'La mentora postula y recibe su código')
  const code = r.data.code
  const asMentor = { 'X-Mentor-Code': code }
  r = await call('POST', '/api/mentors/apply', application)
  ok(r.status === 409, 'No acepta dos postulaciones con el mismo correo')

  r = await call('GET', '/api/mentors/me', null, asMentor)
  ok(r.status === 200 && r.data.mentor.status === 'pending', 'Panel: postulación en revisión')
  mentorId = r.data.mentor.id
  r = await call('GET', '/api/mentors/me', null, { 'X-Mentor-Code': 'HRW-AAAA-BBBB-CCCC' })
  ok(r.status === 401, 'Un código inventado no entra')
  r = await call('POST', '/api/mentors/events', {}, asMentor)
  ok(r.status === 403, 'Sin verificar no puede publicar eventos')

  r = await call('GET', '/api/conecta', null, girl)
  ok(!r.data.mentors.some(m => m.id === mentorId), 'Una mentora sin verificar NO aparece para las chicas')

  // ── Equipo: verifica ──
  r = await call('GET', '/api/mentors/admin/queue', null, { 'X-Admin-Token': 'incorrecto' })
  ok(r.status === 401, 'El panel del equipo rechaza un token incorrecto')
  r = await call('POST', `/api/mentors/admin/mentors/${mentorId}/status`, { status: 'approved' }, { 'X-Admin-Token': ADMIN })
  ok(r.status === 200 && r.data.mentor.status === 'approved', 'El equipo aprueba a la mentora')
  r = await call('GET', '/api/mentors/admin/queue', null, { 'X-Admin-Token': ADMIN })
  ok(r.status === 200 && typeof r.data.kpis?.mentorsApproved === 'number', 'El panel del equipo muestra KPIs', JSON.stringify(r.data.kpis))

  // ── Mentora: evento ──
  const startsAt = new Date(Date.now() + 3 * 86_400_000).toISOString()
  r = await call('POST', '/api/mentors/events', {
    title: 'Mi primer código', description: 'Charla para chicas curiosas: cómo empecé a programar y qué estudiar.',
    kind: 'charla', modality: 'virtual', startsAt, durationMin: 60, portals: ['code'],
  }, asMentor)
  ok(r.status === 400, 'Un evento virtual sin enlace se rechaza')
  r = await call('POST', '/api/mentors/events', {
    title: 'Mi primer código', description: 'Charla para chicas curiosas: cómo empecé a programar y qué estudiar.',
    kind: 'charla', modality: 'virtual', url: 'https://forms.gle/demo', startsAt, durationMin: 60, portals: ['code'],
  }, asMentor)
  ok(r.status === 201, 'La mentora publica un evento', r.data?.event?.status)
  const eventId = r.data.event.id
  if (r.data.event.status === 'review') {
    await call('POST', `/api/mentors/admin/events/${eventId}/status`, { status: 'published' }, { 'X-Admin-Token': ADMIN })
    console.log('   (sin moderación automática: el equipo lo publicó a mano)')
  }

  // ── Jugadora: ve, se apunta y pregunta ──
  r = await call('GET', '/api/conecta', null, girl)
  const mentor = r.data.mentors.find(m => m.id === mentorId)
  ok(mentor && !('email' in mentor) && !('linkedin' in mentor), 'La chica ve a la mentora, sin correo ni LinkedIn')
  ok(r.data.events.some(e => e.id === eventId), 'La chica ve el evento')
  r = await call('POST', `/api/conecta/events/${eventId}/rsvp`, { going: true }, girl)
  ok(r.status === 200 && r.data.count === 1, 'Se apunta al evento')
  r = await call('POST', `/api/conecta/events/${eventId}/rsvp`, { going: true }, girl)
  ok(r.data.count === 1, 'Apuntarse dos veces no cuenta doble')

  r = await call('POST', '/api/conecta/questions', { question: 'Pásame tu whatsapp para preguntarte más cosas', mentorId }, girl)
  ok(r.status === 400, 'Bloquea pedir WhatsApp', r.data?.message)
  r = await call('POST', '/api/conecta/questions', { question: '¿Qué estudiaste para trabajar con datos? Me da miedo no ser buena en matemáticas.', mentorId }, girl)
  ok(r.status === 201, 'Envía una pregunta anónima', r.data?.question?.status)
  const questionId = r.data.question.id
  if (r.data.question.status === 'review') {
    await call('POST', `/api/mentors/admin/questions/${questionId}/status`, { action: 'approve' }, { 'X-Admin-Token': ADMIN })
  }

  // ── Mentora: ve impacto sin datos de la chica, y responde ──
  r = await call('GET', '/api/mentors/me', null, asMentor)
  ok(r.data.impact.girlsGoing === 1, 'La mentora ve 1 chica apuntada')
  ok(!JSON.stringify(r.data).includes(userId) && !JSON.stringify(r.data).includes(username), 'La mentora NUNCA recibe el id ni el usuario de la chica')
  ok(r.data.inbox.some(q => q.id === questionId), 'La pregunta llega a su bandeja')
  r = await call('POST', `/api/mentors/questions/${questionId}/answer`, { answer: 'corta' }, asMentor)
  ok(r.status === 400, 'Una respuesta muy corta se rechaza')
  r = await call('POST', `/api/mentors/questions/${questionId}/answer`, {
    answer: 'Estudié ingeniería estadística. Al inicio también me costaban las matemáticas: lo importante es practicar y preguntar.',
  }, asMentor)
  ok(r.status === 200, 'La mentora responde', r.data?.status)
  if (r.data?.status === 'review') await call('POST', `/api/mentors/admin/questions/${questionId}/status`, { action: 'approve' }, { 'X-Admin-Token': ADMIN })
  r = await call('POST', `/api/mentors/questions/${questionId}/answer`, { answer: 'Otra respuesta más para la misma pregunta, no debería entrar.' }, asMentor)
  ok(r.status === 404, 'No se puede responder dos veces')

  r = await call('GET', '/api/conecta', null, girl)
  ok(r.data.answers.some(q => q.id === questionId && q.answer), 'La respuesta se publica en el muro')

  // ── Seguir y reaccionar ──
  r = await call('POST', `/api/conecta/mentors/${mentorId}/follow`, { following: true }, girl)
  ok(r.status === 200 && r.data.followers === 1, 'La chica sigue a la mentora')
  r = await call('POST', `/api/conecta/mentors/${mentorId}/follow`, { following: true }, girl)
  ok(r.data.followers === 1, 'Seguir dos veces no cuenta doble')
  r = await call('POST', `/api/conecta/answers/${questionId}/react`, { kind: 'me_ayudo', on: true }, girl)
  ok(r.status === 200 && r.data.reactions.me_ayudo === 1, 'Marca "Me ayudó" en la respuesta')
  r = await call('POST', `/api/conecta/answers/${questionId}/react`, { kind: 'odio', on: true }, girl)
  ok(r.status === 400, 'Solo se aceptan reacciones predefinidas')
  r = await call('GET', '/api/conecta', null, girl)
  const seguida = r.data.mentors.find(m => m.id === mentorId)
  ok(seguida?.following && seguida.followers === 1 && seguida.badge?.name, 'Conecta muestra que la sigue, sus seguidoras y su insignia', seguida?.badge?.name)
  ok(r.data.events.find(e => e.id === eventId)?.fromFollowed, 'Los eventos de su mentora aparecen marcados')
  r = await call('GET', '/api/mentors/me', null, asMentor)
  ok(r.data.impact.followers === 1 && r.data.impact.helpful === 1, 'La mentora ve 1 seguidora y 1 "me ayudó"', JSON.stringify(r.data.impact.badge))
  ok(!JSON.stringify(r.data).includes(userId), 'Sigue sin ver quién la sigue')
  r = await call('GET', '/api/conecta/powerup', null, girl)
  ok(r.status === 200 && r.data.powerup?.text, 'El jefe final recibe un power-up de mentora', r.data.powerup?.name)
  r = await call('GET', '/api/conecta/public')
  ok(r.status === 200 && !JSON.stringify(r.data).includes(mentorEmail), 'La landing ve mentoras sin correos')

  // ── Sin internet ──
  r = await call('GET', '/api/offline/pack')
  ok(r.status === 200 && r.data.questions.length > 10, 'Cualquiera descarga el paquete de práctica', `${r.data.questions.length} preguntas`)
  const q = r.data.questions.find(x => x.portal === 'code')
  const before = (await call('GET', '/api/me', null, girl)).data.profile.points
  const answers = [
    { id: randomUUID(), questionId: q.id, choice: q.answer, ms: 4000, answeredAt: new Date().toISOString() },
    { id: randomUUID(), questionId: q.id, choice: (q.answer + 1) % q.options.length, ms: 5000, answeredAt: new Date().toISOString() },
    { id: randomUUID(), questionId: 'inventada', choice: 0, ms: 1000, answeredAt: new Date().toISOString() },
  ]
  r = await call('POST', '/api/offline/sync', { answers }, girl)
  ok(r.status === 200 && r.data.accepted === 2 && r.data.invalid === 1, 'Sincroniza la práctica sin internet', `+${r.data?.pointsAwarded} pts`)
  ok(r.data.state.profile.points === before + r.data.pointsAwarded, 'Los puntos se suman al perfil')
  r = await call('POST', '/api/offline/sync', { answers }, girl)
  ok(r.data.accepted === 0 && r.data.pointsAwarded === 0, 'Reenviar el mismo lote no suma dos veces')
  r = await call('POST', '/api/offline/sync', { answers })
  ok(r.status === 401, 'Sincronizar exige sesión')
} catch (err) {
  failures++
  console.error('❌ Error inesperado:', err.message)
} finally {
  if (mentorId) await admin.from('mentors').delete().eq('id', mentorId)
  if (userId) await admin.auth.admin.deleteUser(userId)
  console.log('🧹 Jugadora y mentora de prueba borradas')
}

console.log(failures ? `\n❌ ${failures} fallas` : '\n✅ Todo OK')
process.exit(failures ? 1 : 0)
