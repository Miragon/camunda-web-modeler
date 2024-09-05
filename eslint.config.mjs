import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginFlowtype from "eslint-plugin-flowtype";

import { fixupPluginRules } from "@eslint/compat";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
//
// const compat = new FlatCompat({
//     baseDirectory: __dirname,
// });

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    eslintConfigPrettier,
    {
        ignores: [
            "dist",
            "**/*.d.ts",
            "eslint.config.mjs",
            "rollup.config.mjs",
            "index.{js,ts}",
        ],
    },
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: "17.0.0",
            },
            flowtype: {
                onlyFilesWithFlowAnnotation: true,
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            import: eslintPluginImport,
            react: eslintPluginReact,
            "react-hooks": fixupPluginRules(eslintPluginReactHooks),
            "@stylistic": stylistic,
            flowtype: eslintPluginFlowtype,
        },
        rules: {
            ...eslintPluginReactHooks.configs.recommended.rules,
            "@typescript-eslint/comma-dangle": "off",
            "@typescript-eslint/no-unused-expressions": [
                "error",
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],
            "@typescript-eslint/no-shadow": [
                "error",
                {
                    ignoreFunctionTypeParameterNameValueShadow: true,
                },
            ],
            "@typescript-eslint/object-curly-spacing": "off",
            // We need to use any for interfaces towards bpmn-js way too often for this rule to be effective
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@stylistic/lines-between-class-members": [
                "error",
                "always",
                {
                    exceptAfterSingleLine: true,
                },
            ],
            "@stylistic/arrow-parens": ["error", "as-needed"],
            "react/jsx-indent": [
                "error",
                4,
                {
                    indentLogicalExpressions: true,
                    checkAttributes: true,
                },
            ],
            "react/jsx-indent-props": ["error", 4],
            "react/jsx-closing-bracket-location": [
                "error",
                {
                    nonEmpty: "tag-aligned",
                    selfClosing: "tag-aligned",
                },
            ],
            // Does not work with TS and arrow functions
            // https://github.com/yannickcr/eslint-plugin-react/issues/2353
            "react/prop-types": "off",
            // Is this the way to go? I think both ways are acceptable, but should not be enforced...
            "react/destructuring-assignment": "off",
            // We don't use default props
            "react/require-default-props": "off",
            "react/jsx-props-no-spreading": "off",
            "flowtype/define-flow-type": "off",
            "flowtype/use-flow-type": "off",
            // Deprecated rule
            "object-shorthand": ["error", "consistent-as-needed"],
            "no-param-reassign": [
                "error",
                {
                    props: false,
                },
            ],
            radix: ["error", "as-needed"],
            "object-curly-newline": [
                "error",
                {
                    ImportDeclaration: {
                        multiline: true,
                    },
                },
            ],
            "no-restricted-syntax": [
                "error",
                "ForInStatement",
                "LabeledStatement",
                "WithStatement",
            ],
            "no-spaced-func": "off",
            "import/extensions": [
                "error",
                "ignorePackages",
                {
                    "": "never",
                    js: "never",
                    jsx: "never",
                    ts: "never",
                    tsx: "never",
                },
            ],
            "import/no-amd": "off",
        },
    },
);
