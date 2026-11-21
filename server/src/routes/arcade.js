import { Router } from 'express'
import { z } from 'zod'
import { features } from '../config.js'
import {
  ONLINE_GAMES, REPORT_REASONS, cancelQueue, createCode, getRoomFor, joinQueue,
  leaveRoom, reportRival, snapshot, submitMove, waitingByGame,
} from '../arcade/rooms.js'
import { db, must } from '../services/supabase.js'

// Arcade online. El modo consola no pasa por aquí: se juega sin cuenta en el navegador.
export const arcadeRouter = Router()

arcadeRouter.use((_req, res, next) => {
  if (!features.live) return res.status(503).json({ error: 'arcade_online_unavailable', message: 'El arcade online no está disponible ahora.' })
  next()
})

const game = z.enum(ONLINE_GAMES)
const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5}$/)

arcadeRouter.get('/lobby', (_req, res) => res.json({ waiting: waitingByGame() }))

// Código para jugar con una amiga: se lo pasas en persona o por tu grupo del cole.
arcadeRouter.post('/code', (req, res) => {
  const body = z.object({ game }).safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  res.json({ code: createCode(body.data.game, req.user.id) })
})

const queueBody = z.object({ game, code: code.optional(), ticket: z.uuid().optional() })

// Buscar rival (o esperar a la amiga del código). Responde al emparejar o a los 25 s.
arcadeRouter.post('/queue', async (req, res) => {
  const body = queueBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const profile = must(await db.from('profiles').select('username, heroine_id').eq('id', req.user.id).single())

  let closed = false
  res.on('close', () => { if (!res.writableEnded) { closed = true; cancelQueue(req.user.id, body.data.ticket) } })

  const result = await joinQueue(body.data.game, {
    userId: req.user.id,
    username: profile.username,
    heroineId: profile.heroine_id ?? null,
    ticket: body.data.ticket ?? null,
  }, body.data.code ?? null)
  if (closed) return
  if (result.error) return res.status(404).json({ error: result.error, message: 'Ese código no existe o ya venció. Pídele a tu amiga uno nuevo.' })
  if (!result.matched) return res.json(result)
  res.json({ matched: true, room: snapshot(getRoomFor(result.roomId, req.user.id), req.user.id) })
})

arcadeRouter.post('/cancel', (req, res) => {
  const body = z.object({ ticket: z.uuid().optional() }).safeParse(req.body ?? {})
  cancelQueue(req.user.id, body.success ? body.data.ticket : undefined)
  res.json({ ok: true })
})

arcadeRouter.get('/:id', (req, res) => {
  const room = getRoomFor(req.params.id, req.user.id)
  if (!room) return res.status(404).json({ error: 'room_not_found' })
  res.json(snapshot(room, req.user.id))
})

// Jugada: { cell } michi · { col } conecta4 · { k, r, c } timbiriche · { score } cristales
const moveBody = z.object({
  move: z.object({
    cell: z.number().int().optional(),
    col: z.number().int().optional(),
    k: z.enum(['h', 'v']).optional(),
    r: z.number().int().optional(),
    c: z.number().int().optional(),
    score: z.number().int().optional(),
  }),
})

arcadeRouter.post('/:id/move', (req, res) => {
  const body = moveBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const room = getRoomFor(req.params.id, req.user.id)
  if (!room) return res.status(404).json({ error: 'room_not_found' })
  const r = submitMove(room, req.user.id, body.data.move)
  if (!r.ok) return res.status(409).json({ error: r.error })
  res.json({ ok: true })
})

arcadeRouter.post('/:id/leave', (req, res) => {
  const room = getRoomFor(req.params.id, req.user.id)
  if (room) leaveRoom(room, req.user.id)
  res.json({ ok: true })
})

arcadeRouter.post('/:id/report', (req, res) => {
  const body = z.object({ reason: z.enum(REPORT_REASONS) }).safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const room = getRoomFor(req.params.id, req.user.id)
  if (!room) return res.status(404).json({ error: 'room_not_found' })
  reportRival(room, req.user.id, body.data.reason)
  res.json({ ok: true })
})
