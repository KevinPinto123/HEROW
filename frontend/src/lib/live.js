// Constantes compartidas del modo en vivo.
export const LIVE_ENABLED = Boolean(import.meta.env.VITE_PORTAL_PUBLISHABLE_KEY)
export const SERVER_SENDER = 'herow-server'
export const LOBBY_CHANNEL = 'herow-lobby'
// Única forma de comunicarse entre jugadoras: reacciones de esta lista (sin chat libre).
export const REACTIONS = ['👏', '💜', '🔥', '😮', '💪', '🤝']
