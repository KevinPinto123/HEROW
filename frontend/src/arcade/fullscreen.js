import { useEffect, useState } from 'react'

// Pantalla completa del navegador. Debe pedirse dentro de un clic (el navegador lo exige).
// Si no está disponible (p. ej. iPhone), el juego igual ocupa toda la ventana con CSS.

export const fullscreenSupported = () => typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen)

export function enterFullscreen({ landscape = false } = {}) {
  const el = document.documentElement
  if (!el.requestFullscreen || document.fullscreenElement) return
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => {
      // En celulares, los juegos anchos se ven mejor acostados (si el equipo lo permite).
      if (landscape) screen.orientation?.lock?.('landscape').catch(() => {})
    })
    .catch(() => {})
}

export function exitFullscreen() {
  try { screen.orientation?.unlock?.() } catch { /* no disponible */ }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

export function toggleFullscreen() {
  if (document.fullscreenElement) exitFullscreen()
  else enterFullscreen()
}

/** true mientras el navegador está en pantalla completa. */
export function useIsFullscreen() {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement))
  useEffect(() => {
    const sync = () => setOn(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  return on
}
