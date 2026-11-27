import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { MENTOR_CODE_KEY, REGIONS } from '../data/conecta'
import { PORTALS } from '../data/heroines'
import { EVENTS, setTag, track } from '../lib/analytics'
import { api } from '../lib/api'
import { writeStore } from '../lib/offline'
import { play } from '../lib/sfx'

const PROBLEMA = [
  { emoji: '😶', title: 'Ellas no te conocen', text: 'Una chica de 16 años en Puno o Iquitos rara vez ha visto de cerca a una ingeniera, una científica o una desarrolladora. Lo que no se ve, no se imagina.' },
  { emoji: '👾', title: 'El NoPuedo llega primero', text: '“Eso no es para mí”, “soy mala en matemáticas”. El miedo aparece antes que la oportunidad, y muchas descartan STEM sin haberlo probado.' },
  { emoji: '🔐', title: 'Tú quieres llegar, de forma segura', text: 'Querías compartir tu camino, pero no había un espacio cuidado para hablarle a adolescentes. HEROW lo es.' },
]

const PASOS = [
  { n: 1, title: 'Postulas', text: 'Nos cuentas quién eres y cómo empezaste. Toma 5 minutos.' },
  { n: 2, title: 'Te verificamos', text: 'El equipo revisa tu perfil profesional antes de que aparezcas. Recibes un código para tu panel.' },
  { n: 3, title: 'Llegas a ellas', text: 'Publicas charlas y talleres grupales, respondes preguntas anónimas y envías power-ups contra el NoPuedo.' },
  { n: 4, title: 'Ves tu impacto', text: 'Cuántas chicas se apuntaron a tus eventos y cuántas dudas resolviste. Nunca quiénes: así las cuidamos.' },
]

const PODERES = [
  { emoji: '🎤', title: 'Eventos grupales', text: 'Charlas, talleres, visitas a tu empresa o laboratorio, virtuales o presenciales en su región.' },
  { emoji: '💬', title: 'Preguntas sin miedo', text: 'Ellas preguntan de forma anónima lo que no se atreven en clase. Tu respuesta se publica para todas.' },
  { emoji: '💫', title: 'Power-up contra el NoPuedo', text: 'Tu frase de ánimo aparece en el momento más difícil del juego, con tu nombre y tu profesión.' },
  { emoji: '📡', title: 'Hasta donde no hay internet', text: 'Tus eventos presenciales por región y tus respuestas quedan guardadas para verlas sin señal.' },
]

const CODIGO = [
  'Nunca pido ni comparto datos de contacto (teléfono, correo, redes) con las jugadoras.',
  'No propongo conversaciones privadas: todo pasa dentro de HEROW o en eventos grupales.',
  'Mis eventos son abiertos, en lugares o plataformas institucionales, y recomiendan avisar a un apoderado.',
  'Hablo con respeto y sin juzgar. No prometo becas, trabajos ni dinero.',
  'Si detecto que una chica está en riesgo, aviso al equipo HEROW.',
  'Acepto que el equipo revise y pueda retirar mi contenido o pausar mi cuenta.',
]

const VACIO = { name: '', email: '', role: '', org: '', linkedin: '', portals: [], region: '', story: '', advice: '', powerup: '', website: '' }

