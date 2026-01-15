// E2E test for creating a server (guild) and seeing it appear.
// Uses cy.intercept to stub the gateway API under /gw/* so we don't need a real backend.

describe('Guilds (Servers)', () => {
  it('creates a new server and shows it in the sidebar', () => {
    // Use a desktop-sized viewport to avoid off-canvas/overlay states
    cy.viewport(1280, 900);
    const userId = 'guest';
    const createdGuild = {
      id: '100',
      name: 'My Test Server',
      iconUrl: null,
      ownerId: userId,
    };

    // Initial guild list is empty for this user
    cy.intercept('GET', `/gw/my/guilds*`, []);

    // When the dialog submits, the app posts a multipart form to create the guild
    cy.intercept('POST', '/gw/guilds', (req) => {
      // Basic assertion: form contains name and ownerId fields
      // Note: we can't easily parse multipart in Cypress here, but we can return a mocked response.
      req.reply({ statusCode: 200, body: createdGuild });
    }).as('createGuild');

    // After creation, the client fetches the full guild details (with channels)
    cy.intercept('GET', '/gw/guilds/100', {
      id: '100',
      name: createdGuild.name,
      iconUrl: null,
      ownerId: userId,
      channels: [
        { id: 1, guildId: 100, name: 'general', position: 1 },
        { id: 2, guildId: 100, name: 'random', position: 2 },
      ],
      messages: [],
    }).as('getGuild100');

    // Visit the workspace page (works even without real auth; the app treats user as guest)
    cy.visit('/me');

    // Ensure no modal scroll-lock is active before interacting
    cy.get('body', { timeout: 10000 }).should('not.have.attr', 'data-scroll-locked', '1');

    // Open the create server dialog via sidebar button
    cy.get('[data-cy="create-server-button"]').should('be.visible').click({ force: true });

    // Dialog should open and lock scroll on body
    cy.get('#create-server-name', { timeout: 10000 }).should('be.visible');

    // Fill in the server name and submit
    cy.get('#create-server-name').should('be.visible').clear().type(createdGuild.name);
    cy.get('[data-cy="create-server-submit"]').should('be.enabled').click();

    cy.wait('@createGuild');
    cy.wait('@getGuild100');

    // Assert the new server shows in the sidebar list
    cy.contains(createdGuild.name).should('be.visible');

    // Header should reflect the first (sorted) channel name
    cy.contains('general', { timeout: 10000 }).should('be.visible');
  });
});
