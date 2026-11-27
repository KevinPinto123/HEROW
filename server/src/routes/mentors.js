// HEROW Conecta para las mentoras (profesionales adultas) y para el equipo.
//
//   POST /api/mentors/apply           público: postular como mentora → devuelve su código
//   GET  /api/mentors/me              panel de la mentora (cabecera X-Mentor-Code)
//   ...  /api/mentors/admin/*         panel del equipo (cabecera X-Admin-Token)
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { EVENT_KINDS, MODALITIES, REGIONS } from '../data/conecta.js'
import { PORTAL_IDS } from '../data/game.js'
import {
  conectaErrors, followerCounts, generateMentorCode, hashMentorCode, helpfulByMentor, mentorBadge, mentorsMap,
  publicEvent, publicQuestion,
  rsvpCounts, sameToken,
} from '../services/conecta.js'
import { findPersonalData, isSafeHttpsUrl, reviewText } from '../services/safety.js'
import { db, must } from '../services/supabase.js'

export const mentorsRouter = Router()

const noDb = (res) => res.status(503).json({ error: 'db_unavailable', message: 'El servidor no tiene base de datos configurada.' })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const opt = (max, campo) => z.string().trim().max(max, `${campo}: máximo ${max} caracteres.`).optional().default('')

// ───────── Postular ─────────
const applyBody = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre.').max(80),
  email: z.string().trim().toLowerCase().max(160).refine(v => EMAIL_RE.test(v), 'Escribe un correo válido.'),
  role: z.string().trim().min(2, 'Cuéntanos a qué te dedicas.').max(80),
  org: opt(120, 'Organización'),
  linkedin: opt(200, 'LinkedIn'),
  portals: z.array(z.enum(PORTAL_IDS)).min(1, 'Elige al menos un portal.').max(4),
  region: z.enum(REGIONS).nullable().optional().default(null),
  story: z.string().trim().min(40, 'Tu historia necesita al menos 40 caracteres.').max(600),
  advice: z.string().trim().min(15, 'Tu consejo necesita al menos 15 caracteres.').max(300),
  powerup: z.string().trim().min(10, 'Tu power-up necesita al menos 10 caracteres.').max(140),
  consent: z.literal(true, { error: 'Necesitamos tu permiso para guardar tus datos.' }),
  ethics: z.literal(true, { error: 'Debes aceptar el código de cuidado para ser mentora.' }),
  website: z.string().optional().default(''), // trampa anti-bots
})

mentorsRouter.post('/apply', async (req, res) => {
  const body = applyBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', message: body.error.issues[0].message })
  const d = body.data
  if (d.website) return res.status(201).json({ ok: true, code: generateMentorCode(), status: 'pending' })
  if (!db) return noDb(res)

  if (d.linkedin && !isSafeHttpsUrl(d.linkedin)) {
    return res.status(400).json({ error: 'invalid_body', message: 'El enlace de LinkedIn debe empezar con https://' })
  }
  for (const [campo, texto] of [['tu historia', d.story], ['tu consejo', d.advice], ['tu power-up', d.powerup]]) {
    const personal = findPersonalData(texto)
    if (personal) return res.status(400).json({ error: 'personal_data', message: `En ${campo}: ${personal}` })
  }

  const code = generateMentorCode()
  const { error } = await db.from('mentors').insert({
    name: d.name,
    email: d.email,
    role: d.role,
    org: d.org || null,
    linkedin: d.linkedin || null,
    portals: d.portals,
    region: d.region,
    story: d.story,
    advice: d.advice,
    powerup: d.powerup,
    code_hash: hashMentorCode(code),
    consent_at: new Date().toISOString(),
  })
  if (error?.code === '23505') {
    return res.status(409).json({
      error: 'already_applied',
      message: 'Ya tenemos una postulación con ese correo. Si perdiste tu código, escríbenos y te damos uno nuevo.',
    })
  }
  if (error) throw new Error(`[mentors] ${error.message}`)
  res.status(201).json({ ok: true, code, status: 'pending' })
})

