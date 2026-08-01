import { requireAdmin } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import {
  fetchInstruccionesIA, fetchFases, actualizarInstruccionesIA, actualizarFase, actualizarTarea, subirAudioFase,
} from "./api.js";

const auth = await requireAdmin();
if (auth) {
  await mountNav();
  await render();
}

// Copia local editable: los cambios de los inputs se acumulan aquí y solo
// se escriben en Supabase al pulsar "Guardar cambios".
const pendientesAudio = new Map(); // fase_id -> File

async function render() {
  const content = document.getElementById("content");
  const [instrucciones, fases] = await Promise.all([fetchInstruccionesIA(), fetchFases()]);

  content.innerHTML = `
    <div class="header row-between">
      <div>
        <h1>Panel de administración</h1>
        <p>Edita los contenidos y pulsa «Guardar cambios» al terminar.</p>
      </div>
      <div class="row">
        <a class="btn-secundario btn-small" href="alumnos.html">Alumnos</a>
        <a class="btn-secundario btn-small" href="invitar-alumnos.html">Invitar alumnos</a>
        <a class="btn-secundario btn-small" href="invite-docente.html">Invitar docente</a>
      </div>
    </div>

    <div class="card">
      <h3 class="f-display" style="font-size:16px;margin-bottom:8px">Instrucciones del tutor IA</h3>
      <textarea id="instrucciones" rows="8">${escapeHtml(instrucciones)}</textarea>
    </div>

    <div id="fases"></div>

    <div style="margin:20px 0 60px" class="row">
      <button id="guardar">Guardar cambios</button>
      <span id="guardado" class="success-msg" hidden>Cambios guardados ✓</span>
    </div>
    <p id="error" class="error-msg" hidden></p>
  `;

  const fasesEl = document.getElementById("fases");
  fases.forEach((fase) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginTop = "16px";
    card.dataset.faseId = fase.id;
    card.innerHTML = `
      <h3 class="f-display" style="font-size:16px;margin-bottom:10px">${escapeHtml(fase.titulo)}</h3>
      <label>Título</label>
      <input type="text" class="fase-titulo" value="${escapeHtml(fase.titulo)}" />
      <label style="margin-top:10px">Texto explicativo</label>
      <textarea class="fase-explicacion" rows="6">${escapeHtml(fase.explicacion)}</textarea>
      <label style="margin-top:10px">Audio explicativo (${fase.audio_path ? "ya hay uno subido" : "sin audio"})</label>
      <input type="file" class="fase-audio" accept="audio/*" />
      <div class="tareas-admin" style="margin-top:12px"></div>
    `;
    const tareasEl = card.querySelector(".tareas-admin");
    (fase.tareas_config || []).forEach((tarea) => {
      const div = document.createElement("div");
      div.style.marginTop = "10px";
      div.dataset.tareaId = tarea.id;
      div.innerHTML = `
        <label>Título de la tarea</label>
        <input type="text" class="tarea-titulo" value="${escapeHtml(tarea.titulo)}" />
        <label style="margin-top:6px">Instrucción</label>
        <textarea class="tarea-instruccion" rows="2">${escapeHtml(tarea.instruccion)}</textarea>
      `;
      tareasEl.appendChild(div);
    });
    card.querySelector(".fase-audio").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) pendientesAudio.set(fase.id, file);
    });
    fasesEl.appendChild(card);
  });

  document.getElementById("guardar").addEventListener("click", guardarTodo);
}

async function guardarTodo() {
  const errorEl = document.getElementById("error");
  const guardadoEl = document.getElementById("guardado");
  errorEl.hidden = true;
  guardadoEl.hidden = true;
  const boton = document.getElementById("guardar");
  boton.disabled = true;

  try {
    await actualizarInstruccionesIA(document.getElementById("instrucciones").value);

    for (const card of document.querySelectorAll("#fases > div")) {
      const faseId = card.dataset.faseId;
      await actualizarFase(faseId, {
        titulo: card.querySelector(".fase-titulo").value,
        explicacion: card.querySelector(".fase-explicacion").value,
      });
      const audioFile = pendientesAudio.get(faseId);
      if (audioFile) {
        await subirAudioFase(faseId, audioFile);
        pendientesAudio.delete(faseId);
      }
      for (const tareaDiv of card.querySelectorAll(".tareas-admin > div")) {
        await actualizarTarea(tareaDiv.dataset.tareaId, {
          titulo: tareaDiv.querySelector(".tarea-titulo").value,
          instruccion: tareaDiv.querySelector(".tarea-instruccion").value,
        });
      }
    }

    guardadoEl.hidden = false;
    setTimeout(() => { guardadoEl.hidden = true; }, 2500);
  } catch (err) {
    errorEl.textContent = "No se pudo guardar: " + err.message;
    errorEl.hidden = false;
  } finally {
    boton.disabled = false;
  }
}
