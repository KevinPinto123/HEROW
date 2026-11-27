import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { EVENT_KINDS, KIND_LABEL, MENTOR_CODE_KEY, MODALITIES, MODALITY_LABEL, REGIONS, formatEventDate } from '../data/conecta'
import { PORTALS } from '../data/heroines'
import { EVENTS, setTag, track } from '../lib/analytics'
import { api } from '../lib/api'
import { readStore, removeStore, writeStore } from '../lib/offline'
import { play } from '../lib/sfx'

const STATUS_TEXT = {
  pending: '⏳ Tu postulación está en revisión. Te escribiremos al correo cuando estés verificada.',
  paused: '⏸️ Tu cuenta está en pausa. Escríbenos si quieres reactivarla.',
  rejected: 'Tu postulación no fue aprobada esta vez. Gracias por querer sumar. 💜',
}

const isFuture = (iso) => Date.parse(iso) > Date.now()

const EVENT_STATUS = { published: '🟢 Publicado', review: '🛡️ En revisión del equipo', cancelled: '⚪ Cancelado' }

function Login({ onCode, error }) {
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  return (
    <form className="pixel-panel auth-form" style={{ maxWidth: 520, margin: '40px auto' }} onSubmit={e => { e.preventDefault(); onCode(code.trim(), remember) }}>
      <h1 className="pixel-title" style={{ fontSize: '0.9rem' }}>🛡️ Panel de mentora</h1>
      <p className="dash-muted">Ingresa el código que recibiste al postular (HRW-XXXX-XXXX-XXXX).</p>
      <label>Código<input value={code} onChange={e => setCode(e.target.value)} placeholder="HRW-" autoComplete="off" autoCapitalize="characters" required /></label>
      <label className="waitlist-consent">
        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
        <span>Recordarlo en este dispositivo (no lo marques en una compu compartida).</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="pixel-btn gold" type="submit">Entrar ▶</button>
      <p className="form-note">¿Aún no postulas? <Link className="legal-link" to="/mentoras#postular">Hazlo aquí</Link>. ¿Perdiste tu código? Escríbenos y te damos uno nuevo.</p>
    </form>
  )
}

function Inbox({ inbox, code, onDone }) {
  const [drafts, setDrafts] = useState({})
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState({})

  const send = async (q) => {
    setBusy(q.id)
    setMsg(m => ({ ...m, [q.id]: null }))
    try {
      const r = await api.mentorAnswer(code, q.id, (drafts[q.id] ?? '').trim())
      play('win')
      track(EVENTS.mentoraRespondio)
      setMsg(m => ({ ...m, [q.id]: { ok: true, text: r.status === 'answered' ? '✅ ¡Publicada! Gracias por abrirle la puerta.' : '🛡️ Enviada: el equipo la revisa antes de publicarla.' } }))
      setTimeout(onDone, 1200)
    } catch (err) {
      play('lose')
      setMsg(m => ({ ...m, [q.id]: { ok: false, text: err.message } }))
    } finally {
      setBusy(null)
    }
  }

  if (!inbox.length) return <p className="dash-empty">No hay preguntas pendientes en tus portales. ¡Vuelve pronto!</p>
  return (
    <div className="conecta-wall">
      {inbox.map(q => (
        <article key={q.id} className="pixel-panel conecta-qa">
          <p className="conecta-who">
            Una heroína de nivel {q.level}{q.portal ? ` · ${PORTALS[q.portal]?.emoji} ${PORTALS[q.portal]?.name}` : ''}{q.askedTo ? ' · te lo preguntó a ti' : ''}:
          </p>
          <p className="conecta-q">“{q.question}”</p>
          <label className="mentor-answer">
            Tu respuesta (se publica para todas las chicas)
            <textarea rows={4} maxLength={1000} value={drafts[q.id] ?? ''} onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))}
              placeholder="Habla desde tu experiencia. Sin datos de contacto ni enlaces." />
            <small>{(drafts[q.id] ?? '').length}/1000 · mínimo 30 caracteres</small>
          </label>
          {msg[q.id] && <p className={msg[q.id].ok ? 'conecta-sent' : 'form-error'}>{msg[q.id].text}</p>}
          <button className="pixel-btn gold small" disabled={busy === q.id || (drafts[q.id] ?? '').trim().length < 30} onClick={() => send(q)}>
            {busy === q.id ? 'Enviando…' : '💬 Responder'}
          </button>
        </article>
      ))}
    </div>
  )
}

