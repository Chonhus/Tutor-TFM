// Supabase Edge Function: borrar-alumno
//
// Derecho de supresión (RGPD, §7 de las especificaciones): un admin borra a
// un alumno y todo su rastro. Primero limpia sus archivos en Storage (no
// participan de las FK "on delete cascade" de Postgres), y después borra el
// auth.users correspondiente, lo que cascada automáticamente sobre
// profiles → alumnos, envios, fases_estado y vinculos_docente_alumno.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Falta cabecera Authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Token inválido o expirado" }, 401);
    }
    const adminId = userData.user.id;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", adminId)
      .single();
    if (profileError || callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Solo un administrador puede borrar un alumno" }, 403);
    }

    const { alumno_id } = await req.json();
    if (!alumno_id) return jsonResponse({ error: "Falta alumno_id" }, 400);

    const { data: alumno, error: alumnoError } = await adminClient
      .from("alumnos")
      .select("id, codigo")
      .eq("id", alumno_id)
      .single();
    if (alumnoError || !alumno) return jsonResponse({ error: "Alumno no encontrado" }, 404);

    const { data: archivos } = await adminClient.storage.from("docx").list(alumno_id);
    if (archivos && archivos.length > 0) {
      const rutas = archivos.map((f) => `${alumno_id}/${f.name}`);
      await adminClient.storage.from("docx").remove(rutas);
    }

    await adminClient.from("activity_log").insert({
      actor_id: adminId,
      activity_type: "borrar_alumno",
      metadata: { alumno_id, codigo: alumno.codigo },
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(alumno_id);
    if (deleteError) {
      return jsonResponse({ error: `No se pudo borrar la cuenta: ${deleteError.message}` }, 500);
    }

    return jsonResponse({ borrado: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
