import { requireAdmin } from "./auth.js";
import { mountNav } from "./nav.js";
import { invitarDocente } from "./api.js";

const auth = await requireAdmin();
if (auth) {
  await mountNav();

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
      await invitarDocente({
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
}
