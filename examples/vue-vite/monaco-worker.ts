import type * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

declare global {
    interface Window {
        MonacoEnvironment?: monaco.Environment;
    }
}

self.MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
};