// ───────── Panel de la mentora ─────────
async function requireMentor(req, res, next) {
  if (!db) return noDb(res)
  const code = req.get('x-mentor-code')
  if (!code) return res.status(401).json({ error: 'unauthorized', message: 'Ingresa tu código de mentora.' })
  const mentor = must(await db.from('mentors').select('*').eq('code_hash', hashMentorCode(code)).maybeSingle())
  if (!mentor) return res.status(401).json({ error: 'unauthorized', message: 'Ese código no existe. Revísalo letra por letra.' })
  req.mentor = mentor
  next()
}

function requireApproved(req, res, next) {
  if (req.mentor.status === 'approved') return next()
  const message = {
    pending: 'Tu postulación está en revisión. Te escribiremos al correo cuando esté lista.',
    paused: 'Tu cuenta de mentora está en pausa. Escríbenos si quieres reactivarla.',
    rejected: 'Tu postulación no fue aprobada esta vez.',
  }[req.mentor.status]
  res.status(403).json({ error: 'not_approved', message })
}

/** Preguntas que una mentora puede responder: dirigidas a ella, o abiertas de sus portales. */
function inboxFilter(mentor) {
  const portals = (mentor.portals ?? []).filter(p => PORTAL_IDS.includes(p))
  const open = portals.length ? `and(mentor_id.is.null,portal_id.in.(${portals.join(',')}))` : 'and(mentor_id.is.null,portal_id.is.null)'
  return `mentor_id.eq.${mentor.id},${open},and(mentor_id.is.null,portal_id.is.null)`
}

const privateMentor = (m) => ({
  id: m.id, name: m.name, email: m.email, role: m.role, org: m.org, linkedin: m.linkedin,
  portals: m.portals ?? [], region: m.region, story: m.story, advice: m.advice, powerup: m.powerup,
  status: m.status, createdAt: m.created_at, approvedAt: m.approved_at,
})

mentorsRouter.get('/me', requireMentor, async (req, res) => {
  const m = req.mentor
  if (m.status !== 'approved') return res.json({ mentor: privateMentor(m), events: [], inbox: [], answered: [], impact: null })

  const [events, inboxRows, answeredRows] = await Promise.all([
    db.from('mentor_events').select('*').eq('mentor_id', m.id).order('starts_at', { ascending: false }).limit(30).then(must),
    db.from('mentor_questions').select('*').eq('status', 'pending').or(inboxFilter(m))
      .order('created_at', { ascending: true }).limit(30).then(must),
    db.from('mentor_questions').select('*').eq('answered_by', m.id).in('status', ['answered', 'review'])
      .order('answered_at', { ascending: false }).limit(30).then(must),
  ])
  const byId = await mentorsMap([m.id, ...inboxRows.map(q => q.mentor_id)])
  const counts = await rsvpCounts(events.map(e => e.id))
  const going = [...counts.values()].reduce((a, b) => a + b, 0)
  const [{ count: totalAnswered }, followers, helpful] = await Promise.all([
    db.from('mentor_questions').select('id', { count: 'exact', head: true }).eq('answered_by', m.id).eq('status', 'answered'),
    followerCounts([m.id]),
    helpfulByMentor([m.id]),
  ])
  const stats = {
    followers: followers.get(m.id) ?? 0,
    answered: totalAnswered ?? 0,
    helpful: helpful.get(m.id) ?? 0,
    going,
  }

  res.json({
    mentor: privateMentor(m),
    events: events.map(e => publicEvent(e, byId, counts)),
    // Sin user_id: la mentora nunca sabe quién preguntó.
    inbox: inboxRows.map(q => publicQuestion(q, byId)),
    answered: answeredRows.map(q => ({ ...publicQuestion(q, byId), answer: q.answer })),
    impact: {
      girlsGoing: going,
      eventsPublished: events.filter(e => e.status === 'published').length,
      questionsAnswered: totalAnswered ?? 0,
      followers: stats.followers,
      helpful: stats.helpful,
      badge: mentorBadge(stats),
    },
  })
})

