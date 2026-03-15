import { ColorfulTitle } from "./ColorfulTitle.js";

export const Navbar = {
  render() {
    return `
      <div class="mobile-header">
        <a href="#/dashboard" class="logo">
          <span class="logo-text">Berrueta</span><span class="logo-punct">;</span>
        </a>
        <button id="menu-toggle" class="menu-toggle" aria-label="Toggle menu">☰</button>
      </div>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <a href="#/dashboard" class="logo">
            <span class="logo-text">Berrueta</span><span class="logo-punct">;</span>
            <span class="logo-sub">Admin</span>
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

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuToggle && sidebar && overlay) {
      const toggleMenu = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
      };

      menuToggle.addEventListener('click', toggleMenu);
      overlay.addEventListener('click', toggleMenu);

      // Close menu on navigation
      document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
          }
        });
      });
    }

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
