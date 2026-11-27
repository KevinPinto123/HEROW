// HEROW Conecta para las jugadoras: mentoras, eventos, preguntas anónimas y power-ups.
import { Router } from 'express'
import { z } from 'zod'
import { PORTAL_IDS } from '../data/game.js'
import {
  answeredCounts, approvedMentors, byPortalMatch, conectaErrors, followerCounts, helpfulByMentor, mentorBadge,
  mentorsMap, publicEvent, publicMentor, publicQuestion, reactionCounts, rsvpCounts, upcomingEvents,
} from '../services/conecta.js'

const REACTIONS = ['me_ayudo', 'me_inspira']

/** Mentoras con seguidoras, respuestas, "Me ayudó" e insignia. */
async function mentorsWithImpact(mentors, events = []) {
  const ids = mentors.map(m => m.id)
  const [followers, answered, helpful, going] = await Promise.all([
    followerCounts(ids),
    answeredCounts(ids),
    helpfulByMentor(ids),
    rsvpCounts(events.map(e => e.id)),
  ])
  const goingByMentor = new Map()
  for (const e of events) goingByMentor.set(e.mentor_id, (goingByMentor.get(e.mentor_id) ?? 0) + (going.get(e.id) ?? 0))
  return mentors.map(m => {
    const stats = {
      followers: followers.get(m.id) ?? 0,
      answered: answered.get(m.id) ?? 0,
      helpful: helpful.get(m.id) ?? 0,
      going: goingByMentor.get(m.id) ?? 0,
    }
    return { ...publicMentor(m), ...stats, badge: mentorBadge(stats) }
  })
}
import { getPlayerState } from '../services/progress.js'
import { reviewText } from '../services/safety.js'
import { db, must } from '../services/supabase.js'

export const conectaRouter = Router()

const QUESTIONS_PER_DAY = 3

/** Portales que más le interesan: el suyo y en los que más ha jugado. */
function playerPortals(state) {
  const played = [...state.skills].filter(s => s.answered).sort((a, b) => b.answered - a.answered).map(s => s.portal)
  return [...new Set([state.profile.portalId, ...played].filter(Boolean))]
}

// Todo lo de Conecta en una sola llamada (también se guarda para verlo sin internet).
conectaRouter.get('/', async (req, res) => {
  const state = await getPlayerState(req.user.id, { unlock: false })
  if (!state.profile) return res.status(404).json({ error: 'no_profile' })
  const portals = playerPortals(state)

  const [mentors, events, answeredRows, mineRows, myRsvps, myFollows] = await Promise.all([
    approvedMentors(),
    upcomingEvents(),
    db.from('mentor_questions').select('*').eq('status', 'answered')
      .order('answered_at', { ascending: false }).limit(30).then(must),
    db.from('mentor_questions').select('*').eq('user_id', req.user.id).neq('status', 'hidden')
      .order('created_at', { ascending: false }).limit(20).then(must),
    db.from('event_rsvps').select('event_id').eq('user_id', req.user.id).then(must),
    db.from('mentor_follows').select('mentor_id').eq('user_id', req.user.id).then(must),
  ])
  const following = new Set(myFollows.map(f => f.mentor_id))
  const answerIds = answeredRows.map(q => q.id)
  const [reactions, myReactions] = await Promise.all([
    reactionCounts(answerIds),
    answerIds.length
      ? db.from('answer_reactions').select('question_id, kind').eq('user_id', req.user.id).in('question_id', answerIds).then(must)
      : [],
  ])
  const mineReact = new Set(myReactions.map(r => `${r.question_id}:${r.kind}`))

  const byId = await mentorsMap([
    ...events.map(e => e.mentor_id),
    ...answeredRows.flatMap(q => [q.mentor_id, q.answered_by]),
    ...mineRows.flatMap(q => [q.mentor_id, q.answered_by]),
  ])
  const counts = await rsvpCounts(events.map(e => e.id))
  const mine = new Set(myRsvps.map(r => r.event_id))
  const sortMatch = byPortalMatch(portals)

  // Lo de las mentoras que sigue va primero.
  const visibleEvents = events
    .filter(e => byId.get(e.mentor_id)?.status === 'approved')
    .map(e => ({ ...publicEvent(e, byId, counts, mine), fromFollowed: following.has(e.mentor_id) }))
    .sort((a, b) => Number(b.fromFollowed) - Number(a.fromFollowed))

  const withImpact = (await mentorsWithImpact(mentors, events))
    .map(m => ({ ...m, following: following.has(m.id) }))
    .sort(sortMatch)
    .sort((a, b) => Number(b.following) - Number(a.following))

  res.json({
    portals,
    mentors: withImpact,
    following: [...following],
    events: visibleEvents,
    answers: answeredRows.map(q => ({
      ...publicQuestion(q, byId),
      fromFollowed: following.has(q.answered_by),
      reactions: Object.fromEntries(REACTIONS.map(k => [k, reactions.get(`${q.id}:${k}`) ?? 0])),
      myReactions: REACTIONS.filter(k => mineReact.has(`${q.id}:${k}`)),
    })),
    mine: mineRows.map(q => publicQuestion(q, byId)),
    limits: { questionsPerDay: QUESTIONS_PER_DAY },
    stats: { mentors: mentors.length, upcoming: visibleEvents.length, answered: answeredRows.length },
    fetchedAt: new Date().toISOString(),
  })
})

