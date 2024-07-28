import React, {MutableRefObject, ReactNode, useCallback, useEffect, useRef, useState,} from "react";
import makeStyles from '@mui/styles/makeStyles';
import clsx from "clsx";
import {Panel, PanelGroup, PanelResizeHandle} from "react-resizable-panels";

import CustomDmnJsModeler, {DmnView} from "../bpmnio/dmn/CustomDmnJsModeler";
import {createBpmnIoEvent} from "../events/bpmnio/BpmnIoEvents";
import {Event} from "../events";
import {createContentSavedEvent} from "../events/modeler/ContentSavedEvent";
import {createDmnViewsChangedEvent} from "../events/modeler/DmnViewsChangedEvent";
import {createNotificationEvent} from "../events/modeler/NotificationEvent";
import {createPropertiesPanelResizedEvent} from "../events/modeler/PropertiesPanelResizedEvent";
import {createUIUpdateRequiredEvent} from "../events/modeler/UIUpdateRequiredEvent";

/**
 * The events that trigger a UI update required event.
 */
const UI_UPDATE_REQUIRED_EVENTS = [
    "import.done",
    "saveXML.done",
    "attach",
    "dmn.views.changed",
    "views.changed",
    "view.contentChanged",
    "view.selectionChanged",
    "view.directEditingChanged",
    "propertiesPanel.focusin",
    "propertiesPanel.focusout",
];

/**
 * The events that trigger a content saved event.
 */
const CONTENT_SAVED_EVENT = [
    "import.done",
    "view.contentChanged",
    "dmn.views.changed",
    "views.changed",
    "elements.changed",
];

export interface DmnPropertiesPanelOptions {
    /**
     * This option disables the properties panel.
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
}

export interface DmnModelerOptions {
    /**
     * Will receive the reference to the modeler instance.
     */
    refs?: MutableRefObject<CustomDmnJsModeler | undefined>[];

