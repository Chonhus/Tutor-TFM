// Escapa HTML antes de insertar texto dinámico con innerHTML. Necesario para
// cualquier contenido que provenga, directa o indirectamente, de un alumno
// (su propio nombre, el texto que escribe, o el feedback de la IA que puede
// citar literalmente ese texto).
export function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
