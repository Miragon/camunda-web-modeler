import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "dmn-js/dist/assets/diagram-js.css";
import "dmn-js/dist/assets/dmn-font/css/dmn-embedded.css";
import "dmn-js/dist/assets/dmn-js-decision-table-controls.css";
import "dmn-js/dist/assets/dmn-js-decision-table.css";
import "dmn-js/dist/assets/dmn-js-drd.css";
import "dmn-js/dist/assets/dmn-js-literal-expression.css";
import "dmn-js/dist/assets/dmn-js-shared.css";
import camundaModdleDescriptor from "camunda-dmn-moddle/resources/camunda.json";

import {
    DmnPropertiesPanelModule,
    DmnPropertiesProviderModule,
} from "dmn-js-properties-panel";
import deepmerge from "deepmerge";
import diagramOriginModule from "diagram-js-origin";
import Modeler, {
    ImportXMLResult,
    OpenError,
    OpenResult,
    SaveXMLResult,
} from "dmn-js/lib/Modeler";
import GlobalEventListenerUtil, { EventCallback } from "../GlobalEventListenerUtil";

export interface ViewsChangedEvent {
    activeView: DmnView | undefined;
    views: DmnView[];
}

export interface DmnView {
    element: any;
    id: string;
    name: string;
    type: "drd" | "decisionTable" | "literalExpression";
}

export interface DmnViewer {
    /**
     * Returns a named component.
     *
     * @param name The name
     * @param strict If an error should be thrown if the component does not exist. If false, null
     *     will be returned.
     */
    get: (name: string, strict?: boolean) => any;

    /**
     * Registers a new event handler.
     *
     * @param event The event name
     * @param handler The handler
     */
    on: (event: string, handler: (event: any) => void) => void;

    /**
     * Unregisters a previously registered event handler.
     *
     * @param event The event name
     * @param handler The handler
     */
    off: (event: string, handler: (event: any) => void) => void;
}

export interface CustomDmnJsModelerOptions {
    /**
     * The ID of the div to use as host for the properties panel. The div must be present inside
     * the page HTML. If missing or undefined is passed, no properties panel will be initialized.
     */
    propertiesPanel?: string;

    /**
     * The ID of the div to use as host for the editor itself. The div must be present inside the
     * page HTML.
     */
    container: string;

    /**
     * The options passed to dmn-js. Will be merged with the options defined by this library,
     * with the latter taking precedence in case of conflict.
     * CAUTION: If you pass invalid properties, the modeler can break!
     */
    dmnJsOptions?: any;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Injector {
    /**
     * Returns a named component.
     *
     * @param name The name
     * @param strict If an error should be thrown if the component does not exist. If false, null
     *     will be returned.
     */
    get: (name: string, strict?: boolean) => any;
}

class CustomDmnJsModeler {
    private modeler: Modeler;

    /**
     * Creates a new instance of the bpmn-js modeler.
     *
     * @param options The options to include
     */
    constructor(options: CustomDmnJsModelerOptions) {
        const mergedOptions = deepmerge.all([
            // The options passed by the user
            options.dmnJsOptions ?? {},

            // The library's default options
            {
                container: options.container,
                drd: {
                    additionalModules: [
                        diagramOriginModule,
                        {
                            __init__: ["globalEventListenerUtil"],
                            globalEventListenerUtil: ["type", GlobalEventListenerUtil],
                        },
                    ],
                },
                decisionTable: {
                    additionalModules: [
                        {
                            __init__: ["globalEventListenerUtil"],
                            globalEventListenerUtil: ["type", GlobalEventListenerUtil],
                        },
                    ],
                },
                literalExpression: {
                    additionalModules: [
                        {
                            __init__: ["globalEventListenerUtil"],
                            globalEventListenerUtil: ["type", GlobalEventListenerUtil],
                        },
                    ],
                },
                moddleExtensions: {
                    camunda: camundaModdleDescriptor,
                },
            },

            // The options required to display the properties panel (if desired)
            // prettier-ignore
            options.propertiesPanel
                ? {
                    drd: {
                        propertiesPanel: {
                            parent: options.propertiesPanel,
                        },
                        additionalModules: [
                            DmnPropertiesPanelModule,
                            DmnPropertiesProviderModule,
                        ],
                    },
                }
                : {},
        ]);

        this.modeler = new Modeler(mergedOptions);
    }

