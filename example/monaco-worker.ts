import type * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

declare global {
    interface Window {
        MonacoEnvironment?: monaco.Environment;
    }
}

/**
 * Registers monaco's base editor worker for the Vite playground.
 *
 * `XmlEditor` pins monaco locally via `loader.config({ monaco })`, so there is no
 * CDN fallback to load workers from — without a `MonacoEnvironment.getWorker` the
 * editor logs a runtime error and runs degraded on the main thread. The XML editor
 * needs only the base `editor.worker` (XML has no dedicated language worker).
 *
 * This MUST live in its own module imported first in `main.tsx`: ESM hoists all
 * `import` statements above plain assignments, so an inline `self.MonacoEnvironment`
 * in `main.tsx` would run *after* `../src` (and thus monaco) is already evaluated.
 */
self.MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
};
