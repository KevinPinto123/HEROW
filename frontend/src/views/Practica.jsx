import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GameNav from '../components/GameNav'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { PORTALS } from '../data/heroines'
import {
  LAST_USER_KEY, ensurePack, readPack, readPractice, readStore, savePracticeAnswer, since, syncNow, useOnline,
  useQueueVersion, userKey, uuid, writeStore,
} from '../lib/offline'
import { EVENTS, track } from '../lib/analytics'
import { usePwa } from '../lib/pwa'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const ROUND_SIZE = 5
const now = () => performance.now()
const TYPE_LABEL = { elegir: '🔍 Elegir', ordenar: '📋 Ordenar', error: '🐛 Detectar el error', decidir: '💡 Decidir' }

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 5 preguntas del portal, evitando las que vio hace poco. */
function buildRound(pack, portal, seen) {
  const all = pack.questions.filter(q => q.portal === portal)
  const fresh = all.filter(q => !seen.includes(q.id))
  const pool = fresh.length >= ROUND_SIZE ? fresh : all
  return shuffle(pool).slice(0, ROUND_SIZE).map(q => ({
    ...q,
    // Barajamos las opciones pero guardamos el índice original (el servidor corrige con ese).
    order: shuffle(q.options.map((_, i) => i)),
  }))
}

