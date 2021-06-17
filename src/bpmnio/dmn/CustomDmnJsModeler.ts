import camundaModdleDescriptor from "camunda-dmn-moddle/resources/camunda.json";
import deepmerge from "deepmerge";
import diagramOriginModule from "diagram-js-origin";
import propertiesPanelModule from "dmn-js-properties-panel";
import "dmn-js-properties-panel/dist/assets/dmn-js-properties-panel.css";
import decisionTableAdapterModule from "dmn-js-properties-panel/lib/adapter/decision-table";
import drdAdapterModule from "dmn-js-properties-panel/lib/adapter/drd";
import literalExpressionAdapterModule from "dmn-js-properties-panel/lib/adapter/literal-expression";
import propertiesProviderModule from "dmn-js-properties-panel/lib/provider/camunda";
import "dmn-js/dist/assets/diagram-js.css";
import "dmn-js/dist/assets/dmn-font/css/dmn-embedded.css";
import "dmn-js/dist/assets/dmn-js-decision-table-controls.css";
import "dmn-js/dist/assets/dmn-js-decision-table.css";
import "dmn-js/dist/assets/dmn-js-drd.css";
import "dmn-js/dist/assets/dmn-js-literal-expression.css";
import "dmn-js/dist/assets/dmn-js-shared.css";
import Modeler from "dmn-js/lib/Modeler";
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

class CustomDmnJsModeler extends Modeler {
    /**
     * Creates a new instance of the bpmn-js modeler.
     *
     * @param options The options to include
     */
    constructor(options: CustomDmnJsModelerOptions) {
        const mergedOptions = deepmerge.all([
            // The options passed by the user
            options.dmnJsOptions || {},

            // The library's default options
            {
                container: options.container,
                drd: {
                    additionalModules: [
                        drdAdapterModule,
                        diagramOriginModule,
                        {
                            __init__: ["globalEventListenerUtil"],
                            globalEventListenerUtil: ["type", GlobalEventListenerUtil]
                        }
                    ]
                },
                decisionTable: {
                    additionalModules: [
                        decisionTableAdapterModule,
                        {
                            __init__: ["globalEventListenerUtil"],
                            globalEventListenerUtil: ["type", GlobalEventListenerUtil]
                        }
                    ]
                },
                literalExpression: {
                    additionalModules: [
                        literalExpressionAdapterModule,
                        {
                            __init__: ["globalEventListenerUtil"],
                            globalEventListenerUtil: ["type", GlobalEventListenerUtil]
                        }
                    ]
                },
                moddleExtensions: {
                    camunda: camundaModdleDescriptor
                }
            },

            // The options required to display the properties panel (if desired)
            options.propertiesPanel ? {
                drd: {
                    propertiesPanel: {
                        parent: options.propertiesPanel
                    },
                    additionalModules: [
                        propertiesPanelModule,
                        propertiesProviderModule
                    ]
                },
                decisionTable: {
                    propertiesPanel: {
                        parent: options.propertiesPanel
                    },
                    additionalModules: [
                        propertiesPanelModule,
                        propertiesProviderModule
                    ]
                },
                literalExpression: {
                    propertiesPanel: {
                        parent: options.propertiesPanel
                    },
                    additionalModules: [
                        propertiesPanelModule,
                        propertiesProviderModule
                    ]
                }
            } : {}
        ]);
        super(mergedOptions);
    }

    /**
     * Saves the editor content as XML.
     */
    public save(params: { format: boolean }): Promise<{ xml: string }> {
        return new Promise((resolve, reject) => {
            this.saveXML(params, (err, xml) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ xml });
                }
            });
        });
    }

    /**
     * Imports the specified XML.
     *
     * @param xml The XML to import
     */
    public import(xml: string): Promise<{ warnings: ImportWarning[] }> {
        return new Promise((resolve, reject) => {
            this.importXML(xml, { open: false }, (error, warnings) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ warnings });
                }
            });
        });
    }

    /**
     * Returns whether the command stack contains any actions that can be undone.
     * Can be used to determine if the undo button should be enabled or not.
     */
    public canUndo(): boolean {
        return this.getActiveViewer()?.get("commandStack").canUndo();
    }

    /**
     * Returns whether the command stack contains any actions that can be repeated.
     * Can be used to determine if the redo button should be enabled or not.
     */
    public canRedo(): boolean {
        return this.getActiveViewer()?.get("commandStack").canRedo();
    }

    /**
     * Returns the size of the current selection.
     */
    public getSelectionSize(): number {
        return this.getActiveViewer()?.get("selection")?.get()?.length || 0;
    }

    /**
     * Binds the keyboard to the curretn document.
     * Keyboard shortcuts will trigger actions in the editor after this has been called.
     */
    public bindKeyboard(): void {
        this.getActiveViewer()?.get("keyboard").bind(document);
    }

    /**
     * Unbinds the keyboard from the current document.
     * Keyboard shortcuts won't work anymore after this has been called.
     */
    public unbindKeyboard(): void {
        this.getActiveViewer()?.get("keyboard").unbind();
    }

    /**
     * Returns the current stack index.
     */
    public getStackIndex(): number {
        // eslint-disable-next-line no-underscore-dangle
        return this.getActiveViewer()?.get("commandStack")._stackIdx;
    }

    /**
     * Instructs the command stack to undo the last action.
     */
    public undo(): void {
        return this.getActiveViewer()?.get("commandStack").undo();
    }

    /**
     * Instructs the command stack to repeat the last undone action.
     */
    public redo(): void {
        return this.getActiveViewer()?.get("commandStack").redo();
    }

    /**
     * Registers a global event listener that will receive all bpmn-js events.
     *
     * @param listener The listener to register
     */
    public registerGlobalEventListener(listener: EventCallback): void {
        this.get("globalEventListenerUtil").on(listener);
    }

    /**
     * Unregisters a previously registered global event listener.
     *
     * @param listener The listener to unregister
     */
    public unregisterGlobalEventListener(listener: EventCallback): void {
        this.get("globalEventListenerUtil").off(listener);
    }
}

export default CustomDmnJsModeler;
