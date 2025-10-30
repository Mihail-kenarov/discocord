describe('Auth pages', () => {
  it('has a Start Chatting link pointing to /sign-in and loads it', () => {
    cy.visit('/');

    // Assert the CTA is present and has the correct href
    cy.contains('a', 'Start Chatting', { matchCase: false })
      .should('be.visible')
      .should('have.attr', 'href', '/sign-in');

    // Navigate directly to avoid SPA soft-nav timing differences
    cy.visit('/sign-in');

    // Clerk script should be present on sign-in page
    cy.window().its('Clerk').should('exist');
  });

  it('loads the sign-up page with Clerk', () => {
    cy.visit('/sign-up');

    cy.location('pathname').should('include', '/sign-up');

    // Verify Clerk is loaded (indicates <SignUp /> widget booted)
    cy.window().its('Clerk').should('exist');
  });
});
