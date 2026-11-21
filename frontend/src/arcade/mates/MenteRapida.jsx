import { useRef, useState } from 'react'
import { play } from '../../lib/sfx'
import PixelArt from '../PixelArt'
import { readBest, saveBest } from '../storage'
import { ResultBanner } from '../ui'
import { useTimer } from '../useTimer'
import { makeQuestion } from './logic'

const DURATION = 60_000
const PENALTY_MS = 3_000

export default function MenteRapida() {
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [combo, setCombo] = useState(0)
  const [q, setQ] = useState(() => makeQuestion(0))
  const [feedback, setFeedback] = useState(null) // { choice, ok }
  const [best, setBest] = useState(() => readBest('mates'))
  const scoreRef = useRef(0)
  const timer = useTimer(DURATION, () => {
    play('win')
    setBest(saveBest('mates', scoreRef.current))
  })

  const start = () => {
    scoreRef.current = 0
    setScore(0)
    setCorrect(0)
    setCombo(0)
    setFeedback(null)
    setQ(makeQuestion(0))
    timer.start()
    play('confirm')
  }

  const answer = (choice) => {
    if (timer.phase !== 'playing' || feedback) return
    const ok = choice === q.answer
    setFeedback({ choice, ok })
    let nextCorrect = correct
    if (ok) {
      play('select')
      nextCorrect = correct + 1
      scoreRef.current += 10 + combo * 2
      setScore(scoreRef.current)
      setCorrect(nextCorrect)
      setCombo(c => c + 1)
    } else {
      play('hit')
      setCombo(0)
      timer.penalty(PENALTY_MS)
    }
    setTimeout(() => {
      setQ(makeQuestion(Math.floor(nextCorrect / 5)))
      setFeedback(null)
    }, ok ? 350 : 900)
  }

  return (
    <div className="qz-wrap">
      <div className="arc-hud">
        <span className="hud-chip"><PixelArt name="star" size={12} /> {score}</span>
        <span className={`hud-chip ${timer.phase === 'playing' && timer.seconds <= 10 ? 'arc-danger' : ''}`}><PixelArt name="clock" size={12} /> {timer.phase === 'ready' ? 60 : timer.seconds}</span>
        {combo > 1 && <span className="hud-chip"><PixelArt name="flame" size={12} /> x{combo}</span>}
        <span className="hud-chip"><PixelArt name="trophy" size={12} /> {best}</span>
      </div>

      <div className="pixel-panel qz-panel">
        <p className="pixel-title qz-question">{timer.phase === 'playing' ? q.text : '? + ? = ?'}</p>
        <div className="qz-options">
          {q.options.map(o => {
            const state = feedback && (o === q.answer ? 'right' : o === feedback.choice ? 'wrong' : '')
            return (
              <button key={o} className={`pixel-btn ${state === 'right' ? 'cyan' : state === 'wrong' ? 'pink' : 'ghost'} qz-option`} onClick={() => answer(o)} disabled={timer.phase !== 'playing'}>
                {o}
              </button>
            )
          })}
        </div>
        {feedback && !feedback.ok && <p className="arc-muted">Era {q.answer} · −3 s</p>}
      </div>

      {timer.phase === 'ready' && <button className="pixel-btn gold" onClick={start}>▶ Empezar</button>}
      {timer.phase === 'over' && (
        <ResultBanner title={`${score} puntos`} text={`${correct} respuestas correctas.`} onAgain={start} againLabel="Otra vez" icon={score > 0 && score >= best ? 'trophy' : 'star'} />
      )}
    </div>
  )
}
