import { Auth } from "../services/auth.js";
import { Navbar } from "../components/navbar.js";
import { Dashboard } from "../modules/dashboard.js";
import { Blog } from "../modules/blog.js";
import { Academico } from "../modules/academico.js";
import { Files } from "../modules/files.js";
import { Tools } from "../modules/tools.js";
import { System } from "../modules/system.js";
import { ColorfulTitle } from "../components/ColorfulTitle.js";

const routes = {
  "/dashboard": Dashboard,
  "/blog": Blog,
  "/academico": Academico,
  "/files": Files,
  "/tools": Tools,
  "/system": System
};

export const Router = {
  init() {
    window.addEventListener("hashchange", () => this.handleRoute());
    this.handleRoute();
  },

  async handleRoute() {
    const hash = window.location.hash.slice(1) || "/dashboard";
    const appElement = document.getElementById("app");

    // Clear content
    appElement.innerHTML = "";

    // Login Route Handle
    if (hash === "/login") {
      this.renderLogin(appElement);
      return;
    }

    // Require Auth for all other routes
    if (!Auth.isAuthenticated()) {
      window.location.hash = "#/login";
      return;
    }

    // Main Layout setup
    appElement.innerHTML = `
      <div class="app-layout">
        ${Navbar.render()}
        <main class="main-content" id="main-content">
          <div class="loading-spinner"></div> Cargando...
        </main>
      </div>
    `;

    Navbar.init();
    Navbar.setActive(window.location.hash);

    const mainContent = document.getElementById("main-content");
    const module = routes[hash] || Dashboard;

    try {
      if (module && typeof module.render === "function") {
        await module.render(mainContent);
      } else {
        mainContent.innerHTML = "<h1>Módulo no encontrado</h1>";
      }
    } catch (error) {
      console.error(error);
      mainContent.innerHTML = `<div class="alert alert-danger">
        <h4>Error al cargar el módulo</h4>
        <p>${error.message}</p>
      </div>`;
    }
  },

  renderLogin(container) {
    container.innerHTML = `
      <div class="login-container">
        <div class="login-box">
          <h2 class="logo" style="justify-content: center; margin-bottom: 2rem; display: flex; align-items: baseline;">
             <span class="logo-text">Berrueta</span><span class="logo-punct">;</span>
             <span class="logo-sub">Admin</span>
          </h2>
          <form id="login-form">
            <div class="form-group">
              <label for="github-token">GitHub Token</label>
              <input type="password" id="github-token" class="form-control" required placeholder="ghp_xxxxxxxxxxxxxxxxxxx">
            </div>
            <button type="submit" class="btn btn-primary w-100" style="margin-top: 1rem;">Ingresar</button>
          </form>
        </div>
      </div>
    `;

    // Start animated title for login
    ColorfulTitle.init('.logo-punct');

    const form = document.getElementById("login-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const token = document.getElementById("github-token").value.trim();
      if (token) {
        Auth.setToken(token);
        window.location.hash = "#/dashboard";
      }
    });
  }
};
