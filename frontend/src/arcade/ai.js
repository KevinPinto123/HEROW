// Rivales de la computadora para el modo consola.
// level: 'facil' (se equivoca a veces) | 'dificil' (juega muy bien).
import {
  C4_COLS, C4_ROWS, c4DropRow, conecta4, michiWinner,
  timbiBoxesOfLine, timbiFreeLines, timbiSidesOf, timbiriche,
} from './rules'

const pick = (list) => list[Math.floor(Math.random() * list.length)]

// ───────── Michi: minimax completo (el tablero es pequeño) ─────────
function michiScore(board, me, turn, depth) {
  const w = michiWinner(board)
  if (w) return w.player === me ? 10 - depth : depth - 10
  if (board.every(c => c !== null)) return 0
  let best = turn === me ? -Infinity : Infinity
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue
    board[i] = turn
    const s = michiScore(board, me, 1 - turn, depth + 1)
    board[i] = null
    best = turn === me ? Math.max(best, s) : Math.min(best, s)
  }
  return best
}

export function michiAI(state, me, level = 'dificil') {
  const free = state.board.map((c, i) => (c === null ? i : null)).filter(i => i !== null)
  if (level === 'facil' && Math.random() < 0.45) return { cell: pick(free) }
  let best = -Infinity
  let moves = []
  for (const i of free) {
    const b = [...state.board]
    b[i] = me
    const s = michiScore(b, me, 1 - me, 1)
    if (s > best) { best = s; moves = [i] } else if (s === best) moves.push(i)
  }
  return { cell: pick(moves) }
}

// ───────── Conecta 4: negamax con poda alfa-beta ─────────
function windowScore(cells, me) {
  const mine = cells.filter(c => c === me).length
  const theirs = cells.filter(c => c === 1 - me).length
  const empty = cells.filter(c => c === null).length
  if (mine === 4) return 1000
  if (mine === 3 && empty === 1) return 6
  if (mine === 2 && empty === 2) return 2
  if (theirs === 3 && empty === 1) return -8
  if (theirs === 2 && empty === 2) return -1
  return 0
}

function c4Heuristic(board, me) {
  let score = 0
  for (let r = 0; r < C4_ROWS; r++) if (board[r][3] === me) score += 3 // el centro vale más
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      if (c + 3 < C4_COLS) score += windowScore([0, 1, 2, 3].map(k => board[r][c + k]), me)
      if (r + 3 < C4_ROWS) score += windowScore([0, 1, 2, 3].map(k => board[r + k][c]), me)
      if (r + 3 < C4_ROWS && c + 3 < C4_COLS) score += windowScore([0, 1, 2, 3].map(k => board[r + k][c + k]), me)
      if (r - 3 >= 0 && c + 3 < C4_COLS) score += windowScore([0, 1, 2, 3].map(k => board[r - k][c + k]), me)
    }
  }
  return score
}

const C4_ORDER = [3, 2, 4, 1, 5, 0, 6]

/** Puntaje de una jugada desde el punto de vista de `player` (la que mueve). */
function c4MoveScore(state, player, col, depth, alpha, beta) {
  const next = conecta4.move(state, player, { col }).state
  if (next.over) return next.draw ? 0 : 100000 + depth // solo puede ganar quien acaba de mover
  return -negamax(next, 1 - player, depth - 1, -beta, -alpha)
}

// Valor de la posición para `player`, a quien le toca mover.
function negamax(state, player, depth, alpha, beta) {
  if (depth === 0) return c4Heuristic(state.board, player)
  let best = -Infinity
  for (const col of C4_ORDER) {
    if (c4DropRow(state.board, col) < 0) continue
    const s = c4MoveScore(state, player, col, depth, alpha, beta)
    if (s > best) best = s
    if (s > alpha) alpha = s
    if (alpha >= beta) break
  }
  return best === -Infinity ? 0 : best
}

export function conecta4AI(state, me, level = 'dificil') {
  const cols = C4_ORDER.filter(c => c4DropRow(state.board, c) >= 0)
  if (level === 'facil' && Math.random() < 0.35) return { col: pick(cols) }
  const depth = level === 'facil' ? 2 : 5
  let best = -Infinity
  let moves = []
  for (const col of cols) {
    const s = c4MoveScore(state, me, col, depth, -Infinity, Infinity)
    if (s > best) { best = s; moves = [col] } else if (s === best) moves.push(col)
  }
  return { col: moves[0] }
}

// ───────── Timbiriche: cerrar si se puede, no regalar cuadritos ─────────
export function timbiricheAI(state, me, level = 'dificil') {
  const free = timbiFreeLines(state)
  const n = state.size
  const closes = free.filter(l => timbiBoxesOfLine(n, l.k, l.r, l.c).some(([r, c]) => timbiSidesOf(state, r, c) === 3))
  if (closes.length && !(level === 'facil' && Math.random() < 0.3)) return pick(closes)
  const gives = (l) => timbiBoxesOfLine(n, l.k, l.r, l.c).filter(([r, c]) => timbiSidesOf(state, r, c) === 2).length
  const safe = free.filter(l => gives(l) === 0)
  if (safe.length) return pick(safe)
  if (level === 'facil') return pick(free)
  // Sin jugadas seguras: la que regale la cadena más corta.
  let best = Infinity
  let moves = []
  for (const l of free) {
    let s = timbiriche.move(state, me, l).state
    // simula a la rival cerrando todo lo que pueda
    let lost = 0
    for (let guard = 0; guard < 30 && !s.over; guard++) {
      const f = timbiFreeLines(s)
      const c = f.find(x => timbiBoxesOfLine(n, x.k, x.r, x.c).some(([r, cc]) => timbiSidesOf(s, r, cc) === 3))
      if (!c) break
      const before = s.scores[1 - me]
      s = timbiriche.move(s, s.turn, c).state
      lost += s.scores[1 - me] - before
    }
    if (lost < best) { best = lost; moves = [l] } else if (lost === best) moves.push(l)
  }
  return pick(moves)
}

export const AI = { michi: michiAI, conecta4: conecta4AI, timbiriche: timbiricheAI }
