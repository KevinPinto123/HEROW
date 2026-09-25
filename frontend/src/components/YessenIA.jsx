import { useEffect, useRef, useState } from 'react'
import { SPRITES } from '../data/assets'
import { api } from '../lib/api'
import { play } from '../lib/sfx'

// Respuestas guionadas: se usan cuando el backend no tiene IA configurada o no responde.
const YESSENIA_RESPONSES = {
  greeting: '¡Hola! 🌀 Soy YessenIA, tu guía en HEROW. ¿En qué puedo ayudarte?',
  age: 'Esta aventura es para chicas de 15 a 17 años. ¡Si estás en ese rango, esta experiencia es para ti! 💜',
  portals: 'Hay 4 portales: 💻 Código y Datos, 🚀 Robótica y Espacio, 🎨 Diseño e Invención y 🔬 Ciencia. ¡Tú eliges cuál explorar!',
  heroines: 'Las heroínas son mujeres reales: Marie Curie, Ada Lovelace, María Reiche, Aracely Quispe y más. Elige a la tuya en El Despertar.',
  nopuedo: 'El NoPuedo es ese monstruo que te dice "no puedes". Pero juntas lo vamos a derrotar. Pedir ayuda es la estrategia más poderosa. 💪',
  safety: 'Tu seguridad es lo primero. No hay chats abiertos ni contacto directo entre jugadoras. 🔐',
  default: 'Mmm, interesante pregunta. ¿Quieres saber de los portales, las heroínas, el NoPuedo o cómo funciona tu seguridad?',
}

function scriptedReply(message) {
  const lower = message.toLowerCase()
  if (/\b(hola|hi|hey)\b/.test(lower)) return YESSENIA_RESPONSES.greeting
  if (lower.includes('edad') || lower.includes('año')) return YESSENIA_RESPONSES.age
  if (lower.includes('portal') || lower.includes('stem') || lower.includes('universo')) return YESSENIA_RESPONSES.portals
  if (lower.includes('heroína') || lower.includes('heroina') || lower.includes('mujer')) return YESSENIA_RESPONSES.heroines
  if (lower.includes('nopuedo') || lower.includes('no puedo') || lower.includes('miedo') || lower.includes('monstruo')) return YESSENIA_RESPONSES.nopuedo
  if (lower.includes('segur') || lower.includes('padres') || lower.includes('menor')) return YESSENIA_RESPONSES.safety
  return YESSENIA_RESPONSES.default
}

const SUGGESTIONS = ['¿Qué son los portales?', '¿Quiénes son las heroínas?', '¿Qué es el NoPuedo?', '¿Es seguro?']

export default function YessenIA() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'yessenia', text: '¡Hola! 🌀 Soy YessenIA. Estoy aquí para guiarte. ¿Tienes alguna duda?' },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pulse, setPulse] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const toggle = () => {
    play(isOpen ? 'blip' : 'select')
    setIsOpen(o => !o)
    setPulse(false)
  }

  const send = async (text) => {
    const content = text.trim()
    if (!content || isTyping) return

    const history = [...messages, { from: 'user', text: content }]
    setMessages(history)
    setInput('')
    setIsTyping(true)
    play('blip')

    let reply
    try {
      // El saludo inicial no se envía: el historial debe empezar con la usuaria.
      const firstUser = history.findIndex(m => m.from === 'user')
      const payload = history.slice(firstUser).slice(-12).map(m => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
      reply = (await api.yesseniaChat(payload)).reply
    } catch {
      await new Promise(r => setTimeout(r, 700))
      reply = scriptedReply(content)
    }

    setMessages(prev => [...prev, { from: 'yessenia', text: reply }])
    setIsTyping(false)
    play('select')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <>
      <button
        className={`yessenia-float-btn pixel ${pulse ? 'pulse' : ''} ${isOpen ? 'open' : ''}`}
        onClick={toggle}
        aria-label={isOpen ? 'Cerrar chat con YessenIA' : 'Abrir chat con YessenIA'}
      >
        {isOpen ? (
          <span className="yessenia-float-icon">✕</span>
        ) : (
          <>
            <img src={SPRITES.yessenia} alt="" className="pixel-img" />
            <span className="yessenia-float-label">YessenIA</span>
          </>
        )}
      </button>

      <div className={`yessenia-chat-window ${isOpen ? 'open' : ''}`}>
        <div className="yessenia-chat-header">
          <div className="yessenia-chat-header-avatar">
            <img src={SPRITES.yessenia} alt="" className="pixel-img" />
          </div>
          <div>
            <div className="yessenia-chat-header-name">YessenIA</div>
            <div className="yessenia-chat-header-status">
              <span className="yessenia-status-dot"></span> Tu guía IA
            </div>
          </div>
        </div>

        <div className="yessenia-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`yessenia-msg ${msg.from}`}>
              {msg.from === 'yessenia' && (
                <span className="yessenia-msg-avatar"><img src={SPRITES.yessenia} alt="" className="pixel-img" /></span>
              )}
              <div className="yessenia-msg-bubble">{msg.text}</div>
            </div>
          ))}
          {isTyping && (
            <div className="yessenia-msg yessenia">
              <span className="yessenia-msg-avatar"><img src={SPRITES.yessenia} alt="" className="pixel-img" /></span>
              <div className="yessenia-msg-bubble yessenia-typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="yessenia-chat-suggestions">
          {SUGGESTIONS.map(q => (
            <button key={q} className="yessenia-suggestion" onClick={() => send(q)} disabled={isTyping}>
              {q}
            </button>
          ))}
        </div>

        <div className="yessenia-chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            maxLength={800}
          />
          <button onClick={() => send(input)} className="yessenia-send-btn" disabled={!input.trim() || isTyping}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
