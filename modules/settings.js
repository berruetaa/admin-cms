import { Modal } from "../components/modal.js";
import { SettingsStore } from "../utils/settings.js";

export const Settings = {
  render(container) {
    const settings = SettingsStore.getAll();

    container.innerHTML = `
      <div class="module-header">
        <h2>Ajustes</h2>
        <div class="header-actions">
          <button id="btn-settings-reset" class="btn btn-outline">Restaurar por defecto</button>
        </div>
      </div>

      <p class="text-muted" style="margin-bottom:1rem;">Estos ajustes son globales para el panel y se guardan en este navegador.</p>

      <div class="dashboard-grid">
        <section class="card">
          <h3>Interfaz</h3>
          <label class="settings-toggle-row">
            <span>
              <strong>Reducir animaciones</strong><br>
              <small class="text-muted">Desactiva transiciones para una UI mas estable.</small>
            </span>
            <input type="checkbox" id="setting-ui-reduced-motion" ${settings.ui?.reducedMotion ? "checked" : ""}>
          </label>

          <label class="settings-toggle-row" style="margin-top:0.8rem;">
            <span>
              <strong>UI compacta</strong><br>
              <small class="text-muted">Reduce paddings y espacios en listados.</small>
            </span>
            <input type="checkbox" id="setting-ui-dense" ${settings.ui?.denseUi ? "checked" : ""}>
          </label>
        </section>

        <section class="card">
          <h3>Academico - Lista de Recursos</h3>
          <label class="settings-toggle-row">
            <span>Vista compacta</span>
            <input type="checkbox" id="setting-acad-compact" ${settings.academico?.resourceList?.compact ? "checked" : ""}>
          </label>
          <label class="settings-toggle-row">
            <span>Mostrar descripcion</span>
            <input type="checkbox" id="setting-acad-desc" ${settings.academico?.resourceList?.showDescription ? "checked" : ""}>
          </label>
          <label class="settings-toggle-row">
            <span>Mostrar tags</span>
            <input type="checkbox" id="setting-acad-tags" ${settings.academico?.resourceList?.showTags ? "checked" : ""}>
          </label>
          <label class="settings-toggle-row">
            <span>Mostrar ID categoria</span>
            <input type="checkbox" id="setting-acad-catid" ${settings.academico?.resourceList?.showCategoryId ? "checked" : ""}>
          </label>
        </section>
      </div>
    `;

    this._bind();
  },

  _bind() {
    const byId = (id) => document.getElementById(id);

    const reducedMotionInput = byId("setting-ui-reduced-motion");
    const denseUiInput = byId("setting-ui-dense");
    const compactInput = byId("setting-acad-compact");
    const descInput = byId("setting-acad-desc");
    const tagsInput = byId("setting-acad-tags");
    const catIdInput = byId("setting-acad-catid");
    const resetButton = byId("btn-settings-reset");

    reducedMotionInput?.addEventListener("change", () => {
      SettingsStore.set("ui.reducedMotion", !!reducedMotionInput.checked);
    });

    denseUiInput?.addEventListener("change", () => {
      SettingsStore.set("ui.denseUi", !!denseUiInput.checked);
    });

    const persistAcademicList = () => {
      SettingsStore.patch({
        academico: {
          resourceList: {
            compact: !!compactInput?.checked,
            showDescription: !!descInput?.checked,
            showTags: !!tagsInput?.checked,
            showCategoryId: !!catIdInput?.checked
          }
        }
      });
    };

    compactInput?.addEventListener("change", persistAcademicList);
    descInput?.addEventListener("change", persistAcademicList);
    tagsInput?.addEventListener("change", persistAcademicList);
    catIdInput?.addEventListener("change", persistAcademicList);

    resetButton?.addEventListener("click", () => {
      Modal.showConfirm("Restaurar todos los ajustes globales a sus valores por defecto?", () => {
        SettingsStore.reset();
        this.render(document.getElementById("main-content"));
      });
    });
  }
};
