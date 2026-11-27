// Modo sin internet: paquete de preguntas, sincronización y kit imprimible.
import { Router } from 'express'
import { z } from 'zod'
import { conectaErrors } from '../services/conecta.js'
import { OFFLINE_RULES, gradeOffline, offlinePack, printableKit, startOfDayPeru } from '../services/offline.js'
import { getPlayerState } from '../services/progress.js'
import { db, must } from '../services/supabase.js'

export const offlineRouter = Router()

const syncBody = z.object({
  answers: z.array(z.object({
    id: z.uuid(),
    questionId: z.string().min(1).max(60),
    choice: z.number().int().min(0).max(5).nullable(),
    ms: z.number().min(0).max(3_600_000).optional().default(0),
    answeredAt: z.string().min(10).max(40),
  })).min(1).max(OFFLINE_RULES.batch),
})

// Sube lo que se respondió sin internet. Idempotente: reenviar el mismo lote no suma dos veces.
offlineRouter.post('/sync', async (req, res) => {
  const body = syncBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', message: body.error.issues[0].message })
  const userId = req.user.id
  const answers = body.data.answers
  const ids = answers.map(a => a.id)

  const [existing, today] = await Promise.all([
    db.from('offline_answers').select('id').eq('user_id', userId).in('id', ids).then(must),
    db.from('offline_answers').select('points').eq('user_id', userId)
      .gte('created_at', startOfDayPeru().toISOString()).then(must),
  ])
  const seen = new Set(existing.map(r => r.id))
  const pointsToday = today.reduce((sum, r) => sum + r.points, 0)
  const fresh = answers.filter(a => !seen.has(a.id))
  const { graded, invalid, capped } = gradeOffline(fresh, { pointsToday })

  // ON CONFLICT DO NOTHING: si otro envío del mismo lote llegó primero, aquí no vuelve.
  const inserted = graded.length
    ? must(await db.from('offline_answers').upsert(graded.map(g => ({
        id: g.id,
        user_id: userId,
        question_id: g.questionId,
        correct: g.correct,
        points: g.points,
        answered_at: g.answeredAt,
      })), { onConflict: 'id', ignoreDuplicates: true }).select('id'))
    : []
  const insertedIds = new Set(inserted.map(r => r.id))
  const applied = graded.filter(g => insertedIds.has(g.id))

  for (const g of applied) {
    must(await db.rpc('apply_round', {
      p_user: userId,
      p_portal: g.portal,
      p_correct: g.correct,
      p_win: false, // sin rival: no cuenta como victoria para desbloquear heroínas
      p_ms: g.ms,
      p_points: g.points,
    }))
  }
  if (applied.length) {
    must(await db.from('rounds').insert(applied.map(g => ({
      user_id: userId,
      portal_id: g.portal,
      question_id: g.questionId,
      difficulty: g.difficulty,
      correct: g.correct,
      ms: Math.min(g.ms, 2_000_000_000),
      outcome: g.correct ? 'win' : 'lose',
      points: g.points,
      rival_heroine: null,
      mode: 'offline',
      created_at: g.answeredAt,
    }))))
  }

  const state = await getPlayerState(userId)
  res.json({
    // Todo lo que el navegador ya puede borrar de su cola (nuevas, repetidas e inválidas).
    processed: ids,
    accepted: applied.length,
    duplicates: answers.length - fresh.length + (graded.length - applied.length),
    invalid: invalid.length,
    correct: applied.filter(g => g.correct).length,
    pointsAwarded: applied.reduce((s, g) => s + g.points, 0),
    capped,
    dailyCap: OFFLINE_RULES.dailyCap,
    state,
  })
})

offlineRouter.use(conectaErrors)

// ───────── Público: no necesita sesión ni base de datos ─────────
export const offlinePublicRouter = Router()

// Paquete para practicar sin conexión (se guarda en el celular). Es el banco semilla:
// el mismo que ya está en el kit imprimible, por eso no exige cuenta.
offlinePublicRouter.get('/pack', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600')
  res.json(offlinePack())
})

// Kit imprimible para docentes en colegios sin internet.
offlinePublicRouter.get('/kit', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600')
  res.json({ portals: printableKit(8) })
})
