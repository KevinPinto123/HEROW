import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAvailable, initAnalytics, onConsentReset, readConsent, setConsent } from '../lib/analytics'
import { play } from '../lib/sfx'

// Aviso de medición: Clarity solo se activa si la persona acepta.
export default function ConsentBanner() {
  const [open, setOpen] = useState(() => analyticsAvailable && readConsent() === null)

  useEffect(() => {
    initAnalytics()
    return onConsentReset(() => setOpen(analyticsAvailable))
  }, [])

  if (!open) return null

  const choose = (accepted) => {
    play(accepted ? 'confirm' : 'blip')
    setConsent(accepted)
    setOpen(false)
  }

  return (
    <div className="consent-banner" role="dialog" aria-label="Medición anónima">
      <p>
        <strong>📊 ¿Nos ayudas a mejorar HEROW?</strong>
        Medimos de forma anónima qué pantallas se usan y dónde se hace clic (Microsoft Clarity). No guardamos tu
        usuario ni lo que escribes. <Link className="legal-link" to="/privacidad">Más info</Link>
      </p>
      <div className="consent-actions">
        <button className="pixel-btn gold small" onClick={() => choose(true)}>Sí, acepto</button>
        <button className="pixel-btn ghost small" onClick={() => choose(false)}>No, gracias</button>
      </div>
    </div>
  )
}
