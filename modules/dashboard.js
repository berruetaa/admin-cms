import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";

export const Dashboard = {
  async render(container) {
    const loadingModal = Modal.showLoading('Cargando Dashboard...');

    try {
      const [blogInfo, siteInfo, blogCommits, siteCommits, blogDir] = await Promise.all([
        GitHubAPI.getRepoInfo(REPOS.blog).catch(() => null),
        GitHubAPI.getRepoInfo(REPOS.site).catch(() => null),
        GitHubAPI.getCommits(REPOS.blog, null, 8).catch(() => []),
        GitHubAPI.getCommits(REPOS.site, null, 8).catch(() => []),
        GitHubAPI.getDirectory(REPOS.blog, 'src/data/blog').catch(() => [])
      ]);

      Modal.close(loadingModal);

      // ── Stats ─────────────────────────────────────────────────────────────
      const totalPosts = blogDir.filter(f => f.name.endsWith('.md')).length;
      const siteKB    = siteInfo ? (siteInfo.size).toFixed(0) : '?';
      const blogKB    = blogInfo ? (blogInfo.size).toFixed(0) : '?';

      const statsHTML = `
        <div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:2rem;">
          ${this._statCard('📝', 'Posts en Blog', totalPosts)}
          ${this._statCard('📦', 'Tamaño Blog', `${blogKB} KB`)}
          ${this._statCard('🌐', 'Tamaño Sitio', `${siteKB} KB`)}
          ${this._statCard('🔗', 'Commits Blog', blogCommits.length)}
          ${this._statCard('📡', 'Commits Sitio', siteCommits.length)}
        </div>
      `;

      // ── Repo cards ────────────────────────────────────────────────────────
      const repoHTML = `
        <div class="dashboard-grid" style="margin-bottom:2rem;">
          ${this._repoCard('Blog', blogInfo, REPOS.blog, 'blog')}
          ${this._repoCard('Sitio Principal', siteInfo, REPOS.site, 'academico')}
        </div>
      `;

      // ── Commit history ────────────────────────────────────────────────────
      const historyHTML = `
        <div class="dashboard-grid">
          ${this._commitsCard('Historial Blog', blogCommits, REPOS.blog)}
          ${this._commitsCard('Historial Sitio', siteCommits, REPOS.site)}
        </div>
      `;

      container.innerHTML = `
        <div class="module-header">
          <h2>Dashboard</h2>
          <p>Visión general de los repositorios conectados</p>
        </div>
        ${statsHTML}
        ${repoHTML}
        ${historyHTML}
      `;

    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(error.message);
      container.innerHTML = `<div class="error-state"><h2>Error cargando dashboard</h2><p>${error.message}</p></div>`;
    }
  },

  _statCard(icon, label, value) {
    return `
      <div class="card" style="text-align:center;padding:1rem;">
        <div style="font-size:1.8rem;">${icon}</div>
        <div style="font-size:1.6rem;font-weight:700;margin:.25rem 0;">${value}</div>
        <div style="font-size:.8rem;color:var(--text-muted,#888);">${label}</div>
      </div>
    `;
  },

  _repoCard(title, info, repoConfig, type) {
    if (!info) {
      return `<div class="card error"><h3>${title}</h3><p>Error al cargar el repositorio.</p></div>`;
    }
    return `
      <div class="card">
        <h3><a href="${info.html_url}" target="_blank">${info.name}</a></h3>
        <p class="repo-desc">${info.description || 'Sin descripción'}</p>
        <ul class="repo-stats">
          <li><strong>Rama:</strong> ${repoConfig.branch}</li>
          <li><strong>Tamaño:</strong> ${(info.size / 1024).toFixed(2)} MB</li>
          <li><strong>Privado:</strong> ${info.private ? 'Sí' : 'No'}</li>
          <li><strong>Actualizado:</strong> ${new Date(info.updated_at).toLocaleString()}</li>
        </ul>
        <div class="card-actions">
          <a href="#/${type}" class="btn btn-primary">Gestionar Contenido</a>
        </div>
      </div>
    `;
  },

  _commitsCard(title, commits, repoConfig) {
    if (!commits || commits.length === 0) {
      return `<div class="card"><h4>${title}</h4><p>Sin commits recientes.</p></div>`;
    }
    const rows = commits.map(c => `
      <tr>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <a href="${c.html_url}" target="_blank" title="${c.commit.message}">${c.commit.message.split('\n')[0]}</a>
        </td>
        <td style="font-size:.8rem;color:var(--text-muted,#888);white-space:nowrap;">
          ${new Date(c.commit.author.date).toLocaleDateString()}
        </td>
        <td style="font-size:.8rem;">${c.commit.author.name}</td>
      </tr>
    `).join('');

    return `
      <div class="card">
        <h4 style="margin-bottom:.75rem;">${title}</h4>
        <table class="table" style="font-size:.85rem;">
          <thead><tr><th>Mensaje</th><th>Fecha</th><th>Autor</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
};
