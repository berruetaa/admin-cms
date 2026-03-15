import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Modal } from "../components/modal.js";

export const System = {
  async render(container) {
    const loadingModal = Modal.showLoading('Cargando información del sistema...');

    try {
      const [rateLimit, blogBranches, siteBranches] = await Promise.all([
        GitHubAPI.getRateLimit(),
        GitHubAPI.getBranches(REPOS.blog).catch(() => []),
        GitHubAPI.getBranches(REPOS.site).catch(() => [])
      ]);

      Modal.close(loadingModal);

      const renderRepoInfo = (title, config, branches) => {
        return `
          <div class="card">
            <h3>Repositorio: ${title}</h3>
            <ul class="repo-stats">
              <li><strong>Owner:</strong> ${config.owner}</li>
              <li><strong>Repo:</strong> ${config.repo}</li>
              <li><strong>Rama objetivo:</strong> ${config.branch}</li>
            </ul>
            <h4>Ramas disponibles</h4>
            <ul>
              ${branches.map(b => `<li>${b.name} ${b.name === config.branch ? '<strong>(Activa)</strong>' : ''}</li>`).join('')}
            </ul>
          </div>
        `;
      };

      const limit = rateLimit.resources.core;
      const resetTime = new Date(limit.reset * 1000).toLocaleString();
      const percentUsed = ((limit.limit - limit.remaining) / limit.limit) * 100;

      container.innerHTML = `
        <div class="module-header">
          <h2>Estado del Sistema</h2>
          <p>Información técnica de conexión con GitHub</p>
        </div>

        <div class="card" style="margin-bottom: 2rem;">
          <h3>API de GitHub - Rate Limit</h3>
          <div class="rate-limit-bar" style="background: #e2e8f0; height: 10px; border-radius: 5px; margin: 10px 0; overflow: hidden;">
            <div style="background: ${percentUsed > 80 ? '#ef4444' : '#3b82f6'}; width: ${percentUsed}%; height: 100%;"></div>
          </div>
          <ul class="repo-stats">
            <li><strong>Límite total:</strong> ${limit.limit} peticiones/hora</li>
            <li><strong>Restantes:</strong> ${limit.remaining} peticiones</li>
            <li><strong>Se reinicia a las:</strong> ${resetTime}</li>
          </ul>
        </div>

        <div class="dashboard-grid">
          ${renderRepoInfo('Blog', REPOS.blog, blogBranches)}
          ${renderRepoInfo('Sitio Principal', REPOS.site, siteBranches)}
        </div>
      `;

    } catch (error) {
      Modal.close(loadingModal);
      container.innerHTML = `<div class="error-state"><h2>Error cargando estado del sistema</h2><p>${error.message}</p></div>`;
    }
  }
};
