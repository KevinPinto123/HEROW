import { createClient } from '@supabase/supabase-js'
import { config, features } from '../config.js'

// Cliente con la clave secreta: salta RLS. Solo existe en el servidor.
export const db = features.supabase
  ? createClient(config.supabase.url, config.supabase.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
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
