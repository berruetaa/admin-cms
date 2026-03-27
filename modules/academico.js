import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { Form } from "../components/form.js";
import { Validators } from "../utils/validators.js";
import { SearchDataStore } from "../components/navbar.js";
import { Sitemap } from "../utils/sitemap.js";
import { Autosave } from "../utils/autosave.js";

const DATA_PATH = "academico/data.json";

const RESOURCE_TYPE_LABELS = {
  link: "Enlace",
  pdf: "Archivo",
  texto: "Articulo"
};

const WIZARD_STEPS = [
  { id: 1, label: "Tipo y titulo" },
  { id: 2, label: "Clasificacion" },
  { id: 3, label: "Contenido" },
  { id: 4, label: "Revision" }
];

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const Academico = {
  data: { categories: [], resources: [] },
  fileSha: null,
  filters: { query: "", category: "all", group: "all", subgroup: "all", type: "all" },
  selectedIndices: new Set(),
  wizard: null,
  _routeGuardFn: null,

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestion Academica</h2>
        <div class="header-actions">
          <button id="btn-export-acad" class="btn btn-outline">Exportar JSON</button>
          <button id="btn-import-acad" class="btn btn-outline">Importar JSON</button>
          <button id="btn-new-category" class="btn btn-secondary">Nueva Categoria</button>
          <button id="btn-new-resource" class="btn btn-primary">Nuevo Recurso</button>
        </div>
      </div>
      <div id="academico-content">
        <div class="loading-spinner"></div> Cargando datos...
      </div>
    `;

    document.getElementById("btn-new-category").addEventListener("click", () => this.showCategoryModal());
    document.getElementById("btn-new-resource").addEventListener("click", () => {
      window.location.hash = "#/academico/nuevo";
    });
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

      const parsed = JSON.parse(file.content);
      this.data = {
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        resources: Array.isArray(parsed.resources) ? parsed.resources : []
      };

      SearchDataStore.academico = this.data;
      this.renderCurrentView(contentDiv);
    } catch (error) {
      contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  renderContent(container) {
    this.renderCurrentView(container);
  },

  renderCurrentView(container = document.getElementById("academico-content")) {
    if (!container) return;

    const route = this._parseWizardRoute();
    if (!route) {
      this._clearWizardGuards();
      this.wizard = null;
      this._renderListView(container);
      return;
    }

    if (route.mode === "edit") {
      const isValidIndex = Number.isInteger(route.index) && route.index >= 0 && route.index < this.data.resources.length;
      if (!isValidIndex) {
        this._clearWizardGuards();
        this.wizard = null;
        Modal.showInfo("Recurso no encontrado", "No encontramos ese recurso para editar. Te llevamos al listado.");
        window.location.hash = "#/academico";
        return;
      }
    }

    this._ensureWizardInitialized(route);
    this._applyWizardGuards();
    this._renderWizardView(container);
  },

  _parseWizardRoute(hash = window.location.hash) {
    const cleanHash = (hash || "").replace(/^#/, "");
    if (cleanHash === "/academico/nuevo") {
      return { mode: "create", index: null, routeKey: "create" };
    }

    const editMatch = cleanHash.match(/^\/academico\/editar\/(\d+)$/);
    if (editMatch) {
      return { mode: "edit", index: parseInt(editMatch[1], 10), routeKey: `edit-${editMatch[1]}` };
    }

    return null;
  },

  _isWizardHash(hash) {
    return /^#\/academico\/(nuevo|editar\/\d+)$/.test(hash || "");
  },

  _applyWizardGuards() {
    if (!this._routeGuardFn) {
      this._routeGuardFn = ({ from, to }) => {
        if (!this._isWizardHash(from)) return true;
        if (!this.wizard || !this.wizard.isDirty) return true;
        if (from === to) return true;
        return window.confirm("Tenes cambios sin guardar en el recurso. Queres salir igual?");
      };
    }

    window.__cmsRouteLeaveGuard = this._routeGuardFn;

    window.onbeforeunload = (event) => {
      if (!this.wizard || !this.wizard.isDirty) return undefined;
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
  },

  _clearWizardGuards() {
    if (window.__cmsRouteLeaveGuard === this._routeGuardFn) {
      window.__cmsRouteLeaveGuard = null;
    }
    window.onbeforeunload = null;
  },

  _wizardDraftKey(route) {
    return route.mode === "create" ? "academico_resource_new" : `academico_resource_edit_${route.index}`;
  },

  _buildWizardBaseData(resource = null) {
    return {
      title: resource?.title || "",
      category: resource?.category || (this.data.categories[0]?.id || ""),
      group: resource?.group || "",
      subgroup: resource?.subgroup || "",
      tags: Array.isArray(resource?.tags) ? resource.tags.join(", ") : "",
      type: resource?.type || "link",
      url: resource?.url || "",
      description: resource?.description || "",
      content: "",
      replaceFile: false,
      replaceContent: false
    };
  },

  _ensureWizardInitialized(route) {
    if (this.wizard && this.wizard.routeKey === route.routeKey) {
      return;
    }

    const originalResource = route.mode === "edit" ? { ...this.data.resources[route.index] } : null;
    const draftKey = this._wizardDraftKey(route);
    const baseData = this._buildWizardBaseData(originalResource);

    this.wizard = {
      routeKey: route.routeKey,
      mode: route.mode,
      editIndex: route.index,
      step: 1,
      data: baseData,
      originalResource,
      draftKey,
      restoredAt: null,
      selectedFile: null,
      errors: {},
      isDirty: false
    };

    const draft = Autosave.load(draftKey);
    if (draft && draft.data) {
      const draftData = draft.data.formData || {};
      this.wizard.data = {
        ...this.wizard.data,
        ...draftData,
        tags: typeof draftData.tags === "string" ? draftData.tags : this.wizard.data.tags
      };
      this.wizard.step = Math.min(4, Math.max(1, Number(draft.data.step) || 1));
      this.wizard.restoredAt = draft.savedAt;
      this.wizard.isDirty = true;
    }
  },

  _persistWizardDraft() {
    if (!this.wizard) return;
    const serializable = {
      ...this.wizard.data,
      tags: this.wizard.data.tags || ""
    };

    Autosave.save(this.wizard.draftKey, {
      formData: serializable,
      step: this.wizard.step
    });
  },

  _discardWizardDraft() {
    if (!this.wizard) return;
    Autosave.remove(this.wizard.draftKey);
    const route = this._parseWizardRoute();
    if (!route) return;

    const originalResource = route.mode === "edit" ? { ...this.data.resources[route.index] } : null;
    this.wizard = {
      routeKey: route.routeKey,
      mode: route.mode,
      editIndex: route.index,
      step: 1,
      data: this._buildWizardBaseData(originalResource),
      originalResource,
      draftKey: this._wizardDraftKey(route),
      restoredAt: null,
      selectedFile: null,
      errors: {},
      isDirty: false
    };

    this.renderCurrentView();
  },

  _renderListView(container) {
    container.innerHTML = `
      <section id="categories-section"></section>
      <section id="resources-section" style="margin-top: 3rem;"></section>
    `;

    this.renderCategoriesTable();
    this.renderResourcesSection();
  },

  renderCategoriesTable() {
    const section = document.getElementById("categories-section");
    if (!section) return;

    let html = `
      <h3>Categorias</h3>
      <table class="table">
        <thead><tr><th>ID</th><th>Nombre</th><th>Acciones</th></tr></thead>
        <tbody>
    `;

    this.data.categories.forEach((cat) => {
      html += `
        <tr>
          <td>${escapeHtml(cat.id)}</td>
          <td>${escapeHtml(cat.name)}</td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary btn-edit-cat" data-id="${escapeHtml(cat.id)}">Editar</button>
            <button class="btn btn-sm btn-danger btn-delete-cat" data-id="${escapeHtml(cat.id)}">Borrar</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    section.innerHTML = html;

    section.querySelectorAll(".btn-edit-cat").forEach((btn) => btn.addEventListener("click", (e) => this.showCategoryModal(e.target.dataset.id)));
    section.querySelectorAll(".btn-delete-cat").forEach((btn) => btn.addEventListener("click", (e) => this.deleteCategory(e.target.dataset.id)));
  },

  _resetFilters() {
    this.filters = { query: "", category: "all", group: "all", subgroup: "all", type: "all" };
    this.renderResourcesSection();
  },

  renderResourcesSection() {
    const section = document.getElementById("resources-section");
    if (!section) return;

    section.innerHTML = `
      <div class="academic-resources-head">
        <div>
          <h3 style="margin-bottom: 0.25rem;">Recursos</h3>
          <span class="text-muted" id="resource-count" style="font-size:0.85rem;"></span>
        </div>
        <div class="academic-resources-head-actions">
          <button id="btn-list-new-resource" class="btn btn-primary">Nuevo recurso</button>
          <button id="btn-clear-filters" class="btn btn-outline">Limpiar filtros</button>
        </div>
      </div>

      <div class="filter-bar card" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; padding:0.75rem; flex-wrap:wrap; font-size:0.9rem; background: var(--color-muted);">
        <div style="flex:2.5; min-width:180px;">
          <input type="text" id="filter-query" class="form-control" style="padding: 0.5rem;" placeholder="Buscar recurso..." value="${escapeHtml(this.filters.query)}">
        </div>
        <div style="flex:1; min-width:140px;">
          <select id="filter-category" class="form-control" style="padding: 0.5rem;">
            <option value="all">Categoria (Todas)</option>
            ${this.data.categories.map((c) => `<option value="${escapeHtml(c.id)}" ${this.filters.category === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div style="flex:1; min-width:140px;">
          <select id="filter-group" class="form-control" style="padding: 0.5rem;">
            <option value="all">Grupo (Todos)</option>
            ${[...new Set(this.data.resources.map((r) => r.group).filter(Boolean))].sort().map((g) => `<option value="${escapeHtml(g)}" ${this.filters.group === g ? "selected" : ""}>${escapeHtml(g)}</option>`).join("")}
          </select>
        </div>
        <div style="flex:1; min-width:140px;">
          <select id="filter-subgroup" class="form-control" style="padding: 0.5rem;">
            <option value="all">Subgrupo (Todos)</option>
            ${[...new Set(this.data.resources.map((r) => r.subgroup).filter(Boolean))].sort().map((s) => `<option value="${escapeHtml(s)}" ${this.filters.subgroup === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
          </select>
        </div>
        <div style="flex:0.8; min-width:110px;">
          <select id="filter-type" class="form-control" style="padding: 0.5rem;">
            <option value="all">Tipo</option>
            <option value="link" ${this.filters.type === "link" ? "selected" : ""}>Enlace</option>
            <option value="pdf" ${this.filters.type === "pdf" ? "selected" : ""}>Archivo</option>
            <option value="texto" ${this.filters.type === "texto" ? "selected" : ""}>Articulo</option>
          </select>
        </div>
      </div>

      <div id="bulk-action-bar" class="card" style="display:none; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding:0.75rem 1rem; background: var(--color-accent); color: white;">
        <span id="bulk-count" style="font-weight: 500;">0 seleccionados</span>
        <div>
          <button id="btn-bulk-edit" class="btn btn-sm btn-outline" style="color:white; border-color:white; margin-right: 0.5rem;">Editar lote</button>
          <button id="btn-bulk-delete" class="btn btn-sm btn-danger" style="background: white; color: var(--color-error); border-color: white;">Borrar lote</button>
        </div>
      </div>

      <div id="resources-table-container"></div>
    `;

    section.querySelector("#btn-list-new-resource")?.addEventListener("click", () => {
      window.location.hash = "#/academico/nuevo";
    });

    section.querySelector("#btn-clear-filters")?.addEventListener("click", () => this._resetFilters());

    const qInput = document.getElementById("filter-query");
    const cInput = document.getElementById("filter-category");
    const gInput = document.getElementById("filter-group");
    const sInput = document.getElementById("filter-subgroup");
    const tInput = document.getElementById("filter-type");

    qInput.addEventListener("input", (e) => {
      this.filters.query = e.target.value.toLowerCase();
      this.renderResourcesTable();
    });
    cInput.addEventListener("change", (e) => {
      this.filters.category = e.target.value;
      this.renderResourcesTable();
    });
    gInput.addEventListener("change", (e) => {
      this.filters.group = e.target.value;
      this.renderResourcesTable();
    });
    sInput.addEventListener("change", (e) => {
      this.filters.subgroup = e.target.value;
      this.renderResourcesTable();
    });
    tInput.addEventListener("change", (e) => {
      this.filters.type = e.target.value;
      this.renderResourcesTable();
    });

    this.renderResourcesTable();

    document.getElementById("btn-bulk-edit")?.addEventListener("click", () => this.showBulkEditModal());
    document.getElementById("btn-bulk-delete")?.addEventListener("click", () => this.deleteBulkSelected());
  },

  _updateBulkBar() {
    const bar = document.getElementById("bulk-action-bar");
    const countLabel = document.getElementById("bulk-count");
    if (!bar || !countLabel) return;

    if (this.selectedIndices.size > 0) {
      bar.style.display = "flex";
      countLabel.textContent = `${this.selectedIndices.size} recurso(s) seleccionado(s)`;
    } else {
      bar.style.display = "none";
    }
  },

  _categoryMap() {
    return new Map(this.data.categories.map((cat) => [cat.id, cat.name]));
  },

  _renderResourcesEmptyState(container, hasAnyResources) {
    if (!hasAnyResources) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:2rem; color:#666;">
          <h4 style="margin-bottom:0.5rem;">Todavia no hay recursos</h4>
          <p style="margin-bottom:1rem;">Crea el primer recurso para empezar a poblar esta seccion.</p>
          <button id="btn-empty-create-resource" class="btn btn-primary">Crear primer recurso</button>
        </div>
      `;

      container.querySelector("#btn-empty-create-resource")?.addEventListener("click", () => {
        window.location.hash = "#/academico/nuevo";
      });
      return;
    }

    container.innerHTML = `
      <div class="card" style="text-align:center; padding:2rem; color:#666;">
        <h4 style="margin-bottom:0.5rem;">No encontramos recursos con esos filtros</h4>
        <p style="margin-bottom:1rem;">Proba limpiar los filtros o cambiar la busqueda.</p>
        <button id="btn-empty-clear-filters" class="btn btn-outline">Limpiar filtros</button>
      </div>
    `;

    container.querySelector("#btn-empty-clear-filters")?.addEventListener("click", () => this._resetFilters());
  },
  renderResourcesTable() {
    const container = document.getElementById("resources-table-container");
    const countSpan = document.getElementById("resource-count");
    if (!container) return;

    const filtered = this.data.resources.filter((res) => {
      const query = this.filters.query || "";
      const desc = (res.description || "").toLowerCase();
      const title = (res.title || "").toLowerCase();
      const tagsJoined = Array.isArray(res.tags) ? res.tags.join(" ").toLowerCase() : "";

      const matchQuery = !query || title.includes(query) || desc.includes(query) || tagsJoined.includes(query);
      const matchCat = this.filters.category === "all" || res.category === this.filters.category;
      const matchGroup = this.filters.group === "all" || res.group === this.filters.group;
      const matchSub = this.filters.subgroup === "all" || res.subgroup === this.filters.subgroup;
      const matchType = this.filters.type === "all" || res.type === this.filters.type;

      return matchQuery && matchCat && matchGroup && matchSub && matchType;
    });

    if (countSpan) {
      countSpan.textContent = `Mostrando ${filtered.length} de ${this.data.resources.length} recursos`;
    }

    if (filtered.length === 0) {
      this._renderResourcesEmptyState(container, this.data.resources.length > 0);
      this._updateBulkBar();
      return;
    }

    const categoryMap = this._categoryMap();

    let html = `
      <table class="table">
        <thead>
          <tr>
            <th style="width:32px; text-align:center;"><input type="checkbox" id="select-all-res"></th>
            <th>Orden</th>
            <th>Titulo</th>
            <th>Categoria</th>
            <th>Grupo / Subgrupo</th>
            <th>Tipo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    filtered.forEach((res) => {
      const originalIndex = this.data.resources.indexOf(res);
      const total = this.data.resources.length;
      const categoryName = categoryMap.get(res.category) || res.category;
      const subgroup = res.subgroup ? `<span style="color:#666;">${escapeHtml(res.subgroup)}</span>` : "<span class=\"text-muted\">-</span>";
      const typeClass = `type-pill-${escapeHtml(res.type || "link")}`;

      html += `
        <tr>
          <td style="width:32px; text-align:center;">
            <input type="checkbox" class="res-checkbox" data-index="${originalIndex}" ${this.selectedIndices.has(originalIndex) ? "checked" : ""}>
          </td>
          <td class="actions" style="white-space:nowrap;">
            <button class="btn btn-sm btn-outline btn-move-up" data-index="${originalIndex}" ${originalIndex === 0 ? "disabled" : ""} title="Subir">?</button>
            <button class="btn btn-sm btn-outline btn-move-down" data-index="${originalIndex}" ${originalIndex === total - 1 ? "disabled" : ""} title="Bajar">?</button>
          </td>
          <td>
            <strong>${escapeHtml(res.title)}</strong>
            ${res.description ? `<div class="text-muted" style="font-size:0.8rem; margin-top:0.2rem;">${escapeHtml(res.description)}</div>` : ""}
          </td>
          <td>
            <strong>${escapeHtml(categoryName || "Sin categoria")}</strong>
            <div class="text-muted" style="font-size:0.75rem;">${escapeHtml(res.category || "-")}</div>
          </td>
          <td style="font-size:0.9rem;">
            <strong>${escapeHtml(res.group || "-")}</strong>
            <div style="margin-top:0.2rem;">${subgroup}</div>
          </td>
          <td>
            <span class="type-pill ${typeClass}">${escapeHtml(RESOURCE_TYPE_LABELS[res.type] || res.type || "-")}</span>
          </td>
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

    container.querySelectorAll(".btn-edit-res").forEach((btn) => btn.addEventListener("click", (e) => this.showResourceModal(parseInt(e.target.dataset.index, 10))));
    container.querySelectorAll(".btn-duplicate-res").forEach((btn) => btn.addEventListener("click", (e) => this.duplicateResource(parseInt(e.target.dataset.index, 10))));
    container.querySelectorAll(".btn-delete-res").forEach((btn) => btn.addEventListener("click", (e) => this.deleteResource(parseInt(e.target.dataset.index, 10))));
    container.querySelectorAll(".btn-move-up").forEach((btn) => btn.addEventListener("click", (e) => this.moveResource(parseInt(e.target.dataset.index, 10), -1)));
    container.querySelectorAll(".btn-move-down").forEach((btn) => btn.addEventListener("click", (e) => this.moveResource(parseInt(e.target.dataset.index, 10), 1)));

    const selectAllCheckbox = document.getElementById("select-all-res");
    const rowCheckboxes = container.querySelectorAll(".res-checkbox");

    if (selectAllCheckbox) {
      const allVisibleSelected = filtered.length > 0 && filtered.every((res) => this.selectedIndices.has(this.data.resources.indexOf(res)));
      selectAllCheckbox.checked = allVisibleSelected;

      selectAllCheckbox.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        filtered.forEach((res) => {
          const i = this.data.resources.indexOf(res);
          if (isChecked) this.selectedIndices.add(i);
          else this.selectedIndices.delete(i);
        });
        this.renderResourcesTable();
      });
    }

    rowCheckboxes.forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const i = parseInt(e.target.dataset.index, 10);
        if (e.target.checked) this.selectedIndices.add(i);
        else this.selectedIndices.delete(i);

        if (selectAllCheckbox) {
          const allVisibleSelected = filtered.length > 0 && filtered.every((res) => this.selectedIndices.has(this.data.resources.indexOf(res)));
          selectAllCheckbox.checked = allVisibleSelected;
        }

        this._updateBulkBar();
      });
    });

    this._updateBulkBar();
  },

  async saveData(options = {}) {
    const { rerender = true } = options;
    const loadingModal = Modal.showLoading("Guardando cambios en Gist...");
    const content = JSON.stringify(this.data, null, 2);

    try {
      await GitHubAPI.updateGist(REPOS.gists.academico, {
        "data.json": { content }
      });

      Modal.close(loadingModal);
      SearchDataStore.academico = this.data;

      if (rerender) {
        this.renderCurrentView();
      }
    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(`Error al guardar: ${error.message}`);
      throw error;
    }
  },

  showCategoryModal(id = null) {
    const isEdit = !!id;
    const cat = isEdit ? this.data.categories.find((c) => c.id === id) : null;

    const overlay = Modal.create(
      isEdit ? "Editar Categoria" : "Nueva Categoria",
      `
        <form id="cat-form">
          ${Form.renderField({ id: "id", label: "ID (slug)", value: isEdit ? cat.id : "", required: true, type: "text" })}
          ${Form.renderField({ id: "name", label: "Nombre", value: isEdit ? cat.name : "", required: true, type: "text" })}
          ${Form.renderField({ id: "description", label: "Descripcion", value: isEdit && cat.description ? cat.description : "", required: true, type: "text" })}
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
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const formData = Form.getFormData(form, [
        { id: "id", type: "text" },
        { id: "name", type: "text" },
        { id: "description", type: "text" }
      ]);
      formData.url = `/academico/${formData.id}/`;

      if (isEdit) {
        const index = this.data.categories.findIndex((c) => c.id === id);
        const oldCat = this.data.categories[index];
        const oldId = oldCat.id;

        formData.url = oldCat.url || formData.url;
        this.data.categories[index] = formData;

        Modal.close(overlay);
        this.updateCategoryCascade(oldId, formData);
      } else {
        if (!Validators.isCategoryIdUnique(formData.id, this.data.categories)) {
          Modal.showError(`Ya existe una categoria con el ID "${formData.id}". Elegi un ID diferente.`);
          return;
        }
        Modal.close(overlay);
        this.createCategoryAndSave(formData);
      }
    });
  },

  async updateCategoryCascade(oldId, newCat) {
    const isIdChanged = oldId !== newCat.id;
    const loadingMessage = isIdChanged ? "Actualizando categoria y migrando archivos..." : `Actualizando categoria ${newCat.name}...`;

    const loadingModal = Modal.showLoading(loadingMessage);

    try {
      const { Base64 } = await import("../utils/base64.js");
      const template = this._generateCategoryTemplate(newCat);
      const base64Content = Base64.encode(template);

      if (isIdChanged) {
        this.data.resources.forEach((res) => {
          if (res.category === oldId) {
            res.category = newCat.id;
          }
        });

        await GitHubAPI.createFile(REPOS.site, `academico/${newCat.id}/index.html`, base64Content, `Migrate category: ${oldId} -> ${newCat.id}`);

        try {
          const fileData = await GitHubAPI.getFile(REPOS.site, `academico/${oldId}/index.html`);
          await GitHubAPI.deleteFile(REPOS.site, `academico/${oldId}/index.html`, `Remove migrated category: ${oldId}`, fileData.sha);
        } catch (e) {
          console.warn(`Could not delete old file academico/${oldId}/index.html:`, e);
        }
      } else {
        try {
          const fileData = await GitHubAPI.getFile(REPOS.site, `academico/${newCat.id}/index.html`);
          await GitHubAPI.updateFile(REPOS.site, `academico/${newCat.id}/index.html`, base64Content, `Update category template: ${newCat.name}`, fileData.sha);
        } catch (e) {
          if (e.message.includes("404") || e.message.includes("Not Found")) {
            await GitHubAPI.createFile(REPOS.site, `academico/${newCat.id}/index.html`, base64Content, `Create category template: ${newCat.name}`);
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
      Modal.showError(`Error en actualizacion de categoria: ${e.message}`);
    }
  },

  _generateCategoryTemplate(cat) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Academico | Berrueta</title>
  <link rel="stylesheet" href="/src/css/styles.css">
</head>
<body>
  <main class="main-content">
    <section style="max-width: 800px; margin: 0 auto; padding: 2rem 1rem;">
      <a href="/academico/">Volver a categorias</a>
      <h1>${cat.name}</h1>
      <p>${cat.description}</p>
      <div id="resources-container" data-category="${cat.id}"></div>
    </section>
  </main>
  <script type="module" src="/src/js/main.js"></script>
  <script type="module" src="/src/js/academico.js"></script>
</body>
</html>`;
  },

  async createCategoryAndSave(formData) {
    const loadingModal = Modal.showLoading(`Creando categoria ${formData.id}...`);
    try {
      const template = this._generateCategoryTemplate(formData);
      const { Base64 } = await import("../utils/base64.js");
      const base64Content = Base64.encode(template);
      await GitHubAPI.createFile(REPOS.site, `academico/${formData.id}/index.html`, base64Content, `Crear categoria: ${formData.name}`);

      this.data.categories.push(formData);
      Modal.close(loadingModal);
      this.saveData();
      Sitemap.update();
    } catch (e) {
      Modal.close(loadingModal);
      Modal.showError(`Error al crear la categoria: ${e.message}`);
    }
  },

  deleteCategory(id) {
    Modal.showConfirm(`Eliminar la categoria "${id}" y su pagina del sitio?`, async () => {
      const path = `academico/${id}/index.html`;
      const loadingModal = Modal.showLoading(`Eliminando categoria ${id}...`);
      try {
        const fileData = await GitHubAPI.getFile(REPOS.site, path);
        await GitHubAPI.deleteFile(REPOS.site, path, `Eliminar categoria: ${id}`, fileData.sha);
      } catch (e) {
        if (!e.message.includes("404") && !e.message.includes("Not Found")) {
          Modal.close(loadingModal);
          Modal.showError(`Error al eliminar el archivo del sitio: ${e.message}`);
          return;
        }
      }
      this.data.categories = this.data.categories.filter((c) => c.id !== id);
      Modal.close(loadingModal);
      this.saveData();
      Sitemap.update();
    });
  },

  showResourceModal(index = null) {
    if (index === null || Number.isNaN(index)) {
      window.location.hash = "#/academico/nuevo";
      return;
    }
    window.location.hash = `#/academico/editar/${index}`;
  },

  _wizardFieldValue(field) {
    return this.wizard?.data?.[field] ?? "";
  },
  _renderWizardProgress() {
    return `
      <div class="wizard-progress">
        ${WIZARD_STEPS.map((step) => {
          const current = this.wizard.step === step.id;
          const done = this.wizard.step > step.id;
          return `
            <div class="wizard-progress-step ${current ? "is-current" : ""} ${done ? "is-done" : ""}">
              <span>${step.id}</span>
              <small>${step.label}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  },

  _renderWizardStep1() {
    const catOptions = this.data.categories
      .map((c) => `<option value="${escapeHtml(c.id)}" ${this._wizardFieldValue("category") === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`)
      .join("");

    return `
      <div class="wizard-grid wizard-grid-2">
        <div class="form-group">
          <label for="wizard-type">Tipo <span class="text-danger">*</span></label>
          <select id="wizard-type" class="form-control" data-wizard-field="type">
            <option value="link" ${this._wizardFieldValue("type") === "link" ? "selected" : ""}>Enlace Externo</option>
            <option value="pdf" ${this._wizardFieldValue("type") === "pdf" ? "selected" : ""}>Archivo (PDF/Epub)</option>
            <option value="texto" ${this._wizardFieldValue("type") === "texto" ? "selected" : ""}>Texto / Articulo</option>
          </select>
          <div class="wizard-error" data-error-for="type"></div>
        </div>

        <div class="form-group">
          <label for="wizard-category">Categoria <span class="text-danger">*</span></label>
          <select id="wizard-category" class="form-control" data-wizard-field="category">
            ${catOptions}
          </select>
          <div class="wizard-error" data-error-for="category"></div>
        </div>
      </div>

      <div class="form-group">
        <label for="wizard-title">Titulo <span class="text-danger">*</span></label>
        <input id="wizard-title" class="form-control" data-wizard-field="title" value="${escapeHtml(this._wizardFieldValue("title"))}" placeholder="Ej: Compendio de funciones">
        <div class="wizard-error" data-error-for="title"></div>
      </div>
    `;
  },

  _renderWizardStep2() {
    const groups = [...new Set(this.data.resources.map((r) => r.group).filter(Boolean))];
    const subgroups = [...new Set(this.data.resources.map((r) => r.subgroup).filter(Boolean))];

    return `
      <div class="wizard-grid wizard-grid-2">
        <div class="form-group">
          <label for="wizard-group">Grupo <span class="text-danger">*</span></label>
          <input id="wizard-group" class="form-control" data-wizard-field="group" list="wizard-group-list" value="${escapeHtml(this._wizardFieldValue("group"))}" placeholder="Ej: 1er ano">
          <datalist id="wizard-group-list">
            ${groups.map((g) => `<option value="${escapeHtml(g)}"></option>`).join("")}
          </datalist>
          <div class="wizard-error" data-error-for="group"></div>
        </div>

        <div class="form-group">
          <label for="wizard-subgroup">Subgrupo</label>
          <input id="wizard-subgroup" class="form-control" data-wizard-field="subgroup" list="wizard-subgroup-list" value="${escapeHtml(this._wizardFieldValue("subgroup"))}" placeholder="Ej: Quimica CFE">
          <datalist id="wizard-subgroup-list">
            ${subgroups.map((s) => `<option value="${escapeHtml(s)}"></option>`).join("")}
          </datalist>
          <div class="wizard-error" data-error-for="subgroup"></div>
        </div>
      </div>

      <div class="form-group">
        <label for="wizard-tags">Tags (separadas por coma)</label>
        <input id="wizard-tags" class="form-control" data-wizard-field="tags" value="${escapeHtml(this._wizardFieldValue("tags"))}" placeholder="ej: algebra, parcial, ejercicios">
        <div class="wizard-error" data-error-for="tags"></div>
      </div>

      <div class="form-group">
        <label for="wizard-description">Descripcion breve <span class="text-danger">*</span></label>
        <textarea id="wizard-description" class="form-control" data-wizard-field="description" rows="4" placeholder="Describe de forma clara para que sirve este recurso">${escapeHtml(this._wizardFieldValue("description"))}</textarea>
        <div class="wizard-error" data-error-for="description"></div>
      </div>
    `;
  },

  _renderWizardStep3() {
    const type = this._wizardFieldValue("type");
    const isEdit = this.wizard.mode === "edit";
    const originalType = this.wizard.originalResource?.type;
    const originalUrl = this.wizard.originalResource?.url || this._wizardFieldValue("url") || "";

    if (type === "link") {
      return `
        <div class="form-group">
          <label for="wizard-url">URL del recurso <span class="text-danger">*</span></label>
          <input id="wizard-url" class="form-control" data-wizard-field="url" value="${escapeHtml(this._wizardFieldValue("url"))}" placeholder="https://... o /academico/...">
          <small class="text-muted">Acepta enlaces externos (http/https) o rutas internas que empiecen con <code>/</code>.</small>
          <div class="wizard-error" data-error-for="url"></div>
        </div>
      `;
    }

    if (type === "pdf") {
      const isNativePdfEdit = isEdit && originalType === "pdf";
      const showReplaceToggle = isNativePdfEdit;
      const needsFileField = !isNativePdfEdit || this._wizardFieldValue("replaceFile");

      return `
        ${showReplaceToggle ? `
          <div class="card" style="padding:0.75rem; margin-bottom:1rem;">
            <div style="font-size:0.9rem;"><strong>Archivo actual:</strong> ${escapeHtml(originalUrl || "(sin URL)")}</div>
            <label style="display:block; margin-top:0.6rem; font-weight:500;">
              <input type="checkbox" data-wizard-field="replaceFile" ${this._wizardFieldValue("replaceFile") ? "checked" : ""}> Reemplazar archivo
            </label>
          </div>
        ` : ""}

        ${needsFileField ? `
          <div class="form-group">
            <label for="wizard-file">Subir archivo (.pdf, .epub) <span class="text-danger">*</span></label>
            <input id="wizard-file" type="file" class="form-control-file" accept=".pdf,.epub" data-wizard-file-input>
            <div class="text-muted" style="font-size:0.82rem; margin-top:0.4rem;" id="wizard-file-selected">${this.wizard.selectedFile ? `Archivo elegido: ${escapeHtml(this.wizard.selectedFile.name)}` : ""}</div>
            <div class="wizard-error" data-error-for="file"></div>
          </div>
        ` : ""}
      `;
    }

    const isNativeTextEdit = isEdit && originalType === "texto";
    const showReplaceToggle = isNativeTextEdit;
    const needsContentField = !isNativeTextEdit || this._wizardFieldValue("replaceContent");

    return `
      ${showReplaceToggle ? `
        <div class="card" style="padding:0.75rem; margin-bottom:1rem;">
          <div style="font-size:0.9rem;"><strong>Articulo actual:</strong> ${escapeHtml(originalUrl || "(sin URL)")}</div>
          <label style="display:block; margin-top:0.6rem; font-weight:500;">
            <input type="checkbox" data-wizard-field="replaceContent" ${this._wizardFieldValue("replaceContent") ? "checked" : ""}> Reemplazar contenido del articulo
          </label>
        </div>
      ` : ""}

      ${needsContentField ? `
        <div class="form-group">
          <label for="wizard-content">Contenido del articulo <span class="text-danger">*</span></label>
          <textarea id="wizard-content" rows="12" class="form-control" data-wizard-field="content" placeholder="Escribi el contenido en texto o HTML">${escapeHtml(this._wizardFieldValue("content"))}</textarea>
          <div class="wizard-error" data-error-for="content"></div>
        </div>
      ` : ""}
    `;
  },

  _renderWizardStep4() {
    const d = this.wizard.data;
    const tags = (d.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const catName = this.data.categories.find((c) => c.id === d.category)?.name || d.category || "-";

    const contentSummary = d.type === "link"
      ? d.url
      : d.type === "pdf"
        ? (this.wizard.selectedFile ? `Archivo listo para subir: ${this.wizard.selectedFile.name}` : (d.url || this.wizard.originalResource?.url || "Archivo existente"))
        : ((d.content || "").trim() ? "Contenido listo para publicar" : (this.wizard.originalResource?.url || "Contenido existente"));

    return `
      <div class="card" style="padding:1rem;">
        <h4 style="margin-bottom:0.75rem;">Resumen antes de guardar</h4>
        <div class="wizard-review-grid">
          <div><strong>Titulo</strong><br>${escapeHtml(d.title || "-")}</div>
          <div><strong>Categoria</strong><br>${escapeHtml(catName)}</div>
          <div><strong>Grupo</strong><br>${escapeHtml(d.group || "-")}</div>
          <div><strong>Subgrupo</strong><br>${escapeHtml(d.subgroup || "-")}</div>
          <div><strong>Tipo</strong><br>${escapeHtml(RESOURCE_TYPE_LABELS[d.type] || d.type || "-")}</div>
          <div><strong>Contenido</strong><br>${escapeHtml(contentSummary)}</div>
        </div>

        <div style="margin-top:1rem;">
          <strong>Descripcion</strong>
          <p style="margin-top:0.25rem;">${escapeHtml(d.description || "-")}</p>
        </div>

        <div style="margin-top:1rem;">
          <strong>Tags</strong>
          <div style="margin-top:0.35rem;">
            ${tags.length ? tags.map((tag) => `<span class="type-pill" style="margin-right:0.25rem;">${escapeHtml(tag)}</span>`).join("") : "<span class=\"text-muted\">Sin tags</span>"}
          </div>
        </div>
      </div>
    `;
  },

  _renderWizardStepBody() {
    if (this.wizard.step === 1) return this._renderWizardStep1();
    if (this.wizard.step === 2) return this._renderWizardStep2();
    if (this.wizard.step === 3) return this._renderWizardStep3();
    return this._renderWizardStep4();
  },

  _renderWizardView(container) {
    const isEdit = this.wizard.mode === "edit";
    const title = isEdit ? "Editar recurso" : "Nuevo recurso";
    const subtitle = isEdit
      ? "Actualiza datos del recurso en pasos cortos y claros."
      : "Crea un recurso nuevo de forma guiada, sin perder contexto.";

    const restoredBanner = this.wizard.restoredAt
      ? `<div class="autosave-banner" style="margin-bottom:0.75rem;">Borrador restaurado ${Autosave.timeAgo(this.wizard.restoredAt)}.</div>`
      : "";

    container.innerHTML = `
      <div class="academic-wizard-page card">
        <div class="academic-wizard-header">
          <div>
            <h3 style="margin-bottom:0.25rem;">${title}</h3>
            <p class="text-muted" style="margin:0;">${subtitle}</p>
          </div>
          <div class="academic-wizard-actions">
            ${this.wizard.restoredAt ? `<button id="wizard-discard-draft" class="btn btn-danger btn-sm">Descartar borrador</button>` : ""}
            <button id="wizard-back-list" class="btn btn-outline">Volver al listado</button>
          </div>
        </div>

        ${restoredBanner}
        ${this._renderWizardProgress()}

        <form id="resource-wizard-form" style="margin-top:1rem;">
          <div id="wizard-step-content">
            ${this._renderWizardStepBody()}
          </div>

          <div class="academic-wizard-footer">
            <button type="button" id="wizard-cancel" class="btn btn-secondary">Cancelar</button>
            <div style="display:flex; gap:0.5rem;">
              ${this.wizard.step > 1 ? '<button type="button" id="wizard-prev" class="btn btn-outline">Atras</button>' : ""}
              ${this.wizard.step < 4 ? '<button type="button" id="wizard-next" class="btn btn-primary">Siguiente</button>' : '<button type="button" id="wizard-save" class="btn btn-primary">Guardar recurso</button>'}
            </div>
          </div>
        </form>
      </div>
    `;

    this._bindWizardEvents(container);
    this._renderWizardErrors(this.wizard.errors);
  },

  _bindWizardEvents(container) {
    container.querySelector("#wizard-back-list")?.addEventListener("click", () => this._attemptWizardExit());
    container.querySelector("#wizard-cancel")?.addEventListener("click", () => this._attemptWizardExit());
    container.querySelector("#wizard-discard-draft")?.addEventListener("click", () => this._discardWizardDraft());

    container.querySelector("#wizard-prev")?.addEventListener("click", () => {
      this.wizard.step = Math.max(1, this.wizard.step - 1);
      this.wizard.errors = {};
      this._persistWizardDraft();
      this.renderCurrentView();
    });

    container.querySelector("#wizard-next")?.addEventListener("click", () => {
      const errors = this._validateWizardStep(this.wizard.step);
      this.wizard.errors = errors;
      this._renderWizardErrors(errors);
      if (Object.keys(errors).length > 0) return;

      this.wizard.step = Math.min(4, this.wizard.step + 1);
      this.wizard.errors = {};
      this._persistWizardDraft();
      this.renderCurrentView();
    });

    container.querySelector("#wizard-save")?.addEventListener("click", () => this._saveWizardResource());

    container.querySelectorAll("[data-wizard-field]").forEach((input) => {
      const field = input.dataset.wizardField;
      const eventName = input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input";

      input.addEventListener(eventName, (event) => {
        const value = input.type === "checkbox" ? event.target.checked : event.target.value;
        this.wizard.data[field] = value;
        this.wizard.isDirty = true;

        if (field === "type" || field === "replaceFile" || field === "replaceContent") {
          this.wizard.errors = {};
          this._persistWizardDraft();
          this.renderCurrentView();
          return;
        }

        const stepErrors = this._validateWizardStep(this.wizard.step);
        this.wizard.errors = stepErrors;
        this._renderWizardErrors(stepErrors);
        this._persistWizardDraft();
      });
    });

    const fileInput = container.querySelector("[data-wizard-file-input]");
    if (fileInput) {
      fileInput.addEventListener("change", (event) => {
        this.wizard.selectedFile = event.target.files.length ? event.target.files[0] : null;
        this.wizard.isDirty = true;
        const selectedLabel = container.querySelector("#wizard-file-selected");
        if (selectedLabel) {
          selectedLabel.textContent = this.wizard.selectedFile ? `Archivo elegido: ${this.wizard.selectedFile.name}` : "";
        }

        const stepErrors = this._validateWizardStep(this.wizard.step);
        this.wizard.errors = stepErrors;
        this._renderWizardErrors(stepErrors);
        this._persistWizardDraft();
      });
    }
  },

  _renderWizardErrors(errors = {}) {
    const content = document.getElementById("wizard-step-content");
    if (!content) return;

    content.querySelectorAll(".wizard-error").forEach((el) => {
      el.textContent = "";
    });

    Object.entries(errors).forEach(([field, message]) => {
      const errorEl = content.querySelector(`[data-error-for="${field}"]`);
      if (errorEl) errorEl.textContent = message;
    });
  },

  _validateWizardStep(step) {
    if (!this.wizard) return {};

    const errors = {};
    const d = this.wizard.data;
    const isEdit = this.wizard.mode === "edit";
    const originalType = this.wizard.originalResource?.type;

    if (step === 1) {
      if (!d.type) errors.type = "Selecciona un tipo de recurso.";
      if (!d.category) errors.category = "Selecciona una categoria.";
      if (!d.title || !d.title.trim()) errors.title = "El titulo es obligatorio.";
      return errors;
    }

    if (step === 2) {
      if (!d.group || !d.group.trim()) errors.group = "El grupo es obligatorio.";
      if (!d.description || !d.description.trim()) errors.description = "La descripcion es obligatoria.";
      return errors;
    }

    if (step === 3) {
      if (d.type === "link") {
        if (!d.url || !d.url.trim()) {
          errors.url = "Ingresa una URL para el enlace.";
        } else if (!this._isValidResourceUrl(d.url.trim())) {
          errors.url = "Usa una URL valida (http/https) o una ruta interna que empiece con /.";
        }
      }

      if (d.type === "pdf") {
        const nativePdfEdit = isEdit && originalType === "pdf";
        const needsFile = !nativePdfEdit || !!d.replaceFile;

        if (needsFile && !this.wizard.selectedFile) {
          errors.file = "Selecciona un archivo PDF o EPUB.";
        }

        if (this.wizard.selectedFile && !/\.(pdf|epub)$/i.test(this.wizard.selectedFile.name)) {
          errors.file = "Solo se permiten archivos .pdf o .epub.";
        }

        if (!needsFile && !(this.wizard.originalResource?.url || d.url)) {
          errors.file = "Este recurso no tiene archivo asociado. Selecciona uno nuevo.";
        }
      }

      if (d.type === "texto") {
        const nativeTextEdit = isEdit && originalType === "texto";
        const needsContent = !nativeTextEdit || !!d.replaceContent;

        if (needsContent && (!d.content || !d.content.trim())) {
          errors.content = "Escribe el contenido del articulo.";
        }

        if (!needsContent && !(this.wizard.originalResource?.url || d.url)) {
          errors.content = "Este articulo no tiene URL asociada. Debes reemplazar su contenido.";
        }
      }

      return errors;
    }

    return errors;
  },

  _validateWizardAll() {
    return {
      ...this._validateWizardStep(1),
      ...this._validateWizardStep(2),
      ...this._validateWizardStep(3)
    };
  },

  _isValidResourceUrl(url) {
    if (!url) return false;
    if (/^https?:\/\/[^\s]+$/i.test(url)) return true;
    if (/^\/[^\s]*$/.test(url)) return true;
    return false;
  },

  _attemptWizardExit() {
    if (this.wizard?.isDirty) {
      const confirmLeave = window.confirm("Tenes cambios sin guardar. Queres salir del wizard?");
      if (!confirmLeave) return;
    }

    this.wizard = null;
    this._clearWizardGuards();
    window.location.hash = "#/academico";
  },

  async _uploadPdfFile(file) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `academico/${cleanName}`;
    const { Base64 } = await import("../utils/base64.js");
    const base64Content = await Base64.encodeFile(file);

    try {
      await GitHubAPI.createFile(REPOS.site, path, base64Content, `Upload recurso: ${file.name}`);
    } catch (err) {
      if (err.message.includes("already exists")) {
        const existing = await GitHubAPI.getFile(REPOS.site, path);
        await GitHubAPI.updateFile(REPOS.site, path, base64Content, `Update recurso: ${file.name}`, existing.sha);
      } else {
        throw err;
      }
    }

    return `/${path}`;
  },

  _buildTextResourceHtml(baseData, contentHtml) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseData.title} | Academico</title>
  <link rel="stylesheet" href="/src/css/styles.css">
</head>
<body>
  <main class="main-content">
    <article style="max-width: 800px; margin: 0 auto; padding: 2rem 1rem;">
      <a href="/academico/">&larr; Volver a Academico</a>
      <h1>${baseData.title}</h1>
      <p style="color:#666;">Recurso de ${baseData.category} | ${baseData.group}${baseData.subgroup ? ` | ${baseData.subgroup}` : ""}</p>
      <div>${contentHtml.replace(/\n/g, "<br>")}</div>
    </article>
  </main>
  <script type="module" src="/src/js/main.js"></script>
</body>
</html>`;
  },

  async _upsertTextResource(baseData, content) {
    let path;
    const isEdit = this.wizard.mode === "edit";
    const originalUrl = this.wizard.originalResource?.url || "";

    if (isEdit && this.wizard.originalResource?.type === "texto" && /^\/academico\/recursos\/.+\.html$/i.test(originalUrl)) {
      path = originalUrl.replace(/^\//, "");
    } else {
      const slug = slugify(baseData.title) || `recurso-${Date.now()}`;
      path = `academico/recursos/${slug}.html`;
    }

    const template = this._buildTextResourceHtml(baseData, content);
    const { Base64 } = await import("../utils/base64.js");
    const base64Content = Base64.encode(template);

    try {
      const existing = await GitHubAPI.getFile(REPOS.site, path);
      await GitHubAPI.updateFile(REPOS.site, path, base64Content, `Actualizar articulo: ${baseData.title}`, existing.sha);
    } catch (err) {
      if (err.message.includes("404") || err.message.includes("Not Found")) {
        await GitHubAPI.createFile(REPOS.site, path, base64Content, `Crear articulo: ${baseData.title}`);
      } else {
        throw err;
      }
    }

    return `/${path}`;
  },

  async _saveWizardResource() {
    const allErrors = this._validateWizardAll();
    if (Object.keys(allErrors).length > 0) {
      this.wizard.errors = allErrors;

      if (allErrors.type || allErrors.category || allErrors.title) this.wizard.step = 1;
      else if (allErrors.group || allErrors.description) this.wizard.step = 2;
      else this.wizard.step = 3;

      this.renderCurrentView();
      return;
    }

    const loadingModal = Modal.showLoading("Guardando recurso...");

    try {
      const d = this.wizard.data;
      const baseData = {
        title: d.title.trim(),
        category: d.category,
        group: d.group.trim(),
        subgroup: d.subgroup.trim(),
        type: d.type,
        description: d.description.trim(),
        tags: d.tags
          ? d.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : []
      };

      let finalUrl = (d.url || "").trim();

      if (d.type === "link") {
        finalUrl = d.url.trim();
      } else if (d.type === "pdf") {
        const nativePdfEdit = this.wizard.mode === "edit" && this.wizard.originalResource?.type === "pdf";
        const needsFile = !nativePdfEdit || !!d.replaceFile;
        finalUrl = needsFile
          ? await this._uploadPdfFile(this.wizard.selectedFile)
          : (this.wizard.originalResource?.url || d.url || "");
      } else if (d.type === "texto") {
        const nativeTextEdit = this.wizard.mode === "edit" && this.wizard.originalResource?.type === "texto";
        const needsContent = !nativeTextEdit || !!d.replaceContent;

        finalUrl = needsContent
          ? await this._upsertTextResource(baseData, d.content.trim())
          : (this.wizard.originalResource?.url || d.url || "");
      }

      baseData.url = finalUrl;

      if (this.wizard.mode === "edit") {
        this.data.resources[this.wizard.editIndex] = baseData;
      } else {
        this.data.resources.push(baseData);
      }

      Autosave.remove(this.wizard.draftKey);
      this.wizard.isDirty = false;
      this.wizard.errors = {};

      await this.saveData({ rerender: false });

      Modal.close(loadingModal);
      this.wizard = null;
      this._clearWizardGuards();
      window.location.hash = "#/academico";
    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(`No se pudo guardar el recurso: ${error.message}`);
    }
  },
  deleteResource(index) {
    const res = this.data.resources[index];
    Modal.showConfirm(`Eliminar el recurso ${res.title}?`, () => {
      this.data.resources.splice(index, 1);
      this.saveData();
    });
  },

  duplicateResource(index) {
    const res = this.data.resources[index];
    const copy = { ...res, title: `${res.title} (copia)` };
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
    Modal.showConfirm(`Eliminar los ${this.selectedIndices.size} recursos seleccionados?`, () => {
      const indices = Array.from(this.selectedIndices).sort((a, b) => b - a);
      indices.forEach((index) => {
        this.data.resources.splice(index, 1);
      });
      this.selectedIndices.clear();
      this.saveData();
    });
  },

  showBulkEditModal() {
    const catOptions = [{ value: "", label: "-- Sin cambio --" }, ...this.data.categories.map((c) => ({ value: c.id, label: c.name }))];
    const typeOptions = [
      { value: "", label: "-- Sin cambio --" },
      { value: "link", label: "Enlace Externo" },
      { value: "pdf", label: "Archivo (PDF/Epub)" },
      { value: "texto", label: "Texto / Articulo" }
    ];

    const allGroups = [...new Set(this.data.resources.map((r) => r.group).filter(Boolean))].sort();
    const allSubgroups = [...new Set(this.data.resources.map((r) => r.subgroup).filter(Boolean))].sort();

    const overlay = Modal.create(
      `Edicion Masiva (${this.selectedIndices.size} recursos)`,
      `
        <form id="bulk-form">
          <p class="text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">Deja en blanco los campos que no quieras modificar.</p>

          <div style="display:flex; gap:1rem;">
            <div style="flex:1;">
              ${Form.renderField({ id: "bulk-category", label: "Categoria", value: "", type: "select", options: catOptions })}
            </div>
            <div style="flex:1;">
               ${Form.renderField({ id: "bulk-type", label: "Tipo", value: "", type: "select", options: typeOptions })}
            </div>
          </div>

          <div style="display:flex; gap:1rem;">
            <div class="form-group" style="flex:1;">
              <label for="bulk-group">Grupo</label>
              <input type="text" id="bulk-group" class="form-control" list="bulk-group-list" placeholder="-- Sin cambio --">
              <datalist id="bulk-group-list">
                ${allGroups.map((g) => `<option value="${escapeHtml(g)}"></option>`).join("")}
              </datalist>
            </div>
            <div class="form-group" style="flex:1;">
              <label for="bulk-subgroup">Subgrupo</label>
              <input type="text" id="bulk-subgroup" class="form-control" list="bulk-sub-list" placeholder="-- Sin cambio --">
              <datalist id="bulk-sub-list">
                ${allSubgroups.map((s) => `<option value="${escapeHtml(s)}"></option>`).join("")}
              </datalist>
            </div>
          </div>

          ${Form.renderField({ id: "bulk-description", label: "Descripcion", value: "", type: "textarea", rows: 2, placeholder: "-- Sin cambio --" })}

          <div style="display:flex; gap:1rem; align-items:flex-end;">
            <div style="flex:2;">
              ${Form.renderField({ id: "bulk-tags", label: "Tags (separados por coma)", value: "", type: "text", placeholder: "-- Sin cambio --" })}
            </div>
            <div style="flex:1; margin-bottom: 1rem;">
               <label><input type="radio" name="tags-mode" value="append" checked> Agregar</label><br>
               <label><input type="radio" name="tags-mode" value="overwrite"> Sobrescribir</label>
            </div>
          </div>

          <div style="display:flex; gap:1rem;">
            <div style="flex:1;">
              ${Form.renderField({ id: "bulk-prefix", label: "Prefijo de titulo", value: "", type: "text", placeholder: "Ej: [Unidad 1] " })}
            </div>
            <div style="flex:1;">
              ${Form.renderField({ id: "bulk-suffix", label: "Sufijo de titulo", value: "", type: "text", placeholder: " Ej: (Actualizado)" })}
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
        suffix: form.querySelector("#bulk-suffix").value
      };

      Modal.close(overlay);
      this.applyBulkEdit(changes);
    });
  },

  applyBulkEdit(changes) {
    const indices = Array.from(this.selectedIndices);

    let newTags = [];
    if (changes.tags) {
      newTags = changes.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    indices.forEach((index) => {
      const res = this.data.resources[index];

      if (changes.category) res.category = changes.category;
      if (changes.type) res.type = changes.type;
      if (changes.group) res.group = changes.group;
      if (changes.subgroup) res.subgroup = changes.subgroup;
      if (changes.description) res.description = changes.description;

      if (changes.tags) {
        if (changes.tagsMode === "overwrite") {
          res.tags = [...newTags];
        } else {
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
    this.data.resources.forEach((res) => {
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
    this.data.resources.forEach((res) => {
      if (res.subgroup === oldName) {
        res.subgroup = newName;
        modified = true;
      }
    });
    if (modified) this.saveData();
  },

  exportData() {
    const json = JSON.stringify(this.data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  },

  importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.categories || !parsed.resources) throw new Error('El JSON debe tener "categories" y "resources".');
        const cats = parsed.categories.length;
        const res = parsed.resources.length;
        Modal.showConfirm(`Reemplazar los datos actuales con ${cats} categorias y ${res} recursos del archivo?`, async () => {
          this.data = parsed;
          await this.saveData();
        });
      } catch (err) {
        Modal.showError(`JSON invalido: ${err.message}`);
      }
    };
    input.click();
  }
};
