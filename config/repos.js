export const REPOS = {
  blog: {
    owner: "berruetaa",
    repo: "blog-2",
    branch: "master"
  },
  site: {
    owner: "berruetaa",
    repo: "berrueta-site",
    branch: "main"
  },
  gists: {
    get academico() { return window.GIST_ID_MOCK || "2d9ae5eaedff0bef55ffdb3e82374edd"; }
  }
};
