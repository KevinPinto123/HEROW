import { useState } from 'react'
import { api } from '../lib/api'
import { play } from '../lib/sfx'

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
      <button className="arc-btn small ghost danger" onClick={() => setOpen(true)}>🚩 Reportar</button>
      {open && (
        <div className="arc-modal" role="dialog" aria-modal="true" aria-label="Reportar a la rival">
          <div className="arc-modal-box">
            {sent ? (
              <>
                <h3>Gracias por avisarnos 💜</h3>
                <p>Bloqueamos a <strong>{rival}</strong>: no volverán a emparejarte con ella. El equipo HEROW revisará el reporte.</p>
                <p className="arc-muted">Si alguien te hizo sentir mal, cuéntaselo también a una persona adulta de confianza.</p>
                <button className="arc-btn" onClick={() => setOpen(false)}>Entendido</button>
              </>
            ) : (
              <>
                <h3>Reportar a {rival}</h3>
                <p>La partida terminará y no volverán a emparejarte con ella.</p>
                <div className="arc-col">
                  {REASONS.map(([id, text]) => <button key={id} className="arc-btn ghost" onClick={() => send(id)}>{text}</button>)}
                </div>
                {error && <p className="arc-error">{error}</p>}
                <button className="arc-btn small ghost" onClick={() => setOpen(false)}>Cancelar</button>
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
    <div className="arc-safety">
      <h3>🛡️ Jugar online en HEROW es seguro</h3>
      <ul>
        <li><strong>Sin chat:</strong> solo reacciones con emojis (👏 💜 🔥 😮 💪 🤝).</li>
        <li><strong>Sin datos personales:</strong> las demás solo ven tu nombre de usuaria.</li>
        <li><strong>Juega con tu amiga:</strong> crea una sala privada y pásale el código en persona.</li>
        <li><strong>Reportar y bloquear:</strong> con un toque, y no vuelves a cruzarte con esa persona.</li>
        <li><strong>Árbitro justo:</strong> el servidor revisa cada jugada; nadie puede hacer trampa.</li>
      </ul>
    </div>
  )
}
