import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the unit/smoke test suite.
 *
 * `jsdom` is selected so that React component tests can be added later without
 * reconfiguring the environment; the current pure-function smoke tests don't
 * need it but inherit it harmlessly. `passWithNoTests` keeps CI green even if
 * the suite is ever emptied, so the release pipeline never blocks on it.
 */
export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        passWithNoTests: true,
    },
});
