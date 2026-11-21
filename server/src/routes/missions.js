import { Router } from 'express'
import { z } from 'zod'
import { MissionError, submitBuild, submitReal } from '../services/missions.js'
import { advanceLevel, getPlayerState } from '../services/progress.js'

export const missionsRouter = Router()

async function currentNext(req, res) {
  const state = await getPlayerState(req.user.id, { unlock: false })
  if (!state.next) {
    res.status(409).json({ error: 'max_level', message: 'Ya estás en el nivel máximo.' })
    return null
  }
  return state.next
}

function sendMissionError(res, err) {
  if (err instanceof MissionError) return res.status(400).json({ error: err.code, message: err.message })
  throw err
}

const buildBody = z.object({ fields: z.record(z.string(), z.string().max(2000)) })

// Paso 1: enviar el trabajo para que la IA lo revise.
missionsRouter.post('/build', async (req, res) => {
  const body = buildBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const next = await currentNext(req, res)
  if (!next) return
  try {
    const submission = await submitBuild(req.user.id, next, body.data.fields)
    res.json({ submission, state: await getPlayerState(req.user.id) })
  } catch (err) {
    sendMissionError(res, err)
  }
})

const realBody = z.object({ url: z.string().max(500) })

// Paso 2: el enlace de lo que publicó en el mundo real.
missionsRouter.post('/real', async (req, res) => {
  const body = realBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body' })
  const next = await currentNext(req, res)
  if (!next) return
  try {
    const submission = await submitReal(req.user.id, next, body.data.url)
    res.json({ submission, state: await getPlayerState(req.user.id) })
  } catch (err) {
    sendMissionError(res, err)
  }
})

// Subir de nivel (después de vencer al NoPuedo).
missionsRouter.post('/advance', async (req, res) => {
  const { ok, state } = await advanceLevel(req.user.id)
  if (!ok) return res.status(409).json({ error: 'not_ready', message: 'Aún te falta completar requisitos para subir de nivel.', state })
  res.json({ state })
})
