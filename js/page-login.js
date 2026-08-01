import { login, getSession, getProfile, homeParaRol } from "./auth.js";
import { supabase } from "./supabaseClient.js";

// Hay que leer el hash de la URL ANTES de cualquier "await": supabase-js
// procesa (y limpia) ese hash de forma asíncrona en cuanto puede, así que si
// lo miramos después de esperar algo ya podría haber desaparecido.
const hashParams = new URLSearchParams(window.location.hash.slice(1));
const linkType = hashParams.get("type");
const linkError = hashParams.get("error_description");

const loginCard = document.getElementById("login-card");
const setPasswordCard = document.getElementById("set-password-card");

async function irAHome() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const profile = await getProfile(session.user.id);
  window.location.href = homeParaRol(profile.role);
}

if (linkType === "invite" || linkType === "recovery" || linkError) {
  // Quien viene de un email de invitación (alumno/docente/admin — el alta ya
  // no es pública, ver ESPECIFICACIONES) o de "olvidé mi contraseña" ve este
  // formulario en vez del login normal.
  loginCard.hidden = true;
  setPasswordCard.hidden = false;

  const form = document.getElementById("set-password-form");
  const errorEl = document.getElementById("set-password-error");

  if (linkError) {
    errorEl.textContent = linkType === "recovery"
      ? "El enlace no es válido o ha caducado. Vuelve a solicitar uno desde \"¿Olvidaste tu contraseña?\"."
      : "El enlace no es válido o ha caducado. Pide al administrador que te invite de nuevo.";
    errorEl.hidden = false;
    form.querySelector("button").disabled = true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const newPassword = document.getElementById("new-password").value;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("El enlace de invitación no es válido o ha caducado.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await irAHome();
    } catch (err) {
      errorEl.textContent = "Error: " + err.message;
      errorEl.hidden = false;
    }
  });
} else {
  const existing = await getSession();
  if (existing) await irAHome();

  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    try {
      await login(email, password);
      await irAHome();
    } catch (err) {
      errorEl.textContent = "No se pudo iniciar sesión: " + err.message;
      errorEl.hidden = false;
    }
  });

  const forgotPasswordCard = document.getElementById("forgot-password-card");
  document.getElementById("show-forgot-password").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("forgot-email").value = document.getElementById("email").value.trim();
    loginCard.hidden = true;
    forgotPasswordCard.hidden = false;
  });
  document.getElementById("show-login-from-forgot").addEventListener("click", (e) => {
    e.preventDefault();
    forgotPasswordCard.hidden = true;
    loginCard.hidden = false;
  });

  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const forgotPasswordMessage = document.getElementById("forgot-password-message");
  const forgotPasswordError = document.getElementById("forgot-password-error");
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    forgotPasswordMessage.hidden = true;
    forgotPasswordError.hidden = true;
    const email = document.getElementById("forgot-email").value.trim();
    const submitBtn = forgotPasswordForm.querySelector("button");
    submitBtn.disabled = true;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) throw error;
      forgotPasswordMessage.textContent = "Si ese email tiene una cuenta, te hemos enviado un enlace para restablecer la contraseña. Revisa tu bandeja de entrada (y spam).";
      forgotPasswordMessage.hidden = false;
    } catch (err) {
      forgotPasswordError.textContent = "No se pudo enviar el enlace: " + err.message;
      forgotPasswordError.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

setTimeout(() => {
  document.getElementById("splash")?.classList.add("splash-hide");
}, 1200);
