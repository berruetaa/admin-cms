import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";
import { Markdown } from "../utils/markdown.js";
import { Form } from "../components/form.js";
import { Modal } from "../components/modal.js";

const BLOG_PATH = "src/data/blog";

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
        return;
      }

      let html = `<table class="table">
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
      `;

      mdFiles.forEach(file => {
        html += `
          <tr>
            <td>${file.name}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary btn-edit" data-path="${file.path}" data-sha="${file.sha}">Editar</button>
              <button class="btn btn-sm btn-danger btn-delete" data-path="${file.path}" data-sha="${file.sha}">Borrar</button>
            </td>
          </tr>
        `;
      });

      html += "</tbody></table>";
      contentDiv.innerHTML = html;

      // Bind events
      contentDiv.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", (e) => this.editPost(e.target.dataset.path, e.target.dataset.sha));
      });

      contentDiv.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", (e) => this.deletePost(e.target.dataset.path, e.target.dataset.sha));
      });

    } catch (error) {
      contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  async showEditor(post = null) {
    const isEdit = !!post;

    const overlay = Modal.create(
      isEdit ? "Editar Artículo" : "Nuevo Artículo",
      `
        <form id="post-form">
          ${Form.renderField({ id: "slug", label: "Slug", value: isEdit ? (post.frontmatter.slug || post.name.replace('.md', '')) : '', required: true, type: "text" })}
          ${Form.renderField({ id: "title", label: "Título", value: isEdit ? post.frontmatter.title : '', required: true })}
          ${Form.renderField({ id: "pubDatetime", label: "Fecha de publicación", value: isEdit ? post.frontmatter.pubDatetime : new Date().toISOString(), type: "text", required: true })}
          ${Form.renderField({ id: "modDatetime", label: "Fecha de modificación", value: isEdit ? post.frontmatter.modDatetime : new Date().toISOString(), type: "text", required: true })}
          ${Form.renderField({ id: "author", label: "Autor", value: isEdit ? post.frontmatter.author : 'Sebastián Berrueta', required: true })}
          ${Form.renderField({ id: "description", label: "Descripción", value: isEdit ? post.frontmatter.description : '', type: "textarea", rows: 2, required: true })}
          ${Form.renderField({ id: "tags", label: "Tags", value: isEdit ? (post.frontmatter.tags || []) : [], type: "tags" })}

          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            ${Form.renderField({ id: "featured", label: "Destacado", value: isEdit ? post.frontmatter.featured : false, type: "checkbox" })}
            ${Form.renderField({ id: "draft", label: "Borrador", value: isEdit ? post.frontmatter.draft : false, type: "checkbox" })}
          </div>

          <div class="form-group">
            <label>Contenido Markdown</label>
            <div class="editor-toolbar">
              <button type="button" class="btn btn-sm" onclick="document.execCommand('bold', false, null)">B</button>
              <button type="button" class="btn btn-sm" onclick="document.execCommand('italic', false, null)">I</button>
              <button type="button" class="btn btn-sm" onclick="document.execCommand('insertUnorderedList', false, null)">Lista</button>
              <button type="button" class="btn btn-sm" id="toggle-editor-btn">Toggle HTML/Texto</button>
            </div>
            <div id="editor-wysiwyg" class="wysiwyg-editor" contenteditable="true">${isEdit ? post.content : ''}</div>
            <textarea id="editor-textarea" class="form-control" rows="15" style="display:none; font-family: monospace;">${isEdit ? post.content : ''}</textarea>
          </div>
        </form>
      `,
      `
        <button class="btn btn-secondary" id="editor-cancel">Cancelar</button>
        <button class="btn btn-primary" id="editor-save">Guardar</button>
      `
    );

    const form = overlay.querySelector("#post-form");
    const wysiwyg = overlay.querySelector("#editor-wysiwyg");
    const textarea = overlay.querySelector("#editor-textarea");
    const toggleBtn = overlay.querySelector("#toggle-editor-btn");

    let isWysiwyg = true;

    // Sync content on toggle
    toggleBtn.addEventListener("click", () => {
      isWysiwyg = !isWysiwyg;
      if (isWysiwyg) {
        wysiwyg.innerHTML = textarea.value;
        wysiwyg.style.display = "block";
        textarea.style.display = "none";
      } else {
        textarea.value = wysiwyg.innerHTML;
        wysiwyg.style.display = "none";
        textarea.style.display = "block";
      }
    });

    overlay.querySelector("#editor-cancel").addEventListener("click", () => Modal.close(overlay));

    overlay.querySelector("#editor-save").addEventListener("click", async () => {
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Ensure content is synced before save
      const markdownContent = isWysiwyg ? wysiwyg.innerHTML : textarea.value;

      const data = Form.getFormData(form, [
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

      const slug = Markdown.slugify(data.slug);
      const filePath = `${BLOG_PATH}/${slug}.md`;

      const frontmatter = {
        author: data.author,
        pubDatetime: data.pubDatetime,
        modDatetime: data.modDatetime,
        title: data.title,
        slug: slug,
        featured: data.featured,
        draft: data.draft,
        tags: data.tags,
        description: data.description
      };

      const fullContent = Markdown.stringifyFrontmatter(frontmatter, markdownContent);
      const commitMessage = isEdit ? `Update blog post: ${slug}` : `Create blog post: ${slug}`;

      const loadingModal = Modal.showLoading("Guardando artículo...");

      try {
        if (isEdit) {
          // If slug changed, we need to delete old and create new, else update
          if (post.name !== `${slug}.md`) {
             await GitHubAPI.deleteFile(REPOS.blog, post.path, `Rename blog post from ${post.name}`, post.sha);
             await GitHubAPI.createFile(REPOS.blog, filePath, fullContent, commitMessage);
          } else {
             await GitHubAPI.updateFile(REPOS.blog, filePath, fullContent, commitMessage, post.sha);
          }
        } else {
          await GitHubAPI.createFile(REPOS.blog, filePath, fullContent, commitMessage);
        }

        Modal.close(loadingModal);
        Modal.close(overlay);
        this.loadPosts();
      } catch (error) {
        Modal.close(loadingModal);
        Modal.showError(`Error al guardar: ${error.message}`);
      }
    });
  },

  async editPost(path, sha) {
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

  async deletePost(path, sha) {
    Modal.showConfirm("¿Estás seguro de que deseas eliminar este artículo?", async () => {
      const loadingModal = Modal.showLoading("Eliminando...");
      try {
        await GitHubAPI.deleteFile(REPOS.blog, path, `Delete blog post: ${path}`, sha);
        Modal.close(loadingModal);
        this.loadPosts();
      } catch (error) {
        Modal.close(loadingModal);
        Modal.showError(`Error al eliminar: ${error.message}`);
      }
    });
  }
};
