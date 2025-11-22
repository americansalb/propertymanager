/**
 * E2E test: Property Edit Modal
 * Tests complete user flow for editing a property
 */

import { test, expect } from '@playwright/test';

test.describe('Property Edit Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Login (adjust based on your auth setup)
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard/properties
    await page.waitForURL('**/properties');
  });

  test('should update property successfully', async ({ page }) => {
    // Navigate to properties list
    await page.goto('/properties');

    // Wait for properties to load
    await expect(page.getByRole('table')).toBeVisible();

    // Find first property and click Edit
    const firstEditButton = page.getByRole('button', { name: 'Edit' }).first();
    await firstEditButton.click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Edit Property' })).toBeVisible();

    // Get current property name for verification
    const nameInput = page.locator('[name="name"]');
    const originalName = await nameInput.inputValue();

    // Update property details
    const timestamp = Date.now();
    const updatedName = `Updated Property ${timestamp}`;

    await nameInput.fill(updatedName);
    await page.locator('[name="addressLine1"]').fill('456 Updated Ave');
    await page.locator('[name="city"]').fill('Austin');
    await page.locator('[name="state"]').fill('TX');
    await page.locator('[name="postalCode"]').fill('78702');

    // Change property type
    await page.locator('[id="propertyType"]').click();
    await page.getByRole('option', { name: 'Multifamily' }).click();

    // Save button should be enabled (form is dirty)
    const saveButton = page.getByRole('button', { name: /save changes/i });
    await expect(saveButton).toBeEnabled();

    // Click save
    await saveButton.click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Toast notification should appear
    await expect(page.getByText(/property updated/i)).toBeVisible();

    // Property should be updated in the list
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText('456 Updated Ave')).toBeVisible();

    // Reload page to verify persistence
    await page.reload();
    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test('should show validation errors for invalid data', async ({ page }) => {
    await page.goto('/properties');

    // Open edit modal
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Clear required field
    await page.locator('[name="name"]').clear();

    // Try to save
    const saveButton = page.getByRole('button', { name: /save changes/i });
    await saveButton.click();

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible();

    // Modal should still be open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should validate postal code format', async ({ page }) => {
    await page.goto('/properties');

    // Open edit modal
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Enter invalid postal code
    const postalCodeInput = page.locator('[name="postalCode"]');
    await postalCodeInput.fill('INVALID!@#$');

    // Blur to trigger validation
    await postalCodeInput.blur();

    // Should show validation error
    await expect(
      page.getByText(/postal code must be 3-16 chars, letters\/numbers\/hyphen\/space only/i),
    ).toBeVisible();

    // Save should be disabled or show error on click
    const saveButton = page.getByRole('button', { name: /save changes/i });
    await saveButton.click();

    // Error should persist
    await expect(
      page.getByText(/postal code must be 3-16 chars/i),
    ).toBeVisible();
  });

  test('should cancel editing without saving', async ({ page }) => {
    await page.goto('/properties');

    // Get original property name
    const firstPropertyRow = page.locator('tbody tr').first();
    const originalName = await firstPropertyRow.locator('td').first().textContent();

    // Open edit modal
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Make changes
    await page.locator('[name="name"]').fill('Should Not Be Saved');
    await page.locator('[name="city"]').fill('Changed City');

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Original name should still be displayed
    await expect(page.getByText(originalName!)).toBeVisible();
    await expect(page.getByText('Should Not Be Saved')).not.toBeVisible();
  });

  test('should toggle active status', async ({ page }) => {
    await page.goto('/properties');

    // Open edit modal
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Find active toggle
    const activeToggle = page.locator('[id="active"]');
    const initialState = await activeToggle.isChecked();

    // Toggle it
    await activeToggle.click();

    // Save
    await page.getByRole('button', { name: /save changes/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Status badge should change
    if (initialState) {
      // Was active, now inactive
      await expect(page.getByText('INACTIVE').first()).toBeVisible();
    } else {
      // Was inactive, now active
      await expect(page.getByText('ACTIVE').first()).toBeVisible();
    }
  });

  test('should handle server errors gracefully', async ({ page }) => {
    // Mock a 500 error from the API
    await page.route('**/api/properties/*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Internal server error',
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            correlationId: 'test-correlation-id',
          },
        }),
      });
    });

    await page.goto('/properties');

    // Open edit modal
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Make a change
    await page.locator('[name="name"]').fill('Updated Name');

    // Try to save
    await page.getByRole('button', { name: /save changes/i }).click();

    // Should show error message
    await expect(page.getByText(/internal server error/i)).toBeVisible();

    // Modal should still be open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Toast error should appear
    await expect(page.getByText(/failed to update property/i)).toBeVisible();
  });

  test('should track analytics events', async ({ page }) => {
    let eventsCaptured: string[] = [];

    // Intercept analytics calls
    await page.route('**/api/events', (route) => {
      const postData = route.request().postDataJSON();
      eventsCaptured.push(postData.name);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'event-123' } }),
      });
    });

    await page.goto('/properties');

    // Open modal
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Should track PROPERTY_EDIT_OPENED
    await page.waitForTimeout(500); // Wait for async tracking
    expect(eventsCaptured).toContain('PROPERTY_EDIT_OPENED');

    // Make change and save
    await page.locator('[name="name"]').fill('Updated');
    await page.getByRole('button', { name: /save changes/i }).click();

    // Should track PROPERTY_EDIT_SAVED
    await page.waitForTimeout(500);
    expect(eventsCaptured).toContain('PROPERTY_EDIT_SAVED');
  });
});