    /**
     * The initial, minimum, and maximum sizes of the modeler panel.
     * Can be in % or px each.
     */
    size?: {
        // Default "75"
        initial?: number;
        // Default "95"
        min?: number;
        // Default "5"
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

export interface DmnEditorProps {
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
     * The class name applied to the host of the properties panel.
     */
    className?: string;

    /**
     * The options passed to the dmn-js modeler.
     *
     * CAUTION: When this options object is changed, the old editor instance will be destroyed
     * and a new one will be created without automatic saving!
     */
    dmnJsOptions?: any;

    /**
     * The options to control the appearance of the properties panel.
     *
     * CAUTION: When this options object is changed, the old editor instance will be destroyed
     * and a new one will be created without automatic saving!
     */
    propertiesPanelOptions?: DmnPropertiesPanelOptions;

    /**
     * The options to control the appearance of the modeler.
     *
     * CAUTION: When this options object is changed, the old editor instance will be destroyed
     * and a new one will be created without automatic saving!
     */
    modelerOptions?: DmnModelerOptions;
}

const useStyles = makeStyles(() => ({
    modeler: {
        height: "100%",
    },
    propertiesPanel: {
        height: "100%",
        "&>div": {
            height: "100%",
        },
    },
    hidden: {
        display: "none",
    },
    modelerOnly: {
        height: "100%",
    },
}));

const DmnEditor: React.FC<DmnEditorProps> = props => {
    const classes = useStyles();

    const {
        xml,
        active,
        onEvent,
        dmnJsOptions,
        propertiesPanelOptions,
        modelerOptions,
        className,
    } = props;

    const [activeView, setActiveView] = useState<DmnView | undefined>(undefined);
    const [initializeCount, setInitializeCount] = useState(0);
    const ref = useRef<CustomDmnJsModeler | null>(null);

    const handleEvent = useCallback(
        (event: string, data: any) => {
            // TODO: Should dmn-js events only be forwarded if the editor is currently active?
            onEvent(createBpmnIoEvent(event, data));

            if (!active) {
                return;
            }

            if (event === "views.changed") {
                setActiveView(data.activeView);
                onEvent(createDmnViewsChangedEvent(data.views, data.activeView));
            }

            /**
             * If the event should trigger an UI update required event, do it.
             */
            if (event && UI_UPDATE_REQUIRED_EVENTS.indexOf(event) !== -1) {
                onEvent(createUIUpdateRequiredEvent(active));
            }

            /**
             * If the event should trigger a content saved event, do it.
             */
            if (event && CONTENT_SAVED_EVENT.indexOf(event) !== -1 && ref.current) {
                ref.current
                    .save({ format: true })
                    .then(saved => {
                        // TODO: Save SVG (but which viewer?)
                        onEvent(
                            createContentSavedEvent(
                                saved.xml,
                                undefined,
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

    const viewsChangedCallback = useCallback(
        (event, data) => {
            void handleEvent(event.type, data);
            if (ref.current?.getActiveViewer()) {
                void ref.current?.registerGlobalEventListener(handleEvent);
                return () => ref.current?.unregisterGlobalEventListener(handleEvent);
            }
            return undefined;
        },
        [handleEvent],
    );

    /**
     * Instantiates the modeler and properties panel. Only happens once on mount.
     */
    useEffect(() => {
        const modeler = new CustomDmnJsModeler({
            container: modelerOptions?.containerId ?? "#dmnview",
            propertiesPanel: propertiesPanelOptions?.hidden
                ? undefined
                : (propertiesPanelOptions?.containerId ?? "#dmnprop"),
            dmnJsOptions: dmnJsOptions,
        });

        ref.current = modeler;
        if (modelerOptions?.refs) {
            modelerOptions.refs.forEach(r => {
                r.current = modeler;
            });
        }

        setInitializeCount(cur => cur + 1);

        return () => {
            if (modelerOptions?.refs) {
                modelerOptions.refs.forEach(r => {
                    r.current = undefined;
                });
            }
            modeler.destroy();
        };
    }, [dmnJsOptions, modelerOptions, propertiesPanelOptions]);

    useEffect(() => {
        const modeler = ref.current;
        modeler?.on("views.changed", viewsChangedCallback);
        return () => modeler?.off("views.changed", viewsChangedCallback);
    }, [viewsChangedCallback]);

    /**
     * Imports the specified XML. The following steps are executed:
     *
     * 1. Export the currently loaded XML.
     * 2. Check if it is different from the specified XML.
     * 3. Import the specified XML if it has changed.
     * 4. Show any errors or warnings that occurred during import.
     */
    const importXml = useCallback(
        async (newXml: string, open = false): Promise<void> => {
            if (ref.current) {
                try {
                    const currentXml = await ref.current?.save({
                        format: true,
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
                    const result = await ref.current.import(newXml, open);
                    const count = result.warnings.length;
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
            // Only open the view on first render
            void importXml(xml, initializeCount === 1);
        }
    }, [xml, importXml, initializeCount]);

    /**
     * Binds the current modeler instance to the keyboard when active and unbinds it when inactive.
     */
    useEffect(() => {
        onEvent(createUIUpdateRequiredEvent(active));
        const cur = ref.current;
        if (active) {
            if (cur?.getActiveViewer()) {
                cur?.bindKeyboard();
                return () => cur?.unbindKeyboard();
            }

            // TODO: Is this still required?
            // Fallback for first mount
            // TODO: Is there another way to do this? The way above does not work on first mount
            const timeout = setTimeout(() => cur?.bindKeyboard(), 1000);
            return () => {
                clearTimeout(timeout);
                cur?.unbindKeyboard();
            };
        }
        return undefined;
    }, [active, activeView, onEvent]);

    const onPropertiesPanelWidthChanged = useCallback(
        (sizes: number[]) => {
            onEvent(createPropertiesPanelResizedEvent(sizes[1]));
        },
        [onEvent],
    );

    const modelerContainer: ReactNode = modelerOptions?.container ?? (
        <div
            id="dmnview"
            className={clsx(
                classes.modeler,
                modelerOptions?.className,
                !active && classes.hidden,
            )}
        />
    );

    const propertiesPanelContainer: ReactNode = propertiesPanelOptions?.container ?? (
        <div
            id="dmnprop"
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

export default DmnEditor;
