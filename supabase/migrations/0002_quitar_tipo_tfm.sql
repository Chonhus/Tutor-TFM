-- El tipo de TFM (investigación empírica / proyecto de intervención /
-- revisión bibliográfica) generaba fricción: los alumnos lo elegían mal con
-- frecuencia (p.ej. un estudio descriptivo de frecuencia de eventos
-- adversos marcado como "proyecto de intervención") y las 8 fases del
-- itinerario son las mismas para los tres tipos. Se elimina como campo
-- obligatorio de selección; la orientación por tipo de estudio queda en el
-- propio texto de cada fase/tarea, que el alumno interpreta según su caso.
--
-- alumnos_update_own solo existía para que el alumno pudiera fijar
-- tipo_tfm; sin ese campo no hay ninguna columna de "alumnos" que deba
-- escribir desde el cliente, así que se retira también (mínimo privilegio:
-- ya no hay motivo para que un alumno pueda hacer update sobre su propia fila).
drop policy if exists "alumnos_update_own" on public.alumnos;
alter table public.alumnos drop column if exists tipo_tfm;
