// ───────── Mente Rápida: generador de preguntas (sin React) ─────────
// Cada 5 aciertos sube la dificultad: sumas y restas → tablas → número faltante → división.

const rint = (min, max, rand) => min + Math.floor(rand() * (max - min + 1))

export function makeQuestion(level, rand = Math.random) {
  const kind = level <= 0 ? rint(0, 1, rand) : level === 1 ? rint(0, 2, rand) : level === 2 ? rint(1, 3, rand) : rint(2, 4, rand)
  let text
  let answer
  if (kind === 0) {
    const a = rint(1, 10 + level * 10, rand)
    const b = rint(1, 10 + level * 10, rand)
    text = `${a} + ${b}`
    answer = a + b
  } else if (kind === 1) {
    const a = rint(5, 20 + level * 10, rand)
    const b = rint(1, a, rand)
    text = `${a} − ${b}`
    answer = a - b
  } else if (kind === 2) {
    const a = rint(2, level >= 2 ? 12 : 6, rand)
    const b = rint(2, 10, rand)
    text = `${a} × ${b}`
    answer = a * b
  } else if (kind === 3) {
    const b = rint(2, 20, rand)
    const c = b + rint(2, 30, rand)
    text = `? + ${b} = ${c}`
    answer = c - b
  } else {
    const b = rint(2, 9, rand)
    const q = rint(2, 10, rand)
    text = `${b * q} ÷ ${b}`
    answer = q
  }
  return { text, answer, options: optionsFor(answer, rand) }
}

/** 4 opciones distintas, no negativas, con la correcta entre ellas. */
export function optionsFor(answer, rand = Math.random) {
  const set = new Set([answer])
  const spread = Math.max(3, Math.round(answer * 0.2))
  let guard = 0
  while (set.size < 4 && guard++ < 100) {
    const delta = rint(1, spread, rand) * (rand() < 0.5 ? -1 : 1)
    const v = answer + delta
    if (v >= 0) set.add(v)
  }
  for (let v = answer + 1; set.size < 4; v++) set.add(v)
  const list = [...set]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
