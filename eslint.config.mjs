import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Flat ESLint config for a browser-targeted React component library that wraps
 * the (largely untyped) bpmn-js / dmn-js toolkits.
 *
 * Guiding principle: maximise detection of real logic defects while suppressing
 * the noise that exists *only* because the upstream bpmn-js APIs ship no types.
 * Type-aware linting is therefore enabled at the strict tier, but the handful of
 * rules that fire purely on `any`-typed interop are disabled (see below).
 *
 * React rules (including the hooks and React Compiler rules) come from
 * @eslint-react, which supports ESLint 10; accessibility from jsx-a11y; test files
 * additionally get the Vitest rules.
 *
 * Formatting is delegated entirely to Prettier — `eslint-config-prettier` is
 * loaded last so it switches off every stylistic rule the preceding presets turn
 * on, preventing ESLint and Prettier from disagreeing.
 */
export default defineConfig(
    {
        ignores: [
            "dist",
            "coverage",
            "**/*.d.ts",
            // Build/tool configs are plain ESM run by Node, not part of the typed
            // source program; linting them under projectService adds no value.
            "*.config.mjs",
            "*.config.mts",
            "scripts",
        ],
    },

    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    eslintReact.configs["strict-type-checked"],
    jsxA11y.flatConfigs.recommended,

    {
        languageOptions: {
            parserOptions: {
                // projectService is the current type-aware-linting entrypoint; it
                // resolves each file to its nearest tsconfig automatically.
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: globals.browser,
        },
        settings: {
            // react isn't a direct dependency (peer only), so version detection
            // can't resolve it. Pin the lowest supported line, which also keeps
            // rules from suggesting React 19-only APIs.
            "react-x": { version: "17.0.2" },
        },
    },

    {
        rules: {
            // --- bpmn-js / dmn-js untyped-interop relaxations -------------------
            // These libraries expose `any`-heavy module APIs. The rules below would
            // flag every interaction with them as "unsafe" even though the code is
            // correct, drowning out genuine findings. They are disabled wholesale.
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            // `any` values from bpmn-js routinely flow into log/notification strings;
            // allow primitives + any in template literals while still catching the
            // genuinely confusing cases (objects, arrays, nullish).
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                { allowAny: true, allowNumber: true, allowBoolean: true },
            ],
            // bpmn-js / dmn-js type shims are deliberately optimistic (non-null),
            // so the optional-chaining guards the code keeps are defensive against
            // values that can still be nullish at runtime. Enforcing this rule would
            // strip real runtime safety in exchange for type-theoretical tidiness.
            "@typescript-eslint/no-unnecessary-condition": "off",
            // forwardRef is still required for React 17/18 support.
            "@eslint-react/no-forward-ref": "off",
        },
    },

    {
        // Test files don't ship to consumers; allow the small ergonomic shortcuts
        // (non-null assertions) that keep tests terse.
        files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
        ...vitest.configs.recommended,
        rules: {
            ...vitest.configs.recommended.rules,
            "@typescript-eslint/no-non-null-assertion": "off",
            "vitest/consistent-test-it": ["error", { fn: "it" }],
            "vitest/no-focused-tests": "error",
            "vitest/no-disabled-tests": "error",
            "vitest/prefer-to-have-length": "error",
            // Type tests assert with expectTypeOf, checked by tsc.
            "vitest/expect-expect": [
                "error",
                { assertFunctionNames: ["expect", "expectTypeOf"] },
            ],
        },
    },

    // Must stay last: disables all formatting rules so Prettier is the sole authority.
    prettier,
);
