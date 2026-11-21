import { supabase } from './supabase'

// Constantes compartidas del modo en vivo (HEROW Live, WebSocket propio del backend).
// Se puede apagar con VITE_LIVE_ENABLED=false en el frontend.
export const LIVE_ENABLED = Boolean(supabase) && import.meta.env.VITE_LIVE_ENABLED !== 'false'
export const SERVER_SENDER = 'herow-server'
export const LOBBY_CHANNEL = 'lobby'
// Única forma de comunicarse entre jugadoras: reacciones de esta lista (sin chat libre).
export const REACTIONS = ['👏', '💜', '🔥', '😮', '💪', '🤝']
