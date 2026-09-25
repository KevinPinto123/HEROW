// Crea (o reinicia) las cuentas de demo. Se puede ejecutar antes de cada presentación.
//   npm run demo:seed
// Contraseña: DEMO_PASSWORD en server/.env
import dotenv from 'dotenv'
import { db, must, usernameToEmail } from '../src/services/supabase.js'
import { getPlayerState } from '../src/services/progress.js'

dotenv.config({ quiet: true })
const PASSWORD = process.env.DEMO_PASSWORD
if (!PASSWORD || PASSWORD.length < 8) {
  console.error('❌ Define DEMO_PASSWORD (mínimo 8 caracteres) en server/.env')
  process.exit(1)
}
const birthYear = new Date().getFullYear() - 16
const ago = (min) => new Date(Date.now() - min * 60_000).toISOString()

const ACCOUNTS = [
  {
    username: 'herow_demo',
    profile: { heroine_id: 'curie', portal_id: 'science', points: 980, level: 2, current_streak: 2, best_streak: 6 },
    stats: [
      { portal_id: 'science', answered: 42, correct: 33, wins: 25, total_ms: 42 * 6200 },
      { portal_id: 'code', answered: 20, correct: 13, wins: 9, total_ms: 20 * 7400 },
      { portal_id: 'robotics', answered: 12, correct: 7, wins: 4, total_ms: 12 * 8100 },
      { portal_id: 'design', answered: 6, correct: 3, wins: 2, total_ms: 6 * 9000 },
    ],
    // Misión del nivel 2 ya completada (perfil + LinkedIn). La del nivel 3 queda para la demo.
    missions: [
      {
        level: 2, mission_id: 'perfil', step: 'build', status: 'approved', score: 92,
        content: {
          headline: 'Estudiante de 5to de secundaria · Futura científica de datos',
          about: 'Me encanta entender el mundo con datos. En HEROW descubrí el portal de Ciencia: aprendí el método científico y cómo Rosalind Franklin fotografió el ADN. En el club de ciencias medí cómo crecen las plantas con distinta luz y registré todo en una hoja de cálculo.',
          skills: 'Hojas de cálculo, método científico, Python básico, trabajo en equipo',
          inspiration: 'Marie Curie, porque investigó con constancia en condiciones difíciles y ganó dos Premios Nobel.',
          goal: 'Terminar un curso gratuito de biología y presentar mi experimento en la feria escolar.',
        },
        feedback: {
          text: '¡Muy buen perfil! Cuentas logros concretos y tu meta es clara.',
          strengths: ['Titular claro', 'Ejemplo concreto del club de ciencias'],
          improvements: ['Agrega un enlace a tu experimento cuando lo publiques'],
          personalData: false,
        },
      },
      { level: 2, mission_id: 'perfil', step: 'real', status: 'approved', content: { url: 'https://www.linkedin.com/in/herow-demo' } },
    ],
    rounds: [
      ['science', 'win', 10, 'franklin', 3], ['science', 'win', 10, 'lovelace', 12], ['code', 'lose', 5, 'hopper', 25],
      ['science', 'win', 10, 'shady', 40], ['robotics', 'tie', 0, 'quispe', 60], ['design', 'win', 10, 'hadid', 90],
      ['science', 'lose', 5, 'johnson', 120], ['code', 'win', 10, 'costa', 180],
    ],
    saved: [['technovation', 'interested'], ['coursera-science', 'interested'], ['coursera-code', 'applied']],
  },
  {
    username: 'herow_demo2',
    profile: { heroine_id: 'hamilton', portal_id: 'robotics', points: 120, level: 1, current_streak: 0, best_streak: 3 },
    stats: [{ portal_id: 'robotics', answered: 16, correct: 10, wins: 8, total_ms: 16 * 7000 }],
    missions: [],
    rounds: [['robotics', 'win', 10, 'ochoa', 30], ['robotics', 'lose', 5, 'tereshkova', 50]],
    saved: [],
  },
]

async function reset(acc) {
  const email = usernameToEmail(acc.username)
  // Borrar la cuenta anterior (en cascada borra perfil, rondas, misiones, etc.).
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 })
  const old = list.users.find(u => u.email === email)
  if (old) must(await db.auth.admin.deleteUser(old.id))

  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: acc.username } })
  if (error) throw new Error(`${acc.username}: ${error.message}`)
  const id = data.user.id

  must(await db.from('profiles').insert({ id, username: acc.username, birth_year: birthYear, ...acc.profile }))
  must(await db.from('unlocked_heroines').insert({ user_id: id, heroine_id: acc.profile.heroine_id }))
  if (acc.stats.length) must(await db.from('skill_stats').insert(acc.stats.map(s => ({ user_id: id, ...s }))))
  if (acc.missions.length) must(await db.from('mission_submissions').insert(acc.missions.map(m => ({ user_id: id, ...m }))))

  const questions = must(await db.from('questions').select('id, portal_id, difficulty').eq('source', 'bank'))
  const rows = acc.rounds.map(([portal, outcome, points, rival, minAgo], i) => {
    const q = questions.filter(x => x.portal_id === portal)[i % 4]
    return {
      user_id: id, portal_id: portal, question_id: q.id, difficulty: q.difficulty, correct: outcome === 'win',
      ms: 4000 + i * 700, outcome, points, rival_heroine: rival, mode: i % 3 === 0 ? 'live' : 'ai', created_at: ago(minAgo),
    }
  })
  if (rows.length) must(await db.from('rounds').insert(rows))

  if (acc.saved.length) {
    const opps = must(await db.from('opportunities').select('id, source_id').eq('link_ok', true))
    const saved = acc.saved
      .map(([source, status]) => ({ opp: opps.find(o => o.source_id === source), status }))
      .filter(s => s.opp)
      .map(s => ({ user_id: id, opportunity_id: s.opp.id, status: s.status }))
    if (saved.length) must(await db.from('saved_opportunities').insert(saved))
  }

  const state = await getPlayerState(id) // desbloquea las heroínas que ya ganó
  const heroines = state.collection.filter(h => h.unlocked).map(h => h.name)
  console.log(`✅ ${acc.username}: nivel ${state.profile.level}, ${state.profile.points} pts, ${heroines.length} heroínas (${heroines.join(', ')})`)
}

for (const acc of ACCOUNTS) await reset(acc)
console.log('\nContraseña de ambas cuentas: la de DEMO_PASSWORD en server/.env')
process.exit(0)
