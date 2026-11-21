import { useMemo, useState } from 'react'
import { play } from '../../lib/sfx'
import PixelArt from '../PixelArt'
import { readBest, saveBest } from '../storage'
import { ResultBanner } from '../ui'
import { E_, N_, S_, W_, degree, generate, isSolved, powered, rotate, scramble } from './logic'

const SIZES = [3, 4, 4, 5, 5, 6]

function newPuzzle(level) {
  return scramble(generate(SIZES[level]))
}

/** Dibujo de una pieza en una grilla de 10×10 "pixeles". */
function Tile({ mask, on, isSource, onClick, disabled }) {
  const wire = on ? '#22D3EE' : '#5B4F86'
  const bulb = degree(mask) === 1 && !isSource
  return (
    <button className={`ct-tile ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled} aria-label={isSource ? 'Batería' : bulb ? (on ? 'Foco encendido' : 'Foco apagado') : 'Cable'}>
      <svg viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
        {mask & N_ ? <rect x="4" y="0" width="2" height="5" fill={wire} /> : null}
        {mask & S_ ? <rect x="4" y="5" width="2" height="5" fill={wire} /> : null}
        {mask & E_ ? <rect x="5" y="4" width="5" height="2" fill={wire} /> : null}
        {mask & W_ ? <rect x="0" y="4" width="5" height="2" fill={wire} /> : null}
        {isSource && <>
          <rect x="2" y="2" width="6" height="6" fill="#E879F9" />
          <rect x="3" y="3" width="1" height="2" fill="#fff" />
          <rect x="4" y="1" width="2" height="1" fill="#E879F9" />
        </>}
        {bulb && <>
          <rect x="3" y="2" width="4" height="5" fill={on ? '#FBBF24' : '#3B2F6B'} />
          <rect x="2" y="3" width="6" height="3" fill={on ? '#FBBF24' : '#3B2F6B'} />
          <rect x="4" y="3" width="1" height="1" fill={on ? '#fff' : '#5B4F86'} />
          <rect x="4" y="7" width="2" height="1" fill="#C4B5FD" />
        </>}
        {!isSource && !bulb && <rect x="4" y="4" width="2" height="2" fill={wire} />}
      </svg>
    </button>
  )
}

export default function Circuito() {
  const [level, setLevel] = useState(0)
  const [puzzle, setPuzzle] = useState(() => newPuzzle(0))
  const [moves, setMoves] = useState(0)
  const [solvedCount, setSolvedCount] = useState(() => readBest('circuito'))
  const on = useMemo(() => powered(puzzle), [puzzle])
  const solved = useMemo(() => isSolved(puzzle), [puzzle])
  const bulbs = useMemo(() => {
    let total = 0
    let lit = 0
    puzzle.grid.forEach((row, r) => row.forEach((m, c) => {
      if (degree(m) === 1 && !(r === puzzle.source.r && c === puzzle.source.c)) {
        total++
        if (on[r][c]) lit++
      }
    }))
    return { total, lit }
  }, [puzzle, on])

  const turn = (r, c) => {
    if (solved) return
    const grid = puzzle.grid.map(row => [...row])
    grid[r][c] = rotate(grid[r][c])
    const next = { ...puzzle, grid }
    setPuzzle(next)
    setMoves(m => m + 1)
    if (isSolved(next)) {
      play('win')
      setSolvedCount(saveBest('circuito', solvedCount + 1))
    } else play('blip')
  }

  const go = (lv) => {
    setLevel(lv)
    setPuzzle(newPuzzle(lv))
    setMoves(0)
    play('confirm')
  }

  return (
    <div className="ct-wrap">
      <div className="arc-hud">
        <span className="hud-chip">Nivel {level + 1}/{SIZES.length}</span>
        <span className="hud-chip"><PixelArt name="bolt" size={12} /> Focos {bulbs.lit}/{bulbs.total}</span>
        <span className="hud-chip">Giros {moves}</span>
        <span className="hud-chip"><PixelArt name="trophy" size={12} /> {solvedCount}</span>
        <button className="pixel-btn ghost small" onClick={() => go(level)}>Otro circuito</button>
      </div>
      <div className={`ct-board ${solved ? 'solved' : ''}`} style={{ '--n': puzzle.size }}>
        {puzzle.grid.map((row, r) => row.map((m, c) => (
          <Tile
            key={`${r}-${c}`}
            mask={m}
            on={on[r][c]}
            isSource={r === puzzle.source.r && c === puzzle.source.c}
            onClick={() => turn(r, c)}
            disabled={solved}
          />
        )))}
      </div>
      {solved && (
        <ResultBanner
          title="¡Todos los focos encendidos!"
          text={`Lo lograste en ${moves} giros. La corriente necesita un camino completo desde la batería.`}
          onAgain={() => go(Math.min(level + 1, SIZES.length - 1))}
          againLabel={level + 1 < SIZES.length ? 'Siguiente nivel' : 'Otro circuito'}
        />
      )}
    </div>
  )
}
