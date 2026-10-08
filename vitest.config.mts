import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for unit and component tests (jsdom + Testing Library).
 *
 * bpmn-js, dmn-js and Monaco need a real browser; component tests replace them with
 * fakes, and the playground covers the real thing.
 */
export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        setupFiles: ["src/test/setup.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            // The bpmn.io wrappers need a real browser (the playground covers them);
            // jsdom coverage of them would be misleading.
            exclude: [
                "src/bpmnio/bpmn/**",
                "src/bpmnio/dmn/**",
                "src/bpmnio/index.ts",
                "src/types/**",
                "src/test/**",
                "src/**/*.test.{ts,tsx}",
            ],
            reporter: ["text-summary", "html"],
            // A floor against regressions, set below the current level on purpose:
            // no incentive for brittle tests of the bpmn.io fakes.
            thresholds: { statements: 75, branches: 65, functions: 75, lines: 75 },
        },
    },
});
