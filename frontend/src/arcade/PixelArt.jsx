import { PALETTE, SPRITES } from './sprites'

/** Dibuja un sprite de sprites.js como SVG nítido (sin suavizado). */
export default function PixelArt({ name, size = 24, title, className = '' }) {
  const rows = SPRITES[name]
  if (!rows) return null
  const w = rows[0].length
  const h = rows.length
  const rects = []
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const color = PALETTE[row[x]]
      if (color) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={color} />)
    }
  })
  return (
    <svg
      className={`pixel-art ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  )
}
