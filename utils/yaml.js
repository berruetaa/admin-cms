/**
 * Basic YAML parser and serializer for frontmatter.
 * This is very rudimentary, focused only on strings, numbers, booleans, and string arrays.
 */

export const YAML = {
  /**
   * Parse a YAML string into a JavaScript object.
   * @param {string} yamlStr
   * @returns {Object}
   */
  parse(yamlStr) {
    const lines = yamlStr.split("\n");
    const result = {};
    let currentKey = null;
    let isArray = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trimEnd(); // Keep leading spaces for array items

      if (!line || line.trim().startsWith("#")) continue;

      // Match array item
      const arrayMatch = line.match(/^(\s*)-\s+(.*)$/);
      if (arrayMatch && currentKey && isArray) {
        let value = arrayMatch[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        result[currentKey].push(value);
        continue;
      }

      // Match key-value pair
      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();

        if (value === "") {
          // Could be starting an array or empty value
          currentKey = key;
          isArray = true;
          result[key] = [];
        } else {
          // Scalar value
          isArray = false;
          currentKey = null;

          if (value === "true") value = true;
          else if (value === "false") value = false;
          else if (value === "null") value = null;
          else if (!isNaN(value) && value !== "") value = Number(value);
          else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);

          result[key] = value;
        }
      }
    }

    return result;
  },

  /**
   * Serialize a JavaScript object into a YAML string.
   * @param {Object} obj
   * @returns {string}
   */
  stringify(obj) {
    let yaml = "";

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        yaml += `${key}:\n`;
        value.forEach(item => {
          yaml += `  - ${this._formatValue(item)}\n`;
        });
      } else if (typeof value === 'object' && value !== null) {
        // Nested objects not fully supported, skip or handle basically
      } else {
        // Always quote dates and descriptions for consistency with user example
        if (key.toLowerCase().includes('datetime') || key === 'description' || key === 'title') {
           yaml += `${key}: "${String(value).replace(/"/g, '\\"')}"\n`;
        } else {
           yaml += `${key}: ${this._formatValue(value)}\n`;
        }
      }
    }

    return yaml.trim();
  },

  _formatValue(value) {
    if (typeof value === "string") {
      // Check if string contains spaces or special chars, add quotes if needed
      // Added check for more characters that usually require quotes in YAML
      const needsQuotes = /[:#\[\]{}|>&%@`!,]/.test(value) || value === "" || /^\s/.test(value) || /\s$/.test(value);

      if (needsQuotes) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }
};
