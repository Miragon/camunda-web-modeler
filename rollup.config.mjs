import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import replace from '@rollup/plugin-replace';
import {nodeResolve} from "@rollup/plugin-node-resolve";
import typescript from 'rollup-plugin-typescript2';
import css from "rollup-plugin-css-only";
import deepmerge from "deepmerge";
/* import fs from "fs";
import path from "path"; */

import pkg from "./package.json" with { type: "json" };

const defaultConfig = {
    input: "src/index.ts",
    output: {
        format: "umd",
        name: "MiragonModeler",
        globals: {
            react: "React",
            "monaco-editor": "monaco",
            "bpmn-js/lib/Modeler": "BpmnJS",
            "dmn-js/lib/Modeler": "DmnJS"
        }
    },
    external: [
        ...Object.keys(pkg.peerDependencies || {}),
        "monaco-editor",
        // "react",
        "bpmn-js/lib/Modeler",
        "dmn-js/lib/Modeler"
    ],
    plugins: [
        replace({
            values: {
                'process.env.NODE_ENV': JSON.stringify('production')
            },
            preventAssignment: true
        }),
        nodeResolve({
            mainFields: [
                'browser',
                'module',
                'main'
            ]
        }),
        commonjs({
            exclude: ["src/**"],
            include: ["node_modules/**"]
        }),
        json(),
        // Use the build tsconfig so test files (kept in tsconfig.json for ESLint) are
        // not emitted as declarations into dist.
        typescript({ tsconfig: "tsconfig.build.json" }),
        css({output: "bundle.css"})
    ]
};

export default [
    /* deepmerge(defaultConfig, {
        output: {
            file: "dist/bundle.js"
        }
    }), */
    deepmerge(defaultConfig, {
        output: {
            file: "dist/bundle.min.js",
            sourcemap: true
        },
        plugins: [
            terser(),
            /* { // Use this to write a graph.json to analyze the bundle
                // Remember to uncomment the imports, too
                buildEnd() {
                    const deps = [];
                    for (const id of this.getModuleIds()) {
                        const m = this.getModuleInfo(id);
                        if (m != null && !m.isExternal) {
                            for (const target of m.importedIds) {
                                deps.push({source: m.id, target})
                            }
                        }
                    }

                    fs.writeFileSync(
                        path.join(__dirname, 'graph.json'),
                        JSON.stringify(deps, null, 2));
                },
            } */
        ]
    })
];
