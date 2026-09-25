import { Router } from 'express'
import { z } from 'zod'
import { features } from '../config.js'
import { HEROINES } from '../data/game.js'
import { YESSENIA_SYSTEM_PROMPT } from '../data/yessenia-prompt.js'
import { aiAvailable, generate } from '../services/ai.js'
import { moderate } from '../services/moderation.js'
import { recommendationsFor } from '../services/opportunities.js'
import { getPlayerState } from '../services/progress.js'

// Contexto de la jugadora con sesión: así YessenIA recomienda según su desempeño real.
async function playerContext(userId) {
  const state = await getPlayerState(userId, { unlock: false })
  if (!state.profile) return ''
  const recs = await recommendationsFor(userId, state)
  const p = state.profile
  const skills = state.skills
    .filter(s => s.answered)
    .map(s => `${s.name} ${s.accuracy}% (${s.answered} rondas)`)
    .join(', ') || 'aún no juega'
  const opps = [...recs.recommended, ...recs.interested].slice(0, 5)
    .map(o => `- ${o.title} [${o.type}, ${o.cost}] ${o.url} (${o.reason})`)
  const lines = [
    '',
    'DATOS DE LA JUGADORA (no los repitas todos, úsalos para personalizar):',
    `Usuaria: ${p.username}. Nivel ${p.level} (${p.levelName}), ${p.points} puntos. Heroína: ${HEROINES[p.heroineId]?.name ?? 'sin elegir'}.`,
    `Desempeño: ${skills}.`,
    state.next ? `Para el nivel ${state.next.targetLevel} necesita ${state.next.pointsNeeded} puntos y la misión "${state.next.mission.title}".` : 'Está en el nivel máximo.',
    'OPORTUNIDADES VERIFICADAS QUE PUEDES RECOMENDAR (con su enlace):',
    ...(opps.length ? opps : ['- Ninguna todavía']),
  ]
  return lines.join('\n')
}

export const yesseniaRouter = Router()

const SAFE_REPLY =
  'Prefiero que hablemos de tu aventura STEM 💜 ¿Quieres saber de los portales, las heroínas o cómo vencer al NoPuedo?'

const chatBody = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(800) }))
    .min(1)
    .max(20),
})

yesseniaRouter.post('/chat', async (req, res) => {
  const body = chatBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: 'invalid_body', issues: body.error.issues })

  // Sin moderación no hay IA abierta: el frontend usa sus respuestas guionadas.
  if (!features.moderation || !aiAvailable()) {
    return res.status(503).json({ error: 'ai_not_configured' })
  }

  const { messages } = body.data
  const last = messages.at(-1)
  if (last.role !== 'user') return res.status(400).json({ error: 'last_message_must_be_user' })

  const input = await moderate(last.content)
  if (!input.allowed) return res.json({ reply: SAFE_REPLY, moderated: true })

  const context = req.user ? await playerContext(req.user.id).catch(() => '') : ''
  const { text, provider } = await generate({ system: YESSENIA_SYSTEM_PROMPT + context, messages })

  const output = await moderate(text)
  if (!output.allowed) return res.json({ reply: SAFE_REPLY, moderated: true })

  res.json({ reply: text, provider })
})
