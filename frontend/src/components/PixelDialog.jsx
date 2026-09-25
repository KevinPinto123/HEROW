import { useEffect, useState } from 'react'
import { SPRITES } from '../data/assets'

const now = () => performance.now()

// Caja de diálogo estilo JRPG con texto que se escribe letra por letra.
// Se calcula por tiempo transcurrido: si la pestaña queda en segundo plano (el navegador
// frena los temporizadores), al volver el texto ya está completo.
// Click en la caja = mostrar todo el texto de golpe.
export default function PixelDialog({ text, speaker = 'YessenIA', avatar = SPRITES.yessenia, speed = 22, children }) {
  const [typing, setTyping] = useState({ text, startedAt: null, skip: false, count: 0 })

  // Reinicia la animación si cambia el texto.
  if (typing.text !== text) setTyping({ text, startedAt: null, skip: false, count: 0 })

  const count = typing.skip ? text.length : typing.count
  const done = count >= text.length

  useEffect(() => {
    if (done) return
    // Solo setTimeout (requestAnimationFrame se pausa en pestañas ocultas).
    let timer
    const start = typing.startedAt ?? now()
    const tick = () => {
      const next = Math.min(text.length, Math.floor((now() - start) / speed) + 1)
      setTyping(t => (t.text === text ? { ...t, startedAt: start, count: next } : t))
      if (next < text.length) timer = setTimeout(tick, speed)
    }
    tick()
    return () => clearTimeout(timer)
  }, [text, speed, done, typing.startedAt])

  return (
    <div className="pixel-dialog" onClick={() => setTyping(t => ({ ...t, skip: true }))}>
      {avatar && (
        <div className="pixel-dialog-avatar">
          <img src={avatar} alt="" className="pixel-img" />
        </div>
      )}
      <div className="pixel-dialog-body">
        <div className="pixel-dialog-speaker">{speaker}</div>
        <p className="pixel-dialog-text">
          {text.slice(0, count)}
          {!done && <span className="pixel-caret">▌</span>}
        </p>
        {done && children && <div className="pixel-dialog-actions">{children}</div>}
      </div>
    </div>
  )
}
