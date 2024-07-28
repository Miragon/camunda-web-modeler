import React, {MutableRefObject, ReactNode, useCallback, useEffect, useRef, useState,} from "react";
import {makeStyles} from "@material-ui/core/styles";
import clsx from "clsx";
import {Panel, PanelGroup, PanelResizeHandle} from "react-resizable-panels";

import CustomBpmnJsModeler from "../bpmnio/bpmn/CustomBpmnJsModeler";
import {createBpmnIoEvent} from "../events/bpmnio/BpmnIoEvents";
import {Event} from "../events";
import {createContentSavedEvent} from "../events/modeler/ContentSavedEvent";
import {createNotificationEvent} from "../events/modeler/NotificationEvent";
import {createPropertiesPanelResizedEvent} from "../events/modeler/PropertiesPanelResizedEvent";
import {createUIUpdateRequiredEvent} from "../events/modeler/UIUpdateRequiredEvent";

/**
 * The events that trigger an UI update required event.
 */
const UI_UPDATE_REQUIRED_EVENTS = [
    "import.done",
    "saveXML.done",
    "commandStack.changed",
    "selection.changed",
    "attach",
    "elements.copied",
    "propertiesPanel.focusin",
    "propertiesPanel.focusout",
    "directEditing.activate",
    "directEditing.deactivate",
    "searchPad.closed",
    "searchPad.opened",
];

/**
 * The events that trigger a content saved event.
 */
const CONTENT_SAVED_EVENT = ["import.done", "commandStack.changed"];

export interface BpmnPropertiesPanelOptions {
    /**
     * This option disables the properties panel.
     * CAUTION: Element templates will not be imported either if this option is set!
     */
    hidden?: boolean;

    /**
     * The initial, minimum, and maximum sizes of the properties panel.
     * Can be in % or px each.
     */
    size?: {
        // Default "25"
        initial?: number;
        // Default "5"
        min?: number;
        // Default "95"
        max?: number;
    };

    /**
     * The container to host the properties panel. By default, a styled div is created. If you
     * pass this option, make sure you set an ID and pass it via the `containerId` prop.
     * Pass `false` to prevent the rendering of this component.
     */
    container?: ReactNode;

    /**
     * The ID of the container to host the properties panel. Only required if you want to
     * use your own container.
     */
    containerId?: string;

    /**
     * The class name applied to the host of the properties panel.
     */
    className?: string;

    /**
     * The element templates to import into the modeler.
     */
    elementTemplates?: any[];
}

export interface BpmnModelerOptions {
    /**
     * Will receive the reference to the modeler instance.
     */
    refs?: MutableRefObject<CustomBpmnJsModeler | undefined>[];

    /**
     * The initial, minimum, and maximum sizes of the modeler panel.
     * Can be in % or px each.
     */
    size?: {
        // Default "75"
        initial?: number;
        // Default "5"
        min?: number;
        // Default "95"
        max?: number;
    };

    /**
     * The container to host the modeler. By default, a styled div is created. If you pass
     * this option, make sure you set an ID and pass it via the `containerId` prop.
     * Pass `false` to prevent the rendering of this component.
     */
    container?: ReactNode;

    /**
     * The ID of the container to host the modeler. Only required if you want to use your own
     * container.
     */
    containerId?: string;

    /**
     * The class name applied to the host of the modeler.
     */
    className?: string;
}

export interface BpmnEditorProps {
    /**
     * The class name applied to the root element.
     */
    className?: string;

    /**
     * The xml to display in the editor.
     */
    xml: string;

    /**
     * Whether this editor is currently active and visible to the user.
     */
    active: boolean;

    /**
     * Called whenever an event occurs.
     */
    onEvent: (event: Event<any, any>) => void;

    /**
     * The options passed to the bpmn-js modeler.
     *
     * CAUTION: When this option object is changed, the old editor instance will be destroyed
     * and a new one will be created without automatic saving!
     */
    bpmnJsOptions?: any;

