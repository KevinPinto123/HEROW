import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { supabase, usernameToEmail } from './supabase'
import { PlayerContext } from './usePlayer'

// Sesión + estado de la jugadora (viene del backend: es la fuente de verdad).
export function PlayerProvider({ children }) {
  const [session, setSession] = useState(supabase ? undefined : null) // undefined = cargando
  const [loaded, setLoaded] = useState({ userId: null, state: null, error: null })

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
      setLoaded({ userId, state: next, error: null })
      return next
    } catch (err) {
      setLoaded({ userId, state: null, error: err })
      throw err
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    api.me()
      .then(next => !cancelled && setLoaded({ userId, state: next, error: null }))
      .catch(err => {
        if (cancelled) return
        // Sesión vencida o cuenta inexistente: se cierra sola y vuelve al login.
        if (err.status === 401 || err.code === 'no_profile') {
          supabase.auth.signOut()
          return
        }
        setLoaded({ userId, state: null, error: err })
      })
    return () => { cancelled = true }
  }, [userId])

  // Solo vale el estado cargado para la sesión actual.
  const current = loaded.userId === userId ? loaded : { state: null, error: null }

  const setState = useCallback((updater) => {
    setLoaded(l => ({ ...l, state: typeof updater === 'function' ? updater(l.state) : updater }))
  }, [])

  const login = useCallback(async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password })
    if (error) throw new Error('Usuario o contraseña incorrectos.')
  }, [])

  const register = useCallback(async (data) => {
    await api.register(data)
    await login(data.username, data.password)
  }, [login])

  const logout = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  const value = useMemo(() => ({
    ready: session !== undefined && (!session || current.state !== null || current.error !== null),
    session,
    state: current.state,
    setState,
    error: current.error,
    refresh,
    login,
    register,
    logout,
    configured: Boolean(supabase),
  }), [session, current.state, current.error, setState, refresh, login, register, logout])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
