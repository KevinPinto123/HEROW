import { useEffect, useState } from 'react'
import GameNav from '../components/GameNav'
import PixelDialog from '../components/PixelDialog'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { KIND_LABEL, MODALITY_LABEL, REGIONS, formatEventDate } from '../data/conecta'
import { PORTALS } from '../data/heroines'
import { EVENTS, track } from '../lib/analytics'
import { ApiError, api, isNetworkError } from '../lib/api'
import {
  enqueue, loadSnapshot, readOutbox, readStore, saveSnapshot, since, useOnline, useQueueVersion, userKey, writeStore,
} from '../lib/offline'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const TABS = [
  { id: 'eventos', label: '📅 Eventos' },
  { id: 'mentoras', label: '👩‍🔬 Mentoras' },
  { id: 'preguntar', label: '💬 Pregúntale' },
  { id: 'respuestas', label: '📜 Respuestas' },
]

// Aviso rápido antes de enviar (el servidor revisa de nuevo y con más cuidado).
const PERSONAL = /[^\s@]+@[^\s@]+\.[a-z]{2,}|(?:\+?\d[\s.-]?){9,}|(^|\s)@[a-z0-9_.]{3,}|whats ?app|instagram|tiktok|facebook/i

/** Archivo .ics para que el evento quede en el calendario del celular (funciona sin internet). */
function downloadIcs(e) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = new Date(Date.parse(e.startsAt) + e.durationMin * 60_000)
  const esc = (s) => String(s ?? '').replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HEROW//Conecta//ES', 'BEGIN:VEVENT',
    `UID:${e.id}@herow`, `DTSTAMP:${fmt(Date.now())}`, `DTSTART:${fmt(e.startsAt)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(`HEROW · ${e.title}`)}`,
    `DESCRIPTION:${esc(`${e.description}\nCon ${e.mentor?.name ?? 'una mentora HEROW'}.${e.url ? `\nInscripción: ${e.url}` : ''}\nAvísale a tu apoderado antes de ir.`)}`,
    `LOCATION:${esc(e.modality === 'virtual' ? 'Virtual' : [e.place, e.region].filter(Boolean).join(', '))}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Tu evento HEROW empieza en 1 hora', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `herow-${e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const PortalTags = ({ portals }) => (
  <>
    {(portals ?? []).map(p => PORTALS[p] && (
      <span key={p} style={{ color: PORTALS[p].color }}>{PORTALS[p].emoji} {PORTALS[p].name}</span>
    ))}
  </>
)

// ───────── Eventos ─────────
function EventCard({ e, pending, onRsvp }) {
  const k = KIND_LABEL[e.kind] ?? KIND_LABEL.charla
  return (
    <article className={`opp-card conecta-event ${e.mine ? 'mine' : ''}`}>
      <header className="opp-head">
        <span className="opp-type">{k.emoji} {k.label}</span>
        <span className="conecta-date">{formatEventDate(e.startsAt)}</span>
      </header>
      {e.fromFollowed && <span className="from-followed">⭐ De una mentora que sigues</span>}
      <h3 className="opp-title">{e.title}</h3>
      {e.mentor && (
        <p className="opp-source">Con <strong>{e.mentor.name}</strong> · {e.mentor.role}{e.mentor.org ? ` en ${e.mentor.org}` : ''}</p>
      )}
      <p className="opp-summary">{e.description}</p>
      <div className="opp-tags">
        <span>{MODALITY_LABEL[e.modality]}</span>
        {e.region && <span>🗺️ {e.region}</span>}
        {e.place && <span>{e.place}</span>}
        <span>⏱️ {e.durationMin} min</span>
        <PortalTags portals={e.portals} />
      </div>
      <p className="conecta-going">💜 {e.going} {e.going === 1 ? 'heroína va' : 'heroínas van'}{pending ? ' · 📡 tu respuesta espera señal' : ''}</p>
      <div className="opp-actions">
        {e.mine
          ? <button className="pixel-btn ghost small" onClick={() => onRsvp(e, false)}>Ya no voy</button>
          : <button className="pixel-btn gold small" onClick={() => onRsvp(e, true)}>💜 Me apunto</button>}
        {e.url && (
          <a className="pixel-btn cyan small" href={e.url} target="_blank" rel="noreferrer noopener" onClick={() => { play('blip'); track(EVENTS.eventoInscripcion, { modalidad: e.modality }) }}>Inscripción ↗</a>
        )}
        <button className="pixel-btn ghost small" onClick={() => { play('blip'); track(EVENTS.eventoCalendario); downloadIcs(e) }}>📅 A mi calendario</button>
      </div>
      {e.mine && <p className="conecta-guardian">👨‍👩‍👧 Avísale a tu mamá, papá o apoderado antes del evento.</p>}
    </article>
  )
}

function EventsTab({ events, portals, pendingRsvp, onRsvp, userId }) {
  const regionKey = userKey(userId, 'region')
  const [scope, setScope] = useState('para-mi')
  const [region, setRegion] = useState(() => readStore(regionKey, ''))
  const pickRegion = (v) => { setRegion(v); writeStore(regionKey, v) }

  const mine = new Set(portals)
  const list = events.filter(e =>
    (scope === 'todos' || e.mine || !e.portals.length || e.portals.some(p => mine.has(p))) &&
    (!region || e.modality !== 'presencial' || e.region === region))

  return (
    <>
      <div className="conecta-filters">
        <div className="dash-tabs">
          <button className={`pixel-btn small ${scope === 'para-mi' ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setScope('para-mi') }}>Para mí</button>
          <button className={`pixel-btn small ${scope === 'todos' ? 'gold' : 'ghost'}`} onClick={() => { play('blip'); setScope('todos') }}>Todos</button>
        </div>
        <label className="conecta-region">
          Presenciales en
          <select value={region} onChange={e => pickRegion(e.target.value)}>
            <option value="">todo el Perú</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>
      <p className="dash-muted">Tu región solo se guarda en este dispositivo: no la enviamos a nadie.</p>
      {list.length ? (
        <div className="opp-grid">
          {list.map(e => <EventCard key={e.id} e={e} pending={pendingRsvp.has(e.id)} onRsvp={onRsvp} />)}
        </div>
      ) : (
        <p className="dash-empty">
          {events.length
            ? 'No hay eventos con este filtro. Prueba con “Todos” o con otra región.'
            : 'Las mentoras están preparando sus charlas y talleres. Mientras tanto, ¡déjales una pregunta!'}
        </p>
      )}
    </>
  )
}

// ───────── Mentoras ─────────
/** Insignia de mentora (Semilla → Guía → Inspiradora → Leyenda HEROW). */
const BadgeChip = ({ badge }) => (badge ? <span className="mentor-badge" title={`${badge.points} puntos de impacto`}>{badge.emoji} {badge.name}</span> : null)

function MentorsTab({ mentors, onAsk, onFollow }) {
  if (!mentors.length) {
    return <p className="dash-empty">Muy pronto conocerás aquí a mujeres reales que trabajan en ciencia y tecnología. 💜</p>
  }
  return (
    <div className="opp-grid">
      {mentors.map(m => (
        <article key={m.id} className={`opp-card conecta-mentor ${m.following ? 'mine' : ''}`}>
          <header className="opp-head">
            <span className="opp-type">✔ Mentora verificada</span>
            <BadgeChip badge={m.badge} />
          </header>
          <h3 className="opp-title">{m.name}</h3>
          <p className="opp-source">{m.role}{m.org ? ` · ${m.org}` : ''}{m.region ? ` · 🗺️ ${m.region}` : ''}</p>
          <p className="mentor-stats">
            <strong>{m.followers ?? 0}</strong> {m.followers === 1 ? 'seguidora' : 'seguidoras'} ·{' '}
            <strong>{m.answered ?? 0}</strong> respuestas · <strong>{m.helpful ?? 0}</strong> “me ayudó”
          </p>
          <div className="opp-actions">
            {m.following
              ? <button className="pixel-btn ghost small" onClick={() => onFollow(m, false)}>✔ Siguiendo</button>
              : <button className="pixel-btn pink small" onClick={() => onFollow(m, true)}>💜 Seguir</button>}
          </div>
          <div className="opp-tags"><PortalTags portals={m.portals} /></div>
          {m.story && (
            <div className="conecta-quote">
              <small>Cómo empecé</small>
              <p>{m.story}</p>
            </div>
          )}
          {m.advice && (
            <p className="opp-reason">💡 <strong>Lo que me hubiera gustado saber a tu edad:</strong> {m.advice}</p>
          )}
          <div className="opp-actions">
            <button className="pixel-btn gold small" onClick={() => onAsk(m)}>💬 Pregúntale</button>
          </div>
        </article>
      ))}
    </div>
  )
}

// ───────── Preguntar ─────────
const STATUS = {
  pending: { label: '⏳ Esperando a una mentora', cls: '' },
  review: { label: '🛡️ En revisión del equipo', cls: '' },
  answered: { label: '✅ Respondida', cls: 'ok' },
  queued: { label: '📡 Se enviará cuando vuelva la señal', cls: '' },
}

function AskTab({ mentors, portals, mine, queued, preset, limits, onAsked }) {
  const [mentorId, setMentorId] = useState(preset?.id ?? '')
  const [portal, setPortal] = useState(preset?.portals?.[0] ?? portals[0] ?? 'code')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState('')

  // Si llega desde "Pregúntale" en otra tarjeta, se preselecciona esa mentora.
  const [lastPreset, setLastPreset] = useState(preset)
  if (preset !== lastPreset) {
    setLastPreset(preset)
    if (preset) { setMentorId(preset.id); setPortal(preset.portals?.[0] ?? portal) }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSent('')
    const question = text.trim()
    if (question.length < 10) return setError('Escribe tu pregunta con un poco más de detalle (mínimo 10 letras).')
    if (PERSONAL.test(question)) return setError('Quita datos de contacto o redes: tu pregunta es anónima y así te cuidamos.')
    setBusy(true)
    const res = await onAsked({ question, mentorId: mentorId || null, portal })
    setBusy(false)
    if (res.error) {
      play('lose')
      setError(res.error)
      return
    }
    play('win')
    setText('')
    setSent(res.queued
      ? '📡 Guardada en este dispositivo. Se enviará sola cuando vuelva la señal.'
      : '✅ ¡Enviada! Te avisamos aquí cuando una mentora responda.')
  }

  const items = [...queued.map(q => ({ id: q.id, question: q.payload.question, status: 'queued' })), ...mine]

  return (
    <div className="conecta-ask">
      <form className="pixel-panel auth-form" onSubmit={submit} data-clarity-mask="true">
        <h3 className="dash-h">💬 Pregunta sin miedo</h3>
        <p className="dash-muted">
          Es <strong>anónima</strong>: la mentora solo ve tu nivel y tu portal, nunca tu usuario. La respuesta se publica
          para que también ayude a otras chicas con la misma duda.
        </p>
        <div className="form-row">
          <label>
            ¿A quién?
            <select value={mentorId} onChange={e => setMentorId(e.target.value)}>
              <option value="">Cualquier mentora del portal</option>
              {mentors.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
            </select>
          </label>
          <label>
            Tema
            <select value={portal} onChange={e => setPortal(e.target.value)}>
              {Object.values(PORTALS).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </label>
        </div>
        <label>
          Tu pregunta
          <textarea
            className="conecta-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={400}
            placeholder="¿Es muy difícil estudiar ingeniería si no soy la mejor en matemáticas? ¿Cómo fue tu primer día en la universidad?"
          />
          <small>{text.length}/400 · No escribas tu nombre, colegio, teléfono ni redes. Máximo {limits?.questionsPerDay ?? 3} preguntas al día.</small>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {sent && <p className="conecta-sent" role="status">{sent}</p>}
        <button className="pixel-btn gold" type="submit" disabled={busy}>{busy ? 'Enviando…' : '🚀 Enviar pregunta'}</button>
      </form>

      <section className="pixel-panel">
        <h3 className="dash-h">📬 Mis preguntas</h3>
        {items.length ? (
          <ul className="conecta-mine" data-clarity-mask="true">
            {items.map(q => (
              <li key={q.id}>
                <p className="conecta-q">“{q.question}”</p>
                <span className={`conecta-status ${STATUS[q.status]?.cls ?? ''}`}>{STATUS[q.status]?.label}</span>
                {q.answer && (
                  <div className="conecta-a">
                    <small>{q.answeredBy?.name} · {q.answeredBy?.role}</small>
                    <p>{q.answer}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="dash-empty">Aún no preguntas nada. ¡No existe pregunta tonta!</p>
        )}
      </section>
    </div>
  )
}

// ───────── Respuestas públicas ─────────
const REACTIONS = [
  { kind: 'me_ayudo', label: '💜 Me ayudó' },
  { kind: 'me_inspira', label: '✨ Me inspira' },
]

function AnswersTab({ answers, onReact }) {
  if (!answers.length) return <p className="dash-empty">Cuando las mentoras respondan, sus respuestas aparecerán aquí para todas.</p>
  return (
    <div className="conecta-wall" data-clarity-mask="true">
      {answers.map(q => (
        <article key={q.id} className="pixel-panel conecta-qa">
          <p className="conecta-who">
            Una heroína de nivel {q.level}{q.portal && PORTALS[q.portal] ? ` · ${PORTALS[q.portal].emoji} ${PORTALS[q.portal].name}` : ''} preguntó:
          </p>
          <p className="conecta-q">“{q.question}”</p>
          <div className="conecta-a">
            <small>Respondió {q.answeredBy?.name ?? 'una mentora'}{q.answeredBy?.role ? `, ${q.answeredBy.role}` : ''}{q.answeredBy?.org ? ` en ${q.answeredBy.org}` : ''}</small>
            <p>{q.answer}</p>
          </div>
          {q.fromFollowed && <span className="from-followed">⭐ De una mentora que sigues</span>}
          <div className="reaction-row" data-clarity-unmask="true">
            {REACTIONS.map(r => {
              const on = q.myReactions?.includes(r.kind)
              return (
                <button key={r.kind} type="button" className={`reaction-btn ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onReact(q, r.kind, !on)}>
                  {r.label} <strong>{q.reactions?.[r.kind] ?? 0}</strong>
                </button>
              )
            })}
          </div>
        </article>
      ))}
    </div>
  )
}

