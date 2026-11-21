// Efectos de sonido 8-bit generados con Web Audio (sin archivos).

let ctx
let muted = false
try {
  muted = localStorage.getItem('herow.muted') === '1'
} catch {
  // sin almacenamiento: sonido activado
}

function audio() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Una nota cuadrada con caída rápida, como una consola de 8 bits.
function tone(freq, start, duration, { type = 'square', volume = 0.08, slideTo } = {}) {
  const ac = audio()
  const t = ac.currentTime + start
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration)
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration)
}

const SOUNDS = {
  blip: () => tone(880, 0, 0.05, { volume: 0.04 }),
  select: () => { tone(660, 0, 0.07); tone(990, 0.07, 0.1) },
  confirm: () => { tone(523, 0, 0.08); tone(659, 0.08, 0.08); tone(784, 0.16, 0.14) },
  hit: () => tone(220, 0, 0.18, { type: 'sawtooth', slideTo: 60, volume: 0.1 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.12, 0.2, { type: 'triangle', volume: 0.1 })),
  portal: () => tone(200, 0, 0.6, { type: 'triangle', slideTo: 1600, volume: 0.1 }),
  boss: () => { tone(110, 0, 0.5, { type: 'sawtooth', volume: 0.1 }); tone(104, 0.1, 0.6, { type: 'sawtooth', volume: 0.08 }) },
}

export function play(name) {
  if (muted) return
  try {
    SOUNDS[name]?.()
  } catch {
    // Audio no disponible: el juego sigue sin sonido.
  }
}

export const isMuted = () => muted

export function toggleMute() {
  muted = !muted
  try {
    localStorage.setItem('herow.muted', muted ? '1' : '0')
  } catch {
    // ignorar
  }
  return muted
}
