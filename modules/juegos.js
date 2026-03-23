import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { Form } from "../components/form.js";
import { SearchDataStore } from "../components/navbar.js";

const FILE_NAME = "juegos.json";

export const Juegos = {
  data: [],

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestión de Juegos</h2>
        <div class="header-actions">
          <button id="btn-export-games" class="btn btn-outline">Exportar JSON</button>
          <button id="btn-import-games" class="btn btn-outline">Importar JSON</button>
          <button id="btn-new-game" class="btn btn-primary">Nuevo Juego</button>
        </div>
      </div>
      <div id="games-content">
        <div class="loading-spinner"></div> Cargando juegos...
      </div>
    `;

    document.getElementById("btn-new-game").addEventListener("click", () => this.showGameModal());
    document.getElementById("btn-export-games").addEventListener("click", () => this.exportData());
    document.getElementById("btn-import-games").addEventListener("click", () => this.importData());

    await this.loadData();
  },

  async loadData() {
    const contentDiv = document.getElementById("games-content");

    try {
      if (REPOS.gists.academico === "YOUR_GIST_ID_HERE") {
        contentDiv.innerHTML = `<div class="alert alert-info">Configure el GIST ID en config/repos.js para cargar los datos.</div>`;
        return;
      }

      const gist = await GitHubAPI.getGist(REPOS.gists.academico);
      const file = gist.files[FILE_NAME];

      if (!file) {
        // Initialize with current games if they don't exist in Gist yet
        this.data = [
          { id: "flappy", name: "Smashy Pipe", url: "/juegos/flappy/", category: "Arcade", description: "Esquiva las tuberías en este clon de Flappy Bird." },
          { id: "combopool", name: "Combo Pool", url: "/juegos/combopool/", category: "Puzzle", description: "Combina bolas del mismo color en este adictivo juego de billar." },
          { id: "papas", name: "Los juegos de Papa's", url: "/juegos/papas/", category: "Simulación", description: "Gestiona los restaurantes de Papa Louie." },
          { id: "nutsort", name: "Nut Sort", url: "/juegos/nutsort/", category: "Puzzle", description: "Ordena las tuercas por color." },
          { id: "sudoku", name: "Sudoku", url: "/juegos/sudoku/", category: "Lógica", description: "El clásico juego de lógica con números." },
          { id: "tetris", name: "Tetris", url: "/juegos/tetris/", category: "Arcade", description: "El legendario juego de las piezas caídas." }
        ];
        // Save initial data to Gist immediately if it doesn't exist
        await this.saveData(true);
      } else {
        this.data = JSON.parse(file.content);
      }

      // Update global search store
      SearchDataStore.juegos = this.data;

      this.renderContent(contentDiv);
    } catch (error) {
      contentDiv.innerHTML = `<div class="alert alert-danger">Error al cargar del Gist: ${error.message}</div>`;
    }
  },

  renderContent(container) {
    if (this.data.length === 0) {
      container.innerHTML = "<p>No hay juegos configurados en el Gist.</p>";
      return;
    }

    let html = `<table class="table">
      <thead>
        <tr>
          <th>Orden</th>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>URL</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
    `;

    this.data.forEach((game, index) => {
      const isFirst = index === 0;
      const isLast = index === this.data.length - 1;
      html += `
        <tr>
          <td class="actions" style="white-space:nowrap; width: 80px;">
            <button class="btn btn-sm btn-outline btn-move-up" data-index="${index}" ${isFirst ? 'disabled' : ''} title="Subir">▲</button>
            <button class="btn btn-sm btn-outline btn-move-down" data-index="${index}" ${isLast ? 'disabled' : ''} title="Bajar">▼</button>
          </td>
          <td><strong>${game.name}</strong></td>
          <td><span class="badge" style="background:var(--color-bg-alt); padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;">${game.category || 'N/A'}</span></td>
          <td><code style="font-size: 0.85rem;">${game.url}</code></td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary btn-edit-game" data-index="${index}">Editar</button>
            <button class="btn btn-sm btn-warning btn-duplicate-game" data-index="${index}">Duplicar</button>
            <button class="btn btn-sm btn-danger btn-delete-game" data-index="${index}">Borrar</button>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;

    container.querySelectorAll('.btn-edit-game').forEach(btn => btn.addEventListener('click', (e) => this.showGameModal(e.target.dataset.index)));
    container.querySelectorAll('.btn-duplicate-game').forEach(btn => btn.addEventListener('click', (e) => this.duplicateGame(e.target.dataset.index)));
    container.querySelectorAll('.btn-delete-game').forEach(btn => btn.addEventListener('click', (e) => this.deleteGame(e.target.dataset.index)));
    container.querySelectorAll('.btn-move-up').forEach(btn => btn.addEventListener('click', (e) => this.moveGame(e.target.dataset.index, -1)));
    container.querySelectorAll('.btn-move-down').forEach(btn => btn.addEventListener('click', (e) => this.moveGame(e.target.dataset.index, 1)));
  },

  moveGame(index, direction) {
    const i = parseInt(index);
    if (i + direction < 0 || i + direction >= this.data.length) return;
    const temp = this.data[i];
    this.data[i] = this.data[i + direction];
    this.data[i + direction] = temp;
    this.saveData();
  },

  async saveData(silent = false) {
    let loadingModal;
    if (!silent) {
      loadingModal = Modal.showLoading("Guardando cambios en Gist...");
    }
    
    const content = JSON.stringify(this.data, null, 2);

    try {
      await GitHubAPI.updateGist(REPOS.gists.academico, {
        [FILE_NAME]: { content }
      });
      if (!silent) {
        Modal.close(loadingModal);
        this.renderContent(document.getElementById("games-content"));
      }
    } catch (error) {
      if (!silent) {
        Modal.close(loadingModal);
        Modal.showError(`Error al guardar: ${error.message}`);
      }
    }
  },

  showGameModal(index = null) {
    const isEdit = index !== null;
    const game = isEdit ? this.data[index] : { id: '', name: '', url: '', category: '', description: '', iframeUrl: '', bgmUrl: '', instrumentPreset: 'lead' };

    const overlay = Modal.create(
      isEdit ? "Editar Juego" : "Nuevo Juego",
      `
        <form id="game-form">
          ${Form.renderField({ id: "id", label: "ID (slug)", value: game.id, required: true, type: "text", placeholder: "ej: tetris" })}
          ${Form.renderField({ id: "name", label: "Nombre", value: game.name, required: true, type: "text", placeholder: "ej: Tetris" })}
          ${Form.renderField({ id: "category", label: "Categoría", value: game.category, required: true, type: "text", placeholder: "ej: Arcade" })}
          ${Form.renderField({ id: "url", label: "URL en el sitio", value: game.url, required: true, type: "text", placeholder: "ej: /juegos/tetris/" })}
          ${Form.renderField({ id: "description", label: "Descripción / Créditos", value: game.description, type: "textarea", rows: 2 })}
          
          <hr style="margin: 1.5rem 0; opacity: 0.2;">
          <h4 style="margin-bottom: 0.5rem;">Configuración de Página Automática</h4>
          <p style="font-size: 0.8rem; color: #888; margin-bottom: 1rem;">Si usas un Iframe, el CMS puede generar el archivo HTML con el nuevo diseño minimalista.</p>
          
          ${Form.renderField({ id: "iframeUrl", label: "URL del Iframe (Ej: /juegos/tetris/game/index.html)", value: game.iframeUrl || '', type: "text" })}
          
          <div class="form-group" style="display:flex; align-items:center; gap:0.5rem; margin-top:1rem;">
              <input type="checkbox" id="generate-page" ${game.iframeUrl ? 'checked' : ''}>
              <label for="generate-page" style="margin:0; font-weight: 500;">Generar/Actualizar archivo index.html en el repositorio</label>
          </div>

          <hr style="margin: 1.5rem 0; opacity: 0.2;">
          <h4 style="margin-bottom: 0.5rem;">Configuración de Audio</h4>
          ${Form.renderField({ id: "bgmUrl", label: "Música de Fondo (URL .mid)", value: game.bgmUrl || '', type: "text", placeholder: "ej: /assets/sounds/korobeiniki.mid" })}
          <div class="form-group">
            <label for="instrumentPreset">Estilo de Instrumento</label>
            <select id="instrumentPreset" class="form-control">
              <option value="lead" ${game.instrumentPreset === 'lead' ? 'selected' : ''}>8-bit Retro (Square)</option>
              <option value="bass" ${game.instrumentPreset === 'bass' ? 'selected' : ''}>Sub Bass (Triangle)</option>
              <option value="pads" ${game.instrumentPreset === 'pads' ? 'selected' : ''}>Smooth Pads (Sawtooth)</option>
            </select>
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" id="game-cancel">Cancelar</button>
        <button class="btn btn-primary" id="game-save">Guardar Juego</button>
      `
    );

    overlay.querySelector("#game-cancel").addEventListener("click", () => Modal.close(overlay));
    overlay.querySelector("#game-save").addEventListener("click", async () => {
      const form = overlay.querySelector("#game-form");
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const formData = Form.getFormData(form, [
        {id: "id", type: "text"}, {id: "name", type: "text"},
        {id: "category", type: "text"}, {id: "url", type: "text"},
        {id: "description", type: "textarea"}, {id: "iframeUrl", type: "text"},
        {id: "bgmUrl", type: "text"}
      ]);
      formData.instrumentPreset = form.querySelector("#instrumentPreset").value;

      const shouldGenerate = overlay.querySelector("#generate-page").checked;

      if (shouldGenerate && formData.iframeUrl) {
         await this.generateGamePage(formData);
      }

      if (isEdit) {
        this.data[index] = formData;
      } else {
        this.data.push(formData);
      }

      Modal.close(overlay);
      this.saveData();
    });
  },

  async generateGamePage(game) {
    const loadingModal = Modal.showLoading(`Generando página para ${game.name}...`);
    const path = `juegos/${game.id}/index.html`;
    
    const template = `<!DOCTYPE html>
<html lang="es" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${game.name} | Berrueta</title>
    <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800&display=swap" rel="stylesheet" />
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/css/styles.css" />
    <link rel="stylesheet" href="/src/css/game-theme.css" />
  </head>
  <body class="game-mode">
    <main class="main-content">
        <div class="game-top-bar">
          <a href="/juegos/" class="game-back-btn">← Volver a Juegos</a>
          <a href="/juegos/" class="game-logo" id="game-logo-container">
            <span class="logo-text">Berrueta</span><span class="logo-punct">;</span>
            <span class="logo-sub">Juegos</span>
          </a>
          <div></div>
        </div>

        <div class="iframe-wrapper">
            <iframe id="game-iframe" src="${game.iframeUrl}" title="${game.name}"></iframe>
        </div>

        <div class="game-bottom-bar">
          <div class="game-credits">
             ${game.name} - ${game.description || ''}
          </div>
          <button class="game-fullscreen-btn" onclick="toggleGameFullscreen()">Pantalla Completa</button>
        </div>
    </main>
    <script type="module" src="/src/js/main.js"></script>
    <script>
      function toggleGameFullscreen() {
        const iframe = document.getElementById('game-iframe');
        if (!document.fullscreenElement) {
          if (iframe.requestFullscreen) iframe.requestFullscreen();
          else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
          else if (iframe.msRequestFullscreen) iframe.msRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      }
    </script>
  </body>
</html>`;

    try {
      const { Base64 } = await import("../utils/base64.js");
      const content = Base64.encode(template);
      
      try {
        const existing = await GitHubAPI.getFile(REPOS.site, path);
        await GitHubAPI.updateFile(REPOS.site, path, content, `Update game page: ${game.name}`, existing.sha);
      } catch (e) {
        await GitHubAPI.createFile(REPOS.site, path, content, `Create game page: ${game.name}`);
      }
      
      Modal.close(loadingModal);
    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(`Error al generar página: ${error.message}`);
    }
  },

  deleteGame(index) {
    const game = this.data[index];
    Modal.showConfirm(`¿Eliminar el juego "${game.name}"?`, async () => {
      this.data.splice(index, 1);
      
      // Optional: Ask if want to delete the file too? 
      // For now just delete from list
      this.saveData();
    });
  },

  duplicateGame(index) {
    const game = this.data[index];
    const copy = { ...game, id: game.id + '-copia', name: game.name + ' (copia)' };
    this.data.splice(Number(index) + 1, 0, copy);
    this.saveData();
  },

  exportData() {
    const json = JSON.stringify(this.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'juegos.json';
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
        if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un array de juegos.');
        Modal.showConfirm(`¿Reemplazar los ${this.data.length} juegos actuales con los ${parsed.length} del archivo?`, async () => {
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
