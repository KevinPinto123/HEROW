import { ALIADOS, ALIADOS_TITULO } from '../data/aliados'

/**
 * Carrusel infinito de logos.
 *
 * El truco: pintamos la lista DOS veces y movemos la cinta un -50%.
 * Cuando la animación termina, la segunda copia está exactamente donde
 * empezó la primera, así que el salto no se ve y el bucle es perfecto.
 *
 * La copia duplicada va con aria-hidden para que un lector de pantalla
 * no lea los mismos logos dos veces.
 */

function Logo({ aliado, duplicado }) {
  const img = (
    <img
      className="aliado-logo"
      src={aliado.logo}
      alt={duplicado ? '' : aliado.nombre}
      style={aliado.escala && aliado.escala !== 1 ? { transform: `scale(${aliado.escala})` } : undefined}
      loading="lazy"
      draggable="false"
    />
  )

  if (aliado.url) {
    return (
      <a
        className={duplicado ? 'aliado-chip aliado-dup' : 'aliado-chip'}
        href={aliado.url}
        target="_blank"
        rel="noopener noreferrer"
        title={aliado.nombre}
        tabIndex={duplicado ? -1 : 0}
        aria-hidden={duplicado || undefined}
      >
        {img}
      </a>
    )
  }

  return (
    <div className={duplicado ? 'aliado-chip aliado-dup' : 'aliado-chip'} title={aliado.nombre}>
      {img}
    </div>
  )
}

export default function Aliados() {
  if (!ALIADOS.length) return null

  // La velocidad crece con la cantidad de logos: así el ritmo se siente igual
  // tanto con 4 como con 12.
  const segundos = Math.max(18, ALIADOS.length * 5)

  return (
    <aside className="aliados-banda" aria-label={ALIADOS_TITULO}>
      <p className="aliados-titulo">{ALIADOS_TITULO}</p>

      <div className="aliados-marquee">
        <div className="aliados-track" style={{ animationDuration: `${segundos}s` }}>
          {ALIADOS.map(a => <Logo key={a.id} aliado={a} />)}
          {/* Copia idéntica: es lo que hace que el bucle no tenga costura. */}
          {ALIADOS.map(a => <Logo key={`${a.id}-dup`} aliado={a} duplicado />)}
        </div>
      </div>
    </aside>
  )
}