function PostularForm() {
  const [form, setForm] = useState(VACIO)
  const [consent, setConsent] = useState(false)
  const [ethics, setEthics] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const togglePortal = (id) => setForm(f => ({ ...f, portals: f.portals.includes(id) ? f.portals.filter(p => p !== id) : [...f.portals, id] }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.portals.length) return setError('Elige al menos un portal en el que puedas inspirar.')
    if (!ethics) return setError('Para ser mentora debes aceptar el código de cuidado.')
    if (!consent) return setError('Necesitamos tu permiso para guardar tus datos.')
    setBusy(true)
    try {
      const r = await api.mentorApply({ ...form, region: form.region || null, consent: true, ethics: true })
      play('win')
      setCode(r.code)
      setTag('rol', 'mentora')
      track(EVENTS.mentoraPostulo, { portal: form.portals[0] })
      writeStore(MENTOR_CODE_KEY, r.code)
    } catch (err) {
      play('lose')
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true) } catch { setCopied(false) }
  }

  if (code) {
    return (
      <div className="pixel-panel waitlist-done" role="status">
        <span className="waitlist-done-icon" aria-hidden="true">🛡️</span>
        <h3 className="pixel-title">¡Postulación recibida!</h3>
        <p>Este es tu <strong>código de mentora</strong>. Guárdalo: es tu llave para entrar a tu panel. No lo compartas.</p>
        <p className="mentor-code">{code}</p>
        <div className="practica-again">
          <button className="pixel-btn ghost" onClick={copy}>{copied ? '✅ Copiado' : '📋 Copiar código'}</button>
          <Link className="pixel-btn gold" to="/mentoras/panel">Ir a mi panel ▶</Link>
        </div>
        <p className="dash-muted">El equipo revisará tu perfil en los próximos días. Te escribiremos al correo cuando estés verificada.</p>
      </div>
    )
  }

  return (
    <form className="pixel-panel auth-form waitlist-form" onSubmit={submit} noValidate data-clarity-mask="true">
      <header className="waitlist-cabecera">
        <h3 className="pixel-title">Quiero ser mentora</h3>
        <p className="waitlist-intro">Para profesionales y estudiantes universitarias de STEM (mayores de 18 años).</p>
      </header>

      <fieldset className="waitlist-paso">
        <legend><span className="waitlist-paso-num">1</span>Quién eres</legend>
        <div className="form-row">
          <label>Nombre y apellido<input value={form.name} onChange={set('name')} maxLength={80} autoComplete="name" required /></label>
          <label>Correo (solo para el equipo)<input type="email" value={form.email} onChange={set('email')} maxLength={160} autoComplete="email" inputMode="email" required /></label>
        </div>
        <div className="form-row">
          <label>A qué te dedicas<input value={form.role} onChange={set('role')} maxLength={80} placeholder="Ingeniera de software, bióloga, estudiante de mecatrónica…" required /></label>
          <label>Organización <em>opcional</em><input value={form.org} onChange={set('org')} maxLength={120} placeholder="Empresa, universidad o institución" /></label>
        </div>
        <div className="form-row">
          <label>
            LinkedIn <em>para verificarte, no se publica</em>
            <input type="url" value={form.linkedin} onChange={set('linkedin')} maxLength={200} placeholder="https://www.linkedin.com/in/…" />
          </label>
          <label>
            Región donde puedes dar eventos presenciales <em>opcional</em>
            <select value={form.region} onChange={set('region')}>
              <option value="">Solo virtual</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="waitlist-paso">
        <legend><span className="waitlist-paso-num">2</span>Tus portales</legend>
        <div className="waitlist-roles">
          {Object.values(PORTALS).map(p => (
            <label key={p.id} className={`waitlist-rol ${form.portals.includes(p.id) ? 'activo' : ''}`}>
              <input type="checkbox" checked={form.portals.includes(p.id)} onChange={() => { play('blip'); togglePortal(p.id) }} />
              <span aria-hidden="true">{p.emoji}</span> {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="waitlist-paso">
        <legend><span className="waitlist-paso-num">3</span>Lo que ellas verán</legend>
        <label>
          Cómo empezaste (tu historia)
          <textarea rows={4} value={form.story} onChange={set('story')} maxLength={600} placeholder="A los 16 no sabía qué era programar. Un día…" />
          <small className="waitlist-contador">{form.story.length}/600</small>
        </label>
        <label>
          Lo que te hubiera gustado saber a los 16
          <textarea rows={2} value={form.advice} onChange={set('advice')} maxLength={300} placeholder="Que equivocarse es parte de aprender…" />
          <small className="waitlist-contador">{form.advice.length}/300</small>
        </label>
        <label>
          Tu power-up contra el NoPuedo (una frase de ánimo)
          <input value={form.powerup} onChange={set('powerup')} maxLength={140} placeholder="Yo también dudé. Hoy construyo satélites. Tú puedes." />
          <small className="waitlist-contador">{form.powerup.length}/140 · Aparece en la batalla final del juego.</small>
        </label>
      </fieldset>

      <input className="waitlist-trap" type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <label className="waitlist-consent">
        <input type="checkbox" checked={ethics} onChange={e => setEthics(e.target.checked)} />
        <span>Acepto el <a className="legal-link" href="#codigo">código de cuidado</a> de las mentoras HEROW.</span>
      </label>
      <label className="waitlist-consent">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span>
          Acepto que HEROW guarde mis datos para verificarme y que muestre a las jugadoras mi nombre, profesión,
          organización, historia, consejo y power-up. Mi correo y LinkedIn nunca se muestran. Leí la{' '}
          <Link className="legal-link" to="/privacidad" target="_blank">política de privacidad</Link>.
        </span>
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="pixel-btn gold big" type="submit" disabled={busy}>{busy ? 'Enviando…' : '🛡️ Postular como mentora'}</button>
    </form>
  )
}

export default function Mentoras() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    api.conectaPublic().then(r => alive && setStats(r.stats)).catch(() => {})
    return () => { alive = false }
  }, [])

  return (
    <div className="landing-view landing-pixel">
      <nav className="navbar scrolled">
        <div className="container">
          <Link to="/" className="nav-logo"><span className="nav-logo-text">HEROW</span></Link>
          <ul className="nav-links">
            <li><a href="#como">Cómo funciona</a></li>
            <li><a href="#codigo">Código de cuidado</a></li>
            <li><a href="#postular">Postular</a></li>
          </ul>
          <button className="nav-cta" onClick={() => { play('select'); navigate('/mentoras/panel') }}>Mi panel</button>
        </div>
      </nav>

      <section className="title-hero mentoras-hero">
        <SceneBg src={BACKGROUNDS.victory} fallback={BACKGROUNDS.title} dim={0.55} />
        <div className="title-hero-inner">
          <img src={SPRITES.yessenia} alt="" className="pixel-img title-yessenia anim-float" />
          <p className="title-sub">HEROW CONECTA · RED DE MENTORAS</p>
          <h1 className="pixel-title mentoras-title">Sé la mentora que te hubiera gustado tener</h1>
          <p className="title-desc">
            En HEROW, chicas de 15 a 17 años juegan para descubrir su futuro en ciencia y tecnología.
            Tú puedes mostrarles que es posible: con charlas, respuestas y ánimo, sin exponerlas nunca.
          </p>
          <div className="title-actions">
            <a className="pixel-btn gold big" href="#postular" onClick={() => play('confirm')}>🛡️ Quiero ser mentora</a>
            <Link className="pixel-btn ghost big" to="/mentoras/panel">Ya tengo mi código</Link>
          </div>
          {stats && stats.mentors > 0 && (
            <p className="press-start">{stats.mentors} MENTORAS · {stats.upcoming} EVENTOS PRÓXIMOS · {stats.answered} DUDAS RESUELTAS</p>
          )}
        </div>
      </section>

      <section className="pixel-section">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">🌀 Por qué existe</span></div>
          <h2>Ellas tienen miedo. Tú tienes la respuesta.</h2>
          <p className="lead">HEROW une las dos puntas: chicas que no saben qué oportunidades existen y profesionales que quieren abrirles la puerta.</p>
          <div className="alianzas-grid">
            {PROBLEMA.map(p => (
              <div key={p.title} className="pixel-panel alianza-card">
                <span className="alianza-emoji" aria-hidden="true">{p.emoji}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pixel-section" id="como">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">🎮 Así funciona</span></div>
          <h2>De profesional a heroína real en 4 pasos</h2>
          <div className="mentoras-pasos">
            {PASOS.map(p => (
              <div key={p.n} className="pixel-panel mentoras-paso">
                <span className="waitlist-paso-num">{p.n}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
          <div className="alianzas-grid" style={{ marginTop: 32 }}>
            {PODERES.map(p => (
              <div key={p.title} className="pixel-panel alianza-card">
                <span className="alianza-emoji" aria-hidden="true">{p.emoji}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pixel-section" id="codigo">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">🔐 Código de cuidado</span></div>
          <h2>Las reglas que protegen a las chicas</h2>
          <p className="lead">Las jugadoras son menores de edad. Por eso HEROW no tiene chats privados y todo lo que escribes pasa por moderación.</p>
          <ul className="pixel-panel mentoras-codigo">
            {CODIGO.map(c => <li key={c}>🛡️ {c}</li>)}
          </ul>
        </div>
      </section>

      <section className="pixel-section waitlist-section" id="postular">
        <div className="pixel-section-inner">
          <div className="center"><span className="pixel-tag">✨ Únete</span></div>
          <h2>Postula como mentora</h2>
          <p className="lead">Gratis. Tú decides cuánto tiempo das: una respuesta a la semana ya cambia una decisión.</p>
          <div className="waitlist-wrap"><PostularForm /></div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
