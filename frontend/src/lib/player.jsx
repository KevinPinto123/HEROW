import { useCallback, useEffect, useMemo, useState } from 'react'
import { EVENTS, setTag, track } from './analytics'
import { api, isNetworkError } from './api'
import { LAST_USER_KEY, loadSnapshot, saveSnapshot, writeStore } from './offline'
import { supabase, usernameToEmail } from './supabase'
import { PlayerContext } from './usePlayer'

// Sesión + estado de la jugadora (viene del backend: es la fuente de verdad).
// Sin internet se usa la última copia guardada en este dispositivo (offline: true).
export function PlayerProvider({ children }) {
  const [session, setSession] = useState(supabase ? undefined : null) // undefined = cargando
  const [loaded, setLoaded] = useState({ userId: null, state: null, error: null, offline: false })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  const refresh = useCallback(async () => {
    try {
      const next = await api.me()
      setLoaded({ userId, state: next, error: null, offline: false })
      return next
    } catch (err) {
      const cached = isNetworkError(err) ? loadSnapshot(userId, 'me') : null
      if (cached) {
        setLoaded({ userId, state: cached.data, error: null, offline: true })
        return cached.data
      }
      setLoaded({ userId, state: null, error: err, offline: false })
      throw err
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    writeStore(LAST_USER_KEY, userId)
    api.me()
      .then(next => !cancelled && setLoaded({ userId, state: next, error: null, offline: false }))
      .catch(err => {
        if (cancelled) return
        // Sesión vencida o cuenta inexistente: se cierra sola y vuelve al login.
        if (err.status === 401 || err.code === 'no_profile') {
          supabase.auth.signOut()
          return
        }
        // Sin internet: abrimos con lo último que se vio en este dispositivo.
        const cached = isNetworkError(err) ? loadSnapshot(userId, 'me') : null
        if (cached) setLoaded({ userId, state: cached.data, error: null, offline: true })
        else setLoaded({ userId, state: null, error: err, offline: false })
      })
    return () => { cancelled = true }
  }, [userId])

  // Al volver la señal, se cambia la copia guardada por el estado real.
  useEffect(() => {
    if (!userId) return
    const onOnline = () => {
      api.me().then(next => setLoaded(l => (l.userId === userId ? { ...l, state: next, error: null, offline: false } : l))).catch(() => {})
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [userId])

  // Solo vale el estado cargado para la sesión actual.
  const current = loaded.userId === userId ? loaded : { state: null, error: null, offline: false }

  // Cada estado nuevo queda guardado para poder abrir la app sin señal.
  useEffect(() => {
    if (userId && current.state && !current.offline) saveSnapshot(userId, 'me', current.state)
  }, [userId, current.state, current.offline])

  // Etiquetas para filtrar en Clarity: nunca el usuario, solo nivel y portal.
  const level = current.state?.profile?.level
  const portal = current.state?.profile?.portalId
  useEffect(() => {
    if (!level) return
    setTag('rol', 'jugadora')
    setTag('nivel', level)
    setTag('portal', portal)
  }, [level, portal])

  const setState = useCallback((updater) => {
    setLoaded(l => ({ ...l, state: typeof updater === 'function' ? updater(l.state) : updater }))
  }, [])

  const login = useCallback(async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password })
    if (error) {
      if (/fetch|network/i.test(error.message)) throw new Error('No hay internet para entrar. Mientras tanto puedes usar la Práctica sin internet o el Arcade.')
      throw new Error('Usuario o contraseña incorrectos.')
    }
  }, [])

  const register = useCallback(async (data) => {
    await api.register(data)
    await login(data.username, data.password)
    track(EVENTS.registro)
  }, [login])

  const logout = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  const value = useMemo(() => ({
    ready: session !== undefined && (!session || current.state !== null || current.error !== null),
    session,
    userId,
    state: current.state,
    setState,
    error: current.error,
    offline: current.offline,
    refresh,
    login,
    register,
    logout,
    configured: Boolean(supabase),
  }), [session, userId, current.state, current.error, current.offline, setState, refresh, login, register, logout])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
