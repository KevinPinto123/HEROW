import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { HEROINES, PORTAL_IDS, ROUND_POINTS } from '../data/game.js'
import { getPlayerState } from '../services/progress.js'
import { pickQuestion } from '../services/questions.js'
import { db, must } from '../services/supabase.js'

export const combatRouter = Router()

const TIME_LIMIT_MS = 15_000
const GRACE_MS = 3_000 // margen por la latencia de red
const pending = new Map() // roundId -> ronda en curso (solo en memoria, expira sola)

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Rival IA: acierta más en dificultades bajas y responde en 2.5 a 9 s.
function rivalPlan(difficulty, excludeId) {
  const ids = Object.keys(HEROINES).filter(id => id !== excludeId)
  const id = ids[Math.floor(Math.random() * ids.length)]
  return {
    id,
    name: HEROINES[id].name,
    portal: HEROINES[id].portal,
    time: Math.round(2500 + Math.random() * 6500),
    correct: Math.random() < [0, 0.7, 0.6, 0.5][difficulty],
  }
}

const startBody = z.object({ portal: z.enum(PORTAL_IDS) })

combatRouter.post('/start', async (req, res) => {
  const body = startBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const { portal } = body.data
  const userId = req.user.id

  const [profile, stat] = await Promise.all([
    db.from('profiles').select('heroine_id').eq('id', userId).single().then(must),
    db.from('skill_stats').select('*').eq('user_id', userId).eq('portal_id', portal).maybeSingle().then(must),
  ])
  const question = await pickQuestion(userId, portal, stat)
  if (!question) return res.status(503).json({ error: 'no_questions' })

  // Barajamos y guardamos en el servidor cuál es la correcta (el navegador no lo sabe).
  const order = shuffle(question.options.map((_, i) => i))
  const rival = rivalPlan(question.difficulty, profile.heroine_id)
  const roundId = randomUUID()
  pending.set(roundId, {
    userId,
    portal,
    question,
    correctIndex: order.indexOf(question.answer),
    rival,
    startedAt: Date.now(),
  })
  setTimeout(() => pending.delete(roundId), TIME_LIMIT_MS + 60_000).unref()

  res.json({
    roundId,
    timeLimitMs: TIME_LIMIT_MS,
    question: {
      type: question.type,
      difficulty: question.difficulty,
      text: question.text,
      options: order.map(i => question.options[i]),
    },
    rival: { id: rival.id, name: rival.name, portal: rival.portal, answerAfterMs: rival.time },
  })
})

const answerBody = z.object({
  roundId: z.uuid(),
  choice: z.number().int().min(0).max(5).nullable(), // null = se acabó el tiempo
})

combatRouter.post('/answer', async (req, res) => {
  const body = answerBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const round = pending.get(body.data.roundId)
  if (!round || round.userId !== req.user.id) return res.status(404).json({ error: 'round_not_found' })
  pending.delete(body.data.roundId) // cada ronda se responde una sola vez

  const elapsed = Date.now() - round.startedAt
  const inTime = elapsed <= TIME_LIMIT_MS + GRACE_MS
  const playerCorrect = inTime && body.data.choice === round.correctIndex
  const rivalCorrect = round.rival.correct
  const playerMs = Math.min(elapsed, TIME_LIMIT_MS)

  let outcome
  if (playerCorrect && (!rivalCorrect || playerMs <= round.rival.time)) outcome = 'win'
  else if (!playerCorrect && !rivalCorrect) outcome = 'tie'
  else outcome = 'lose'
  const points = ROUND_POINTS[outcome]

  must(await db.rpc('apply_round', {
    p_user: req.user.id,
    p_portal: round.portal,
    p_correct: playerCorrect,
    p_win: outcome === 'win',
    p_ms: playerMs,
    p_points: points,
  }))
  must(await db.from('rounds').insert({
    user_id: req.user.id,
    portal_id: round.portal,
    question_id: round.question.id,
    difficulty: round.question.difficulty,
    correct: playerCorrect,
    ms: playerMs,
    outcome,
    points,
    rival_heroine: round.rival.id,
    mode: 'ai',
  }))

  const state = await getPlayerState(req.user.id)
  res.json({
    outcome,
    points,
    correctIndex: round.correctIndex,
    playerCorrect,
    rivalCorrect,
    timedOut: body.data.choice === null || !inTime,
    explain: round.question.explain,
    difficulty: round.question.difficulty,
    newlyUnlocked: state.newlyUnlocked,
    profile: state.profile,
    next: state.next && {
      targetLevel: state.next.targetLevel,
      pointsNeeded: state.next.pointsNeeded,
      pointsDone: state.next.pointsDone,
      ready: state.next.ready,
    },
  })
})
