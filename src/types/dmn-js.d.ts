/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

declare module "dmn-js/lib/Modeler" {
    import { DmnView, DmnViewer } from "../bpmnio/dmn/CustomDmnJsModeler";

    class Modeler {
        constructor(options: any);

        get(param: any): any;

        /**
         * Imports the passed XML into the editor.
         *
         * @param xml The XML to import
         * @param options Options for customization
         *                open: Whether to open the diagram after importing
         */
        importXML(xml: string, options?: { open: boolean }): Promise<ImportXMLResult>;

        saveXML({ format: boolean }): Promise<SaveXMLResult>;

        /**
         * Registers an event listener for bpmn-js.
         *
         * @param event The name of the event
         * @param handler The listener to register
         */
        on(event: string, handler: (event: any, data: any) => void);

        /**
         * Unregisters a previously registered listener for bpmn-js.
         *
         * @param event The name of the event
         * @param handler The previously registered listener to unregister
         */
        off(event: string, handler: (event: any, data: any) => void);

        /**
         * Returns the active viewer.
         */
        getActiveViewer(): DmnViewer | undefined;

        /**
         * Returns all available views.
         */
        getViews(): DmnView[];

        /**
         * Returns the active view.
         */
        getActiveView(): DmnView | undefined;

        /**
         * Opens the specified view.
         *
         * @param view The view to open
         */
        open(view: DmnView): Promise<OpenResult>;

        /**
         * Destroys the modeler instance.
         */
        destroy();
    }

    export type OpenResult = {
        /**
         * Warnings occurred during the opening.
         */
        warnings: string[];
    };

    export type OpenError = {
        error: Error;
        /**
         * Warnings occurred during the opening.
         */
        warnings: string[];
    };

    export type ImportXMLResult = {
        warnings: string[];
    };

    export type SaveXMLResult = {
        xml: string;
    };

    export default Modeler;
}
