import { requireAlumno, getProfile } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import {
  fetchMiAlumno, fetchFases, fetchFasesEstado, fetchEnviosDeAlumno, aceptarPrivacidad,
  actualizarTipoTfm, sugerirTipoTfm,
} from "./api.js";
import { exportarItinerarioWord } from "./exportar-word.js";
import { TIPOS_TFM, tipoDe } from "./tipos-tfm.js";

const auth = await requireAlumno();
if (auth) {
  await mountNav();
  await render(auth.session.user.id);
}

function renderConsentimiento(userId) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="header"><h1>Antes de empezar</h1></div>
    <div class="card">
      <p style="margin-bottom:12px">Para usar el Tutor de TFM necesitamos tu consentimiento: tus textos y tu progreso serán visibles para el/la docente que vincules con tu código, y el texto que escribas se enviará a un proveedor de inteligencia artificial (Anthropic) para generar la corrección. No incluyas datos identificativos de pacientes en tus textos.</p>
      <p style="margin-bottom:16px"><a href="privacidad.html" target="_blank" rel="noopener">Leer la política de privacidad completa ↗</a></p>
      <label style="display:flex;align-items:flex-start;gap:8px;font-size:14px;color:var(--tinta);cursor:pointer">
        <input type="checkbox" id="check-privacidad" style="margin-top:3px" />
        He leído y acepto la Política de Privacidad.
      </label>
      <button id="btn-aceptar" style="margin-top:16px" disabled>Aceptar y continuar</button>
      <p id="error-privacidad" class="error-msg" hidden></p>
    </div>
  `;
  const checkbox = document.getElementById("check-privacidad");
  const boton = document.getElementById("btn-aceptar");
  checkbox.addEventListener("change", () => { boton.disabled = !checkbox.checked; });
  boton.addEventListener("click", async () => {
    const errorEl = document.getElementById("error-privacidad");
    errorEl.hidden = true;
    boton.disabled = true;
    try {
      await aceptarPrivacidad();
      await render(userId);
    } catch (err) {
      errorEl.textContent = "No se pudo guardar tu aceptación: " + err.message;
      errorEl.hidden = false;
      boton.disabled = false;
    }
  });
}

function renderElegirTipo(userId, { cambiando = false } = {}) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="header">
      <h1>${cambiando ? "Cambia tu tipo de TFM" : "¿Qué tipo de TFM vas a realizar?"}</h1>
      <p>La guía y las correcciones de la IA se adaptarán a tu elección. ${cambiando ? "Conservarás todo lo que ya has escrito." : "Podrás cambiarlo más adelante sin perder lo escrito."}</p>
    </div>

    <div class="card card-tinted" style="margin-bottom:16px">
      <div class="eyebrow">¿No sabes cuál elegir?</div>
      <p class="muted" style="margin-bottom:10px">Describe en 2-3 frases lo que vas a hacer y la IA te sugerirá un tipo. Tú decides si la usas.</p>
      <textarea id="descripcion-sugerencia" rows="3" placeholder="Ej.: Quiero analizar por qué se produjo un error de medicación en mi unidad y proponer medidas para evitar que se repita."></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn-secundario btn-small" id="pedir-sugerencia">Sugiéreme un tipo</button>
      </div>
      <div id="loading-sugerencia" class="loading" hidden><span class="loading-dot"></span> Pensando…</div>
      <p id="error-sugerencia" class="error-msg" hidden></p>
      <div id="resultado-sugerencia"></div>
    </div>

    <div class="stack" id="tipos-lista">
      ${TIPOS_TFM.map((t) => `
        <button type="button" class="role-card tipo-card" data-tipo="${t.id}">
          <span class="f-display">${escapeHtml(t.nombre)}</span>
          <span class="muted">${escapeHtml(t.descripcion)}</span>
        </button>
      `).join("")}
    </div>
    <p id="error-tipo" class="error-msg" hidden></p>
    ${cambiando ? `<button class="btn-fantasma btn-small" id="cancelar-cambio" style="margin-top:16px">Cancelar</button>` : ""}
  `;

  document.getElementById("pedir-sugerencia").addEventListener("click", async () => {
    const descripcion = document.getElementById("descripcion-sugerencia").value.trim();
    const errorEl = document.getElementById("error-sugerencia");
    const loadingEl = document.getElementById("loading-sugerencia");
    const boton = document.getElementById("pedir-sugerencia");
    errorEl.hidden = true;
    if (!descripcion) {
      errorEl.textContent = "Escribe antes una breve descripción de tu trabajo.";
      errorEl.hidden = false;
      return;
    }
    boton.disabled = true;
    loadingEl.hidden = false;
    try {
      const s = await sugerirTipoTfm(descripcion);
      mostrarSugerencia(s);
    } catch (err) {
      errorEl.textContent = "No se pudo obtener una sugerencia: " + err.message;
      errorEl.hidden = false;
    } finally {
      boton.disabled = false;
      loadingEl.hidden = true;
    }
  });

  document.querySelectorAll(".tipo-card").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const errorEl = document.getElementById("error-tipo");
      errorEl.hidden = true;
      btn.disabled = true;
      try {
        await actualizarTipoTfm(btn.dataset.tipo);
        await render(userId);
      } catch (err) {
        errorEl.textContent = "No se pudo guardar: " + err.message;
        errorEl.hidden = false;
        btn.disabled = false;
      }
    });
  });

  if (cambiando) {
    document.getElementById("cancelar-cambio").addEventListener("click", () => render(userId));
  }
}