// ───────── Pantalla ─────────
export default function Conecta() {
  const { userId } = usePlayer()
  const online = useOnline()
  useQueueVersion()
  const [snap, setSnap] = useState(() => loadSnapshot(userId, 'conecta'))
  const [status, setStatus] = useState('loading') // loading | live | cached | schema | error
  const [error, setError] = useState('')
  const [tab, setTab] = useState('eventos')
  const [preset, setPreset] = useState(null)

  const data = snap?.data
  const outbox = readOutbox(userId)
  const pendingRsvp = new Set(outbox.filter(i => i.kind === 'rsvp').map(i => i.eventId))
  const queuedQuestions = outbox.filter(i => i.kind === 'question')

  const save = (next) => {
    saveSnapshot(userId, 'conecta', next)
    setSnap({ savedAt: new Date().toISOString(), data: next })
  }

  useEffect(() => {
    let alive = true
    api.conecta()
      .then(d => {
        if (!alive) return
        saveSnapshot(userId, 'conecta', d)
        setSnap({ savedAt: new Date().toISOString(), data: d })
        setStatus('live')
        track(EVENTS.conectaAbierto)
      })
      .catch(err => {
        if (!alive) return
        if (err instanceof ApiError && err.code === 'schema_outdated') setStatus('schema')
        else if (isNetworkError(err)) setStatus('cached')
        else { setStatus('error'); setError(err.message) }
      })
    return () => { alive = false }
  }, [userId, online])

  const onRsvp = async (e, going) => {
    play(going ? 'win' : 'select')
    if (going) track(EVENTS.eventoApunto, { modalidad: e.modality })
    // Optimista: se ve al instante; si no hay señal, se encola.
    const patch = (d) => ({
      ...d,
      events: d.events.map(x => (x.id === e.id ? { ...x, mine: going, going: Math.max(0, x.going + (going ? 1 : -1)) } : x)),
    })
    save(patch(data))
    try {
      const r = await api.conectaRsvp(e.id, going)
      setSnap(s => {
        const next = { ...s.data, events: s.data.events.map(x => (x.id === e.id ? { ...x, going: r.count, mine: r.going } : x)) }
        saveSnapshot(userId, 'conecta', next)
        return { ...s, data: next }
      })
    } catch (err) {
      if (isNetworkError(err)) enqueue(userId, { kind: 'rsvp', eventId: e.id, going })
      else {
        setError(err.message)
        save(data) // se deshace
      }
    }
  }

  const onAsked = async (payload) => {
    try {
      const r = await api.conectaAsk(payload)
      save({ ...data, mine: [r.question, ...(data?.mine ?? [])] })
      track(EVENTS.preguntaEnviada, { portal: payload.portal })
      return { queued: false }
    } catch (err) {
      if (isNetworkError(err)) {
        enqueue(userId, { kind: 'question', payload })
        track(EVENTS.preguntaEnCola)
        return { queued: true }
      }
      return { error: err.message }
    }
  }

  // Seguir a una mentora: optimista, y sin señal queda en cola.
  const onFollow = async (m, following) => {
    play(following ? 'win' : 'select')
    if (following) track(EVENTS.mentoraSeguida, { portal: m.portals?.[0] })
    const patch = (d, followers) => ({
      ...d,
      following: following ? [...new Set([...(d.following ?? []), m.id])] : (d.following ?? []).filter(id => id !== m.id),
      mentors: d.mentors.map(x => (x.id === m.id ? { ...x, following, followers: followers ?? Math.max(0, (x.followers ?? 0) + (following ? 1 : -1)) } : x)),
      events: d.events.map(e => (e.mentor?.id === m.id ? { ...e, fromFollowed: following } : e)),
    })
    save(patch(data))
    try {
      const r = await api.conectaFollow(m.id, following)
      setSnap(s => {
        const next = patch(s.data, r.followers)
        saveSnapshot(userId, 'conecta', next)
        return { ...s, data: next }
      })
    } catch (err) {
      if (isNetworkError(err)) enqueue(userId, { kind: 'follow', mentorId: m.id, following })
      else { setError(err.message); save(data) }
    }
  }

  // "Me ayudó" / "Me inspira": la forma de agradecer sin chat.
  const onReact = async (q, kind, on) => {
    play(on ? 'win' : 'blip')
    if (on) track(kind === 'me_ayudo' ? EVENTS.respuestaMeAyudo : EVENTS.respuestaMeInspira)
    const patch = (d, reactions) => ({
      ...d,
      answers: d.answers.map(x => (x.id !== q.id ? x : {
        ...x,
        myReactions: on ? [...new Set([...(x.myReactions ?? []), kind])] : (x.myReactions ?? []).filter(k => k !== kind),
        reactions: reactions ?? { ...x.reactions, [kind]: Math.max(0, (x.reactions?.[kind] ?? 0) + (on ? 1 : -1)) },
      })),
    })
    save(patch(data))
    try {
      const r = await api.conectaReact(q.id, kind, on)
      setSnap(s => {
        const next = patch(s.data, r.reactions)
        saveSnapshot(userId, 'conecta', next)
        return { ...s, data: next }
      })
    } catch (err) {
      if (isNetworkError(err)) enqueue(userId, { kind: 'react', questionId: q.id, reaction: kind, on })
      else { setError(err.message); save(data) }
    }
  }

  const ask = (m) => {
    play('confirm')
    setPreset(m)
    setTab('preguntar')
  }

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.hub} fallback={BACKGROUNDS.dashboard} dim={0.74} />
      <div className="scene-content dash-wrap">
        <GameNav />

        <section className="dash-guide conecta-intro">
          <div className="dash-guide-talk">
            <PixelDialog
              speaker="YessenIA · HEROW Conecta"
              text={'Aquí conoces a mujeres reales que hoy trabajan en lo que tú estás explorando. Nadie te pide tus datos: preguntas de forma anónima y te apuntas a charlas y talleres grupales. ¡Tu miedo se hace más pequeño cuando ves que alguien como tú ya lo logró!'}
            />
          </div>
          {data && (
            <div className="impact-strip conecta-stats">
              <div className="impact-item"><strong>{data.stats.mentors}</strong><span>mentoras verificadas</span></div>
              <div className="impact-item"><strong>{data.stats.upcoming}</strong><span>eventos próximos</span></div>
              <div className="impact-item"><strong>{data.stats.answered}</strong><span>respuestas publicadas</span></div>
            </div>
          )}
        </section>

        {status === 'cached' && (
          <p className="conecta-offline" role="status">
            📡 Sin internet. {snap ? `Estás viendo lo guardado ${since(snap.savedAt)}.` : ''} Si te apuntas o preguntas, se enviará solo al volver la señal.
          </p>
        )}
        {error && <p className="form-error" role="alert" onClick={() => setError('')}>{error}</p>}

        {status === 'schema' && !data && (
          <div className="pixel-panel">
            <h2 className="dash-h">🌱 La red de mentoras se está activando</h2>
            <p className="dash-muted">Muy pronto podrás conocer mentoras y apuntarte a eventos. ¡Vuelve en unos días!</p>
          </div>
        )}
        {!data && status === 'loading' && (
          <p className="pixel-title" style={{ fontSize: '0.8rem', textAlign: 'center' }}>Abriendo el portal de mentoras<span className="pixel-caret">▌</span></p>
        )}
        {!data && status === 'cached' && (
          <div className="pixel-panel">
            <h2 className="dash-h">📡 Necesitas señal la primera vez</h2>
            <p className="dash-muted">Abre Conecta una vez con internet y quedará guardado para verlo sin señal. Mientras tanto, practica sin internet.</p>
          </div>
        )}

        {data && (
          <section className="pixel-panel conecta-steps" aria-label="Cómo funciona">
            {[
              { n: 1, emoji: '💜', title: 'Sigue', text: 'a las mentoras que te inspiran', go: 'mentoras' },
              { n: 2, emoji: '💬', title: 'Pregunta', text: 'sin miedo: es anónimo', go: 'preguntar' },
              { n: 3, emoji: '📅', title: 'Asiste', text: 'a sus charlas y talleres', go: 'eventos' },
            ].map(s => (
              <button key={s.n} type="button" className={`conecta-step ${tab === s.go ? 'on' : ''}`} onClick={() => { play('blip'); setTab(s.go) }}>
                <span className="waitlist-paso-num">{s.n}</span>
                <span><strong>{s.emoji} {s.title}</strong><small>{s.text}</small></span>
              </button>
            ))}
          </section>
        )}

        {data && (
          <section className="pixel-panel">
            {data.mentors.some(m => m.following) ? (
              <div className="following-strip">
                <span className="following-title">⭐ Tus mentoras:</span>
                {data.mentors.filter(m => m.following).map(m => (
                  <button key={m.id} type="button" className="following-chip" onClick={() => { play('blip'); setTab('mentoras') }}>
                    <span className="following-initial" aria-hidden="true">{m.name.charAt(0)}</span>
                    {m.name.split(' ')[0]} <BadgeChip badge={m.badge} />
                  </button>
                ))}
              </div>
            ) : data.mentors.length > 0 && (
              <p className="following-empty">
                💡 Sigue a una mentora y verás primero sus charlas y respuestas.{' '}
                <button type="button" className="legal-link link-btn" onClick={() => { play('blip'); setTab('mentoras') }}>Ver mentoras ▶</button>
              </p>
            )}
            <div className="dash-tabs conecta-tabs" role="tablist">
              {TABS.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`pixel-btn small ${tab === t.id ? 'gold' : 'ghost'}`}
                  onClick={() => { play('blip'); setTab(t.id) }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="conecta-body">
              {tab === 'eventos' && <EventsTab events={data.events} portals={data.portals} pendingRsvp={pendingRsvp} onRsvp={onRsvp} userId={userId} />}
              {tab === 'mentoras' && <MentorsTab mentors={data.mentors} onAsk={ask} onFollow={onFollow} />}
              {tab === 'preguntar' && (
                <AskTab mentors={data.mentors} portals={data.portals} mine={data.mine} queued={queuedQuestions} preset={preset} limits={data.limits} onAsked={onAsked} />
              )}
              {tab === 'respuestas' && <AnswersTab answers={data.answers} onReact={onReact} />}
            </div>
          </section>
        )}

        <p className="form-note">🔐 En HEROW no hay chats privados con nadie. Si algo te incomoda, cuéntaselo a un adulto de confianza y escríbenos.</p>
      </div>
    </div>
  )
}
