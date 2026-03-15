export const Auth = {
  getToken() {
    return localStorage.getItem("adminCMS_token");
  },

  setToken(token) {
    localStorage.setItem("adminCMS_token", token);
  },

  removeToken() {
    localStorage.removeItem("adminCMS_token");
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};
