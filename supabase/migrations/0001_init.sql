-- ============================================================
-- profiles: 1:1 con auth.users, guarda el rol (alumno|docente|admin)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'alumno' check (role in ('alumno', 'docente', 'admin')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- alumnos: datos propios de los usuarios con role='alumno'
-- ============================================================
create table public.alumnos (
  id          uuid primary key references public.profiles(id) on delete cascade,
  codigo      text unique not null,
  tipo_tfm    text check (tipo_tfm in ('investigacion', 'proyecto', 'revision')),
  created_at  timestamptz not null default now()
);

-- Genera un código único TFM-XXXXXX (mismo alfabeto y formato que
-- generarCodigo() del prototipo, sin caracteres ambiguos como 0/O/1/I).
create function public.generar_codigo_alumno()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidato text;
  existe boolean;
begin
  loop
    candidato := 'TFM-';
    for i in 1..6 loop
      candidato := candidato || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    select exists(select 1 from public.alumnos where codigo = candidato) into existe;
    exit when not existe;
  end loop;
  return candidato;
end;
$$;

-- Crea automáticamente la fila en profiles (y en alumnos, con código
-- generado, si el rol es 'alumno') cuando se crea un auth.users. Se dispara
-- tanto al auto-registrarse un alumno como al invitar a un docente/admin.
create function public.handle_new_user()
returns trigger as $$
declare
  rol text := coalesce(new.raw_user_meta_data ->> 'role', 'alumno');
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', rol);

  if rol = 'alumno' then
    insert into public.alumnos (id, codigo)
    values (new.id, public.generar_codigo_alumno());
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- vinculos_docente_alumno: se crea al introducir el código (Edge Function
-- vincular-alumno), nunca por insert directo del cliente.
-- ============================================================
create table public.vinculos_docente_alumno (
  docente_id  uuid not null references public.profiles(id) on delete cascade,
  alumno_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (docente_id, alumno_id)
);

-- ============================================================
-- fases_config / tareas_config: contenido del itinerario, editable por admin
-- ============================================================
create table public.fases_config (
  id           text primary key,
  orden        int not null,
  titulo       text not null,
  explicacion  text not null default '',
  audio_path   text
);

create table public.tareas_config (
  id              uuid primary key default gen_random_uuid(),
  fase_id         text not null references public.fases_config(id) on delete cascade,
  slug            text not null,
  orden           int not null,
  titulo          text not null,
  instruccion     text not null default '',
  tipo            text not null check (tipo in ('tema', 'pregunta', 'esquema', 'objetivos', 'redaccion', 'referencias')),
  permite_archivo boolean not null default false
);

create index tareas_config_fase_id_idx on public.tareas_config(fase_id);

-- ============================================================
-- envios: texto del alumno + feedback de la IA para una tarea, con historial
-- (cada intento es una fila nueva, nunca se sobrescribe)
-- ============================================================
create table public.envios (
  id           uuid primary key default gen_random_uuid(),
  alumno_id    uuid not null references public.profiles(id) on delete cascade,
  tarea_id     uuid not null references public.tareas_config(id) on delete cascade,
  texto        text not null,
  feedback_ia  text,
  docx_path    text,
  created_at   timestamptz not null default now()
);

create index envios_alumno_id_idx on public.envios(alumno_id);
create index envios_tarea_id_idx on public.envios(tarea_id);

-- ============================================================
-- fases_estado: marcado manual de "fase completada" por el alumno
-- ============================================================
create table public.fases_estado (
  alumno_id          uuid not null references public.profiles(id) on delete cascade,
  fase_id            text not null references public.fases_config(id) on delete cascade,
  completada         boolean not null default false,
  fecha_completada   timestamptz,
  primary key (alumno_id, fase_id)
);

-- ============================================================
-- config: instrucciones del tutor IA (fila única, editable por admin)
-- ============================================================
create table public.config (
  id                 boolean primary key default true,
  instrucciones_ia   text not null default '',
  constraint config_singleton check (id)
);

insert into public.config (id, instrucciones_ia) values (true, '');

-- ============================================================
-- activity_log: trazabilidad académica (quién accede a qué)
-- ============================================================
create table public.activity_log (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references public.profiles(id) on delete set null,
  activity_type  text not null,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles                 enable row level security;
alter table public.alumnos                   enable row level security;
alter table public.vinculos_docente_alumno   enable row level security;
alter table public.fases_config              enable row level security;
alter table public.tareas_config             enable row level security;
alter table public.envios                    enable row level security;
alter table public.fases_estado              enable row level security;
alter table public.config                    enable row level security;
alter table public.activity_log              enable row level security;

-- Comprueba si el usuario actual es admin. security definer para saltarse RLS
-- en esta consulta interna: si no, la propia política de profiles que la usa
-- se llamaría a sí misma sin parar (recursión infinita, error 42P17).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Comprueba si el usuario actual (docente) está vinculado al alumno dado.
-- security definer por el mismo motivo: se usa dentro de políticas de otras
-- tablas y no debe depender de que la propia política de vinculos_docente_alumno
-- se resuelva primero para el rol que está llamando.
create function public.es_docente_de(alumno uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vinculos_docente_alumno
    where docente_id = auth.uid() and alumno_id = alumno
  );
$$;

-- ---- profiles ----
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles_select_docente_vinculado"
  on public.profiles for select
  using (public.es_docente_de(id));

-- Sin política de insert/update/delete: las filas de profiles solo las
-- escribe el trigger handle_new_user (security definer). Esto bloquea
-- intencionadamente que alguien se auto-asigne el rol admin o docente.

-- ---- alumnos ----
create policy "alumnos_select_own"
  on public.alumnos for select
  using (auth.uid() = id);

create policy "alumnos_select_admin"
  on public.alumnos for select
  using (public.is_admin());

create policy "alumnos_select_docente_vinculado"
  on public.alumnos for select
  using (public.es_docente_de(id));

-- El alumno solo puede fijar su propio tipo_tfm (elección de itinerario);
-- ni el código ni el id son editables desde el cliente.
create policy "alumnos_update_own"
  on public.alumnos for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sin política de insert: la fila la crea el trigger handle_new_user.

-- ---- vinculos_docente_alumno ----
create policy "vinculos_select_docente"
  on public.vinculos_docente_alumno for select
  using (auth.uid() = docente_id);

create policy "vinculos_select_admin"
  on public.vinculos_docente_alumno for select
  using (public.is_admin());

-- Sin política de insert/update/delete para 'authenticated': el vínculo solo
-- se crea desde la Edge Function vincular-alumno (service-role), que primero
-- verifica el código y el rol de quien llama.

-- ---- fases_config ----
create policy "fases_config_select_authenticated"
  on public.fases_config for select
  to authenticated
  using (true);

create policy "fases_config_write_admin"
  on public.fases_config for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- tareas_config ----
create policy "tareas_config_select_authenticated"
  on public.tareas_config for select
  to authenticated
  using (true);

create policy "tareas_config_write_admin"
  on public.tareas_config for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- envios ----
create policy "envios_select_own"
  on public.envios for select
  using (auth.uid() = alumno_id);

create policy "envios_select_docente_vinculado"
  on public.envios for select
  using (public.es_docente_de(alumno_id));

create policy "envios_select_admin"
  on public.envios for select
  using (public.is_admin());

-- Sin política de insert ni de update para 'authenticated': la fila
-- completa (texto + feedback_ia) la escribe la Edge Function corregir con
-- la service-role key, en una sola operación, después de haber obtenido la
-- corrección real de Claude. Así un alumno no puede insertar una fila con
-- un feedback_ia falso ni modificar uno ya guardado.

-- ---- fases_estado ----
create policy "fases_estado_select_own"
  on public.fases_estado for select
  using (auth.uid() = alumno_id);

create policy "fases_estado_select_docente_vinculado"
  on public.fases_estado for select
  using (public.es_docente_de(alumno_id));

create policy "fases_estado_select_admin"
  on public.fases_estado for select
  using (public.is_admin());

create policy "fases_estado_upsert_own"
  on public.fases_estado for insert
  with check (auth.uid() = alumno_id);

create policy "fases_estado_update_own"
  on public.fases_estado for update
  using (auth.uid() = alumno_id)
  with check (auth.uid() = alumno_id);

-- ---- config ----
create policy "config_select_authenticated"
  on public.config for select
  to authenticated
  using (true);

create policy "config_write_admin"
  on public.config for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---- activity_log ----
create policy "activity_log_insert_own"
  on public.activity_log for insert
  with check (auth.uid() = actor_id);

create policy "activity_log_select_own"
  on public.activity_log for select
  using (auth.uid() = actor_id);

create policy "activity_log_select_admin"
  on public.activity_log for select
  using (public.is_admin());

-- ============================================================
-- Storage: buckets privados "docx" (originales subidos por el alumno) y
-- "audio" (explicaciones grabadas, subidas por el admin)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('docx', 'docx', false), ('audio', 'audio', false)
on conflict (id) do nothing;

-- docx: cada alumno solo puede leer/escribir en su propia carpeta
-- ({auth.uid()}/...). Docente/admin descargan vía la Edge Function
-- firmar-descarga (que usa service-role y comprueba el vínculo), no
-- directamente por Storage RLS.
create policy "docx_select_own"
  on storage.objects for select
  using (bucket_id = 'docx' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "docx_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'docx' and (storage.foldername(name))[1] = auth.uid()::text);

-- audio: cualquier usuario autenticado puede reproducir; solo el admin sube.
create policy "audio_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'audio' and auth.role() = 'authenticated');

create policy "audio_write_admin"
  on storage.objects for all
  using (bucket_id = 'audio' and public.is_admin())
  with check (bucket_id = 'audio' and public.is_admin());
