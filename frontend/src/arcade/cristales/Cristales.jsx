import { useEffect, useRef, useState } from 'react'
import { play } from '../../lib/sfx'
import PixelArt from '../PixelArt'
import { ResultBanner } from '../ui'
import { rng } from '../rules'
import { GEMS, N, adjacent, collapse, findMatches, hasMoves, makeBoard, pointsFor, swap } from './logic'

const wait = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * Tablero de Cristales. Es "no controlado" respecto al tiempo: el padre decide
 * si se puede jugar (running) y recibe cada cambio de puntaje (onScore).
 */
export function CristalesBoard({ seed, running, onScore }) {
  const [rand] = useState(() => rng(seed))
  const [grid, setGrid] = useState(() => makeBoard(rand))
  const [selected, setSelected] = useState(null)
  const [popping, setPopping] = useState(new Set())
  const [combo, setCombo] = useState(0)
  const busy = useRef(false)
  const score = useRef(0)
  const alive = useRef(true)
  const drag = useRef(null)
  const gridRef = useRef(grid)
  useEffect(() => { gridRef.current = grid }, [grid])

  useEffect(() => {
    alive.current = true // React puede montar dos veces (StrictMode): se reactiva aquí
    return () => { alive.current = false }
  }, [])

  const trySwap = async (a, b) => {
    if (busy.current || !running) return
    busy.current = true
    setSelected(null)
    let g = swap(gridRef.current, a, b)
    setGrid(g)
    await wait(170)
    let m = findMatches(g)
    if (!m.cells.size) {
      play('hit')
      setGrid(swap(g, a, b))
      await wait(170)
      busy.current = false
      return
    }
    let level = 1
    while (m.cells.size && alive.current) {
      setPopping(m.cells)
      setCombo(level)
      play(level > 1 ? 'confirm' : 'select')
      score.current += pointsFor(m, level)
      onScore?.(score.current)
      await wait(220)
      g = collapse(g, m.cells, rand)
      setPopping(new Set())
      setGrid(g)
      await wait(260)
      m = findMatches(g)
      level++
    }
    if (alive.current && !hasMoves(g)) {
      // Sin jugadas posibles: tablero nuevo (no se pierden los puntos).
      g = makeBoard(rand)
      setGrid(g)
    }
    setCombo(0)
    busy.current = false
  }

  const onDown = (e, r, c) => {
    if (!running) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { r, c, x: e.clientX, y: e.clientY }
  }
  const onUp = (e, r, c) => {
    const d = drag.current
    drag.current = null
    if (!d || !running) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
      // Deslizar: cambia con la vecina en esa dirección.
      const to = Math.abs(dx) > Math.abs(dy) ? { r: d.r, c: d.c + Math.sign(dx) } : { r: d.r + Math.sign(dy), c: d.c }
      if (to.r >= 0 && to.r < N && to.c >= 0 && to.c < N) trySwap({ r: d.r, c: d.c }, to)
      return
    }
    // Tocar: seleccionar y luego tocar una vecina.
    const here = { r, c }
    if (selected && adjacent(selected, here)) trySwap(selected, here)
    else {
      setSelected(selected && selected.r === r && selected.c === c ? null : here)
      play('blip')
    }
  }

  return (
    <div className={`cr-board ${running ? '' : 'paused'}`} style={{ '--n': N }}>
      {grid.flatMap((row, r) => row.map((t, c) => {
        const gem = GEMS[t.k]
        const isSel = selected && selected.r === r && selected.c === c
        return (
          <div
            key={t.id}
            className="cr-cell"
            style={{ transform: `translate(${c * 100}%, ${r * 100}%)` }}
            onPointerDown={(e) => onDown(e, r, c)}
            onPointerUp={(e) => onUp(e, r, c)}
          >
            <div
              className={`cr-gem ${isSel ? 'sel' : ''} ${popping.has(`${r},${c}`) ? 'pop' : ''} ${t.drop ? 'drop' : ''}`}
              style={{ '--drop': t.drop ?? 0 }}
              title={gem.name}
            >
              <PixelArt name={gem.sprite} size={40} />
            </div>
          </div>
        )
      }))}
      {combo > 1 && <div className="cr-combo" key={combo}>¡Combo x{combo}!</div>}
    </div>
  )
}

const BEST_KEY = 'herow.arcade.cristales.best'
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }
const saveBest = (v) => { try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* sin almacenamiento */ } }

/** Modo consola: contrarreloj de 90 segundos. */
export default function CristalesSolo({ durationMs = 90_000 }) {
  const [round, setRound] = useState(0)
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const [phase, setPhase] = useState('ready') // ready | playing | over
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(durationMs)
  const [best, setBest] = useState(readBest)
  const scoreRef = useRef(0)

  useEffect(() => {
    if (phase !== 'playing') return
    const end = Date.now() + durationMs
    const id = setInterval(() => {
      const l = Math.max(0, end - Date.now())
      setLeft(l)
      if (l === 0) {
        clearInterval(id)
        setPhase('over')
        play('win')
        const final = scoreRef.current
        setBest(b => {
          if (final <= b) return b
          saveBest(final)
          return final
        })
      }
    }, 200)
    return () => clearInterval(id)
  }, [phase, durationMs, round])

  const start = () => {
    scoreRef.current = 0
    setScore(0)
    setLeft(durationMs)
    setRound(r => r + 1)
    setPhase('playing')
    play('confirm')
  }

  return (
    <div className="cr-wrap">
      <div className="arc-hud">
        <span className="hud-chip"><PixelArt name="star" size={12} /> {score}</span>
        <span className="hud-chip"><PixelArt name="clock" size={12} /> {Math.ceil(left / 1000)}</span>
        <span className="hud-chip"><PixelArt name="trophy" size={12} /> {best}</span>
      </div>
      <div className="cr-stage">
        <CristalesBoard key={round} seed={seed + round} running={phase === 'playing'} onScore={(v) => { scoreRef.current = v; setScore(v) }} />
        {phase === 'ready' && (
          <div className="cg-overlay">
            <button className="pixel-btn gold" onClick={start}>▶ Empezar</button>
          </div>
        )}
        {phase === 'over' && (
          <div className="cg-overlay">
            <ResultBanner title={`${score} puntos`} text={score > 0 && score === best ? '¡Nuevo récord!' : '¡Tiempo!'} onAgain={start} againLabel="Otra vez" icon={score > 0 && score === best ? 'trophy' : 'star'} />
          </div>
        )}
      </div>
    </div>
  )
}
