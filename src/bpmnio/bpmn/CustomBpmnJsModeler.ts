import propertiesPanelModule from "bpmn-js-properties-panel";
import "bpmn-js-properties-panel/dist/assets/bpmn-js-properties-panel.css";
import propertiesProviderModule from "bpmn-js-properties-panel/lib/provider/camunda";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "bpmn-js/dist/assets/diagram-js.css";
import Modeler from "bpmn-js/lib/Modeler";
import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda.json";
import deepmerge from "deepmerge";
import GlobalEventListenerUtil, { EventCallback } from "../GlobalEventListenerUtil";

export interface CustomBpmnJsModelerOptions {
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
     * The options passed to bpmn-js. Will be merged with the options defined by this library,
     * with the latter taking precedence in case of conflict.
     * CAUTION: If you pass invalid properties, the modeler can break!
     */
    bpmnJsOptions?: any;
}

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

class CustomBpmnJsModeler extends Modeler {
    /**
     * Creates a new instance of the bpmn-js modeler.
     *
     * @param options The options to include
     */
    constructor(options: CustomBpmnJsModelerOptions) {
        const mergedOptions = deepmerge.all([
            // The options passed by the user
            options.bpmnJsOptions || {},

            // The library's default options
            {
                container: options.container,
                additionalModules: [
                    {
                        __init__: ["globalEventListenerUtil"],
                        globalEventListenerUtil: ["type", GlobalEventListenerUtil]
                    }
                ],
                moddleExtensions: {
                    camunda: camundaModdleDescriptor
                }
            },

            // The options required to display the properties panel (if desired)
            options.propertiesPanel ? {
                propertiesPanel: {
                    parent: options.propertiesPanel
                },
                additionalModules: [
                    propertiesPanelModule,
                    propertiesProviderModule
                ]
            } : {}
        ], {
            // Deprecated, but @dominikhorn93 said it's okay because it's gonna stay that way for
            // at least 5 years (or forever)
            clone: false
        });
        super(mergedOptions);
    }

    /**
     * Returns the injector.
     */
    getInjector(): Injector {
        return this.get("injector");
    }

    /**
     * Saves the editor content as SVG and XML simultaneously.
     */
    async save(): Promise<{ xml: string; svg: string; }> {
        const [{ xml }, { svg }] = await Promise.all([
            this.saveXML({
                format: true,
                preamble: false
            }),
            this.saveSVG()
        ]);
        return { xml, svg };
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

    /**
     * Imports element templates into the editor.
     *
     * @param elementTemplates The element templates to import.
     */
    public importElementTemplates(elementTemplates: Record<string, unknown>[]): void {
        this.get("elementTemplatesLoader").setTemplates(elementTemplates);
    }

    /**
     * Binds the keyboard to the curretn document.
     * Keyboard shortcuts will trigger actions in the editor after this has been called.
     */
    public bindKeyboard(): void {
        this.get("keyboard").bind(document);
    }

    /**
     * Unbinds the keyboard from the current document.
     * Keyboard shortcuts won't work anymore after this has been called.
     */
    public unbindKeyboard(): void {
        this.get("keyboard").unbind();
    }

    /**
     * Toggles the hand tool.
     */
    public toggleHandTool(): void {
        this.getInjector().get("handTool").toggle();
    }

    /**
     * Toggles the lasso tool.
     */
    public toggleLassoTool(): void {
        this.getInjector().get("lassoTool").toggle();
    }

    /**
     * Toggles the space tool.
     */
    public toggleSpaceTool(): void {
        this.getInjector().get("spaceTool").toggle();
    }

    /**
     * Toggles the global connect tool.
     */
    public toggleGlobalConnectTool(): void {
        this.getInjector().get("globalConnect").toggle();
    }

    /**
     * Toggles the search box.
     */
    public toggleFind(): void {
        this.getInjector().get("searchPad").toggle();
    }

    /**
     * Activates the edit label function.
     */
    public toggleEditLabel(): void {
        const selection = this.get("selection").get();
        if (selection.length > 0) {
            this.getInjector().get("directEditing").activate(selection[0]);
        }
    }

    /**
     * Expands the selection to all available elements.
     */
    public selectAll(): void {
        const canvas = this.getInjector().get("canvas");
        const elementRegistry = this.getInjector().get("elementRegistry");
        const selection = this.get("selection");

        // select all elements except for the invisible
        // root element
        const rootElement = canvas.getRootElement();
        const elements = elementRegistry.filter((element: any) => element !== rootElement);
        selection.select(elements);
    }

    /**
     * Removes the currently selected elements.
     */
    public removeSelected(): void {
        const modeling = this.get("modeling");
        const selectedElements = this.getInjector().get("selection").get();

        if (selectedElements.length === 0) {
            return;
        }

        modeling.removeElements(selectedElements.slice());
    }

    /**
     * Returns the size of the current selection.
     */
    public getSelectionSize(): number {
        return this.get("selection").get().length;
    }

    /**
     * Returns whether there is any element selected that can be copied.
     * Can be used to determine if the copy button should be enabled or not.
     */
    public canCopy(): boolean {
        return this.get("selection").get().length > 0;
    }

    /**
     * Returns whether there is any element in the clipboard that can be pasted.
     * Can be used to determine if the paste button should be enabled or not.
     */
    public canPaste(): boolean {
        return !this.get("clipboard").isEmpty();
    }

    /**
     * Returns the current stack index.
     */
    public getStackIndex(): number {
        // eslint-disable-next-line no-underscore-dangle
        return this.get("commandStack")._stackIdx;
    }

    /**
     * Returns whether the command stack contains any actions that can be undone.
     * Can be used to determine if the undo button should be enabled or not.
     */
    public canUndo(): boolean {
        return this.get("commandStack").canUndo();
    }

    /**
     * Returns whether the command stack contains any actions that can be repeated.
     * Can be used to determine if the redo button should be enabled or not.
     */
    public canRedo(): boolean {
        return this.get("commandStack").canRedo();
    }

    /**
     * Instructs the command stack to undo the last action.
     */
    public undo(): void {
        return this.get("commandStack").undo();
    }

    /**
     * Instructs the command stack to repeat the last undone action.
     */
    public redo(): void {
        return this.get("commandStack").redo();
    }

    /**
     * Resets the zoom level to its default value.
     */
    public resetZoom(): void {
        this.get("zoomScroll").reset();
    }
}

export default CustomBpmnJsModeler;
