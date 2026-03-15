export class Router {
    constructor(routes) {
        this.routes = routes;
        this.rootElement = document.getElementById('main-content');
        this.init();
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        // Handle initial route
        if (!window.location.hash) {
            window.location.hash = '#/';
        } else {
            this.handleRoute();
        }
    }

    async handleRoute() {
        let path = window.location.hash.slice(1) || '/';

        // Remove trailing slash if present (except for root)
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        const route = this.routes[path] || this.routes['*'];

        if (route) {
            // Check auth if route requires it
            if (route.requiresAuth && !this.isAuthenticated()) {
                window.location.hash = '#/login';
                return;
            }

            // Render component
            if (typeof route.render === 'function') {
                const html = await route.render();
                if (html) {
                    this.rootElement.innerHTML = html;
                }
            }

            // Run any post-render initialization
            if (typeof route.init === 'function') {
                route.init();
            }

            // Update active state in navigation
            this.updateNav(path);

            // Update UI
            import('../app.js').then(module => {
                module.updateUIAuth(this.isAuthenticated());
            }).catch(e => console.error(e));
        } else {
            this.rootElement.innerHTML = '<h2>404 - Not Found</h2>';
        }
    }

    isAuthenticated() {
        return !!localStorage.getItem('github_pat');
    }

    updateNav(path) {
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${path}`) {
                link.classList.add('active');
            }
        });
    }

    navigate(path) {
        window.location.hash = path;
    }
}
