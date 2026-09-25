// Reglas del juego: portales, heroínas, niveles, misiones y desbloqueos.
// El frontend recibe lo necesario desde /api/me; la fuente de verdad es este archivo.

export const PORTAL_IDS = ['code', 'robotics', 'design', 'science']
export const PORTAL_NAMES = {
  code: 'Código y Datos',
  robotics: 'Robótica y Espacio',
  design: 'Diseño e Invención',
  science: 'Ciencia',
}

export const HEROINES = {
  curie: { name: 'Marie Curie', portal: 'science' },
  franklin: { name: 'Rosalind Franklin', portal: 'science' },
  shady: { name: 'Ruth Shady', portal: 'science' },
  lovelace: { name: 'Ada Lovelace', portal: 'code' },
  hopper: { name: 'Grace Hopper', portal: 'code' },
  johnson: { name: 'Katherine Johnson', portal: 'code' },
  costa: { name: 'Mariana Costa Checa', portal: 'code' },
  hamilton: { name: 'Margaret Hamilton', portal: 'robotics' },
  tereshkova: { name: 'Valentina Tereshkova', portal: 'robotics' },
  jemison: { name: 'Mae Jemison', portal: 'robotics' },
  ochoa: { name: 'Ellen Ochoa', portal: 'robotics' },
  quispe: { name: 'Aracely Quispe Neira', portal: 'robotics' },
  lamarr: { name: 'Hedy Lamarr', portal: 'design' },
  reiche: { name: 'María Reiche', portal: 'design' },
  hadid: { name: 'Zaha Hadid', portal: 'design' },
}

// Puntos por ronda (reglas del README).
export const ROUND_POINTS = { win: 10, lose: 5, tie: 0 }

// ───────── Niveles ─────────
// points = puntos TOTALES acumulados que pide el nivel siguiente.
export const LEVELS = [
  { level: 1, name: 'Despertar' },
  { level: 2, name: 'Exploradora', points: 500, mission: 'perfil' },
  { level: 3, name: 'Creadora', points: 1000, mission: 'post' },
  { level: 4, name: 'Heroína', points: 1500, mission: 'proyecto' },
]
export const MAX_LEVEL = LEVELS.at(-1).level

// Dominios aceptados como prueba del paso en el mundo real.
const PROFILE_DOMAINS = ['linkedin.com', 'github.com', 'canva.site', 'my.canva.site', 'sites.google.com', 'notion.site', 'behance.net']

