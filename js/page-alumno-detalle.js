import { requireAnyRole } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import {
  fetchAlumnoDetalle, fetchFases, fetchEnviosDeAlumno, solicitarDescarga, logActivity,
} from "./api.js";
import { exportarItinerarioWord } from "./exportar-word.js";
import { tipoDe } from "./tipos-tfm.js";

const alumnoId = new URLSearchParams(window.location.search).get("id");

const auth = await requireAnyRole(["docente", "admin"]);
if (auth) {
  if (!alumnoId) {
    window.location.href = auth.profile.role === "admin" ? "admin/alumnos.html" : "seguimiento.html";
  } else {
    await mountNav();
    logActivity("ver_detalle_alumno", { alumno_id: alumnoId });
    await render(auth.profile.role);
  }
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-ES");
}

async function render(rolCaller) {
  const content = document.getElementById("content");

  let alumno;
  try {
    alumno = await fetchAlumnoDetalle(alumnoId);
  } catch (err) {
    content.innerHTML = `<p class="error-msg">No se pudo cargar el alumno: ${escapeHtml(err.message)}</p>`;
    return;
  }

  const [fases, envios] = await Promise.all([fetchFases(), fetchEnviosDeAlumno(alumnoId)]);
  const completadasIds = new Set((alumno.fases_estado || []).filter((f) => f.completada).map((f) => f.fase_id));
  const totalEnvios = envios.length;

  const tipo = tipoDe(alumno.alumnos?.tipo_tfm);

  content.innerHTML = `
    <button class="back-link" id="volver">&larr; Volver</button>
    <div class="header row-between">
      <div>
        <h1>${escapeHtml(alumno.full_name || alumno.email)}</h1>
        <p>${escapeHtml(alumno.alumnos?.codigo || "")}${tipo ? ` · Tipo de TFM: ${escapeHtml(tipo.nombre)}` : ""}</p>
      </div>
      <button class="btn-secundario btn-small" id="exportar">Exportar a Word</button>
    </div>
    <p id="export-error" class="error-msg" hidden></p>

    <div class="card card-tinted" style="margin-bottom:16px">
      <p><strong>${completadasIds.size}</strong> de ${fases.length} fases completadas · <strong>${totalEnvios}</strong> envíos a la IA en total</p>
    </div>

    <div id="fases"></div>
  `;

  document.getElementById("volver").addEventListener("click", () => window.history.back());

  document.getElementById("exportar").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const errorEl = document.getElementById("export-error");
    errorEl.hidden = true;
    btn.disabled = true;
    try {
      await exportarItinerarioWord(alumno.full_name || alumno.email, fases, envios);
    } catch (err) {
      errorEl.textContent = "No se pudo exportar: " + err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  const fasesEl = document.getElementById("fases");
  fases.forEach((fase) => {
    const completada = completadasIds.has(fase.id);
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "12px";
    card.innerHTML = `
      <div class="row-between">
        <h3 class="f-display" style="font-size:16px">${escapeHtml(fase.titulo)}</h3>
        <span class="badge ${completada ? "completada" : "pendiente"}">${completada ? "Completada" : "Pendiente"}</span>
      </div>
    `;
    (fase.tareas_config || []).forEach((tarea) => {
      const intentos = envios
        .filter((e) => e.tareas_config?.id === tarea.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      if (intentos.length === 0) {
        const p = document.createElement("p");
        p.className = "muted";
        p.style.marginTop = "8px";
        p.style.fontSize = "13px";
        p.textContent = `${tarea.titulo}: sin envíos`;
        card.appendChild(p);
        return;
      }
      const det = document.createElement("details");
      det.style.marginTop = "10px";
      const ultimo = intentos[intentos.length - 1];
      det.innerHTML = `
        <summary>${escapeHtml(tarea.titulo)} · ${intentos.length} ${intentos.length === 1 ? "envío" : "envíos"} · último: ${formatFecha(ultimo.created_at)}</summary>
        ${intentos.map((it, i) => `
          <div class="historial-item">
            <div class="row-between">
              <p class="muted">Versión ${i + 1} · ${formatFecha(it.created_at)}</p>
              ${it.docx_path ? `<button class="btn-fantasma btn-small descargar" data-envio="${it.id}">Descargar .docx</button>` : ""}
            </div>
            <div class="respuesta-alumno">
              <div class="eyebrow" style="color:var(--acento-oscuro)">Respuesta del alumno</div>
              <p style="white-space:pre-line">${escapeHtml(it.texto)}</p>
            </div>
            <div class="feedback-box">
              <div class="eyebrow" style="color:var(--ambar)">Corrección del tutor IA</div>
              <p style="white-space:pre-line">${escapeHtml(it.feedback_ia)}</p>
            </div>
          </div>
        `).join("")}
      `;
      card.appendChild(det);
    });
    fasesEl.appendChild(card);
  });

  fasesEl.querySelectorAll(".descargar").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const envioId = btn.dataset.envio;
      btn.disabled = true;
      try {
        const url = await solicitarDescarga(envioId);
        window.open(url, "_blank");
      } catch (err) {
        alert("No se pudo descargar: " + err.message);
      } finally {
        btn.disabled = false;
      }
    });
  });
}
