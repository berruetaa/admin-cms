import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Markdown } from "../utils/markdown.js";
import { Form } from "../components/form.js";
import { Modal } from "../components/modal.js";
import { Autosave } from "../utils/autosave.js";
import { Sitemap } from "../utils/sitemap.js";
import { SearchDataStore } from "../components/navbar.js";

const BLOG_PATH = "src/data/blog";
const EASYMDE_JS = "https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js";

/** Lazy-load EasyMDE from CDN once */
async function loadEasyMDE() {
  if (window.EasyMDE) return window.EasyMDE;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = EASYMDE_JS;
    script.onload = () => resolve(window.EasyMDE);
    script.onerror = () => reject(new Error("No se pudo cargar EasyMDE"));
    document.head.appendChild(script);
  });
}

export const Blog = {
  async render(container) {
    container.innerHTML = `
      <div class="module-header">
        <h2>Gestión del Blog</h2>
        <button id="btn-new-post" class="btn btn-primary">Nuevo Artículo</button>
      </div>
      <div id="blog-content">
        <div class="loading-spinner"></div> Cargando artículos...
      </div>
    `;

    document.getElementById("btn-new-post").addEventListener("click", () => this.showEditor());

    await this.loadPosts();
  },

  async loadPosts() {
    const contentDiv = document.getElementById("blog-content");

    try {
      const files = await GitHubAPI.getDirectory(REPOS.blog, BLOG_PATH);
      const mdFiles = files.filter(f => f.name.endsWith(".md"));

      if (mdFiles.length === 0) {
        contentDiv.innerHTML = "<p>No hay artículos en el blog.</p>";
        // Clear search store
        SearchDataStore.blog = [];
        return;
      }

      // Feed search store with basic metadata (name only since we don't fetch all frontmatters)
      SearchDataStore.blog = mdFiles.map(f => ({ name: f.name, frontmatter: { title: f.name.replace('.md','') } }));

      // Count drafts saved locally
      const draftCount = mdFiles.filter(f => Autosave.load(f.name.replace('.md', ''))).length;
      const draftBanner = draftCount > 0
        ? `<div class="autosave-banner">💾 ${draftCount} borrador(es) sin publicar guardados localmente.</div>`
        : '';

      let html = `${draftBanner}<table class="table">
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Borrador local</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
      `;

      mdFiles.forEach(file => {
        const slug = file.name.replace('.md', '');
        const draft = Autosave.load(slug);
        const draftLabel = draft
          ? `<span title="Borrador guardado ${Autosave.timeAgo(draft.savedAt)}">💾 ${Autosave.timeAgo(draft.savedAt)}</span>`
          : '-';

        html += `
          <tr>
            <td>${file.name}</td>
            <td>${draftLabel}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary btn-edit" data-path="${file.path}" data-sha="${file.sha}" data-name="${file.name}">Editar</button>
              <button class="btn btn-sm btn-warning btn-duplicate" data-path="${file.path}" data-sha="${file.sha}" data-name="${file.name}">Duplicar</button>
              <button class="btn btn-sm btn-danger btn-delete" data-path="${file.path}" data-sha="${file.sha}">Borrar</button>
            </td>
          </tr>
        `;
      });

      html += "</tbody></table>";
      contentDiv.innerHTML = html;

      contentDiv.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const { path, sha, name } = e.target.dataset;
          this.editPost(path, sha, name);
        });
      });

      contentDiv.querySelectorAll(".btn-duplicate").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const { path, sha, name } = e.target.dataset;
          this.duplicatePost(path, sha, name);
        });
      });

      contentDiv.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", (e) => this.deletePost(e.target.dataset.path, e.target.dataset.sha));
      });

    } catch (error) {
      contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  async showEditor(post = null, prefillData = null) {
    const isEdit = !!post;
    const EasyMDE = await loadEasyMDE();

    // Check for local draft
    const draftKey = isEdit ? post.name.replace('.md', '') : '__new__';
    const savedDraft = Autosave.load(draftKey);

    const meta = prefillData || (isEdit ? post.frontmatter : {});
    const initialContent = savedDraft
      ? savedDraft.data.content
      : (isEdit ? post.content : '');

    const initialMeta = savedDraft ? savedDraft.data.meta : meta;

    const overlay = Modal.create(
      isEdit ? "Editar Artículo" : "Nuevo Artículo",
      `
        <form id="post-form">
          ${savedDraft ? `<div class="autosave-banner">⚡ Borrador local restaurado (${Autosave.timeAgo(savedDraft.savedAt)}). <button type="button" id="discard-draft" class="btn btn-sm btn-danger" style="padding:2px 8px;font-size:.75rem;">Descartar</button></div>` : ''}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
            ${Form.renderField({ id: "slug", label: "Slug", value: isEdit ? (initialMeta.slug || post.name.replace('.md', '')) : (prefillData?.slug || ''), required: true, type: "text" })}
            ${Form.renderField({ id: "title", label: "Título", value: initialMeta.title || '', required: true })}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
            ${Form.renderField({ id: "pubDatetime", label: "Fecha publicación", value: initialMeta.pubDatetime || new Date().toISOString(), type: "text", required: true })}
            ${Form.renderField({ id: "modDatetime", label: "Fecha modificación", value: initialMeta.modDatetime || new Date().toISOString(), type: "text", required: true })}
          </div>
          ${Form.renderField({ id: "author", label: "Autor", value: initialMeta.author || 'Sebastián Berrueta', required: true })}
          ${Form.renderField({ id: "description", label: "Descripción", value: initialMeta.description || '', type: "textarea", rows: 2, required: true })}
          ${Form.renderField({ id: "tags", label: "Tags", value: initialMeta.tags || [], type: "tags" })}

          <div style="display:flex;gap:1.5rem;margin-bottom:.75rem;">
            ${Form.renderField({ id: "featured", label: "Destacado", value: initialMeta.featured || false, type: "checkbox" })}
            ${Form.renderField({ id: "draft", label: "Borrador", value: initialMeta.draft || false, type: "checkbox" })}
          </div>

          <div class="form-group">
            <label>Contenido Markdown</label>
            <textarea id="md-editor-textarea">${initialContent}</textarea>
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" id="editor-cancel">Cancelar</button>
        <button class="btn btn-primary" id="editor-save">Guardar en GitHub</button>
      `
    );

    // Initialize EasyMDE
    const easyMDE = new EasyMDE({
      element: overlay.querySelector("#md-editor-textarea"),
      spellChecker: false,
      autosave: { enabled: false },
      minHeight: "280px",
      toolbar: [
        "bold", "italic", "heading", "|",
        "quote", "unordered-list", "ordered-list", "|",
        "link", "image", "table", "|",
        "preview", "side-by-side", "fullscreen", "|",
        "guide"
      ],
      renderingConfig: {
        singleLineBreaks: false,
      }
    });

    // Auto-save to localStorage every 5 seconds
    let autosaveTimer = setInterval(() => {
      const form = overlay.querySelector("#post-form");
      const formData = this._collectFormData(form, easyMDE);
      Autosave.save(draftKey, { meta: formData, content: easyMDE.value() });
    }, 5000);

    // Discard draft button
    const discardBtn = overlay.querySelector("#discard-draft");
    if (discardBtn) {
      discardBtn.addEventListener("click", () => {
        Autosave.remove(draftKey);
        Modal.close(overlay);
        this.showEditor(post, prefillData);
      });
    }

    overlay.querySelector("#editor-cancel").addEventListener("click", () => {
      clearInterval(autosaveTimer);
      Modal.close(overlay);
    });

    overlay.querySelector("#editor-save").addEventListener("click", async () => {
      const form = overlay.querySelector("#post-form");
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const data = this._collectFormData(form, easyMDE);
      const slug = Markdown.slugify(data.slug);
      const filePath = `${BLOG_PATH}/${slug}.md`;

      const frontmatter = {
        author: data.author,
        pubDatetime: data.pubDatetime,
        modDatetime: new Date().toISOString(),
        title: data.title,
        slug,
        featured: data.featured,
        draft: data.draft,
        tags: data.tags,
        description: data.description
      };

      const fullContent = Markdown.stringifyFrontmatter(frontmatter, easyMDE.value());
      const commitMessage = isEdit ? `Update blog post: ${slug}` : `Create blog post: ${slug}`;

      const loadingModal = Modal.showLoading("Guardando artículo...");

      try {
        if (isEdit) {
          if (post.name !== `${slug}.md`) {
            await GitHubAPI.deleteFile(REPOS.blog, post.path, `Rename blog post from ${post.name}`, post.sha);
            await GitHubAPI.createFile(REPOS.blog, filePath, fullContent, commitMessage);
          } else {
            await GitHubAPI.updateFile(REPOS.blog, filePath, fullContent, commitMessage, post.sha);
          }
        } else {
          await GitHubAPI.createFile(REPOS.blog, filePath, fullContent, commitMessage);
        }

        clearInterval(autosaveTimer);
        Autosave.remove(draftKey);
        Modal.close(loadingModal);
        Modal.close(overlay);
        // Update sitemap
        Sitemap.update();
        this.loadPosts();
      } catch (error) {
        Modal.close(loadingModal);
        Modal.showError(`Error al guardar: ${error.message}`);
      }
    });
  },

  _collectFormData(form, easyMDE) {
    return Form.getFormData(form, [
      { id: "slug", type: "text" },
      { id: "title", type: "text" },
      { id: "pubDatetime", type: "text" },
      { id: "modDatetime", type: "text" },
      { id: "author", type: "text" },
      { id: "description", type: "textarea" },
      { id: "tags", type: "tags" },
      { id: "featured", type: "checkbox" },
      { id: "draft", type: "checkbox" }
    ]);
  },

  async editPost(path, sha, name) {
    const loadingModal = Modal.showLoading("Cargando artículo...");
    try {
      const file = await GitHubAPI.getFile(REPOS.blog, path);
      Modal.close(loadingModal);

      const parsed = Markdown.parseFrontmatter(file.decodedContent);

      this.showEditor({
        name: file.name,
        path: file.path,
        sha: file.sha,
        frontmatter: parsed.frontmatter,
        content: parsed.content
      });

    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError("Error al cargar el artículo.");
    }
  },

  async duplicatePost(path, sha, name) {
    const loadingModal = Modal.showLoading("Cargando artículo para duplicar...");
    try {
      const file = await GitHubAPI.getFile(REPOS.blog, path);
      Modal.close(loadingModal);

      const parsed = Markdown.parseFrontmatter(file.decodedContent);

      // Open editor with copied data but empty slug to force rename
      this.showEditor(null, {
        ...parsed.frontmatter,
        slug: '',
        title: parsed.frontmatter.title + ' (copia)',
        draft: true
      });

      // Pre-populate content via the draft mechanism
      const draftKey = '__new__';
      Autosave.save(draftKey, {
        meta: { ...parsed.frontmatter, slug: '', title: parsed.frontmatter.title + ' (copia)', draft: true },
        content: parsed.content
      });

    } catch (error) {
      Modal.close(loadingModal);
      Modal.showError("Error al duplicar el artículo.");
    }
  },

  async deletePost(path, sha) {
    Modal.showConfirm("¿Estás seguro de que deseas eliminar este artículo?", async () => {
      const loadingModal = Modal.showLoading("Eliminando...");
      try {
        await GitHubAPI.deleteFile(REPOS.blog, path, `Delete blog post: ${path}`, sha);
        Modal.close(loadingModal);
        // Update sitemap
        Sitemap.update();
        this.loadPosts();
      } catch (error) {
        Modal.close(loadingModal);
        Modal.showError(`Error al eliminar: ${error.message}`);
      }
    });
  }
};
