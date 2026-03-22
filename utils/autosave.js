const PREFIX = 'cms_draft_';

export const Autosave = {
  save(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch (_) {}
  },

  load(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  /** Returns a human-readable string like "hace 3 minutos" */
  timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
    return `hace ${Math.floor(diff / 3600)}h`;
  }
};
