import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HEROINES, PORTALS } from '../data/heroines'
import { api } from '../lib/api'
import { EVENTS, track } from '../lib/analytics'
import { readStore, writeStore } from '../lib/offline'
import { play } from '../lib/sfx'

// Kit HEROW sin internet: un docente lo descarga una vez (en la ciudad, en una cabina)
// y lo imprime para jugar en el aula sin señal. También queda guardado en el dispositivo.
const KIT_KEY = 'herow:kit'
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const TYPE_LABEL = { elegir: 'Elegir', ordenar: 'Ordenar', error: 'Detectar el error', decidir: 'Decidir' }

const RETOS = [
  { title: 'Reto NoPuedo 1 · Tu perfil en papel', text: 'Escribe en una hoja quién eres en una línea, 3 habilidades que tienes y qué heroína te inspira y por qué. Compártelo con tu equipo.' },
  { title: 'Reto NoPuedo 2 · Un problema de tu comunidad', text: 'Elige un problema real de tu barrio o comunidad (agua, basura, transporte, salud). Dibuja una solución usando ciencia o tecnología y explica en 5 pasos cómo la harías.' },
  { title: 'Reto NoPuedo 3 · Pide ayuda', text: 'Pregunta a una persona adulta que trabaje en algo que te interese: ¿cómo empezó? ¿qué estudió? Anota su respuesta. Pedir ayuda es la estrategia más poderosa.' },
]

export default function Kit() {
  const [kit, setKit] = useState(() => readStore(KIT_KEY))
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.offlineKit()
      .then(r => {
        if (!alive) return
        const next = { ...r, savedAt: new Date().toISOString() }
        writeStore(KIT_KEY, next)
        setKit(next)
      })
      .catch(() => { if (alive) setError('Sin internet: se muestra el kit guardado en este dispositivo (si existe).') })
    return () => { alive = false }
  }, [])

  const portals = kit ? Object.entries(kit.portals).filter(([p]) => PORTALS[p]) : []

  return (
    <div className="kit-page">
      <header className="kit-toolbar no-print">
        <Link className="pixel-btn ghost small" to="/">◀ HEROW</Link>
        <button className="pixel-btn gold small" onClick={() => { play('confirm'); track(EVENTS.kitImpreso); window.print() }} disabled={!kit}>🖨️ Imprimir o guardar PDF</button>
      </header>

      <article className="kit-sheet">
        <section className="kit-cover">
          <h1>HEROW · Kit sin internet</h1>
          <p className="kit-sub">Orientación vocacional STEM jugando · Para docentes de 4to y 5to de secundaria</p>
          <p>
            Este kit lleva HEROW a aulas sin internet. Las estudiantes forman equipos, responden preguntas de los
            4 portales, conocen a mujeres reales de la ciencia y enfrentan al <strong>NoPuedo</strong> con retos prácticos.
            Cuando tengan señal, pueden crear su cuenta en HEROW y seguir su aventura.
          </p>
          {error && <p className="kit-note no-print">{error}</p>}
          {!kit && <p className="kit-note">Abre esta página una vez con internet para descargar las preguntas.</p>}
        </section>

        <section className="kit-block">
          <h2>Cómo jugar en el aula (45 minutos)</h2>
          <ol>
            <li><strong>Equipos:</strong> formen grupos de 3 a 5. Cada grupo elige una heroína de las tarjetas de abajo.</li>
            <li><strong>Combate de conocimiento:</strong> la docente lee una pregunta y sus alternativas. Cada equipo tiene 30 segundos para escribir su letra.</li>
            <li><strong>Puntos:</strong> respuesta correcta <strong>+10</strong> · respuesta incorrecta <strong>+5</strong> (intentarlo también suma) · sin responder <strong>0</strong>.</li>
            <li><strong>Explicación:</strong> después de cada pregunta, lee la explicación de la hoja de respuestas. Aprender es más importante que ganar.</li>
            <li><strong>El NoPuedo:</strong> el equipo que llegue a 100 puntos enfrenta un Reto NoPuedo (al final del kit) y lo presenta al aula.</li>
          </ol>
        </section>

        {portals.map(([portal, questions]) => (
          <section key={portal} className="kit-block kit-portal">
            <h2>{PORTALS[portal].emoji} Portal {PORTALS[portal].name}</h2>
            <div className="kit-cards">
              {questions.map((q, n) => (
                <div key={q.id} className="kit-card">
                  <p className="kit-card-head">Pregunta {n + 1} · {TYPE_LABEL[q.type] ?? q.type} · {'★'.repeat(q.difficulty)}</p>
                  <p className="kit-q">{q.text}</p>
                  <ol className="kit-options">
                    {q.options.map((o, i) => <li key={i}><strong>{LETTERS[i]})</strong> {o}</li>)}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="kit-block">
          <h2>⚡ Tarjetas de heroínas</h2>
          <p>Mujeres reales que cambiaron la ciencia y la tecnología. Recórtalas y repártelas a los equipos.</p>
          <div className="kit-cards">
            {HEROINES.map(h => (
              <div key={h.id} className="kit-card kit-hero">
                <p className="kit-card-head">{PORTALS[h.portal]?.emoji} {PORTALS[h.portal]?.name}</p>
                <p className="kit-q"><strong>{h.name}</strong>{h.country ? ` · ${h.country}` : ''}</p>
                <p className="kit-power">Poder: {h.power}</p>
                <p>{h.bio}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="kit-block">
          <h2>👾 Retos NoPuedo</h2>
          {RETOS.map(r => (
            <div key={r.title} className="kit-card kit-reto">
              <p className="kit-q"><strong>{r.title}</strong></p>
              <p>{r.text}</p>
            </div>
          ))}
        </section>

        {portals.length > 0 && (
          <section className="kit-block kit-answers">
            <h2>🔑 Hoja de respuestas (solo para la docente)</h2>
            {portals.map(([portal, questions]) => (
              <div key={portal}>
                <h3>{PORTALS[portal].emoji} {PORTALS[portal].name}</h3>
                <ol>
                  {questions.map(q => (
                    <li key={q.id}><strong>{LETTERS[q.answer]})</strong> {q.options[q.answer]} — {q.explain}</li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}

        <footer className="kit-foot">
          HEROW · Portales del Futuro · Para chicas de 15 a 17 años · Sin chats abiertos, 100% seguro.
        </footer>
      </article>
    </div>
  )
}
