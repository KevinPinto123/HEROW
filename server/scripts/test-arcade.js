// Pruebas del arcade: reglas de los juegos y salas online (sin red ni base de datos).
//   npm run test:arcade
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ARCADE, _resetArcade, cancelQueue, createCode, getRoomFor, joinQueue, leaveRoom, reportRival, snapshot, submitMove, waitingByGame } from '../src/arcade/rooms.js'
import { C4_COLS, c4DropRow, conecta4, michi, rng, timbiFreeLines, timbiriche } from '../src/arcade/rules.js'

const wait = (ms) => new Promise(r => setTimeout(r, ms))
const play = (game, moves) => {
  let s = game.init()
  for (const [p, m] of moves) {
    const r = game.move(s, p, m)
    assert.ok(r.ok, `jugada ${JSON.stringify(m)}: ${r.error}`)
    s = r.state
  }
  return s
}

test('el archivo de reglas es idéntico en servidor y frontend', () => {
  const norm = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  assert.equal(norm('../src/arcade/rules.js'), norm('../../frontend/src/arcade/rules.js'))
})

test('michi: gana, empata y valida', () => {
  const s = play(michi, [[0, { cell: 0 }], [1, { cell: 3 }], [0, { cell: 1 }], [1, { cell: 4 }], [0, { cell: 2 }]])
  assert.equal(s.winner, 0)
  assert.deepEqual(s.line, [0, 1, 2])
  assert.ok(s.over)
  assert.equal(michi.move(s, 1, { cell: 8 }).error, 'game_over')
  const d = play(michi, [[0, { cell: 0 }], [1, { cell: 1 }], [0, { cell: 2 }], [1, { cell: 4 }], [0, { cell: 3 }], [1, { cell: 5 }], [0, { cell: 7 }], [1, { cell: 6 }], [0, { cell: 8 }]])
  assert.ok(d.draw && d.over && d.winner === null)
  const s0 = michi.init()
  assert.equal(michi.move(s0, 1, { cell: 0 }).error, 'not_your_turn')
  assert.equal(michi.move(s0, 0, { cell: 9 }).error, 'invalid_move')
  assert.equal(michi.move(michi.move(s0, 0, { cell: 4 }).state, 1, { cell: 4 }).error, 'cell_taken')
  assert.equal(s0.board[4], null, 'no modifica el estado original')
})

test('conecta 4: gravedad, horizontal, vertical, diagonal, columna llena', () => {
  const v = play(conecta4, [[0, { col: 0 }], [1, { col: 1 }], [0, { col: 0 }], [1, { col: 1 }], [0, { col: 0 }], [1, { col: 1 }], [0, { col: 0 }]])
  assert.equal(v.winner, 0)
  assert.equal(v.board[5][0], 0)
  const h = play(conecta4, [[0, { col: 0 }], [1, { col: 0 }], [0, { col: 1 }], [1, { col: 1 }], [0, { col: 2 }], [1, { col: 2 }], [0, { col: 3 }]])
  assert.equal(h.winner, 0)
  // diagonal ↗ para la 1
  const dg = play(conecta4, [[0, { col: 0 }], [1, { col: 1 }], [0, { col: 1 }], [1, { col: 2 }], [0, { col: 2 }], [1, { col: 3 }], [0, { col: 2 }], [1, { col: 3 }], [0, { col: 3 }], [1, { col: 0 }], [0, { col: 3 }]])
  assert.equal(dg.winner, 0)
  let s = conecta4.init()
  for (let i = 0; i < 6; i++) s = conecta4.move(s, i % 2, { col: 6 }).state
  assert.equal(c4DropRow(s.board, 6), -1)
  assert.equal(conecta4.move(s, 0, { col: 6 }).error, 'column_full')
  assert.equal(conecta4.move(s, 0, { col: C4_COLS }).error, 'invalid_move')
})

