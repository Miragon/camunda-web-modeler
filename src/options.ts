import type { EditorProps } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";

import type { ModelerEvent } from "./events";

/**
 * Size constraints of a panel, in percent of the editor width.
 */
export interface PanelSize {
    initial?: number;
    min?: number;
    max?: number;
}

export interface DiagramOptions {
    /**
     * Hides the diagram view, so only the XML editor is shown.
     */
    disabled?: boolean;

    /**
     * Size of the canvas next to the properties panel. Defaults: initial 75, min 5, max 95.
     */
    size?: PanelSize;
}

export interface PropertiesPanelOptions {
    /**
     * Hides the properties panel. Element templates are not available then either.
     */
    hidden?: boolean;

    /**
     * Size of the properties panel. Defaults: initial 25, min 5, max 95.
     */
    size?: PanelSize;

    /**
     * Renders the properties panel into this element (or the element matching this CSS
     * selector) instead of next to the canvas. It must exist when the modeler is created.
     * The modeler does not hide it while the XML editor is shown.
     *
     * CAUTION: Changing it creates a new modeler instance.
     */
    container?: HTMLElement | string;
}

/**
 * The monaco-editor module, as returned by `import("monaco-editor")`.
 */
export type MonacoModule = typeof monaco;

export interface XmlEditorOptions {
    /**
     * Hides the XML editor, so only the diagram is shown.
     */
    disabled?: boolean;

    /**
     * The Monaco instance to use, or a function loading it, e.g. a build with only the
     * editor core and the XML language. By default the installed monaco-editor is loaded
     * when the XML editor is shown for the first time.
     *
     * Monaco is configured globally, so all modelers on a page should use the same one.
     */
    monaco?: MonacoModule | (() => Promise<MonacoModule>);

    /**
     * Options for the Monaco editor, merged with the defaults of this library.
     */
    options?: Partial<monaco.editor.IStandaloneEditorConstructionOptions>;

    /**
     * Additional props for the `@monaco-editor/react` editor. They override the defaults of
     * this library; `onMount` and `onChange` are called in addition to the internal
     * handlers, and `value` is always the document XML.
     */
    props?: Partial<EditorProps>;
}

/**
 * Class names for the parts of the modeler.
 */
export interface ModelerClasses {
    /** The root element. */
    root?: string;
    /** The diagram view, i.e. canvas and properties panel. */
    diagram?: string;
    /** The element hosting the canvas. */
    canvas?: string;
    /** The element hosting the properties panel (unless rendered into a `container`). */
    propertiesPanel?: string;
    /** The XML editor. */
    xmlEditor?: string;
    /** The switch between the views. */
    viewToggle?: string;
}

/**
 * The props both modelers share.
 */
export interface ModelerProps {
    /**
     * The document, controlled: update it from `content.saved` events, as the editors
     * show what you pass here. Until it is non-empty for the first time, nothing is
     * rendered, which lets you load the document asynchronously.
     */
    xml?: string;

    /**
     * The document, uncontrolled: only used initially, the modeler keeps track of the
     * changes itself. Without `xml` and `defaultXml`, an empty diagram is shown.
     */
    defaultXml?: string;

    /**
     * Called for every event of the modeler and of bpmn-js / dmn-js.
     */
    onEvent?: (event: ModelerEvent) => void;

    diagram?: DiagramOptions;

    propertiesPanel?: PropertiesPanelOptions;

    xmlEditor?: XmlEditorOptions;

    classes?: ModelerClasses;
}
