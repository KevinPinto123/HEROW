import { Portal } from '@portalsdk/core'
import { PortalProvider } from '@portalsdk/react'
import { useMemo } from 'react'
import { api } from './api'
import { usePlayer } from './usePlayer'

const PK = import.meta.env.VITE_PORTAL_PUBLISHABLE_KEY
const client = PK ? new Portal({ apiKey: PK }) : null

/**
 * Conecta Portal con la sesión: cada jugadora usa su propio token (lo emite el backend).
 * Al cambiar de cuenta, cambia el callback y Portal se reconecta con la nueva identidad.
 */
export function LivePortalProvider({ children }) {
  const { session } = usePlayer()
  const userId = session?.user?.id
  const token = useMemo(() => (userId ? () => api.portalToken() : undefined), [userId])
  if (!client) return children
  return <PortalProvider client={client} token={token}>{children}</PortalProvider>
}
