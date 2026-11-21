import OpenAI from 'openai'
import { config, features } from '../config.js'

const client = features.moderation ? new OpenAI({ apiKey: config.ai.openai.apiKey }) : null

/**
 * Revisa un texto con la moderación de OpenAI.
 * Falla cerrado: si no hay clave o la API falla, se trata como no permitido,
 * porque las usuarias son menores de edad.
 */
export async function moderate(text) {
  if (!client) return { allowed: false, reason: 'moderation_unavailable' }
  try {
    const res = await client.moderations.create({ model: config.ai.openai.moderationModel, input: text })
    const result = res.results[0]
    if (!result.flagged) return { allowed: true }
    const categories = Object.entries(result.categories).filter(([, hit]) => hit).map(([name]) => name)
    return { allowed: false, reason: 'flagged', categories }
  } catch (err) {
    console.error('[moderation]', err.message)
    return { allowed: false, reason: 'moderation_error' }
  }
}
