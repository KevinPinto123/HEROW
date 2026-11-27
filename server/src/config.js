import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ quiet: true })

// Cadena vacía en .env cuenta como "no configurado".
const optional = z.string().trim().optional().transform(v => v || undefined)

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_URL: z.url().default('http://localhost:3001'),

  AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  OPENAI_API_KEY: optional,
  OPENAI_MODEL: z.string().default('gpt-5.4-mini'),
  OPENAI_MODERATION_MODEL: z.string().default('omni-moderation-latest'),

  SCRAPE_CACHE_HOURS: z.coerce.number().positive().default(12),

  // Token para descargar los leads en CSV (GET /api/leads/export). Vacío = ruta apagada.
  LEADS_ADMIN_TOKEN: optional,
  // Token del panel del equipo (aprobar mentoras, eventos y respuestas). Vacío = usa LEADS_ADMIN_TOKEN.
  ADMIN_TOKEN: optional,

  SUPABASE_URL: optional,
  SUPABASE_PUBLISHABLE_KEY: optional,
  SUPABASE_SECRET_KEY: optional,

  // Atajos de prueba (sumar puntos). NUNCA activar en producción.
  DEV_TOOLS: z.enum(['true', 'false']).default('false'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ server/.env tiene valores inválidos:')
  for (const issue of parsed.error.issues) console.error(`   - ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

const env = parsed.data

export const config = {
  port: env.PORT,
  corsOrigins: env.CORS_ORIGIN.split(',').map(s => s.trim()),
  publicUrl: env.PUBLIC_URL.replace(/\/$/, ''),
  ai: {
    provider: env.AI_PROVIDER,
    gemini: { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL },
    openai: { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, moderationModel: env.OPENAI_MODERATION_MODEL },
  },
  scrapeCacheMs: env.SCRAPE_CACHE_HOURS * 60 * 60 * 1000,
  leadsAdminToken: env.LEADS_ADMIN_TOKEN,
  adminToken: env.ADMIN_TOKEN ?? env.LEADS_ADMIN_TOKEN,
  devTools: env.DEV_TOOLS === 'true' && process.env.NODE_ENV !== 'production',
  supabase: {
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    secretKey: env.SUPABASE_SECRET_KEY,
  },
}

// Qué funciones están activas según las claves presentes.
export const features = {
  gemini: Boolean(config.ai.gemini.apiKey),
  openai: Boolean(config.ai.openai.apiKey),
  moderation: Boolean(config.ai.openai.apiKey),
  supabase: Boolean(config.supabase.url && config.supabase.secretKey),
  // Multijugador en vivo (WebSocket propio): solo necesita Supabase para las cuentas.
  live: Boolean(config.supabase.url && config.supabase.secretKey),
  leadsExport: Boolean(config.leadsAdminToken),
  adminPanel: Boolean(config.adminToken),
  devTools: config.devTools,
}
