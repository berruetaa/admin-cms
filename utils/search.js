/**
 * Search utility — searches across Blog, Académico and Tools datasets.
 *
 * Usage:
 *   import { Search } from '../utils/search.js';
 *   const results = Search.query('quimica', { blog, academico, tools });
 */
export const Search = {
  /**
   * @param {string} query - raw search string
   * @param {Object} datasets - { blog: [], academico: { categories: [], resources: [] }, tools: [] }
   * @returns {{ section, label, sublabel, hash }[]}
   */
  query(query, datasets) {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const results = [];

    // ── Blog ─────────────────────────────────────────────────────────────────
    if (datasets.blog && Array.isArray(datasets.blog)) {
      datasets.blog.forEach(post => {
        const title = (post.frontmatter?.title || post.name || '').toLowerCase();
        const desc  = (post.frontmatter?.description || '').toLowerCase();
        const tags  = ((post.frontmatter?.tags || []).join(' ')).toLowerCase();
        if (title.includes(q) || desc.includes(q) || tags.includes(q)) {
          results.push({
            section: 'Blog',
            icon: '📝',
            label: post.frontmatter?.title || post.name,
            sublabel: post.frontmatter?.description || post.name,
            hash: '#/blog'
          });
        }
      });
    }

    // ── Académico — categorías ────────────────────────────────────────────────
    const acad = datasets.academico;
    if (acad) {
      (acad.categories || []).forEach(cat => {
        if (
          cat.name?.toLowerCase().includes(q) ||
          cat.description?.toLowerCase().includes(q) ||
          cat.id?.toLowerCase().includes(q)
        ) {
          results.push({
            section: 'Académico',
            icon: '📚',
            label: cat.name,
            sublabel: cat.description || '',
            hash: '#/academico'
          });
        }
      });

      // ── Académico — recursos ──────────────────────────────────────────────
      (acad.resources || []).forEach(res => {
        if (
          res.title?.toLowerCase().includes(q) ||
          res.description?.toLowerCase().includes(q) ||
          res.group?.toLowerCase().includes(q) ||
          (res.tags || []).join(' ').toLowerCase().includes(q)
        ) {
          results.push({
            section: 'Académico',
            icon: '📄',
            label: res.title,
            sublabel: `${res.category} › ${res.group || ''}`,
            hash: '#/academico'
          });
        }
      });
    }

    // ── Herramientas ─────────────────────────────────────────────────────────
    if (datasets.tools && Array.isArray(datasets.tools)) {
      datasets.tools.forEach(tool => {
        if (
          tool.name?.toLowerCase().includes(q) ||
          tool.description?.toLowerCase().includes(q) ||
          tool.id?.toLowerCase().includes(q)
        ) {
          results.push({
            section: 'Herramientas',
            icon: '🔧',
            label: tool.name,
            sublabel: tool.description || tool.url || '',
            hash: '#/tools'
          });
        }
      });
    }

    // ── Juegos ───────────────────────────────────────────────────────────────
    if (datasets.juegos && Array.isArray(datasets.juegos)) {
      datasets.juegos.forEach(game => {
        if (
          game.name?.toLowerCase().includes(q) ||
          game.description?.toLowerCase().includes(q) ||
          game.category?.toLowerCase().includes(q)
        ) {
          results.push({
            section: 'Juegos',
            icon: '🎮',
            label: game.name,
            sublabel: `${game.category} › ${game.description || ''}`,
            hash: '#/juegos'
          });
        }
      });
    }

    return results;
  }
};
