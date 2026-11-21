// ───────── Reglas del Arcade HEROW ─────────
// ARCHIVO COMPARTIDO: existe idéntico en server/src/arcade/rules.js y
// frontend/src/arcade/rules.js. El servidor lo usa como árbitro en el modo online;
// el navegador, para el modo consola. Si cambias uno, copia el otro
// (la prueba `npm run test:arcade --prefix server` verifica que sean iguales).
//
// Cada juego por turnos expone:
//   init()                 → estado inicial
//   move(state, player, m) → { ok: true, state } | { ok: false, error }
// Estado común: { turn: 0|1, winner: null|0|1, draw: boolean, over: boolean, ... }
// Los estados nunca se modifican: move() devuelve uno nuevo.

const clone = (v) => JSON.parse(JSON.stringify(v))

// ───────── Michi (3 en raya) ─────────
const MICHI_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

export function michiWinner(board) {
  for (const [a, b, c] of MICHI_LINES) {
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) return { player: board[a], line: [a, b, c] }
  }
  return null
}

export const michi = {
  id: 'michi',
  init: () => ({ board: Array(9).fill(null), turn: 0, winner: null, draw: false, over: false, line: null, last: null }),
  move(state, player, m) {
    if (state.over) return { ok: false, error: 'game_over' }
    if (player !== state.turn) return { ok: false, error: 'not_your_turn' }
    const i = m?.cell
    if (!Number.isInteger(i) || i < 0 || i > 8) return { ok: false, error: 'invalid_move' }
    if (state.board[i] !== null) return { ok: false, error: 'cell_taken' }
    const s = clone(state)
    s.board[i] = player
    s.last = i
    const w = michiWinner(s.board)
    if (w) Object.assign(s, { winner: w.player, line: w.line, over: true })
    else if (s.board.every(c => c !== null)) Object.assign(s, { draw: true, over: true })
    else s.turn = 1 - player
    return { ok: true, state: s }
  },
}

// ───────── Conecta 4 ─────────
export const C4_ROWS = 6
export const C4_COLS = 7

export function c4Winner(board) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const p = board[r][c]
      if (p === null) continue
      for (const [dr, dc] of dirs) {
        const line = [[r, c]]
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k
          const cc = c + dc * k
          if (rr < 0 || rr >= C4_ROWS || cc < 0 || cc >= C4_COLS || board[rr][cc] !== p) break
          line.push([rr, cc])
        }
        if (line.length === 4) return { player: p, line }
      }
    }
  }
  return null
}

/** Fila donde caería una ficha en esa columna (-1 si está llena). Fila 0 = arriba. */
export function c4DropRow(board, col) {
  for (let r = C4_ROWS - 1; r >= 0; r--) if (board[r][col] === null) return r
  return -1
}

export const conecta4 = {
  id: 'conecta4',
  init: () => ({
    board: Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(null)),
    turn: 0, winner: null, draw: false, over: false, line: null, last: null,
  }),
  move(state, player, m) {
    if (state.over) return { ok: false, error: 'game_over' }
    if (player !== state.turn) return { ok: false, error: 'not_your_turn' }
    const col = m?.col
    if (!Number.isInteger(col) || col < 0 || col >= C4_COLS) return { ok: false, error: 'invalid_move' }
    const row = c4DropRow(state.board, col)
    if (row < 0) return { ok: false, error: 'column_full' }
    const s = clone(state)
    s.board[row][col] = player
    s.last = [row, col]
    const w = c4Winner(s.board)
    if (w) Object.assign(s, { winner: w.player, line: w.line, over: true })
    else if (s.board[0].every(c => c !== null)) Object.assign(s, { draw: true, over: true })
    else s.turn = 1 - player
    return { ok: true, state: s }
  },
}

// ───────── Timbiriche (cerrar cuadritos) ─────────
// Tablero de N×N cuadritos ((N+1)×(N+1) puntos).
// h[r][c]: línea horizontal entre el punto (r,c) y (r,c+1); r ∈ 0..N, c ∈ 0..N-1
// v[r][c]: línea vertical entre el punto (r,c) y (r+1,c);  r ∈ 0..N-1, c ∈ 0..N
// boxes[r][c]: quién cerró el cuadrito (null si sigue abierto).
// Quien cierra al menos un cuadrito vuelve a jugar.
export const TIMBI_SIZE = 4

export function timbiSidesOf(state, r, c) {
  return [state.h[r][c], state.h[r + 1][c], state.v[r][c], state.v[r][c + 1]].filter(x => x !== null).length
}

/** Cuadritos que toca una línea. */
export function timbiBoxesOfLine(n, k, r, c) {
  const out = []
  if (k === 'h') {
    if (r > 0) out.push([r - 1, c])
    if (r < n) out.push([r, c])
  } else {
    if (c > 0) out.push([r, c - 1])
    if (c < n) out.push([r, c])
  }
  return out
}

export function timbiFreeLines(state) {
  const n = state.size
  const out = []
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) if (state.h[r][c] === null) out.push({ k: 'h', r, c })
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) if (state.v[r][c] === null) out.push({ k: 'v', r, c })
  return out
}

export const timbiriche = {
  id: 'timbiriche',
  init: (size = TIMBI_SIZE) => ({
    size,
    h: Array.from({ length: size + 1 }, () => Array(size).fill(null)),
    v: Array.from({ length: size }, () => Array(size + 1).fill(null)),
    boxes: Array.from({ length: size }, () => Array(size).fill(null)),
    scores: [0, 0],
    turn: 0, winner: null, draw: false, over: false, last: null,
  }),
  move(state, player, m) {
    if (state.over) return { ok: false, error: 'game_over' }
    if (player !== state.turn) return { ok: false, error: 'not_your_turn' }
    const n = state.size
    const { k, r, c } = m ?? {}
    const valid = Number.isInteger(r) && Number.isInteger(c) && (
      (k === 'h' && r >= 0 && r <= n && c >= 0 && c < n) ||
      (k === 'v' && r >= 0 && r < n && c >= 0 && c <= n)
    )
    if (!valid) return { ok: false, error: 'invalid_move' }
    if (state[k][r][c] !== null) return { ok: false, error: 'line_taken' }
    const s = clone(state)
    s[k][r][c] = player
    s.last = { k, r, c }
    let closed = 0
    for (const [br, bc] of timbiBoxesOfLine(n, k, r, c)) {
      if (s.boxes[br][bc] === null && timbiSidesOf(s, br, bc) === 4) {
        s.boxes[br][bc] = player
        s.scores[player]++
        closed++
      }
    }
    if (s.scores[0] + s.scores[1] === n * n) {
      s.over = true
      if (s.scores[0] === s.scores[1]) s.draw = true
      else s.winner = s.scores[0] > s.scores[1] ? 0 : 1
    } else if (!closed) {
      s.turn = 1 - player
    }
    return { ok: true, state: s }
  },
}

export const TURN_GAMES = { michi, conecta4, timbiriche }

// ───────── Cristales (combina 3) ─────────
// Generador pseudoaleatorio con semilla: en el duelo online las dos jugadoras
// reciben el mismo tablero inicial.
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const CRISTALES = {
  SIZE: 8,
  KINDS: 6,
  DURATION_MS: 90_000,
  // Tope de puntos por actualización en el duelo (anti trampas simples).
  MAX_STEP: 10_000,
  MAX_SCORE: 200_000,
}
