import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { Form } from "../components/form.js";

const TOOLS_PATH = "data/tools.json";

export const Tools = {
  data: [],
  fileSha: null,

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
      const file = await GitHubAPI.getFile(REPOS.site, TOOLS_PATH);
      this.fileSha = file.sha;
      this.data = JSON.parse(file.decodedContent);

      this.renderContent(contentDiv);
    } catch (error) {
      if (error.message.includes("404")) {
        // Initialize empty array if file doesn't exist
        this.data = [];
        this.renderContent(contentDiv);
      } else {
        contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
      }
    }
  },

  renderContent(container) {
    if (this.data.length === 0) {
      container.innerHTML = "<p>No hay herramientas configuradas.</p>";
      return;
    }

    let html = `<table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Enlace</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
    `;

    this.data.forEach((tool, index) => {
      html += `
        <tr>
          <td>${tool.id || index}</td>
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
  },

  async saveData(message) {
    const loadingModal = Modal.showLoading("Guardando cambios...");
    const content = JSON.stringify(this.data, null, 2);

    try {
      if (this.fileSha) {
        const response = await GitHubAPI.updateFile(REPOS.site, TOOLS_PATH, content, message, this.fileSha);
        this.fileSha = response.content.sha;
      } else {
        const response = await GitHubAPI.createFile(REPOS.site, TOOLS_PATH, content, message);
        this.fileSha = response.content.sha;
      }
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
          ${Form.renderField({ id: "id", label: "ID", value: tool.id, required: true, type: "text" })}
          ${Form.renderField({ id: "name", label: "Nombre", value: tool.name, required: true, type: "text" })}
          ${Form.renderField({ id: "url", label: "URL", value: tool.url, required: true, type: "text" })}
          ${Form.renderField({ id: "description", label: "Descripción", value: tool.description, type: "textarea", rows: 3 })}
          ${Form.renderField({ id: "icon", label: "Icono (clase CSS o emoji)", value: tool.icon, type: "text" })}
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
      this.saveData(isEdit ? `Update tool: ${formData.id}` : `Add tool: ${formData.id}`);
    });
  },

  deleteTool(index) {
    const tool = this.data[index];
    Modal.showConfirm(`¿Eliminar la herramienta ${tool.name}?`, () => {
      this.data.splice(index, 1);
      this.saveData(`Delete tool: ${tool.name}`);
    });
  },

  duplicateTool(index) {
    const tool = this.data[index];
    const copy = { ...tool, id: tool.id + '-copia', name: tool.name + ' (copia)' };
    this.data.splice(Number(index) + 1, 0, copy);
    this.saveData(`Duplicate tool: ${tool.name}`);
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
          await this.saveData('Import tools.json from local backup');
        });
      } catch (err) {
        Modal.showError(`JSON inválido: ${err.message}`);
      }
    };
    input.click();
  }
};
