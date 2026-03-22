/**
 * Validation utilities for the CMS.
 */
export const Validators = {
  /**
   * Returns true if the slug does NOT already exist in the list of files.
   * @param {string} slug - e.g. "mi-articulo"
   * @param {Array<{name: string}>} existingFiles - array of file objects with .name
   */
  isSlugUnique(slug, existingFiles) {
    const filename = `${slug}.md`;
    return !existingFiles.some(f => f.name.toLowerCase() === filename.toLowerCase());
  },

  /**
   * Returns true if the filename does NOT already exist in the directory listing.
   * @param {string} name - e.g. "compendio.pdf"
   * @param {Array<{name: string}>} directoryContents
   */
  isFileNameUnique(name, directoryContents) {
    return !directoryContents.some(f => f.name.toLowerCase() === name.toLowerCase());
  },

  /**
   * Returns true if the category ID does NOT already exist in the categories array.
   * @param {string} id - e.g. "quimica"
   * @param {Array<{id: string}>} categories
   */
  isCategoryIdUnique(id, categories) {
    return !categories.some(c => c.id.toLowerCase() === id.toLowerCase());
  }
};
