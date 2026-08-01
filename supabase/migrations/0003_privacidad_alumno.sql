-- Consentimiento informado (RGPD): el alumno debe aceptar la política de
-- privacidad antes de poder usar la app (ver privacidad.html). Se guarda la
-- fecha de aceptación, no un simple booleano, para tener constancia de
-- cuándo se prestó el consentimiento.
--
-- Solo se le da permiso de escribir esta única columna, no toda la fila:
-- GRANT UPDATE(columna) + RLS por fila es la combinación correcta para que
-- el alumno pueda marcar su propia aceptación sin poder tocar "codigo" (que
-- es justo lo que se cerró en la migración 0002 al quitar la política de
-- update genérica).
alter table public.alumnos add column privacidad_aceptada_at timestamptz;

revoke update on public.alumnos from authenticated;
grant update (privacidad_aceptada_at) on public.alumnos to authenticated;

create policy "alumnos_aceptar_privacidad"
  on public.alumnos for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