    /**
     * Saves the editor content as XML.
     */
    public save(params: { format: boolean }): Promise<SaveXMLResult> {
        return this.modeler.saveXML(params);
    }

    /**
     * Imports the specified XML.
     *
     * @param xml The XML to import
     * @param open Whether to open the view after importing
     */
    public import(xml: string, open = true): Promise<ImportXMLResult> {
        class ImportXMLError extends Error {
            warnings: string[];

            constructor(message: string, warnings: string[]) {
                super(message);
                this.warnings = warnings;
                this.name = "ImportXMLError";
            }
        }

        try {
            return this.modeler.importXML(xml, { open });
        } catch (error) {
            if (error instanceof ImportXMLError) {
                console.error(
                    "Importing XML failed with warnings",
                    error.warnings,
                    error,
                );
            } else {
                console.error("Importing XML failed", error);
            }
            throw error;
        }
    }

    public get(param: any) {
        return this.modeler.get(param);
    }

    /**
     * Registers an event listener for bpmn-js.
     *
     * @param event The name of the event
     * @param handler The listener to register
     */
    public on(event: string, handler: (event: any, data: any) => void) {
        return this.modeler.on(event, handler);
    }

    /**
     * Unregisters a previously registered listener for bpmn-js.
     *
     * @param event The name of the event
     * @param handler The previously registered listener to unregister
     */
    public off(event: string, handler: (event: any, data: any) => void) {
        return this.modeler.off(event, handler);
    }

    /**
     * Returns the active viewer.
     */
    public getActiveViewer(): DmnViewer | undefined {
        return this.modeler.getActiveViewer();
    }

    /**
     * Returns all available views.
     */
    public getViews(): DmnView[] {
        return this.modeler.getViews();
    }

    /**
     * Returns the active view.
     */
    public getActiveView(): DmnView | undefined {
        return this.modeler.getActiveView();
    }

    /**
     * Opens the specified view.
     *
     * @param view The view to open
     */
    public open(view: DmnView): Promise<OpenResult> {
        try {
            return this.modeler.open(view);
        } catch (error: any) {
            if (error.warnings) {
                const e = error as OpenError;
                console.error("Opening view failed with warnings", e.warnings, e.error);
            } else {
                console.error("Opening view failed", error);
            }
            throw error;
        }
    }

    /**
     * Destroys the modeler instance.
     */
    public destroy() {
        this.modeler.destroy();
    }

    /**
     * Returns whether the command stack contains any actions that can be undone.
     * Can be used to determine if the undo button should be enabled or not.
     */
    public canUndo(): boolean {
        return this.modeler.getActiveViewer()?.get("commandStack").canUndo();
    }

    /**
     * Returns whether the command stack contains any actions that can be repeated.
     * Can be used to determine if the redo button should be enabled or not.
     */
    public canRedo(): boolean {
        return this.modeler.getActiveViewer()?.get("commandStack").canRedo();
    }

    /**
     * Returns the size of the current selection.
     */
    public getSelectionSize(): number {
        return this.modeler.getActiveViewer()?.get("selection")?.get()?.length ?? 0;
    }

    /**
     * Returns the current stack index.
     */
    public getStackIndex(): number {
        return this.modeler.getActiveViewer()?.get("commandStack")._stackIdx;
    }

    /**
     * Instructs the command stack to undo the last action.
     */
    public undo(): void {
        return this.modeler.getActiveViewer()?.get("commandStack").undo();
    }

    /**
     * Instructs the command stack to repeat the last undone action.
     */
    public redo(): void {
        return this.modeler.getActiveViewer()?.get("commandStack").redo();
    }

    /**
     * Registers a global event listener that will receive all bpmn-js events.
     *
     * @param listener The listener to register
     */
    public registerGlobalEventListener(listener: EventCallback): void {
        this.modeler.getActiveViewer()?.get("globalEventListenerUtil").on(listener);
    }

    /**
     * Unregisters a previously registered global event listener.
     *
     * @param listener The listener to unregister
     */
    public unregisterGlobalEventListener(listener: EventCallback): void {
        this.modeler.getActiveViewer()?.get("globalEventListenerUtil").off(listener);
    }
}

export default CustomDmnJsModeler;
