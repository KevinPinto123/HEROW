import { HEROINES, LEVELS, MAX_LEVEL, MISSIONS, PORTAL_IDS, PORTAL_NAMES, UNLOCKS } from '../data/game.js'
import { db, must } from './supabase.js'

export const ageFromBirthYear = (birthYear) => new Date().getFullYear() - birthYear

/** Métricas que usan los desbloqueos y el agente. */
function computeMetrics(profile, stats) {
  const byPortal = Object.fromEntries(PORTAL_IDS.map(p => [p, { answered: 0, correct: 0, wins: 0, total_ms: 0 }]))
  for (const s of stats) byPortal[s.portal_id] = { ...s, total_ms: Number(s.total_ms) }

  const m = {
    level: profile.level,
    bestStreak: profile.best_streak,
    missions: profile.level - 1,
    portalsWon: PORTAL_IDS.filter(p => byPortal[p].wins > 0).length,
    portalsPlayed: PORTAL_IDS.filter(p => byPortal[p].answered > 0).length,
  }
  for (const p of PORTAL_IDS) {
    m[`wins:${p}`] = byPortal[p].wins
    m[`correct:${p}`] = byPortal[p].correct
    m[`answered:${p}`] = byPortal[p].answered
  }
  return { metrics: m, byPortal }
}

/** Desbloquea las heroínas cuyos logros ya se cumplen. Devuelve las nuevas. */
async function unlockEarned(userId, metrics, unlocked) {
  const fresh = Object.entries(UNLOCKS)
    .filter(([id, rule]) => !unlocked.has(id) && (metrics[rule.stat] ?? 0) >= rule.n)
    .map(([id]) => id)
  if (fresh.length) {
    must(await db.from('unlocked_heroines').upsert(
      fresh.map(heroine_id => ({ user_id: userId, heroine_id })),
      { onConflict: 'user_id,heroine_id', ignoreDuplicates: true },
    ))
    fresh.forEach(id => unlocked.add(id))
  }
  return fresh
}

/** allSubs: todos los envíos de misión de la jugadora, del más nuevo al más viejo. */
function missionStatus(profile, appliedCount, allSubs) {
  if (profile.level >= MAX_LEVEL) return null
  const next = LEVELS[profile.level] // LEVELS[i] es el nivel i+1
  const mission = MISSIONS[next.mission]

  const subs = allSubs.filter(s => s.level === next.level && s.mission_id === mission.id)
  const lastBuild = subs.find(s => s.step === 'build') ?? null
  const lastReal = subs.find(s => s.step === 'real') ?? null

  const buildDone = lastBuild?.status === 'approved'
  const realDone = mission.real.requiresAppliedOpportunity ? appliedCount > 0 : lastReal?.status === 'approved'
  const pointsDone = profile.points >= next.points
  const age = ageFromBirthYear(profile.birth_year)

  return {
    targetLevel: next.level,
    targetName: next.name,
    pointsNeeded: next.points,
    pointsDone,
    mission: {
      id: mission.id,
      title: mission.title,
      intro: mission.intro,
      fields: mission.fields,
      rubric: mission.rubric,
      real: {
        title: mission.real.title,
        steps: age >= 16 ? mission.real.steps16 : mission.real.steps15,
        needsUrl: !mission.real.requiresAppliedOpportunity,
        domains: mission.real.domains ?? [],
      },
    },
    buildDone,
    realDone,
    lastBuild,
    lastReal,
    ready: pointsDone && buildDone && realDone,
  }
}

/** Todo lo que el dashboard necesita, calculado en el servidor. */
export async function getPlayerState(userId, { unlock = true } = {}) {
  // Todas las consultas en paralelo: cada viaje a Supabase cuesta ~0.5 s.
  const [profile, stats, unlockedRows, recent, applied, subs] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle().then(must),
    db.from('skill_stats').select('*').eq('user_id', userId).then(must),
    db.from('unlocked_heroines').select('heroine_id, unlocked_at').eq('user_id', userId).then(must),
    db.from('rounds').select('portal_id, outcome, points, correct, rival_heroine, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(8).then(must),
    db.from('saved_opportunities').select('opportunity_id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'applied'),
    db.from('mission_submissions').select('id, level, mission_id, step, status, score, feedback, content, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).then(must),
  ])
  if (!profile) return { profile: null }

  const { metrics, byPortal } = computeMetrics(profile, stats)
  const unlocked = new Set(unlockedRows.map(r => r.heroine_id))
  const newlyUnlocked = unlock ? await unlockEarned(userId, metrics, unlocked) : []

  const collection = Object.entries(HEROINES).map(([id, h]) => {
    const rule = UNLOCKS[id]
    return {
      id,
      name: h.name,
      portal: h.portal,
      unlocked: unlocked.has(id),
      requirement: rule.label,
      progress: Math.min(metrics[rule.stat] ?? 0, rule.n),
      goal: rule.n,
    }
  })

  const skills = PORTAL_IDS.map(p => {
    const s = byPortal[p]
    return {
      portal: p,
      name: PORTAL_NAMES[p],
      answered: s.answered,
      correct: s.correct,
      wins: s.wins,
      accuracy: s.answered ? Math.round((s.correct / s.answered) * 100) : null,
      avgSeconds: s.answered ? Math.round(s.total_ms / s.answered / 100) / 10 : null,
    }
  })

  return {
    profile: {
      username: profile.username,
      age: ageFromBirthYear(profile.birth_year),
      heroineId: profile.heroine_id,
      portalId: profile.portal_id,
      points: profile.points,
      level: profile.level,
      levelName: LEVELS[profile.level - 1].name,
      maxLevel: MAX_LEVEL,
      currentStreak: profile.current_streak,
      bestStreak: profile.best_streak,
      guide: profile.guide_message,
      guideAt: profile.guide_at,
    },
    next: missionStatus(profile, applied.count ?? 0, subs),
    skills,
    collection,
    newlyUnlocked,
    recent,
    appliedCount: applied.count ?? 0,
  }
}

/** Sube de nivel si se cumplen puntos + misión + paso real. */
export async function advanceLevel(userId) {
  const state = await getPlayerState(userId, { unlock: false })
  if (!state.next?.ready) return { ok: false, state }
  must(await db.from('profiles')
    .update({ level: state.next.targetLevel, guide_at: null, updated_at: new Date().toISOString() })
    .eq('id', userId).eq('level', state.next.targetLevel - 1))
  return { ok: true, state: await getPlayerState(userId) }
}
