import { createRemoteJWKSet, jwtVerify } from 'jose'
import { config } from '../config.js'
import { db } from '../services/supabase.js'

// Las sesiones de Supabase se verifican localmente con sus claves públicas (JWKS):
// sin ir a la red en cada petición. Si el proyecto no publica JWKS, se usa auth.getUser.
const issuer = config.supabase.url ? `${config.supabase.url.replace(/\/$/, '')}/auth/v1` : null
const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), { cacheMaxAge: 10 * 60_000 }) : null

async function userFromRequest(req) {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token || !db) return null
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: 'authenticated' })
    return payload.sub ? { id: payload.sub } : null
  } catch (err) {
    // Clave simétrica (proyectos antiguos) o JWKS no disponible: verificación remota.
    if (err.code === 'ERR_JWKS_NO_MATCHING_KEY' || err.code === 'ERR_JOSE_NOT_SUPPORTED' || err.code === 'ERR_JWKS_TIMEOUT') {
      const { data, error } = await db.auth.getUser(token)
      return error ? null : { id: data.user.id }
    }
    return null
  }
}

/** Exige sesión válida de Supabase. Deja la usuaria en req.user ({ id }). */
export async function requireUser(req, res, next) {
  if (!db) return res.status(503).json({ error: 'db_not_configured' })
  const user = await userFromRequest(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  req.user = user
  next()
}

/** Igual que requireUser, pero sin sesión también deja pasar (req.user = null). */
export async function optionalUser(req, _res, next) {
  req.user = await userFromRequest(req).catch(() => null)
  next()
}
