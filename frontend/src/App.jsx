import { Suspense, lazy } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom'
import MuteButton from './components/MuteButton'
import YessenIA from './components/YessenIA'
import { PlayerProvider } from './lib/player'
import { LivePortalProvider } from './lib/portal'
import { usePlayer } from './lib/usePlayer'
import Landing from './views/Landing'

// Cada pantalla se descarga solo cuando se visita.
const Awakening = lazy(() => import('./views/Awakening'))
const Boss = lazy(() => import('./views/Boss'))
const Combat = lazy(() => import('./views/Combat'))
const Dashboard = lazy(() => import('./views/Dashboard'))
const LiveCombat = lazy(() => import('./views/LiveCombat'))
const Login = lazy(() => import('./views/Login'))
const Mission = lazy(() => import('./views/Mission'))
const Multiverso = lazy(() => import('./views/Multiverso'))
const Niveles = lazy(() => import('./views/Niveles'))
const Register = lazy(() => import('./views/Register'))

function Loading() {
  return (
    <div className="scene center" style={{ display: 'grid', placeItems: 'center' }}>
      <p className="pixel-title" style={{ fontSize: '0.8rem' }}>Cargando<span className="pixel-caret">▌</span></p>
    </div>
  )
}

// Rutas que exigen sesión. Si aún no elige heroína, la manda al Despertar.
function Protected({ children, needsHeroine = true }) {
  const { ready, session, state, error } = usePlayer()
  const location = useLocation()
  if (!ready) return <Loading />
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (error && !state) {
    return (
      <div className="scene" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
        <div className="pixel-panel" style={{ maxWidth: 520 }}>
          <h2 className="pixel-title" style={{ fontSize: '0.8rem', marginBottom: 12 }}>No pudimos cargar tu progreso</h2>
          <p>{error.message}</p>
          <button className="pixel-btn gold" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    )
  }
  if (needsHeroine && !state?.profile?.heroineId) return <Navigate to="/despertar" replace />
  return children
}

// Si ya inició sesión, no tiene sentido ver login/registro.
function GuestOnly({ children }) {
  const { ready, session } = usePlayer()
  if (!ready) return <Loading />
  if (session) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <PlayerProvider>
      <LivePortalProvider>
      <Router>
        <div className="app">
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/registro" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/entrar" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/despertar" element={<Protected needsHeroine={false}><Awakening /></Protected>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/multiverso" element={<Protected><Multiverso /></Protected>} />
            <Route path="/niveles" element={<Protected><Niveles /></Protected>} />
            <Route path="/combate" element={<Protected><Combat /></Protected>} />
            <Route path="/vivo" element={<Protected><LiveCombat /></Protected>} />
            <Route path="/mision" element={<Protected><Mission /></Protected>} />
            <Route path="/boss" element={<Protected><Boss /></Protected>} />
            <Route path="/onboarding" element={<Navigate to="/registro" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          <YessenIA />
          <MuteButton />
        </div>
      </Router>
      </LivePortalProvider>
    </PlayerProvider>
  )
}
