import { createClient } from '@supabase/supabase-js'
import { config, features } from '../config.js'

const wait = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * fetch con un reintento: a veces Supabase rechaza una consulta con
 * "JWT issued at future" (desfase de reloj entre sus propios servicios).
 * Se reintenta una sola vez y solo en ese caso.
 */
export async function fetchWithClockRetry(url, options, doFetch = fetch) {
  const res = await doFetch(url, options)
  if (res.status !== 401) return res
  const text = await res.clone().text().catch(() => '')
  if (!/issued at future/i.test(text)) return res
  await wait(300)
  return doFetch(url, options)
}

// Cliente con la clave secreta: salta RLS. Solo existe en el servidor.
export const db = features.supabase
  ? createClient(config.supabase.url, config.supabase.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, options) => fetchWithClockRetry(url, options) },
    })
  : null

/** Lanza si la consulta falló; devuelve data. */
export function must({ data, error }) {
  if (error) throw new Error(`[db] ${error.message}`)
  return data
}

// Las cuentas usan un email interno: las chicas NO dan su email real.
export const PLAYER_EMAIL_DOMAIN = 'players.herow.app'
export const usernameToEmail = (username) => `${username}@${PLAYER_EMAIL_DOMAIN}`
