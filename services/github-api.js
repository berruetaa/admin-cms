import { Auth } from "./auth.js";
import { Base64 } from "../utils/base64.js";

const API_BASE = "https://api.github.com";

/**
 * Helper to make fetch requests to GitHub API
 */
async function fetchGitHub(endpoint, options = {}) {
  const token = Auth.getToken();
  if (!token) {
    throw new Error("No autenticado");
  }

  const defaultHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, config);

  if (!response.ok) {
    if (response.status === 401) {
      Auth.removeToken();
      window.location.hash = "#/login";
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const GitHubAPI = {
  /**
   * Get a file from a repository
   * @param {Object} repoConfig { owner, repo, branch }
   * @param {string} path Path to the file
   * @returns {Promise<Object>} The file data
   */
  async getFile(repoConfig, path) {
    const { owner, repo, branch } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const data = await fetchGitHub(endpoint);

    // Decode content if it exists
    if (data.content && data.encoding === "base64") {
      data.decodedContent = Base64.decode(data.content);
    }

    return data;
  },

  /**
   * Get contents of a directory
   * @param {Object} repoConfig { owner, repo, branch }
   * @param {string} path Path to the directory
   * @returns {Promise<Array>} Array of file/directory objects
   */
  async getDirectory(repoConfig, path) {
    const { owner, repo, branch } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    return fetchGitHub(endpoint);
  },

  /**
   * Create a new file
   * @param {Object} repoConfig { owner, repo, branch }
   * @param {string} path Path to the file
   * @param {string} content Raw content of the file
   * @param {string} message Commit message
   * @returns {Promise<Object>}
   */
  async createFile(repoConfig, path, content, message) {
    const { owner, repo, branch } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;

    const isBase64 = content.match(/^[A-Za-z0-9+/]+={0,2}$/) && (content.length % 4 === 0);
    const encodedContent = isBase64 ? content : Base64.encode(content);

    return fetchGitHub(endpoint, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: encodedContent,
        branch
      })
    });
  },

  /**
   * Update an existing file
   * @param {Object} repoConfig { owner, repo, branch }
   * @param {string} path Path to the file
   * @param {string} content Raw content of the file
   * @param {string} message Commit message
   * @param {string} sha The blob SHA of the file being replaced
   * @returns {Promise<Object>}
   */
  async updateFile(repoConfig, path, content, message, sha) {
    const { owner, repo, branch } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;

    const isBase64 = content.match(/^[A-Za-z0-9+/]+={0,2}$/) && (content.length % 4 === 0) && content.length > 0;
    const encodedContent = isBase64 ? content : Base64.encode(content);

    return fetchGitHub(endpoint, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: encodedContent,
        sha,
        branch
      })
    });
  },

  /**
   * Delete a file
   * @param {Object} repoConfig { owner, repo, branch }
   * @param {string} path Path to the file
   * @param {string} message Commit message
   * @param {string} sha The blob SHA of the file being deleted
   * @returns {Promise<Object>}
   */
  async deleteFile(repoConfig, path, message, sha) {
    const { owner, repo, branch } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;

    return fetchGitHub(endpoint, {
      method: "DELETE",
      body: JSON.stringify({
        message,
        sha,
        branch
      })
    });
  },

  /**
   * Get repository info
   * @param {Object} repoConfig { owner, repo }
   */
  async getRepoInfo(repoConfig) {
    const { owner, repo } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}`;
    return fetchGitHub(endpoint);
  },

  /**
   * Get branches
   */
  async getBranches(repoConfig) {
    const { owner, repo } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}/branches`;
    return fetchGitHub(endpoint);
  },

  /**
   * Get latest commit
   */
  async getLatestCommit(repoConfig) {
    const { owner, repo, branch } = repoConfig;
    const endpoint = `/repos/${owner}/${repo}/commits/${branch}`;
    return fetchGitHub(endpoint);
  },

  /**
   * Get rate limit
   */
  async getRateLimit() {
    return fetchGitHub("/rate_limit");
  },

  /**
   * GIST METHODS
   */

  async getGist(gistId) {
    return fetchGitHub(`/gists/${gistId}`);
  },

  async updateGist(gistId, files) {
    return fetchGitHub(`/gists/${gistId}`, {
      method: "PATCH",
      body: JSON.stringify({ files })
    });
  }
};
