/**
 * E2E Tests for Survey Flows
 * Sprint 19: Testing & QA
 */

const { test, expect } = require('@playwright/test');

test.describe('Survey Creation Flow', () => {
  test('should create a new survey end-to-end', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Click create survey button
    await page.click('text=Create Survey');

    // Fill survey details
    await page.fill('[name="title"]', 'Customer Satisfaction Survey');
    await page.fill('[name="description"]', 'Help us improve our services');

    // Add a question
    await page.click('text=Add Question');
    await page.selectOption('[name="questionType"]', 'scale');
    await page.fill('[name="questionText"]', 'How satisfied are you?');
    await page.check('[name="required"]');

    // Add another question
    await page.click('text=Add Question');
    await page.selectOption('[name="questionType"]', 'paragraph');
    await page.fill('[name="questionText"]', 'Any additional comments?');

    // Save survey
    await page.click('button:has-text("Save Survey")');

    // Verify success message
    await expect(page.locator('text=Survey created successfully')).toBeVisible();

    // Verify redirect to survey page
    await expect(page).toHaveURL(/\/surveys\/[a-f0-9]+/);
  });
});

test.describe('Survey Response Flow', () => {
  test('should submit a survey response', async ({ page }) => {
    // Navigate to public survey (assuming survey already exists)
    await page.goto('/survey/test-survey-id');

    // Verify survey loads
    await expect(page.locator('h1')).toContainText('Customer Satisfaction Survey');

    // Fill out survey
    await page.fill('input[name="q1-name"]', 'John Doe');
    await page.click('input[name="q2-rating"][value="5"]');
    await page.fill('textarea[name="q3-comments"]', 'Great service!');

    // Submit survey
    await page.click('button:has-text("Submit")');

    // Verify thank you page
    await expect(page.locator('text=Thank you')).toBeVisible();
    await expect(page.locator('text=Your response has been recorded')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/survey/test-survey-id');

    // Try to submit without filling required fields
    await page.click('button:has-text("Submit")');

    // Verify validation errors
    await expect(page.locator('text=This field is required')).toBeVisible();
  });

  test('should save and resume survey', async ({ page }) => {
    await page.goto('/survey/test-survey-id');

    // Fill partial survey
    await page.fill('input[name="q1-name"]', 'John Doe');

    // Save progress
    await page.click('button:has-text("Save & Continue Later")');

    // Get save code
    const saveCode = await page.locator('[data-testid="save-code"]').textContent();

    // Navigate away
    await page.goto('/');

    // Resume survey
    await page.goto('/survey/test-survey-id');
    await page.click('text=Resume Survey');
    await page.fill('[name="saveCode"]', saveCode);
    await page.click('button:has-text("Resume")');

    // Verify previous answer is there
    await expect(page.locator('input[name="q1-name"]')).toHaveValue('John Doe');
  });
});

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should view survey analytics', async ({ page }) => {
    // Click on a survey
    await page.click('[data-testid="survey-item"]').first();

    // Navigate to analytics tab
    await page.click('text=Analytics');

    // Verify analytics are displayed
    await expect(page.locator('[data-testid="total-responses"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-completion-time"]')).toBeVisible();
  });

  test('should export survey responses', async ({ page }) => {
    await page.click('[data-testid="survey-item"]').first();
    await page.click('text=Responses');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export CSV")');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
  });
});

test.describe('Surveyor Flow', () => {
  test('should assign survey to surveyor', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Navigate to surveyors
    await page.goto('/surveyors');

    // Create surveyor
    await page.click('text=Add Surveyor');
    await page.fill('[name="name"]', 'Jane Surveyor');
    await page.fill('[name="email"]', 'jane@example.com');
    await page.click('button:has-text("Create")');

    // Assign survey
    await page.click('[data-testid="surveyor-item"]:has-text("Jane")');
    await page.click('text=Assign Survey');
    await page.selectOption('[name="survey"]', { label: 'Customer Satisfaction Survey' });
    await page.fill('[name="quota"]', '50');
    await page.click('button:has-text("Assign")');

    // Verify assignment
    await expect(page.locator('text=Survey assigned successfully')).toBeVisible();
  });
});

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
  });

  test('should view system health', async ({ page }) => {
    await page.goto('/admin/health');

    // Verify health metrics
    await expect(page.locator('[data-testid="mongodb-status"]')).toContainText('Connected');
    await expect(page.locator('[data-testid="redis-status"]')).toContainText('Connected');
    await expect(page.locator('[data-testid="kafka-status"]')).toContainText('Connected');
  });

  test('should view audit logs', async ({ page }) => {
    await page.goto('/admin/audit');

    // Verify audit log table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Event")')).toBeVisible();
    await expect(page.locator('th:has-text("User")')).toBeVisible();
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await page.goto('/survey/test-survey-id');

    // Verify mobile-friendly layout
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.mobile-menu')).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

    await page.goto('/dashboard');
    await expect(page.locator('.survey-grid')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/survey/test-survey-id');

    // Check for ARIA labels
    const form = page.locator('form[role="form"]');
    await expect(form).toBeVisible();

    const requiredFields = page.locator('[aria-required="true"]');
    expect(await requiredFields.count()).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/survey/test-survey-id');

    // Tab through form
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focused element
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'TEXTAREA', 'BUTTON']).toContain(focusedElement);
  });
});

test.describe('Multi-language Support', () => {
  test('should switch between languages', async ({ page }) => {
    await page.goto('/survey/test-survey-id');

    // Switch to Arabic
    await page.selectOption('[name="language"]', 'ar');

    // Verify RTL direction
    const direction = await page.locator('html').getAttribute('dir');
    expect(direction).toBe('rtl');

    // Verify Arabic text
    await expect(page.locator('body')).toContainText(/[\u0600-\u06FF]/); // Arabic Unicode range
  });
});

test.describe('Performance', () => {
  test('should load survey quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/survey/test-survey-id');
    const loadTime = Date.now() - startTime;

    // Verify page loads in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large surveys', async ({ page }) => {
    await page.goto('/survey/large-survey-id'); // Survey with 50+ questions

    // Verify progressive loading
    await expect(page.locator('.question-section').first()).toBeVisible();

    // Scroll to load more
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify more questions loaded
    expect(await page.locator('.question').count()).toBeGreaterThan(10);
  });
});
