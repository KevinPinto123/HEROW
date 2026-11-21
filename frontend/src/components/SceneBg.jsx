// Fondo pixel a pantalla completa. Si `src` aún no existe, se ve `fallback` (capa de abajo).
export default function SceneBg({ src, fallback, dim = 0.35, children }) {
  const layers = [src, fallback].filter(Boolean).map(u => `url("${u}")`).join(', ')
  return (
    <div className="scene-bg" aria-hidden="true">
      <div className="scene-bg-image" style={{ backgroundImage: layers }} />
      <div className="scene-bg-dim" style={{ opacity: dim }} />
      <div className="scene-bg-scanlines" />
      {children}
    </div>
  )
}
