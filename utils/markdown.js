import { YAML } from "./yaml.js";

/**
 * Basic Markdown utilities for extracting frontmatter and basic string manipulation.
 */

export const Markdown = {
  /**
   * Parse a markdown string into frontmatter and content.
   * @param {string} mdContent The full markdown content string
   * @returns {{frontmatter: Object, content: string}}
   */
  parseFrontmatter(mdContent) {
    const yamlRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = mdContent.match(yamlRegex);

    if (match) {
      const frontmatterStr = match[1];
      const content = match[2];
      const frontmatter = YAML.parse(frontmatterStr);
      return { frontmatter, content };
    }

    return { frontmatter: {}, content: mdContent };
  },

  /**
   * Stringify an object to frontmatter and content.
   * @param {Object} frontmatter The frontmatter object
   * @param {string} content The markdown content
   * @returns {string} The full markdown string
   */
  stringifyFrontmatter(frontmatter, content) {
    const yamlStr = YAML.stringify(frontmatter);
    return `---\n${yamlStr}\n---\n\n${content}`;
  },

  /**
   * Simple slugify function
   * @param {string} text The text to slugify
   * @returns {string} The slugified text
   */
  slugify(text) {
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  }
};
