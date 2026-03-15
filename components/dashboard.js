import { githubApi } from '../services/github-api.js';

export const DashboardComponent = {
    requiresAuth: true,
    render: async () => {
        return `
            <div class="dashboard-header">
                <h2>Dashboard</h2>
                <p>Resumen del estado del ecosistema.</p>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Recursos Académicos</h3>
                    <div id="stat-academic" class="stat-value loading">...</div>
                </div>
                <div class="stat-card">
                    <h3>Último Commit (Sitio)</h3>
                    <div id="stat-commit-site" class="stat-value small-text loading">...</div>
                </div>
            </div>
        `;
    },

    init: async () => {
        const repoSite = { owner: 'berruetaa', repo: 'berrueta-site', branch: 'main' };

        // Fetch Academic Resources
        try {
            const dataFile = await githubApi.getFile(repoSite, 'academico/data.json');
            if (dataFile && dataFile.content) {
                const parsedData = JSON.parse(dataFile.content);
                const totalResources = parsedData.resources ? parsedData.resources.length : 0;
                document.getElementById('stat-academic').textContent = totalResources;
                document.getElementById('stat-academic').classList.remove('loading');
            } else {
                throw new Error('No data');
            }
        } catch (error) {
            document.getElementById('stat-academic').textContent = 'Error';
            document.getElementById('stat-academic').classList.remove('loading');
            console.error('Failed to fetch academic data:', error);
        }

        // Fetch Latest Commit for Site
        try {
            const commit = await githubApi.getLatestCommit(repoSite);
            if (commit && commit.sha) {
                const shortSha = commit.sha.substring(0, 7);
                const date = new Date(commit.commit.author.date).toLocaleString();
                document.getElementById('stat-commit-site').innerHTML = `<a href="${commit.html_url}" target="_blank">${shortSha}</a><br><small>${date}</small>`;
                document.getElementById('stat-commit-site').classList.remove('loading');
            } else {
                 throw new Error('No data');
            }
        } catch (error) {
            document.getElementById('stat-commit-site').textContent = 'Error';
            document.getElementById('stat-commit-site').classList.remove('loading');
            console.error('Failed to fetch latest commit:', error);
        }
    }
};
