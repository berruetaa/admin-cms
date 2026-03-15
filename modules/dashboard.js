import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";

export const Dashboard = {
  async render(container) {
    const loadingModal = Modal.showLoading('Cargando datos del Dashboard...');

    try {
      // Fetch repository information concurrently
      const [blogInfo, siteInfo, blogCommits, siteCommits] = await Promise.all([
        GitHubAPI.getRepoInfo(REPOS.blog).catch(() => null),
        GitHubAPI.getRepoInfo(REPOS.site).catch(() => null),
        GitHubAPI.getLatestCommit(REPOS.blog).catch(() => []),
        GitHubAPI.getLatestCommit(REPOS.site).catch(() => [])
      ]);

      Modal.close(loadingModal);

      const renderRepoCard = (title, info, commits, type) => {
        if (!info) {
          return `<div class="card error">
            <h3>${title}</h3>
            <p>Error al cargar el repositorio. Verifique los permisos del token.</p>
          </div>`;
        }

        const lastCommit = commits && commits.length > 0 ? commits[0] : null;

        return `
          <div class="card">
            <h3><a href="${info.html_url}" target="_blank">${info.name}</a></h3>
            <p class="repo-desc">${info.description || 'Sin descripción'}</p>

            <ul class="repo-stats">
              <li><strong>Rama:</strong> ${type === 'blog' ? REPOS.blog.branch : REPOS.site.branch}</li>
              <li><strong>Tamaño:</strong> ${(info.size / 1024).toFixed(2)} MB</li>
              <li><strong>Privado:</strong> ${info.private ? 'Sí' : 'No'}</li>
              <li><strong>Última Actualización:</strong> ${new Date(info.updated_at).toLocaleString()}</li>
            </ul>

            <div class="commit-info">
              <h4>Último Commit</h4>
              ${lastCommit ? `
                <div class="commit-message">${lastCommit.commit.message}</div>
                <div class="commit-meta">
                  Por <strong>${lastCommit.commit.author.name}</strong> el ${new Date(lastCommit.commit.author.date).toLocaleString()}
                </div>
                <a href="${lastCommit.html_url}" target="_blank" class="commit-link">Ver en GitHub</a>
              ` : '<p>No hay commits recientes</p>'}
            </div>

            <div class="card-actions">
              <a href="#/${type === 'blog' ? 'blog' : 'academico'}" class="btn btn-primary">Gestionar Contenido</a>
            </div>
          </div>
        `;
      };

      container.innerHTML = `
        <div class="module-header">
          <h2>Dashboard</h2>
          <p>Visión general de los repositorios conectados</p>
        </div>

        <div class="dashboard-grid">
          ${renderRepoCard('Blog', blogInfo, blogCommits, 'blog')}
          ${renderRepoCard('Sitio Principal', siteInfo, siteCommits, 'site')}
        </div>
      `;

    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError(error.message);
      container.innerHTML = `<div class="error-state"><h2>Error cargando dashboard</h2><p>${error.message}</p></div>`;
    }
  }
};
