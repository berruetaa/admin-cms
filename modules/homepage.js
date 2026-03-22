import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { Form } from "../components/form.js";
import { PreviewGenerator } from "../utils/preview-generator.js";

const FILE_NAME = "homepage.json";

export const Homepage = {
  data: { hero: {}, cta: [], sections: [] },

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestión de Homepage</h2>
        <div class="header-actions">
           <button id="btn-preview-homepage" class="btn btn-outline" style="border-color:var(--color-accent); color:var(--color-accent);">👁️ Vista Previa</button>
           <button id="btn-export-homepage" class="btn btn-outline">Exportar JSON</button>
           <button id="btn-import-homepage" class="btn btn-outline">Importar JSON</button>
           <button id="btn-save-homepage" class="btn btn-primary" disabled>Guardar Cambios</button>
        </div>
      </div>
      <div id="homepage-content">
        <div class="loading-spinner"></div> Cargando datos...
      </div>
    `;

    document.getElementById('btn-save-homepage').addEventListener('click', () => this.saveData());
    document.getElementById("btn-export-homepage").addEventListener("click", () => this.exportData());
    document.getElementById("btn-import-homepage").addEventListener("click", () => this.importData());
    document.getElementById("btn-preview-homepage").addEventListener("click", () => {
        const html = PreviewGenerator.homepage(this.data);
        Modal.showPreview("Página de Inicio", html);
    });

    await this.loadData();
  },

  async loadData() {
    const contentDiv = document.getElementById("homepage-content");
    const saveBtn = document.getElementById("btn-save-homepage");

    try {
      if (REPOS.gists.academico === "YOUR_GIST_ID_HERE") {
        contentDiv.innerHTML = `<div class="alert alert-info">Configure el GIST ID en config/repos.js para cargar los datos.</div>`;
        return;
      }

      const gist = await GitHubAPI.getGist(REPOS.gists.academico);
      const file = gist.files[FILE_NAME];

      if (!file) {
          // Initialize empty if it doesn't exist yet but gist exists
          this.data = { hero: { tagline: "", bio: "" }, cta: [], sections: [] };
      } else {
          this.data = JSON.parse(file.content);
      }
      
      this.renderContent(contentDiv);
      saveBtn.disabled = false;
    } catch (error) {
      contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  renderContent(container) {
    container.innerHTML = `
      <div class="dashboard-grid" style="grid-template-columns: 1fr;">
        <!-- Hero Section -->
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Hero Section</h3>
                <button id="btn-edit-hero" class="btn btn-sm btn-outline">Editar</button>
            </div>
            <p><strong>Tagline:</strong> ${this.data.hero?.tagline || '<em>Vacío</em>'}</p>
            <p style="white-space: pre-wrap; font-size: 0.9rem; color: #555;">${this.data.hero?.bio || '<em>Vacío</em>'}</p>
        </div>

        <!-- CTAs Section -->
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <h3>Botones CTA</h3>
                <button id="btn-add-cta" class="btn btn-sm btn-secondary">Agregar Botón</button>
            </div>
            <table class="table">
                <thead><tr><th>Label</th><th>URL</th><th>Primario</th><th>Acciones</th></tr></thead>
                <tbody id="tbody-ctas"></tbody>
            </table>
        </div>

        <!-- Sections -->
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <h3>Secciones de Teasers</h3>
                <button id="btn-add-section" class="btn btn-sm btn-secondary">Agregar Sección</button>
            </div>
            <div id="sections-accordion"></div>
        </div>
      </div>
    `;

    this._bindHeroEvents();
    this.renderCTAs();
    this.renderSections();
  },

  _bindHeroEvents() {
      document.getElementById('btn-edit-hero').addEventListener('click', () => {
          const overlay = Modal.create("Editar Hero", `
            <form id="hero-form">
                ${Form.renderField({ id: "tagline", label: "Tagline", value: this.data.hero?.tagline || '', required: true, type: "text" })}
                ${Form.renderField({ id: "bio", label: "Biografía", value: this.data.hero?.bio || '', required: true, type: "textarea", rows: 5 })}
            </form>
          `, `
            <button class="btn btn-secondary" id="hero-cancel">Cancelar</button>
            <button class="btn btn-primary" id="hero-save">Guardar Temporal</button>
          `);

          overlay.querySelector('#hero-cancel').addEventListener('click', () => Modal.close(overlay));
          overlay.querySelector('#hero-save').addEventListener('click', () => {
              const form = overlay.querySelector('#hero-form');
              if(!form.checkValidity()) { form.reportValidity(); return; }
              
              if(!this.data.hero) this.data.hero = {};
              this.data.hero.tagline = form.querySelector('#tagline').value;
              this.data.hero.bio = form.querySelector('#bio').value;
              
              Modal.close(overlay);
              this.renderContent(document.getElementById("homepage-content"));
          });
      });
  },

  renderCTAs() {
      const tbody = document.getElementById('tbody-ctas');
      if (!tbody) return;

      if (!this.data.cta || this.data.cta.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Sin botones configurados.</td></tr>`;
      } else {
          tbody.innerHTML = this.data.cta.map((cta, i) => `
              <tr>
                 <td>${cta.label}</td>
                 <td>${cta.url}</td>
                 <td>${cta.primary ? 'Sí' : 'No'}</td>
                 <td class="actions">
                     <button class="btn btn-sm btn-outline btn-edit-cta" data-index="${i}">Editar</button>
                     <button class="btn btn-sm btn-outline btn-del-cta" data-index="${i}" style="color:var(--color-error); border-color:var(--color-error);">Borrar</button>
                 </td>
              </tr>
          `).join('');

          tbody.querySelectorAll('.btn-edit-cta').forEach(btn => btn.addEventListener('click', e => this.showCTAModal(e.currentTarget.dataset.index)));
          tbody.querySelectorAll('.btn-del-cta').forEach(btn => btn.addEventListener('click', e => {
              this.data.cta.splice(e.currentTarget.dataset.index, 1);
              this.renderCTAs();
          }));
      }

      document.getElementById('btn-add-cta').onclick = () => this.showCTAModal();
  },

  showCTAModal(index = null) {
      const isEdit = index !== null;
      const cta = isEdit ? this.data.cta[index] : { label: '', url: '', primary: false };

      const overlay = Modal.create(isEdit ? "Editar CTA" : "Nuevo CTA", `
        <form id="cta-form">
            ${Form.renderField({ id: "label", label: "Texto", value: cta.label, required: true, type: "text" })}
            ${Form.renderField({ id: "url", label: "URL", value: cta.url, required: true, type: "text" })}
            <div class="form-group" style="display:flex; align-items:center; gap:0.5rem; margin-top:1rem;">
                <input type="checkbox" id="primary" ${cta.primary ? 'checked' : ''}>
                <label for="primary" style="margin:0;">Botón Principal (Destacado)</label>
            </div>
        </form>
      `, `
        <button class="btn btn-secondary" id="cta-cancel">Cancelar</button>
        <button class="btn btn-primary" id="cta-save">Guardar Temporal</button>
      `);

      overlay.querySelector('#cta-cancel').addEventListener('click', () => Modal.close(overlay));
      overlay.querySelector('#cta-save').addEventListener('click', () => {
          const form = overlay.querySelector('#cta-form');
          if(!form.checkValidity()) { form.reportValidity(); return; }

          const finalCta = {
              label: form.querySelector('#label').value.trim(),
              url: form.querySelector('#url').value.trim(),
              primary: form.querySelector('#primary').checked
          };

          if(!this.data.cta) this.data.cta = [];
          if (isEdit) this.data.cta[index] = finalCta;
          else this.data.cta.push(finalCta);

          Modal.close(overlay);
          this.renderCTAs();
      });
  },

  renderSections() {
      const container = document.getElementById('sections-accordion');
      if (!container) return;

      if (!this.data.sections || this.data.sections.length === 0) {
          container.innerHTML = `<p class="text-muted" style="text-align:center;">No hay secciones configuradas aportando contenido.</p>`;
      } else {
          container.innerHTML = this.data.sections.map((sec, i) => `
              <div class="card" style="margin-bottom: 0.5rem; border-left: 4px solid var(--color-accent); padding: 1rem;">
                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                     <h4 style="margin:0;">${sec.title} <span class="text-muted" style="font-size:0.8rem; font-weight:normal;">(${sec.subtitle})</span></h4>
                     <div class="actions">
                         <button class="btn btn-sm btn-outline btn-add-item" data-sec="${i}">+ Item</button>
                         <button class="btn btn-sm btn-outline btn-edit-sec" data-sec="${i}">Editar</button>
                         <button class="btn btn-sm btn-outline btn-del-sec" data-sec="${i}" style="color:var(--color-error); border-color:var(--color-error);">Borrar</button>
                     </div>
                 </div>
                 ${(!sec.items || sec.items.length === 0) ? `<p class="text-muted" style="font-size:0.85rem;">Ningún item en esta sección.</p>` : `
                    <ul class="list" style="list-style:none; padding-left:0; margin:0; font-size:0.9rem;">
                       ${sec.items.map((item, j) => `
                         <li style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--color-border);">
                            <div>
                                <strong>${item.title}</strong> ${item.highlight ? '(Destacado)' : ''}
                                <br><span class="text-muted" style="font-size:0.8rem;">${item.url}</span>
                            </div>
                            <div class="actions">
                                <button class="btn btn-sm btn-outline btn-edit-item" data-sec="${i}" data-idx="${j}">Editar</button>
                                <button class="btn btn-sm btn-outline btn-del-item" data-sec="${i}" data-idx="${j}" style="color:var(--color-error); border-color:var(--color-error);">Borrar</button>
                            </div>
                         </li>
                       `).join('')}
                    </ul>
                 `}
              </div>
          `).join('');

          // Bind section events
          container.querySelectorAll('.btn-edit-sec').forEach(b => b.onclick = e => this.showSectionModal(e.currentTarget.dataset.sec));
          container.querySelectorAll('.btn-del-sec').forEach(b => b.onclick = e => {
              Modal.showConfirm("¿Eliminar sección por completo?", () => {
                  this.data.sections.splice(e.currentTarget.dataset.sec, 1);
                  this.renderSections();
              });
          });
          
          // Bind item events
          container.querySelectorAll('.btn-add-item').forEach(b => b.onclick = e => this.showItemModal(e.currentTarget.dataset.sec));
          container.querySelectorAll('.btn-edit-item').forEach(b => b.onclick = e => this.showItemModal(e.currentTarget.dataset.sec, e.currentTarget.dataset.idx));
          container.querySelectorAll('.btn-del-item').forEach(b => b.onclick = e => {
              this.data.sections[e.currentTarget.dataset.sec].items.splice(e.currentTarget.dataset.idx, 1);
              this.renderSections();
          });
      }

      document.getElementById('btn-add-section').onclick = () => this.showSectionModal();
  },

  showSectionModal(index = null) {
      const isEdit = index !== null;
      const sec = isEdit ? this.data.sections[index] : { id: '', title: '', subtitle: '', items: [] };

      const overlay = Modal.create(isEdit ? "Editar Sección" : "Nueva Sección", `
        <form id="sec-form">
            ${Form.renderField({ id: "id", label: "ID (slug para icono, ej: practica, pedagogia)", value: sec.id, required: true, type: "text" })}
            ${Form.renderField({ id: "title", label: "Título Principal", value: sec.title, required: true, type: "text" })}
            ${Form.renderField({ id: "subtitle", label: "Subtítulo (en paréntesis)", value: sec.subtitle, required: true, type: "text" })}
        </form>
      `, `<button class="btn btn-secondary" id="sec-cancel">Cancelar</button> <button class="btn btn-primary" id="sec-save">Guardar Temporal</button>`);

      overlay.querySelector('#sec-cancel').onclick = () => Modal.close(overlay);
      overlay.querySelector('#sec-save').onclick = () => {
          const form = overlay.querySelector('#sec-form');
          if(!form.checkValidity()) { form.reportValidity(); return; }

          sec.id = form.querySelector('#id').value.trim();
          sec.title = form.querySelector('#title').value.trim();
          sec.subtitle = form.querySelector('#subtitle').value.trim();

          if (!this.data.sections) this.data.sections = [];
          if (!isEdit) this.data.sections.push(sec);

          Modal.close(overlay);
          this.renderSections();
      };
  },

  showItemModal(secIndex, itemIndex = null) {
      const isEdit = itemIndex !== null;
      const sec = this.data.sections[secIndex];
      const item = isEdit ? sec.items[itemIndex] : { title: '', description: '', url: '', highlight: false };

      const overlay = Modal.create(isEdit ? "Editar Item" : "Nuevo Item", `
        <form id="item-form">
            ${Form.renderField({ id: "title", label: "Título", value: item.title, required: true, type: "text" })}
            ${Form.renderField({ id: "description", label: "Descripción", value: item.description, required: true, type: "textarea", rows: 2 })}
            ${Form.renderField({ id: "url", label: "URL", value: item.url, required: true, type: "text" })}
            <div class="form-group" style="display:flex; align-items:center; gap:0.5rem; margin-top:1rem;">
                <input type="checkbox" id="highlight" ${item.highlight ? 'checked' : ''}>
                <label for="highlight" style="margin:0;">Destacar (Highlight)</label>
            </div>
        </form>
      `, `<button class="btn btn-secondary" id="item-cancel">Cancelar</button> <button class="btn btn-primary" id="item-save">Guardar Temporal</button>`);

      overlay.querySelector('#item-cancel').onclick = () => Modal.close(overlay);
      overlay.querySelector('#item-save').onclick = () => {
          const form = overlay.querySelector('#item-form');
          if(!form.checkValidity()) { form.reportValidity(); return; }

          const finalItem = {
              title: form.querySelector('#title').value.trim(),
              description: form.querySelector('#description').value.trim(),
              url: form.querySelector('#url').value.trim(),
              highlight: form.querySelector('#highlight').checked
          };

          if (!sec.items) sec.items = [];
          if (isEdit) sec.items[itemIndex] = finalItem;
          else sec.items.push(finalItem);

          Modal.close(overlay);
          this.renderSections();
      };
  },

  async saveData() {
    const loadingModal = Modal.showLoading("Guardando cambios en Gist...");
    const content = JSON.stringify(this.data, null, 2);

    try {
      await GitHubAPI.updateGist(REPOS.gists.academico, {
        [FILE_NAME]: { content }
      });

      Modal.close(loadingModal);
      Modal.showSuccess("Homepage guardada exitosamente");
    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(`Error al guardar: ${error.message}`);
    }
  },

  exportData() {
    const json = JSON.stringify(this.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'homepage.json';
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
        
        // Basic validation: must have hero/cta/sections
        if (!parsed.hero || !parsed.cta || !parsed.sections) {
            throw new Error('El JSON no tiene el formato correcto para la Homepage (faltan hero, cta o sections).');
        }

        Modal.showConfirm(`¿Reemplazar la configuración actual de la Homepage con la del archivo?`, async () => {
          this.data = parsed;
          await this.saveData();
          this.renderContent(document.getElementById("homepage-content"));
        });
      } catch (err) {
        Modal.showError(`JSON inválido: ${err.message}`);
      }
    };
    input.click();
  }
};