export const MISSIONS = {
  perfil: {
    id: 'perfil',
    title: 'Tu perfil profesional',
    intro: 'Toda profesional necesita contar quién es. Arma tu perfil aquí; YessenIA lo revisa y te ayuda a mejorarlo.',
    fields: [
      { key: 'headline', label: 'Titular (cómo te presentas en una línea)', type: 'text', min: 10, max: 120,
        placeholder: 'Estudiante de 5to de secundaria · Futura ingeniera de robótica' },
      { key: 'about', label: 'Sobre mí', type: 'textarea', min: 120, max: 1200,
        placeholder: '¿Qué te apasiona? ¿Qué has aprendido jugando? ¿Qué quieres construir?' },
      { key: 'skills', label: 'Habilidades (separadas por comas, mínimo 3)', type: 'text', min: 5, max: 200,
        placeholder: 'Python básico, trabajo en equipo, diseño en Canva' },
      { key: 'inspiration', label: '¿Qué heroína te inspira y por qué?', type: 'textarea', min: 60, max: 600, placeholder: '' },
      { key: 'goal', label: 'Tu meta para este año', type: 'textarea', min: 30, max: 400, placeholder: '' },
    ],
    rubric: [
      'El titular es claro y profesional',
      'El "sobre mí" cuenta intereses reales, logros o aprendizajes concretos (no frases vacías)',
      'Lista al menos 3 habilidades',
      'Explica por qué la inspira la heroína',
      'La meta es concreta y alcanzable',
      'No incluye datos personales sensibles (teléfono, dirección, colegio, documento)',
    ],
    real: {
      title: 'Publica tu perfil',
      steps16: [
        'Entra a linkedin.com y crea tu cuenta (LinkedIn pide tener 16 años o más).',
        'Copia tu titular y tu "Sobre mí" aprobados.',
        'Agrega tus habilidades y una foto profesional o una ilustración.',
        'Configura tu perfil como público y pega aquí el enlace (linkedin.com/in/…).',
      ],
      steps15: [
        'Como aún no tienes 16, crea tu portafolio en Canva Sites, Google Sites o GitHub.',
        'Copia tu titular y tu "Sobre mí" aprobados.',
        'Agrega tus habilidades y lo que has aprendido en HEROW.',
        'Publícalo y pega aquí el enlace.',
      ],
      domains: PROFILE_DOMAINS,
    },
  },
  post: {
    id: 'post',
    title: 'Tu primer post',
    intro: 'Compartir lo que aprendes te hace visible. Escribe un post sobre algo que aprendiste jugando.',
    fields: [
      { key: 'topic', label: '¿Sobre qué tema vas a escribir?', type: 'text', min: 5, max: 100, placeholder: 'Qué aprendí sobre el método científico' },
      { key: 'post', label: 'Tu post', type: 'textarea', min: 200, max: 1300,
        placeholder: 'Cuenta qué aprendiste, por qué te importa y a quién se lo recomendarías.' },
      { key: 'hashtags', label: 'Hashtags (2 a 5)', type: 'text', min: 4, max: 120, placeholder: '#MujeresEnSTEM #HEROW #Robótica' },
    ],
    rubric: [
      'Explica algo concreto que aprendió',
      'Tiene una estructura clara (inicio, idea principal, cierre)',
      'El tono es positivo y respetuoso',
      'Incluye entre 2 y 5 hashtags relevantes',
      'No incluye datos personales sensibles',
    ],
    real: {
      title: 'Publica tu post',
      steps16: [
        'Publica tu post aprobado en LinkedIn.',
        'Copia el enlace de la publicación (menú ··· → Copiar enlace).',
        'Pégalo aquí.',
      ],
      steps15: [
        'Publica tu post en tu portafolio (Canva Sites, Google Sites o GitHub).',
        'Copia el enlace de la página.',
        'Pégalo aquí.',
      ],
      domains: PROFILE_DOMAINS,
    },
  },
  proyecto: {
    id: 'proyecto',
    title: 'Tu mini proyecto',
    intro: 'Una heroína resuelve problemas reales. Diseña un proyecto de tu portal que ayude a tu comunidad.',
    fields: [
      { key: 'problem', label: '¿Qué problema de tu comunidad quieres resolver?', type: 'textarea', min: 60, max: 600, placeholder: '' },
      { key: 'solution', label: '¿Cuál es tu solución?', type: 'textarea', min: 80, max: 900, placeholder: '' },
      { key: 'stem', label: '¿Qué usarías de tu portal (código, sensores, diseño, ciencia)?', type: 'textarea', min: 40, max: 500, placeholder: '' },
      { key: 'next', label: '¿Cuál sería tu primer paso esta semana?', type: 'text', min: 15, max: 200, placeholder: '' },
    ],
    rubric: [
      'El problema es real y específico',
      'La solución responde al problema',
      'Usa conocimientos STEM de forma concreta',
      'El primer paso es realista para una estudiante',
      'No incluye datos personales sensibles',
    ],
    real: {
      title: 'Postula a una oportunidad',
      steps16: [
        'Ve a tu dashboard → Oportunidades.',
        'Elige una beca, curso o programa que te sirva para tu proyecto.',
        'Postula o inscríbete, y márcala como "Postulé".',
      ],
      steps15: [
        'Ve a tu dashboard → Oportunidades.',
        'Elige una beca, curso o programa que te sirva para tu proyecto.',
        'Postula o inscríbete, y márcala como "Postulé".',
      ],
      requiresAppliedOpportunity: true,
    },
  },
}

// ───────── Desbloqueo de heroínas por logros ─────────
// stat: métrica calculada en progress.js · n: meta
export const UNLOCKS = {
  lovelace: { stat: 'wins:code', n: 5, label: 'Gana 5 rondas en Código y Datos' },
  hopper: { stat: 'correct:code', n: 15, label: 'Acierta 15 preguntas de Código y Datos' },
  johnson: { stat: 'bestStreak', n: 5, label: 'Logra una racha de 5 aciertos seguidos' },
  costa: { stat: 'missions', n: 1, label: 'Completa tu primera misión (perfil profesional)' },
  hamilton: { stat: 'wins:robotics', n: 5, label: 'Gana 5 rondas en Robótica y Espacio' },
  tereshkova: { stat: 'answered:robotics', n: 20, label: 'Juega 20 rondas en Robótica y Espacio' },
  jemison: { stat: 'portalsWon', n: 3, label: 'Gana al menos una ronda en 3 portales distintos' },
  ochoa: { stat: 'correct:robotics', n: 15, label: 'Acierta 15 preguntas de Robótica y Espacio' },
  quispe: { stat: 'level', n: 3, label: 'Llega al nivel 3' },
  lamarr: { stat: 'wins:design', n: 5, label: 'Gana 5 rondas en Diseño e Invención' },
  reiche: { stat: 'correct:design', n: 15, label: 'Acierta 15 preguntas de Diseño e Invención' },
  hadid: { stat: 'missions', n: 2, label: 'Completa 2 misiones' },
  curie: { stat: 'wins:science', n: 5, label: 'Gana 5 rondas en Ciencia' },
  franklin: { stat: 'correct:science', n: 15, label: 'Acierta 15 preguntas de Ciencia' },
  shady: { stat: 'portalsPlayed', n: 4, label: 'Juega en los 4 portales' },
}
