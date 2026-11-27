-- ============================================================
-- HEROW — esquema de base de datos (Supabase / Postgres)
-- Pegar completo en Supabase → SQL Editor → Run.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- Seguridad: todas las tablas tienen RLS activado y SIN políticas,
-- así que el navegador no puede leer ni escribir nada directamente.
-- Todo pasa por el backend, que usa la clave secreta y valida cada acción.
-- ============================================================

-- ---------- Perfil de la jugadora ----------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  username         text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  birth_year       int  not null check (birth_year between 1990 and 2030),
  guardian_contact text check (char_length(guardian_contact) <= 120),
  heroine_id       text,
  portal_id        text check (portal_id in ('code', 'robotics', 'design', 'science')),
  points           int  not null default 0 check (points >= 0),
  level            int  not null default 1 check (level between 1 and 10),
  current_streak   int  not null default 0 check (current_streak >= 0),
  best_streak      int  not null default 0 check (best_streak >= 0),
  guide_message    text,
  guide_at         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- Desempeño por portal (lo que "aprende" el agente) ----------
create table if not exists public.skill_stats (
  user_id   uuid not null references auth.users (id) on delete cascade,
  portal_id text not null check (portal_id in ('code', 'robotics', 'design', 'science')),
  answered  int    not null default 0 check (answered >= 0),
  correct   int    not null default 0 check (correct >= 0),
  wins      int    not null default 0 check (wins >= 0),
  total_ms  bigint not null default 0 check (total_ms >= 0),
  primary key (user_id, portal_id)
);

-- ---------- Banco de preguntas (semilla + generadas por IA) ----------
create table if not exists public.questions (
  id         text primary key,
  portal_id  text not null check (portal_id in ('code', 'robotics', 'design', 'science')),
  type       text not null check (type in ('elegir', 'ordenar', 'error', 'decidir')),
  difficulty int  not null check (difficulty between 1 and 3),
  text       text not null,
  options    text[] not null check (cardinality(options) between 2 and 6),
  answer     int  not null check (answer >= 0),
  explain    text not null default '',
  source     text not null default 'bank' check (source in ('bank', 'ai')),
  created_at timestamptz not null default now()
);
create index if not exists questions_portal_difficulty on public.questions (portal_id, difficulty);

-- ---------- Historial de rondas ----------
create table if not exists public.rounds (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  portal_id     text not null,
  question_id   text not null,
  difficulty    int  not null,
  correct       boolean not null,
  ms            int  not null check (ms >= 0),
  outcome       text not null check (outcome in ('win', 'lose', 'tie')),
  points        int  not null,
  rival_heroine text,
  mode          text not null default 'ai' check (mode in ('ai', 'live')),
  created_at    timestamptz not null default now()
);
create index if not exists rounds_user_created on public.rounds (user_id, created_at desc);

-- ---------- Heroínas desbloqueadas ----------
create table if not exists public.unlocked_heroines (
  user_id     uuid not null references auth.users (id) on delete cascade,
  heroine_id  text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, heroine_id)
);

-- ---------- Misiones del mundo real ----------
create table if not exists public.mission_submissions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  level      int  not null,
  mission_id text not null,
  step       text not null check (step in ('build', 'real')),
  content    jsonb not null,
  status     text not null check (status in ('approved', 'needs_work')),
  score      int check (score between 0 and 100),
  feedback   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists missions_user_level on public.mission_submissions (user_id, level, mission_id, step);

