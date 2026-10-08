import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev-only Vite config for the manual UI/UX playground (issue #190).
 *
 * The app lives in `example/` (this dir is the Vite root via `vite example`) but
 * imports the library straight from `../src`, which is *outside* the root. Vite
 * serves such files through `/@fs/` and gates them behind `server.fs.allow`, so
 * we allow the repo root (`..`, resolved relative to this root) — otherwise the
 * `../src` imports are rejected.
 *
 * `optimizeDeps.include` pre-bundles monaco up front so the first page load does
 * not flash a dependency-discovery reload. bpmn-js/dmn-js are intentionally left
 * to Vite's default pre-bundling (excluding them breaks their CJS interop).
 */
export default defineConfig({
    plugins: [react()],
    server: {
        fs: {
            allow: [".."],
        },
    },
    optimizeDeps: {
        include: ["monaco-editor", "@monaco-editor/react"],
    },
});
