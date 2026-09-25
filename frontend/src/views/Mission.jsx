import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameNav from '../components/GameNav'
import PixelDialog from '../components/PixelDialog'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { api } from '../lib/api'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

function Step({ n, title, done, locked, children }) {
  return (
    <section className={`pixel-panel mission-step ${done ? 'done' : ''} ${locked ? 'locked' : ''}`}>
      <h2 className="dash-h">
        <span className="step-n">{done ? '✔' : n}</span> {title}
      </h2>
      {children}
    </section>
  )
}

function Feedback({ sub }) {
  if (!sub?.feedback) return null
  const approved = sub.status === 'approved'
  return (
    <div className={`mission-feedback ${approved ? 'ok' : 'retry'}`}>
      <strong>{approved ? `✔ ¡Aprobado! ${sub.score}/100` : `✎ Casi: ${sub.score}/100. Mejora y vuelve a enviar.`}</strong>
      <p>{sub.feedback.text}</p>
      {sub.feedback.strengths?.length > 0 && (
        <>
          <em>Lo que hiciste bien</em>
          <ul>{sub.feedback.strengths.map(s => <li key={s}>{s}</li>)}</ul>
        </>
      )}
      {sub.feedback.improvements?.length > 0 && (
        <>
          <em>Para mejorar</em>
          <ul>{sub.feedback.improvements.map(s => <li key={s}>{s}</li>)}</ul>
        </>
      )}
    </div>
  )
}

export default function Mission() {
  const navigate = useNavigate()
  const { state, setState } = usePlayer()
  const next = state.next
  const [fields, setFields] = useState(() => next?.lastBuild?.content ?? {})
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(null) // 'build' | 'real'
  const [error, setError] = useState('')

  if (!next) {
    return (
      <div className="scene">
        <SceneBg src={BACKGROUNDS.mission} fallback={BACKGROUNDS.victory} dim={0.6} />
        <div className="scene-content dash-wrap">
          <GameNav />
          <div className="pixel-panel"><h1 className="dash-h">⭐ ¡Completaste todas las misiones!</h1></div>
        </div>
      </div>
    )
  }

  const { mission } = next
  const submitBuild = async (e) => {
    e.preventDefault()
    setError('')
    setBusy('build')
    play('select')
    try {
      const r = await api.missionBuild(fields)
      setState(r.state)
      play(r.submission.status === 'approved' ? 'win' : 'blip')
    } catch (err) {
      setError(err.message)
      play('lose')
    } finally {
      setBusy(null)
    }
  }

  const submitReal = async (e) => {
    e.preventDefault()
    setError('')
    setBusy('real')
    try {
      const r = await api.missionReal(url)
      setState(r.state)
      play('win')
    } catch (err) {
      setError(err.message)
      play('lose')
    } finally {
      setBusy(null)
    }
  }

  const pct = Math.min(100, Math.round((state.profile.points / next.pointsNeeded) * 100))

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.mission} fallback={BACKGROUNDS.awakening} dim={0.7} />
      <div className="scene-content dash-wrap mission-wrap">
        <GameNav />
        <div className="center" style={{ margin: '8px 0 4px' }}>
          <span className="pixel-tag">Misión para el nivel {next.targetLevel} · {next.targetName}</span>
          <h1 className="pixel-title" style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', margin: '14px 0' }}>🎯 {mission.title}</h1>
        </div>
        <PixelDialog text={mission.intro} />
        {error && <p className="form-error" role="alert">{error}</p>}

        <Step n={1} title={`Reúne ${next.pointsNeeded} puntos jugando`} done={next.pointsDone}>
          <div className="pixel-bar" style={{ margin: '10px 0' }}><div className="pixel-bar-fill" style={{ width: `${pct}%` }} /></div>
          <p className="dash-muted">🏆 {state.profile.points} / {next.pointsNeeded}. Ganas +10 por victoria y +5 por intentarlo.</p>
          {!next.pointsDone && <button className="pixel-btn cyan small" onClick={() => navigate('/multiverso')}>⚔️ Ir a jugar</button>}
        </Step>

        <Step n={2} title={`${mission.title} (lo revisa YessenIA)`} done={next.buildDone}>
          <form className="mission-form" onSubmit={submitBuild}>
            {mission.fields.map(f => {
              const value = fields[f.key] ?? ''
              const Input = f.type === 'textarea' ? 'textarea' : 'input'
              return (
                <label key={f.key}>
                  {f.label}
                  <Input
                    value={value}
                    rows={f.type === 'textarea' ? 5 : undefined}
                    maxLength={f.max}
                    placeholder={f.placeholder}
                    onChange={e => setFields(v => ({ ...v, [f.key]: e.target.value }))}
                    disabled={busy === 'build'}
                    required
                  />
                  <small className={value.trim().length < f.min ? 'warn' : ''}>
                    {value.trim().length}/{f.max} · mínimo {f.min}
                  </small>
                </label>
              )
            })}
            <details className="mission-rubric">
              <summary>¿Qué revisa YessenIA?</summary>
              <ul>{mission.rubric.map(r => <li key={r}>{r}</li>)}</ul>
            </details>
            <button className="pixel-btn gold" type="submit" disabled={busy === 'build'}>
              {busy === 'build' ? 'YessenIA está revisando…' : next.buildDone ? 'Enviar nueva versión' : '✨ Enviar a revisión'}
            </button>
          </form>
          <Feedback sub={next.lastBuild} />
        </Step>

        <Step n={3} title={mission.real.title} done={next.realDone} locked={!next.buildDone}>
          {!next.buildDone && <p className="dash-muted">🔒 Se activa cuando YessenIA apruebe tu trabajo.</p>}
          <ol className="mission-real-steps">
            {mission.real.steps.map(s => <li key={s}>{s}</li>)}
          </ol>
          {mission.real.needsUrl ? (
            next.realDone ? (
              <p className="mission-feedback ok">✔ Publicado: <a href={next.lastReal?.content?.url} target="_blank" rel="noreferrer noopener">{next.lastReal?.content?.url}</a></p>
            ) : (
              <form className="mission-form" onSubmit={submitReal}>
                <label>
                  Enlace de tu publicación
                  <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" disabled={!next.buildDone || busy === 'real'} required />
                  <small>Aceptamos: {mission.real.domains.join(', ')}</small>
                </label>
                <button className="pixel-btn gold" type="submit" disabled={!next.buildDone || busy === 'real'}>
                  {busy === 'real' ? 'Verificando…' : '🌎 Confirmar publicación'}
                </button>
              </form>
            )
          ) : (
            <button className="pixel-btn cyan" disabled={!next.buildDone} onClick={() => navigate('/dashboard')}>🎓 Ir a mis oportunidades</button>
          )}
        </Step>

        <Step n={4} title="Vence al NoPuedo y sube de nivel" done={false} locked={!next.ready}>
          {next.ready
            ? <button className="pixel-btn gold big" onClick={() => { play('boss'); navigate('/boss') }}>👾 Enfrentar al NoPuedo</button>
            : <p className="dash-muted">🔒 Completa los pasos 1, 2 y 3 para enfrentarlo.</p>}
        </Step>
      </div>
    </div>
  )
}
