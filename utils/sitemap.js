import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";

const SITEMAP_PATH = "sitemap.xml";
const BASE_URL = "https://berrueta.uy";
const BLOG_PATH = "src/data/blog";

/**
 * Builds the complete sitemap XML string.
 */
function buildSitemapXML(categories, blogSlugs) {
  const now = new Date().toISOString().split('T')[0];

  const staticUrls = [
    { loc: '/', priority: '1.0' },
    { loc: '/academico/', priority: '0.9' },
    { loc: '/herramientas/', priority: '0.8' },
    { loc: '/juegos/', priority: '0.7' },
    { loc: '/proyectos/', priority: '0.7' },
  ];

  const categoryUrls = categories.map(cat => ({
    loc: `/academico/${cat.id}/`,
    priority: '0.8'
  }));

  const blogUrls = blogSlugs.map(slug => ({
    loc: `/blog/${slug}/`,
    priority: '0.7'
  }));

  const allUrls = [...staticUrls, ...categoryUrls, ...blogUrls];

  const urlEntries = allUrls.map(u => `
  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`;
}

export const Sitemap = {
  /**
   * Fetches the full list of categories and blog posts to ensure sitemap is complete.
   */
  async update() {
    try {
      // 1. Fetch categories from Gist (used in Académico)
      let categories = [];
      try {
        const gist = await GitHubAPI.getGist(REPOS.gists.academico);
        const data = JSON.parse(gist.files["data.json"].content);
        categories = data.categories || [];
      } catch (e) { console.warn("Sitemap: couldn't fetch categories", e); }

      // 2. Fetch blog posts from Repo (used in Blog)
      let blogSlugs = [];
      try {
        const files = await GitHubAPI.getDirectory(REPOS.blog, BLOG_PATH);
        blogSlugs = files
          .filter(f => f.name.endsWith('.md'))
          .map(f => f.name.replace('.md', ''));
      } catch (e) { console.warn("Sitemap: couldn't fetch blog slugs", e); }

      // 3. Build XML
      const xml = buildSitemapXML(categories, blogSlugs);

      // 4. Update or create sitemap.xml in REPOS.site
      let sha = null;
      try {
        const existing = await GitHubAPI.getFile(REPOS.site, SITEMAP_PATH);
        sha = existing.sha;
      } catch (_) { /* 404 is fine */ }

      const { Base64 } = await import("./base64.js");
      const encodedXml = Base64.encode(xml);

      if (sha) {
        await GitHubAPI.updateFile(REPOS.site, SITEMAP_PATH, encodedXml, "CMS: update sitemap.xml (full sync)", sha);
      } else {
        await GitHubAPI.createFile(REPOS.site, SITEMAP_PATH, encodedXml, "CMS: create sitemap.xml (initial sync)");
      }
      console.log("Sitemap updated successfully.");
    } catch (error) {
      console.error("Sitemap critical error:", error);
    }
  }
};
