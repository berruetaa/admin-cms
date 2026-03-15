import { Router } from './utils/router.js';
import { LoginComponent } from './components/login.js';
import { DashboardComponent } from './components/dashboard.js';
import { BlogComponent } from './components/blog.js';
import { AcademicoComponent } from './components/academico.js';
import { FilesComponent } from './components/files.js';
import { ToolsComponent } from './components/tools.js';
import { SystemComponent } from './components/system.js';
import { githubApi } from './services/github-api.js';

// Define the routes map
const routes = {
    '/login': LoginComponent,
    '/dashboard': DashboardComponent,
    '/blog': BlogComponent,
    '/academico': AcademicoComponent,
    '/files': FilesComponent,
    '/tools': ToolsComponent,
    '/system': SystemComponent,
    '/': DashboardComponent // Default route
};

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Basic setup for logout button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        githubApi.removeToken();
        window.location.hash = '#/login';
        updateUIAuth(false);
    });

    const router = new Router(routes);

    // Initial auth check to update UI
    const isAuth = router.isAuthenticated();
    updateUIAuth(isAuth);

    if (isAuth) {
        // Try fetching user to show username
        const authCheck = await githubApi.testConnection();
        if (authCheck.success) {
            document.getElementById('user-info').textContent = `Conectado como ${authCheck.user.login}`;
        } else {
             githubApi.removeToken();
             window.location.hash = '#/login';
             updateUIAuth(false);
        }
    }
});

// Helper to toggle sidebar and topbar elements based on auth state
export function updateUIAuth(isAuthenticated) {
    const sidebar = document.getElementById('sidebar');
    const mainLayout = document.getElementById('main-layout');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');

    if (isAuthenticated) {
        sidebar.style.display = 'flex';
        mainLayout.style.marginLeft = '250px'; // Make room for sidebar
        logoutBtn.style.display = 'block';
    } else {
        sidebar.style.display = 'none';
        mainLayout.style.marginLeft = '0'; // Full width
        logoutBtn.style.display = 'none';
        userInfo.textContent = 'Desconectado';
    }
}
