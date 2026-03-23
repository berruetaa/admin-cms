import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";
import { SoundEngine } from "../services/sound-engine.js";

export const Audio = {
  currentPath: "assets/sounds",
  engine: new SoundEngine(),
  config: { instruments: {}, mappings: {} },
  configSha: null,
  lastSelectedInstrument: 'lead',

  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestor de Audio (MIDI)</h2>
        <div class="header-actions">
          <button id="btn-edit-instruments" class="btn btn-secondary">🎹 Editor de Instrumentos</button>
          <button id="btn-upload-midi" class="btn btn-primary">📤 Subir MIDI</button>
        </div>
      </div>

      <div class="file-browser">
        <div id="midi-list" class="file-list">
          <div class="loading-spinner"></div> Cargando sonidos...
        </div>
      </div>
    `;

    document.getElementById("btn-upload-midi").addEventListener("click", () => this.showUploadModal());
    document.getElementById("btn-edit-instruments").addEventListener("click", () => this.showInstrumentEditor());
    
    await this.engine.init();
    await this.loadConfig();
    await this.loadDirectory();
    this.initKeyboardPiano();
  },

  initKeyboardPiano() {
    const keyMap = {
      'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72, 'o': 73, 'l': 74, 'p': 75, ';': 76
    };
    const pressed = new Set();
    
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const note = keyMap[e.key.toLowerCase()];
      if (note && !pressed.has(note)) {
        pressed.add(note);
        const instr = this.lastSelectedInstrument || 'lead';
        this.engine.triggerAttack(note, 100, instr);
        this.highlightPianoKey(note, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note) {
        pressed.delete(note);
        const instr = this.lastSelectedInstrument || 'lead';
        this.engine.triggerRelease(note, instr);
        this.highlightPianoKey(note, false);
      }
    });
  },

  highlightPianoKey(note, active) {
    const key = document.querySelector(`.piano-key[data-note="${note}"]`);
    if (key) {
      if (active) key.classList.add('active');
      else key.classList.remove('active');
    }
  },

  async loadConfig() {
    try {
      const file = await GitHubAPI.getFile(REPOS.site, `${this.currentPath}/audio-config.json`);
      const cleanContent = file.content.replace(/\s/g, "");
      this.config = JSON.parse(atob(cleanContent));
      this.configSha = file.sha;
    } catch (e) {
      console.warn("Config file not found, using defaults");
      this.config = {
        instruments: {
          lead: { wave: 'square', attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.1, filterStart: 2000, filterEnd: 800, vol: 0.4 },
          bass: { wave: 'triangle', attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.2, filterStart: 800, filterEnd: 200, vol: 0.7 },
          pads: { wave: 'sawtooth', attack: 0.2, decay: 0.5, sustain: 0.8, release: 0.8, filterStart: 1200, filterEnd: 400, vol: 0.3 },
          percussion: { wave: 'sine', attack: 0.005, decay: 0.05, sustain: 0.01, release: 0.05, filterStart: 1000, filterEnd: 500, vol: 0.5 }
        },
        mappings: {}
      };
    }
    this.engine.setInstruments(this.config.instruments);
  },

  async saveConfig() {
    const loading = Modal.showLoading("Guardando configuración...");
    try {
      const content = btoa(JSON.stringify(this.config, null, 2));
      const res = await GitHubAPI.updateFile(
        REPOS.site, 
        `${this.currentPath}/audio-config.json`, 
        content, 
        "Update audio configuration", 
        this.configSha
      );
      this.configSha = res.content.sha;
      Modal.close(loading);
      Modal.showSuccess("Configuración guardada exitosamente");
    } catch (e) {
      Modal.close(loading);
      Modal.showError("Error al guardar configuración: " + e.message);
    }
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
            <th>Mapeo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
      `;

      if (midis.length === 0) {
        html += `<tr><td colspan="3" class="text-center">No se encontraron archivos MIDI</td></tr>`;
      }

      midis.forEach(file => {
        const hasMapping = !!this.config.mappings[file.path];
        html += `
          <tr>
            <td><span class="icon">🎵</span> ${file.name}</td>
            <td><span class="badge ${hasMapping ? 'badge-success' : 'badge-warning'}">${hasMapping ? 'Configurado' : 'Sin mapeo'}</span></td>
            <td class="actions">
              <button class="btn btn-sm btn-outline btn-preview-midi" data-url="${file.download_url}" data-path="${file.path}">Escuchar</button>
              <button class="btn btn-sm btn-secondary btn-config-midi" data-path="${file.path}">Configurar</button>
              <button class="btn btn-sm btn-danger btn-delete-midi" data-path="${file.path}" data-sha="${file.sha}">Borrar</button>
            </td>
          </tr>
        `;
      });

      html += "</tbody></table>";
      listDiv.innerHTML = html;

      listDiv.querySelectorAll('.btn-preview-midi').forEach(btn => {
        btn.addEventListener('click', () => this.previewMidi(btn.dataset.url, btn.dataset.path));
      });

      listDiv.querySelectorAll('.btn-config-midi').forEach(btn => {
        btn.addEventListener('click', () => this.showMidiStudio(btn.dataset.path));
      });

      listDiv.querySelectorAll('.btn-delete-midi').forEach(btn => {
        btn.addEventListener('click', (e) => this.deleteMidi(e.target.dataset.path, e.target.dataset.sha));
      });

    } catch (error) {
      listDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  async previewMidi(url, path) {
    this.engine.stopSong();
    const loading = Modal.showLoading("Cargando MIDI...");
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const data = SoundEngine.parseMidi(buffer);
        
        Modal.close(loading);
        
        const mapping = this.config.mappings[path] || { 0: 'lead' };
        this.engine.playSong(data, mapping);
        
        const info = Modal.showInfo("Reproduciendo", `Sonando: ${path.split('/').pop()}`);
        info.querySelector('#info-ok').addEventListener('click', () => this.engine.stopSong());
    } catch (e) {
        Modal.close(loading);
        Modal.showError("Error al reproducir: " + e.message);
    }
  },

  async showMidiStudio(path) {
    const fileName = path.split('/').pop();
    const currentMapping = this.config.mappings[path] || {};
    
    const loadingOverlay = Modal.showLoading("Cargando MIDI Studio...");
    try {
        const midiFile = await GitHubAPI.getFile(REPOS.site, path);
        const cleanMidiContent = midiFile.content.replace(/\s/g, "");
        const buffer = Uint8Array.from(atob(cleanMidiContent), c => c.charCodeAt(0)).buffer;
        const midiData = SoundEngine.parseMidi(buffer);

        Modal.close(loadingOverlay);
        
        const activeChannels = [...new Set(midiData.events.filter(e => e.type === 'noteOn').map(e => e.channel))].sort((a,b) => a-b);

        const overlay = Modal.create(
          `MIDI Studio: ${fileName}`,
          `
            <style>
              .studio-container { display: flex; flex-direction: column; gap: 20px; background: #1a1a1a; color: #fff; padding: 20px; border-radius: 8px; font-family: 'Satoshi', sans-serif; }
              .studio-mixer { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; background: #2a2a2a; padding: 15px; border-radius: 6px; border: 1px solid #444; }
              .mixer-channel { background: #333; padding: 10px; border-radius: 4px; display: flex; flex-direction: column; gap: 8px; border-left: 3px solid var(--color-accent); }
              .mixer-channel label { font-size: 0.8rem; opacity: 0.7; }
              .mixer-channel select { background: #444; color: #fff; border: 1px solid #555; font-size: 0.85rem; padding: 4px; }
              .piano-roll-container { height: 200px; background: #000; position: relative; overflow-x: auto; overflow-y: hidden; border-radius: 4px; border: 1px solid #444; }
              .piano-roll-canvas { height: 100%; }
              .studio-transport { display: flex; align-items: center; gap: 15px; background: #333; padding: 10px; border-radius: 4px; }
              .piano-keyboard { display: flex; height: 60px; background: #222; border-radius: 4px; overflow: hidden; margin-top: 10px; }
              .piano-key { flex: 1; border: 1px solid #000; background: #fff; cursor: pointer; transition: background 0.1s; position: relative; }
              .piano-key.black { background: #000; flex: 0.7; height: 60%; z-index: 2; margin-left: -0.35%; margin-right: -0.35%; }
              .piano-key.active { background: var(--color-accent) !important; }
            </style>
            <div class="studio-container">
              <div class="studio-transport">
                <button class="btn btn-sm btn-primary" id="studio-play">▶ Play</button>
                <button class="btn btn-sm btn-secondary" id="studio-stop">⏹ Stop</button>
                <span id="studio-status" style="font-size: 0.9rem; opacity: 0.7;">Listo</span>
              </div>

              <div class="piano-roll-container" id="piano-roll-container">
                <canvas id="piano-roll-canvas" class="piano-roll-canvas"></canvas>
              </div>

              <div class="studio-mixer">
                ${activeChannels.map(ch => `
                  <div class="mixer-channel" data-channel="${ch}">
                    <label>Canal ${ch}</label>
                    <select class="channel-map" data-channel="${ch}">
                      <option value="">- Silencio -</option>
                      ${Object.keys(this.config.instruments).map(name => 
                        `<option value="${name}" ${currentMapping[ch] === name ? 'selected' : ''}>${name}</option>`
                      ).join('')}
                    </select>
                  </div>
                `).join('')}
              </div>

              <div class="piano-keyboard">
                ${this.renderPianoKeys()}
              </div>
              <p style="font-size: 0.75rem; text-align: center; opacity: 0.5; margin-top: -10px;">Usa las teclas [A-W-S-E-D-F-T-G-Y-H-U-J-K] para tocar</p>
            </div>
          `,
          `
            <button class="btn btn-secondary" id="studio-cancel">Cerrar</button>
            <button class="btn btn-primary" id="studio-save">Guardar Cambios</button>
          `
        );

        this.drawPianoRoll(overlay.querySelector('#piano-roll-canvas'), midiData);

        overlay.querySelector('#studio-play').addEventListener('click', () => {
          const mapping = {};
          overlay.querySelectorAll('.channel-map').forEach(sel => {
            if (sel.value) mapping[sel.dataset.channel] = sel.value;
          });
          this.engine.playSong(midiData, mapping);
          overlay.querySelector('#studio-status').innerText = "Reproduciendo...";
        });

        overlay.querySelector('#studio-stop').addEventListener('click', () => {
          this.engine.stopSong();
          overlay.querySelector('#studio-status').innerText = "Parado";
        });

        overlay.querySelector('#studio-cancel').addEventListener('click', () => {
          this.engine.stopSong();
          Modal.close(overlay);
        });

        overlay.querySelector('#studio-save').addEventListener('click', () => {
          const newMapping = {};
          overlay.querySelectorAll('.channel-map').forEach(sel => {
            if (sel.value) newMapping[sel.dataset.channel] = sel.value;
          });
          this.config.mappings[path] = newMapping;
          this.saveConfig().then(() => {
            Modal.close(overlay);
            this.loadDirectory();
          });
        });

        overlay.querySelectorAll('.channel-map').forEach(sel => {
          sel.addEventListener('change', () => {
            this.lastSelectedInstrument = sel.value;
          });
        });
    } catch (e) {
        Modal.close(loadingOverlay);
        Modal.showError("Error al cargar MIDI Studio: " + e.message);
    }
  },

  renderPianoKeys() {
    const keys = [
      { n: 60, b: false }, { n: 61, b: true }, { n: 62, b: false }, { n: 63, b: true }, { n: 64, b: false },
      { n: 65, b: false }, { n: 66, b: true }, { n: 67, b: false }, { n: 68, b: true }, { n: 69, b: false }, { n: 70, b: true }, { n: 71, b: false },
      { n: 72, b: false }, { n: 73, b: true }, { n: 74, b: false }, { n: 75, b: true }, { n: 76, b: false }
    ];
    return keys.map(k => `<div class="piano-key ${k.b ? 'black' : 'white'}" data-note="${k.n}"></div>`).join('');
  },

  drawPianoRoll(canvas, midiData) {
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const maxTime = Math.max(...midiData.events.map(e => e.time));
    const width = Math.max(container.clientWidth, maxTime / 10 + 200);
    canvas.width = width;
    canvas.height = container.clientHeight;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    for (let x = 0; x < width; x += 50) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += 10) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    const noteOnTimes = new Map();
    midiData.events.forEach(e => {
      if (e.type === 'noteOn') {
        noteOnTimes.set(`${e.channel}-${e.note}`, e.time);
      } else if (e.type === 'noteOff') {
        const startTime = noteOnTimes.get(`${e.channel}-${e.note}`);
        if (startTime !== undefined) {
          const x = startTime / 10;
          const w = (e.time - startTime) / 10;
          const y = canvas.height - (e.note - 20) * 2;
          ctx.fillStyle = `hsl(${e.channel * 40}, 70%, 50%)`;
          ctx.fillRect(x, y, w, 4);
          noteOnTimes.delete(`${e.channel}-${e.note}`);
        }
      }
    });
  },

  showInstrumentEditor() {
    let instrumentsHtml = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4>Mis Instrumentos</h4>
        <button class="btn btn-sm btn-primary" id="btn-add-instrument">+ Nuevo Instrumento</button>
      </div>
      <div class="accordion" id="instr-accordion">
    `;
    
    Object.entries(this.config.instruments).forEach(([name, data]) => {
      instrumentsHtml += `
        <div class="card mb-3 p-3 border rounded instr-card" data-name="${name}" style="background: #fdfdfd; border-left: 4px solid var(--color-accent) !important;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="mb-0">
               <input type="text" class="instr-name-input border-0 bg-transparent font-weight-bold" value="${name}" style="font-size: 1.1rem; width: 150px;" />
            </h5>
            <div class="actions">
              <button class="btn btn-sm btn-outline btn-test-instr" data-name="${name}">🔊 Probar</button>
              <button class="btn btn-sm btn-danger btn-delete-instr" data-name="${name}">🗑️</button>
            </div>
          </div>
          <div class="row instr-params">
            <div class="col-md-6">
              <label>Onda</label>
              <select class="form-control param-wave">
                <option value="square" ${data.wave === 'square' ? 'selected' : ''}>Square</option>
                <option value="sawtooth" ${data.wave === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
                <option value="triangle" ${data.wave === 'triangle' ? 'selected' : ''}>Triangle</option>
                <option value="sine" ${data.wave === 'sine' ? 'selected' : ''}>Sine</option>
              </select>
            </div>
            <div class="col-md-6">
              <label>Volumen (0-1)</label>
              <input type="number" step="0.1" min="0" max="1" class="form-control param-vol" value="${data.vol}">
            </div>
            <div class="col-md-3 mt-2">
              <label>Attack</label>
              <input type="number" step="0.01" class="form-control param-attack" value="${data.attack}">
            </div>
            <div class="col-md-3 mt-2">
              <label>Decay</label>
              <input type="number" step="0.01" class="form-control param-decay" value="${data.decay}">
            </div>
             <div class="col-md-3 mt-2">
              <label>Sustain</label>
              <input type="number" step="0.01" class="form-control param-sustain" value="${data.sustain}">
            </div>
             <div class="col-md-3 mt-2">
              <label>Release</label>
              <input type="number" step="0.01" class="form-control param-release" value="${data.release}">
            </div>
            <div class="col-md-6 mt-2">
              <label>Filtro Inicio (Hz)</label>
              <input type="number" step="10" class="form-control param-filterStart" value="${data.filterStart || 2000}">
            </div>
            <div class="col-md-6 mt-2">
              <label>Filtro Fin (Hz)</label>
              <input type="number" step="10" class="form-control param-filterEnd" value="${data.filterEnd || 500}">
            </div>
          </div>
        </div>
      `;
    });
    instrumentsHtml += '</div>';

    const overlay = Modal.create(
      "🎹 Editor de Instrumentos",
      `<div style="max-height: 70vh; overflow-y: auto; padding: 10px;">${instrumentsHtml}</div>`,
      `
        <button class="btn btn-secondary" id="instr-cancel">Cancelar</button>
        <button class="btn btn-primary" id="instr-save">Guardar Cambios</button>
      `
    );

    overlay.querySelector('#btn-add-instrument').addEventListener('click', () => {
      const newName = `instrumento_${Object.keys(this.config.instruments).length + 1}`;
      this.config.instruments[newName] = { wave: 'square', attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1, vol: 0.5 };
      Modal.close(overlay);
      this.showInstrumentEditor();
    });

    overlay.querySelectorAll('.btn-test-instr').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.card');
        const params = this.getInstrParamsFromUI(card);
        this.engine.setInstruments({ ...this.config.instruments, [btn.dataset.name]: params });
        this.engine.playTestNote(btn.dataset.name);
      });
    });

    overlay.querySelectorAll('.btn-delete-instr').forEach(btn => {
      btn.addEventListener('click', () => {
        if (Object.keys(this.config.instruments).length <= 1) {
          return Modal.showError("Debes mantener al menos un instrumento");
        }
        delete this.config.instruments[btn.dataset.name];
        Modal.close(overlay);
        this.showInstrumentEditor();
      });
    });

    overlay.querySelector('#instr-cancel').addEventListener('click', () => Modal.close(overlay));
    overlay.querySelector('#instr-save').addEventListener('click', () => {
      const newInstruments = {};
      const nameMapping = {}; 
      overlay.querySelectorAll('.instr-card').forEach(card => {
        const oldName = card.dataset.name;
        const newName = card.querySelector('.instr-name-input').value.trim() || oldName;
        newInstruments[newName] = this.getInstrParamsFromUI(card);
        if (oldName !== newName) nameMapping[oldName] = newName;
      });

      if (Object.keys(nameMapping).length > 0) {
        Object.keys(this.config.mappings).forEach(midiPath => {
          const mapping = this.config.mappings[midiPath];
          Object.keys(mapping).forEach(channel => {
            if (nameMapping[mapping[channel]]) mapping[channel] = nameMapping[mapping[channel]];
          });
        });
      }

      this.config.instruments = newInstruments;
      this.engine.setInstruments(this.config.instruments);
      Modal.close(overlay);
      this.saveConfig();
    });
  },

  getInstrParamsFromUI(card) {
    const el = card.querySelector('.instr-params');
    return {
      wave: el.querySelector('.param-wave').value,
      vol: parseFloat(el.querySelector('.param-vol').value),
      attack: parseFloat(el.querySelector('.param-attack').value),
      decay: parseFloat(el.querySelector('.param-decay').value),
      sustain: parseFloat(el.querySelector('.param-sustain').value),
      release: parseFloat(el.querySelector('.param-release').value),
      filterStart: parseFloat(el.querySelector('.param-filterStart').value),
      filterEnd: parseFloat(el.querySelector('.param-filterEnd').value)
    };
  },

  async showUploadModal() {
    const { Base64 } = await import("../utils/base64.js");
    const overlay = Modal.create(
      "Subir MIDI",
      `
        <form id="upload-midi-form">
          <div class="form-group mt-2">
            <label>Seleccionar Archivo .mid</label>
            <input type="file" id="midi-file-input" class="form-control" accept=".mid" multiple />
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" id="up-cancel">Cancelar</button>
        <button class="btn btn-primary" id="up-save">Subir</button>
      `
    );

    overlay.querySelector('#up-cancel').addEventListener('click', () => Modal.close(overlay));
    overlay.querySelector('#up-save').addEventListener('click', async () => {
      const input = overlay.querySelector('#midi-file-input');
      if (!input.files.length) return;
      Modal.close(overlay);
      const loading = Modal.showLoading("Subiendo archivos...");
      try {
        for (const file of input.files) {
          const content = await Base64.encodeFile(file);
          const path = `${this.currentPath}/${file.name}`;
          await GitHubAPI.createFile(REPOS.site, path, content, `Upload MIDI: ${file.name}`);
        }
        Modal.close(loading);
        Modal.showSuccess("Archivos subidos correctamente");
        this.loadDirectory();
      } catch (e) {
        Modal.close(loading);
        Modal.showError("Error al subir: " + e.message);
      }
    });
  },

  async deleteMidi(path, sha) {
    Modal.showConfirm(`¿Eliminar ${path.split('/').pop()}?`, async () => {
      const loading = Modal.showLoading("Eliminando...");
      try {
        await GitHubAPI.deleteFile(REPOS.site, path, "Delete MIDI", sha);
        if (this.config.mappings[path]) {
          delete this.config.mappings[path];
          await this.saveConfig();
        }
        Modal.close(loading);
        Modal.showSuccess("Borrado exitoso");
        this.loadDirectory();
      } catch (e) {
        Modal.close(loading);
        Modal.showError("Error al borrar: " + e.message);
      }
    });
  }
};
