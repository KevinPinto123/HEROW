import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { config, features } from '../config.js'

const gemini = features.gemini ? new GoogleGenAI({ apiKey: config.ai.gemini.apiKey }) : null
const openai = features.openai ? new OpenAI({ apiKey: config.ai.openai.apiKey }) : null

async function askGemini({ system, messages }) {
  const response = await gemini.models.generateContent({
    model: config.ai.gemini.model,
    contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    // Respuestas de chat: sin razonamiento (más rápido y no se cortan por límite de tokens).
    config: { systemInstruction: system, temperature: 0.7, maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } },
  })
  if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Respuesta de Gemini cortada (MAX_TOKENS)')
  return response.text
}

async function askOpenAI({ system, messages }) {
  const response = await openai.responses.create({
    model: config.ai.openai.model,
    instructions: system,
    input: messages.map(m => ({ role: m.role, content: m.content })),
    max_output_tokens: 600,
  })
  return response.output_text
}

async function askGeminiJSON({ system, prompt }) {
  const response = await gemini.models.generateContent({
    model: config.ai.gemini.model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // Revisiones y extracción: razonamiento acotado + espacio de sobra para el JSON.
    config: {
      systemInstruction: system,
      temperature: 0.3,
      maxOutputTokens: 6000,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 1024 },
    },
  })
  if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Respuesta de Gemini cortada (MAX_TOKENS)')
  return response.text
}

async function askOpenAIJSON({ system, prompt }) {
  const response = await openai.responses.create({
    model: config.ai.openai.model,
    instructions: system,
    input: prompt,
    max_output_tokens: 2000,
    text: { format: { type: 'json_object' } },
  })
  return response.output_text
}

function parseJSON(text) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(clean)
}

/**
 * Pide una respuesta JSON y la valida con un schema de zod.
 * Si un proveedor falla o devuelve algo inválido, prueba con el otro.
 */
export async function generateJSON({ system, prompt, schema }) {
  const order = config.ai.provider === 'openai' ? ['openai', 'gemini'] : ['gemini', 'openai']
  const askers = { gemini: gemini && askGeminiJSON, openai: openai && askOpenAIJSON }
  let lastError
  for (const name of order) {
    if (!askers[name]) continue
    try {
      // OpenAI exige la palabra "JSON" en el mensaje de entrada para el modo json_object.
      const raw = await askers[name]({ system: `${system}\nResponde SOLO con JSON válido.`, prompt: `${prompt}\n\nDevuelve la respuesta en formato JSON.` })
      const parsed = schema.safeParse(parseJSON(raw))
      if (parsed.success) return parsed.data
      lastError = new Error(`JSON inválido de ${name}: ${parsed.error.issues[0]?.message}`)
    } catch (err) {
      lastError = err
    }
    console.error(`[ai:${name}:json]`, lastError.message)
  }
  throw lastError ?? new Error('No hay proveedor de IA configurado')
}

const providers = {
  gemini: { available: () => Boolean(gemini), ask: askGemini },
  openai: { available: () => Boolean(openai), ask: askOpenAI },
}

export function aiAvailable() {
  return Object.values(providers).some(p => p.available())
}

/**
 * Pide una respuesta al proveedor configurado; si falla, prueba con el otro.
 * messages: [{ role: 'user' | 'assistant', content: string }]
 */
export async function generate({ system, messages }) {
  const order = config.ai.provider === 'openai' ? ['openai', 'gemini'] : ['gemini', 'openai']
  let lastError
  for (const name of order) {
    const provider = providers[name]
    if (!provider.available()) continue
    try {
      const text = await provider.ask({ system, messages })
      if (text?.trim()) return { text: text.trim(), provider: name }
    } catch (err) {
      lastError = err
      console.error(`[ai:${name}]`, err.message)
    }
  }
  throw lastError ?? new Error('No hay proveedor de IA configurado')
}
