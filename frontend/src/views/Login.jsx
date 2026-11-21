import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SceneBg from '../components/SceneBg'
import { BACKGROUNDS, SPRITES } from '../data/assets'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../lib/usePlayer'
import { play } from '../lib/sfx'

// Solo en desarrollo (DEV_TOOLS=true): entrar a las cuentas de demo sin escribir contraseña.
function DemoLogin({ onError, onDone }) {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    api.health().then(h => alive && setEnabled(Boolean(h.features?.devTools))).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!enabled || !supabase) return null
  const enter = async (account) => {
    setBusy(true)
    try {
      const { tokenHash } = await api.devDemoLogin(account)
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      if (error) throw error
      play('confirm')
      onDone()
    } catch (err) {
      onError(err.message)
      setBusy(false)
    }
  }
  return (
    <div className="pixel-panel demo-login">
      <p className="dash-h">🧪 Modo demo</p>
      <p className="dash-muted">Entra directo a las cuentas de demostración (solo en desarrollo).</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="pixel-btn cyan small" disabled={busy} onClick={() => enter('herow_demo')}>Entrar como herow_demo</button>
        <button className="pixel-btn ghost small" disabled={busy} onClick={() => enter('herow_demo2')}>Entrar como herow_demo2</button>
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, configured } = usePlayer()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
      play('confirm')
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      play('lose')
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="scene">
      <SceneBg src={BACKGROUNDS.title} dim={0.5} />
      <div className="hud">
        <Link className="pixel-btn ghost small" to="/">◀ Volver</Link>
        <Link className="pixel-btn ghost small" to="/registro">Crear cuenta</Link>
      </div>
      <div className="scene-content auth-wrap">
        <img src={SPRITES.yessenia} alt="" className="pixel-img awaken-orb" style={{ width: 120 }} />
        <form className="pixel-panel auth-form" onSubmit={submit}>
          <h1 className="pixel-title">Entrar</h1>
          <label>
            Nombre de usuaria
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="pixel-btn gold big" type="submit" disabled={busy || !configured}>
            {busy ? 'Entrando…' : '▶ Entrar'}
          </button>
          <p className="form-note">¿Olvidaste tu contraseña? Pide ayuda a tu profe o al equipo HEROW.</p>
        </form>
        {import.meta.env.DEV && <DemoLogin onError={setError} onDone={() => navigate('/dashboard', { replace: true })} />}
      </div>
    </div>
  )
}
