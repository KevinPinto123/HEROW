// ───────── Órbita: lógica (sin React) ─────────
// Un satélite recoge paquetes de datos y su cola de señal crece.
// Pierde si choca con el borde o con su propia cola.

export const SIZE = 18
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

export function init(rand = Math.random) {
  const mid = Math.floor(SIZE / 2)
  const body = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }]
  return { body, dir: 'right', queue: [], food: placeFood(body, rand), eaten: 0, over: false }
}

export function placeFood(body, rand = Math.random) {
  const free = []
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!body.some(b => b.x === x && b.y === y)) free.push({ x, y })
  return free[Math.floor(rand() * free.length)] ?? null
}

/** Encola un cambio de dirección (máx. 2 pendientes; no se puede ir en reversa). */
export function turn(state, dir) {
  const last = state.queue.at(-1) ?? state.dir
  if (dir === last || dir === OPPOSITE[last] || state.queue.length >= 2) return state
  return { ...state, queue: [...state.queue, dir] }
}

export function step(state, rand = Math.random) {
  if (state.over) return state
  const [dir, ...queue] = state.queue.length ? state.queue : [state.dir]
  const [dx, dy] = DIRS[dir]
  const head = { x: state.body[0].x + dx, y: state.body[0].y + dy }
  const eats = state.food && head.x === state.food.x && head.y === state.food.y
  // La cola se mueve: si no come, la última celda queda libre en este paso.
  const tail = eats ? state.body : state.body.slice(0, -1)
  const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE
  const hitSelf = tail.some(b => b.x === head.x && b.y === head.y)
  if (hitWall || hitSelf) return { ...state, dir, queue: state.queue.length ? queue : [], over: true }
  const body = [head, ...tail]
  return {
    ...state,
    body,
    dir,
    queue: state.queue.length ? queue : [],
    food: eats ? placeFood(body, rand) : state.food,
    eaten: state.eaten + (eats ? 1 : 0),
  }
}

/** Milisegundos por paso: se acelera con cada paquete. */
export const speedFor = (eaten) => Math.max(70, 150 - eaten * 4)