    /**
     * The options to control the appearance of the properties panel.
     *
     * CAUTION: When this option object is changed, the old editor instance will be destroyed
     * and a new one will be created without automatic saving!
     */
    propertiesPanelOptions?: BpmnPropertiesPanelOptions;

    /**
     * The options to control the appearance of the modeler.
     *
     * CAUTION: When this options object is changed, the old editor instance will be destroyed
     * and a new one will be created without automatic saving!
     */
    modelerOptions?: BpmnModelerOptions;
}

const useStyles = makeStyles(() => ({
    modeler: {
        height: "100%",
    },
    propertiesPanel: {
        height: "100%",
        "&>div": {
            height: "100%",
            overflow: "auto",
        },
    },
    hidden: {
        display: "none",
    },
    modelerOnly: {
        height: "100%",
    },
}));

const BpmnEditor: React.FC<BpmnEditorProps> = props => {
    const classes = useStyles();

    const {
        active,
        xml,
        onEvent,
        className,
        bpmnJsOptions,
        modelerOptions,
        propertiesPanelOptions,
    } = props;

    const [initializeCount, setInitializeCount] = useState(0);
    const ref = useRef<CustomBpmnJsModeler | undefined>(undefined);

    const handleEvent = useCallback(
        (event: string, data: any) => {
            // TODO: Should bpmn-js events only be forwarded if the editor is currently active?
            onEvent(createBpmnIoEvent(event, data));

            if (!active) {
                return;
            }

            if (event === "elementTemplates.errors") {
                onEvent(
                    createNotificationEvent(
                        "Importing element templates failed. Check console for details.",
                        "error",
                    ),
                );
                console.error("Importing element templates failed.", data);
            }

            /**
             * If the event should trigger a UI update required event, do it.
             */
            if (event && UI_UPDATE_REQUIRED_EVENTS.indexOf(event) !== -1) {
                onEvent(createUIUpdateRequiredEvent(active));
            }

            /**
             * If the event should trigger a content saved event, do it.
             */
            if (event && CONTENT_SAVED_EVENT.indexOf(event) !== -1 && ref.current) {
                ref.current
                    .save()
                    .then(saved => {
                        onEvent(
                            createContentSavedEvent(
                                saved.xml,
                                saved.svg,
                                "diagram.changed",
                            ),
                        );
                    })
                    .catch(e => {
                        console.warn("Could not save document", e);
                    });
            }
        },
        [active, onEvent],
    );

    /**
     * Instantiates the modeler and properties panel. Only happens once on mount.
     */
    useEffect(() => {
        const modeler = new CustomBpmnJsModeler({
            container: modelerOptions?.containerId ?? "#bpmnview",
            propertiesPanel: propertiesPanelOptions?.hidden
                ? undefined
                : (propertiesPanelOptions?.containerId ?? "#bpmnprop"),
            bpmnJsOptions: bpmnJsOptions,
        });

        ref.current = modeler;
        if (modelerOptions?.refs) {
            modelerOptions.refs.forEach(r => {
                r.current = modeler;
            });
        }

        setInitializeCount(count => count + 1);

        return () => {
            modeler.unregisterGlobalEventListener(handleEvent);
            modeler.destroy();
            ref.current = undefined;
            if (modelerOptions?.refs) {
                modelerOptions.refs.forEach(r => {
                    r.current = undefined;
                });
            }
        };
    }, [
        handleEvent,
        bpmnJsOptions,
        propertiesPanelOptions,
        modelerOptions?.containerId,
    ]);

    /**
     * Imports the specified XML. The following steps are executed:
     *
     * 1. Export the currently loaded XML.
     * 2. Check if it is different from the specified XML.
     * 3. Import the specified XML if it has changed.
     * 4. Show any errors or warnings that occurred during import.
     */
    const importXml = useCallback(
        async (newXml: string) => {
            if (ref.current) {
                try {
                    const currentXml = await ref.current?.saveXML({
                        format: true,
                        preamble: false,
                    });

                    if (newXml === currentXml.xml) {
                        // XML has not changed
                        return;
                    }
                } catch (e) {
                    // The editor has not yet loaded any content
                    // => no definitions loaded, just ignore the error
                }

                try {
                    const result = ref.current.importXML(newXml);
                    const count = result.warnings?.length ?? 0;
                    if (count > 0) {
                        console.log("Imported with warnings", result.warnings);
                        onEvent(
                            createNotificationEvent(
                                `Imported with ${count} warning${count === 1 ? "" : "s"}. See console for details.`,
                                "warning",
                            ),
                        );
                    }
                } catch (e) {
                    console.error("Could not import XML", e);
                    onEvent(
                        createNotificationEvent(
                            "Could not import changed XML. Is it invalid? See console for details.",
                            "error",
                        ),
                    );
                }
            }
        },
        [onEvent],
    );

    /**
     * Imports the document XML whenever it changes.
     */
    useEffect(() => {
        if (initializeCount > 0) {
            void importXml(xml);
        }
    }, [xml, importXml, initializeCount]);

    useEffect(() => {
        const modeler = ref.current;
        if (initializeCount > 0 && modeler) {
            modeler.registerGlobalEventListener(handleEvent);
            return () => modeler.unregisterGlobalEventListener(handleEvent);
        }
        return undefined;
    }, [initializeCount, handleEvent]);

    /**
     * Binds the current modeler instance to the keyboard when active and unbinds it when inactive.
     * Also dispatches an update UI event.
     */
    useEffect(() => {
        onEvent(createUIUpdateRequiredEvent(active));
        const cur = ref.current;
        active ? cur?.bindKeyboard() : cur?.unbindKeyboard();
    }, [active, onEvent]);

    /**
     * Imports the specified element templates whenever they change.
     */
    useEffect(() => {
        if (!propertiesPanelOptions?.hidden) {
            ref.current?.importElementTemplates(
                propertiesPanelOptions?.elementTemplates ?? [],
            );
        }
    }, [propertiesPanelOptions?.hidden, propertiesPanelOptions?.elementTemplates]);

    const onPropertiesPanelWidthChanged = useCallback(
        (sizes: number[]) => {
            onEvent(createPropertiesPanelResizedEvent(sizes[1]));
        },
        [onEvent],
    );

    const modelerContainer: ReactNode = modelerOptions?.container ?? (
        <div
            id="bpmnview"
            className={clsx(
                classes.modeler,
                modelerOptions?.className,
                !active && classes.hidden,
            )}
        />
    );

    const propertiesPanelContainer: ReactNode = propertiesPanelOptions?.container ?? (
        <div
            id="bpmnprop"
            className={clsx(
                classes.propertiesPanel,
                propertiesPanelOptions?.className,
                !active && classes.hidden,
            )}
        />
    );

    if (propertiesPanelOptions?.hidden) {
        return (
            <div
                className={clsx(
                    !props.active && classes.hidden,
                    classes.modelerOnly,
                    className,
                )}
            >
                {modelerContainer}
            </div>
        );
    }

    return (
        <PanelGroup
            className={clsx(!props.active && classes.hidden, className)}
            direction="horizontal"
            onLayout={onPropertiesPanelWidthChanged}
        >
            <Panel
                defaultSize={modelerOptions?.size?.initial ?? 75}
                maxSize={modelerOptions?.size?.max ?? 95}
                minSize={modelerOptions?.size?.min ?? 5}
            >
                {modelerContainer}
            </Panel>
            <PanelResizeHandle
                style={{
                    cursor: "col-resize",
                    width: "5px",
                    backgroundColor: "rgba(0, 0, 0, 0.25)",
                }}
            />
            <Panel
                defaultSize={propertiesPanelOptions?.size?.initial ?? 25}
                maxSize={propertiesPanelOptions?.size?.max ?? 95}
                minSize={propertiesPanelOptions?.size?.min ?? 5}
            >
                {propertiesPanelContainer}
            </Panel>
        </PanelGroup>
    );
};

export default BpmnEditor;
