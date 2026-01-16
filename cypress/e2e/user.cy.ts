describe('User profile', () => {
  beforeEach(() => {
    // Keep a consistent viewport to avoid mobile/off-canvas behaviors
    cy.viewport(1280, 900);
  });

  it('opens the profile dialog and edits username client-side', () => {
    // Avoid backend dependency for guild list
    cy.intercept('GET', `/gw/my/guilds*`, []);
    // Visit workspace; app treats unauthenticated visitor as a guest user
    cy.visit('/me');

    // Open the user menu and click "View profile"
    cy.get('[data-cy="user-menu-trigger"]').should('be.visible').click();
    cy.get('[data-cy="view-profile-item"]').should('be.visible').click();

    // Begin editing username
    cy.get('[data-cy="edit-username"]').should('be.visible').click();
    cy.get('[data-cy="profile-username-input"]').should('be.enabled')
      .clear()
      .type('guest_renamed');


    // Save changes; button becomes disabled briefly and then disappears when no pending changes
    cy.get('[data-cy="profile-save-username"]').should('be.enabled').click();

    // After save, the "Save Changes" button should disappear (no pending changes)
    cy.get('[data-cy="profile-save-username"]').should('not.exist');

    // Input should be disabled again and reflect the new value
    cy.get('[data-cy="profile-username-input"]').should('have.value', 'guest_renamed').and('be.disabled');
  });

  it('shows guest user info in the sidebar when signed out', () => {
    cy.intercept('GET', `/gw/my/guilds*`, []);
    cy.visit('/me');

    // Footer shows display name derived from server-provided user (Guest)
    cy.contains('Guest').should('be.visible');

    // User menu is available
    cy.get('[data-cy="user-menu-trigger"]').should('be.visible');
  });

  it('shows Delete Account disabled when signed out', () => {
    cy.intercept('GET', `/gw/my/guilds*`, []);
    cy.visit('/me');
    cy.get('[data-cy="user-menu-trigger"]').should('be.visible').click();
    cy.get('[data-cy="view-profile-item"]').should('be.visible').click();
    cy.get('[data-cy="delete-account-button"]').should('exist').and('be.disabled');
  });
});
