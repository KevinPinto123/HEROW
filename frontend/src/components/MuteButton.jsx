import { useState } from 'react'
import { isMuted, play, toggleMute } from '../lib/sfx'

export default function MuteButton() {
  const [muted, setMuted] = useState(isMuted)
  return (
    <button
      className="pixel-btn ghost small mute-btn"
      onClick={() => { const m = toggleMute(); setMuted(m); if (!m) play('blip') }}
      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
      title={muted ? 'Activar sonido' : 'Silenciar'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
