import { test, expect } from '@playwright/test';

test.describe('Admin CMS Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.GIST_ID_MOCK = 'test-gist-id';
    });

    await page.route('https://api.github.com/user', async (route) => {
      await route.fulfill({ json: { login: 'testuser' } });
    });

    await page.route('https://api.github.com/rate_limit', async (route) => {
      await route.fulfill({
        json: {
          resources: { core: { limit: 5000, remaining: 4999, reset: Math.floor(Date.now() / 1000) + 3600 } }
        }
      });
    });

    await page.goto('http://localhost:3000/#/login');
    await page.fill('#github-token', 'ghp_fake_token_for_testing');

    await page.route('https://api.github.com/repos/**', async (route) => {
      await route.fulfill({ json: { name: 'mock-repo', size: 100, updated_at: new Date().toISOString() } });
    });

    await page.click('button[type="submit"]');
    await expect(page.locator('.modal-overlay')).toHaveCount(0, { timeout: 10000 });
    await expect(page).toHaveURL(/.*#\/dashboard/);
  });

  async function mockAcademicGist(page, initialData) {
    let capturedBody = null;

    await page.route(url => url.href.includes('/gists/test-gist-id'), async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            files: {
              'data.json': {
                content: JSON.stringify(initialData)
              }
            }
          }
        });
        return;
      }

      if (route.request().method() === 'PATCH') {
        capturedBody = JSON.parse(route.request().postData());
        await route.fulfill({ json: {} });
        return;
      }

      await route.continue();
    });

    return () => capturedBody;
  }

  test('Academic wizard creates a resource and keeps schema compatibility', async ({ page }) => {
    const getCaptured = await mockAcademicGist(page, {
      categories: [{ id: 'quimica', name: 'Quimica', description: '...', url: '/academico/quimica/' }],
      resources: []
    });

    await page.click('a[href="#/academico"]');
    await page.click('#btn-new-resource');
    await expect(page).toHaveURL(/#\/academico\/nuevo$/);

    await page.fill('#wizard-title', 'Test Resource');
    await page.selectOption('#wizard-category', 'quimica');
    await page.click('#wizard-next');

    await page.fill('#wizard-group', 'Test Group');
    await page.fill('#wizard-tags', 'tag1, tag2');
    await page.fill('#wizard-description', 'Test Description');
    await page.click('#wizard-next');

    await page.fill('#wizard-url', 'https://example.com');
    await page.click('#wizard-next');
    await page.click('#wizard-save');

    await expect(page).toHaveURL(/#\/academico$/);
    await expect.poll(() => getCaptured()).not.toBeNull();

    const decodedContent = JSON.parse(getCaptured().files['data.json'].content);
    const savedResource = decodedContent.resources[0];

    expect(savedResource).toHaveProperty('title', 'Test Resource');
    expect(savedResource).toHaveProperty('category', 'quimica');
    expect(savedResource).toHaveProperty('group', 'Test Group');
    expect(savedResource.tags).toEqual(['tag1', 'tag2']);
    expect(savedResource.category_id).toBeUndefined();
    expect(savedResource.id).toBeUndefined();
  });

  test('Academic wizard saves texto as dynamic markdown resource', async ({ page }) => {
    const getCaptured = await mockAcademicGist(page, {
      categories: [{ id: 'quimica', name: 'Quimica', description: '...', url: '/academico/quimica/' }],
      resources: []
    });

    await page.goto('http://localhost:3000/#/academico/nuevo');
    await page.selectOption('#wizard-type', 'texto');
    await page.fill('#wizard-title', 'Guia Markdown');
    await page.click('#wizard-next');

    await page.fill('#wizard-group', 'Grupo MD');
    await page.fill('#wizard-description', 'Material dinamico en markdown');
    await page.click('#wizard-next');

    await page.fill('#wizard-content', '# Titulo\n\n- Punto 1\n- Punto 2');
    await page.click('#wizard-next');
    await page.click('#wizard-save');

    await expect.poll(() => getCaptured()).not.toBeNull();

    const decodedContent = JSON.parse(getCaptured().files['data.json'].content);
    const savedResource = decodedContent.resources[0];

    expect(savedResource.type).toBe('texto');
    expect(savedResource.content_format).toBe('md');
    expect(savedResource.content_md).toContain('# Titulo');
    expect(savedResource.content_id).toBeTruthy();
    expect(savedResource.url).toBe(`/academico/recursos/?id=${savedResource.content_id}`);
  });

  test('Academic wizard allows selecting internal route for link resources', async ({ page }) => {
    const getCaptured = await mockAcademicGist(page, {
      categories: [{ id: 'quimica', name: 'Quimica', description: '...', url: '/academico/quimica/' }],
      resources: []
    });

    await page.route(url => url.href.includes('/repos/berruetaa/berrueta-site/contents'), async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const requestUrl = new URL(route.request().url());
      const marker = '/repos/berruetaa/berrueta-site/contents/';
      const markerIndex = requestUrl.pathname.indexOf(marker);
      const path = markerIndex === -1 ? '' : decodeURIComponent(requestUrl.pathname.slice(markerIndex + marker.length));

      if (!path) {
        await route.fulfill({
          json: [
            { type: 'dir', name: 'academico', path: 'academico' },
            { type: 'file', name: 'index.html', path: 'index.html' }
          ]
        });
        return;
      }

      if (path === 'academico') {
        await route.fulfill({
          json: [
            { type: 'file', name: 'index.html', path: 'academico/index.html' },
            { type: 'dir', name: 'matematica', path: 'academico/matematica' }
          ]
        });
        return;
      }

      if (path === 'academico/matematica') {
        await route.fulfill({
          json: [
            { type: 'file', name: 'index.html', path: 'academico/matematica/index.html' }
          ]
        });
        return;
      }

      await route.fulfill({ json: [] });
    });

    await page.goto('http://localhost:3000/#/academico/nuevo');
    await page.fill('#wizard-title', 'Ruta Interna');
    await page.click('#wizard-next');

    await page.fill('#wizard-group', 'Grupo Ruta');
    await page.fill('#wizard-description', 'Seleccion de ruta interna');
    await page.click('#wizard-next');

    await page.click('#wizard-load-routes');
    await expect(page.locator('#wizard-internal-route')).toBeVisible();
    await page.selectOption('#wizard-internal-route', '/academico/matematica/');
    await expect(page.locator('#wizard-url')).toHaveValue('/academico/matematica/');

    await page.click('#wizard-next');
    await page.click('#wizard-save');

    await expect.poll(() => getCaptured()).not.toBeNull();
    const decodedContent = JSON.parse(getCaptured().files['data.json'].content);
    expect(decodedContent.resources[0].url).toBe('/academico/matematica/');
  });

  test('Academic wizard restores local draft when reopening', async ({ page }) => {
    await mockAcademicGist(page, {
      categories: [{ id: 'quimica', name: 'Quimica', description: '...', url: '/academico/quimica/' }],
      resources: []
    });

    page.on('dialog', dialog => dialog.accept());

    await page.click('a[href="#/academico"]');
    await page.click('#btn-new-resource');

    await page.fill('#wizard-title', 'Draft Resource');
    await page.click('#wizard-back-list');
    await expect(page).toHaveURL(/#\/academico$/);

    await page.goto('http://localhost:3000/#/academico/nuevo');
    await expect(page.locator('.autosave-banner')).toContainText('Borrador restaurado');
    await expect(page.locator('#wizard-title')).toHaveValue('Draft Resource');
  });

  test('Academic wizard edits existing resource from route #/academico/editar/:index', async ({ page }) => {
    const getCaptured = await mockAcademicGist(page, {
      categories: [{ id: 'quimica', name: 'Quimica', description: '...', url: '/academico/quimica/' }],
      resources: [{
        title: 'Original Resource',
        category: 'quimica',
        group: 'Grupo A',
        subgroup: '',
        type: 'link',
        url: 'https://example.com/original',
        description: 'Original description',
        tags: ['base']
      }]
    });

    await page.goto('http://localhost:3000/#/academico/editar/0');
    await expect(page).toHaveURL(/#\/academico\/editar\/0$/);

    await page.fill('#wizard-title', 'Edited Resource');
    await page.click('#wizard-next');
    await page.fill('#wizard-description', 'Edited description');
    await page.click('#wizard-next');
    await page.click('#wizard-next');
    await page.click('#wizard-save');

    await expect.poll(() => getCaptured()).not.toBeNull();
    const decodedContent = JSON.parse(getCaptured().files['data.json'].content);

    expect(decodedContent.resources[0].title).toBe('Edited Resource');
    expect(decodedContent.resources[0].description).toBe('Edited description');
  });

  test('Academic wizard blocks progress on missing critical PDF/Text content', async ({ page }) => {
    await mockAcademicGist(page, {
      categories: [{ id: 'quimica', name: 'Quimica', description: '...', url: '/academico/quimica/' }],
      resources: []
    });

    page.on('dialog', dialog => dialog.accept());

    await page.goto('http://localhost:3000/#/academico/nuevo');
    await page.selectOption('#wizard-type', 'pdf');
    await page.fill('#wizard-title', 'PDF Resource');
    await page.click('#wizard-next');

    await page.fill('#wizard-group', 'Grupo PDF');
    await page.fill('#wizard-description', 'Desc PDF');
    await page.click('#wizard-next');

    await page.click('#wizard-next');
    await expect(page.locator('[data-error-for="file"]')).toContainText('Selecciona un archivo');

    await page.goto('http://localhost:3000/#/academico/nuevo');
    await page.selectOption('#wizard-type', 'texto');
    await page.fill('#wizard-title', 'Texto Resource');
    await page.click('#wizard-next');

    await page.fill('#wizard-group', 'Grupo Txt');
    await page.fill('#wizard-description', 'Desc txt');
    await page.click('#wizard-next');

    await page.click('#wizard-next');
    await expect(page.locator('[data-error-for="content"]')).toContainText('Escribe el contenido');
  });

  test('Academico nav item stays active on nested academico routes', async ({ page }) => {
    await mockAcademicGist(page, {
      categories: [{ id: 'quimica', name: 'Quimica', description: '...', url: '/academico/quimica/' }],
      resources: []
    });

    await page.goto('http://localhost:3000/#/academico/nuevo');
    await expect(page.locator('#nav-academico')).toHaveClass(/active/);
  });

  test('Blog module saves post with correct frontmatter', async ({ page }) => {
    await page.route('**/repos/berruetaa/blog-2/contents/src/data/blog*', async (route) => {
      await route.fulfill({ json: [] });
    });

    let capturedBody = null;
    await page.route('**/repos/berruetaa/blog-2/contents/src/data/blog/test-post.md', async (route) => {
      capturedBody = JSON.parse(route.request().postData());
      await route.fulfill({ json: { content: { sha: 'new-sha' } } });
    });

    await page.click('a[href="#/blog"]');
    await page.click('#btn-new-post');

    await page.fill('#slug', 'test-post');
    await page.fill('#title', 'Test Post Title');
    await page.fill('#author', 'Test Author');
    await page.fill('#description', 'Test Description');

    await page.click('#toggle-editor-btn');
    await page.fill('#editor-textarea', 'Test Content');

    await page.click('#editor-save');

    await expect.poll(() => capturedBody).not.toBeNull();

    const decodedContent = Buffer.from(capturedBody.content, 'base64').toString();

    expect(decodedContent).toContain('author: Test Author');
    expect(decodedContent).toContain('title: "Test Post Title"');
    expect(decodedContent).toContain('slug: test-post');
    expect(decodedContent).toContain('modDatetime: "');
    expect(decodedContent).toContain('pubDatetime: "');
    expect(decodedContent).toContain('description: "Test Description"');
  });
});
