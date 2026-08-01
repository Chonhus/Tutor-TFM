import { supabase } from "./supabaseClient.js";

// Las páginas de admin viven en /admin/, así que los enlaces a la raíz
// necesitan "../"; el resto de páginas están en la raíz del sitio.
function rootPrefix() {
  return window.location.pathname.includes("/admin/") ? "../" : "";
}

export function homeParaRol(role) {
  if (role === "docente") return "seguimiento.html";
  if (role === "admin") return "admin/index.html";
  return "itinerario.html";
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Redirige a index.html si no hay sesión. Devuelve la sesión si existe.
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = rootPrefix() + "index.html";
    return null;
  }
  return session;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

// Exige sesión + un rol concreto; si el rol no coincide, redirige a la
// página de inicio que le corresponde a su rol real (nunca a un error).
async function requireRole(role) {
  const session = await requireAuth();
  if (!session) return null;
  const profile = await getProfile(session.user.id);
  if (profile.role !== role) {
    window.location.href = rootPrefix() + homeParaRol(profile.role);
    return null;
  }
  return { session, profile };
}

export const requireAlumno = () => requireRole("alumno");
export const requireDocente = () => requireRole("docente");
export const requireAdmin = () => requireRole("admin");

// Igual que requireRole pero acepta varios roles válidos (p.ej. una página
// de detalle que pueden ver tanto un docente vinculado como un admin).
export async function requireAnyRole(roles) {
  const session = await requireAuth();
  if (!session) return null;
  const profile = await getProfile(session.user.id);
  if (!roles.includes(profile.role)) {
    window.location.href = rootPrefix() + homeParaRol(profile.role);
    return null;
  }
  return { session, profile };
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = rootPrefix() + "index.html";
}
