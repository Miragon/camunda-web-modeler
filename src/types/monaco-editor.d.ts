// Only way to keep using existing type definitions in this module
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as editor from "src/types/monaco-editor";

declare module "src/types/monaco-editor" {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    namespace editor {
        interface ITextModel {
            _commandManager: any;
        }
    }
}

declare module 'monaco-editor/esm/vs/editor/editor.worker';
declare module "monaco-editor/esm/vs/language/json/json.worker";
declare module "monaco-editor/esm/vs/language/css/css.worker";
declare module "monaco-editor/esm/vs/language/html/html.worker";
declare module "monaco-editor/esm/vs/language/typescript/ts.worker";

