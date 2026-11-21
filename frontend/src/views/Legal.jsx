import { useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { canalDeContacto } from '../data/contacto'
import { ACTUALIZADO, DOCUMENTOS } from '../data/legal'
import { play } from '../lib/sfx'

/** Convierte **negrita** en <strong>. Es lo único que necesitan estos textos. */
function conNegritas(texto) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((trozo, i) =>
    trozo.startsWith('**') && trozo.endsWith('**')
      ? <strong key={i}>{trozo.slice(2, -2)}</strong>
      : trozo,
  )
}

function BloqueContacto() {
  const canal = canalDeContacto()
  if (canal.tipo === 'correo') {
    return (
      <p>
        Escríbenos a <a className="legal-link" href={canal.href}>{canal.texto}</a> y te
        respondemos. Si eres apoderado o apoderada, cuéntanos el nombre de usuaria de la jugadora
        para poder ayudarte más rápido.
      </p>
    )
  }
  return (
    <p>
      Puedes escribirnos desde <Link className="legal-link" to="/#sumate">{canal.texto}</Link>.
      Si eres apoderado o apoderada, cuéntanos el nombre de usuaria de la jugadora para poder
      ayudarte más rápido.
    </p>
  )
}

export default function Legal({ doc }) {
  const navigate = useNavigate()
  const documento = DOCUMENTOS[doc]

  // Al abrir una página legal siempre se empieza desde arriba.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [doc])

  if (!documento) return <Navigate to="/" replace />

  return (
    <div className="landing-view landing-pixel legal-view">
      <nav className="navbar scrolled">
        <div className="container">
          <Link to="/" className="nav-logo" onClick={() => play('blip')}>
            <span className="nav-logo-text">HEROW</span>
          </Link>
          <ul className="nav-links">
            <li><Link to="/privacidad">Privacidad</Link></li>
            <li><Link to="/terminos">Términos</Link></li>
            <li><Link to="/seguridad">Seguridad</Link></li>
          </ul>
          <button className="nav-cta" onClick={() => { play('blip'); navigate('/') }}>Volver</button>
        </div>
      </nav>

      <main className="legal-main">
        <div className="legal-inner">
          <p className="legal-volver">
            <Link to="/" onClick={() => play('blip')}>◀ Volver al inicio</Link>
          </p>

          <header className="legal-header">
            <h1 className="pixel-title legal-titulo">{documento.titulo}</h1>
            <p className="legal-entradilla">{documento.entradilla}</p>
            <p className="legal-fecha">Última actualización: {ACTUALIZADO}</p>
          </header>

          {documento.secciones.map((seccion, i) => (
            <section key={seccion.titulo} className="legal-seccion">
              <h2>
                <span className="legal-num">{String(i + 1).padStart(2, '0')}</span>
                {seccion.titulo}
              </h2>

              {seccion.parrafos?.map(p => <p key={p}>{conNegritas(p)}</p>)}

              {seccion.lista && (
                <ul className="legal-lista">
                  {seccion.lista.map(item => <li key={item}>{conNegritas(item)}</li>)}
                </ul>
              )}

              {seccion.cierre?.map(p => <p key={p}>{conNegritas(p)}</p>)}

              {seccion.contacto && <BloqueContacto />}
            </section>
          ))}

          <div className="legal-otras">
            <p>Lee también:</p>
            <div className="legal-otras-links">
              {Object.values(DOCUMENTOS)
                .filter(d => d.id !== documento.id)
                .map(d => (
                  <Link key={d.id} className="pixel-btn ghost small" to={`/${d.id}`} onClick={() => play('blip')}>
                    {d.titulo}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
