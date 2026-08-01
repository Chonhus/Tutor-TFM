import { supabase } from "./supabaseClient.js";

// Invoca una Edge Function y devuelve su cuerpo, lanzando un Error con el
// mensaje real del servidor. supabase-js pone el mensaje genérico "Edge
// Function returned a non-2xx status code" en error.message y deja el
// Response crudo (sin parsear) en error.context — hay que leer su JSON para
// recuperar el {error: "..."} que sí escriben nuestras funciones.
async function invocarFuncion(nombre, body) {
  const { data, error } = await supabase.functions.invoke(nombre, { body });
  if (error) {
    let mensaje = error.message;
    if (error.context && typeof error.context.json === "function") {
      try {
        const cuerpo = await error.context.json();
        if (cuerpo?.error) mensaje = cuerpo.error;
      } catch (_) {
        // el cuerpo no era JSON (p.ej. error de red/CORS): nos quedamos con error.message
      }
    }
    throw new Error(mensaje);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---- Itinerario (fases y tareas) ----

export async function fetchFases() {
  const { data, error } = await supabase
    .from("fases_config")
    .select("id, orden, titulo, explicacion, audio_path, tareas_config(id, slug, orden, titulo, instruccion, tipo, permite_archivo)")
    .order("orden")
    .order("orden", { foreignTable: "tareas_config" });
  if (error) throw error;
  return data;
}

export async function fetchFase(faseId) {
  const { data, error } = await supabase
    .from("fases_config")
    .select("id, orden, titulo, explicacion, audio_path, tareas_config(id, slug, orden, titulo, instruccion, tipo, permite_archivo)")
    .eq("id", faseId)
    .order("orden", { foreignTable: "tareas_config" })
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAudioUrl(audioPath) {
  if (!audioPath) return null;
  const { data, error } = await supabase.storage.from("audio").createSignedUrl(audioPath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ---- Alumno (propio) ----

export async function fetchMiAlumno(userId) {
  const { data, error } = await supabase
    .from("alumnos")
    .select("id, codigo, privacidad_aceptada_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

// El alumno solo puede escribir esta columna de su propia fila (ver
// migración 0003: GRANT UPDATE acotado a esta columna + RLS por fila), así
// que no puede tocar nada más (p.ej. su código) desde el cliente.
export async function aceptarPrivacidad() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa.");
  const { error } = await supabase
    .from("alumnos")
    .update({ privacidad_aceptada_at: new Date().toISOString() })
    .eq("id", session.user.id);
  if (error) throw error;
}

export async function fetchFasesEstado(alumnoId) {
  const { data, error } = await supabase
    .from("fases_estado")
    .select("fase_id, completada, fecha_completada")
    .eq("alumno_id", alumnoId);
  if (error) throw error;
  return data;
}

export async function marcarFaseCompletada(faseId, completada) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa.");
  const { error } = await supabase
    .from("fases_estado")
    .upsert(
      {
        alumno_id: session.user.id,
        fase_id: faseId,
        completada,
        fecha_completada: completada ? new Date().toISOString() : null,
      },
      { onConflict: "alumno_id,fase_id" },
    );
  if (error) throw error;
}

// ---- Envíos e historial ----

// Vale tanto para el propio alumno (RLS: fila propia) como para un docente
// vinculado o un admin (RLS: vínculo o is_admin()).
export async function fetchEnviosDeAlumno(alumnoId) {
  const { data, error } = await supabase
    .from("envios")
    .select("id, texto, feedback_ia, docx_path, created_at, tareas_config(id, titulo, tipo, fase_id, fases_config(titulo))")
    .eq("alumno_id", alumnoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// Sube el .docx original a la carpeta propia del alumno en Storage y
// devuelve la ruta (se adjunta al envío al enviarlo a corrección).
export async function subirDocxOriginal(file) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa.");
  const ruta = `${session.user.id}/${crypto.randomUUID()}.docx`;
  const { error } = await supabase.storage.from("docx").upload(ruta, file);
  if (error) throw error;
  return ruta;
}

// Llama a la Edge Function corregir: guarda el envío completo (texto +
// feedback) en el servidor y devuelve el feedback de la IA.
export async function enviarTarea({ tarea_id, texto, docx_path }) {
  return invocarFuncion("corregir", { tarea_id, texto, docx_path: docx_path ?? null });
}

// Llama a la Edge Function firmar-descarga y devuelve una URL temporal.
export async function solicitarDescarga(envioId) {
  const data = await invocarFuncion("firmar-descarga", { envio_id: envioId });
  return data.url;
}

// ---- Docente ----

// Vale para docente (RLS: solo sus alumnos vinculados) y para admin (RLS:
// is_admin() ve todos): misma consulta, distinto alcance según quién llama.
export async function fetchAlumnosVinculados() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, alumnos(codigo)")
    .eq("role", "alumno")
    .order("full_name");
  if (error) throw error;
  return data;
}

export async function fetchFasesEstadoDeVarios(alumnoIds) {
  if (!alumnoIds.length) return [];
  const { data, error } = await supabase
    .from("fases_estado")
    .select("alumno_id, fase_id, completada")
    .in("alumno_id", alumnoIds)
    .eq("completada", true);
  if (error) throw error;
  return data;
}

export async function fetchAlumnoDetalle(alumnoId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, alumnos(codigo), fases_estado(fase_id, completada, fecha_completada)")
    .eq("id", alumnoId)
    .single();
  if (error) throw error;
  return data;
}

// Llama a la Edge Function vincular-alumno (solo docentes).
export async function vincularAlumno(codigo) {
  return invocarFuncion("vincular-alumno", { codigo });
}

// ---- Administración de contenido (solo admins, permitido por RLS vía is_admin()) ----

export async function fetchInstruccionesIA() {
  const { data, error } = await supabase.from("config").select("instrucciones_ia").single();
  if (error) throw error;
  return data.instrucciones_ia;
}

export async function actualizarInstruccionesIA(texto) {
  const { error } = await supabase.from("config").update({ instrucciones_ia: texto }).eq("id", true);
  if (error) throw error;
}

export async function actualizarFase(faseId, { titulo, explicacion }) {
  const { error } = await supabase.from("fases_config").update({ titulo, explicacion }).eq("id", faseId);
  if (error) throw error;
}

export async function actualizarTarea(tareaId, { titulo, instruccion }) {
  const { error } = await supabase.from("tareas_config").update({ titulo, instruccion }).eq("id", tareaId);
  if (error) throw error;
}

export async function subirAudioFase(faseId, file) {
  const ruta = `${faseId}.${(file.name.split(".").pop() || "mp3").toLowerCase()}`;
  const { error: uploadError } = await supabase.storage.from("audio").upload(ruta, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("fases_config").update({ audio_path: ruta }).eq("id", faseId);
  if (error) throw error;
  return ruta;
}

// Llama a la Edge Function invite-docente (solo admins).
export async function invitarDocente({ email, full_name }) {
  return invocarFuncion("invite-docente", { email, full_name });
}

// Llama a la Edge Function invite-alumno (solo admins). El alta de alumno ya
// no es pública: solo el admin puede invitar, uno a uno o en bloque desde
// un Excel (ver admin/invitar-alumnos.html).
export async function invitarAlumno({ email, full_name }) {
  return invocarFuncion("invite-alumno", { email, full_name });
}

// Llama a la Edge Function borrar-alumno (solo admins, derecho de supresión RGPD).
export async function borrarAlumno(alumnoId) {
  return invocarFuncion("borrar-alumno", { alumno_id: alumnoId });
}

// ---- Registro de actividad ----

// No bloquea la UI si falla: la actividad es informativa, no crítica para
// que el usuario pueda seguir usando la app.
export async function logActivity(activity_type, metadata = null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const { error } = await supabase
    .from("activity_log")
    .insert({ actor_id: session.user.id, activity_type, metadata });
  if (error) console.error("No se pudo registrar la actividad:", error.message);
}
