// Tableros (solo dibujo). Reciben el estado, si la jugadora puede mover y onMove.
import { PLAYER_COLORS } from './colors'
import PixelArt from './PixelArt'
import { C4_COLS, c4DropRow } from './rules'

const MARKS = ['markX', 'markO']
const MARK_NAMES = ['equis', 'círculo']

export function MichiBoard({ state, canMove, onMove }) {
  return (
    <div className="michi-board">
      {state.board.map((v, i) => (
        <button
          key={i}
          className={`michi-cell ${state.line?.includes(i) ? 'win' : ''} ${state.last === i ? 'last' : ''}`}
          disabled={!canMove || v !== null}
          onClick={() => onMove({ cell: i })}
          aria-label={v === null ? `Casilla ${i + 1} libre` : `Casilla ${i + 1}: ${MARK_NAMES[v]}`}
        >
          {v !== null && <PixelArt name={MARKS[v]} size={56} />}
        </button>
      ))}
    </div>
  )
}

export function Conecta4Board({ state, canMove, onMove }) {
  const win = new Set((state.line ?? []).map(([r, c]) => `${r},${c}`))
  return (
    <div className="c4-board">
      {Array.from({ length: C4_COLS }, (_, col) => (
        <button
          key={col}
          className="c4-col"
          disabled={!canMove || c4DropRow(state.board, col) < 0}
          onClick={() => onMove({ col })}
          aria-label={`Columna ${col + 1}`}
        >
          {state.board.map((row, r) => {
            const v = row[col]
            const isLast = state.last && state.last[0] === r && state.last[1] === col
            return (
              <span
                key={r}
                className={`c4-slot ${v !== null ? 'filled' : ''} ${win.has(`${r},${col}`) ? 'win' : ''} ${isLast ? 'last' : ''}`}
                style={{ '--disc': v === null ? 'transparent' : PLAYER_COLORS[v], '--fall': r + 1 }}
              />
            )
          })}
        </button>
      ))}
    </div>
  )
}

export function TimbiricheBoard({ state, canMove, onMove }) {
  const n = state.size
  const cells = []
  // Cuadrícula de (2n+1)×(2n+1): puntos, líneas y cuadritos intercalados.
  for (let gr = 0; gr <= 2 * n; gr++) {
    for (let gc = 0; gc <= 2 * n; gc++) {
      const key = `${gr}-${gc}`
      if (gr % 2 === 0 && gc % 2 === 0) {
        cells.push(<span key={key} className="tb-dot" />)
      } else if (gr % 2 === 0) {
        const r = gr / 2
        const c = (gc - 1) / 2
        const v = state.h[r][c]
        const last = state.last?.k === 'h' && state.last.r === r && state.last.c === c
        cells.push(
          <button key={key} className={`tb-line h ${v !== null ? 'on' : ''} ${last ? 'last' : ''}`}
            style={{ '--line': v === null ? undefined : PLAYER_COLORS[v] }}
            disabled={!canMove || v !== null} onClick={() => onMove({ k: 'h', r, c })} aria-label="Línea horizontal" />,
        )
      } else if (gc % 2 === 0) {
        const r = (gr - 1) / 2
        const c = gc / 2
        const v = state.v[r][c]
        const last = state.last?.k === 'v' && state.last.r === r && state.last.c === c
        cells.push(
          <button key={key} className={`tb-line v ${v !== null ? 'on' : ''} ${last ? 'last' : ''}`}
            style={{ '--line': v === null ? undefined : PLAYER_COLORS[v] }}
            disabled={!canMove || v !== null} onClick={() => onMove({ k: 'v', r, c })} aria-label="Línea vertical" />,
        )
      } else {
        const v = state.boxes[(gr - 1) / 2][(gc - 1) / 2]
        cells.push(
          <span key={key} className={`tb-box ${v !== null ? 'on' : ''}`} style={{ '--box': v === null ? 'transparent' : PLAYER_COLORS[v] }}>
          </span>,
        )
      }
    }
  }
  return <div className="tb-board" style={{ '--n': n }}>{cells}</div>
}