test('timbiriche: cerrar cuadrito da otro turno y la partida termina', () => {
  // Cuadrito (0,0): h00, h10, v00, v01
  let s = timbiriche.init(2)
  s = timbiriche.move(s, 0, { k: 'h', r: 0, c: 0 }).state
  s = timbiriche.move(s, 1, { k: 'h', r: 1, c: 0 }).state
  s = timbiriche.move(s, 0, { k: 'v', r: 0, c: 0 }).state
  assert.equal(s.turn, 1)
  s = timbiriche.move(s, 1, { k: 'v', r: 0, c: 1 }).state
  assert.equal(s.boxes[0][0], 1)
  assert.equal(s.scores[1], 1)
  assert.equal(s.turn, 1, 'cerró: vuelve a jugar')
  assert.equal(timbiriche.move(s, 1, { k: 'v', r: 0, c: 1 }).error, 'line_taken')
  assert.equal(timbiriche.move(s, 1, { k: 'h', r: 3, c: 0 }).error, 'invalid_move')
  // Completar todo al azar con jugadas válidas
  let guard = 0
  while (!s.over && guard++ < 100) {
    const free = timbiFreeLines(s)
    s = timbiriche.move(s, s.turn, free[0]).state
  }
  assert.ok(s.over)
  assert.equal(s.scores[0] + s.scores[1], 4)
  assert.equal(timbiFreeLines(s).length, 0)
})

test('rng con semilla es reproducible', () => {
  const a = rng(42), b = rng(42)
  const xs = Array.from({ length: 5 }, a)
  assert.deepEqual(xs, Array.from({ length: 5 }, b))
  assert.ok(xs.every(x => x >= 0 && x < 1))
})

// ───────── Salas ─────────
const P = (id) => ({ userId: id, username: `u_${id}`, heroineId: null, ticket: null })
const pair = async (game, a, b, code) => {
  const pa = joinQueue(game, P(a), code)
  await wait(10)
  const rb = await joinQueue(game, P(b), code)
  const ra = await pa
  assert.ok(ra.matched && rb.matched && ra.roomId === rb.roomId)
  return getRoomFor(ra.roomId, a)
}

test('salas: emparejamiento público y partida de michi arbitrada', async () => {
  _resetArcade()
  const pa = joinQueue('michi', P('a'))
  await wait(10)
  assert.equal(waitingByGame().michi, 1)
  const rb = await joinQueue('michi', P('b'))
  const ra = await pa
  const room = getRoomFor(ra.roomId, 'a')
  assert.equal(getRoomFor(rb.roomId, 'zzz'), null, 'una ajena no ve la sala')
  const first = room.players[0].userId
  const second = room.players[1].userId
  assert.equal(submitMove(room, second, { cell: 0 }).error, 'not_your_turn')
  for (const [u, cell] of [[first, 0], [second, 3], [first, 1], [second, 4], [first, 2]]) assert.ok(submitMove(room, u, { cell }).ok)
  assert.equal(room.status, 'ended')
  assert.deepEqual(room.end, { reason: 'completed', winner: 0 })
  const types = room.events.map(e => e.type)
  assert.equal(types.filter(t => t === 'state').length, 5)
  assert.equal(types.at(-1), 'end')
  assert.equal(snapshot(room, second).you, 1)
})

test('salas: código privado, código falso y anfitriona sola', async () => {
  _resetArcade()
  const code = createCode('conecta4', 'h')
  assert.match(code, /^[A-Z2-9]{5}$/)
  assert.deepEqual(await joinQueue('conecta4', P('x'), 'ZZZZZ'), { matched: false, error: 'code_not_found' })
  assert.equal((await joinQueue('michi', P('x'), code)).error, 'code_not_found', 'código de otro juego')
  // Una jugadora pública no se cuela en la sala privada
  const pub = joinQueue('conecta4', P('p'))
  const room = await pair('conecta4', 'h', 'g', code)
  assert.ok(room.private)
  assert.equal((await joinQueue('conecta4', P('q'), code)).error, 'code_not_found', 'el código se usa una sola vez')
  cancelQueue('p')
  assert.equal((await pub).cancelled, true)
})

test('salas: turno vencido pierde, abandono y reporte bloquean', async () => {
  _resetArcade()
  const old = ARCADE.TURN_MS
  ARCADE.TURN_MS = 80
  const room = await pair('timbiriche', 'a', 'b')
  await wait(150)
  assert.equal(room.end.reason, 'timeout')
  assert.equal(room.end.winner, 1, 'pierde la que tenía el turno (la 0)')
  ARCADE.TURN_MS = old

  const r2 = await pair('michi', 'a', 'b')
  leaveRoom(r2, 'a')
  assert.equal(r2.end.reason, 'left')
  assert.equal(r2.players[r2.end.winner].userId, 'b')

  const r3 = await pair('michi', 'a', 'b')
  reportRival(r3, 'a', 'nombre_ofensivo')
  assert.equal(r3.end.reason, 'reported')
  // Ya no se emparejan entre ellas
  const qa = joinQueue('michi', P('a'))
  await wait(10)
  const qb = joinQueue('michi', P('b'))
  await wait(10)
  assert.equal(waitingByGame().michi, 2, 'bloqueadas: esperan por separado')
  const rc = await joinQueue('michi', P('c'))
  assert.ok(rc.matched)
  cancelQueue('a'); cancelQueue('b')
  await Promise.all([qa, qb])
})

