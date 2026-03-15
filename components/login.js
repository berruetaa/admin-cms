import { githubApi } from '../services/github-api.js';

export const LoginComponent = {
    render: async () => {
        return `
            <div class="login-container">
                <div class="login-card">
                    <h1>Admin CMS</h1>
                    <p>Accede con tu Personal Access Token de GitHub.</p>
                    <form id="login-form">
                        <div class="form-group">
                            <label for="github-pat">GitHub PAT</label>
                            <input type="password" id="github-pat" placeholder="ghp_..." required>
                        </div>
                        <button type="submit" class="btn">Ingresar</button>
                        <div id="login-error" class="error-message" style="display:none;"></div>
                    </form>
                    <div class="login-help">
                        <small>El token necesita permisos de <code>repo</code>.</small>
                    </div>
                </div>
            </div>
        `;
    },

    init: () => {
        const form = document.getElementById('login-form');
        const errorDiv = document.getElementById('login-error');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = document.getElementById('github-pat').value.trim();

            if (!token) return;

            // Test token validity
            githubApi.setToken(token);
            const authResult = await githubApi.testConnection();

            if (authResult.success) {
                // Redirect to dashboard
                window.location.hash = '#/dashboard';
            } else {
                // Show error
                githubApi.removeToken();
                errorDiv.textContent = `Error de autenticación: Token inválido.`;
                errorDiv.style.display = 'block';
            }
        });
    }
};
