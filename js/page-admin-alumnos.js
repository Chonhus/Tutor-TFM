import { requireAdmin } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import { fetchAlumnosVinculados, borrarAlumno } from "./api.js";

const auth = await requireAdmin();
if (auth) {
  await mountNav();
  await render();
}

async function render() {
  const content = document.getElementById("content");
  const alumnos = await fetchAlumnosVinculados();

  content.innerHTML = `
    <button class="back-link" id="volver">&larr; Admin</button>
    <div class="header">
      <h1>Alumnos (${alumnos.length})</h1>
      <p>Borrar un alumno elimina también sus envíos, archivos y vínculos con docentes (derecho de supresión RGPD).</p>
    </div>
    <p id="error" class="error-msg" hidden></p>
    ${alumnos.length === 0 ? `<p class="muted">Todavía no hay alumnos registrados.</p>` : `
      <table>
        <thead><tr><th>Nombre</th><th>Email</th><th>Código</th><th></th></tr></thead>
        <tbody>
          ${alumnos.map((a) => `
            <tr>
              <td><a href="../alumno-detalle.html?id=${encodeURIComponent(a.id)}">${escapeHtml(a.full_name || "(sin nombre)")}</a></td>
              <td>${escapeHtml(a.email)}</td>
              <td>${escapeHtml(a.alumnos?.codigo || "")}</td>
              <td><button class="btn-danger btn-small" data-id="${a.id}" data-nombre="${escapeHtml(a.full_name || a.email)}">Borrar</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `}
  `;

  document.getElementById("volver").addEventListener("click", () => { window.location.href = "index.html"; });

  content.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const errorEl = document.getElementById("error");
      errorEl.hidden = true;
      if (!confirm(`¿Borrar definitivamente a ${btn.dataset.nombre}? Esta acción no se puede deshacer.`)) return;
      btn.disabled = true;
      try {
        await borrarAlumno(btn.dataset.id);
        await render();
      } catch (err) {
        errorEl.textContent = "No se pudo borrar: " + err.message;
        errorEl.hidden = false;
        btn.disabled = false;
      }
    });
  });
}
