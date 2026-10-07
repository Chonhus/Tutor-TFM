import { requireAlumno, getProfile } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import {
  fetchMiAlumno, fetchFases, fetchFasesEstado, fetchEnviosDeAlumno, aceptarPrivacidad, actualizarTipoTfm,
} from "./api.js";
import { TIPOS_TFM, itinerarioDeTipo } from "./tipos-tfm.js";
import { exportarItinerarioWord } from "./exportar-word.js";

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

async function render(userId) {
  const content = document.getElementById("content");
  const alumno = await fetchMiAlumno(userId);

  if (!alumno.privacidad_aceptada_at) {
    renderConsentimiento(userId);
    return;
  }

  const itinerario = itinerarioDeTipo(alumno.tipo_tfm);
  const [fases, fasesEstado, envios] = await Promise.all([
    fetchFases(itinerario),
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

  content.innerHTML = `
    <div class="header row-between">
      <div>
        <h1>Tu itinerario</h1>
        <p>Código: ${escapeHtml(alumno.codigo)} · Guárdalo, se lo darás a tu tutor/a académico/a.</p>
      </div>
      <button class="btn-secundario btn-small" id="exportar">Exportar a Word</button>
    </div>
    <p id="export-error" class="error-msg" hidden></p>
    <div class="card" style="margin-bottom:16px">
      <label for="tipo-tfm">Tipo de TFM</label>
      <select id="tipo-tfm" style="max-width:380px">
        <option value="">Sin indicar</option>
        ${TIPOS_TFM.map((t) => `<option value="${t.id}" ${alumno.tipo_tfm === t.id ? "selected" : ""}>${escapeHtml(t.nombre)}</option>`).join("")}
      </select>
      <p class="muted" id="tipo-tfm-desc" style="margin-top:8px"></p>
      <p class="muted" style="margin-top:4px;font-size:12px">El tutor IA adapta sus correcciones a este tipo. Si dudas, consúltalo con tu tutor/a académico/a; puedes cambiarlo cuando quieras.</p>
      <p id="tipo-tfm-error" class="error-msg" hidden></p>
    </div>
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

  const selectTipo = document.getElementById("tipo-tfm");
  const descTipo = document.getElementById("tipo-tfm-desc");
  const pintarDescripcion = () => {
    descTipo.textContent = TIPOS_TFM.find((t) => t.id === selectTipo.value)?.descripcion
      ?? "Indica qué tipo de trabajo estás haciendo para que la corrección se ajuste a él.";
  };
  pintarDescripcion();
  let tipoGuardado = selectTipo.value;
  selectTipo.addEventListener("change", async () => {
    const errorEl = document.getElementById("tipo-tfm-error");
    errorEl.hidden = true;
    // Pasar a (o salir de) la memoria de gestión cambia las fases del
    // itinerario. Lo ya escrito no se borra (los envíos siguen ligados a
    // sus tareas) y reaparece si se vuelve al tipo anterior.
    const cambiaItinerario = itinerarioDeTipo(selectTipo.value) !== itinerario;
    if (cambiaItinerario && !window.confirm(
      "Este cambio sustituye las fases de tu itinerario por las de otro tipo de trabajo. "
      + "Lo que ya hayas escrito no se borra y volverá a aparecer si vuelves a elegir el tipo anterior. ¿Continuar?",
    )) {
      selectTipo.value = tipoGuardado;
      return;
    }
    pintarDescripcion();
    selectTipo.disabled = true;
    try {
      await actualizarTipoTfm(selectTipo.value);
      tipoGuardado = selectTipo.value;
      if (cambiaItinerario) {
        await render(userId);
        return;
      }
    } catch (err) {
      selectTipo.value = tipoGuardado;
      pintarDescripcion();
      errorEl.textContent = "No se pudo guardar el tipo de TFM: " + err.message;
      errorEl.hidden = false;
    } finally {
      selectTipo.disabled = false;
    }
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
