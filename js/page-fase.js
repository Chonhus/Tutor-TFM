import mammoth from "https://esm.sh/mammoth@1.8.0?bundle";
import { requireAlumno } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import {
  fetchFase, fetchAudioUrl, fetchEnviosDeAlumno, fetchFasesEstado,
  enviarTarea, subirDocxOriginal, marcarFaseCompletada,
} from "./api.js";

const faseId = new URLSearchParams(window.location.search).get("fase");
const pendientesDocx = new Map(); // tarea_id -> { path, nombre }

const auth = await requireAlumno();
if (auth) {
  if (!faseId) {
    window.location.href = "itinerario.html";
  } else {
    await mountNav();
    await render(auth.session.user.id);
  }
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-ES");
}

async function render(userId) {
  const content = document.getElementById("content");
  const [fase, envios, fasesEstado] = await Promise.all([
    fetchFase(faseId),
    fetchEnviosDeAlumno(userId),
    fetchFasesEstado(userId),
  ]);

  const completada = !!fasesEstado.find((fe) => fe.fase_id === faseId)?.completada;
  const audioUrl = fase.audio_path ? await fetchAudioUrl(fase.audio_path).catch(() => null) : null;

  content.innerHTML = `
    <button class="back-link" id="volver">&larr; Volver a tu itinerario</button>
    <div class="header"><h1>${escapeHtml(fase.titulo)}</h1></div>

    <div class="card card-tinted">
      <div class="eyebrow">Qué es y cómo se hace</div>
      <p style="white-space:pre-line;line-height:1.6">${escapeHtml(fase.explicacion)}</p>
      ${audioUrl ? `
        <div style="margin-top:12px">
          <p class="muted" style="margin-bottom:4px">Audio explicativo</p>
          <audio controls src="${audioUrl}" style="width:100%;max-width:420px"></audio>
        </div>` : ""}
    </div>

    <div id="tareas"></div>

    <p id="error" class="error-msg" hidden></p>
    <div style="margin-top:20px;margin-bottom:40px">
      <button class="btn-secundario" id="toggle-completada">
        ${completada ? "Reabrir esta fase" : "Marcar fase como completada"}
      </button>
    </div>
  `;

  document.getElementById("volver").addEventListener("click", () => {
    window.location.href = "itinerario.html";
  });

  document.getElementById("toggle-completada").addEventListener("click", async () => {
    const errorEl = document.getElementById("error");
    try {
      await marcarFaseCompletada(faseId, !completada);
      await render(userId);
    } catch (err) {
      errorEl.textContent = "No se pudo guardar: " + err.message;
      errorEl.hidden = false;
    }
  });

  const tareasEl = document.getElementById("tareas");
  fase.tareas_config.forEach((tarea, idx) => {
    const intentos = envios
      .filter((e) => e.tareas_config?.id === tarea.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    tareasEl.appendChild(renderTarea(tarea, idx, intentos, userId));
  });
}

function renderTarea(tarea, idx, intentos, userId) {
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.marginTop = "16px";
  const ultimo = intentos.length ? intentos[intentos.length - 1] : null;
  const previos = intentos.length > 1 ? intentos.slice(0, -1) : [];

  wrap.innerHTML = `
    <div class="paso-label">Paso ${idx + 1}</div>
    <h3 class="f-display" style="font-size:17px;margin-bottom:4px">${escapeHtml(tarea.titulo)}</h3>
    <p class="muted" style="margin-bottom:12px">${escapeHtml(tarea.instruccion)}</p>
    <textarea id="texto-${tarea.id}" rows="8" placeholder="Escribe aquí tu texto…">${escapeHtml(ultimo?.texto || "")}</textarea>
    ${tarea.permite_archivo ? `
      <div class="file-drop">
        <label style="font-size:12px" for="docx-${tarea.id}">¿Lo tienes escrito en Word? Sube el archivo .docx y su texto se cargará arriba (revísalo antes de enviar):</label>
        <input type="file" id="docx-${tarea.id}" accept=".docx" />
        <p id="docx-status-${tarea.id}" class="muted" style="font-size:12px;margin-top:4px"></p>
      </div>` : ""}
    <div class="row" style="margin-top:12px">
      <button id="enviar-${tarea.id}">${intentos.length ? "Enviar nueva versión" : "Enviar para corrección"}</button>
      ${intentos.length ? `<span class="muted">${intentos.length} ${intentos.length === 1 ? "envío" : "envíos"}</span>` : ""}
    </div>
    <div id="loading-${tarea.id}" class="loading" hidden>
      <span class="loading-dot"></span> La IA está revisando tu texto…
    </div>
    <p id="error-${tarea.id}" class="error-msg" hidden></p>
    ${ultimo ? `
      <div class="feedback-box">
        <div class="eyebrow" style="color:var(--ambar)">Corrección del tutor IA · ${formatFecha(ultimo.created_at)}</div>
        <div>${escapeHtml(ultimo.feedback_ia)}</div>
      </div>` : ""}
    ${previos.length ? `
      <details style="margin-top:10px">
        <summary>Ver ${previos.length} ${previos.length === 1 ? "versión anterior" : "versiones anteriores"}</summary>
        ${previos.map((p) => `
          <div class="historial-item">
            <p class="muted">${formatFecha(p.created_at)}</p>
            <div class="respuesta-alumno">
              <div class="eyebrow" style="color:var(--acento-oscuro)">Tu respuesta</div>
              <p style="white-space:pre-line">${escapeHtml(p.texto)}</p>
            </div>
            <div class="feedback-box">
              <div class="eyebrow" style="color:var(--ambar)">Corrección del tutor IA</div>
              <p style="white-space:pre-line">${escapeHtml(p.feedback_ia)}</p>
            </div>
          </div>
        `).join("")}
      </details>` : ""}
  `;

  if (tarea.permite_archivo) {
    const fileInput = wrap.querySelector(`#docx-${tarea.id}`);
    fileInput.addEventListener("change", (e) => onDocxChange(e, tarea));
  }

  wrap.querySelector(`#enviar-${tarea.id}`).addEventListener("click", () => onEnviar(tarea, userId));

  return wrap;
}

async function onDocxChange(e, tarea) {
  const archivo = e.target.files?.[0];
  const statusEl = document.getElementById(`docx-status-${tarea.id}`);
  const errorEl = document.getElementById(`error-${tarea.id}`);
  errorEl.hidden = true;
  if (!archivo) return;
  if (!archivo.name.toLowerCase().endsWith(".docx")) {
    errorEl.textContent = "Solo se admiten archivos de Word con extensión .docx";
    errorEl.hidden = false;
    e.target.value = "";
    return;
  }
  statusEl.textContent = "Leyendo el archivo…";
  try {
    const buf = await archivo.arrayBuffer();
    const resultado = await mammoth.extractRawText({ arrayBuffer: buf });
    const texto = (resultado.value || "").trim();
    if (!texto) throw new Error("El archivo no contiene texto legible.");
    document.getElementById(`texto-${tarea.id}`).value = texto;
    statusEl.textContent = "Subiendo el archivo original…";
    const ruta = await subirDocxOriginal(archivo);
    pendientesDocx.set(tarea.id, ruta);
    statusEl.textContent = `Cargado: ${archivo.name}`;
  } catch (err) {
    errorEl.textContent = "No se pudo leer el archivo: " + err.message;
    errorEl.hidden = false;
    statusEl.textContent = "";
  }
}

async function onEnviar(tarea, userId) {
  const textoEl = document.getElementById(`texto-${tarea.id}`);
  const texto = textoEl.value.trim();
  const errorEl = document.getElementById(`error-${tarea.id}`);
  const loadingEl = document.getElementById(`loading-${tarea.id}`);
  const boton = document.getElementById(`enviar-${tarea.id}`);
  errorEl.hidden = true;
  if (!texto) return;

  boton.disabled = true;
  loadingEl.hidden = false;
  try {
    await enviarTarea({ tarea_id: tarea.id, texto, docx_path: pendientesDocx.get(tarea.id) || null });
    pendientesDocx.delete(tarea.id);
    await render(userId);
  } catch (err) {
    errorEl.textContent = "No se pudo obtener la corrección: " + err.message;
    errorEl.hidden = false;
    boton.disabled = false;
    loadingEl.hidden = true;
  }
}
