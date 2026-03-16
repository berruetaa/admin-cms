import { test, expect } from '@playwright/test';

test.describe('Admin CMS Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GitHub API for authentication and initial data
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

    // Mock the repo info calls that happen immediately after login/redirect to dashboard
    await page.route('https://api.github.com/repos/**', async (route) => {
      await route.fulfill({ json: { name: 'mock-repo', size: 100, updated_at: new Date().toISOString() } });
    });

    await page.click('button[type="submit"]');

    // Wait for the modal to disappear
    await expect(page.locator('.modal-overlay')).toHaveCount(0, { timeout: 10000 });
    await expect(page).toHaveURL(/.*#\/dashboard/);
  });

  test('Academic module saves resources with correct schema', async ({ page }) => {
    const mockData = {
      categories: [{ id: 'quimica', name: 'Química', description: '...', url: '/academico/quimica/' }],
      resources: []
    };

    // Mock getting the file
    await page.route('**/repos/berruetaa/berrueta-site/contents/academico/data.json*', async (route) => {
        await route.fulfill({
          json: {
            sha: 'old-sha',
            content: Buffer.from(JSON.stringify(mockData)).toString('base64'),
            encoding: 'base64'
          }
        });
    });

    // Mock updating the file
    let capturedBody = null;
    await page.route('**/repos/berruetaa/berrueta-site/contents/academico/data.json', async (route) => {
      if (route.request().method() === 'PUT') {
        capturedBody = JSON.parse(route.request().postData());
        await route.fulfill({ json: { content: { sha: 'new-sha' } } });
      } else {
        await route.continue();
      }
    });

    await page.click('a[href="#/academico"]');
    await page.click('#btn-new-resource');

    await page.fill('#title', 'Test Resource');
    await page.selectOption('#category', 'quimica');
    await page.fill('#group', 'Test Group');
    await page.fill('#tags', 'tag1, tag2');
    await page.selectOption('#type', 'link');
    await page.fill('#url', 'https://example.com');
    await page.fill('#description', 'Test Description');

    await page.click('#res-save');

    // Wait for the PUT request to be captured
    await expect.poll(() => capturedBody).not.toBeNull();

    const decodedContent = JSON.parse(Buffer.from(capturedBody.content, 'base64').toString());
    const savedResource = decodedContent.resources[0];

    // Verify schema
    expect(savedResource).toHaveProperty('title', 'Test Resource');
    expect(savedResource).toHaveProperty('category', 'quimica');
    expect(savedResource).toHaveProperty('group', 'Test Group');
    expect(savedResource.tags).toEqual(['tag1', 'tag2']);
    expect(savedResource.category_id).toBeUndefined();
    expect(savedResource.id).toBeUndefined();
  });

  test('Blog module saves post with correct frontmatter', async ({ page }) => {
    // Mock blog directory
    await page.route('**/repos/berruetaa/blog-2/contents/src/data/blog*', async (route) => {
      await route.fulfill({ json: [] });
    });

    // Mock creating a file
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

    // Toggle to textarea for easier input
    await page.click('#toggle-editor-btn');
    await page.fill('#editor-textarea', 'Test Content');

    await page.click('#editor-save');

    await expect.poll(() => capturedBody).not.toBeNull();

    const decodedContent = Buffer.from(capturedBody.content, 'base64').toString();

    // Verify frontmatter format
    expect(decodedContent).toContain('author: Test Author');
    expect(decodedContent).toContain('title: "Test Post Title"');
    expect(decodedContent).toContain('slug: test-post');
    expect(decodedContent).toContain('modDatetime: "');
    expect(decodedContent).toContain('pubDatetime: "');
    expect(decodedContent).toContain('description: "Test Description"');
  });
});