-- ---------- Oportunidades (las encuentra el agente) ----------
create table if not exists public.opportunities (
  id           uuid primary key default gen_random_uuid(),
  url          text not null unique,
  source       text not null,
  source_id    text not null,
  title        text not null,
  summary      text not null default '',
  type         text not null check (type in ('beca', 'curso', 'programa', 'evento', 'recurso')),
  portal_ids   text[] not null default '{}',
  requirements text[] not null default '{}',
  deadline     text,
  cost         text not null default 'desconocido' check (cost in ('gratis', 'pago', 'desconocido')),
  min_age      int,
  link_ok      boolean not null default true,
  checked_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists opportunities_link_ok on public.opportunities (link_ok);

-- ---------- Oportunidades guardadas por cada jugadora ----------
create table if not exists public.saved_opportunities (
  user_id        uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  status         text not null check (status in ('interested', 'applied', 'dismissed')),
  updated_at     timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- ---------- Seguridad: RLS en todo, sin políticas ----------
alter table public.profiles            enable row level security;
alter table public.skill_stats         enable row level security;
alter table public.questions           enable row level security;
alter table public.rounds              enable row level security;
alter table public.unlocked_heroines   enable row level security;
alter table public.mission_submissions enable row level security;
alter table public.opportunities       enable row level security;
alter table public.saved_opportunities enable row level security;

-- ---------- Sumar puntos de forma atómica ----------
-- Evita que dos rondas simultáneas se pisen al actualizar el perfil.
create or replace function public.apply_round(
  p_user uuid, p_portal text, p_correct boolean, p_win boolean, p_ms int, p_points int
) returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  insert into public.skill_stats (user_id, portal_id, answered, correct, wins, total_ms)
  values (p_user, p_portal, 1, p_correct::int, p_win::int, p_ms)
  on conflict (user_id, portal_id) do update set
    answered = skill_stats.answered + 1,
    correct  = skill_stats.correct + excluded.correct,
    wins     = skill_stats.wins + excluded.wins,
    total_ms = skill_stats.total_ms + excluded.total_ms;

  update public.profiles set
    points         = points + p_points,
    current_streak = case when p_correct then current_streak + 1 else 0 end,
    best_streak    = greatest(best_streak, case when p_correct then current_streak + 1 else 0 end),
    updated_at     = now()
  where id = p_user
  returning * into result;

  return result;
end;
$$;

-- Solo el backend (service_role) puede llamarla.
revoke all on function public.apply_round(uuid, text, boolean, boolean, int, int) from public, anon, authenticated;
grant execute on function public.apply_round(uuid, text, boolean, boolean, int, int) to service_role;

-- ---------- Waitlist / leads (feria, colegios, aliados) ----------
-- Personas adultas que dejan su contacto en la landing: colegios, empresas,
-- inversores, docentes, familias. NO son jugadoras (esas usan auth.users).
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique check (char_length(email) between 5 and 160),
  name       text check (char_length(name) <= 80),
  org        text check (char_length(org) <= 120),
  role       text not null default 'otro'
               check (role in ('colegio', 'empresa', 'inversor', 'docente', 'familia', 'estudiante', 'otro')),
  phone      text check (char_length(phone) <= 40),
  message    text check (char_length(message) <= 500),
  source     text not null default 'landing' check (char_length(source) <= 40),
  -- Cuándo aceptó que le escribamos (Ley 29733). Null = registrado antes de pedirlo.
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_role_created on public.leads (role, created_at desc);
-- Para instalaciones que crearon la tabla antes de que existiera el consentimiento.
alter table public.leads add column if not exists consent_at timestamptz;

-- Mismo criterio que el resto: RLS activo y sin políticas.
-- Solo el backend (clave secreta) puede leer y escribir aquí.
alter table public.leads enable row level security;

-- ============================================================
-- RED DE MENTORAS (HEROW Conecta)
-- Profesionales adultas verificadas por el equipo. Nunca hay chat privado
-- con las jugadoras: solo eventos grupales publicados, respuestas públicas
-- a preguntas anónimas y power-ups de ánimo. Todo pasa por moderación.
-- ============================================================
create table if not exists public.mentors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  -- Contacto con el equipo HEROW. Nunca se muestra a las jugadoras.
  email       text not null unique check (char_length(email) between 5 and 160),
  role        text not null check (char_length(role) between 2 and 80),
  org         text check (char_length(org) <= 120),
  -- Solo para que el equipo verifique quién es. Nunca se muestra a las jugadoras.
  linkedin    text check (char_length(linkedin) <= 200),
  portals     text[] not null default '{}',
  region      text check (char_length(region) <= 40),
  story       text not null default '' check (char_length(story) <= 600),
  advice      text not null default '' check (char_length(advice) <= 300),
  powerup     text not null default '' check (char_length(powerup) <= 140),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paused')),
  -- Código de acceso al panel: solo guardamos su hash (sha256).
  code_hash   text not null,
  consent_at  timestamptz not null default now(),
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists mentors_status on public.mentors (status);
create unique index if not exists mentors_code_hash on public.mentors (code_hash);

-- Eventos grupales: charlas, talleres, visitas, ferias.
create table if not exists public.mentor_events (
  id           uuid primary key default gen_random_uuid(),
  mentor_id    uuid not null references public.mentors (id) on delete cascade,
  title        text not null check (char_length(title) between 5 and 120),
  description  text not null default '' check (char_length(description) <= 600),
  kind         text not null check (kind in ('charla', 'taller', 'visita', 'feria', 'mentoria_grupal')),
  modality     text not null check (modality in ('virtual', 'presencial', 'hibrido')),
  region       text check (char_length(region) <= 40),
  place        text check (char_length(place) <= 160),
  url          text check (char_length(url) <= 300),
  starts_at    timestamptz not null,
  duration_min int not null default 60 check (duration_min between 15 and 600),
  portals      text[] not null default '{}',
  -- review = espera revisión del equipo (la moderación automática no estaba disponible).
  status       text not null default 'published' check (status in ('review', 'published', 'cancelled')),
  created_at   timestamptz not null default now()
);
create index if not exists mentor_events_upcoming on public.mentor_events (status, starts_at);

-- "Me apunto": la mentora solo ve cuántas van, nunca quiénes.
create table if not exists public.event_rsvps (
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_id   uuid not null references public.mentor_events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- Preguntas anónimas de las jugadoras. Las respuestas son públicas para todas.
create table if not exists public.mentor_questions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  mentor_id   uuid references public.mentors (id) on delete set null,
  answered_by uuid references public.mentors (id) on delete set null,
  portal_id   text check (portal_id in ('code', 'robotics', 'design', 'science')),
  level       int not null default 1,
  question    text not null check (char_length(question) between 10 and 400),
  answer      text check (char_length(answer) <= 1000),
  -- pending: espera respuesta · review: espera revisión del equipo
  -- answered: publicada · hidden: retirada por el equipo
  status      text not null default 'pending' check (status in ('pending', 'review', 'answered', 'hidden')),
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists mentor_questions_status on public.mentor_questions (status, created_at desc);
create index if not exists mentor_questions_user on public.mentor_questions (user_id, created_at desc);

-- ============================================================
-- MODO SIN INTERNET
-- Respuestas de práctica hechas sin conexión. El id lo genera el navegador:
-- si la misma respuesta llega dos veces (reintento), no suma dos veces.
-- ============================================================
create table if not exists public.offline_answers (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  correct     boolean not null,
  points      int not null default 0 check (points >= 0),
  answered_at timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists offline_answers_user_created on public.offline_answers (user_id, created_at desc);

-- Las rondas de práctica sin internet también quedan en el historial.
alter table public.rounds drop constraint if exists rounds_mode_check;
alter table public.rounds add constraint rounds_mode_check check (mode in ('ai', 'live', 'offline'));

alter table public.mentors          enable row level security;
alter table public.mentor_events    enable row level security;
alter table public.event_rsvps      enable row level security;
alter table public.mentor_questions enable row level security;
alter table public.offline_answers  enable row level security;

-- ============================================================
-- SEGUIDORES Y REACCIONES (HEROW Conecta)
-- Seguir es en un solo sentido: la mentora ve CUÁNTAS la siguen, nunca quiénes.
-- Las reacciones son botones fijos (sin texto libre): "Me ayudó" y "Me inspira".
-- ============================================================
create table if not exists public.mentor_follows (
  user_id    uuid not null references auth.users (id) on delete cascade,
  mentor_id  uuid not null references public.mentors (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, mentor_id)
);
create index if not exists mentor_follows_mentor on public.mentor_follows (mentor_id);

create table if not exists public.answer_reactions (
  user_id     uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.mentor_questions (id) on delete cascade,
  kind        text not null check (kind in ('me_ayudo', 'me_inspira')),
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id, kind)
);
create index if not exists answer_reactions_question on public.answer_reactions (question_id);

alter table public.mentor_follows   enable row level security;
alter table public.answer_reactions enable row level security;
