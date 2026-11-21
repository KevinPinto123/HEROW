import { useState } from 'react'
import { api } from '../lib/api'
import { play } from '../lib/sfx'
import PixelArt from './PixelArt'

const REASONS = [
  ['nombre_ofensivo', 'Su nombre es ofensivo'],
  ['me_incomoda', 'Algo me hizo sentir incómoda'],
  ['trampa', 'Creo que hace trampa'],
  ['otro', 'Otro motivo'],
]

/** Reportar y bloquear a la rival. La partida termina y no se vuelven a emparejar. */
export function ReportButton({ roomId, rival }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const send = async (reason) => {
    setError('')
    try {
      await api.arcadeReport(roomId, reason)
      setSent(true)
      play('confirm')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <button className="pixel-btn ghost small arc-report" onClick={() => setOpen(true)}><PixelArt name="flag" size={12} /> Reportar</button>
      {open && (
        <div className="arc-modal" role="dialog" aria-modal="true" aria-label="Reportar a la rival">
          <div className="pixel-panel arc-modal-box">
            {sent ? (
              <>
                <p className="arc-label">Gracias por avisarnos</p>
                <p>Bloqueamos a <strong>{rival}</strong>: no volverán a emparejarte con ella. El equipo HEROW revisará el reporte.</p>
                <p className="arc-muted">Si alguien te hizo sentir mal, cuéntaselo también a una persona adulta de confianza.</p>
                <button className="pixel-btn gold small" onClick={() => setOpen(false)}>Entendido</button>
              </>
            ) : (
              <>
                <p className="arc-label">Reportar a {rival}</p>
                <p>La partida terminará y no volverán a emparejarte con ella.</p>
                <div className="arc-col">
                  {REASONS.map(([id, text]) => <button key={id} className="pixel-btn ghost small" onClick={() => send(id)}>{text}</button>)}
                </div>
                {error && <p className="form-error">{error}</p>}
                <button className="pixel-btn ghost small" onClick={() => setOpen(false)}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export function SafetyNote() {
  return (
    <ul className="arc-safety arc-wide">
      <li>Sin chat: solo reacciones.</li>
      <li>Las demás solo ven tu nombre de usuaria.</li>
      <li>Puedes reportar y bloquear en cualquier momento.</li>
    </ul>
  )
}
