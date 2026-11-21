import { useEffect, useRef, useState } from 'react'
import { SPRITES } from '../data/assets'
import { play, playTone } from '../lib/sfx'
import PixelArt from './PixelArt'
import { readBest, saveBest } from './storage'
import { ResultBanner } from './ui'

// Secuencia: los 4 portales se encienden en orden; repítelo. Cada ronda suma uno más.
const PADS = [
  { id: 0, name: 'Morado', color: '#8B5CF6', note: 330 },
  { id: 1, name: 'Cian', color: '#22D3EE', note: 392 },
  { id: 2, name: 'Rosa', color: '#E879F9', note: 494 },
  { id: 3, name: 'Oro', color: '#FBBF24', note: 587 },
]
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const randomPad = () => Math.floor(Math.random() * PADS.length)

export default function Secuencia() {
  const [seq, setSeq] = useState([])
  const [phase, setPhase] = useState('ready') // ready | show | input | over
  const [lit, setLit] = useState(-1)
  const [inputPos, setInputPos] = useState(0)
  const [best, setBest] = useState(() => readBest('secuencia'))
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const flash = async (id, ms) => {
    setLit(id)
    playTone(PADS[id].note, ms / 1000)
    await wait(ms)
    if (alive.current) setLit(-1)
  }

  const showSequence = async (s) => {
    setPhase('show')
    const ms = Math.max(220, 520 - s.length * 22)
    await wait(500)
    for (const id of s) {
      if (!alive.current) return
      await flash(id, ms)
      await wait(120)
    }
    if (!alive.current) return
    setInputPos(0)
    setPhase('input')
  }

  const nextRound = (prev) => {
    const s = [...prev, randomPad()]
    setSeq(s)
    showSequence(s)
  }

  const start = () => {
    play('confirm')
    nextRound([])
  }

  const press = (id) => {
    if (phase !== 'input') return
    flash(id, 220)
    if (seq[inputPos] !== id) {
      play('lose')
      setPhase('over')
      setBest(saveBest('secuencia', seq.length - 1))
      return
    }
    const nextPos = inputPos + 1
    if (nextPos < seq.length) {
      setInputPos(nextPos)
      return
    }
    setPhase('show')
    setTimeout(() => { if (alive.current) { play('select'); nextRound(seq) } }, 600)
  }

  const level = Math.max(0, seq.length - (phase === 'over' ? 1 : 0))

  return (
    <div className="sq-wrap">
      <div className="arc-hud">
        <span className="hud-chip">Ronda {seq.length || 1}</span>
        <span className="hud-chip"><PixelArt name="trophy" size={12} /> {best}</span>
        <span className="hud-chip">{phase === 'show' ? 'Mira…' : phase === 'input' ? `Tu turno ${inputPos}/${seq.length}` : '—'}</span>
      </div>
      <div className={`sq-board ${phase === 'input' ? 'input' : ''}`}>
        {PADS.map(p => (
          <button
            key={p.id}
            className={`sq-pad ${lit === p.id ? 'lit' : ''}`}
            style={{ '--pad': p.color }}
            onPointerDown={(e) => { e.preventDefault(); press(p.id) }}
            disabled={phase !== 'input'}
            aria-label={`Portal ${p.name}`}
          />
        ))}
        <img src={SPRITES.yessenia} alt="" className="pixel-img sq-core" />
      </div>
      {phase === 'ready' && <button className="pixel-btn gold" onClick={start}>▶ Empezar</button>}
      {phase === 'over' && (
        <ResultBanner title={`${level} ${level === 1 ? 'ronda' : 'rondas'}`} text={level >= best && level > 0 ? '¡Nuevo récord!' : 'Tu memoria se entrena como un músculo.'} onAgain={start} againLabel="Otra vez" icon={level >= best && level > 0 ? 'trophy' : 'star'} />
      )}
    </div>
  )
}
