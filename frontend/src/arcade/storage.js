// Récords del arcade en este equipo (no salen del navegador).
const key = (game) => `herow.arcade.${game}.best`

export function readBest(game) {
  try {
    const v = Number(localStorage.getItem(key(game)))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

/** Guarda si supera el récord (mayor es mejor). Devuelve el récord vigente. */
export function saveBest(game, value) {
  const best = readBest(game)
  if (value <= best) return best
  try { localStorage.setItem(key(game), String(value)) } catch { /* sin almacenamiento */ }
  return value
}
