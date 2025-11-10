import { defineConfig } from "cypress";

export default defineConfig({
  video: true,
  videosFolder: "cypress/videos",
  screenshotsFolder: "cypress/screenshots",
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // your node event listeners
    },
  },
});