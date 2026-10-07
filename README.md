# Tutor de TFM

App web para guiar a estudiantes de máster en ciencias de la salud durante la
elaboración de su Trabajo Fin de Máster: el alumno recorre 8 fases, escribe
cada tarea y recibe corrección estructurada de un tutor IA (Claude), que
guía y corrige sin redactar el trabajo por él. Un docente puede vincularse a
un alumno por su código de seguimiento y consultar en solo lectura todo su
historial. Un administrador edita los textos del itinerario, las
instrucciones del tutor IA y los audios explicativos sin tocar código.

Sin backend propio: Supabase (Postgres + Auth + Edge Functions + Storage) +
hosting estático (p. ej. GitHub Pages). No hay build step: HTML/CSS/JS
planos, `supabase-js` se importa por ESM desde `https://esm.sh/@supabase/supabase-js@2`.

## Estado actual

El proyecto Supabase **`tutor-tfm`** (ref `zckafnnntdsrlhhfxwfu`, región
`eu-central-1`) ya está creado, enlazado (`supabase link`), con la migración
y el seed aplicados, los 5 secretos configurados y las 5 Edge Functions
desplegadas. `js/config.js` ya apunta a este proyecto. Se probó de extremo a
extremo con cuentas de prueba (alumno → envío real corregido por Claude →
docente vinculado por código viendo el historial → admin editando contenido
→ borrado RGPD en cascada) y se limpiaron esas cuentas al terminar; la base
de datos solo contiene el contenido del seed.

El alta de alumno ya **no** es pública (Edge Function `invite-alumno` +
`admin/invitar-alumnos.html`, con carga individual o en bloque desde un
Excel): solo el admin da acceso. Falta lo que solo puedes hacer tú (ver paso
8 más abajo): promocionar tu propia cuenta a admin por SQL, y desactivar
"Allow new users to sign up" en el dashboard de Supabase (Authentication →
Sign In / Providers → Email) para cerrar también la vía de la API directa.
Cuando despliegues en un dominio real, actualiza también el secreto
`SITE_URL` y las Redirect URLs de Supabase (pasos 5 y 7), que ahora mismo
apuntan a `http://localhost:5181` para las pruebas locales.

## Roles

| Rol | Alta | Puede |
|---|---|---|
| Alumno | Sin alta pública: lo invita un admin (`admin/invitar-alumnos.html`), uno a uno o en bloque desde un Excel; recibe un código único `TFM-XXXXXX` | Indicar (opcionalmente) su tipo de TFM —investigación, proyecto de intervención, revisión o proyecto de gestión— para que la IA adapte la corrección; recorrer las 8 fases, enviar tareas a corrección, subir `.docx`, marcar fases completadas, exportar a Word |
| Docente | Lo invita un admin (`admin/invite-docente.html`) | Vincularse a un alumno con su código y ver en solo lectura todo su historial |
| Administrador | El primero se promociona por SQL (ver más abajo); a partir de ahí puede invitar más admins directamente en Supabase | Editar textos/instrucciones/audios del itinerario, invitar docentes y alumnos, listar y borrar alumnos |

**Importante — cierra también el registro público desde el dashboard de Supabase**: Authentication → Sign In / Providers → Email → desactiva "Allow new users to sign up". Quitar el formulario de la web no basta por sí solo: sin ese toggle, alguien podría seguir registrándose llamando directamente a la API con la clave anónima.

## Requisitos previos (infraestructura real, no simulable)

