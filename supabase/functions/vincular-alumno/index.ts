// Supabase Edge Function: vincular-alumno
//
// Permite a un docente vincularse a un alumno introduciendo su código de
// seguimiento (TFM-XXXXXX). Es el único punto de escritura de
// vinculos_docente_alumno (ver migración 0001: sin política de insert para
// 'authenticated'), para no exponer una forma de buscar alumnos por código
// directamente desde el cliente con la clave anónima.
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
    const docenteId = userData.user.id;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", docenteId)
      .single();
    if (profileError || callerProfile?.role !== "docente") {
      return jsonResponse({ error: "Solo un docente puede vincularse a un alumno por código" }, 403);
    }

    const { codigo } = await req.json();
    if (!codigo || !String(codigo).trim()) {
      return jsonResponse({ error: "Falta el código del alumno" }, 400);
    }

    const { data: alumno, error: alumnoError } = await adminClient
      .from("alumnos")
      .select("id, profiles(full_name, email)")
      .eq("codigo", String(codigo).trim().toUpperCase())
      .single();
    if (alumnoError || !alumno) {
      return jsonResponse({ error: "No existe ningún alumno con ese código" }, 404);
    }

    const { error: linkError } = await adminClient
      .from("vinculos_docente_alumno")
      .upsert({ docente_id: docenteId, alumno_id: alumno.id }, { onConflict: "docente_id,alumno_id" });
    if (linkError) {
      return jsonResponse({ error: `No se pudo vincular: ${linkError.message}` }, 500);
    }

    await adminClient.from("activity_log").insert({
      actor_id: docenteId,
      activity_type: "vincular_alumno",
      metadata: { alumno_id: alumno.id },
    });

    return jsonResponse({ alumno_id: alumno.id, perfil: alumno.profiles });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
