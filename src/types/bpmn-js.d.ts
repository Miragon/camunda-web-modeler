/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

declare module "bpmn-js/lib/Modeler" {
    class Modeler {
        constructor(options: any);

        /**
         * Returns the requested component.
         *
         * @param component The name of the component to return
         */
        get(component: string): any;

        /**
         * Imports the XML into the editor.
         *
         * @param xml The XML to import
         * @return List of import warnings
         * @throws If the import failed
         */
        importXML(xml: string): ImportResponse;

        /**
         * Saves the editor content as XML and returns it.
         *
         * @param format Whether to format the output
         * @param preamble Whether to include the preamble `<?xml version="1.0" encoding="UTF-8"?>`
         * @return The editor content as XML
         */
        saveXML({ format = false, preamble = false }): Promise<{ xml: string }>;

        /**
         * Saves the editor content as SVG and returns it.
         *
         * @return The editor content as SVG
         */
        saveSVG(): Promise<{ svg: string }>;

        /**
         * Registers an event listener for bpmn-js.
         *
         * @param event The name of the event
         * @param handler The listener to register
         */
        on(event: string, handler: (event: any & { type: string; }, data: any) => void);

        /**
         * Unregisters a previously registered listener for bpmn-js.
         *
         * @param event The name of the event
         * @param handler The previously registered listener to unregister
         */
        off(event: string, handler: (event: any & { type: string; }, data: any) => void);

        /**
         * Destroys the modeler instance.
         */
        destroy();
    }

    export default Modeler;
}

interface ImportResponse {
    warnings: ImportWarning[];
}

interface ImportWarning {
    error: Error;
    message: string;
}
