import { useChannel } from '@portalsdk/react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { HEROINES, PORTALS, getHeroine } from '../data/heroines'
import { api } from '../lib/api'
import { LOBBY_CHANNEL, REACTIONS, SERVER_SENDER } from '../lib/live'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const nowMs = () => Date.now()
const ROUND_LABELS = { elegir: '🔍 Elegir', ordenar: '📋 Ordenar', error: '🐛 Detectar el error', decidir: '💡 Decidir' }
const OUTCOME = {
  win: { title: '¡Ganaste la ronda!', color: 'var(--green-logro)' },
  lose: { title: 'Tu rival ganó la ronda', color: '#FB7185' },
  tie: { title: 'Ronda anulada', color: 'var(--gold)' },
}

const SEARCH_MAX_MS = 2 * 60_000

// ───────── Buscando rival ─────────
function Searching({ portal, onCancel, onPractice }) {
  const { presence } = useChannel({ channelId: LOBBY_CHANNEL, history: 'none', metadata: { portal: portal.id } })
  const online = presence?.count ?? 1
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="pixel-panel center anim-pop live-search">
      <div className="live-radar" style={{ '--aura': portal.color }}><span>{portal.emoji}</span></div>
      <h2 className="pixel-title" style={{ fontSize: '0.9rem' }}>Buscando rival en {portal.name}…</h2>
      <p className="dash-muted" style={{ margin: '10px 0' }}>🟢 {online} {online === 1 ? 'jugadora conectada' : 'jugadoras conectadas'} en HEROW ahora</p>
      <p className="dash-muted">Te emparejamos con otra chica que esté buscando en este portal. ⏱ {seconds} s</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
        <button className="pixel-btn cyan small" onClick={onPractice}>🤖 Practicar vs IA mientras tanto</button>
        <button className="pixel-btn ghost small" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

// ───────── Partida ─────────
function Match({ match, meId, onAgain, onExit }) {
  const { refresh } = usePlayer()
  const me = match.players.find(p => p.userId === meId)
  const rival = match.players.find(p => p.userId !== meId)
  const myHero = getHeroine(me.heroineId) ?? HEROINES[0]
  const rivalHero = getHeroine(rival.heroineId) ?? HEROINES[1]
  const [myChoices, setMyChoices] = useState({}) // n -> índice
  const [timers, setTimers] = useState({}) // n -> ms que quedaban al recibir la ronda (según el reloj del servidor)
  const [bubbles, setBubbles] = useState({}) // userId -> { emoji, key }
  const [lastReaction, setLastReaction] = useState(0)
  const [error, setError] = useState('')
  const ended = useRef(false)

  const { messages, send, status } = useChannel({
    channelId: match.channelId,
    history: 50,
    onMessage: (m) => {
      if (m.sender.id === SERVER_SENDER) {
        if (m.type === 'round') {
          const rn = m.content.n
          // Tiempo restante medido con el reloj del servidor (sin desfases entre relojes).
          api.liveMatch(match.id)
            .then(snap => {
              if (snap.round?.n === rn && snap.round.elapsedMs !== null) {
                setTimers(t => ({ ...t, [rn]: Math.max(0, snap.round.timeLimitMs - snap.round.elapsedMs) }))
              }
            })
            .catch(() => {})
          play('portal')
        }
        if (m.type === 'answered' && m.content.userId !== meId) play('blip')
        if (m.type === 'result') {
          const mine = m.content.players?.[meId]
          play(mine?.outcome === 'win' ? 'win' : mine?.outcome === 'lose' ? 'lose' : 'blip')
          if (mine?.outcome !== 'tie') setTimeout(() => play('hit'), 120)
        }
        if (m.type === 'end') {
          ended.current = true
          play(m.content.winner === meId ? 'win' : 'confirm')
          refresh().catch(() => {})
        }
        return
      }
      // Reacciones: solo de las dos jugadoras y solo de la lista permitida.
      if (m.type === 'reaction' && REACTIONS.includes(m.content?.emoji) && match.players.some(p => p.userId === m.sender.id)) {
        const key = `${m.id}`
        setBubbles(b => ({ ...b, [m.sender.id]: { emoji: m.content.emoji, key } }))
        setTimeout(() => setBubbles(b => (b[m.sender.id]?.key === key ? { ...b, [m.sender.id]: null } : b)), 2500)
      }
    },
  })

  // Si sale de la pantalla a mitad de partida, cuenta como abandono.
  // (Con retraso: React en desarrollo monta dos veces y el 2º montaje lo cancela.)
  const leaveTimer = useRef(null)
  useEffect(() => {
    clearTimeout(leaveTimer.current)
    return () => {
      leaveTimer.current = setTimeout(() => { if (!ended.current) api.liveLeave(match.id).catch(() => {}) }, 400)
    }
  }, [match.id])

  const server = messages.filter(m => m.sender.id === SERVER_SENDER)
  const rounds = server.filter(m => m.type === 'round')
  const roundMsg = rounds.at(-1)
  const current = roundMsg?.content ?? (match.round && { n: match.round.n, question: match.round.question, timeLimitMs: match.round.timeLimitMs })
  const n = current?.n
  const result = server.find(m => m.type === 'result' && m.content.n === n)?.content ?? null
  const rivalAnswered = server.some(m => m.type === 'answered' && m.content.n === n && m.content.userId === rival.userId)
  const end = server.find(m => m.type === 'end')?.content ?? null
  const scores = server.filter(m => m.type === 'result').at(-1)?.content.scores ?? match.scores
  const myChoice = n ? myChoices[n] : undefined

  const choose = (i) => {
    if (!n || myChoice !== undefined || result || end) return
    setMyChoices(c => ({ ...c, [n]: i }))
    play('select')
    api.liveAnswer(match.id, n, i).catch(err => setError(err.code === 'round_closed' ? 'Se acabó el tiempo de esa ronda.' : err.message))
  }

  const sendReaction = (emoji) => {
    const t = nowMs()
    if (t - lastReaction < 1500) return
    setLastReaction(t)
    send({ type: 'reaction', content: { emoji } }).catch(() => {})
  }

  const answerClass = (i) => {
    if (!result) return myChoice === i ? 'picked' : ''
    if (i === result.correctIndex) return 'correct'
    if (i === myChoice) return 'wrong'
    return ''
  }

  const mine = result?.players?.[meId]
  const hit = mine?.outcome === 'win' ? 'rival' : mine?.outcome === 'lose' ? 'hero' : null
  const remaining = n && timers[n] !== undefined ? timers[n] : null

  if (end) {
    const won = end.winner === meId
    const tie = end.winner === null
    const unlocked = server.filter(m => m.type === 'result').flatMap(m => m.content.players?.[meId]?.newlyUnlocked ?? [])
    return (
      <div className="pixel-panel center anim-pop live-end">
        <div style={{ fontSize: '3.5rem' }}>{won ? '🏆' : tie ? '🤝' : '💪'}</div>
        <h2 className="pixel-title" style={{ fontSize: 'clamp(1rem, 3vw, 1.6rem)', color: won ? 'var(--gold)' : '#fff', margin: '12px 0' }}>
          {end.reason === 'left' ? (won ? '¡Ganaste! Tu rival se retiró' : 'Saliste de la partida') : won ? '¡Ganaste el duelo!' : tie ? '¡Empate!' : 'Buen duelo'}
        </h2>
        <p style={{ fontSize: '1.3rem' }}>Marcador: <strong>{end.scores[meId] ?? 0}</strong> – <strong>{end.scores[rival.userId] ?? 0}</strong></p>
        <p className="dash-muted" style={{ margin: '8px 0 16px' }}>Sumaste <strong>+{end.points[meId] ?? 0} puntos</strong> para tu nivel. {won || tie ? '' : 'Cada intento también suma.'}</p>
        {unlocked.length > 0 && <p className="unlock-inline">🎉 ¡Desbloqueaste a {unlocked.map(id => getHeroine(id)?.name).join(', ')}!</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="pixel-btn gold" onClick={onAgain}>⚔️ Otra partida</button>
          <button className="pixel-btn ghost" onClick={onExit}>🏠 Ir a mi dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="live-scoreboard">
        <span className="hud-chip">Ronda {n ?? 0}/{match.rounds}</span>
        <span className="hud-chip live-score">TÚ {scores[meId] ?? 0} – {scores[rival.userId] ?? 0} {rival.username}</span>
        <span className={`hud-chip live-status ${status}`}>{status === 'ready' ? '🟢 En vivo' : '🟡 Conectando…'}</span>
      </div>

      <div className="arena-stage">
        <div className={`fighter ${hit === 'hero' ? 'anim-shake anim-flash' : ''}`} style={{ '--aura': PORTALS[myHero.portal].color }}>
          {bubbles[meId] && <span className="reaction-bubble" key={bubbles[meId].key}>{bubbles[meId].emoji}</span>}
          {result && <span className="float-number" key={`p${n}`}>+{mine?.points ?? 0}</span>}
          <img src={myHero.sprite} alt={myHero.name} className="pixel-img" />
          <div><span className="fighter-name">TÚ · {me.username}</span></div>
          <div className={`status ${myChoice !== undefined ? 'done' : ''}`}>{current && !result ? (myChoice !== undefined ? '¡Respondido!' : 'Pensando…') : ''}</div>
        </div>
        <div className="vs-pixel">VS</div>
        <div className={`fighter rival ${hit === 'rival' ? 'anim-shake anim-flash' : ''}`} style={{ '--aura': PORTALS[rivalHero.portal].color }}>
          {bubbles[rival.userId] && <span className="reaction-bubble" key={bubbles[rival.userId].key}>{bubbles[rival.userId].emoji}</span>}
          <img src={rivalHero.sprite} alt={rivalHero.name} className="pixel-img" />
          <div><span className="fighter-name">{rival.username} · {rivalHero.name}</span></div>
          <div className={`status ${rivalAnswered ? 'done' : ''}`}>{current && !result ? (rivalAnswered ? '¡Respondió!' : 'Pensando…') : ''}</div>
        </div>
      </div>

      {!current && (
        <div className="pixel-panel center anim-pop">
          <h2 className="pixel-title" style={{ fontSize: '0.9rem' }}>¡Rival encontrada! 🎉</h2>
          <p className="dash-muted" style={{ marginTop: 8 }}>{rival.username} juega como {rivalHero.name}. La primera pregunta llega en segundos…</p>
        </div>
      )}

      {current && (
        <div className="pixel-panel question-panel anim-pop" key={`q${n}`}>
          {!result && (
            <div className="pixel-bar timer-bar">
              <div
                key={`t${n}-${remaining}`}
                className="pixel-bar-fill"
                style={{ width: "100%", animation: remaining === null ? "none" : `timer-shrink ${remaining}ms linear forwards` }}
              />
            </div>
          )}
          <div className="q-type"><span className="pixel-tag">{ROUND_LABELS[current.question.type]}</span></div>
          <p className="q-text">{current.question.text}</p>
          <div className="answers">
            {current.question.options.map((text, i) => (
              <button key={text} className={`answer-btn ${answerClass(i)}`} onClick={() => choose(i)} disabled={myChoice !== undefined || Boolean(result)}>
                {text}
                {result && result.players?.[rival.userId]?.choice === i && <span className="rival-pick">👤 {rival.username}</span>}
              </button>
            ))}
          </div>
          {error && <p className="form-error" style={{ marginTop: 12 }} onClick={() => setError('')}>{error}</p>}
          {result && (
            <div className="result-banner anim-pop">
              <h3 className="pixel-title" style={{ color: OUTCOME[mine?.outcome ?? 'tie'].color }}>
                {OUTCOME[mine?.outcome ?? 'tie'].title} +{mine?.points ?? 0} pts
              </h3>
              <p>{!mine?.answered ? '⏰ No alcanzaste a responder. ' : ''}{result.explain}</p>
              {mine?.newlyUnlocked?.length > 0 && <p className="unlock-inline">🎉 ¡Desbloqueaste a {mine.newlyUnlocked.map(id => getHeroine(id)?.name).join(', ')}!</p>}
              <p className="dash-muted">{n < match.rounds ? 'La siguiente pregunta llega en unos segundos…' : 'Calculando el resultado final…'}</p>
            </div>
          )}
        </div>
      )}

      <div className="reactions-bar" aria-label="Reacciones">
        {REACTIONS.map(e => (
          <button key={e} className="reaction-btn" onClick={() => sendReaction(e)} title="Enviar reacción">{e}</button>
        ))}
        <span className="dash-muted">Solo reacciones: en HEROW no hay chat.</span>
      </div>
    </>
  )
}

export default function LiveCombat() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, session } = usePlayer()
  const hero = getHeroine(state.profile.heroineId) ?? HEROINES[0]
  const portal = PORTALS[location.state?.portal ?? state.profile.portalId ?? hero.portal] ?? PORTALS.code

  const [phase, setPhase] = useState('searching') // searching | nomatch | match | error
  const [attempt, setAttempt] = useState(0)
  const [match, setMatch] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (phase !== 'searching') return
    let cancelled = false
    // Cada búsqueda tiene su ticket: cancelar una búsqueda vieja nunca cancela la nueva.
    const ticket = crypto.randomUUID()
    const started = Date.now()
    // El servidor responde cada 25 s si no hay pareja: se vuelve a pedir sola hasta 2 minutos.
    const search = async () => {
      try {
        while (!cancelled && Date.now() - started < SEARCH_MAX_MS) {
          const r = await api.liveQueue(portal.id, ticket)
          if (cancelled) return
          if (r.matched) {
            setMatch(r.match)
            setPhase('match')
            play('boss')
            return
          }
          if (r.cancelled) return // otra búsqueda la reemplazó
        }
        if (!cancelled) setPhase('nomatch')
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setPhase('error')
      }
    }
    search()
    return () => {
      cancelled = true
      api.liveCancel(ticket).catch(() => {})
    }
  }, [phase, attempt, portal.id])

  const again = () => {
    play('confirm')
    setMatch(null)
    setAttempt(a => a + 1)
    setPhase('searching')
  }

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.arena[portal.id]} fallback={BACKGROUNDS.arena.code} dim={0.25} />
      <div className="hud">
        <button className="pixel-btn ghost small" onClick={() => navigate('/multiverso')}>◀ Salir</button>
        <span className="hud-chip" style={{ borderColor: portal.color }}>{portal.emoji} {portal.name} · ⚔️ EN VIVO</span>
        <span className="hud-chip">🏆 {state.profile.points}{state.next ? ` / ${state.next.pointsNeeded}` : ''}</span>
      </div>
      <div className="scene-content arena">
        {phase === 'searching' && (
          <Searching
            portal={portal}
            onCancel={() => navigate('/multiverso')}
            onPractice={() => navigate('/combate', { state: { portal: portal.id } })}
          />
        )}
        {phase === 'nomatch' && (
          <div className="pixel-panel center anim-pop">
            <h2 className="pixel-title" style={{ fontSize: '0.9rem' }}>Nadie más está buscando ahora</h2>
            <p className="dash-muted" style={{ margin: '12px 0 16px' }}>Invita a una amiga a entrar al mismo portal, o practica contra una rival IA mientras tanto.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="pixel-btn gold" onClick={again}>🔄 Seguir buscando</button>
              <button className="pixel-btn cyan" onClick={() => navigate('/combate', { state: { portal: portal.id } })}>🤖 Practicar vs IA</button>
            </div>
          </div>
        )}
        {phase === 'error' && (
          <div className="pixel-panel center">
            <p className="form-error">{error}</p>
            <button className="pixel-btn gold" style={{ marginTop: 12 }} onClick={again}>Reintentar</button>
          </div>
        )}
        {phase === 'match' && match && (
          <Match key={match.id} match={match} meId={session.user.id} onAgain={again} onExit={() => navigate('/dashboard')} />
        )}
      </div>
    </div>
  )
}
