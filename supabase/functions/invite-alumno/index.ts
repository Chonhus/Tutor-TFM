// Supabase Edge Function: invite-alumno
//
// Antes cualquiera podía registrarse como alumno desde index.html. Ahora el
// alta es solo por invitación del admin (uno a uno, o en bloque desde un
// Excel en admin/invitar-alumnos.html), igual que invite-docente. El
// trigger handle_new_user crea el profile con role='alumno' (por defecto si
// no se indica otro) y la fila en alumnos con su código, automáticamente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// A dónde debe volver el alumno tras aceptar la invitación. Debe coincidir
// con una entrada en Authentication > URL Configuration > Redirect URLs del
// proyecto Supabase, o el enlace del email no funcionará.
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000/index.html";

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

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (profileError || callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Solo un administrador puede invitar alumnos" }, 403);
    }

    const { email, full_name } = await req.json();
    if (!email) return jsonResponse({ error: "Falta el email" }, 400);

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: full_name ?? null, role: "alumno" }, redirectTo: SITE_URL },
    );
    if (inviteError) {
      return jsonResponse({ error: `No se pudo invitar: ${inviteError.message}` }, 400);
    }

    return jsonResponse({ invited: true, user_id: invited.user?.id });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
