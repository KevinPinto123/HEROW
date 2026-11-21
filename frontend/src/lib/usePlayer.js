import { createContext, useContext } from 'react'

export const PlayerContext = createContext(null)

/** Sesión y estado de la jugadora. Requiere <PlayerProvider>. */
export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer debe usarse dentro de <PlayerProvider>')
  return ctx
}
