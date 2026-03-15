export const Navbar = {
  render() {
    return `
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Admin CMS</h2>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li><a href="#/dashboard" id="nav-dashboard">Dashboard</a></li>
            <li><a href="#/blog" id="nav-blog">Blog</a></li>
            <li><a href="#/academico" id="nav-academico">Académico</a></li>
            <li><a href="#/files" id="nav-files">Files</a></li>
            <li><a href="#/tools" id="nav-tools">Tools</a></li>
            <li><a href="#/system" id="nav-system">Sistema</a></li>
          </ul>
        </nav>
        <div class="sidebar-footer">
          <button id="logout-btn" class="btn btn-danger">Cerrar Sesión</button>
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
