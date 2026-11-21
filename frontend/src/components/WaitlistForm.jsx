import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { submitLead, watchLeadQueue } from '../lib/leads'
import { play } from '../lib/sfx'

const ROLES = [
  { id: 'colegio', emoji: '🏫', label: 'Colegio' },
  { id: 'empresa', emoji: '🤝', label: 'Empresa o aliado' },
  { id: 'inversor', emoji: '🚀', label: 'Inversor' },
  { id: 'docente', emoji: '📚', label: 'Docente o mentora' },
  { id: 'familia', emoji: '💜', label: 'Madre, padre o apoderado' },
  { id: 'estudiante', emoji: '⭐', label: 'Estudiante' },
  { id: 'otro', emoji: '✨', label: 'Otro' },
]

// Solo mostramos el contador cuando ya hay un grupo de verdad.
const MIN_PARA_MOSTRAR = 10

const VACIO = { email: '', name: '', org: '', role: '', phone: '', message: '', website: '' }

export default function WaitlistForm({ source = 'landing' }) {
  const [form, setForm] = useState(VACIO)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [count, setCount] = useState(0)
  const emailRef = useRef(null)
  const rolRef = useRef(null)
  const idBase = useId()

  useEffect(() => {
    watchLeadQueue()
    let vivo = true
    api.waitlistCount()
      .then(r => { if (vivo) setCount(r?.count ?? 0) })
      .catch(() => {}) // sin contador la sección funciona igual
    return () => { vivo = false }
  }, [])

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.role) {
      rolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return setError('Elige quién eres para saber cómo ayudarte.')
    }
    if (!consent) {
      return setError('Necesitamos tu permiso para escribirte antes de guardar tu correo.')
    }

    setBusy(true)
    try {
      const res = await submitLead({ ...form, email: form.email.trim(), consent: true, source })
      play('win')
      setDone({ queued: res.queued, duplicate: res.duplicate })
      setForm(VACIO)
      setConsent(false)
      setCount(c => (res.duplicate ? c : c + 1))
    } catch (err) {
      play('lose')
      setError(err.message)
      emailRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="pixel-panel waitlist-done" role="status">
        <span className="waitlist-done-icon" aria-hidden="true">🌀</span>
        <h3 className="pixel-title">{done.duplicate ? '¡Ya te teníamos!' : '¡Portal abierto!'}</h3>
        <p>
          {done.duplicate
            ? 'Tu correo ya estaba en la lista. Actualizamos tus datos: te escribimos pronto.'
            : 'Gracias por creer en HEROW. Te escribiremos con los avances, la demo y cómo sumarte.'}
        </p>
        {done.queued && (
          <p className="waitlist-offline">
            📡 Guardado en este dispositivo: la conexión está lenta. Se enviará solo al volver el internet.
          </p>
        )}
        <button className="pixel-btn ghost" onClick={() => { play('blip'); setDone(null) }}>
          Registrar a otra persona
        </button>
      </div>
    )
  }

  return (
    <form className="pixel-panel auth-form waitlist-form" onSubmit={submit} noValidate>
      <header className="waitlist-cabecera">
        <h3 className="pixel-title">Déjanos tu correo</h3>
        <p className="waitlist-intro">
          Te escribimos con la demo, los resultados del piloto y las formas de sumarte.
          Toma menos de un minuto.
        </p>
      </header>

      {/* ---------- 1. Quién eres ---------- */}
      <fieldset className="waitlist-paso" ref={rolRef}>
        <legend>
          <span className="waitlist-paso-num">1</span>
          ¿Quién eres? <em>obligatorio</em>
        </legend>
        <div className="waitlist-roles">
          {ROLES.map(r => (
            <label
              key={r.id}
              className={`waitlist-rol ${form.role === r.id ? 'activo' : ''}`}
              htmlFor={`${idBase}-${r.id}`}
            >
              <input
                id={`${idBase}-${r.id}`}
                type="radio"
                name={`${idBase}-rol`}
                value={r.id}
                checked={form.role === r.id}
                onChange={() => { play('blip'); setForm(f => ({ ...f, role: r.id })) }}
              />
              <span aria-hidden="true">{r.emoji}</span> {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---------- 2. Cómo te contactamos ---------- */}
      <fieldset className="waitlist-paso">
        <legend>
          <span className="waitlist-paso-num">2</span>
          ¿Cómo te contactamos?
        </legend>

        <label htmlFor={`${idBase}-email`}>
          <span className="campo-titulo">Correo <em>obligatorio</em></span>
          <input
            id={`${idBase}-email`}
            ref={emailRef}
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="nombre@colegio.edu.pe"
            autoComplete="email"
            inputMode="email"
            maxLength={160}
            required
          />
        </label>

        <label htmlFor={`${idBase}-phone`}>
          <span className="campo-titulo">WhatsApp <em>opcional</em></span>
          <input
            id={`${idBase}-phone`}
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+51 999 999 999"
            autoComplete="tel"
            inputMode="tel"
            maxLength={40}
          />
          <small>Si prefieres que te escribamos por ahí.</small>
        </label>
      </fieldset>

      {/* ---------- 3. Cuéntanos más ---------- */}
      <fieldset className="waitlist-paso">
        <legend>
          <span className="waitlist-paso-num">3</span>
          Cuéntanos más <em>opcional</em>
        </legend>

        <div className="form-row">
          <label htmlFor={`${idBase}-name`}>
            Nombre
            <input
              id={`${idBase}-name`}
              value={form.name}
              onChange={set('name')}
              placeholder="¿Cómo te llamamos?"
              autoComplete="name"
              maxLength={80}
            />
          </label>
          <label htmlFor={`${idBase}-org`}>
            Colegio u organización
            <input
              id={`${idBase}-org`}
              value={form.org}
              onChange={set('org')}
              placeholder="ej. I.E. José Gálvez"
              autoComplete="organization"
              maxLength={120}
            />
          </label>
        </div>

        <label htmlFor={`${idBase}-message`}>
          ¿Cómo te gustaría sumarte?
          <textarea
            id={`${idBase}-message`}
            value={form.message}
            onChange={set('message')}
            rows={3}
            maxLength={500}
            placeholder="Llevar HEROW a mi colegio, ser mentora, apoyar el piloto…"
          />
          <small className="waitlist-contador">{form.message.length}/500</small>
        </label>
      </fieldset>

      {/* Trampa anti-spam: invisible para personas, tentadora para bots. */}
      <input
        className="waitlist-trap"
        type="text"
        name="website"
        value={form.website}
        onChange={set('website')}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {/* ---------- Consentimiento ---------- */}
      <label className="waitlist-consent" htmlFor={`${idBase}-consent`}>
        <input
          id={`${idBase}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          Acepto que HEROW guarde mi correo para escribirme sobre el proyecto. He leído la{' '}
          <Link className="legal-link" to="/privacidad" target="_blank">política de privacidad</Link>{' '}
          y sé que puedo pedir que borren mis datos cuando quiera.
        </span>
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="pixel-btn gold big" type="submit" disabled={busy}>
        {busy ? 'Abriendo portal…' : '🌀 Quiero sumarme'}
      </button>

      {count >= MIN_PARA_MOSTRAR && (
        <p className="form-note">⚡ {count} personas ya se sumaron al portal</p>
      )}
      <p className="form-note">🔐 No compartimos tu correo con nadie. Sin spam.</p>
    </form>
  )
}
