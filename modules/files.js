import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif'];

function isImage(name) {
  const ext = name.split('.').pop().toLowerCase();
  return IMAGE_EXTS.includes(ext);
}

export const Files = {
  currentPath: "",

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestor de Archivos</h2>
        <div class="header-actions">
          <button id="btn-upload-file" class="btn btn-primary">Subir Archivo</button>
        </div>
      </div>

      <div class="file-browser">
        <div class="breadcrumbs" id="file-breadcrumbs">/</div>

        <!-- Drag & Drop zone -->
        <div id="drop-zone" class="drop-zone" aria-label="Arrastrar archivos aquí">
          <span class="drop-zone-label">📂 Arrastrá archivos aquí para subirlos</span>
        </div>

        <div id="file-list" class="file-list">
          <div class="loading-spinner"></div> Cargando directorio...
        </div>
      </div>
    `;

    document.getElementById("btn-upload-file").addEventListener("click", () => this.showUploadModal());
    this._initDropZone();
    await this.loadDirectory("");
  },

  _initDropZone() {
    const zone = document.getElementById("drop-zone");
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(evt => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add('drop-zone--active');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      zone.addEventListener(evt, () => zone.classList.remove('drop-zone--active'));
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;
      await this._uploadFiles(files);
    });
  },

  async _uploadFiles(files) {
    const { Base64 } = await import("../utils/base64.js");

    for (const file of files) {
      const targetPath = this.currentPath ? `${this.currentPath}/${file.name}` : file.name;
      const loadingModal = Modal.showLoading(`Subiendo ${file.name}...`);
      try {
        const base64Content = await Base64.encodeFile(file);
        await GitHubAPI.createFile(REPOS.site, targetPath, base64Content, `Upload file: ${targetPath}`);
        Modal.close(loadingModal);
      } catch (error) {
        Modal.close(loadingModal);
        Modal.showError(`Error al subir ${file.name}: ${error.message}`);
      }
    }
    this.loadDirectory(this.currentPath);
  },

  async loadDirectory(path) {
    const listDiv = document.getElementById("file-list");
    this.currentPath = path;
    this.updateBreadcrumbs();

    try {
      const files = await GitHubAPI.getDirectory(REPOS.site, path);

      files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "dir" ? -1 : 1;
      });

      let html = `<table class="table file-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tamaño</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
      `;

      if (path !== "") {
        const parentPath = path.substring(0, path.lastIndexOf("/")) || "";
        html += `
          <tr class="dir-row" data-path="${parentPath}">
            <td><span class="icon">📁</span> <a href="javascript:void(0)" class="file-link">..</a></td>
            <td>-</td>
            <td></td>
          </tr>
        `;
      }

      files.forEach(file => {
        const isDir = file.type === "dir";
        const img = !isDir && isImage(file.name);
        const icon = isDir ? "📁" : (img ? "🖼️" : "📄");
        const size = isDir ? "-" : `${(file.size / 1024).toFixed(1)} KB`;

        const preview = img
          ? `<img src="${file.download_url}" alt="${file.name}" class="file-thumb" loading="lazy">`
          : '';

        const copyBtn = !isDir
          ? `<button class="btn btn-sm btn-outline btn-copy-url" data-url="/${file.path}" title="Copiar URL relativa">📋</button>`
          : '';

        html += `
          <tr class="${isDir ? 'dir-row' : 'file-row'}" data-path="${file.path}">
            <td>
              ${preview}
              <span class="icon">${icon}</span>
              <a href="javascript:void(0)" class="file-link">${file.name}</a>
            </td>
            <td>${size}</td>
            <td class="actions">
              ${!isDir ? `<a href="${file.download_url}" target="_blank" class="btn btn-sm btn-secondary">Ver</a>` : ''}
              ${copyBtn}
              <button class="btn btn-sm btn-danger btn-delete-file" data-path="${file.path}" data-sha="${file.sha}" data-name="${file.name}">Borrar</button>
            </td>
          </tr>
        `;
      });

      html += "</tbody></table>";
      listDiv.innerHTML = html;

      // Navigate into directory
      listDiv.querySelectorAll(".dir-row .file-link").forEach(link => {
        link.addEventListener("click", (e) => {
          const rowPath = e.target.closest("tr").dataset.path;
          this.loadDirectory(rowPath);
        });
      });

      // Also make clicking a dir-row's icon navigate
      listDiv.querySelectorAll(".dir-row").forEach(row => {
        row.addEventListener("click", (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
          this.loadDirectory(row.dataset.path);
        });
      });

      // Delete
      listDiv.querySelectorAll(".btn-delete-file").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const { path, sha, name } = e.target.dataset;
          this.deleteFile(path, sha, name);
        });
      });

      // Copy URL
      listDiv.querySelectorAll(".btn-copy-url").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const url = e.target.dataset.url;
          navigator.clipboard.writeText(url).then(() => {
            const orig = e.target.textContent;
            e.target.textContent = '✅';
            setTimeout(() => { e.target.textContent = orig; }, 1500);
          });
        });
      });

    } catch (error) {
      listDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  updateBreadcrumbs() {
    const breadcrumbsDiv = document.getElementById("file-breadcrumbs");
    if (!breadcrumbsDiv) return;

    if (!this.currentPath) {
      breadcrumbsDiv.innerHTML = `<span class="breadcrumb-item active">/ (raíz)</span>`;
      return;
    }

    const parts = this.currentPath.split("/");
    let html = `<a href="javascript:void(0)" class="breadcrumb-link" data-path="">/ (raíz)</a>`;
    let buildPath = "";

    parts.forEach((part, index) => {
      buildPath += (index > 0 ? "/" : "") + part;
      if (index === parts.length - 1) {
        html += ` / <span class="breadcrumb-item active">${part}</span>`;
      } else {
        html += ` / <a href="javascript:void(0)" class="breadcrumb-link" data-path="${buildPath}">${part}</a>`;
      }
    });

    breadcrumbsDiv.innerHTML = html;

    breadcrumbsDiv.querySelectorAll(".breadcrumb-link").forEach(link => {
      link.addEventListener("click", (e) => this.loadDirectory(e.target.dataset.path));
    });
  },

  deleteFile(path, sha, name) {
    Modal.showConfirm(`¿Eliminar ${name}? Esta acción es irreversible.`, async () => {
      const loadingModal = Modal.showLoading(`Eliminando ${name}...`);
      try {
        await GitHubAPI.deleteFile(REPOS.site, path, `Delete file: ${path}`, sha);
        Modal.close(loadingModal);
        this.loadDirectory(this.currentPath);
      } catch (error) {
        Modal.close(loadingModal);
        Modal.showError(`Error al eliminar: ${error.message}`);
      }
    });
  },

  showUploadModal() {
    const overlay = Modal.create(
      "Subir Archivo",
      `
        <form id="upload-file-form">
          <div class="form-group">
            <label>Carpeta Destino</label>
            <input type="text" class="form-control" disabled value="${this.currentPath || '/'}" />
          </div>
          <div class="form-group">
            <label for="upload-file-input">Seleccionar Archivo(s) <span class="text-danger">*</span></label>
            <input type="file" id="upload-file-input" class="form-control-file" multiple required />
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" id="upload-file-cancel">Cancelar</button>
        <button class="btn btn-primary" id="upload-file-save">Subir</button>
      `
    );

    overlay.querySelector("#upload-file-cancel").addEventListener("click", () => Modal.close(overlay));

    overlay.querySelector("#upload-file-save").addEventListener("click", async () => {
      const fileInput = overlay.querySelector("#upload-file-input");
      if (!fileInput.files.length) { alert("Debe seleccionar al menos un archivo"); return; }
      Modal.close(overlay);
      await this._uploadFiles(Array.from(fileInput.files));
    });
  }
};
