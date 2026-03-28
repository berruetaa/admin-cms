const SETTINGS_KEY = "cms_global_settings_v1";
const SETTINGS_EVENT = "cms-settings-changed";

const DEFAULT_SETTINGS = {
  ui: {
    reducedMotion: false,
    denseUi: false
  },
  academico: {
    resourceList: {
      compact: false,
      showDescription: true,
      showTags: true,
      showCategoryId: true
    }
  }
};

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isPlainObject(base)) return override;
  const merged = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = value;
    }
  });
  return merged;
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function getNestedValue(source, path, fallback) {
  const keys = Array.isArray(path) ? path : String(path || "").split(".").filter(Boolean);
  let current = source;
  for (const key of keys) {
    if (!isPlainObject(current) || !(key in current)) return fallback;
    current = current[key];
  }
  return current;
}

function setNestedValue(target, path, value) {
  const keys = Array.isArray(path) ? path : String(path || "").split(".").filter(Boolean);
  if (!keys.length) return target;
  const root = { ...target };
  let current = root;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }
    const next = isPlainObject(current[key]) ? { ...current[key] } : {};
    current[key] = next;
    current = next;
  });
  return root;
}

function safeReadRaw() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function safeWriteRaw(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function emitSettingsChange(settings) {
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

export const SettingsStore = {
  defaults() {
    return cloneDefaults();
  },

  getAll() {
    return deepMerge(cloneDefaults(), safeReadRaw());
  },

  get(path, fallback = undefined) {
    return getNestedValue(this.getAll(), path, fallback);
  },

  set(path, value) {
    const current = this.getAll();
    const next = setNestedValue(current, path, value);
    safeWriteRaw(next);
    this.applyRuntime(next);
    emitSettingsChange(next);
    return next;
  },

  patch(patchObject) {
    const next = deepMerge(this.getAll(), patchObject || {});
    safeWriteRaw(next);
    this.applyRuntime(next);
    emitSettingsChange(next);
    return next;
  },

  reset() {
    const defaults = cloneDefaults();
    safeWriteRaw(defaults);
    this.applyRuntime(defaults);
    emitSettingsChange(defaults);
    return defaults;
  },

  onChange(handler) {
    if (typeof handler !== "function") return () => {};
    const wrapped = (event) => handler(event.detail || this.getAll());
    window.addEventListener(SETTINGS_EVENT, wrapped);
    return () => window.removeEventListener(SETTINGS_EVENT, wrapped);
  },

  applyRuntime(settings = this.getAll()) {
    document.documentElement.classList.toggle("reduce-motion", !!settings.ui?.reducedMotion);
    document.documentElement.classList.toggle("dense-ui", !!settings.ui?.denseUi);
  },

  getAcademicoResourceListSettings() {
    return this.get("academico.resourceList", cloneDefaults().academico.resourceList);
  }
};