test('salas: duelo de cristales valida puntajes', async () => {
  _resetArcade()
  const oldStart = ARCADE.CRISTALES_START_MS
  ARCADE.CRISTALES_START_MS = 0
  const room = await pair('cristales', 'a', 'b')
  ARCADE.CRISTALES_START_MS = oldStart
  assert.ok(Number.isInteger(room.state.seed))
  assert.ok(submitMove(room, 'a', { score: 500 }).ok)
  assert.equal(submitMove(room, 'a', { score: 100 }).error, 'invalid_score', 'no puede bajar')
  assert.equal(submitMove(room, 'a', { score: 999_999 }).error, 'invalid_score', 'salto imposible')
  assert.equal(submitMove(room, 'b', { score: 1.5 }).error, 'invalid_score')
  const idxA = room.players.findIndex(p => p.userId === 'a')
  assert.equal(room.state.scores[idxA], 500)
  leaveRoom(room, 'b')
  _resetArcade()
})

// ───────── Chispa y Gota: cada nivel se puede terminar (con la física real) ─────────
test('chispa y gota: cada heroína llega a su puerta y a todos sus cristales', async () => {
  const { LEVELS, loadLevel, step } = await import('../../frontend/src/arcade/chispagota/engine.js')
  const DT = 1 / 60
  const clone = (s) => structuredClone(s)
  for (let li = 0; li < LEVELS.length; li++) {
    for (const who of [0, 1]) {
      const base = loadLevel(li)
      base.forceOpen = true // las compuertas se abren cooperando: aquí se asumen abiertas
      base.players = [base.players[who]]
      // asentarse en el piso
      for (let i = 0; i < 30; i++) step(base, [{}], DT)
      const seen = new Set()
      const queue = [base]
      const gemsTaken = new Set()
      let reached = false
      const key = (s) => `${Math.round(s.players[0].x / 4)},${Math.round(s.players[0].y / 4)}`
      seen.add(key(base))
      while (queue.length && seen.size < 6000) {
        const cur = queue.shift()
        const actions = []
        for (const dir of [-1, 1]) for (const f of [4, 10, 20]) actions.push({ dir, jump: false, f, dir2: 0 })
        for (const dir of [-1, 0, 1]) for (const f of [2, 8, 14, 22]) for (const dir2 of [-1, 0, 1]) actions.push({ dir, jump: true, f, dir2 })
        for (const a of actions) {
          const s = clone(cur)
          let frames = 0
          let left = false
          while (frames < 150) {
            const d = frames < a.f ? a.dir : a.dir2
            step(s, [{ left: d < 0, right: d > 0, jump: a.jump && frames === 0 }], DT)
            frames++
            if (s.status === 'dead') break
            if (!s.players[0].onGround) left = true
            if (frames >= a.f && s.players[0].onGround && (left || !a.jump)) break
          }
          if (s.status === 'dead' || !s.players[0].onGround) continue
          s.gems.forEach((g, i) => { if (g.taken) gemsTaken.add(i) })
          if (s.status === 'won' || s.players[0].atDoor) reached = true
          const k = key(s)
          if (!seen.has(k)) { seen.add(k); s.status = 'playing'; queue.push(s) }
        }
      }
      const hero = base.players[0]
      const mine = base.gems.map((g, i) => [g, i]).filter(([g]) => g.kind === hero.gem)
      assert.ok(reached, `Nivel ${li + 1}: ${hero.name} no llega a su puerta`)
      for (const [g, i] of mine) assert.ok(gemsTaken.has(i), `Nivel ${li + 1}: ${hero.name} no alcanza el cristal (${g.r},${g.c})`)
    }
  }
})

// ───────── Juegos educativos nuevos (lógica del frontend) ─────────
const FRONT = '../../frontend/src/arcade'

