// ───────── Circuito: lógica (sin React) ─────────
// Cada pieza tiene conexiones hacia N(1) E(2) S(4) O(8). Se genera un árbol de
// cables que sale de la batería (siempre tiene solución) y luego se giran las
// piezas al azar. Gana quien deja todo conectado sin cables sueltos: así se
// encienden todos los focos.

export const N_ = 1
export const E_ = 2
export const S_ = 4
export const W_ = 8
const DIRS = [[N_, -1, 0, S_], [E_, 0, 1, W_], [S_, 1, 0, N_], [W_, 0, -1, E_]]

/** Gira una pieza 90° en sentido horario. */
export const rotate = (m) => ((m << 1) & 15) | (m >> 3)

export const degree = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1)

/** Focos del circuito: piezas con una sola conexión que no son la batería. */
export function bulbCount(puzzle) {
  let n = 0
  puzzle.grid.forEach((row, r) => row.forEach((m, c) => {
    if (degree(m) === 1 && !(r === puzzle.source.r && c === puzzle.source.c)) n++
  }))
  return n
}

/** Crea un circuito resuelto con varios focos (al menos size − 1). */
export function generate(size, rand = Math.random) {
  let best = null
  for (let attempt = 0; attempt < 40; attempt++) {
    const p = generateTree(size, rand)
    if (!best || bulbCount(p) > bulbCount(best)) best = p
    if (bulbCount(p) >= size - 1) return p
  }
  return best
}

function generateTree(size, rand) {
  const grid = Array.from({ length: size }, () => Array(size).fill(0))
  const seen = Array.from({ length: size }, () => Array(size).fill(false))
  const source = { r: Math.floor(rand() * size), c: Math.floor(rand() * size) }
  const stack = [source]
  seen[source.r][source.c] = true
  while (stack.length) {
    const cur = stack[stack.length - 1]
    const options = DIRS.filter(([, dr, dc]) => {
      const r = cur.r + dr
      const c = cur.c + dc
      return r >= 0 && c >= 0 && r < size && c < size && !seen[r][c]
    })
    if (!options.length) {
      stack.pop()
      continue
    }
    const [bit, dr, dc, back] = options[Math.floor(rand() * options.length)]
    const next = { r: cur.r + dr, c: cur.c + dc }
    grid[cur.r][cur.c] |= bit
    grid[next.r][next.c] |= back
    seen[next.r][next.c] = true
    stack.push(next)
  }
  return { size, grid, source }
}

/** Gira cada pieza al azar (sin dejarlo resuelto). Devuelve una copia. */
export function scramble(puzzle, rand = Math.random) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const grid = puzzle.grid.map(row => row.map(m => {
      let x = m
      const turns = Math.floor(rand() * 4)
      for (let i = 0; i < turns; i++) x = rotate(x)
      return x
    }))
    const out = { ...puzzle, grid }
    if (!isSolved(out)) return out
  }
  // Si salió resuelto 20 veces (tablero diminuto), gira una pieza que cambie.
  const grid = puzzle.grid.map(row => [...row])
  outer: for (const row of grid) {
    for (let c = 0; c < row.length; c++) {
      if (rotate(row[c]) !== row[c]) { row[c] = rotate(row[c]); break outer }
    }
  }
  return { ...puzzle, grid }
}

/** Piezas con corriente: las conectadas a la batería por cables que coinciden. */
export function powered(puzzle) {
  const { size, grid, source } = puzzle
  const on = Array.from({ length: size }, () => Array(size).fill(false))
  const queue = [source]
  on[source.r][source.c] = true
  while (queue.length) {
    const cur = queue.shift()
    for (const [bit, dr, dc, back] of DIRS) {
      if (!(grid[cur.r][cur.c] & bit)) continue
      const r = cur.r + dr
      const c = cur.c + dc
      if (r < 0 || c < 0 || r >= size || c >= size || on[r][c] || !(grid[r][c] & back)) continue
      on[r][c] = true
      queue.push({ r, c })
    }
  }
  return on
}

/** Resuelto: ningún cable apunta al vacío ni a una pieza que no lo recibe, y todo tiene corriente. */
export function isSolved(puzzle) {
  const { size, grid } = puzzle
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [bit, dr, dc, back] of DIRS) {
        if (!(grid[r][c] & bit)) continue
        const rr = r + dr
        const cc = c + dc
        if (rr < 0 || cc < 0 || rr >= size || cc >= size || !(grid[rr][cc] & back)) return false
      }
    }
  }
  return powered(puzzle).every(row => row.every(Boolean))
}
