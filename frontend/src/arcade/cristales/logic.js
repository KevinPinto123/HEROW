// ───────── Cristales STEM: lógica de "combina 3" (sin React) ─────────
import { CRISTALES } from '../rules'

export const N = CRISTALES.SIZE
export const GEMS = [
  // Cada cristal tiene forma y color propios (se distinguen aunque no se vean bien los colores).
  { sprite: 'gemDiamond', name: 'Cristal morado' },
  { sprite: 'gemHeart', name: 'Cristal rosa' },
  { sprite: 'gemStar', name: 'Cristal dorado' },
  { sprite: 'gemSquare', name: 'Cristal cian' },
  { sprite: 'gemCircle', name: 'Cristal naranja' },
  { sprite: 'gemTriangle', name: 'Cristal verde' },
]

let nextId = 1
const tile = (k) => ({ id: nextId++, k })

/** Tablero inicial sin combinaciones hechas y con al menos una jugada posible. */
export function makeBoard(rand) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const g = []
    for (let r = 0; r < N; r++) {
      g.push([])
      for (let c = 0; c < N; c++) {
        let k
        do {
          k = Math.floor(rand() * CRISTALES.KINDS)
        } while (
          (c >= 2 && g[r][c - 1].k === k && g[r][c - 2].k === k) ||
          (r >= 2 && g[r - 1][c].k === k && g[r - 2][c].k === k)
        )
        g[r].push(tile(k))
      }
    }
    if (hasMoves(g)) return g
  }
  throw new Error('No se pudo crear el tablero')
}

/** Grupos de 3 o más iguales en línea. Devuelve { cells: Set("r,c"), groups: [largo] }. */
export function findMatches(g) {
  const cells = new Set()
  const groups = []
  const scan = (get, outer, inner) => {
    for (let a = 0; a < outer; a++) {
      let run = 1
      for (let b = 1; b <= inner; b++) {
        const same = b < inner && get(a, b) && get(a, b - 1) && get(a, b).k === get(a, b - 1).k
        if (same) run++
        else {
          if (run >= 3) {
            groups.push(run)
            for (let k = b - run; k < b; k++) cells.add(get === getRow ? `${a},${k}` : `${k},${a}`)
          }
          run = 1
        }
      }
    }
  }
  const getRow = (r, c) => g[r][c]
  const getCol = (c, r) => g[r][c]
  scan(getRow, N, N)
  scan(getCol, N, N)
  return { cells, groups }
}

export function swap(g, a, b) {
  const out = g.map(row => [...row])
  ;[out[a.r][a.c], out[b.r][b.c]] = [out[b.r][b.c], out[a.r][a.c]]
  return out
}

export const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1

/** Quita las celdas, deja caer lo de arriba y rellena con nuevos cristales. */
export function collapse(g, cells, rand) {
  const out = Array.from({ length: N }, () => Array(N).fill(null))
  for (let c = 0; c < N; c++) {
    const keep = []
    for (let r = N - 1; r >= 0; r--) if (!cells.has(`${r},${c}`)) keep.push(g[r][c])
    let r = N - 1
    for (const t of keep) out[r--][c] = t
    const fresh = r + 1 // cuántos nuevos entran en esta columna
    for (; r >= 0; r--) out[r][c] = { ...tile(Math.floor(rand() * CRISTALES.KINDS)), drop: fresh }
  }
  return out
}

export function hasMoves(g) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr
        const c2 = c + dc
        if (r2 >= N || c2 >= N) continue
        if (findMatches(swap(g, { r, c }, { r: r2, c: c2 })).cells.size) return true
      }
    }
  }
  return false
}

/** Puntos de una limpieza: 10 por cristal × combo, más premio por grupos de 4 y 5. */
export function pointsFor({ cells, groups }, combo) {
  const bonus = groups.reduce((s, len) => s + (len >= 5 ? 100 : len === 4 ? 40 : 0), 0)
  return (cells.size * 10 + bonus) * combo
}
