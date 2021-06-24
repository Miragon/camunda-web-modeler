import typescript from "@rollup/plugin-typescript";
import {terser} from "rollup-plugin-terser";
import json from "rollup-plugin-json";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import css from "rollup-plugin-css-only";
import commonjs from "@rollup/plugin-commonjs";
import replace from '@rollup/plugin-replace';
import deepmerge from "deepmerge";
import fs from "fs";
import path from "path";

const defaultConfig = {
    input: "src/index.ts",
    output: {
        format: "iife",
        name: "MiragonModeler",
        globals: {
            react: "React",
            "monaco-editor": "monaco",
            "bpmn-js/lib/Modeler": "BpmnJS",
            "dmn-js/lib/Modeler": "DmnJS"
        }
    },
    external: [
        "monaco-editor",
        "react",
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
        typescript(),
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
            // terser(),
            {
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
            }
        ]
    })
];
