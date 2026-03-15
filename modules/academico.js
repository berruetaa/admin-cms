import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { Form } from "../components/form.js";

const DATA_PATH = "academico/data.json";
const PDF_DIR = "academico/";

export const Academico = {
  data: { categories: [], resources: [] },
  fileSha: null,

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestión Académica</h2>
        <div class="header-actions">
          <button id="btn-new-category" class="btn btn-secondary">Nueva Categoría</button>
          <button id="btn-new-resource" class="btn btn-primary">Nuevo Recurso</button>
          <button id="btn-upload-pdf" class="btn btn-secondary">Subir PDF</button>
        </div>
      </div>
      <div id="academico-content">
        <div class="loading-spinner"></div> Cargando datos...
      </div>
    `;

    document.getElementById("btn-new-category").addEventListener("click", () => this.showCategoryModal());
    document.getElementById("btn-new-resource").addEventListener("click", () => this.showResourceModal());
    document.getElementById("btn-upload-pdf").addEventListener("click", () => this.showUploadModal());

    await this.loadData();
  },

  async loadData() {
    const contentDiv = document.getElementById("academico-content");

    try {
      const file = await GitHubAPI.getFile(REPOS.site, DATA_PATH);
      this.fileSha = file.sha;
      this.data = JSON.parse(file.decodedContent);

      this.renderContent(contentDiv);
    } catch (error) {
      if (error.message.includes("404")) {
        // File doesn't exist yet, we'll initialize it
        this.data = { categories: [], resources: [] };
        this.renderContent(contentDiv);
      } else {
        contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
      }
    }
  },

  renderContent(container) {
    let html = `
      <h3>Categorías</h3>
      <table class="table">
        <thead><tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr></thead>
        <tbody>
    `;

    this.data.categories.forEach(cat => {
      html += `
        <tr>
          <td>${cat.id}</td>
          <td>${cat.name}</td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary btn-edit-cat" data-id="${cat.id}">Editar</button>
            <button class="btn btn-sm btn-danger btn-delete-cat" data-id="${cat.id}">Borrar</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>
      <h3 style="margin-top: 2rem;">Recursos</h3>
      <table class="table">
        <thead><tr><th>ID</th><th>Título</th><th>Categoría</th><th>Tipo</th><th>Acciones</th></tr></thead>
        <tbody>
    `;

    this.data.resources.forEach(res => {
      html += `
        <tr>
          <td>${res.id}</td>
          <td>${res.title}</td>
          <td>${res.category_id}</td>
          <td>${res.type}</td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary btn-edit-res" data-id="${res.id}">Editar</button>
            <button class="btn btn-sm btn-danger btn-delete-res" data-id="${res.id}">Borrar</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Events
    container.querySelectorAll('.btn-edit-cat').forEach(btn => btn.addEventListener('click', (e) => this.showCategoryModal(e.target.dataset.id)));
    container.querySelectorAll('.btn-delete-cat').forEach(btn => btn.addEventListener('click', (e) => this.deleteCategory(e.target.dataset.id)));

    container.querySelectorAll('.btn-edit-res').forEach(btn => btn.addEventListener('click', (e) => this.showResourceModal(e.target.dataset.id)));
    container.querySelectorAll('.btn-delete-res').forEach(btn => btn.addEventListener('click', (e) => this.deleteResource(e.target.dataset.id)));
  },

  async saveData(message) {
    const loadingModal = Modal.showLoading("Guardando cambios...");
    const content = JSON.stringify(this.data, null, 2);

    try {
      if (this.fileSha) {
        const response = await GitHubAPI.updateFile(REPOS.site, DATA_PATH, content, message, this.fileSha);
        this.fileSha = response.content.sha;
      } else {
        const response = await GitHubAPI.createFile(REPOS.site, DATA_PATH, content, message);
        this.fileSha = response.content.sha;
      }
      Modal.close(loadingModal);
      this.renderContent(document.getElementById("academico-content"));
    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(`Error al guardar: ${error.message}`);
    }
  },

  showCategoryModal(id = null) {
    const isEdit = !!id;
    const cat = isEdit ? this.data.categories.find(c => c.id === id) : null;

    const overlay = Modal.create(
      isEdit ? "Editar Categoría" : "Nueva Categoría",
      `
        <form id="cat-form">
          ${Form.renderField({ id: "id", label: "ID (slug)", value: isEdit ? cat.id : '', required: true, type: "text" })}
          ${Form.renderField({ id: "name", label: "Nombre", value: isEdit ? cat.name : '', required: true, type: "text" })}
        </form>
      `,
      `
        <button class="btn btn-secondary" id="cat-cancel">Cancelar</button>
        <button class="btn btn-primary" id="cat-save">Guardar</button>
      `
    );

    overlay.querySelector("#cat-cancel").addEventListener("click", () => Modal.close(overlay));
    overlay.querySelector("#cat-save").addEventListener("click", () => {
      const form = overlay.querySelector("#cat-form");
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const formData = Form.getFormData(form, [{id: "id", type: "text"}, {id: "name", type: "text"}]);

      if (isEdit) {
        const index = this.data.categories.findIndex(c => c.id === id);
        this.data.categories[index] = formData;
      } else {
        this.data.categories.push(formData);
      }

      Modal.close(overlay);
      this.saveData(isEdit ? `Update category ${id}` : `Create category ${formData.id}`);
    });
  },

  deleteCategory(id) {
    Modal.showConfirm(`¿Eliminar la categoría ${id}?`, () => {
      this.data.categories = this.data.categories.filter(c => c.id !== id);
      this.saveData(`Delete category ${id}`);
    });
  },

  showResourceModal(id = null) {
    const isEdit = !!id;
    const res = isEdit ? this.data.resources.find(r => r.id === id) : null;

    const catOptions = this.data.categories.map(c => ({ value: c.id, label: c.name }));
    const typeOptions = [
      { value: "pdf", label: "PDF" },
      { value: "link", label: "Enlace Externo" }
    ];

    const overlay = Modal.create(
      isEdit ? "Editar Recurso" : "Nuevo Recurso",
      `
        <form id="res-form">
          ${Form.renderField({ id: "id", label: "ID (slug)", value: isEdit ? res.id : '', required: true, type: "text" })}
          ${Form.renderField({ id: "title", label: "Título", value: isEdit ? res.title : '', required: true, type: "text" })}
          ${Form.renderField({ id: "category_id", label: "Categoría", value: isEdit ? res.category_id : (catOptions.length > 0 ? catOptions[0].value : ''), required: true, type: "select", options: catOptions })}
          ${Form.renderField({ id: "type", label: "Tipo", value: isEdit ? res.type : 'pdf', required: true, type: "select", options: typeOptions })}
          ${Form.renderField({ id: "url", label: "URL o Ruta del Archivo", value: isEdit ? res.url : '', required: true, type: "text" })}
          ${Form.renderField({ id: "description", label: "Descripción", value: isEdit ? res.description : '', type: "textarea", rows: 3 })}
        </form>
      `,
      `
        <button class="btn btn-secondary" id="res-cancel">Cancelar</button>
        <button class="btn btn-primary" id="res-save">Guardar</button>
      `
    );

    overlay.querySelector("#res-cancel").addEventListener("click", () => Modal.close(overlay));
    overlay.querySelector("#res-save").addEventListener("click", () => {
      const form = overlay.querySelector("#res-form");
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const formData = Form.getFormData(form, [
        {id: "id", type: "text"}, {id: "title", type: "text"},
        {id: "category_id", type: "text"}, {id: "type", type: "text"},
        {id: "url", type: "text"}, {id: "description", type: "text"}
      ]);

      if (isEdit) {
        const index = this.data.resources.findIndex(r => r.id === id);
        this.data.resources[index] = formData;
      } else {
        this.data.resources.push(formData);
      }

      Modal.close(overlay);
      this.saveData(isEdit ? `Update resource ${id}` : `Create resource ${formData.id}`);
    });
  },

  deleteResource(id) {
    Modal.showConfirm(`¿Eliminar el recurso ${id}?`, () => {
      this.data.resources = this.data.resources.filter(r => r.id !== id);
      this.saveData(`Delete resource ${id}`);
    });
  },

  showUploadModal() {
    const overlay = Modal.create(
      "Subir PDF",
      `
        <form id="upload-form">
          ${Form.renderField({ id: "file", label: "Archivo PDF", required: true, type: "file", accept: ".pdf" })}
          ${Form.renderField({ id: "filename", label: "Nombre de archivo (opcional)", type: "text" })}
        </form>
      `,
      `
        <button class="btn btn-secondary" id="upload-cancel">Cancelar</button>
        <button class="btn btn-primary" id="upload-save">Subir</button>
      `
    );

    overlay.querySelector("#upload-cancel").addEventListener("click", () => Modal.close(overlay));

    overlay.querySelector("#upload-save").addEventListener("click", async () => {
      const form = overlay.querySelector("#upload-form");
      const fileInput = form.querySelector("#file");

      if (fileInput.files.length === 0) {
        alert("Debe seleccionar un archivo");
        return;
      }

      const file = fileInput.files[0];
      const customName = form.querySelector("#filename").value.trim();
      const filename = customName || file.name;
      const path = `${PDF_DIR}${filename}`;

      const loadingModal = Modal.showLoading(`Subiendo ${filename}...`);
      Modal.close(overlay);

      try {
        const { Base64 } = await import("../utils/base64.js");
        const base64Content = await Base64.encodeFile(file);

        await GitHubAPI.createFile(REPOS.site, path, base64Content, `Upload PDF: ${filename}`);

        Modal.close(loadingModal);
        Modal.showError("Archivo subido correctamente. Ahora puede crear un recurso para él."); // using showError as alert for simplicity
      } catch (error) {
        Modal.close(loadingModal);
        Modal.showError(`Error al subir: ${error.message}`);
      }
    });
  }
};
