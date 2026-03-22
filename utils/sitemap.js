import { GitHubAPI } from "../services/github-api.js";
import { REPOS } from "../config/repos.js";

const SITEMAP_PATH = "sitemap.xml";
const BASE_URL = "https://berrueta.uy";

/**
 * Generates a sitemap XML string from categories and blog post slugs.
 * @param {Array<{url: string}>} categories
 * @param {Array<string>} blogSlugs - array of slug strings (without .md)
 * @returns {string} XML string
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
    loc: cat.url || `/academico/${cat.id}/`,
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
   * Reads the current sitemap SHA, rebuilds it and commits.
   * @param {Array<{url: string, id: string}>} categories
   * @param {Array<string>} blogSlugs
   */
  async update(categories, blogSlugs = []) {
    try {
      let sha = null;
      try {
        const existing = await GitHubAPI.getFile(REPOS.site, SITEMAP_PATH);
        sha = existing.sha;
      } catch (_) { /* file may not exist yet */ }

      const xml = buildSitemapXML(categories, blogSlugs);

      if (sha) {
        await GitHubAPI.updateFile(REPOS.site, SITEMAP_PATH, xml, "CMS: update sitemap.xml", sha);
      } else {
        await GitHubAPI.createFile(REPOS.site, SITEMAP_PATH, xml, "CMS: create sitemap.xml");
      }
    } catch (e) {
      console.warn("Sitemap update failed:", e.message);
      // Non-critical, don't throw
    }
  }
};
