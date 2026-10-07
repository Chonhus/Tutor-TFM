-- Vuelve el tipo de TFM, ahora OPCIONAL y con una cuarta opción "gestion".
--
-- La migración 0002 lo retiró porque, como campo obligatorio, los alumnos lo
-- elegían mal. Pero sin él la IA no tiene forma de saber que un trabajo es,
-- por ejemplo, un plan estratégico de un área (análisis de situación, mapa
-- de procesos, DAFO, líneas de mejora), y lo corrige con criterios de
-- estudio empírico (tamaño muestral, estadística, comité de ética…). Por eso
-- vuelve con estas diferencias:
--   * es opcional (null = "sin indicar": la IA deduce el tipo del texto,
--     como hasta ahora) y el alumno puede cambiarlo cuando quiera;
--   * cada opción se explica en la propia pantalla del itinerario;
--   * añade "gestion" (proyecto de gestión / plan estratégico de un
--     servicio o área), que no encajaba en ninguno de los tres tipos.
alter table public.alumnos
  add column tipo_tfm text
  check (tipo_tfm in ('investigacion', 'proyecto', 'revision', 'gestion'));

-- El alumno puede escribir esta columna de su propia fila (la política
-- alumnos_aceptar_privacidad de la 0003 ya limita el update a la fila
-- propia); "codigo" sigue sin poder tocarse desde el cliente.
grant update (tipo_tfm) on public.alumnos to authenticated;
