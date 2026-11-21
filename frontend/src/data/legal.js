// ============================================================
//  TEXTOS LEGALES
//  Escritos a partir de lo que el código realmente hace.
//  Si cambias cómo se tratan los datos, actualiza también esto.
//  **texto** se muestra en negrita.
// ============================================================

import { CONTACTO } from './contacto'

export const ACTUALIZADO = 'noviembre de 2026'

const equipo = CONTACTO.equipo

export const PRIVACIDAD = {
  id: 'privacidad',
  titulo: 'Política de privacidad',
  entradilla:
    'HEROW es un juego para chicas de 15 a 17 años. Por eso pedimos los menos datos posibles: ni correo, ni dirección, ni colegio, ni foto.',
  secciones: [
    {
      titulo: 'Quién responde por tus datos',
      parrafos: [
        `HEROW es un proyecto de ${equipo}, operado desde ${CONTACTO.pais}. Somos quienes decidimos qué datos se guardan y para qué.`,
      ],
    },
    {
      titulo: 'Qué pedimos a las jugadoras',
      lista: [
        'Un **nombre de usuaria** que tú inventas. Te pedimos expresamente que no uses tu nombre completo.',
        'Una **contraseña**, que se guarda cifrada y que nadie del equipo puede ver.',
        'Tu **fecha de nacimiento**, solo para confirmar que tienes entre 15 y 17 años.',
        'Opcionalmente, un **correo o WhatsApp de tu apoderado**, por si tu familia quiere saber de tu avance.',
      ],
      cierre: [
        'Dentro del juego se guarda además tu progreso: puntos, nivel, rachas, qué heroínas desbloqueaste, tus respuestas en los combates y los enlaces que envías al cumplir misiones.',
      ],
    },
    {
      titulo: 'Qué NO pedimos nunca',
      lista: [
        'Tu correo personal.',
        'Tu dirección, tu colegio o tu ubicación.',
        'Tu foto o cualquier imagen tuya.',
        'Tu documento de identidad.',
      ],
      cierre: [
        'Tu cuenta usa un correo interno generado por el sistema que no existe como buzón real y no sirve para escribirte.',
      ],
    },
    {
      titulo: 'Qué pedimos a quien deja su contacto en la web',
      parrafos: [
        'El formulario "Súmate al portal" está dirigido a personas adultas: colegios, empresas, docentes, apoderados y aliados. Ahí sí guardamos el correo, y de forma opcional el nombre, la organización, el teléfono y el mensaje.',
        'Lo usamos únicamente para responderte y contarte del proyecto. No lo vendemos ni lo cedemos a terceros con fines comerciales.',
      ],
    },
    {
      titulo: 'Para qué usamos todo esto',
      lista: [
        'Que puedas entrar a tu cuenta y no perder tu progreso.',
        'Adaptar las preguntas y las misiones a cómo te va en cada portal.',
        'Recomendarte becas, cursos y programas acordes a tu edad e intereses.',
        'Mantener el espacio seguro: revisar que ningún mensaje sea dañino.',
      ],
    },
    {
      titulo: 'Quiénes procesan los datos con nosotros',
      parrafos: [
        'Para que el juego funcione usamos servicios de terceros. Cada uno recibe solo lo que necesita:',
      ],
      lista: [
        '**Supabase** — guarda las cuentas y el progreso.',
        '**Google (Gemini) y OpenAI** — generan y moderan las respuestas de YessenIA. Los mensajes se envían para obtener una respuesta, no para entrenar modelos.',
        '**Portal** — hace posible el combate en vivo entre dos jugadoras.',
        '**Vercel y Railway** — alojan la web y el servidor.',
      ],
      cierre: [
        'Algunos de estos servicios tienen infraestructura fuera del país, por lo que puede haber transferencia internacional de datos.',
      ],
    },
    {
      titulo: 'Moderación: por qué revisamos los mensajes',
      parrafos: [
        'Cada mensaje que escribes a YessenIA pasa por un sistema automático de moderación antes de ser respondido. Es obligatorio y no se puede desactivar, precisamente porque las usuarias son menores de edad. Sirve para bloquear contenido violento, sexual o de autolesión.',
      ],
    },
    {
      titulo: 'Cuánto tiempo guardamos los datos',
      parrafos: [
        'Mientras tu cuenta exista. Si pides que la borremos, eliminamos tu perfil y tu progreso. Los contactos del formulario se conservan mientras el proyecto siga activo o hasta que pidas salir.',
      ],
    },
    {
      titulo: 'Tus derechos',
      parrafos: [
        `En ${CONTACTO.pais}, la Ley N.° 29733 de Protección de Datos Personales te da derecho a acceder a tus datos, corregirlos, pedir que se eliminen y oponerte a que se usen. Si eres menor de edad, tu madre, padre o apoderado puede ejercerlos por ti.`,
        'También puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia.',
      ],
    },
    { titulo: 'Cómo nos escribes', contacto: true },
    {
      titulo: 'Cambios en esta política',
      parrafos: [
        'Si cambiamos algo importante lo avisaremos en la web. La fecha de arriba indica la última versión.',
      ],
    },
  ],
}

