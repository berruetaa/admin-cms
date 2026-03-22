import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { Form } from "../components/form.js";

const FILE_NAME = "tools.json";

export const Tools = {
  data: [],

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestión de Herramientas</h2>
        <div class="header-actions">
          <button id="btn-export-tools" class="btn btn-outline">Exportar JSON</button>
          <button id="btn-import-tools" class="btn btn-outline">Importar JSON</button>
          <button id="btn-new-tool" class="btn btn-primary">Nueva Herramienta</button>
        </div>
      </div>
      <div id="tools-content">
        <div class="loading-spinner"></div> Cargando herramientas...
      </div>
    `;

    document.getElementById("btn-new-tool").addEventListener("click", () => this.showToolModal());
    document.getElementById("btn-export-tools").addEventListener("click", () => this.exportData());
    document.getElementById("btn-import-tools").addEventListener("click", () => this.importData());

    await this.loadData();
  },

  async loadData() {
    const contentDiv = document.getElementById("tools-content");

    try {
      if (REPOS.gists.academico === "YOUR_GIST_ID_HERE") {
        contentDiv.innerHTML = `<div class="alert alert-info">Configure el GIST ID en config/repos.js para cargar los datos.</div>`;
        return;
      }

      const gist = await GitHubAPI.getGist(REPOS.gists.academico);
      const file = gist.files[FILE_NAME];

      if (!file) {
        // Initialize empty if it doesn't exist yet but gist exists
        this.data = [];
      } else {
        this.data = JSON.parse(file.content);
      }

      this.renderContent(contentDiv);
    } catch (error) {
      contentDiv.innerHTML = `<div class="alert alert-danger">Error al cargar del Gist: ${error.message}</div>`;
    }
  },

  renderContent(container) {
    if (this.data.length === 0) {
      container.innerHTML = "<p>No hay herramientas configuradas en el Gist.</p>";
      return;
    }

    let html = `<table class="table">
      <thead>
        <tr>
          <th>Orden</th>
          <th>Nombre</th>
          <th>Enlace</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
    `;

    this.data.forEach((tool, index) => {
      const isFirst = index === 0;
      const isLast = index === this.data.length - 1;
      html += `
        <tr>
          <td class="actions" style="white-space:nowrap; width: 80px;">
            <button class="btn btn-sm btn-outline btn-move-up" data-index="${index}" ${isFirst ? 'disabled' : ''} title="Subir">▲</button>
            <button class="btn btn-sm btn-outline btn-move-down" data-index="${index}" ${isLast ? 'disabled' : ''} title="Bajar">▼</button>
          </td>
          <td>${tool.name}</td>
          <td><a href="${tool.url}" target="_blank">${tool.url}</a></td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary btn-edit-tool" data-index="${index}">Editar</button>
            <button class="btn btn-sm btn-warning btn-duplicate-tool" data-index="${index}">Duplicar</button>
            <button class="btn btn-sm btn-danger btn-delete-tool" data-index="${index}">Borrar</button>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    container.querySelectorAll('.btn-edit-tool').forEach(btn => btn.addEventListener('click', (e) => this.showToolModal(e.target.dataset.index)));
    container.querySelectorAll('.btn-duplicate-tool').forEach(btn => btn.addEventListener('click', (e) => this.duplicateTool(e.target.dataset.index)));
    container.querySelectorAll('.btn-delete-tool').forEach(btn => btn.addEventListener('click', (e) => this.deleteTool(e.target.dataset.index)));
    container.querySelectorAll('.btn-move-up').forEach(btn => btn.addEventListener('click', (e) => this.moveTool(e.target.dataset.index, -1)));
    container.querySelectorAll('.btn-move-down').forEach(btn => btn.addEventListener('click', (e) => this.moveTool(e.target.dataset.index, 1)));
  },

  moveTool(index, direction) {
    const i = parseInt(index);
    if (i + direction < 0 || i + direction >= this.data.length) return;
    const temp = this.data[i];
    this.data[i] = this.data[i + direction];
    this.data[i + direction] = temp;
    this.saveData();
  },

  async saveData() {
    const loadingModal = Modal.showLoading("Guardando cambios en Gist...");
    const content = JSON.stringify(this.data, null, 2);

    try {
      await GitHubAPI.updateGist(REPOS.gists.academico, {
        [FILE_NAME]: { content }
      });
      Modal.close(loadingModal);
      this.renderContent(document.getElementById("tools-content"));
    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(`Error al guardar: ${error.message}`);
    }
  },

  showToolModal(index = null) {
    const isEdit = index !== null;
    const tool = isEdit ? this.data[index] : { id: '', name: '', url: '', description: '', icon: '' };

    const overlay = Modal.create(
      isEdit ? "Editar Herramienta" : "Nueva Herramienta",
      `
        <form id="tool-form">
          ${Form.renderField({ id: "id", label: "ID (interno)", value: tool.id, required: true, type: "text" })}
          ${Form.renderField({ id: "name", label: "Nombre", value: tool.name, required: true, type: "text" })}
          ${Form.renderField({ id: "url", label: "URL", value: tool.url, required: true, type: "text" })}
          ${Form.renderField({ id: "description", label: "Descripción", value: tool.description, type: "textarea", rows: 3 })}
          ${Form.renderField({ id: "icon", label: "Icono (emoji o texto opcional)", value: tool.icon || '', type: "text" })}
        </form>
      `,
      `
        <button class="btn btn-secondary" id="tool-cancel">Cancelar</button>
        <button class="btn btn-primary" id="tool-save">Guardar</button>
      `
    );

    overlay.querySelector("#tool-cancel").addEventListener("click", () => Modal.close(overlay));
    overlay.querySelector("#tool-save").addEventListener("click", () => {
      const form = overlay.querySelector("#tool-form");
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const formData = Form.getFormData(form, [
        {id: "id", type: "text"}, {id: "name", type: "text"},
        {id: "url", type: "text"}, {id: "description", type: "textarea"},
        {id: "icon", type: "text"}
      ]);

      if (isEdit) {
        this.data[index] = formData;
      } else {
        this.data.push(formData);
      }

      Modal.close(overlay);
      this.saveData();
    });
  },

  deleteTool(index) {
    const tool = this.data[index];
    Modal.showConfirm(`¿Eliminar la herramienta ${tool.name}?`, () => {
      this.data.splice(index, 1);
      this.saveData();
    });
  },

  duplicateTool(index) {
    const tool = this.data[index];
    const copy = { ...tool, id: tool.id + '-copia', name: tool.name + ' (copia)' };
    this.data.splice(Number(index) + 1, 0, copy);
    this.saveData();
  },

  exportData() {
    const json = JSON.stringify(this.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tools.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un array de herramientas.');
        Modal.showConfirm(`¿Reemplazar las ${this.data.length} herramientas actuales con las ${parsed.length} del archivo?`, async () => {
          this.data = parsed;
          await this.saveData();
        });
      } catch (err) {
        Modal.showError(`JSON inválido: ${err.message}`);
      }
    };
    input.click();
  }
};
