import { ColorfulTitle } from "./ColorfulTitle.js";
import { Search } from "../utils/search.js";

// Shared data store updated by each module when it loads its data
export const SearchDataStore = {
  blog: [],
  academico: { categories: [], resources: [] },
  tools: []
};

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

        <!-- Global Search -->
        <div class="sidebar-search">
          <input
            type="search"
            id="global-search"
            class="form-control"
            placeholder="🔍 Buscar..."
            autocomplete="off"
          >
          <div id="search-results" class="search-results" hidden></div>
        </div>

        <nav class="sidebar-nav">
          <ul>
            <li><a href="#/dashboard" id="nav-dashboard" class="nav-link">Dashboard</a></li>
            <li><a href="#/homepage" id="nav-homepage" class="nav-link">Homepage</a></li>
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
    if (activeLink) activeLink.classList.add('active');
  },

  init() {
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
      document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
          }
        });
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        import('../services/auth.js').then(({ Auth }) => {
          Auth.removeToken();
          window.location.hash = '#/login';
        });
      });
    }

    // Global search
    this._initSearch();
  },

  _initSearch() {
    const input = document.getElementById('global-search');
    const resultsBox = document.getElementById('search-results');
    if (!input || !resultsBox) return;

    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = input.value.trim();
        if (query.length < 2) {
          resultsBox.hidden = true;
          resultsBox.innerHTML = '';
          return;
        }

        const results = Search.query(query, SearchDataStore);

        if (results.length === 0) {
          resultsBox.innerHTML = '<div class="search-no-results">Sin resultados</div>';
        } else {
          resultsBox.innerHTML = results.map(r => `
            <a href="${r.hash}" class="search-result-item" data-hash="${r.hash}">
              <span class="search-result-icon">${r.icon}</span>
              <span class="search-result-body">
                <strong>${r.label}</strong>
                <small>${r.sublabel}</small>
              </span>
              <span class="search-result-section">${r.section}</span>
            </a>
          `).join('');
        }

        resultsBox.hidden = false;
      }, 220);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !resultsBox.contains(e.target)) {
        resultsBox.hidden = true;
      }
    });

    // Close on result click
    resultsBox.addEventListener('click', () => {
      resultsBox.hidden = true;
      input.value = '';
    });

    // Close on Escape
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { resultsBox.hidden = true; input.value = ''; }
    });
  }
};
