import { getSession, getProfile, logout } from "./auth.js";
import { escapeHtml } from "./escape.js";

// Inserta la barra superior (marca + usuario + salir) en <header id="app-nav">.
// Debe llamarse DESPUÉS de requireAuth()/requireRole().
export async function mountNav() {
  const container = document.getElementById("app-nav");
  if (!container) return;

  const session = await getSession();
  if (!session) return;
  const profile = await getProfile(session.user.id);

  const root = window.location.pathname.includes("/admin/") ? "../" : "";

  container.innerHTML = `
    <div class="top-bar">
      <a href="${root}index.html" class="brand">Tutor de TFM</a>
      <div class="top-bar-user">
        <span>${escapeHtml(profile.full_name || profile.email)}</span>
        <button id="logout-btn" class="link-button">Salir</button>
      </div>
    </div>
  `;
  document.getElementById("logout-btn").addEventListener("click", logout);
}
