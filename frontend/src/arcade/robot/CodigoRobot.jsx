import { useEffect, useMemo, useRef, useState } from 'react'
import { play } from '../../lib/sfx'
import PixelArt from '../PixelArt'
import { ResultBanner, Stars } from '../ui'
import { LEVELS, addCommand, parseLevel, run, solve, starsFor } from './logic'

const CMDS = [
  { id: 'F', label: 'Avanzar', sprite: 'cmdForward' },
  { id: 'L', label: 'Girar izq.', sprite: 'cmdLeft' },
  { id: 'R', label: 'Girar der.', sprite: 'cmdRight' },
]
const SPRITE_OF = Object.fromEntries(CMDS.map(c => [c.id, c.sprite]))
const STEP_MS = 380
const PROGRESS_KEY = 'herow.arcade.robot.stars'

function readProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) ?? {} } catch { return {} }
}
function saveProgress(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)) } catch { /* sin almacenamiento */ }
}

export default function CodigoRobot() {
  const [index, setIndex] = useState(0)
  const level = useMemo(() => parseLevel(LEVELS[index]), [index])
  const optimal = useMemo(() => solve(level), [level])
  const limit = optimal + 4
  const [program, setProgram] = useState([])
  const [pos, setPos] = useState(level.start)
  const [active, setActive] = useState(-1) // bloque que se está ejecutando
  const [status, setStatus] = useState('edit') // edit | running | goal | crash | short
  const [crash, setCrash] = useState(null)
  const [progress, setProgress] = useState(readProgress)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const loadLevel = (i) => {
    clearTimeout(timer.current)
    const lv = parseLevel(LEVELS[i])
    setIndex(i)
    setProgram([])
    setPos(lv.start)
    setActive(-1)
    setCrash(null)
    setStatus('edit')
  }

  const resetRun = () => {
    clearTimeout(timer.current)
    setPos(level.start)
    setActive(-1)
    setCrash(null)
    setStatus('edit')
  }

  const add = (cmd) => {
    if (status !== 'edit') resetRun()
    const next = addCommand(program, cmd)
    if (next.length > limit) return
    play('blip')
    setProgram(next)
  }

  const execute = () => {
    if (!program.length) return
    const { steps, result } = run(level, program)
    setStatus('running')
    play('confirm')
    let i = 0
    const tick = () => {
      const s = steps[i]
      setPos({ r: s.r, c: s.c, d: s.d })
      setActive(s.block)
      if (s.crash) setCrash(s.crash)
      i++
      if (i < steps.length) {
        if (s.block >= 0) play('blip')
        timer.current = setTimeout(tick, STEP_MS)
        return
      }
      setStatus(result)
      if (result === 'goal') {
        play('win')
        const stars = starsFor(program.length, optimal)
        setProgress(p => {
          const next = { ...p, [index]: Math.max(p[index] ?? 0, stars) }
          saveProgress(next)
          return next
        })
      } else play(result === 'crash' ? 'hit' : 'lose')
    }
    tick()
  }

  const stars = status === 'goal' ? starsFor(program.length, optimal) : 0
  const totalStars = Object.values(progress).reduce((a, b) => a + b, 0)

  return (
    <div className="rb-wrap">
      <div className="arc-hud">
        <span className="hud-chip">Nivel {index + 1}/{LEVELS.length}</span>
        <span className="hud-chip"><PixelArt name="star" size={12} /> {totalStars}/{LEVELS.length * 3}</span>
        <span className="hud-chip">Bloques {program.length}/{limit}</span>
      </div>
      <div className="rb-levels" aria-label="Niveles">
        {LEVELS.map((lv, i) => (
          <button
            key={lv.name}
            className={`rb-level ${i === index ? 'on' : ''}`}
            onClick={() => { play('blip'); loadLevel(i) }}
            disabled={i > 0 && !progress[i - 1] && i !== index}
            title={lv.name}
          >
            {i + 1}
            {progress[i] ? <Stars value={progress[i]} size={7} /> : null}
          </button>
        ))}
      </div>

      <div className="rb-main">
        <div className="rb-grid" style={{ '--cols': level.cols }}>
          {level.map.flatMap((row, r) => [...row].map((ch, c) => {
            const here = pos.r === r && pos.c === c
            const isCrash = crash && crash.r === r && crash.c === c
            return (
              <div key={`${r}-${c}`} className={`rb-cell ${ch === '#' ? 'wall' : ''} ${isCrash ? 'crash' : ''}`}>
                {level.goal.r === r && level.goal.c === c && !here && <PixelArt name="star" size={30} />}
                {here && <span className="rb-rover" style={{ transform: `rotate(${pos.d * 90}deg)` }}><PixelArt name="rover" size={34} /></span>}
              </div>
            )
          }))}
        </div>

        <div className="rb-side">
          <p className="arc-label">Tu programa</p>
          <ol className="rb-program" aria-label="Programa">
            {program.length === 0 && <li className="rb-empty">Toca los bloques de abajo</li>}
            {program.map((b, i) => (
              <li key={i} className={`rb-block ${active === i ? 'on' : ''}`}>
                <PixelArt name={SPRITE_OF[b.cmd]} size={20} />
                {b.n > 1 && <span>×{b.n}</span>}
              </li>
            ))}
          </ol>
          <div className="rb-cmds">
            {CMDS.map(c => (
              <button key={c.id} className="pixel-btn ghost small" onClick={() => add(c.id)} disabled={status === 'running'}>
                <PixelArt name={c.sprite} size={18} /> {c.label}
              </button>
            ))}
          </div>
          <div className="arc-row">
            <button className="pixel-btn gold" onClick={execute} disabled={!program.length || status === 'running'}>▶ Ejecutar</button>
            <button className="pixel-btn ghost small" onClick={() => { play('blip'); resetRun(); setProgram(p => p.slice(0, -1)) }} disabled={!program.length || status === 'running'}>Borrar último</button>
            <button className="pixel-btn ghost small" onClick={() => { play('blip'); resetRun(); setProgram([]) }} disabled={!program.length || status === 'running'}>Limpiar</button>
          </div>
        </div>
      </div>

      {status === 'goal' && (
        <ResultBanner
          title="¡Llegó a la estrella!"
          text={stars === 3 ? 'Programa perfecto: el más corto posible.' : `Se puede con ${optimal} bloques. ¿Lo intentas?`}
          onAgain={index + 1 < LEVELS.length ? () => { play('confirm'); loadLevel(index + 1) } : null}
          againLabel="Siguiente nivel"
          extra={<button className="pixel-btn ghost small" onClick={resetRun}>Mejorar</button>}
        >
          <Stars value={stars} size={22} />
        </ResultBanner>
      )}
      {(status === 'crash' || status === 'short') && (
        <ResultBanner
          icon="bolt"
          title={status === 'crash' ? '¡Chocó!' : 'No llegó a la estrella'}
          text="Revisa tu programa paso a paso y prueba otra vez."
          onAgain={() => { play('blip'); resetRun() }}
          againLabel="Corregir"
        />
      )}
    </div>
  )
}
