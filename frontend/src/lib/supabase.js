import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Solo se usa para la sesión (login). Los datos se leen y escriben vía el backend.
export const supabase = url && key ? createClient(url, key) : null

export const PLAYER_EMAIL_DOMAIN = 'players.herow.app'
export const usernameToEmail = (username) => `${username.trim().toLowerCase()}@${PLAYER_EMAIL_DOMAIN}`
