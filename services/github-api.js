export class GitHubAPI {
    constructor() {
        this.token = localStorage.getItem('github_pat') || null;
        this.baseUrl = 'https://api.github.com';
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('github_pat', token);
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('github_pat');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getHeaders() {
        if (!this.token) {
            throw new Error('Not authenticated: No GitHub PAT found.');
        }
        return {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/user`, {
                headers: this.getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                return { success: true, user: data };
            }
            return { success: false, error: `HTTP ${response.status}` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Reads a file from a specified repository.
     * @param {Object} repoConfig {owner, repo, branch}
     * @param {string} path
     * @returns {Object} { content (decoded text), sha } or null if not found
     */
    async getFile(repoConfig, path) {
        const { owner, repo, branch } = repoConfig;
        const refParam = branch ? `?ref=${branch}` : '';
        const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}${refParam}`;

        try {
            const response = await fetch(url, { headers: this.getHeaders() });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.type !== 'file') {
                throw new Error('Path does not point to a file');
            }

            // Decode base64 content
            // Need to handle UTF-8 properly: atob() is not enough for non-ASCII
            const decodedContent = this.decodeBase64(data.content);

            return {
                content: decodedContent,
                sha: data.sha,
                size: data.size,
                path: data.path
            };
        } catch (error) {
            console.error('Error fetching file:', error);
            throw error;
        }
    }

    /**
     * Creates or updates a file in a specified repository.
     * @param {Object} repoConfig {owner, repo, branch}
     * @param {string} path
     * @param {string} content The plain text content to write
     * @param {string} message Commit message
     * @param {string} [sha] The SHA of the file being replaced (required for updates)
     */
    async commitFile(repoConfig, path, content, message, sha = null) {
        const { owner, repo, branch } = repoConfig;
        const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;

        // Encode to base64 with UTF-8 support
        const base64Content = this.encodeBase64(content);

        const body = {
            message: message,
            content: base64Content,
            branch: branch
        };

        if (sha) {
            body.sha = sha;
        }

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API Error: ${response.statusText} - ${errorData.message}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error committing file:', error);
            throw error;
        }
    }

    /**
     * Gets the latest commit for a specific repository.
     */
    async getLatestCommit(repoConfig) {
        const { owner, repo, branch } = repoConfig;
        const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${branch}`;

        try {
            const response = await fetch(url, { headers: this.getHeaders() });
            if (!response.ok) {
                throw new Error(`Failed to fetch commit: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching latest commit:', error);
            return null;
        }
    }

    // Helpers for Base64 + UTF-8 support (Standard atob/btoa break on non-ascii)
    decodeBase64(str) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    encodeBase64(str) {
        // first we use encodeURIComponent to get percent-encoded UTF-8,
        // then we convert the percent encodings into raw bytes which
        // can be fed into btoa.
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
            }));
    }
}

export const githubApi = new GitHubAPI();