const profileBody = z.object({
  role: z.string().trim().min(2).max(80),
  org: opt(120, 'Organización'),
  portals: z.array(z.enum(PORTAL_IDS)).min(1, 'Elige al menos un portal.').max(4),
  region: z.enum(REGIONS).nullable().optional().default(null),
  story: z.string().trim().min(40, 'Tu historia necesita al menos 40 caracteres.').max(600),
  advice: z.string().trim().min(15, 'Tu consejo necesita al menos 15 caracteres.').max(300),
  powerup: z.string().trim().min(10, 'Tu power-up necesita al menos 10 caracteres.').max(140),
})

mentorsRouter.post('/me', requireMentor, requireApproved, async (req, res) => {
  const body = profileBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', message: body.error.issues[0].message })
  const d = body.data
  const check = await reviewText(`${d.role}\n${d.org}\n${d.story}\n${d.advice}\n${d.powerup}`)
  if (check.verdict === 'blocked') return res.status(400).json({ error: 'blocked', message: check.message })
  if (check.verdict === 'review') {
    return res.status(503).json({ error: 'moderation_unavailable', message: 'La revisión automática no está disponible ahora. Intenta en unos minutos.' })
  }
  const row = must(await db.from('mentors').update({
    ...d, org: d.org || null, updated_at: new Date().toISOString(),
  }).eq('id', req.mentor.id).select('*').single())
  res.json({ mentor: privateMentor(row) })
})

const eventBody = z.object({
  title: z.string().trim().min(5, 'El título necesita al menos 5 caracteres.').max(120),
  description: z.string().trim().min(20, 'Cuenta de qué trata (mínimo 20 caracteres).').max(600),
  kind: z.enum(EVENT_KINDS),
  modality: z.enum(MODALITIES),
  region: z.enum(REGIONS).nullable().optional().default(null),
  place: opt(160, 'Lugar'),
  url: opt(300, 'Enlace'),
  startsAt: z.iso.datetime({ offset: true, error: 'Elige fecha y hora.' }),
  durationMin: z.number().int().min(15).max(600).default(60),
  portals: z.array(z.enum(PORTAL_IDS)).max(4).default([]),
})

const MAX_UPCOMING_EVENTS = 10

mentorsRouter.post('/events', requireMentor, requireApproved, async (req, res) => {
  const body = eventBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', message: body.error.issues[0].message })
  const d = body.data
  const start = Date.parse(d.startsAt)
  if (start < Date.now() + 10 * 60_000) return res.status(400).json({ error: 'invalid_date', message: 'El evento debe ser en el futuro.' })
  if (start > Date.now() + 366 * 86_400_000) return res.status(400).json({ error: 'invalid_date', message: 'Publica eventos de máximo un año adelante.' })
  if (d.modality !== 'virtual' && (!d.region || !d.place)) {
    return res.status(400).json({ error: 'invalid_body', message: 'Para un evento presencial indica la región y el lugar (institución o local público).' })
  }
  if (d.modality !== 'presencial' && !d.url) {
    return res.status(400).json({ error: 'invalid_body', message: 'Para un evento virtual agrega el enlace de inscripción.' })
  }
  if (d.url && !isSafeHttpsUrl(d.url)) return res.status(400).json({ error: 'invalid_body', message: 'El enlace debe empezar con https://' })

  const { count } = await db.from('mentor_events').select('id', { count: 'exact', head: true })
    .eq('mentor_id', req.mentor.id).neq('status', 'cancelled').gte('starts_at', new Date().toISOString())
  if ((count ?? 0) >= MAX_UPCOMING_EVENTS) {
    return res.status(429).json({ error: 'too_many', message: `Puedes tener hasta ${MAX_UPCOMING_EVENTS} eventos próximos.` })
  }

  const check = await reviewText(`${d.title}\n${d.description}\n${d.place}`)
  if (check.verdict === 'blocked') return res.status(400).json({ error: 'blocked', message: check.message })

  const row = must(await db.from('mentor_events').insert({
    mentor_id: req.mentor.id,
    title: d.title,
    description: d.description,
    kind: d.kind,
    modality: d.modality,
    region: d.region,
    place: d.place || null,
    url: d.url || null,
    starts_at: new Date(start).toISOString(),
    duration_min: d.durationMin,
    portals: d.portals.length ? d.portals : req.mentor.portals,
    status: check.verdict === 'ok' ? 'published' : 'review',
  }).select('*').single())
  res.status(201).json({ event: publicEvent(row, new Map([[req.mentor.id, req.mentor]])) })
})

