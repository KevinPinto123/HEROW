import { Router } from 'express'
import { z } from 'zod'
import { features } from '../config.js'
import { PORTAL_IDS } from '../data/game.js'
import { cancelQueue, getMatchFor, joinQueue, leaveMatch, snapshot, submitAnswer, waitingByPortal } from '../services/live.js'
import { signPlayerToken } from '../services/portal-auth.js'
import { db, must } from '../services/supabase.js'

export const liveRouter = Router()

liveRouter.use((_req, res, next) => {
  if (!features.portalSecret) return res.status(503).json({ error: 'live_unavailable', message: 'El modo en vivo no está configurado.' })
  next()
})

// Quién está buscando rival (para mostrar "Ada_2010 está esperando en Ciencia").
liveRouter.get('/lobby', (_req, res) => res.json({ waiting: waitingByPortal() }))

const queueBody = z.object({ portal: z.enum(PORTAL_IDS), ticket: z.uuid().optional() })

// Buscar rival: responde cuando hay pareja o a los 25 s.
liveRouter.post('/queue', async (req, res) => {
  const body = queueBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const profile = must(await db.from('profiles').select('username, heroine_id').eq('id', req.user.id).single())
  if (!profile.heroine_id) return res.status(409).json({ error: 'no_heroine' })

  let closed = false
  res.on('close', () => { if (!res.writableEnded) { closed = true; cancelQueue(req.user.id, body.data.ticket) } })

  const result = await joinQueue(body.data.portal, {
    userId: req.user.id,
    username: profile.username,
    heroineId: profile.heroine_id,
    ticket: body.data.ticket ?? null,
  })
  if (closed) return
  if (!result.matched) return res.json(result)
  const match = getMatchFor(result.matchId, req.user.id)
  const token = await signPlayerToken({ playerId: req.user.id, name: profile.username })
  res.json({ matched: true, match: snapshot(match), token })
})

const cancelBody = z.object({ ticket: z.uuid().optional() })

liveRouter.post('/cancel', (req, res) => {
  const body = cancelBody.safeParse(req.body ?? {})
  cancelQueue(req.user.id, body.success ? body.data.ticket : undefined)
  res.json({ ok: true })
})

liveRouter.get('/:id', (req, res) => {
  const match = getMatchFor(req.params.id, req.user.id)
  if (!match) return res.status(404).json({ error: 'match_not_found' })
  res.json(snapshot(match))
})

const answerBody = z.object({ n: z.number().int().min(1), choice: z.number().int().min(0).max(5) })

liveRouter.post('/:id/answer', async (req, res) => {
  const body = answerBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const match = getMatchFor(req.params.id, req.user.id)
  if (!match) return res.status(404).json({ error: 'match_not_found' })
  const r = await submitAnswer(match, req.user.id, body.data.n, body.data.choice)
  if (!r.ok) return res.status(409).json({ error: r.error })
  res.json({ ok: true })
})

liveRouter.post('/:id/leave', async (req, res) => {
  const match = getMatchFor(req.params.id, req.user.id)
  if (match) await leaveMatch(match, req.user.id)
  res.json({ ok: true })
})