export const TERMINOS = {
  id: 'terminos',
  titulo: 'Términos de uso',
  entradilla:
    'Las reglas del juego, en corto: HEROW es gratuito, educativo y seguro. Úsalo para descubrir tu futuro, no para hacerle daño a nadie.',
  secciones: [
    {
      titulo: 'Qué es HEROW',
      parrafos: [
        'Un juego educativo que ayuda a chicas de secundaria a descubrir carreras de ciencia y tecnología. Se juega con heroínas basadas en mujeres reales, se responden retos y se cumplen misiones del mundo real.',
        'No es un test vocacional certificado ni reemplaza la orientación de un profesional. Es una herramienta de exploración.',
      ],
    },
    {
      titulo: 'Quién puede jugar',
      parrafos: [
        'HEROW está pensado para chicas de 15 a 17 años, de 4to y 5to de secundaria. El registro verifica la edad por fecha de nacimiento.',
        'Si eres menor de edad, usar HEROW supone que tu madre, padre o apoderado sabe que lo usas y está de acuerdo.',
      ],
    },
    {
      titulo: 'Reglas de convivencia',
      lista: [
        'No uses tu nombre completo ni datos personales como nombre de usuaria.',
        'No compartas tu contraseña con nadie.',
        'No intentes contactar a otras jugadoras fuera del juego.',
        'No escribas contenido ofensivo, violento o sexual. El sistema lo bloquea y la cuenta puede ser suspendida.',
        'No intentes romper, copiar ni sobrecargar el servicio.',
      ],
    },
    {
      titulo: 'Sobre YessenIA y las respuestas automáticas',
      parrafos: [
        'YessenIA es un asistente basado en inteligencia artificial. Sus respuestas pueden contener errores y no son consejo médico, legal, psicológico ni académico. Si algo te preocupa de verdad, habla con una persona adulta de confianza.',
      ],
    },
    {
      titulo: 'Sobre las heroínas',
      parrafos: [
        'Las heroínas están basadas en mujeres reales de la ciencia y la tecnología. Las usamos con fines educativos y de divulgación. Las ilustraciones son interpretaciones artísticas, no retratos oficiales, y ninguna persona viva representada habla ni interactúa dentro del juego.',
      ],
    },
    {
      titulo: 'Sobre las oportunidades que recomendamos',
      parrafos: [
        'HEROW reúne becas, cursos y programas de terceros. No organizamos esas convocatorias ni garantizamos que sigan abiertas o que seas aceptada. Revisa siempre las condiciones en la página oficial antes de postular, y nunca pagues por una beca sin verificarla con una persona adulta.',
      ],
    },
    {
      titulo: 'Tu cuenta',
      parrafos: [
        'Eres responsable de lo que pase con tu cuenta. Si crees que alguien más entró a ella, cambia tu contraseña y avísanos. Podemos suspender cuentas que rompan estas reglas o pongan en riesgo a otras jugadoras.',
      ],
    },
    {
      titulo: 'Propiedad del proyecto',
      parrafos: [
        `HEROW es un proyecto privado de ${equipo}. El código, la marca, el arte, los textos y el diseño del juego nos pertenecen y no pueden copiarse, distribuirse ni reutilizarse sin nuestro permiso por escrito.`,
      ],
    },
    {
      titulo: 'Servicio sin garantías',
      parrafos: [
        'HEROW se ofrece tal como está, de forma gratuita y en desarrollo continuo. Puede fallar, estar fuera de servicio o cambiar. Hacemos lo posible por evitarlo, pero no podemos garantizar disponibilidad permanente.',
      ],
    },
    { titulo: 'Dudas', contacto: true },
    {
      titulo: 'Ley aplicable',
      parrafos: [`Estos términos se rigen por las leyes de ${CONTACTO.pais}.`],
    },
  ],
}

export const SEGURIDAD = {
  id: 'seguridad',
  titulo: 'Seguridad para menores',
  entradilla:
    'Esta página es para madres, padres, apoderados y docentes. Explica exactamente cómo protegemos a las chicas dentro de HEROW.',
  secciones: [
    {
      titulo: 'Sin chats abiertos',
      parrafos: [
        'No existe ninguna función de mensajería libre entre jugadoras. No hay bandeja de entrada, ni solicitudes de amistad, ni comentarios. Es imposible que una persona desconocida le escriba a una jugadora dentro de HEROW.',
      ],
    },
    {
      titulo: 'El combate en vivo no permite hablar',
      parrafos: [
        'Dos jugadoras pueden competir respondiendo las mismas preguntas al mismo tiempo. Lo único que viaja entre ellas es qué alternativa eligieron y cuánto demoraron. No hay texto libre, ni voz, ni imágenes.',
      ],
    },
    {
      titulo: 'Toda conversación es con la IA, y está moderada',
      parrafos: [
        'La única conversación posible es con YessenIA, la guía del juego. Cada mensaje pasa por un filtro automático de contenido dañino antes de recibir respuesta. La moderación es obligatoria y no se puede desactivar.',
      ],
    },
    {
      titulo: 'Pedimos los datos mínimos',
      lista: [
        'Sin correo personal.',
        'Sin dirección, colegio ni ubicación.',
        'Sin fotos.',
        'Un nombre de usuaria inventado es lo único que ven las demás.',
      ],
    },
    {
      titulo: 'Las misiones del mundo real',
      parrafos: [
        'Algunas misiones piden crear un perfil profesional o publicar un primer proyecto en plataformas externas. Son actividades pensadas para hacerse acompañadas. Recomendamos que la familia o el docente revise esas misiones junto a la estudiante.',
      ],
    },
    {
      titulo: 'Si algo le incomoda',
      parrafos: [
        'Si una jugadora ve algo que no debería estar ahí, o si como apoderado quieres que eliminemos una cuenta y sus datos, escríbenos y lo resolvemos.',
      ],
      contacto: true,
    },
  ],
}

export const DOCUMENTOS = { privacidad: PRIVACIDAD, terminos: TERMINOS, seguridad: SEGURIDAD }