1. Una cuenta y proyecto en [Supabase](https://supabase.com) (plan gratuito).
2. Una API key de [Anthropic](https://console.anthropic.com) (uso de pago por token).
3. [Supabase CLI](https://supabase.com/docs/guides/cli) instalado, para aplicar migraciones y desplegar las Edge Functions.

## Puesta en marcha

1. **Crear el proyecto Supabase** y anotar: `Project URL`, `anon public key`, `service_role key` (Project Settings → API).

2. **Configurar el frontend**: edita [`js/config.js`](js/config.js) con tu `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

3. **Aplicar el esquema y la seguridad a nivel de fila**:
   ```
   supabase link --project-ref <tu-project-ref>
   supabase db push        # aplica todas las migraciones de supabase/migrations/
   ```
   O pega en el SQL Editor del dashboard de Supabase el contenido de cada archivo de `supabase/migrations/`, en orden.

4. **Sembrar el itinerario** (las 8 fases, sus tareas y las instrucciones del tutor IA — edítalo a tu gusto antes o después desde el panel de admin): pega `supabase/seed.sql` en el SQL Editor de Supabase.

5. **Configurar los secretos de las Edge Functions**:
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set SITE_URL=https://tu-dominio-o-localhost/index.html
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente dentro de las Edge Functions.)

6. **Desplegar las Edge Functions**:
   ```
   supabase functions deploy corregir
   supabase functions deploy vincular-alumno
   supabase functions deploy invite-docente
   supabase functions deploy invite-alumno
   supabase functions deploy firmar-descarga
   supabase functions deploy borrar-alumno
   ```
   Para iterar rápido en local antes de desplegar:
   ```
   supabase functions serve corregir --env-file .env.local
   ```

7. **Configurar las URL de redirección**: en el dashboard de Supabase, Authentication → URL Configuration → Redirect URLs, añade la URL donde sirvas `index.html` (necesario para que los enlaces de invitación de docente y de "olvidé mi contraseña" funcionen).

8. **Crear el primer usuario admin**: como el alta ya no es pública, el primerísimo usuario hay que crearlo desde el dashboard de Supabase — Authentication → Users → "Add user" (o "Invite user") — y luego promocionarlo a admin con SQL:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-email@ejemplo.com';
   ```
   Nota: como el trigger crea por defecto una fila en `alumnos` con un código, si esa cuenta pasó primero por `role='alumno'` quedará una fila huérfana; puedes borrarla con `delete from public.alumnos where id = (select id from public.profiles where email = 'tu-email@ejemplo.com');` — no es necesaria una vez el rol es admin.
   A partir de ahí, ese admin puede invitar alumnos (`admin/invitar-alumnos.html`, uno a uno o en bloque desde Excel) y docentes (`admin/invite-docente.html`) directamente desde la propia app.

9. **Servir la app**: cualquier servidor estático sirve, por ejemplo:
   ```
   npx serve .
   ```
   Para producción, sube el contenido de esta carpeta a un repositorio de GitHub y activa GitHub Pages (o el hosting estático que prefieras).

## Estructura

- `index.html`, `itinerario.html`, `fase.html` — flujo del alumno.
- `seguimiento.html`, `alumno-detalle.html` — flujo del docente (y el admin, para el detalle).
- `admin/` — edición de contenidos, invitación de alumnos (individual o por Excel) y docentes, listado/borrado de alumnos (solo accesible con `role = 'admin'`).
- `js/` — cliente de Supabase, auth, navegación compartida, acceso a datos (`api.js`) y exportación a Word (`exportar-word.js`).
- `supabase/migrations/0001_init.sql` … `0004_tipo_tfm_opcional.sql` — esquema, funciones y políticas de Row Level Security.
- `supabase/seed.sql` — las 8 fases del itinerario con sus tareas, e instrucciones del tutor IA.
- `supabase/functions/corregir` — llama a Claude para corregir la tarea del alumno contra el contexto de la fase y la tarea.
- `supabase/functions/vincular-alumno` — un docente se vincula a un alumno por código.
- `supabase/functions/invite-docente` — un admin invita a un docente por email.
- `supabase/functions/invite-alumno` — un admin invita a un alumno por email (uno a uno o en bloque desde `admin/invitar-alumnos.html`); el alta ya no es pública.
- `supabase/functions/firmar-descarga` — URL firmada para bajar el `.docx` original de un envío.
- `supabase/functions/borrar-alumno` — derecho de supresión RGPD: borra al alumno y todo su rastro (BD + Storage).

## Fuera de alcance de esta versión

- Registro de actividad con panel visual (se guarda en `activity_log`, pero no hay una pantalla dedicada para consultarlo).
- Reenvío/gestión de invitaciones caducadas desde la propia app (se gestiona desde el dashboard de Supabase).
