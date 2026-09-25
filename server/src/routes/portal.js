import { Router } from 'express'
import { features } from '../config.js'
import { getJwks, signPlayerToken } from '../services/portal-auth.js'
import { db, must } from '../services/supabase.js'

export const jwksRouter = Router()

jwksRouter.get('/.well-known/jwks.json', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300').json(await getJwks())
})

export const portalRouter = Router()

// Token de Portal para la jugadora con sesión. Su id en Portal = su id de cuenta,
// y el nombre visible = su nombre de usuaria (nunca datos personales).
portalRouter.post('/token', async (req, res) => {
  if (!features.portalSecret && !features.portalAuth) {
    return res.status(503).json({ error: 'portal_not_configured', hint: 'Configura PORTAL_SECRET_KEY en server/.env' })
  }
  const profile = must(await db.from('profiles').select('username').eq('id', req.user.id).single())
  res.json({ token: await signPlayerToken({ playerId: req.user.id, name: profile.username }) })
})
