import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
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
 * Formatting is delegated entirely to Prettier — `eslint-config-prettier` is
 * loaded last so it switches off every stylistic rule the preceding presets turn
 * on, preventing ESLint and Prettier from disagreeing.
 */
export default tseslint.config(
    {
        ignores: [
            "dist",
            "**/*.d.ts",
            // Build/tool configs are plain ESM run by Node, not part of the typed
            // source program; linting them under projectService adds no value.
            "*.config.mjs",
            "*.config.mts",
            "index.js",
            "index.ts",
        ],
    },

    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    react.configs.flat.recommended,
    reactHooks.configs.flat.recommended,

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
            // can't resolve it — pin the lowest officially supported major line.
            react: { version: "18.3" },
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
            // Bridging the imperative bpmn-js canvas into React legitimately syncs
            // instance state from inside effects. Keep this React-Compiler readiness
            // rule as a signal (warning) rather than a hard error.
            "react-hooks/set-state-in-effect": "warn",
        },
    },

    {
        // Test files don't ship to consumers; allow the small ergonomic shortcuts
        // (non-null assertions) that keep tests terse.
        files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-non-null-assertion": "off",
        },
    },

    // Must stay last: disables all formatting rules so Prettier is the sole authority.
    prettier,
);
