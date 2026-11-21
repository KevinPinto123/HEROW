import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PixelDialog from '../components/PixelDialog'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS } from '../data/assets'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function Register() {
  const navigate = useNavigate()
  const { register, configured } = usePlayer()
  const [form, setForm] = useState({ username: '', password: '', password2: '', day: '', month: '', year: '', guardian: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 12 }, (_, i) => thisYear - 12 - i)
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[a-z0-9_]{3,20}$/.test(form.username.trim().toLowerCase())) {
      return setError('Tu nombre de usuaria debe tener de 3 a 20 letras, números o _ (sin espacios ni tildes).')
    }
    if (form.password.length < 8) return setError('La contraseña necesita al menos 8 caracteres.')
    if (form.password !== form.password2) return setError('Las contraseñas no coinciden.')
    if (!form.day || !form.month || !form.year) return setError('Completa tu fecha de nacimiento.')

    setBusy(true)
    try {
      await register({
        username: form.username.trim().toLowerCase(),
        password: form.password,
        birth: { day: Number(form.day), month: Number(form.month), year: Number(form.year) },
        guardianContact: form.guardian.trim(),
      })
      play('win')
      navigate('/despertar')
    } catch (err) {
      play('lose')
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.awakening} dim={0.55} />
      <div className="hud">
        <Link className="pixel-btn ghost small" to="/">◀ Volver</Link>
        <Link className="pixel-btn ghost small" to="/entrar">Ya tengo cuenta</Link>
      </div>
      <div className="scene-content auth-wrap">
        <PixelDialog text={'¡Hola, futura heroína! 🌀\nCrea tu cuenta. No necesitas correo: solo un nombre de usuaria y una contraseña que recuerdes.'} />
        <form className="pixel-panel auth-form" onSubmit={submit}>
          <h1 className="pixel-title">Crear cuenta</h1>
          {!configured && <p className="form-error">Falta configurar Supabase en frontend/.env.local.</p>}

          <label>
            Nombre de usuaria
            <input value={form.username} onChange={set('username')} autoComplete="username" placeholder="ej. ada_2010" maxLength={20} required />
            <small>No uses tu nombre completo. Es lo que verán las demás jugadoras.</small>
          </label>
          <div className="form-row">
            <label>
              Contraseña
              <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} required />
            </label>
            <label>
              Repite la contraseña
              <input type="password" value={form.password2} onChange={set('password2')} autoComplete="new-password" minLength={8} required />
            </label>
          </div>

          <fieldset>
            <legend>Fecha de nacimiento (HEROW es para chicas de 15 a 17 años)</legend>
            <div className="form-row three">
              <select value={form.day} onChange={set('day')} required aria-label="Día">
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
              <select value={form.month} onChange={set('month')} required aria-label="Mes">
                <option value="">Mes</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select value={form.year} onChange={set('year')} required aria-label="Año">
                <option value="">Año</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </fieldset>

          <label>
            Correo o WhatsApp de tu mamá, papá o apoderado (opcional)
            <input value={form.guardian} onChange={set('guardian')} maxLength={120} placeholder="correo@ejemplo.com o +51 999 999 999" />
            <small>Solo lo usamos para contarle a tu familia sobre tu avance. Nunca lo ven otras jugadoras.</small>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="pixel-btn gold big" type="submit" disabled={busy || !configured}>
            {busy ? 'Creando tu cuenta…' : '▶ Crear mi cuenta'}
          </button>
          <p className="form-note">🔐 No pedimos tu correo, dirección ni colegio.</p>
        </form>
      </div>
    </div>
  )
}
