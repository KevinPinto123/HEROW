import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { config, features } from './config.js'
import { optionalUser, requireUser } from './middleware/auth.js'
import { arcadeRouter } from './routes/arcade.js'
import { authRouter } from './routes/auth.js'
import { combatRouter } from './routes/combat.js'
import { conectaPublicRouter, conectaRouter } from './routes/conecta.js'
import { meRouter } from './routes/me.js'
import { missionsRouter } from './routes/missions.js'
import { leadsRouter } from './routes/leads.js'
import { opportunitiesRouter } from './routes/opportunities.js'
import { liveRouter } from './routes/live.js'
import { mentorsRouter } from './routes/mentors.js'
import { offlinePublicRouter, offlineRouter } from './routes/offline.js'
import { attachRealtime, WS_PATH } from './realtime/hub.js'
import { recommendationsRouter } from './routes/recommendations.js'
import { yesseniaRouter } from './routes/yessenia.js'
import { scheduleOpportunityAgent } from './services/opportunities.js'
import { seedQuestions } from './services/questions.js'
import { db, must, usernameToEmail } from './services/supabase.js'

const app = express()

app.disable('x-powered-by')
// Railway (y casi cualquier hosting) pone un proxy delante: confiar en 1 salto
// para que el límite de peticiones use la IP real de cada jugadora.
app.set('trust proxy', 1)
app.use(express.json({ limit: '50kb' }))
app.use(cors({ origin: config.corsOrigins }))

let dbReady = false
let conectaReady = false
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, features: { ...features, dbReady, conectaReady } })
})

const limit = (max) => rateLimit({ windowMs: 60_000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false })

app.use('/api/auth', limit(10), authRouter)
app.use('/api/me', limit(60), requireUser, meRouter)
app.use('/api/combat', limit(60), requireUser, combatRouter)
app.use('/api/missions', limit(10), requireUser, missionsRouter)
app.use('/api/opportunities', limit(60), requireUser, opportunitiesRouter)
app.use('/api/live', limit(120), requireUser, liveRouter)
app.use('/api/arcade', limit(240), requireUser, arcadeRouter)
app.use('/api/yessenia', limit(20), optionalUser, yesseniaRouter)
app.use('/api/recommendations', limit(10), recommendationsRouter)
app.use('/api/leads', limit(30), leadsRouter)
// Red de mentoras (HEROW Conecta)
app.use('/api/conecta/public', limit(60), conectaPublicRouter)
app.use('/api/conecta', limit(60), requireUser, conectaRouter)
app.use('/api/mentors', limit(30), mentorsRouter)
// Modo sin internet
app.use('/api/offline', limit(30), offlinePublicRouter) // /pack y /kit: públicos
app.use('/api/offline', limit(30), requireUser, offlineRouter)

// Solo desarrollo: sumar puntos para probar subidas de nivel sin jugar 50 rondas.
if (config.devTools) {
  app.post('/api/dev/points', requireUser, async (req, res) => {
    const amount = Math.min(500, Math.max(1, Number(req.body?.amount) || 50))
    const p = must(await db.from('profiles').select('points').eq('id', req.user.id).single())
    must(await db.from('profiles').update({ points: p.points + amount }).eq('id', req.user.id))
    res.json({ ok: true, points: p.points + amount })
  })

  // Entrar a las cuentas de demo sin contraseña (enlace de un solo uso). Solo desarrollo.
  app.post('/api/dev/demo-login', async (req, res) => {
    const account = req.body?.account === 'herow_demo2' ? 'herow_demo2' : 'herow_demo'
    const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email: usernameToEmail(account) })
    if (error) return res.status(404).json({ error: 'demo_not_found', message: 'Crea las cuentas con npm run demo:seed' })
    res.json({ tokenHash: data.properties.hashed_token })
  })
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }))

// Express 5 envía aquí los errores de rutas async.
app.use((err, _req, res, _next) => {
  console.error('[error]', err)
  res.status(500).json({ error: 'internal_error' })
})

const server = app.listen(config.port, async () => {
  const on = (f) => (f ? '✅' : '⚪')
  console.log(`🌀 HEROW API en http://localhost:${config.port}`)
  console.log(
    `   Gemini ${on(features.gemini)}  OpenAI ${on(features.openai)}  Moderación ${on(features.moderation)}  ` +
      `En vivo ${on(features.live)} (ws ${WS_PATH})  Supabase ${on(features.supabase)}`,
  )

  if (!db) return
  try {
    const n = await seedQuestions()
    dbReady = true
    console.log(`   Base de datos lista · ${n} preguntas semilla`)
    scheduleOpportunityAgent(config.scrapeCacheMs)
    // Consulta normal (no head): una consulta head no reporta error si la tabla no existe.
    const probe = await db.from('mentors').select('id').limit(1)
    conectaReady = !probe.error
    console.log(conectaReady
      ? '   Red de mentoras y modo sin internet listos'
      : '   ⚠️  Red de mentoras apagada: vuelve a ejecutar supabase/schema.sql en Supabase → SQL Editor.')
  } catch (err) {
    console.error(`   ❌ Base de datos no lista: ${err.message}`)
    console.error('      Ejecuta supabase/schema.sql en Supabase → SQL Editor.')
  }
})

// Tiempo real (HEROW Live) en el mismo puerto: Railway acepta WebSocket sin configurar nada.
attachRealtime(server)
