// ───────── Chispa y Gota: motor del juego (sin React ni canvas) ─────────
// Juego cooperativo original de HEROW. Chispa (fuego) cruza la lava; Gota (agua)
// cruza el agua; el ácido verde apaga a las dos. Cada una recoge sus cristales y
// llega a su puerta. Los botones abren las compuertas mientras alguien los pisa.

export const T = 32 // tamaño de cada baldosa en píxeles
export const PHYS = {
  GRAVITY: 1800,
  JUMP: 640, // salta ~3 baldosas
  SPEED: 190,
  W: 20,
  H: 28,
}

// Leyenda: # pared · L lava · W agua · A ácido · D compuerta · b botón
//          f cristal de fuego · w cristal de agua · F puerta de Chispa · G puerta de Gota
//          1 inicio de Chispa · 2 inicio de Gota
export const LEVELS = [
  {
    name: 'El laboratorio',
    tip: '',
    map: [
      '########################',
      '#......................#',
      '#.F.G..f...............#',
      '##########.............#',
      '#......................#',
      '#...........w..f.......#',
      '#...........####.......#',
      '#......................#',
      '#..................w...#',
      '#................####..#',
      '#......................#',
      '#.12.....f....w........#',
      '#####LL####WW#####AA####',
      '########################',
    ],
  },
  {
    name: 'La compuerta',
    tip: 'Una pisa el botón morado mientras la otra cruza la compuerta.',
    map: [
      '########################',
      '#.......#..............#',
      '#.......#..............#',
      '#.......#..............#',
      '#.......#..............#',
      '#.......#.....w...f....#',
      '#.......#....######....#',
      '#.......#..............#',
      '#.......#..............#',
      '#.......D.####.........#',
      '#.......D..............#',
      '#.F..Gb.D...w...b....12#',
      '####WW########AA##LL####',
      '########################',
    ],
  },
  {
    name: 'La torre',
    tip: 'Arriba: Chispa a la izquierda, Gota a la derecha.',
    map: [
      '########################',
      '#......................#',
      '#.F..w............f..G.#',
      '####LL#..........#WW####',
      '#......................#',
      '#.........f....w.......#',
      '#.......####AA####.....#',
      '#......................#',
      '#...f..............w...#',
      '#..####..........####..#',
      '#......................#',
      '#.........1..2.........#',
      '########################',
      '########################',
    ],
  },
]

export const HEROES = [
  { id: 'chispa', name: 'Chispa', element: 'fire', gem: 'f', door: 'F', spawn: '1', color: '#FF6B35', light: '#FFD166' },
  { id: 'gota', name: 'Gota', element: 'water', gem: 'w', door: 'G', spawn: '2', color: '#3A86FF', light: '#9BF6FF' },
]

const SOLID = new Set(['#', 'L', 'W', 'A'])

/** Crea el estado de un nivel. */
export function loadLevel(index) {
  const def = LEVELS[index]
  const grid = def.map.map(row => row.split(''))
  const gems = []
  const doors = {}
  const buttons = []
  const spawns = {}
  grid.forEach((row, r) => row.forEach((ch, c) => {
    if (ch === 'f' || ch === 'w') { gems.push({ kind: ch, r, c, taken: false }); row[c] = '.' }
    else if (ch === 'F' || ch === 'G') { doors[ch] = { r, c }; row[c] = '.' }
    else if (ch === 'b') { buttons.push({ r, c }); row[c] = '.' }
    else if (ch === '1' || ch === '2') { spawns[ch] = { r, c }; row[c] = '.' }
  }))
  const players = HEROES.map(h => {
    const s = spawns[h.spawn]
    return {
      ...h,
      x: s.c * T + (T - PHYS.W) / 2,
      y: (s.r + 1) * T - PHYS.H,
      vx: 0, vy: 0, onGround: false, atDoor: false, gems: 0, facing: 1,
    }
  })
  return {
    index, name: def.name, tip: def.tip, grid, gems, doors, buttons, players,
    rows: grid.length, cols: grid[0].length,
    open: false, // compuertas abiertas
    status: 'playing', // playing | dead | won
    deadId: null, time: 0,
  }
}

