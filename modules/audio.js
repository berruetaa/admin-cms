import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";

export const Audio = {
  currentPath: "assets/sounds",

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestor de Audio (MIDI)</h2>
        <div class="header-actions">
          <button id="btn-upload-midi" class="btn btn-primary">Subir MIDI</button>
        </div>
      </div>

      <div class="file-browser">
        <div id="midi-list" class="file-list">
          <div class="loading-spinner"></div> Cargando sonidos...
        </div>
      </div>
    `;

    document.getElementById("btn-upload-midi").addEventListener("click", () => this.showUploadModal());
    await this.loadDirectory();
  },

  async loadDirectory() {
    const listDiv = document.getElementById("midi-list");
    try {
      const files = await GitHubAPI.getDirectory(REPOS.site, this.currentPath);
      const midis = files.filter(f => f.name.endsWith('.mid'));

      let html = `<table class="table">
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Tamaño</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
      `;

      midis.forEach(file => {
        html += `
          <tr>
            <td><span class="icon">🎵</span> ${file.name}</td>
            <td>${(file.size / 1024).toFixed(1)} KB</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary btn-preview-midi" data-url="${file.download_url}">Escuchar</button>
              <button class="btn btn-sm btn-danger btn-delete-midi" data-path="${file.path}" data-sha="${file.sha}">Borrar</button>
            </td>
          </tr>
        `;
      });

      html += "</tbody></table>";
      listDiv.innerHTML = html;

      listDiv.querySelectorAll('.btn-preview-midi').forEach(btn => {
        btn.addEventListener('click', () => this.previewMidi(btn.dataset.url));
      });

      listDiv.querySelectorAll('.btn-delete-midi').forEach(btn => {
        btn.addEventListener('click', (e) => this.deleteMidi(e.target.dataset.path, e.target.dataset.sha));
      });

    } catch (error) {
      listDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  async previewMidi(url) {
    // We'll need to dynamically import the SoundEngine from the SITE repo or mock it.
    // For now, let's assume we can fetch it.
    const loading = Modal.showLoading("Cargando motor de audio...");
    try {
        // In a real scenario, we might need a local copy or a shared component.
        // For simplicity in this demo, we'll just log or show a placeholder.
        console.log("Previewing:", url);
        Modal.close(loading);
        Modal.showInfo("Previsualización", `Enviando ${url} al motor de audio...`);
    } catch (e) {
        Modal.close(loading);
        Modal.showError(e.message);
    }
  },

  showUploadModal() {
     // Reuse logic from files.js or implement specifically for MIDI
     alert("Funcionalidad de subida similar a Files.js");
  }
};
