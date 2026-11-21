// ───────── Código Robot: lógica (sin React) ─────────
// La jugadora arma un programa con bloques: AVANZAR, GIRAR IZQ, GIRAR DER.
// Tocar el mismo bloque seguido suma repeticiones (AVANZAR ×3): así se aprende
// que un programa corto y claro es mejor.
// Mapa: S inicio (mira a la derecha) · G meta · # muro · . libre

export const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]] // arriba, derecha, abajo, izquierda
export const MAX_REPEAT = 9

export const LEVELS = [
  { name: 'Primeros pasos', map: ['......', '......', '.S..G.', '......', '......', '......'] },
  { name: 'Una vuelta', map: ['......', '.S....', '......', '......', '.G....', '......'] },
  { name: 'La cámara', map: ['......', '.####.', '.#G.#.', '.#..#.', '.##.#.', 'S...#.'] },
  { name: 'El muro', map: ['......', '.S.#..', '...#..', '...#G.', '......', '......'] },
  { name: 'Pasillos', map: ['S.#...', '.##.#.', '....#.', '.##...', '...##.', '.#...G'] },
  { name: 'Espiral', map: ['S.....', '#####.', '.G#...', '.#..#.', '.####.', '......'] },
  { name: 'Zigzag', map: ['G#....', '.#.##.', '.#..#.', '.##.#.', '....#S', '.##...'] },
  { name: 'Laberinto final', map: ['....#G', '.##.#.', '.#..#.', '.#.##.', '.#....', 'S#....'] },
]

export function parseLevel(def) {
  let start = null
  let goal = null
  def.map.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === 'S') start = { r, c, d: 1 }
    if (ch === 'G') goal = { r, c }
  }))
  const blocked = (r, c) => r < 0 || c < 0 || r >= def.map.length || c >= def.map[0].length || def.map[r][c] === '#'
  return { ...def, start, goal, rows: def.map.length, cols: def.map[0].length, blocked }
}

/** Agrega un comando: si es igual al último, suma una repetición. */
export function addCommand(program, cmd) {
  const last = program.at(-1)
  if (last && last.cmd === cmd && last.n < MAX_REPEAT) return [...program.slice(0, -1), { cmd, n: last.n + 1 }]
  return [...program, { cmd, n: 1 }]
}

/**
 * Ejecuta el programa y devuelve cada paso para animarlo.
 * steps: [{ r, c, d, block }] · result: 'goal' | 'crash' | 'short' (terminó sin llegar)
 */
export function run(level, program) {
  let { r, c, d } = level.start
  const steps = [{ r, c, d, block: -1 }]
  for (let b = 0; b < program.length; b++) {
    const { cmd, n } = program[b]
    for (let k = 0; k < n; k++) {
      if (cmd === 'L') d = (d + 3) % 4
      else if (cmd === 'R') d = (d + 1) % 4
      else {
        const nr = r + DIRS[d][0]
        const nc = c + DIRS[d][1]
        if (level.blocked(nr, nc)) {
          steps.push({ r, c, d, block: b, crash: { r: nr, c: nc } })
          return { steps, result: 'crash' }
        }
        r = nr
        c = nc
      }
      steps.push({ r, c, d, block: b })
      if (r === level.goal.r && c === level.goal.c) return { steps, result: 'goal' }
    }
  }
  return { steps, result: 'short' }
}

/** Menor cantidad de bloques para llegar a la meta (búsqueda en anchura). */
export function solve(level) {
  const key = (s) => `${s.r},${s.c},${s.d}`
  const queue = [{ ...level.start, blocks: 0, last: null }]
  const seen = new Map([[`${key(level.start)}|`, 0]])
  while (queue.length) {
    const s = queue.shift()
    if (s.r === level.goal.r && s.c === level.goal.c) return s.blocks
    const nexts = []
    for (const [cmd, turns] of [['L', 3], ['R', 1]]) {
      for (let n = 1; n <= 3; n++) nexts.push({ cmd, r: s.r, c: s.c, d: (s.d + turns * n) % 4 })
    }
    let r = s.r
    let c = s.c
    for (let n = 1; n <= MAX_REPEAT; n++) {
      r += DIRS[s.d][0]
      c += DIRS[s.d][1]
      if (level.blocked(r, c)) break
      nexts.push({ cmd: 'F', r, c, d: s.d })
      if (r === level.goal.r && c === level.goal.c) break
    }
    for (const nx of nexts) {
      if (nx.cmd === s.last) continue // dos bloques iguales seguidos serían uno solo
      const k = `${key(nx)}|${nx.cmd}`
      if (seen.has(k)) continue
      seen.set(k, s.blocks + 1)
      queue.push({ ...nx, blocks: s.blocks + 1, last: nx.cmd })
    }
  }
  return null
}

export function starsFor(blocks, optimal) {
  if (blocks <= optimal) return 3
  if (blocks <= optimal + 2) return 2
  return 1
}
