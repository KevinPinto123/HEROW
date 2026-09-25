import { SignJWT, exportJWK, importPKCS8 } from 'jose'
import { config, features } from '../config.js'

const ALG = 'RS256'
const TOKEN_TTL = '1h'

let keysPromise

function loadKeys() {
  keysPromise ??= (async () => {
    // extractable: true para poder derivar la clave pública del JWKS.
    const privateKey = await importPKCS8(config.portal.privateKeyPem, ALG, { extractable: true })
    const { d, p, q, dp, dq, qi, ...publicJwk } = await exportJWK(privateKey)
    return { privateKey, publicJwk: { ...publicJwk, kid: config.portal.kid, alg: ALG, use: 'sig' } }
  })()
  return keysPromise
}

/** JWKS público que Portal consulta para verificar los tokens. */
export async function getJwks() {
  if (!features.portalAuth) return { keys: [] }
  const { publicJwk } = await loadKeys()
  return { keys: [publicJwk] }
}

const PORTAL_API = 'https://api.useportal.co'

/** Pide a Portal el token de la jugadora usando la clave secreta (sk_). */
async function mintWithPortal({ playerId, name }) {
  const res = await fetch(`${PORTAL_API}/v1/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.portal.secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: playerId, claims: { name }, ttl: TOKEN_TTL }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Portal /v1/tokens respondió ${res.status}`)
  return (await res.json()).token
}

/**
 * Token de una jugadora. Con PORTAL_SECRET_KEY lo emite Portal (recomendado);
 * si no, se firma aquí y Portal lo verifica con nuestro JWKS.
 */
export async function signPlayerToken({ playerId, name }) {
  if (features.portalSecret) return mintWithPortal({ playerId, name })
  const { privateKey } = await loadKeys()
  return new SignJWT({ name })
    .setProtectedHeader({ alg: ALG, kid: config.portal.kid })
    .setSubject(playerId)
    .setIssuer(config.publicUrl)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(privateKey)
}
