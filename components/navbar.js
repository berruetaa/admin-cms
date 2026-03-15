import { ColorfulTitle } from "./ColorfulTitle.js";

export const Navbar = {
  render() {
    return `
      <aside class="sidebar">
        <div class="sidebar-header">
          <a href="#/dashboard" class="logo">
            <span class="logo-text">Berrueta</span><span class="logo-punct">;</span>
          </a>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li><a href="#/dashboard" id="nav-dashboard" class="nav-link">Dashboard</a></li>
            <li><a href="#/blog" id="nav-blog" class="nav-link">Blog</a></li>
            <li><a href="#/academico" id="nav-academico" class="nav-link">Académico</a></li>
            <li><a href="#/files" id="nav-files" class="nav-link">Files</a></li>
            <li><a href="#/tools" id="nav-tools" class="nav-link">Tools</a></li>
            <li><a href="#/system" id="nav-system" class="nav-link">Sistema</a></li>
          </ul>
        </nav>
        <div class="sidebar-footer">
          <button id="logout-btn" class="btn btn-secondary w-100">Cerrar Sesión</button>
        </div>
      </aside>
    `;
  },

  setActive(hash) {
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-nav a[href="${hash}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  },

  init() {
    // Start Logo Animation
    ColorfulTitle.init();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        import('../services/auth.js').then(({ Auth }) => {
          Auth.removeToken();
          window.location.hash = '#/login';
        });
      });
    }
  }
};