mentorsRouter.post('/events/:id/cancel', requireMentor, requireApproved, async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  if (!id.success) return res.status(400).json({ error: 'invalid_body' })
  const rows = must(await db.from('mentor_events').update({ status: 'cancelled' })
    .eq('id', id.data).eq('mentor_id', req.mentor.id).select('id'))
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  res.json({ ok: true })
})

const answerBody = z.object({
  answer: z.string().trim().min(30, 'Tu respuesta necesita al menos 30 caracteres: ella la leerá con atención.').max(1000),
})

mentorsRouter.post('/questions/:id/answer', requireMentor, requireApproved, async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  const body = answerBody.safeParse(req.body)
  if (!id.success || !body.success) return res.status(400).json({ error: 'invalid_body', message: body.error?.issues[0].message })

  const visible = must(await db.from('mentor_questions').select('id')
    .eq('id', id.data).eq('status', 'pending').or(inboxFilter(req.mentor)).maybeSingle())
  if (!visible) return res.status(404).json({ error: 'not_found', message: 'Esa pregunta ya fue respondida o no está disponible.' })

  const check = await reviewText(body.data.answer)
  if (check.verdict === 'blocked') return res.status(400).json({ error: 'blocked', message: check.message })

  // .eq('status','pending') otra vez: si dos mentoras responden a la vez, gana la primera.
  const rows = must(await db.from('mentor_questions').update({
    answer: body.data.answer,
    answered_by: req.mentor.id,
    answered_at: new Date().toISOString(),
    status: check.verdict === 'ok' ? 'answered' : 'review',
  }).eq('id', id.data).eq('status', 'pending').select('id, status'))
  if (!rows.length) return res.status(409).json({ error: 'already_answered', message: 'Otra mentora acaba de responderla. ¡Gracias igual!' })
  res.json({ ok: true, status: rows[0].status })
})

// ───────── Panel del equipo HEROW ─────────
function requireAdmin(req, res, next) {
  if (!config.adminToken) return res.status(404).json({ error: 'not_found' })
  if (!sameToken(req.get('x-admin-token'), config.adminToken)) return res.status(401).json({ error: 'unauthorized', message: 'Token incorrecto.' })
  if (!db) return noDb(res)
  next()
}

const admin = Router()
admin.use(requireAdmin)

const count = async (query) => (await query).count ?? 0

/**
 * KPIs de impacto calculados desde la base (la fuente confiable). Complementan a Clarity,
 * que mide comportamiento en pantalla pero no ve lo que pasa sin internet.
 */
async function conectaKpis(mentors) {
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [rsvps, questions, answered, answeredRows, askers, rsvpUsers, offline30, offlineUsers, follows, helpful] = await Promise.all([
    count(db.from('event_rsvps').select('event_id', { count: 'exact', head: true })),
    count(db.from('mentor_questions').select('id', { count: 'exact', head: true })),
    count(db.from('mentor_questions').select('id', { count: 'exact', head: true }).eq('status', 'answered')),
    db.from('mentor_questions').select('created_at, answered_at').eq('status', 'answered')
      .order('answered_at', { ascending: false }).limit(500).then(must),
    db.from('mentor_questions').select('user_id').gte('created_at', since30).limit(5000).then(must),
    db.from('event_rsvps').select('user_id').gte('created_at', since30).limit(5000).then(must),
    count(db.from('offline_answers').select('id', { count: 'exact', head: true }).gte('created_at', since30)),
    db.from('offline_answers').select('user_id').gte('created_at', since30).limit(10000).then(must),
    count(db.from('mentor_follows').select('mentor_id', { count: 'exact', head: true })),
    count(db.from('answer_reactions').select('question_id', { count: 'exact', head: true }).eq('kind', 'me_ayudo')),
  ])
  const hours = answeredRows
    .map(q => (Date.parse(q.answered_at) - Date.parse(q.created_at)) / 3_600_000)
    .filter(h => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b)
  const median = hours.length ? Math.round(hours[Math.floor(hours.length / 2)] * 10) / 10 : null
  const distinct = (rows) => new Set(rows.map(r => r.user_id)).size
  return {
    mentorsApproved: mentors.filter(m => m.status === 'approved').length,
    mentorsPending: mentors.filter(m => m.status === 'pending').length,
    rsvps,
    questions,
    answered,
    answerRate: questions ? Math.round((answered / questions) * 100) : null,
    medianAnswerHours: median,
    girlsConnected30d: new Set([...askers, ...rsvpUsers].map(r => r.user_id)).size,
    offlineAnswers30d: offline30,
    offlineGirls30d: distinct(offlineUsers),
    follows,
    helpful,
  }
}