export default function Practica() {
  const navigate = useNavigate()
  const online = useOnline()
  const { session, state, userId: sessionUser, setState } = usePlayer()
  useQueueVersion()
  const { canInstall, install, offlineReady } = usePwa()

  // Sin señal la sesión puede vencer: seguimos guardando para la última usuaria de este dispositivo.
  const userId = sessionUser ?? (online ? null : readStore(LAST_USER_KEY))
  const [pack, setPack] = useState(readPack)
  const [portal, setPortal] = useState(null)
  const [round, setRound] = useState([])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [startedAt, setStartedAt] = useState(0)
  const [results, setResults] = useState([])
  const [syncMsg, setSyncMsg] = useState('')
  const [syncing, setSyncing] = useState(false)

  const pending = userId ? readPractice(userId).length : 0
  const seenKey = userKey(userId, 'practice-seen')

  useEffect(() => {
    let alive = true
    if (online) ensurePack().then(p => { if (alive && p) setPack(p) })
    return () => { alive = false }
  }, [online])

  const counts = useMemo(() => {
    const c = {}
    for (const q of pack?.questions ?? []) c[q.portal] = (c[q.portal] ?? 0) + 1
    return c
  }, [pack])

  const start = (p) => {
    play('confirm')
    setPortal(p)
    setRound(buildRound(pack, p, readStore(seenKey, [])))
    setI(0)
    setPicked(null)
    setResults([])
    setStartedAt(now())
  }

  const q = round[i]
  const answer = (originalIndex) => {
    if (picked !== null) return
    const correct = originalIndex === q.answer
    play(correct ? 'win' : 'lose')
    setPicked(originalIndex)
    setResults(r => [...r, correct])
    writeStore(seenKey, [q.id, ...readStore(seenKey, []).filter(id => id !== q.id)].slice(0, 40))
    if (userId) {
      savePracticeAnswer(userId, {
        id: uuid(),
        questionId: q.id,
        choice: originalIndex,
        ms: Math.round(now() - startedAt),
        answeredAt: new Date().toISOString(),
        portal: q.portal,
        correct,
      })
    }
  }

  const next = () => {
    play('blip')
    if (i + 1 >= round.length) {
      track(EVENTS.practicaRonda, { portal, modo: online ? 'online' : 'offline' })
      if (!online) track(EVENTS.practicaSinSenal)
    }
    setPicked(null)
    setI(n => n + 1)
    setStartedAt(now())
  }

  const sync = async () => {
    setSyncing(true)
    setSyncMsg('')
    const r = await syncNow(userId)
    setSyncing(false)
    const p = r?.practice
    if (p?.state) setState(s => ({ ...s, ...p.state }))
    if (p?.schemaOutdated) setSyncMsg('El servidor todavía no recibe prácticas sin internet. Tus respuestas siguen guardadas aquí.')
    else if (p?.accepted) setSyncMsg(`☁️ ¡Listo! ${p.accepted} respuestas sumaron +${p.pointsAwarded} puntos${p.capped ? ' (llegaste al tope del día)' : ''}.`)
    else if (readPractice(userId).length) setSyncMsg('No se pudo enviar todavía. Lo reintentamos solo cuando la señal sea estable.')
    else setSyncMsg('Todo está sincronizado. ✅')
  }

  const rules = pack?.rules ?? { correct: 4, wrong: 1, dailyCap: 60 }
  const done = round.length > 0 && i >= round.length
  const score = results.filter(Boolean).length
  const earned = score * rules.correct + (results.length - score) * rules.wrong

  return (
    <div className="scene">
      <SceneBg src={portal ? BACKGROUNDS.arena[portal] : BACKGROUNDS.hub} fallback={BACKGROUNDS.hub} dim={0.75} />
      <div className="scene-content dash-wrap practica-wrap">
        {session && state?.profile ? <GameNav /> : (
          <nav className="game-nav">
            <span className="game-nav-name">HEROW · Práctica sin internet</span>
            <div className="game-nav-links">
              <Link className="pixel-btn ghost small" to="/">🏠 Inicio</Link>
              <Link className="pixel-btn ghost small" to="/arcade">🕹️ Arcade</Link>
              {online && <Link className="pixel-btn gold small" to="/entrar">Entrar</Link>}
            </div>
          </nav>
        )}

        <section className="pixel-panel practica-head">
          <div>
            <h1 className="dash-h">📡 Práctica sin internet</h1>
            <p className="dash-muted">
              Responde preguntas de los portales aunque no tengas señal. Cada acierto suma <strong>+{rules.correct}</strong> y
              cada intento <strong>+{rules.wrong}</strong> (hasta {rules.dailyCap} puntos al día). Se suman a tu nivel cuando vuelva el internet.
            </p>
            {!userId && (
              <p className="conecta-offline">Estás practicando como invitada: tus respuestas no se guardan. <Link to="/entrar">Entra a tu cuenta</Link> para que sumen.</p>
            )}
          </div>
          <div className="practica-status">
            <span className={`practica-pill ${online ? 'on' : 'off'}`}>{online ? '📶 Con señal' : '📡 Sin señal'}</span>
            {userId && <span className="practica-pill">{pending ? `⏳ ${pending} por sincronizar` : '✅ Todo sincronizado'}</span>}
            <span className="practica-pill">{offlineReady ? '💾 App guardada en este dispositivo' : '💾 Ábrela una vez con señal para guardarla'}</span>
            {online && pending > 0 && <button className="pixel-btn cyan small" disabled={syncing} onClick={sync}>{syncing ? 'Enviando…' : '☁️ Sincronizar ahora'}</button>}
            {canInstall && <button className="pixel-btn gold small" onClick={() => { play('confirm'); install() }}>📲 Instalar HEROW</button>}
          </div>
          {syncMsg && <p className="conecta-sent" role="status">{syncMsg}</p>}
        </section>

        {!pack && (
          <section className="pixel-panel">
            <h2 className="dash-h">Necesitas señal una vez</h2>
            <p className="dash-muted">
              {online
                ? 'Descargando el paquete de preguntas…'
                : 'Abre esta pantalla una vez con internet (con tu cuenta) y el paquete de preguntas quedará guardado para practicar sin señal.'}
            </p>
            <p className="dash-muted" style={{ marginTop: 8 }}>
              ¿Tu colegio no tiene internet? Tu docente puede imprimir el <Link to="/kit">Kit HEROW sin internet</Link>.
            </p>
          </section>
        )}

        {pack && !portal && (
          <section className="pixel-panel">
            <h2 className="dash-h">Elige un portal</h2>
            <p className="dash-muted">Paquete guardado {since(pack.savedAt)} · {pack.questions.length} preguntas.</p>
            <div className="practica-portals">
              {Object.values(PORTALS).map(p => (
                <button key={p.id} className="practica-portal" style={{ '--aura': p.color }} onClick={() => start(p.id)} disabled={!counts[p.id]}>
                  <span className="practica-portal-emoji">{p.emoji}</span>
                  <strong>{p.name}</strong>
                  <small>{counts[p.id] ?? 0} preguntas</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {pack && portal && q && (
          <section className="pixel-panel practica-card" style={{ '--aura': PORTALS[portal].color }}>
            <div className="dash-level-head">
              <span className="pixel-tag">{PORTALS[portal].emoji} {PORTALS[portal].name}</span>
              <span className="pixel-tag">{TYPE_LABEL[q.type] ?? q.type} · {i + 1}/{round.length}</span>
            </div>
            <p className="practica-question">{q.text}</p>
            <div className="practica-options">
              {q.order.map(idx => {
                const state = picked === null ? '' : idx === q.answer ? 'right' : idx === picked ? 'wrong' : 'dim'
                return (
                  <button key={idx} className={`practica-option ${state}`} onClick={() => answer(idx)} disabled={picked !== null}>
                    {q.options[idx]}
                  </button>
                )
              })}
            </div>
            {picked !== null && (
              <div className="practica-feedback">
                <p><strong>{picked === q.answer ? `✅ ¡Correcto! +${rules.correct}` : `💪 Casi. +${rules.wrong} por intentarlo`}</strong></p>
                <p>{q.explain}</p>
                <button className="pixel-btn gold" onClick={next}>{i + 1 < round.length ? 'Siguiente ▶' : 'Ver resultado ▶'}</button>
              </div>
            )}
          </section>
        )}

        {pack && portal && done && (
          <section className="pixel-panel practica-card center">
            <div style={{ fontSize: '3rem' }} className="anim-pop">{score >= 4 ? '🏆' : score >= 2 ? '⭐' : '💪'}</div>
            <h2 className="dash-h">{score} de {round.length} correctas</h2>
            <p className="dash-muted">
              {userId
                ? `Ganaste hasta +${earned} puntos. ${online ? 'Se suman al sincronizar.' : 'Se sumarán solos cuando vuelva la señal.'}`
                : 'Entra a tu cuenta para que tus prácticas sumen puntos.'}
            </p>
            <div className="practica-again">
              <button className="pixel-btn gold" onClick={() => start(portal)}>🔁 Otra ronda</button>
              <button className="pixel-btn ghost" onClick={() => { play('blip'); setPortal(null); setRound([]) }}>Cambiar de portal</button>
              {session && <button className="pixel-btn ghost" onClick={() => navigate('/dashboard')}>🏠 Mi base</button>}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