/** "2026-12-06T16:00" (hora local del navegador) → ISO con zona. */
const localToIso = (v) => (v ? new Date(v).toISOString() : '')

function EventForm({ code, mentor, onDone }) {
  const [f, setF] = useState({
    title: '', description: '', kind: 'charla', modality: 'virtual', region: mentor.region ?? '', place: '', url: '',
    startsAt: '', durationMin: 60, portals: mentor.portals ?? [],
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const togglePortal = (id) => setF(x => ({ ...x, portals: x.portals.includes(id) ? x.portals.filter(p => p !== id) : [...x.portals, id] }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!f.startsAt) return setError('Elige fecha y hora.')
    setBusy(true)
    try {
      const r = await api.mentorEvent(code, {
        ...f, startsAt: localToIso(f.startsAt), durationMin: Number(f.durationMin), region: f.region || null,
      })
      play('win')
      track(EVENTS.mentoraEvento, { modalidad: f.modality })
      onDone(r.event.status === 'published' ? '🟢 ¡Evento publicado! Ya aparece para las chicas.' : '🛡️ Evento enviado: el equipo lo revisa antes de publicarlo.')
    } catch (err) {
      play('lose')
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="pixel-panel auth-form" onSubmit={submit}>
      <h3 className="dash-h">➕ Nuevo evento grupal</h3>
      <div className="form-row">
        <label>Título<input value={f.title} onChange={set('title')} maxLength={120} placeholder="Mi primer código: charla para chicas curiosas" required /></label>
        <label>
          Tipo
          <select value={f.kind} onChange={set('kind')}>
            {EVENT_KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k].emoji} {KIND_LABEL[k].label}</option>)}
          </select>
        </label>
      </div>
      <label>
        De qué trata
        <textarea rows={3} value={f.description} onChange={set('description')} maxLength={600} placeholder="Qué aprenderán, para quién es, qué necesitan llevar." />
        <small>{f.description.length}/600</small>
      </label>
      <div className="form-row">
        <label>
          Modalidad
          <select value={f.modality} onChange={set('modality')}>
            {MODALITIES.map(m => <option key={m} value={m}>{MODALITY_LABEL[m]}</option>)}
          </select>
        </label>
        <label>Fecha y hora<input type="datetime-local" value={f.startsAt} onChange={set('startsAt')} required /></label>
      </div>
      {f.modality !== 'virtual' && (
        <div className="form-row">
          <label>
            Región
            <select value={f.region} onChange={set('region')}>
              <option value="">Elige…</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>Lugar (institución o local público)<input value={f.place} onChange={set('place')} maxLength={160} placeholder="Auditorio de la UNSAAC, Cusco" /></label>
        </div>
      )}
      <div className="form-row">
        <label>
          Enlace de inscripción {f.modality === 'presencial' ? <em>opcional</em> : ''}
          <input type="url" value={f.url} onChange={set('url')} maxLength={300} placeholder="https://…" />
        </label>
        <label>Duración (minutos)<input type="number" min={15} max={600} step={15} value={f.durationMin} onChange={set('durationMin')} /></label>
      </div>
      <div className="waitlist-roles">
        {Object.values(PORTALS).map(p => (
          <label key={p.id} className={`waitlist-rol ${f.portals.includes(p.id) ? 'activo' : ''}`}>
            <input type="checkbox" checked={f.portals.includes(p.id)} onChange={() => togglePortal(p.id)} />
            <span aria-hidden="true">{p.emoji}</span> {p.name}
          </label>
        ))}
      </div>
      <p className="dash-muted">🔐 Solo eventos grupales y abiertos. No incluyas teléfonos, correos ni redes en la descripción.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="pixel-btn gold" type="submit" disabled={busy}>{busy ? 'Publicando…' : '📅 Publicar evento'}</button>
    </form>
  )
}

