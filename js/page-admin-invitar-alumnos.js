import { requireAdmin } from "./auth.js";
import { mountNav } from "./nav.js";
import { escapeHtml } from "./escape.js";
import { invitarAlumno } from "./api.js";

const auth = await requireAdmin();
if (auth) {
  await mountNav();
}

// ---- Invitación individual ----

const form = document.getElementById("invite-form");
const errorEl = document.getElementById("error");
const successEl = document.getElementById("success");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  successEl.hidden = true;
  submitBtn.disabled = true;
  try {
    await invitarAlumno({
      email: document.getElementById("email").value.trim(),
      full_name: document.getElementById("full_name").value.trim() || null,
    });
    successEl.textContent = "Invitación enviada.";
    successEl.hidden = false;
    form.reset();
  } catch (err) {
    errorEl.textContent = "No se pudo invitar: " + err.message;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Invitación en bloque desde Excel ----

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let filasValidas = []; // { nombre, email }

function detectarColumnas(filas) {
  if (!filas.length) return { colNombre: null, colEmail: null };
  const claves = Object.keys(filas[0]);
  const colNombre = claves.find((k) => /nombre|name/i.test(k));
  const colEmail = claves.find((k) => /email|correo|mail/i.test(k));
  return { colNombre, colEmail };
}

document.getElementById("excel-file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  const excelError = document.getElementById("excel-error");
  const preview = document.getElementById("excel-preview");
  const actions = document.getElementById("excel-actions");
  const resultados = document.getElementById("excel-resultados");
  excelError.hidden = true;
  preview.innerHTML = "";
  resultados.innerHTML = "";
  actions.hidden = true;
  filasValidas = [];
  if (!file) return;

  try {
    const XLSX = await import("https://esm.sh/xlsx@0.18.5?bundle");
    const buf = await file.arrayBuffer();
    const libro = XLSX.read(buf, { type: "array" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    const { colNombre, colEmail } = detectarColumnas(filas);
    if (!colEmail) {
      excelError.textContent = "No he encontrado ninguna columna de email en el archivo. Revisa que la cabecera contenga la palabra \"email\" o \"correo\".";
      excelError.hidden = false;
      return;
    }

    const omitidas = [];
    filas.forEach((fila, i) => {
      const email = String(fila[colEmail] ?? "").trim();
      const nombre = colNombre ? String(fila[colNombre] ?? "").trim() : "";
      if (!email) return; // fila en blanco, se ignora sin más
      if (!EMAIL_RE.test(email)) {
        omitidas.push({ fila: i + 2, email });
        return;
      }
      filasValidas.push({ nombre, email });
    });

    preview.innerHTML = `
      <p class="muted">${filasValidas.length} ${filasValidas.length === 1 ? "fila válida" : "filas válidas"} para invitar${omitidas.length ? ` · ${omitidas.length} omitida(s) por email no válido` : ""}.</p>
      <table>
        <thead><tr><th>Nombre</th><th>Email</th></tr></thead>
        <tbody>
          ${filasValidas.map((f) => `<tr><td>${escapeHtml(f.nombre || "—")}</td><td>${escapeHtml(f.email)}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
    if (filasValidas.length > 0) actions.hidden = false;
  } catch (err) {
    excelError.textContent = "No se pudo leer el archivo: " + err.message;
    excelError.hidden = false;
  }
});

document.getElementById("excel-enviar").addEventListener("click", async () => {
  const boton = document.getElementById("excel-enviar");
  const resultados = document.getElementById("excel-resultados");
  boton.disabled = true;
  const filas = [];
  for (const f of filasValidas) {
    let estado;
    try {
      await invitarAlumno({ email: f.email, full_name: f.nombre || null });
      estado = { ok: true };
    } catch (err) {
      estado = { ok: false, mensaje: err.message };
    }
    filas.push({ ...f, ...estado });
    resultados.innerHTML = `
      <table>
        <thead><tr><th>Email</th><th>Resultado</th></tr></thead>
        <tbody>
          ${filas.map((f) => `
            <tr>
              <td>${escapeHtml(f.email)}</td>
              <td style="color:${f.ok ? "var(--acento-oscuro)" : "var(--rojo)"}">${f.ok ? "✔ Invitado" : "✘ " + escapeHtml(f.mensaje)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
  boton.disabled = false;
  boton.textContent = "Enviar invitaciones (terminado)";
});