admin.get('/queue', async (_req, res) => {
  const [mentors, events, questions] = await Promise.all([
    db.from('mentors').select('*').order('created_at', { ascending: false }).limit(200).then(must),
    db.from('mentor_events').select('*').eq('status', 'review').order('created_at', { ascending: true }).then(must),
    db.from('mentor_questions').select('*').eq('status', 'review').order('created_at', { ascending: true }).then(must),
  ])
  const byId = new Map(mentors.map(m => [m.id, m]))
  res.json({
    kpis: await conectaKpis(mentors),
    mentors: mentors.map(privateMentor),
    events: events.map(e => publicEvent(e, byId)),
    // Preguntas en revisión: si ya tienen respuesta, se revisa la respuesta.
    questions: questions.map(q => ({ ...publicQuestion(q, byId), answer: q.answer })),
  })
})

const idParam = z.uuid()

admin.post('/mentors/:id/status', async (req, res) => {
  const id = idParam.safeParse(req.params.id)
  const status = z.enum(['approved', 'rejected', 'paused']).safeParse(req.body?.status)
  if (!id.success || !status.success) return res.status(400).json({ error: 'invalid_body' })
  const patch = { status: status.data, updated_at: new Date().toISOString() }
  if (status.data === 'approved') patch.approved_at = new Date().toISOString()
  const rows = must(await db.from('mentors').update(patch).eq('id', id.data).select('*'))
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  res.json({ mentor: privateMentor(rows[0]) })
})

admin.post('/mentors/:id/reset-code', async (req, res) => {
  const id = idParam.safeParse(req.params.id)
  if (!id.success) return res.status(400).json({ error: 'invalid_body' })
  const code = generateMentorCode()
  const rows = must(await db.from('mentors').update({ code_hash: hashMentorCode(code), updated_at: new Date().toISOString() }).eq('id', id.data).select('id'))
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  res.json({ code })
})

admin.post('/events/:id/status', async (req, res) => {
  const id = idParam.safeParse(req.params.id)
  const status = z.enum(['published', 'cancelled']).safeParse(req.body?.status)
  if (!id.success || !status.success) return res.status(400).json({ error: 'invalid_body' })
  const rows = must(await db.from('mentor_events').update({ status: status.data }).eq('id', id.data).select('id'))
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  res.json({ ok: true })
})

// approve: publica la respuesta (o libera la pregunta para que la respondan). hide: la retira.
admin.post('/questions/:id/status', async (req, res) => {
  const id = idParam.safeParse(req.params.id)
  const action = z.enum(['approve', 'hide']).safeParse(req.body?.action)
  if (!id.success || !action.success) return res.status(400).json({ error: 'invalid_body' })
  const q = must(await db.from('mentor_questions').select('id, answer').eq('id', id.data).maybeSingle())
  if (!q) return res.status(404).json({ error: 'not_found' })
  const status = action.data === 'hide' ? 'hidden' : q.answer ? 'answered' : 'pending'
  must(await db.from('mentor_questions').update({ status }).eq('id', id.data))
  res.json({ ok: true, status })
})

mentorsRouter.use('/admin', admin)
mentorsRouter.use(conectaErrors)
