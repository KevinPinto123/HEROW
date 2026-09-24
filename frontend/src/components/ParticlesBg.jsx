import { useEffect, useMemo } from 'react'

export default function ParticlesBg({ count = 25 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${2 + Math.random() * 4}s`,
      size: `${2 + Math.random() * 4}px`,
      color: ['var(--purple-portal)', 'var(--pink-neon)', 'var(--cyan-future)'][Math.floor(Math.random() * 3)]
    }))
  , [count])

  return (
    <div className="particles-bg">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.color,
            width: p.size,
            height: p.size
          }}
        />
      ))}
    </div>
  )
}
