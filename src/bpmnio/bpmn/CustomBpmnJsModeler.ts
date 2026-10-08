import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "bpmn-js-element-templates/dist/assets/element-templates.css";
import "@bpmn-io/element-template-chooser/dist/element-template-chooser.css";
// diagram-js ships its own stylesheet; the copies inside bpmn-js and dmn-js lag behind
// the installed diagram-js version.
import "diagram-js/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda.json";
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
} from "bpmn-js-properties-panel";
import { ElementTemplatesPropertiesProviderModule } from "bpmn-js-element-templates";
import ElementTemplateChooserModule from "@bpmn-io/element-template-chooser";
import Modeler from "bpmn-js/lib/Modeler";
import GlobalEventListenerUtil, { EventCallback } from "../GlobalEventListenerUtil";
import { mergeBpmnJsOptions } from "../mergeOptions";

export interface CustomBpmnJsModelerOptions {
    /**
     * The element (or a CSS selector for it) to use as host for the properties panel. If
     * missing or undefined is passed, no properties panel will be initialized.
     */
    propertiesPanel?: string | HTMLElement;

    /**
     * The element (or a CSS selector for it) to use as host for the editor itself.
     */
    container: string | HTMLElement;

    /**
     * The options passed to bpmn-js. They are merged with the options this library needs:
     * modules are registered after the library's (and can override its services), values
     * override the library defaults, and moddle extensions are merged by key. Only the
     * containers are always the component's.
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
        const mergedOptions = mergeBpmnJsOptions(
            {
                container: options.container,
                propertiesPanel: options.propertiesPanel,
                modules: [
                    {
                        __init__: ["globalEventListenerUtil"],
                        globalEventListenerUtil: ["type", GlobalEventListenerUtil],
                    },
                ],
                propertiesPanelModules: [
                    BpmnPropertiesPanelModule,
                    BpmnPropertiesProviderModule,
                    ElementTemplatesPropertiesProviderModule,
                    ElementTemplateChooserModule,
                ],
                moddleExtensions: {
                    camunda: camundaModdleDescriptor,
                },
            },
            options.bpmnJsOptions,
        );
        super(mergedOptions);
    }

    /**
     * Returns the injector.
     */
    getInjector(): Injector {
        return this.get<Injector>("injector");
    }

    /**
     * Returns a bpmn-js service. The official typings return `unknown` for services
     * looked up by name; the wrapper methods below know which service they ask for.
     */
    private service(name: string): any {
        return this.get(name);
    }

    /**
     * Checks that the XML can be parsed as BPMN without importing it.
     *
     * @param xml The XML to check
     * @throws Rejects if the XML is not a parsable BPMN document
     */
    async validate(xml: string): Promise<void> {
        await this.service("moddle").fromXML(xml, "bpmn:Definitions");
    }

    /**
     * Notifies the canvas that its container has been resized or shown.
     */
    resized(): void {
        this.service("canvas").resized();
    }

    /**
     * Saves the editor content as SVG and XML simultaneously.
     */
    async save(): Promise<{ xml: string; svg: string }> {
        const [{ xml }, { svg }] = await Promise.all([
            this.saveXML({
                format: true,
                preamble: false,
            }),
            this.saveSVG(),
        ]);
        // saveXML only omits the XML if it failed, in which case it rejects anyway.
        return { xml: xml ?? "", svg };
    }

    /**
     * Registers a global event listener that will receive all bpmn-js events.
     *
     * @param listener The listener to register
     */
    public registerGlobalEventListener(listener: EventCallback): void {
        this.service("globalEventListenerUtil").on(listener);
    }

    /**
     * Unregisters a previously registered global event listener.
     *
     * @param listener The listener to unregister
     */
    public unregisterGlobalEventListener(listener: EventCallback): void {
        this.service("globalEventListenerUtil").off(listener);
    }

    /**
     * Imports element templates into the editor.
     *
     * @param elementTemplates The element templates to import.
     */
    public importElementTemplates(elementTemplates: Record<string, unknown>[]): void {
        this.service("elementTemplatesLoader").setTemplates(elementTemplates);
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
        const selection = this.service("selection").get();
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
        const selection = this.service("selection");

        // select all elements except for the invisible
        // root element
        const rootElement = canvas.getRootElement();
        const elements = elementRegistry.filter(
            (element: any) => element !== rootElement,
        );
        selection.select(elements);
    }

    /**
     * Removes the currently selected elements.
     */
    public removeSelected(): void {
        const modeling = this.service("modeling");
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
        return this.service("selection").get().length;
    }

    /**
     * Returns whether there is any element selected that can be copied.
     * Can be used to determine if the copy button should be enabled or not.
     */
    public canCopy(): boolean {
        return this.service("selection").get().length > 0;
    }

    /**
     * Returns whether there is any element in the clipboard that can be pasted.
     * Can be used to determine if the paste button should be enabled or not.
     */
    public canPaste(): boolean {
        return !this.service("clipboard").isEmpty();
    }

    /**
     * Returns the current stack index.
     */
    public getStackIndex(): number {
        return this.service("commandStack")._stackIdx;
    }

    /**
     * Returns whether the command stack contains any actions that can be undone.
     * Can be used to determine if the undo button should be enabled or not.
     */
    public canUndo(): boolean {
        return this.service("commandStack").canUndo();
    }

    /**
     * Returns whether the command stack contains any actions that can be repeated.
     * Can be used to determine if the redo button should be enabled or not.
     */
    public canRedo(): boolean {
        return this.service("commandStack").canRedo();
    }

    /**
     * Instructs the command stack to undo the last action.
     */
    public undo(): void {
        return this.service("commandStack").undo();
    }

    /**
     * Instructs the command stack to repeat the last undone action.
     */
    public redo(): void {
        return this.service("commandStack").redo();
    }

    /**
     * Resets the zoom level to its default value.
     */
    public resetZoom(): void {
        this.service("zoomScroll").reset();
    }
}

export default CustomBpmnJsModeler;
