import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { KIND_LABEL, MODALITY_LABEL, formatEventDate } from '../data/conecta'
import { PORTALS } from '../data/heroines'
import { api } from '../lib/api'
import { play } from '../lib/sfx'

// Panel del equipo HEROW: verificar mentoras y revisar lo que la moderación automática no pudo.
// El token vive solo en esta pestaña (sessionStorage).
const TOKEN_KEY = 'herow:admin-token'
const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
const setTokenStore = (v) => { try { if (v) sessionStorage.setItem(TOKEN_KEY, v); else sessionStorage.removeItem(TOKEN_KEY) } catch { /* nada */ } }

const MENTOR_STATUS = { pending: '⏳ Pendiente', approved: '🟢 Aprobada', paused: '⏸️ En pausa', rejected: '⚪ Rechazada' }

const portalsText = (list) => (list ?? []).map(p => `${PORTALS[p]?.emoji ?? ''} ${PORTALS[p]?.name ?? p}`).join(' · ')

export default function MentorasAdmin() {
  const [token, setToken] = useState(getToken)
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [codes, setCodes] = useState({})
  const [filter, setFilter] = useState('pending')

  const load = useCallback(async (t) => {
    try {
      const d = await api.adminQueue(t)
      setData(d)
      setError('')
      return true
    } catch (err) {
      setError(err.status === 404 ? 'El panel está apagado: configura ADMIN_TOKEN en el servidor.' : err.message)
      return false
    }
  }, [])

  useEffect(() => {
    if (!token) return
    let alive = true
    api.adminQueue(token).then(d => alive && setData(d)).catch(err => alive && setError(err.message))
    return () => { alive = false }
  }, [token])

  const act = async (fn) => {
    try {
      const r = await fn()
      play('select')
      await load(token)
      return r
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  const resetCode = async (m) => {
    const r = await act(() => api.adminResetCode(token, m.id))
    if (r?.code) setCodes(c => ({ ...c, [m.id]: r.code }))
  }

  if (!token || !data) {
    return (
      <div className="scene">
        <SceneBg src={BACKGROUNDS.map} fallback={BACKGROUNDS.hub} dim={0.8} />
        <div className="scene-content dash-wrap" data-clarity-mask="true">
          <form className="pixel-panel auth-form" style={{ maxWidth: 520, margin: '60px auto' }}
            onSubmit={async e => { e.preventDefault(); if (await load(input.trim())) { setTokenStore(input.trim()); setToken(input.trim()) } }}>
            <h1 className="pixel-title" style={{ fontSize: '0.9rem' }}>🛡️ Equipo HEROW · Mentoras</h1>
            <p className="dash-muted">Ingresa el token del panel (ADMIN_TOKEN). Solo queda guardado en esta pestaña.</p>
            <label>Token<input type="password" value={input} onChange={e => setInput(e.target.value)} autoComplete="off" required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="pixel-btn gold" type="submit">Entrar</button>
            <Link className="legal-link" to="/">Volver</Link>
          </form>
        </div>
      </div>
    )
  }

  const mentors = data.mentors.filter(m => filter === 'all' || m.status === filter)
  const pendingCount = data.mentors.filter(m => m.status === 'pending').length

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.map} fallback={BACKGROUNDS.hub} dim={0.8} />
      <div className="scene-content dash-wrap" data-clarity-mask="true">
        <nav className="game-nav">
          <span className="game-nav-name">🛡️ Equipo HEROW · Revisión</span>
          <div className="game-nav-links">
            <button className="pixel-btn ghost small" onClick={() => load(token)}>🔄 Actualizar</button>
            <button className="pixel-btn ghost small" onClick={() => { setTokenStore(''); setToken(''); setData(null) }}>Salir</button>
          </div>
        </nav>
        {error && <p className="form-error" role="alert" onClick={() => setError('')}>{error}</p>}

        {data.kpis && (
          <section className="pixel-panel">
            <h2 className="dash-h">📊 KPIs de impacto</h2>
            <p className="dash-muted">Calculados desde la base de datos. El comportamiento en pantalla (clics, embudos, mapas de calor) está en Microsoft Clarity.</p>
            <div className="impact-strip conecta-stats kpi-strip">
              <div className="impact-item"><strong>{data.kpis.mentorsApproved}</strong><span>mentoras activas ({data.kpis.mentorsPending} por verificar)</span></div>
              <div className="impact-item"><strong>{data.kpis.girlsConnected30d}</strong><span>chicas conectadas con mentoras (30 días)</span></div>
              <div className="impact-item"><strong>{data.kpis.rsvps}</strong><span>inscripciones a eventos</span></div>
              <div className="impact-item"><strong>{data.kpis.follows ?? 0}</strong><span>seguimientos a mentoras</span></div>
              <div className="impact-item"><strong>{data.kpis.helpful ?? 0}</strong><span>“me ayudó” en respuestas</span></div>
              <div className="impact-item"><strong>{data.kpis.answerRate ?? '—'}{data.kpis.answerRate != null ? '%' : ''}</strong><span>preguntas respondidas ({data.kpis.answered}/{data.kpis.questions})</span></div>
              <div className="impact-item"><strong>{data.kpis.medianAnswerHours ?? '—'}{data.kpis.medianAnswerHours != null ? ' h' : ''}</strong><span>tiempo típico de respuesta</span></div>
              <div className="impact-item"><strong>{data.kpis.offlineGirls30d}</strong><span>chicas que practicaron sin internet (30 días)</span></div>
              <div className="impact-item"><strong>{data.kpis.offlineAnswers30d}</strong><span>respuestas sincronizadas sin señal (30 días)</span></div>
            </div>
          </section>
        )}

        <section className="pixel-panel">
          <div className="dash-level-head">
            <h2 className="dash-h">👩‍🔬 Mentoras ({pendingCount} por verificar)</h2>
            <div className="dash-tabs">
              {[['pending', 'Pendientes'], ['approved', 'Aprobadas'], ['paused', 'En pausa'], ['all', 'Todas']].map(([id, label]) => (
                <button key={id} className={`pixel-btn small ${filter === id ? 'gold' : 'ghost'}`} onClick={() => setFilter(id)}>{label}</button>
              ))}
            </div>
          </div>
          <p className="dash-muted">Antes de aprobar: revisa su LinkedIn, que sea mayor de edad y que su historia no tenga datos de contacto.</p>
          {mentors.length ? (
            <div className="opp-grid">
              {mentors.map(m => (
                <article key={m.id} className="opp-card">
                  <header className="opp-head">
                    <span className="opp-type">{MENTOR_STATUS[m.status]}</span>
                    <span className="conecta-date">{new Date(m.createdAt).toLocaleDateString('es-PE')}</span>
                  </header>
                  <h3 className="opp-title">{m.name}</h3>
                  <p className="opp-source">{m.role}{m.org ? ` · ${m.org}` : ''} · {m.email}</p>
                  <div className="opp-tags"><span>{portalsText(m.portals)}</span>{m.region && <span>🗺️ {m.region}</span>}</div>
                  {m.linkedin
                    ? <a className="legal-link" href={m.linkedin} target="_blank" rel="noreferrer noopener">🔎 Verificar LinkedIn ↗</a>
                    : <p className="opp-closed">Sin LinkedIn: verifica por otro medio.</p>}
                  <p className="opp-summary"><strong>Historia:</strong> {m.story}</p>
                  <p className="opp-summary"><strong>Consejo:</strong> {m.advice}</p>
                  <p className="opp-reason">💫 {m.powerup}</p>
                  {codes[m.id] && <p className="mentor-code small">{codes[m.id]}</p>}
                  <div className="opp-actions">
                    {m.status !== 'approved' && <button className="pixel-btn gold small" onClick={() => act(() => api.adminMentor(token, m.id, 'approved'))}>✅ Aprobar</button>}
                    {m.status === 'pending' && <button className="pixel-btn ghost small" onClick={() => act(() => api.adminMentor(token, m.id, 'rejected'))}>Rechazar</button>}
                    {m.status === 'approved' && <button className="pixel-btn ghost small" onClick={() => act(() => api.adminMentor(token, m.id, 'paused'))}>⏸️ Pausar</button>}
                    <button className="pixel-btn ghost small" onClick={() => resetCode(m)}>🔑 Nuevo código</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="dash-empty">Nada por aquí.</p>}
        </section>

        <section className="pixel-panel">
          <h2 className="dash-h">📅 Eventos en revisión ({data.events.length})</h2>
          {data.events.length ? (
            <div className="opp-grid">
              {data.events.map(e => (
                <article key={e.id} className="opp-card">
                  <header className="opp-head">
                    <span className="opp-type">{KIND_LABEL[e.kind]?.emoji} {KIND_LABEL[e.kind]?.label}</span>
                    <span className="conecta-date">{formatEventDate(e.startsAt)}</span>
                  </header>
                  <h3 className="opp-title">{e.title}</h3>
                  <p className="opp-source">{e.mentor?.name} · {MODALITY_LABEL[e.modality]}{e.place ? ` · ${e.place}` : ''}</p>
                  <p className="opp-summary">{e.description}</p>
                  {e.url && <a className="legal-link" href={e.url} target="_blank" rel="noreferrer noopener">{e.url} ↗</a>}
                  <div className="opp-actions">
                    <button className="pixel-btn gold small" onClick={() => act(() => api.adminEvent(token, e.id, 'published'))}>✅ Publicar</button>
                    <button className="pixel-btn ghost small" onClick={() => act(() => api.adminEvent(token, e.id, 'cancelled'))}>Rechazar</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="dash-empty">Ningún evento esperando revisión.</p>}
        </section>

        <section className="pixel-panel">
          <h2 className="dash-h">💬 Preguntas y respuestas en revisión ({data.questions.length})</h2>
          {data.questions.length ? (
            <div className="conecta-wall">
              {data.questions.map(q => (
                <article key={q.id} className="pixel-panel conecta-qa">
                  <p className="conecta-who">Nivel {q.level}{q.portal ? ` · ${PORTALS[q.portal]?.name}` : ''}{q.answer ? ' · revisar la RESPUESTA' : ' · revisar la PREGUNTA'}</p>
                  <p className="conecta-q">“{q.question}”</p>
                  {q.answer && <div className="conecta-a"><small>{q.answeredBy?.name}</small><p>{q.answer}</p></div>}
                  <div className="opp-actions">
                    <button className="pixel-btn gold small" onClick={() => act(() => api.adminQuestion(token, q.id, 'approve'))}>✅ Aprobar</button>
                    <button className="pixel-btn ghost small" onClick={() => act(() => api.adminQuestion(token, q.id, 'hide'))}>🙈 Ocultar</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="dash-empty">Nada esperando revisión.</p>}
        </section>
      </div>
    </div>
  )
}