function ProfileForm({ code, mentor, onSaved }) {
  const [f, setF] = useState({
    role: mentor.role, org: mentor.org ?? '', portals: mentor.portals ?? [], region: mentor.region ?? '',
    story: mentor.story, advice: mentor.advice, powerup: mentor.powerup,
  })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const togglePortal = (id) => setF(x => ({ ...x, portals: x.portals.includes(id) ? x.portals.filter(p => p !== id) : [...x.portals, id] }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const r = await api.mentorUpdate(code, { ...f, region: f.region || null })
      play('win')
      setMsg({ ok: true, text: '✅ Perfil actualizado.' })
      onSaved(r.mentor)
    } catch (err) {
      play('lose')
      setMsg({ ok: false, text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="pixel-panel auth-form" onSubmit={submit}>
      <h3 className="dash-h">✏️ Lo que ven las chicas</h3>
      <div className="form-row">
        <label>A qué te dedicas<input value={f.role} onChange={set('role')} maxLength={80} /></label>
        <label>Organización<input value={f.org} onChange={set('org')} maxLength={120} /></label>
      </div>
      <label>
        Región para eventos presenciales
        <select value={f.region} onChange={set('region')}>
          <option value="">Solo virtual</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <div className="waitlist-roles">
        {Object.values(PORTALS).map(p => (
          <label key={p.id} className={`waitlist-rol ${f.portals.includes(p.id) ? 'activo' : ''}`}>
            <input type="checkbox" checked={f.portals.includes(p.id)} onChange={() => togglePortal(p.id)} />
            <span aria-hidden="true">{p.emoji}</span> {p.name}
          </label>
        ))}
      </div>
      <label>Cómo empezaste<textarea rows={4} value={f.story} onChange={set('story')} maxLength={600} /></label>
      <label>Lo que te hubiera gustado saber a los 16<textarea rows={2} value={f.advice} onChange={set('advice')} maxLength={300} /></label>
      <label>Tu power-up contra el NoPuedo<input value={f.powerup} onChange={set('powerup')} maxLength={140} /></label>
      {msg && <p className={msg.ok ? 'conecta-sent' : 'form-error'}>{msg.text}</p>}
      <button className="pixel-btn gold" type="submit" disabled={busy}>{busy ? 'Guardando…' : '💾 Guardar'}</button>
    </form>
  )
}

export default function MentoraPanel() {
  const [code, setCode] = useState(() => readStore(MENTOR_CODE_KEY, '') || sessionStorageGet())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('preguntas')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (c) => {
    try {
      const d = await api.mentorMe(c)
      setData(d)
      setError('')
      return true
    } catch (err) {
      setError(err.message)
      setData(null)
      return false
    }
  }, [])

  useEffect(() => {
    if (!code) return
    let alive = true
    api.mentorMe(code)
      .then(d => { if (alive) { setData(d); setError(''); setTag('rol', 'mentora') } })
      .catch(err => { if (alive) { setError(err.message); setData(null) } })
    return () => { alive = false }
  }, [code])

  const login = async (c, remember) => {
    play('confirm')
    if (await load(c)) {
      if (remember) writeStore(MENTOR_CODE_KEY, c)
      else sessionStorageSet(c)
      setCode(c)
    }
  }

  const logout = () => {
    removeStore(MENTOR_CODE_KEY)
    sessionStorageSet('')
    setCode('')
    setData(null)
  }

  const reload = () => load(code)

  const cancel = async (id) => {
    try {
      await api.mentorCancelEvent(code, id)
      play('select')
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const m = data?.mentor

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.victory} fallback={BACKGROUNDS.hub} dim={0.78} />
      <div className="scene-content dash-wrap" data-clarity-mask="true">
        <nav className="game-nav">
          <div className="game-nav-player">
            <div>
              <div className="game-nav-name">{m ? m.name : 'HEROW Conecta'}</div>
              <div className="game-nav-meta">{m ? `${m.role}${m.org ? ` · ${m.org}` : ''}` : 'Panel de mentoras'}</div>
            </div>
          </div>
          <div className="game-nav-links">
            <Link className="pixel-btn ghost small" to="/mentoras">🛡️ Red de mentoras</Link>
            {m && <button className="pixel-btn ghost small" onClick={logout}>Salir</button>}
          </div>
        </nav>

        {!m && <Login onCode={login} error={error} />}

        {m && m.status !== 'approved' && (
          <section className="pixel-panel">
            <h1 className="dash-h">Hola, {m.name.split(' ')[0]} 👋</h1>
            <p>{STATUS_TEXT[m.status]}</p>
          </section>
        )}

        {m && m.status === 'approved' && data && (
          <>
            {error && <p className="form-error" role="alert" onClick={() => setError('')}>{error}</p>}
            <section className="pixel-panel">
              <h1 className="dash-h">Tu impacto, {m.name.split(' ')[0]} 💜</h1>
              <div className="impact-strip conecta-stats kpi-strip">
                <div className="impact-item"><strong>{data.impact.followers ?? 0}</strong><span>seguidoras</span></div>
                <div className="impact-item"><strong>{data.impact.helpful ?? 0}</strong><span>“me ayudó” en tus respuestas</span></div>
                <div className="impact-item"><strong>{data.impact.girlsGoing}</strong><span>chicas apuntadas a tus eventos</span></div>
                <div className="impact-item"><strong>{data.impact.questionsAnswered}</strong><span>dudas resueltas</span></div>
                <div className="impact-item"><strong>{data.impact.eventsPublished}</strong><span>eventos publicados</span></div>
              </div>
              {data.impact.badge && (
                <div className="badge-card">
                  <span className="badge-card-emoji" aria-hidden="true">{data.impact.badge.emoji}</span>
                  <div>
                    <strong>Mentora {data.impact.badge.name}</strong> · {data.impact.badge.points} puntos de impacto
                    {data.impact.badge.next ? (
                      <>
                        <div className="pixel-bar thin"><div className="pixel-bar-fill" style={{ width: `${data.impact.badge.next.progress}%` }} /></div>
                        <small className="dash-muted">
                          Te faltan {data.impact.badge.next.missing} para ser {data.impact.badge.next.emoji} {data.impact.badge.next.name}.
                          Cada seguidora suma 1, cada respuesta 3, cada “me ayudó” 2 y cada chica apuntada 1.
                        </small>
                      </>
                    ) : <small className="dash-muted"> ¡Llegaste al nivel máximo! Gracias por abrir tantas puertas. 👑</small>}
                  </div>
                </div>
              )}
              <p className="dash-muted" style={{ marginTop: 10 }}>Ves cuántas, nunca quiénes: así cuidamos a las chicas.</p>
            </section>

            <section className="pixel-panel">
              <div className="dash-tabs conecta-tabs">
                {[['preguntas', `💬 Preguntas (${data.inbox.length})`], ['eventos', `📅 Mis eventos (${data.events.length})`], ['perfil', '✏️ Mi perfil']].map(([id, label]) => (
                  <button key={id} className={`pixel-btn small ${tab === id ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setTab(id); setNotice('') }}>{label}</button>
                ))}
              </div>
              {notice && <p className="conecta-sent" role="status">{notice}</p>}
              <div className="conecta-body">
                {tab === 'preguntas' && (
                  <>
                    <Inbox inbox={data.inbox} code={code} onDone={reload} />
                    {data.answered.length > 0 && (
                      <>
                        <h3 className="dash-h" style={{ marginTop: 22 }}>✅ Lo que ya respondiste</h3>
                        <div className="conecta-wall">
                          {data.answered.map(q => (
                            <article key={q.id} className="pixel-panel conecta-qa">
                              <p className="conecta-q">“{q.question}”</p>
                              <div className="conecta-a"><small>{q.status === 'review' ? '🛡️ En revisión' : '🟢 Publicada'}</small><p>{q.answer}</p></div>
                            </article>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
                {tab === 'eventos' && (
                  <div className="mentor-events">
                    <EventForm code={code} mentor={m} onDone={(text) => { setNotice(text); reload() }} />
                    <div className="opp-grid">
                      {data.events.map(e => (
                        <article key={e.id} className="opp-card">
                          <header className="opp-head">
                            <span className="opp-type">{KIND_LABEL[e.kind]?.emoji} {KIND_LABEL[e.kind]?.label}</span>
                            <span className="conecta-date">{formatEventDate(e.startsAt)}</span>
                          </header>
                          <h3 className="opp-title">{e.title}</h3>
                          <div className="opp-tags">
                            <span>{EVENT_STATUS[e.status]}</span>
                            <span>{MODALITY_LABEL[e.modality]}</span>
                            {e.region && <span>🗺️ {e.region}</span>}
                          </div>
                          <p className="conecta-going">💜 {e.going} {e.going === 1 ? 'chica apuntada' : 'chicas apuntadas'}</p>
                          {e.status !== 'cancelled' && isFuture(e.startsAt) && (
                            <div className="opp-actions"><button className="pixel-btn ghost small" onClick={() => cancel(e.id)}>Cancelar evento</button></div>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {tab === 'perfil' && <ProfileForm code={code} mentor={m} onSaved={(mentor) => setData(d => ({ ...d, mentor }))} />}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

// Si no quiere que se recuerde, el código vive solo mientras la pestaña esté abierta.
function sessionStorageGet() {
  try { return sessionStorage.getItem(MENTOR_CODE_KEY) || '' } catch { return '' }
}
function sessionStorageSet(v) {
  try {
    if (v) sessionStorage.setItem(MENTOR_CODE_KEY, v)
    else sessionStorage.removeItem(MENTOR_CODE_KEY)
  } catch { /* nada */ }
}
