import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { HEROINES, PORTALS, getHeroine } from '../data/heroines'
import { api } from '../lib/api'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const ROUND_LABELS = { elegir: '🔍 Elegir', ordenar: '📋 Ordenar', error: '🐛 Detectar el error', decidir: '💡 Decidir' }
const DIFFICULTY = ['', '★', '★★', '★★★']
const OUTCOME_TEXT = {
  win: { title: '¡Ronda ganada!', color: 'var(--green-logro)' },
  lose: { title: 'Ronda perdida', color: '#FB7185' },
  tie: { title: 'Ronda anulada', color: 'var(--gold)' },
}

export default function Combat() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, setState, refresh } = usePlayer()
  const hero = getHeroine(state.profile.heroineId) ?? HEROINES[0]
  const portal = PORTALS[location.state?.portal ?? state.profile.portalId ?? hero.portal] ?? PORTALS.code

  const [roundNo, setRoundNo] = useState(0)
  const [phase, setPhase] = useState('matching') // matching | question | waiting | result | error
  const [round, setRound] = useState(null)
  const [picked, setPicked] = useState(null)
  const [rivalDone, setRivalDone] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const startedAt = useRef(0)
  const sent = useRef(false)

  const rival = round ? getHeroine(round.rival.id) : null

  // Pide una ronda nueva al servidor.
  useEffect(() => {
    if (phase !== 'matching') return
    let cancelled = false
    const minWait = new Promise(r => setTimeout(r, roundNo === 0 ? 1500 : 600))
    Promise.all([api.combatStart(portal.id), minWait])
      .then(([r]) => {
        if (cancelled) return
        sent.current = false
        startedAt.current = performance.now()
        setRound(r)
        setPhase('question')
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
        setPhase('error')
      })
    return () => { cancelled = true }
  }, [phase, roundNo, portal.id])

  const send = useCallback(async (choice) => {
    if (sent.current || !round) return
    sent.current = true
    setPicked(choice)
    setPhase('waiting')
    play(choice === null ? 'lose' : 'select')
    const elapsed = performance.now() - startedAt.current
    // Suspenso: si la rival aún no respondía, esperamos un poco (máx. 1.2 s).
    const suspense = new Promise(r => setTimeout(r, Math.min(Math.max(0, round.rival.answerAfterMs - elapsed), 1200)))
    try {
      const [res] = await Promise.all([api.combatAnswer(round.roundId, choice), suspense])
      setRivalDone(true)
      setResult(res)
      setPhase('result')
      setState(s => ({ ...s, profile: res.profile, next: s.next && res.next ? { ...s.next, ...res.next } : s.next }))
      play(res.outcome === 'win' ? 'win' : res.outcome === 'lose' ? 'lose' : 'blip')
      if (res.outcome !== 'tie') setTimeout(() => play('hit'), 120)
      if (res.newlyUnlocked?.length) setTimeout(() => play('confirm'), 700)
    } catch (err) {
      setError(err.message)
      setPhase('error')
    }
  }, [round, setState])

  // Tiempo de la rival y límite de la pregunta.
  useEffect(() => {
    if (phase !== 'question' || !round) return
    const rivalTimer = setTimeout(() => { setRivalDone(true); play('blip') }, round.rival.answerAfterMs)
    const limitTimer = setTimeout(() => send(null), round.timeLimitMs)
    return () => { clearTimeout(rivalTimer); clearTimeout(limitTimer) }
  }, [phase, round, send])

  const nextRound = () => {
    play('confirm')
    setRoundNo(n => n + 1)
    setPicked(null)
    setRivalDone(false)
    setResult(null)
    setRound(null)
    setPhase('matching')
  }

  const answerClass = (i) => {
    if (phase !== 'result') return picked === i ? 'picked' : ''
    if (i === result.correctIndex) return 'correct'
    if (i === picked) return 'wrong'
    return ''
  }

  const p = state.profile
  const next = state.next
  const pct = next ? Math.min(100, Math.round((p.points / next.pointsNeeded) * 100)) : 100
  const hit = result?.outcome === 'win' ? 'rival' : result?.outcome === 'lose' ? 'hero' : null

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.arena[portal.id]} fallback={BACKGROUNDS.arena.code} dim={0.2} />
      <div className="hud">
        <button className="pixel-btn ghost small" onClick={() => navigate('/multiverso')}>◀ Salir</button>
        <span className="hud-chip" style={{ borderColor: portal.color }}>{portal.emoji} {portal.name}</span>
        <div style={{ minWidth: 220, flex: '0 1 320px' }}>
          <div className="hud-chip" style={{ marginBottom: 6 }}>
            🏆 {p.points}{next ? ` / ${next.pointsNeeded}` : ''} · 🔥 {p.currentStreak}
          </div>
          <div className="pixel-bar"><div className="pixel-bar-fill" style={{ width: `${pct}%` }} /></div>
        </div>
        {import.meta.env.DEV && (
          <button
            className="pixel-btn ghost small"
            title="Solo en desarrollo (DEV_TOOLS=true en server/.env)"
            onClick={() => api.devPoints(50).then(refresh).catch(err => setError(err.status === 404 ? 'Activa DEV_TOOLS=true en server/.env' : err.message))}
          >
            +50 demo
          </button>
        )}
      </div>
      {error && phase !== 'error' && <p className="form-error" style={{ margin: '0 16px' }} onClick={() => setError('')}>{error}</p>}

      <div className="scene-content arena">
        <div className="arena-stage">
          <div className={`fighter ${hit === 'hero' ? 'anim-shake anim-flash' : ''}`} style={{ '--aura': PORTALS[hero.portal].color }}>
            {phase === 'result' && <span className="float-number" key={roundNo}>+{result.points}</span>}
            <img src={hero.sprite} alt={hero.name} className="pixel-img" />
            <div><span className="fighter-name">TÚ · {hero.name}</span></div>
            <div className={`status ${picked !== null || phase === 'waiting' ? 'done' : ''}`}>
              {phase === 'question' ? 'Pensando…' : phase === 'waiting' ? '¡Respondido!' : ''}
            </div>
          </div>

          <div className="vs-pixel">VS</div>

          <div className={`fighter rival ${hit === 'rival' ? 'anim-shake anim-flash' : ''}`} style={{ '--aura': rival ? PORTALS[rival.portal].color : '#fff' }}>
            {rival
              ? <img src={rival.sprite} alt={rival.name} className="pixel-img" />
              : <div className="fighter-unknown">?</div>}
            <div><span className="fighter-name">RIVAL IA · {rival ? rival.name : '???'}</span></div>
            <div className={`status ${rivalDone ? 'done' : ''}`}>
              {phase === 'question' || phase === 'waiting' ? (rivalDone ? '¡Respondido!' : 'Pensando…') : ''}
            </div>
          </div>
        </div>

        {phase === 'matching' && (
          <div className="pixel-panel center anim-pop">
            <h2 className="pixel-title" style={{ fontSize: '0.9rem' }}>{roundNo === 0 ? 'Buscando rival…' : `Ronda ${roundNo + 1}`}</h2>
            <p className="dash-muted" style={{ marginTop: 8 }}>El agente elige una pregunta a tu nivel.</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="pixel-panel center">
            <p className="form-error">{error}</p>
            <button className="pixel-btn gold" onClick={nextRound}>Reintentar</button>
          </div>
        )}

        {round && phase !== 'matching' && phase !== 'error' && (
          <div className="pixel-panel question-panel anim-pop" key={round.roundId}>
            {phase === 'question' && (
              <div className="pixel-bar timer-bar">
                <div className="pixel-bar-fill" style={{ width: '100%', animation: `timer-shrink ${round.timeLimitMs}ms linear forwards` }} />
              </div>
            )}
            <div className="q-type">
              <span className="pixel-tag">{ROUND_LABELS[round.question.type]}</span>
              <span className="pixel-tag" style={{ marginLeft: 8, borderColor: 'var(--gold)', color: 'var(--gold)' }} title="Dificultad elegida según tu desempeño">
                {DIFFICULTY[round.question.difficulty]}
              </span>
            </div>
            <p className="q-text">{round.question.text}</p>
            <div className="answers">
              {round.question.options.map((text, i) => (
                <button key={text} className={`answer-btn ${answerClass(i)}`} onClick={() => send(i)} disabled={phase !== 'question'}>
                  {text}
                </button>
              ))}
            </div>

            {phase === 'result' && (
              <div className="result-banner anim-pop">
                <h3 className="pixel-title" style={{ color: OUTCOME_TEXT[result.outcome].color }}>
                  {OUTCOME_TEXT[result.outcome].title} +{result.points} pts
                </h3>
                <p>
                  {result.timedOut ? '⏰ Se acabó el tiempo. ' : ''}
                  {result.rivalCorrect ? `${rival.name} acertó. ` : `${rival.name} falló. `}
                  {result.explain}
                </p>
                {result.newlyUnlocked?.length > 0 && (
                  <p className="unlock-inline">🎉 ¡Desbloqueaste a {result.newlyUnlocked.map(id => getHeroine(id)?.name).join(', ')}!</p>
                )}
                {next?.pointsDone && !next.ready && (
                  <p className="unlock-inline">🏆 ¡Ya tienes los puntos del nivel {next.targetLevel}! Completa tu misión para subir.</p>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="pixel-btn gold" onClick={nextRound}>Siguiente ronda ▶</button>
                  {next?.ready && <button className="pixel-btn" onClick={() => navigate('/boss')}>👾 Enfrentar al NoPuedo</button>}
                  {next?.pointsDone && !next.ready && <button className="pixel-btn" onClick={() => navigate('/mision')}>🎯 Ir a mi misión</button>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