test('código robot: los 8 niveles tienen solución y la simulación es correcta', async () => {
  const m = await import(`${FRONT}/robot/logic.js`)
  let prev = 0
  for (const def of m.LEVELS) {
    const level = m.parseLevel(def)
    const best = m.solve(level)
    assert.ok(best !== null && best >= 1, `${def.name} sin solución`)
    assert.ok(best >= prev - 1, `${def.name} rompe el orden de dificultad`)
    prev = best
  }
  const l1 = m.parseLevel(m.LEVELS[0])
  let p = []
  for (let i = 0; i < 3; i++) p = m.addCommand(p, 'F')
  assert.deepEqual(p, [{ cmd: 'F', n: 3 }], 'bloques iguales seguidos se agrupan')
  assert.equal(m.run(l1, p).result, 'goal')
  assert.equal(m.run(l1, [{ cmd: 'L', n: 1 }, { cmd: 'F', n: 9 }]).result, 'crash', 'chocar con el borde')
  assert.equal(m.run(l1, [{ cmd: 'F', n: 1 }]).result, 'short')
  assert.equal(m.starsFor(1, 1), 3)
  assert.equal(m.starsFor(3, 1), 2)
  assert.equal(m.starsFor(9, 1), 1)
})

test('circuito: siempre tiene solución y mezclado nunca empieza resuelto', async () => {
  const m = await import(`${FRONT}/circuito/logic.js`)
  for (let i = 0; i < 500; i++) {
    const size = 3 + (i % 4)
    const solved = m.generate(size)
    assert.ok(m.isSolved(solved))
    const mixed = m.scramble(solved)
    assert.ok(!m.isSolved(mixed))
    mixed.grid.forEach((row, r) => row.forEach((x, c) => {
      let y = x
      let ok = false
      for (let k = 0; k < 4; k++) { if (y === solved.grid[r][c]) ok = true; y = m.rotate(y) }
      assert.ok(ok, 'cada pieza puede volver a su posición girándola')
    }))
  }
})

test('mente rápida: respuestas correctas y 4 opciones distintas', async () => {
  const m = await import(`${FRONT}/mates/logic.js`)
  for (let lv = 0; lv <= 5; lv++) {
    for (let i = 0; i < 2000; i++) {
      const q = m.makeQuestion(lv)
      const t = q.text
      let value
      let mm
      if ((mm = t.match(/^\? \+ (\d+) = (\d+)$/))) value = Number(mm[2]) - Number(mm[1])
      else if ((mm = t.match(/^(\d+) \+ (\d+)$/))) value = Number(mm[1]) + Number(mm[2])
      else if ((mm = t.match(/^(\d+) − (\d+)$/))) value = Number(mm[1]) - Number(mm[2])
      else if ((mm = t.match(/^(\d+) × (\d+)$/))) value = Number(mm[1]) * Number(mm[2])
      else if ((mm = t.match(/^(\d+) ÷ (\d+)$/))) value = Number(mm[1]) / Number(mm[2])
      assert.equal(value, q.answer, t)
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0)
      assert.equal(new Set(q.options).size, 4)
      assert.ok(q.options.includes(q.answer) && q.options.every(o => o >= 0))
    }
  }
})

test('órbita: crece al comer, no va en reversa y choca', async () => {
  const m = await import(`${FRONT}/orbita/logic.js`)
  let s = m.init()
  assert.equal(m.turn(s, 'left').queue.length, 0)
  s = { ...s, food: { x: s.body[0].x + 1, y: s.body[0].y } }
  s = m.step(s)
  assert.equal(s.eaten, 1)
  assert.equal(s.body.length, 4)
  assert.ok(!s.body.some(b => b.x === s.food.x && b.y === s.food.y))
  let w = m.init()
  for (let i = 0; i < 20 && !w.over; i++) w = m.step({ ...w, food: null })
  assert.ok(w.over)
})

test('ciencia flash: datos completos y sin repetir', async () => {
  const { FACTS } = await import(`${FRONT}/flash/facts.js`)
  assert.ok(FACTS.length >= 40)
  assert.equal(new Set(FACTS.map(f => f.text)).size, FACTS.length)
  for (const f of FACTS) assert.ok(f.text && typeof f.answer === 'boolean' && f.why, f.text)
  const trues = FACTS.filter(f => f.answer).length
  assert.ok(trues > FACTS.length * 0.35 && trues < FACTS.length * 0.65, 'mezcla equilibrada de verdaderos y falsos')
})
