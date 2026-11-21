import { useRef, useState } from 'react'
import { play } from '../lib/sfx'
import PixelArt from './PixelArt'
import { readBest, saveBest } from './storage'
import { ResultBanner } from './ui'
import { useTimer } from './useTimer'

// Binario: enciende los bits que suman el número. Cada bit vale el doble que el de su derecha.
const DURATION = 60_000

const bitsFor = (solved) => Math.min(8, 4 + Math.floor(solved / 3))

function randomTarget(bits, previous) {
  const max = 2 ** bits - 1
  let t
  do { t = 1 + Math.floor(Math.random() * max) } while (t === previous && max > 1)
  return t
}

export default function Binario() {
  const [score, setScore] = useState(0)
  const [solved, setSolved] = useState(0)
  const [best, setBest] = useState(() => readBest('binario'))
  const [target, setTarget] = useState(() => randomTarget(4))
  const [on, setOn] = useState(() => Array(4).fill(false))
  const [flash, setFlash] = useState(false)
  const scoreRef = useRef(0)
  const timer = useTimer(DURATION, () => {
    play('win')
    setBest(saveBest('binario', scoreRef.current))
  })

  const bits = on.length
  const weights = Array.from({ length: bits }, (_, i) => 2 ** (bits - 1 - i))
  const sum = on.reduce((s, v, i) => s + (v ? weights[i] : 0), 0)

  const start = () => {
    scoreRef.current = 0
    setScore(0)
    setSolved(0)
    setTarget(randomTarget(4))
    setOn(Array(4).fill(false))
    timer.start()
    play('confirm')
  }

  const toggle = (i) => {
    if (timer.phase !== 'playing' || flash) return
    const next = on.map((v, k) => (k === i ? !v : v))
    setOn(next)
    const total = next.reduce((s, v, k) => s + (v ? weights[k] : 0), 0)
    if (total !== target) { play('blip'); return }
    // ¡Correcto!
    play('win')
    const gained = bits * 10
    scoreRef.current += gained
    setScore(scoreRef.current)
    setFlash(true)
    setTimeout(() => {
      const nextSolved = solved + 1
      const nb = bitsFor(nextSolved)
      setSolved(nextSolved)
      setTarget(randomTarget(nb, target))
      setOn(Array(nb).fill(false))
      setFlash(false)
    }, 450)
  }

  return (
    <div className="bn-wrap">
      <div className="arc-hud">
        <span className="hud-chip"><PixelArt name="star" size={12} /> {score}</span>
        <span className={`hud-chip ${timer.phase === 'playing' && timer.seconds <= 10 ? 'arc-danger' : ''}`}><PixelArt name="clock" size={12} /> {timer.phase === 'ready' ? 60 : timer.seconds}</span>
        <span className="hud-chip"><PixelArt name="trophy" size={12} /> {best}</span>
      </div>

      <div className="pixel-panel bn-panel">
        <p className="arc-muted">Forma el número</p>
        <p className={`pixel-title bn-target ${flash ? 'ok' : ''}`}>{target}</p>
        <div className="bn-bits" style={{ '--bits': bits }}>
          {on.map((v, i) => (
            <button key={`${bits}-${i}`} className={`bn-bit ${v ? 'on' : ''}`} onClick={() => toggle(i)} disabled={timer.phase !== 'playing'} aria-pressed={v} aria-label={`Bit que vale ${weights[i]}`}>
              <span className="bn-weight">{weights[i]}</span>
              <span className="bn-lamp">{v ? 1 : 0}</span>
            </button>
          ))}
        </div>
        <p className="arc-muted">Suma: <strong>{sum}</strong> · En binario: <strong>{on.map(v => (v ? 1 : 0)).join('')}</strong></p>
      </div>

      {timer.phase === 'ready' && <button className="pixel-btn gold" onClick={start}>▶ Empezar</button>}
      {timer.phase === 'over' && (
        <ResultBanner title={`${score} puntos`} text={`Resolviste ${solved} números. Las computadoras guardan todo con ceros y unos.`} onAgain={start} againLabel="Otra vez" icon={score > 0 && score >= best ? 'trophy' : 'star'} />
      )}
    </div>
  )
}