export function tileAt(s, r, c) {
  if (r < 0 || c < 0 || r >= s.rows || c >= s.cols) return '#'
  return s.grid[r][c]
}

function solidAt(s, r, c) {
  const t = tileAt(s, r, c)
  return SOLID.has(t) || (t === 'D' && !s.open)
}

function overlapsSolid(s, x, y, w, h) {
  const c0 = Math.floor(x / T)
  const c1 = Math.floor((x + w - 0.001) / T)
  const r0 = Math.floor(y / T)
  const r1 = Math.floor((y + h - 0.001) / T)
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidAt(s, r, c)) return true
  return false
}

const overlap = (p, r, c) => p.x < (c + 1) * T && p.x + PHYS.W > c * T && p.y < (r + 1) * T && p.y + PHYS.H > r * T

/** ¿Qué hay bajo los pies? (las dos esquinas) */
function floorTiles(s, p) {
  const r = Math.floor((p.y + PHYS.H + 1) / T)
  return [tileAt(s, r, Math.floor((p.x + 1) / T)), tileAt(s, r, Math.floor((p.x + PHYS.W - 1) / T))]
}

export function deadly(element, tile) {
  return tile === 'A' || (tile === 'L' && element === 'water') || (tile === 'W' && element === 'fire')
}

/**
 * Avanza la simulación dt segundos.
 * input: [{ left, right, jump }, { left, right, jump }] (Chispa, Gota)
 */
export function step(s, input, dt) {
  if (s.status !== 'playing') return s
  s.time += dt

  // Las compuertas se abren mientras alguien pisa un botón.
  s.open = Boolean(s.forceOpen) || s.buttons.some(b => s.players.some(p => overlap(p, b.r, b.c)))

  s.players.forEach((p, i) => {
    const k = input[i] ?? {}
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0)
    p.vx = dir * PHYS.SPEED
    if (dir) p.facing = dir
    if (k.jump && p.onGround) {
      p.vy = -PHYS.JUMP
      p.onGround = false
    }
    p.vy = Math.min(p.vy + PHYS.GRAVITY * dt, 900)

    // Eje X
    const nx = p.x + p.vx * dt
    if (!overlapsSolid(s, nx, p.y, PHYS.W, PHYS.H)) p.x = nx
    else if (p.vx > 0) p.x = Math.floor((nx + PHYS.W) / T) * T - PHYS.W - 0.01
    else if (p.vx < 0) p.x = (Math.floor(nx / T) + 1) * T + 0.01

    // Eje Y
    const ny = p.y + p.vy * dt
    p.onGround = false
    if (!overlapsSolid(s, p.x, ny, PHYS.W, PHYS.H)) p.y = ny
    else if (p.vy > 0) {
      p.y = Math.floor((ny + PHYS.H) / T) * T - PHYS.H - 0.01
      p.vy = 0
      p.onGround = true
    } else {
      p.y = (Math.floor(ny / T) + 1) * T + 0.01
      p.vy = 0
    }

    // Si la compuerta se cerró encima de alguien, la empuja hacia afuera.
    if (overlapsSolid(s, p.x, p.y, PHYS.W, PHYS.H)) {
      for (const dx of [T, -T, 2 * T, -2 * T]) {
        if (!overlapsSolid(s, p.x + dx, p.y, PHYS.W, PHYS.H)) { p.x += dx; break }
      }
    }

    if (p.onGround && floorTiles(s, p).some(t => deadly(p.element, t))) {
      s.status = 'dead'
      s.deadId = p.id
    }

    for (const g of s.gems) {
      if (!g.taken && g.kind === p.gem && overlap(p, g.r, g.c)) {
        g.taken = true
        p.gems++
      }
    }
    const d = s.doors[p.door]
    p.atDoor = Boolean(d) && overlap(p, d.r, d.c) && p.onGround
  })

  if (s.status === 'playing' && s.players.every(p => p.atDoor)) s.status = 'won'
  return s
}

/** Cristales totales del nivel por tipo. */
export function gemTotals(s) {
  return { f: s.gems.filter(g => g.kind === 'f').length, w: s.gems.filter(g => g.kind === 'w').length }
}
