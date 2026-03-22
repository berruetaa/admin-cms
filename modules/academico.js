import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { Form } from "../components/form.js";
import { Validators } from "../utils/validators.js";
import { SearchDataStore } from "../components/navbar.js";
import { Sitemap } from "../utils/sitemap.js";

const DATA_PATH = "academico/data.json";

export const Academico = {
  data: { categories: [], resources: [] },
  fileSha: null,
  filters: { query: '', category: 'all', group: 'all', subgroup: 'all', type: 'all' },
  selectedIndices: new Set(),

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestión Académica</h2>
        <div class="header-actions">
          <button id="btn-export-acad" class="btn btn-outline">Exportar JSON</button>
          <button id="btn-import-acad" class="btn btn-outline">Importar JSON</button>
          <button id="btn-new-category" class="btn btn-secondary">Nueva Categoría</button>
          <button id="btn-new-resource" class="btn btn-primary">Nuevo Recurso</button>
        </div>
      </div>
      <div id="academico-content">
        <div class="loading-spinner"></div> Cargando datos...
      </div>
    `;

    document.getElementById("btn-new-category").addEventListener("click", () => this.showCategoryModal());
    document.getElementById("btn-new-resource").addEventListener("click", () => this.showResourceModal());
    document.getElementById("btn-export-acad").addEventListener("click", () => this.exportData());
    document.getElementById("btn-import-acad").addEventListener("click", () => this.importData());

    await this.loadData();
  },

  async loadData() {
    const contentDiv = document.getElementById("academico-content");

    try {
      if (REPOS.gists.academico === "YOUR_GIST_ID_HERE") {
        contentDiv.innerHTML = `<div class="alert alert-info">Configure el GIST ID en config/repos.js para cargar los datos.</div>`;
        return;
      }

      const gist = await GitHubAPI.getGist(REPOS.gists.academico);
      const file = gist.files["data.json"];

      if (!file) throw new Error("data.json no encontrado en el Gist");

      this.data = JSON.parse(file.content);
      // Feed search store
      SearchDataStore.academico = this.data;
      this.renderContent(contentDiv);
    } catch (error) {
      contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  renderContent(container) {
    container.innerHTML = `
      <section id="categories-section"></section>
      <section id="resources-section" style="margin-top: 3rem;"></section>
    `;

    this.renderCategoriesTable();
    this.renderResourcesSection();
  },

  renderCategoriesTable() {
    const section = document.getElementById('categories-section');
    if (!section) return;

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

    html += `</tbody></table>`;
    section.innerHTML = html;

    section.querySelectorAll('.btn-edit-cat').forEach(btn => btn.addEventListener('click', (e) => this.showCategoryModal(e.target.dataset.id)));
    section.querySelectorAll('.btn-delete-cat').forEach(btn => btn.addEventListener('click', (e) => this.deleteCategory(e.target.dataset.id)));
  },

  renderResourcesSection() {
    const section = document.getElementById('resources-section');
    if (!section) return;

    section.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items: baseline; margin-bottom:1rem;">
        <h3>Recursos</h3>
        <span class="text-muted" id="resource-count" style="font-size:0.85rem;"></span>
      </div>

      <!-- Barra de Filtros -->
      <div class="filter-bar card" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; padding:0.75rem; flex-wrap:wrap; font-size:0.85rem; background: var(--color-muted);">
        <div style="flex:2.5; min-width:180px;">
          <input type="text" id="filter-query" class="form-control" style="padding: 0.5rem;" placeholder="🔍 Buscar recurso..." value="${this.filters.query}">
        </div>
        <div style="flex:1; min-width:120px;">
          <select id="filter-category" class="form-control" style="padding: 0.5rem;">
            <option value="all">Categoría (Todos)</option>
            ${this.data.categories.map(c => `<option value="${c.id}" ${this.filters.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1; min-width:120px;">
          <select id="filter-group" class="form-control" style="padding: 0.5rem;">
            <option value="all">Grupo (Todos)</option>
            ${[...new Set(this.data.resources.map(r => r.group).filter(Boolean))].sort().map(g => `<option value="${g}" ${this.filters.group === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1; min-width:120px;">
          <select id="filter-subgroup" class="form-control" style="padding: 0.5rem;">
            <option value="all">Sub (Todos)</option>
            ${[...new Set(this.data.resources.map(r => r.subgroup).filter(Boolean))].sort().map(s => `<option value="${s}" ${this.filters.subgroup === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div style="flex:0.8; min-width:100px;">
          <select id="filter-type" class="form-control" style="padding: 0.5rem;">
            <option value="all">Tipo</option>
            <option value="link" ${this.filters.type === 'link' ? 'selected' : ''}>Link</option>
            <option value="pdf" ${this.filters.type === 'pdf' ? 'selected' : ''}>PDF</option>
            <option value="texto" ${this.filters.type === 'texto' ? 'selected' : ''}>Txt</option>
          </select>
        </div>
      </div>

      <!-- Barra de Acciones Masivas -->
      <div id="bulk-action-bar" class="card" style="display:none; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding:0.75rem 1rem; background: var(--color-accent); color: white;">
        <span id="bulk-count" style="font-weight: 500;">0 seleccionados</span>
        <div>
          <button id="btn-bulk-edit" class="btn btn-sm btn-outline" style="color:white; border-color:white; margin-right: 0.5rem;">✏️ Editar Lote</button>
          <button id="btn-bulk-delete" class="btn btn-sm btn-danger" style="background: white; color: var(--color-error); border-color: white;">🗑️ Borrar Lote</button>
        </div>
      </div>

      <div id="resources-table-container"></div>
    `;

    // Eventos de filtros
    const qInput = document.getElementById('filter-query');
    const cInput = document.getElementById('filter-category');
    const gInput = document.getElementById('filter-group');
    const sInput = document.getElementById('filter-subgroup');
    const tInput = document.getElementById('filter-type');

    qInput.addEventListener('input', (e) => {
      this.filters.query = e.target.value.toLowerCase();
      this.renderResourcesTable();
    });
    cInput.addEventListener('change', (e) => {
      this.filters.category = e.target.value;
      this.renderResourcesTable();
    });
    gInput.addEventListener('change', (e) => {
      this.filters.group = e.target.value;
      this.renderResourcesTable();
    });
    sInput.addEventListener('change', (e) => {
      this.filters.subgroup = e.target.value;
      this.renderResourcesTable();
    });
    tInput.addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.renderResourcesTable();
    });

    this.renderResourcesTable();

    // Eventos de Bulk Actions
    document.getElementById('btn-bulk-edit').addEventListener('click', () => this.showBulkEditModal());
    document.getElementById('btn-bulk-delete').addEventListener('click', () => this.deleteBulkSelected());
  },

  _updateBulkBar() {
    const bar = document.getElementById('bulk-action-bar');
    const countLabel = document.getElementById('bulk-count');
    if (!bar || !countLabel) return;

    if (this.selectedIndices.size > 0) {
      bar.style.display = 'flex';
      countLabel.textContent = `${this.selectedIndices.size} recurso(s) seleccionado(s)`;
    } else {
      bar.style.display = 'none';
    }
  },

  renderResourcesTable() {
    const container = document.getElementById('resources-table-container');
    const countSpan = document.getElementById('resource-count');
    if (!container) return;

    // Aplicar filtros
    const filtered = this.data.resources.filter(res => {
      const matchQuery = !this.filters.query ||
        res.title.toLowerCase().includes(this.filters.query) ||
        res.description.toLowerCase().includes(this.filters.query) ||
        (res.tags && res.tags.join(' ').toLowerCase().includes(this.filters.query));

      const matchCat = this.filters.category === 'all' || res.category === this.filters.category;
      const matchGroup = this.filters.group === 'all' || res.group === this.filters.group;
      const matchSub = this.filters.subgroup === 'all' || res.subgroup === this.filters.subgroup;
      const matchType = this.filters.type === 'all' || res.type === this.filters.type;

      return matchQuery && matchCat && matchGroup && matchSub && matchType;
    });

    if (countSpan) countSpan.textContent = `Mostrando ${filtered.length} de ${this.data.resources.length} recursos`;

    if (filtered.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:#888;">No se encontraron recursos con estos filtros.</div>`;
      return;
    }

    let html = `
      <table class="table">
        <thead>
          <tr>
            <th style="width:32px; text-align:center;"><input type="checkbox" id="select-all-res"></th>
            <th>Orden</th><th>Título</th><th>Categoría</th><th>Grupo / Subgrupo</th><th>Tipo</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    filtered.forEach((res) => {
      // Find original index to maintain functionality of move/edit/delete
      // Note: Reordering ▲▼ only makes sense if not filtered, 
      // but we allow it by finding original index
      const originalIndex = this.data.resources.indexOf(res);
      const total = this.data.resources.length;

      html += `
        <tr>
          <td style="width:32px; text-align:center;">
            <input type="checkbox" class="res-checkbox" data-index="${originalIndex}" ${this.selectedIndices.has(originalIndex) ? 'checked' : ''}>
          </td>
          <td class="actions" style="white-space:nowrap;">
            <button class="btn btn-sm btn-outline btn-move-up" data-index="${originalIndex}" ${originalIndex === 0 ? 'disabled' : ''} title="Subir">▲</button>
            <button class="btn btn-sm btn-outline btn-move-down" data-index="${originalIndex}" ${originalIndex === total - 1 ? 'disabled' : ''} title="Bajar">▼</button>
          </td>
          <td>${res.title}</td>
          <td><span class="text-muted" style="font-size:0.8rem;">${res.category}</span></td>
          <td style="font-size:0.9rem;">
            <strong>${res.group || '-'}</strong>
            ${res.subgroup ? `<span style="color:#888; margin:0 4px;">›</span> <span style="color:#555;">${res.subgroup}</span>` : ''}
          </td>
          <td><span class="search-result-section" style="font-size:0.75rem;">${res.type}</span></td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary btn-edit-res" data-index="${originalIndex}">Editar</button>
            <button class="btn btn-sm btn-warning btn-duplicate-res" data-index="${originalIndex}">Duplicar</button>
            <button class="btn btn-sm btn-danger btn-delete-res" data-index="${originalIndex}">Borrar</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Events (re-bind because we replaced the HTML)
    container.querySelectorAll('.btn-edit-res').forEach(btn => btn.addEventListener('click', (e) => this.showResourceModal(e.target.dataset.index)));
    container.querySelectorAll('.btn-duplicate-res').forEach(btn => btn.addEventListener('click', (e) => this.duplicateResource(e.target.dataset.index)));
    container.querySelectorAll('.btn-delete-res').forEach(btn => btn.addEventListener('click', (e) => this.deleteResource(e.target.dataset.index)));
    container.querySelectorAll('.btn-move-up').forEach(btn => btn.addEventListener('click', (e) => this.moveResource(parseInt(e.target.dataset.index), -1)));
    container.querySelectorAll('.btn-move-down').forEach(btn => btn.addEventListener('click', (e) => this.moveResource(parseInt(e.target.dataset.index), 1)));

    // Eventos Checkboxes
    const selectAllCheckbox = document.getElementById('select-all-res');
    const rowCheckboxes = container.querySelectorAll('.res-checkbox');

    if (selectAllCheckbox) {
      // Determinar si todos los visibles están seleccionados
      const allVisibleSelected = filtered.length > 0 && filtered.every(res => {
        const i = this.data.resources.indexOf(res);
        return this.selectedIndices.has(i);
      });
      selectAllCheckbox.checked = allVisibleSelected;

      selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        filtered.forEach(res => {
          const i = this.data.resources.indexOf(res);
          if (isChecked) this.selectedIndices.add(i);
          else this.selectedIndices.delete(i);
        });
        this.renderResourcesTable(); // re-render para checkboxes
      });
    }

    rowCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const i = parseInt(e.target.dataset.index);
        if (e.target.checked) this.selectedIndices.add(i);
        else this.selectedIndices.delete(i);
        
        // Update Select All state without full re-render
        if (selectAllCheckbox) {
          const allVisibleSelected = filtered.length > 0 && filtered.every(res => {
            const idx = this.data.resources.indexOf(res);
            return this.selectedIndices.has(idx);
          });
          selectAllCheckbox.checked = allVisibleSelected;
        }
        
        this._updateBulkBar();
      });
    });

    this._updateBulkBar();
  },

  async saveData() {
    const loadingModal = Modal.showLoading("Guardando cambios en Gist...");
    const content = JSON.stringify(this.data, null, 2);

    try {
      await GitHubAPI.updateGist(REPOS.gists.academico, {
        "data.json": { content }
      });

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
          ${Form.renderField({ id: "description", label: "Descripción", value: isEdit && cat.description ? cat.description : '', required: true, type: "text" })}
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

      const formData = Form.getFormData(form, [{ id: "id", type: "text" }, { id: "name", type: "text" }, { id: "description", type: "text" }]);
      formData.url = `/academico/${formData.id}/`;

      if (isEdit) {
        const index = this.data.categories.findIndex(c => c.id === id);
        const oldCat = this.data.categories[index];
        const oldId = oldCat.id;
        
        // keep old url if exists
        formData.url = oldCat.url || formData.url;
        this.data.categories[index] = formData;
        
        Modal.close(overlay);
        this.updateCategoryCascade(oldId, formData);
      } else {
        // Validate unique ID
        if (!Validators.isCategoryIdUnique(formData.id, this.data.categories)) {
          Modal.showError(`Ya existe una categoría con el ID "${formData.id}". Elegí un ID diferente.`);
          return;
        }
        Modal.close(overlay);
        this.createCategoryAndSave(formData);
      }
    });
  },

  async updateCategoryCascade(oldId, newCat) {
    const isIdChanged = oldId !== newCat.id;
    const loadingMessage = isIdChanged 
      ? `Actualizando categoría y migrando archivos...` 
      : `Actualizando categoría ${newCat.name}...`;
      
    const loadingModal = Modal.showLoading(loadingMessage);

    try {
      // 1. Generate updated HTML content
      const { Base64 } = await import("../utils/base64.js");
      const template = this._generateCategoryTemplate(newCat);
      const base64Content = Base64.encode(template);

      if (isIdChanged) {
        // A. Cascade update resources
        this.data.resources.forEach(res => {
          if (res.category === oldId) {
            res.category = newCat.id;
          }
        });

        // B. GitHub Migration: Create new FIRST
        await GitHubAPI.createFile(
          REPOS.site, 
          `academico/${newCat.id}/index.html`, 
          base64Content, 
          `Migrate category: ${oldId} -> ${newCat.id}`
        );

        // C. GitHub Migration: Delete old LAST
        try {
          const fileData = await GitHubAPI.getFile(REPOS.site, `academico/${oldId}/index.html`);
          await GitHubAPI.deleteFile(
            REPOS.site, 
            `academico/${oldId}/index.html`, 
            `Remove migrated category: ${oldId}`, 
            fileData.sha
          );
        } catch (e) {
          console.warn(`Could not delete old file academico/${oldId}/index.html:`, e);
        }
        
      } else {
        // Just update existing file in GitHub
        try {
          const fileData = await GitHubAPI.getFile(REPOS.site, `academico/${newCat.id}/index.html`);
          await GitHubAPI.updateFile(
            REPOS.site,
            `academico/${newCat.id}/index.html`,
            base64Content,
            `Update category template: ${newCat.name}`,
            fileData.sha
          );
        } catch (e) {
          // If file doesn't exist, create it
          if (e.message.includes('404') || e.message.includes('Not Found')) {
            await GitHubAPI.createFile(
              REPOS.site, 
              `academico/${newCat.id}/index.html`, 
              base64Content, 
              `Create category template: ${newCat.name}`
            );
          } else {
            throw e;
          }
        }
      }

      Modal.close(loadingModal);
      await this.saveData();
      Sitemap.update();
      
    } catch (e) {
      Modal.close(loadingModal);
      Modal.showError(`Error en actualización de categoría: ${e.message}`);
    }
  },

  _generateCategoryTemplate(cat) {
    return `<!DOCTYPE html>
<html lang="es" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Académico | Berrueta</title>
    <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800&display=swap" rel="stylesheet" />
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/css/styles.css" />
    <style>
      .academic-container { max-width: 800px; margin: 0 auto; padding: 0; text-align: left; width: 100%; }
      .academic-title { font-size: 3rem; margin-bottom: var(--spacing-md); border-bottom: 2px solid var(--color-accent); display: inline-block; animation: fadeInDown 0.8s ease-out forwards; opacity: 0; transform: translateY(-20px); }
      .academic-subtitle { font-size: 1.2rem; margin-bottom: var(--spacing-md); color: #555; animation: fadeInUp 0.8s ease-out 0.2s forwards; opacity: 0; transform: translateY(20px); }
      .academic-list { list-style: none; display: flex; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-sm); animation: fadeInUp 0.8s ease-out 0.4s forwards; opacity: 0; transform: translateY(20px); }
      .academic-item { background-color: var(--color-background); border: 1px solid var(--color-border); padding: var(--spacing-sm); border-radius: 8px; transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast); }
      .academic-item:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: var(--color-accent); }
      .academic-item-title { font-size: 1.5rem; color: var(--color-accent); margin-bottom: 0.5rem; }
      .academic-item p { color: #666; font-size: 1rem; }
      .resource-link { display: block; width: 100%; height: 100%; }
      .resource-link:hover .academic-item-title { text-decoration: underline; }
      .back-link { display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: var(--spacing-sm); font-weight: 500; color: #666; animation: fadeInDown 0.8s ease-out forwards; }
      .back-link:hover { color: var(--color-accent); }
    </style>
  </head>
  <body>
    <header class="header" id="main-header">
      <div class="nav-container">
        <a href="/" class="logo" id="logo-container" aria-label="Inicio"></a>
        <nav class="nav-menu"></nav>
      </div>
    </header>
    <main class="main-content" style="padding-top: var(--spacing-md); justify-content: flex-start;">
      <div class="academic-container">
        <a href="/academico/" class="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Volver a categorías
        </a>
        <br>
        <h1 class="academic-title">${cat.name}</h1>
        <p class="academic-subtitle">${cat.description}</p>
        <div id="resources-container" data-category="${cat.id}"></div>
      </div>
    </main>
    <footer class="footer"></footer>
    <script type="module" src="/src/js/main.js"></script>
    <script type="module" src="/src/js/academico.js"></script>
  </body>
</html>`;
  },

  async createCategoryAndSave(formData) {
    const loadingModal = Modal.showLoading(`Creando categoría ${formData.id}...`);
    try {
      const template = this._generateCategoryTemplate(formData);
      const { Base64 } = await import("../utils/base64.js");
      const base64Content = Base64.encode(template);
      await GitHubAPI.createFile(REPOS.site, `academico/${formData.id}/index.html`, base64Content, `Crear categoría: ${formData.name}`);

      this.data.categories.push(formData);
      Modal.close(loadingModal);
      this.saveData();
      Sitemap.update();
    } catch (e) {
      Modal.close(loadingModal);
      Modal.showError(`Error al crear la categoría: ${e.message}`);
    }
  },

  deleteCategory(id) {
    Modal.showConfirm(`¿Eliminar la categoría "${id}" y su página del sitio?`, async () => {
      const path = `academico/${id}/index.html`;
      const loadingModal = Modal.showLoading(`Eliminando categoría ${id}...`);
      try {
        // Get SHA of the file so we can delete it
        const fileData = await GitHubAPI.getFile(REPOS.site, path);
        await GitHubAPI.deleteFile(REPOS.site, path, `Eliminar categoría: ${id}`, fileData.sha);
      } catch (e) {
        // If the file doesn't exist on the repo (e.g. legacy category), just continue
        if (!e.message.includes('404') && !e.message.includes('Not Found')) {
          Modal.close(loadingModal);
          Modal.showError(`Error al eliminar el archivo del sitio: ${e.message}`);
          return;
        }
      }
      this.data.categories = this.data.categories.filter(c => c.id !== id);
      Modal.close(loadingModal);
      this.saveData();
      Sitemap.update();
    });
  },

  showResourceModal(index = null) {
    const isEdit = index !== null;
    const res = isEdit ? this.data.resources[index] : null;

    const catOptions = this.data.categories.map(c => ({ value: c.id, label: c.name }));
    const typeOptions = [
      { value: "link", label: "Enlace Externo" },
      { value: "pdf", label: "Archivo (PDF/Epub)" },
      { value: "texto", label: "Texto / Artículo" }
    ];

    const overlay = Modal.create(
      isEdit ? "Editar Recurso" : "Nuevo Recurso",
      `
        <form id="res-form">
          ${Form.renderField({ id: "title", label: "Título", value: isEdit ? res.title : '', required: true, type: "text" })}
          ${Form.renderField({ id: "category", label: "Categoría", value: isEdit ? res.category : (catOptions.length > 0 ? catOptions[0].value : ''), required: true, type: "select", options: catOptions })}
          <div style="display:flex; gap:1rem;">
            <div class="form-group" style="flex:1;">
              <label for="group">Grupo (Ej: 1er Año, Prácticos)</label>
              <input type="text" id="group" class="form-control" list="group-list" value="${isEdit ? res.group : ''}" required>
              <datalist id="group-list">
                ${[...new Set(this.data.resources.map(r => r.group).filter(Boolean))].map(g => `<option value="${g}">`).join('')}
              </datalist>
            </div>
            <div class="form-group" style="flex:1;">
              <label for="subgroup">Subgrupo (Ej: Química CFE)</label>
              <input type="text" id="subgroup" class="form-control" list="sub-list" value="${isEdit && res.subgroup ? res.subgroup : ''}">
              <datalist id="sub-list">
                ${[...new Set(this.data.resources.map(r => r.subgroup).filter(Boolean))].map(s => `<option value="${s}">`).join('')}
              </datalist>
            </div>
          </div>
          ${Form.renderField({ id: "tags", label: "Tags (separados por coma)", value: isEdit && res.tags ? res.tags.join(', ') : '', type: "text" })}
          ${Form.renderField({ id: "type", label: "Tipo", value: isEdit ? res.type : 'link', required: true, type: "select", options: typeOptions })}
          
          <div id="wrapper-url" style="display: block;">
            ${Form.renderField({ id: "url", label: "URL", value: isEdit ? res.url : '', type: "text" })}
          </div>
          <div id="wrapper-file" style="display: none;">
            ${Form.renderField({ id: "file", label: "Subir Archivo (.pdf, .epub)", type: "file", accept: ".pdf,.epub" })}
          </div>
          <div id="wrapper-content" style="display: none;">
            ${Form.renderField({ id: "content", label: "Contenido del Artículo (Markdown/HTML)", type: "textarea", rows: 10 })}
          </div>

          ${Form.renderField({ id: "description", label: "Descripción Breve", value: isEdit ? res.description : '', required: true, type: "textarea", rows: 3 })}
        </form>
      `,
      `
        <button class="btn btn-secondary" id="res-cancel">Cancelar</button>
        <button class="btn btn-primary" id="res-save">Guardar</button>
      `
    );

    const typeSelect = overlay.querySelector("#type");
    const wrapperUrl = overlay.querySelector("#wrapper-url");
    const wrapperFile = overlay.querySelector("#wrapper-file");
    const wrapperContent = overlay.querySelector("#wrapper-content");

    function updateUI() {
      const val = typeSelect.value;
      wrapperUrl.style.display = val === 'link' || isEdit ? 'block' : 'none';
      wrapperFile.style.display = val === 'pdf' && !isEdit ? 'block' : 'none';
      wrapperContent.style.display = val === 'texto' && !isEdit ? 'block' : 'none';

      if (isEdit) {
        overlay.querySelector('label[for="url"]').textContent = "URL del Recurso";
      }
    }
    typeSelect.addEventListener("change", updateUI);
    updateUI();

    overlay.querySelector("#res-cancel").addEventListener("click", () => Modal.close(overlay));
    overlay.querySelector("#res-save").addEventListener("click", async () => {
      const form = overlay.querySelector("#res-form");

      // Select elements
      const urlInput = form.querySelector("#url");
      const fileInput = form.querySelector("#file");
      const contentInput = form.querySelector("#content");

      if (!isEdit && typeSelect.value === 'link' && !urlInput.value.trim()) { alert("Debe ingresar la URL"); return; }

      const titleVal = form.querySelector("#title").value.trim();
      const typeVal = typeSelect.value;
      let finalUrl = urlInput.value.trim();

      const baseData = {
        title: titleVal,
        category: form.querySelector("#category").value,
        group: form.querySelector("#group").value.trim(),
        subgroup: form.querySelector("#subgroup").value.trim(),
        type: typeVal,
        description: form.querySelector("#description").value.trim()
      };

      const tagsStr = form.querySelector("#tags").value;
      baseData.tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t !== "") : [];

      if (!baseData.title || !baseData.category || !baseData.group || !baseData.description) {
        alert("Por favor complete todos los campos obligatorios");
        return;
      }

      if (!isEdit) {
        if (typeVal === 'pdf') {
          if (fileInput.files.length === 0) {
            alert("Debe seleccionar un archivo PDF/Epub");
            return;
          }
          const file = fileInput.files[0];
          const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const path = `academico/${cleanName}`;

          const loadingModal = Modal.showLoading(`Subiendo archivo ${file.name}...`);
          try {
            const { Base64 } = await import("../utils/base64.js");
            const base64Content = await Base64.encodeFile(file);
            await GitHubAPI.createFile(REPOS.site, path, base64Content, `Upload PDF: ${file.name}`);
            Modal.close(loadingModal);
            finalUrl = `/${path}`;
          } catch (err) {
            Modal.close(loadingModal);
            Modal.showError(`Error al subir: ${err.message}`);
            return;
          }
        } else if (typeVal === 'texto') {
          const contentVal = contentInput.value.trim();
          if (!contentVal) {
            alert("Debe escribir el contenido del recurso de texto"); return;
          }
          const slug = baseData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          const path = `academico/recursos/${slug}.html`;

          const template = `<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseData.title} | Académico</title>
  <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800&display=swap" rel="stylesheet">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/css/styles.css">
  <style>
    .article-container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    .article-title { font-size: 2.5rem; color: var(--color-accent); margin-bottom: 0.5rem; }
    .article-meta { font-size: 0.9rem; color: #666; margin-bottom: 2rem; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem; }
    .article-content { font-size: 1.1rem; line-height: 1.8; color: var(--color-text); }
    .article-content p { margin-bottom: 1.5rem; }
    .back-link { display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem; font-weight: 500; color: #666; }
    .back-link:hover { color: var(--color-accent); }
  </style>
</head>
<body>
  <header class="header" id="main-header"><div class="nav-container"><a href="/" class="logo" id="logo-container" aria-label="Inicio"></a><nav class="nav-menu"></nav></div></header>
  <main class="main-content">
    <article class="article-container">
      <a href="/academico/" class="back-link">&larr; Volver a Académico</a>
      <h1 class="article-title">${baseData.title}</h1>
      <div class="article-meta">Recurso de ${baseData.category} | ${baseData.group}${baseData.subgroup ? ' | ' + baseData.subgroup : ''}</div>
      <div class="article-content">
        ${contentVal.replace(/\n/g, '<br>')}
      </div>
    </article>
  </main>
  <footer class="footer"></footer>
  <script type="module" src="/src/js/main.js"></script>
</body>
</html>`;

          const loadingModal = Modal.showLoading(`Creando artículo ${baseData.title}...`);
          try {
            const { Base64 } = await import("../utils/base64.js");
            const base64Content = Base64.encode(template);
            await GitHubAPI.createFile(REPOS.site, path, base64Content, `Crear artículo: ${baseData.title}`);
            Modal.close(loadingModal);
            finalUrl = `/${path}`;
          } catch (err) {
            Modal.close(loadingModal);
            Modal.showError(`Error al crear artículo: ${err.message}`);
            return;
          }
        }
      }

      baseData.url = finalUrl;
      Modal.close(overlay);

      if (isEdit) {
        this.data.resources[index] = baseData;
      } else {
        this.data.resources.push(baseData);
      }
      this.saveData();
    });
  },

  deleteResource(index) {
    const res = this.data.resources[index];
    Modal.showConfirm(`¿Eliminar el recurso ${res.title}?`, () => {
      this.data.resources.splice(index, 1);
      this.saveData();
    });
  },

  duplicateResource(index) {
    const res = this.data.resources[index];
    const copy = { ...res, title: res.title + ' (copia)' };
    this.data.resources.splice(index + 1, 0, copy);
    this.saveData();
  },

  moveResource(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.data.resources.length) return;
    const resources = this.data.resources;
    [resources[index], resources[newIndex]] = [resources[newIndex], resources[index]];
    this.saveData();
  },

  deleteBulkSelected() {
    Modal.showConfirm(`¿Eliminar los ${this.selectedIndices.size} recursos seleccionados?`, () => {
      // Sort indices descending to splice correctly
      const indices = Array.from(this.selectedIndices).sort((a, b) => b - a);
      indices.forEach(index => {
        this.data.resources.splice(index, 1);
      });
      this.selectedIndices.clear();
      this.saveData();
    });
  },

  showBulkEditModal() {
    const catOptions = [{ value: "", label: "-- Sin Cambio --" }, ...this.data.categories.map(c => ({ value: c.id, label: c.name }))];
    const typeOptions = [
      { value: "", label: "-- Sin Cambio --" },
      { value: "link", label: "Enlace Externo" },
      { value: "pdf", label: "Archivo (PDF/Epub)" },
      { value: "texto", label: "Texto / Artículo" }
    ];

    const allGroups = [...new Set(this.data.resources.map(r => r.group).filter(Boolean))].sort();
    const allSubgroups = [...new Set(this.data.resources.map(r => r.subgroup).filter(Boolean))].sort();

    const overlay = Modal.create(
      `Edición Masiva (${this.selectedIndices.size} recursos)`,
      `
        <form id="bulk-form">
          <p class="text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">Deje en blanco los campos que no desea modificar.</p>
          
          <div style="display:flex; gap:1rem;">
            <div style="flex:1;">
              ${Form.renderField({ id: "bulk-category", label: "Categoría", value: "", type: "select", options: catOptions })}
            </div>
            <div style="flex:1;">
               ${Form.renderField({ id: "bulk-type", label: "Tipo", value: "", type: "select", options: typeOptions })}
            </div>
          </div>

          <div style="display:flex; gap:1rem;">
            <div class="form-group" style="flex:1;">
              <label for="bulk-group">Grupo</label>
              <input type="text" id="bulk-group" class="form-control" list="bulk-group-list" placeholder="-- Sin Cambio --">
              <datalist id="bulk-group-list">
                ${allGroups.map(g => `<option value="${g}">`).join('')}
              </datalist>
            </div>
            <div class="form-group" style="flex:1;">
              <label for="bulk-subgroup">Subgrupo</label>
              <input type="text" id="bulk-subgroup" class="form-control" list="bulk-sub-list" placeholder="-- Sin Cambio --">
              <datalist id="bulk-sub-list">
                ${allSubgroups.map(s => `<option value="${s}">`).join('')}
              </datalist>
            </div>
          </div>

          ${Form.renderField({ id: "bulk-description", label: "Descripción", value: '', type: "textarea", rows: 2, placeholder: "-- Sin Cambio --" })}
          
          <div style="display:flex; gap:1rem; align-items:flex-end;">
            <div style="flex:2;">
              ${Form.renderField({ id: "bulk-tags", label: "Tags (separados por coma)", value: '', type: "text", placeholder: "-- Sin Cambio --" })}
            </div>
            <div style="flex:1; margin-bottom: 1rem;">
               <label><input type="radio" name="tags-mode" value="append" checked> Agregar (Append)</label><br>
               <label><input type="radio" name="tags-mode" value="overwrite"> Sobreescribir</label>
            </div>
          </div>

          <div style="display:flex; gap:1rem;">
            <div style="flex:1;">
              ${Form.renderField({ id: "bulk-prefix", label: "Prefijo de Título", value: "", type: "text", placeholder: "Ej: [Unidad 1] " })}
            </div>
            <div style="flex:1;">
              ${Form.renderField({ id: "bulk-suffix", label: "Sufijo de Título", value: "", type: "text", placeholder: " Ej: (Actualizado)" })}
            </div>
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" id="bulk-cancel">Cancelar</button>
        <button class="btn btn-primary" id="bulk-save">Aplicar a ${this.selectedIndices.size} recursos</button>
      `
    );

    overlay.querySelector("#bulk-cancel").addEventListener("click", () => Modal.close(overlay));
    overlay.querySelector("#bulk-save").addEventListener("click", () => {
      const form = overlay.querySelector("#bulk-form");
      
      const changes = {
        category: form.querySelector("#bulk-category").value,
        type: form.querySelector("#bulk-type").value,
        group: form.querySelector("#bulk-group").value.trim(),
        subgroup: form.querySelector("#bulk-subgroup").value.trim(),
        description: form.querySelector("#bulk-description").value.trim(),
        tags: form.querySelector("#bulk-tags").value,
        tagsMode: form.querySelector('input[name="tags-mode"]:checked').value,
        prefix: form.querySelector("#bulk-prefix").value,
        suffix: form.querySelector("#bulk-suffix").value,
      };

      Modal.close(overlay);
      this.applyBulkEdit(changes);
    });
  },

  applyBulkEdit(changes) {
    const indices = Array.from(this.selectedIndices);
    
    // Process tags array if provided
    let newTags = [];
    if (changes.tags) {
      newTags = changes.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    indices.forEach(index => {
      const res = this.data.resources[index];
      
      if (changes.category) res.category = changes.category;
      if (changes.type) res.type = changes.type;
      if (changes.group) res.group = changes.group;
      if (changes.subgroup) res.subgroup = changes.subgroup;
      if (changes.description) res.description = changes.description;

      if (changes.tags) {
        if (changes.tagsMode === 'overwrite') {
          res.tags = [...newTags];
        } else {
          // append
          const existing = res.tags || [];
          res.tags = [...new Set([...existing, ...newTags])];
        }
      }

      if (changes.prefix) res.title = changes.prefix + res.title;
      if (changes.suffix) res.title = res.title + changes.suffix;
    });

    this.selectedIndices.clear();
    this.saveData();
  },

  _renameGroupInResources(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    let modified = false;
    this.data.resources.forEach(res => {
      if (res.group === oldName) {
        res.group = newName;
        modified = true;
      }
    });
    if (modified) this.saveData();
  },

  _renameSubgroupInResources(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    let modified = false;
    this.data.resources.forEach(res => {
      if (res.subgroup === oldName) {
        res.subgroup = newName;
        modified = true;
      }
    });
    if (modified) this.saveData();
  },

  exportData() {
    const json = JSON.stringify(this.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
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
        if (!parsed.categories || !parsed.resources) throw new Error('El JSON debe tener "categories" y "resources".');
        const cats = parsed.categories.length;
        const res = parsed.resources.length;
        Modal.showConfirm(`¿Reemplazar los datos actuales con ${cats} categorías y ${res} recursos del archivo?`, async () => {
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