function mostrarSugerencia(s) {
  const tipo = tipoDe(s.tipo_id);
  const el = document.getElementById("resultado-sugerencia");
  el.innerHTML = `
    <div class="card" style="margin-top:12px;border-color:var(--acento)">
      <div class="eyebrow">Sugerencia de la IA</div>
      <p class="f-display" style="margin-bottom:4px">${escapeHtml(tipo ? tipo.nombre : s.tipo_id)}</p>
      <p class="muted">${escapeHtml(s.justificacion)}</p>
    </div>
  `;
  const tarjeta = document.querySelector(`.tipo-card[data-tipo="${s.tipo_id}"]`);
  if (tarjeta) {
    tarjeta.style.borderColor = "var(--acento)";
    tarjeta.style.borderWidth = "2px";
    tarjeta.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

async function render(userId) {
  const content = document.getElementById("content");
  const alumno = await fetchMiAlumno(userId);

  if (!alumno.privacidad_aceptada_at) {
    renderConsentimiento(userId);
    return;
  }

  if (!alumno.tipo_tfm) {
    renderElegirTipo(userId);
    return;
  }

  const [fases, fasesEstado, envios] = await Promise.all([
    fetchFases(),
    fetchFasesEstado(userId),
    fetchEnviosDeAlumno(userId),
  ]);

  const estadoPorFase = {};
  fases.forEach((f) => {
    const marcada = fasesEstado.find((fe) => fe.fase_id === f.id);
    if (marcada?.completada) {
      estadoPorFase[f.id] = "completada";
    } else if (envios.some((e) => e.tareas_config?.fase_id === f.id)) {
      estadoPorFase[f.id] = "en-curso";
    } else {
      estadoPorFase[f.id] = "pendiente";
    }
  });

  const etiquetas = { pendiente: "Pendiente", "en-curso": "En curso", completada: "Completada" };
  const tipo = tipoDe(alumno.tipo_tfm);

  content.innerHTML = `
    <div class="header row-between">
      <div>
        <h1>Tu itinerario</h1>
        <p>Código: ${escapeHtml(alumno.codigo)} · Guárdalo, se lo darás a tu tutor/a académico/a.</p>
        <p class="muted">Tipo de TFM: <strong>${escapeHtml(tipo ? tipo.nombre : alumno.tipo_tfm)}</strong> · <button class="link-button" id="cambiar-tipo">Cambiar tipo de TFM</button></p>
      </div>
      <button class="btn-secundario btn-small" id="exportar">Exportar a Word</button>
    </div>
    <p id="export-error" class="error-msg" hidden></p>
    <ol class="itinerario">
      ${fases.map((f) => `
        <li class="itinerario-item">
          <span class="itinerario-dot ${estadoPorFase[f.id]}"></span>
          <a class="itinerario-link" href="fase.html?fase=${encodeURIComponent(f.id)}">
            <span class="f-display">${escapeHtml(f.titulo)}</span>
            <span class="estado ${estadoPorFase[f.id]}">${etiquetas[estadoPorFase[f.id]]}</span>
          </a>
        </li>
      `).join("")}
    </ol>
  `;

  document.getElementById("cambiar-tipo").addEventListener("click", () => {
    renderElegirTipo(userId, { cambiando: true });
  });

  document.getElementById("exportar").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const errorEl = document.getElementById("export-error");
    errorEl.hidden = true;
    btn.disabled = true;
    try {
      const profile = await getProfile(userId);
      await exportarItinerarioWord(profile.full_name || profile.email, fases, envios);
    } catch (err) {
      errorEl.textContent = "No se pudo exportar: " + err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}
