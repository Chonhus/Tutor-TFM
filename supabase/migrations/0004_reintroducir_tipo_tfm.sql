-- Reintroduce el tipo de TFM, pero no con el mismo alcance que la versión
-- retirada en la migración 0002. Aquella cubría solo investigación empírica,
-- proyecto de intervención y revisión bibliográfica: tres tipos parecidos
-- entre sí (mismas 8 fases, criterios de corrección casi idénticos) que
-- generaban fricción sin aportar gran cosa, así que se quitaron.
--
-- Ahora se añaden también los 4 tipos de calidad y seguridad (protocolo de
-- investigación, mapa de riesgos, protocolo asistencial, análisis
-- causa-raíz), que sí son metodológicamente muy distintos entre sí y de los
-- 3 anteriores: no piden PICO ni hipótesis, y sustituyen resultados,
-- discusión y conclusiones por apartados propios (AMFE/matriz de riesgos,
-- GRADE/AGREE II, Protocolo de Londres/RCA²...). Ahí un tipo con criterios
-- de corrección específicos sí aporta valor real a la IA.
--
-- No es configurable desde administración (decisión explícita, a diferencia
-- de lo previsto en las especificaciones §3bis): los 7 tipos y sus criterios
-- de corrección viven en el código de la Edge Function `corregir` y en
-- `js/tipos-tfm.js` del frontend. Para reducir el riesgo de que el alumno
-- elija mal (la razón real de la fricción original), puede pedir una
-- sugerencia a la IA antes de decidir (Edge Function `sugerir-tipo-tfm`).
alter table public.alumnos
  add column tipo_tfm text
  check (tipo_tfm in (
    'investigacion', 'protocolo-investigacion', 'proyecto', 'revision',
    'riesgos', 'protocolo', 'acr'
  ));

-- Mismo patrón que privacidad_aceptada_at (migración 0003): grant acotado a
-- esta columna. La política de UPDATE ya existente sobre "alumnos"
-- (alumnos_aceptar_privacidad, using/check auth.uid() = id) no está atada a
-- ninguna columna concreta, así que ya cubre cualquier columna para la que
-- el alumno tenga grant; no hace falta una política nueva.
grant update (tipo_tfm) on public.alumnos to authenticated;
