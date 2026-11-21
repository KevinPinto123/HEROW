import { useRef, useState } from 'react'
import { play } from '../../lib/sfx'
import PixelArt from '../PixelArt'
import { readBest, saveBest } from '../storage'
import { ResultBanner } from '../ui'
import { useTimer } from '../useTimer'
import { FACTS } from './facts'

const DURATION = 60_000

function shuffled() {
  const a = FACTS.map((_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function CienciaFlash() {
  const [order, setOrder] = useState(shuffled)
  const [pos, setPos] = useState(0)
  const [score, setScore] = useState(0)
  const [right, setRight] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState(null) // { ok }
  const [best, setBest] = useState(() => readBest('flash'))
  const scoreRef = useRef(0)
  const timer = useTimer(DURATION, () => {
    play('win')
    setBest(saveBest('flash', scoreRef.current))
  })
  const fact = FACTS[order[pos % order.length]]

  const start = () => {
    scoreRef.current = 0
    setScore(0)
    setRight(0)
    setStreak(0)
    setFeedback(null)
    setOrder(shuffled())
    setPos(0)
    timer.start()
    play('confirm')
  }

  const answer = (value) => {
    if (timer.phase !== 'playing' || feedback) return
    const ok = value === fact.answer
    setFeedback({ ok })
    if (ok) {
      play('select')
      scoreRef.current += 10 + streak * 2
      setScore(scoreRef.current)
      setRight(r => r + 1)
      setStreak(s => s + 1)
    } else {
      play('hit')
      setStreak(0)
    }
    setTimeout(() => {
      setFeedback(null)
      setPos(p => p + 1)
    }, ok ? 700 : 2200)
  }

  return (
    <div className="qz-wrap">
      <div className="arc-hud">
        <span className="hud-chip"><PixelArt name="star" size={12} /> {score}</span>
        <span className={`hud-chip ${timer.phase === 'playing' && timer.seconds <= 10 ? 'arc-danger' : ''}`}><PixelArt name="clock" size={12} /> {timer.phase === 'ready' ? 60 : timer.seconds}</span>
        {streak > 1 && <span className="hud-chip"><PixelArt name="flame" size={12} /> x{streak}</span>}
        <span className="hud-chip"><PixelArt name="trophy" size={12} /> {best}</span>
      </div>

      <div className={`pixel-panel qz-panel ${feedback ? (feedback.ok ? 'ok' : 'bad') : ''}`}>
        <p className="qz-fact">{timer.phase === 'playing' ? fact.text : '¿Verdadero o falso?'}</p>
        {feedback && (
          <p className="arc-label">{feedback.ok ? '¡Correcto!' : `Es ${fact.answer ? 'verdadero' : 'falso'}`}</p>
        )}
        {feedback && <p className="arc-muted">{fact.why}</p>}
        <div className="qz-tf">
          <button className="pixel-btn cyan" onClick={() => answer(true)} disabled={timer.phase !== 'playing' || Boolean(feedback)}>Verdadero</button>
          <button className="pixel-btn pink" onClick={() => answer(false)} disabled={timer.phase !== 'playing' || Boolean(feedback)}>Falso</button>
        </div>
      </div>

      {timer.phase === 'ready' && <button className="pixel-btn gold" onClick={start}>▶ Empezar</button>}
      {timer.phase === 'over' && (
        <ResultBanner title={`${score} puntos`} text={`Acertaste ${right} datos de ciencia.`} onAgain={start} againLabel="Otra vez" icon={score > 0 && score >= best ? 'trophy' : 'star'} />
      )}
    </div>
  )
}