const rsvpBody = z.object({ going: z.boolean() })

// Me apunto / ya no voy.
conectaRouter.post('/events/:id/rsvp', async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  const body = rsvpBody.safeParse(req.body)
  if (!id.success || !body.success) return res.status(400).json({ error: 'invalid_body' })

  const event = must(await db.from('mentor_events').select('id, status, starts_at').eq('id', id.data).maybeSingle())
  if (!event || event.status !== 'published') return res.status(404).json({ error: 'not_found', message: 'Ese evento ya no está disponible.' })

  if (body.data.going) {
    if (Date.parse(event.starts_at) < Date.now() - 2 * 60 * 60 * 1000) {
      return res.status(409).json({ error: 'event_past', message: 'Ese evento ya pasó.' })
    }
    must(await db.from('event_rsvps').upsert(
      { user_id: req.user.id, event_id: id.data },
      { onConflict: 'user_id,event_id', ignoreDuplicates: true },
    ))
  } else {
    must(await db.from('event_rsvps').delete().eq('user_id', req.user.id).eq('event_id', id.data))
  }
  const counts = await rsvpCounts([id.data])
  res.json({ going: body.data.going, count: counts.get(id.data) ?? 0 })
})

const questionBody = z.object({
  question: z.string().trim().min(10, 'Escribe tu pregunta con un poco más de detalle (mínimo 10 letras).').max(400, 'Máximo 400 caracteres.'),
  mentorId: z.uuid().nullable().optional().default(null),
  portal: z.enum(PORTAL_IDS).nullable().optional().default(null),
})

// Pregunta anónima. La respuesta se publica para todas.
conectaRouter.post('/questions', async (req, res) => {
  const body = questionBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', message: body.error.issues[0].message })
  const { question, mentorId } = body.data

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await db.from('mentor_questions').select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id).gte('created_at', since)
  if ((count ?? 0) >= QUESTIONS_PER_DAY) {
    return res.status(429).json({ error: 'daily_limit', message: `Puedes enviar ${QUESTIONS_PER_DAY} preguntas al día. ¡Vuelve mañana con más!` })
  }

  let mentor = null
  if (mentorId) {
    mentor = must(await db.from('mentors').select('id, portals, status').eq('id', mentorId).maybeSingle())
    if (!mentor || mentor.status !== 'approved') return res.status(404).json({ error: 'mentor_not_found', message: 'Esa mentora no está disponible ahora.' })
  }

  const check = await reviewText(question)
  if (check.verdict === 'blocked') return res.status(400).json({ error: 'blocked', message: check.message })

  const profile = must(await db.from('profiles').select('level, portal_id').eq('id', req.user.id).single())
  const portal = body.data.portal ?? mentor?.portals?.[0] ?? profile.portal_id ?? null
  const row = must(await db.from('mentor_questions').insert({
    user_id: req.user.id,
    mentor_id: mentor?.id ?? null,
    portal_id: portal,
    level: profile.level,
    question,
    status: check.verdict === 'ok' ? 'pending' : 'review',
  }).select('*').single())

  const byId = await mentorsMap([row.mentor_id])
  res.status(201).json({ question: publicQuestion(row, byId) })
})

