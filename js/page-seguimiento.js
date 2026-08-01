import { requireDocente } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import { fetchFases, fetchAlumnosVinculados, fetchFasesEstadoDeVarios, vincularAlumno } from "./api.js";

const auth = await requireDocente();
if (auth) {
  await mountNav();
  await render();
}

async function render() {
  const content = document.getElementById("content");
  const [fases, alumnos] = await Promise.all([fetchFases(), fetchAlumnosVinculados()]);
  const totalFases = fases.length;
  const completadas = await fetchFasesEstadoDeVarios(alumnos.map((a) => a.id));

  const progresoPorAlumno = {};
  alumnos.forEach((a) => { progresoPorAlumno[a.id] = 0; });
  completadas.forEach((c) => { progresoPorAlumno[c.alumno_id] = (progresoPorAlumno[c.alumno_id] || 0) + 1; });

  content.innerHTML = `
    <div class="header">
      <h1>Seguimiento docente</h1>
      <p>Vincúlate a un alumno con su código para ver su progreso.</p>
    </div>
    <div class="card">
      <div class="row">
        <input id="codigo" type="text" placeholder="TFM-XXXXXX" style="max-width:220px" />
        <button id="vincular">Vincular</button>
      </div>
      <p id="vincular-error" class="error-msg" hidden></p>
      <p id="vincular-success" class="success-msg" hidden></p>
    </div>

    <h2 class="f-display" style="font-size:18px;margin:24px 0 12px">Tus alumnos (${alumnos.length})</h2>
    ${alumnos.length === 0 ? `<p class="muted">Todavía no te has vinculado a ningún alumno.</p>` : `
      <div class="stack">
        ${alumnos.map((a) => `
          <a class="itinerario-link" href="alumno-detalle.html?id=${encodeURIComponent(a.id)}">
            <span class="f-display" style="font-size:15px">${escapeHtml(a.full_name || a.email)}</span>
            <span class="muted" style="display:block;margin-top:2px">
              ${escapeHtml(a.alumnos?.codigo || "")} · ${progresoPorAlumno[a.id] || 0}/${totalFases} fases completadas
            </span>
          </a>
        `).join("")}
      </div>
    `}
  `;

  document.getElementById("vincular").addEventListener("click", async () => {
    const codigo = document.getElementById("codigo").value.trim();
    const errorEl = document.getElementById("vincular-error");
    const successEl = document.getElementById("vincular-success");
    errorEl.hidden = true;
    successEl.hidden = true;
    if (!codigo) return;
    try {
      await vincularAlumno(codigo);
      successEl.textContent = "Alumno vinculado.";
      successEl.hidden = false;
      await render();
    } catch (err) {
      errorEl.textContent = "No se pudo vincular: " + err.message;
      errorEl.hidden = false;
    }
  });
}