const followBody = z.object({ following: z.boolean() })

// Seguir / dejar de seguir a una mentora. Ella solo ve cuántas la siguen.
conectaRouter.post('/mentors/:id/follow', async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  const body = followBody.safeParse(req.body)
  if (!id.success || !body.success) return res.status(400).json({ error: 'invalid_body' })
  const mentor = must(await db.from('mentors').select('id, status').eq('id', id.data).maybeSingle())
  if (!mentor || mentor.status !== 'approved') return res.status(404).json({ error: 'mentor_not_found', message: 'Esa mentora no está disponible ahora.' })

  if (body.data.following) {
    must(await db.from('mentor_follows').upsert(
      { user_id: req.user.id, mentor_id: id.data },
      { onConflict: 'user_id,mentor_id', ignoreDuplicates: true },
    ))
  } else {
    must(await db.from('mentor_follows').delete().eq('user_id', req.user.id).eq('mentor_id', id.data))
  }
  const counts = await followerCounts([id.data])
  res.json({ following: body.data.following, followers: counts.get(id.data) ?? 0 })
})

const reactBody = z.object({ kind: z.enum(REACTIONS), on: z.boolean() })

// "Me ayudó" / "Me inspira" en una respuesta publicada. Sin texto libre.
conectaRouter.post('/answers/:id/react', async (req, res) => {
  const id = z.uuid().safeParse(req.params.id)
  const body = reactBody.safeParse(req.body)
  if (!id.success || !body.success) return res.status(400).json({ error: 'invalid_body' })
  const q = must(await db.from('mentor_questions').select('id, status').eq('id', id.data).maybeSingle())
  if (!q || q.status !== 'answered') return res.status(404).json({ error: 'not_found' })

  const { kind, on } = body.data
  if (on) {
    must(await db.from('answer_reactions').upsert(
      { user_id: req.user.id, question_id: id.data, kind },
      { onConflict: 'user_id,question_id,kind', ignoreDuplicates: true },
    ))
  } else {
    must(await db.from('answer_reactions').delete().eq('user_id', req.user.id).eq('question_id', id.data).eq('kind', kind))
  }
  const counts = await reactionCounts([id.data])
  res.json({ reactions: Object.fromEntries(REACTIONS.map(k => [k, counts.get(`${id.data}:${k}`) ?? 0])) })
})

// Power-up de una mentora real para la pelea contra el NoPuedo.
conectaRouter.get('/powerup', async (req, res) => {
  const profile = must(await db.from('profiles').select('portal_id').eq('id', req.user.id).single())
  const mentors = (await approvedMentors()).filter(m => m.powerup?.trim())
  if (!mentors.length) return res.json({ powerup: null })
  const mine = mentors.filter(m => m.portals?.includes(profile.portal_id))
  const pool = mine.length ? mine : mentors
  const m = pool[Math.floor(Math.random() * pool.length)]
  res.json({ powerup: { text: m.powerup, name: m.name, role: m.role, org: m.org } })
})

conectaRouter.use(conectaErrors)

// ───────── Público (landing): sin sesión, sin enlaces de eventos ─────────
export const conectaPublicRouter = Router()

conectaPublicRouter.get('/', async (_req, res) => {
  if (!db) return res.json({ mentors: [], stats: { mentors: 0, upcoming: 0, answered: 0 } })
  try {
    const [mentors, events, answered] = await Promise.all([
      approvedMentors(),
      upcomingEvents(),
      db.from('mentor_questions').select('id', { count: 'exact', head: true }).eq('status', 'answered'),
    ])
    const top = (await mentorsWithImpact(mentors, events))
      .sort((a, b) => b.badge.points - a.badge.points)
      .slice(0, 6)
    res.json({
      mentors: top.map(({ id, name, role, org, portals, advice, followers, badge }) => ({ id, name, role, org, portals, advice, followers, badge })),
      stats: { mentors: mentors.length, upcoming: events.length, answered: answered.count ?? 0 },
    })
  } catch {
    // La landing nunca debe romperse por esto.
    res.json({ mentors: [], stats: { mentors: 0, upcoming: 0, answered: 0 } })
  }
})
