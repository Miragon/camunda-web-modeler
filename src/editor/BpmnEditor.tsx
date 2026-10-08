import React, {
    MutableRefObject,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { tss } from "tss-react";

import ResizablePanels from "../components/ResizablePanels";
import CustomBpmnJsModeler from "../bpmnio/bpmn/CustomBpmnJsModeler";
import { createBpmnIoEvent } from "../events/bpmnio/BpmnIoEvents";
import { Event } from "../events";
import { createContentSavedEvent } from "../events/modeler/ContentSavedEvent";
import { createNotificationEvent } from "../events/modeler/NotificationEvent";
import { createPropertiesPanelResizedEvent } from "../events/modeler/PropertiesPanelResizedEvent";
import { createUIUpdateRequiredEvent } from "../events/modeler/UIUpdateRequiredEvent";
import { EchoTracker } from "./EchoTracker";
import { useLatest } from "./useLatest";

/**
 * The events that trigger a UI update required event.
 */
const UI_UPDATE_REQUIRED_EVENTS = [
    "import.done",
    "commandStack.changed",
    "selection.changed",
    "attach",
    "copyPaste.elementsCopied",
    "directEditing.activate",
    "directEditing.deactivate",
    "searchPad.closed",
    "searchPad.opened",
];

/**
 * The events that trigger a content saved event.
 */
const CONTENT_SAVED_EVENT = ["commandStack.changed"];

export interface BpmnPropertiesPanelOptions {
    /**
     * This option disables the properties panel.
     * CAUTION: Element templates will not be imported either if this option is set!
     */
    hidden?: boolean;

    /**
     * The initial, minimum, and maximum sizes of the properties panel in percent of the
     * container width.
     */
    size?: {
        // Default 25
        initial?: number;
        // Default 5
        min?: number;
        // Default 95
        max?: number;
    };

    /**
     * The container to host the properties panel. By default, a styled div is created. If you
     * pass your own element (or `false` to render none here), pass a CSS selector for the
     * element to use via `containerId`; it must exist when the modeler is created.
     */
    container?: ReactNode;

    /**
     * A CSS selector (e.g. `"#my-properties-panel"`) for the element to host the properties
     * panel. Only required if you want to use your own container.
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
     *
     * While the XML tab is shown, the instance keeps the state from before switching; changes
     * made in the XML tab are imported when switching back.
     */
    refs?: MutableRefObject<CustomBpmnJsModeler | undefined>[];

    /**
     * The initial, minimum, and maximum sizes of the modeler panel in percent of the
     * container width.
     */
    size?: {
        // Default 75
        initial?: number;
        // Default 5
        min?: number;
        // Default 95
        max?: number;
    };

    /**
     * The container to host the modeler. By default, a styled div is created. If you pass
     * your own element (or `false` to render none here), pass a CSS selector for the element
     * to use via `containerId`; it must exist when the modeler is created.
     */
    container?: ReactNode;

    /**
     * A CSS selector (e.g. `"#my-modeler"`) for the element to host the modeler. Only
     * required if you want to use your own container.
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
     * The XML to display in the editor.
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
     * CAUTION: Changing `hidden` or `containerId` destroys the editor instance and creates a
     * new one without automatic saving!
     */
    propertiesPanelOptions?: BpmnPropertiesPanelOptions;

    /**
     * The options to control the appearance of the modeler.
     *
     * CAUTION: Changing `containerId` destroys the editor instance and creates a new one
     * without automatic saving!
     */
    modelerOptions?: BpmnModelerOptions;
}

const useStyles = tss.create(() => ({
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
    const { classes, cx } = useStyles();

    const {
        active,
        xml,
        onEvent,
        className,
        bpmnJsOptions,
        modelerOptions,
        propertiesPanelOptions,
    } = props;

    const [modeler, setModeler] = useState<CustomBpmnJsModeler | undefined>(undefined);

    const modelerContainerRef = useRef<HTMLDivElement | null>(null);
    const propertiesPanelContainerRef = useRef<HTMLDivElement | null>(null);

    const onEventRef = useLatest(onEvent);
    const activeRef = useLatest(active);
    const currentModelerRef = useLatest(modeler);
    const echoesRef = useRef(new EchoTracker());
    /** The XML last imported into (or confirmed as echo by) the current instance. */
    const lastImportRef = useRef<
        { modeler: CustomBpmnJsModeler; xml: string } | undefined
    >(undefined);

    const panelHidden = !!propertiesPanelOptions?.hidden;
    const panelContainerId = propertiesPanelOptions?.containerId;
    const modelerContainerId = modelerOptions?.containerId;

    /**
     * Forwards bpmn-js events to the host. Stable for the lifetime of the component, so
     * neither a new `onEvent` identity nor switching tabs recreates the modeler.
     */
    const handleEvent = useCallback(
        (event: string, data: any) => {
            const emit = onEventRef.current;

            // TODO: Should bpmn-js events only be forwarded if the editor is currently active?
            emit(createBpmnIoEvent(event, data));

            if (!activeRef.current) {
                return;
            }

            if (event === "elementTemplates.errors") {
                emit(
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
            if (event && UI_UPDATE_REQUIRED_EVENTS.includes(event)) {
                emit(createUIUpdateRequiredEvent(true));
            }

            /**
             * If the event should trigger a content saved event, do it.
             */
            if (event && CONTENT_SAVED_EVENT.includes(event)) {
                currentModelerRef.current
                    ?.save()
                    .then(saved => {
                        echoesRef.current.emitted(saved.xml);
                        onEventRef.current(
                            createContentSavedEvent(
                                saved.xml,
                                saved.svg,
                                "diagram.changed",
                            ),
                        );
                    })
                    .catch((e: unknown) => {
                        console.warn("Could not save document", e);
                    });
            }
        },
        [onEventRef, activeRef, currentModelerRef],
    );

    /**
     * Instantiates the modeler and properties panel. The instance lives as long as the
     * component and is only recreated if options that bpmn-js reads on construction change.
     */
    useEffect(() => {
        const modelerContainer = modelerContainerId ?? modelerContainerRef.current;
        if (!modelerContainer) {
            return undefined;
        }

        let instance: CustomBpmnJsModeler;
        try {
            instance = new CustomBpmnJsModeler({
                container: modelerContainer,
                propertiesPanel: panelHidden
                    ? undefined
                    : (panelContainerId ??
                      propertiesPanelContainerRef.current ??
                      undefined),
                bpmnJsOptions: bpmnJsOptions,
            });
        } catch (e) {
            // E.g. a container selector that matches nothing or a broken module in the
            // options. Report it instead of taking down the host application.
            console.error("Could not create the modeler", e);
            onEventRef.current(
                createNotificationEvent(
                    "Could not create the modeler. See console for details.",
                    "error",
                ),
            );
            return undefined;
        }
        instance.registerGlobalEventListener(handleEvent);
        echoesRef.current.reset();
        setModeler(instance);

        return () => {
            instance.unregisterGlobalEventListener(handleEvent);
            instance.destroy();
            setModeler(undefined);
        };
    }, [
        handleEvent,
        onEventRef,
        bpmnJsOptions,
        panelHidden,
        panelContainerId,
        modelerContainerId,
    ]);

    /**
     * Hands the instance to the refs passed by the host.
     */
    const refs = modelerOptions?.refs;
    useEffect(() => {
        refs?.forEach(r => {
            r.current = modeler;
        });
        return () => {
            refs?.forEach(r => {
                r.current = undefined;
            });
        };
    }, [modeler, refs]);

    /**
     * Imports the document XML whenever it changes. Imports are deferred while the editor
     * is hidden, so typing in the XML tab does not re-render the diagram on every key
     * stroke; the latest XML is imported once the editor becomes visible again. The
     * editor's own content coming back from the host is not re-imported.
     */
    useEffect(() => {
        if (!modeler || !active || !xml.trim()) {
            return;
        }

        const last = lastImportRef.current;
        if (last?.modeler === modeler && last.xml === xml) {
            return;
        }
        if (last?.modeler === modeler && echoesRef.current.consume(xml)) {
            lastImportRef.current = { modeler, xml };
            return;
        }

        lastImportRef.current = { modeler, xml };
        echoesRef.current.reset();
        modeler
            .importXML(xml)
            .then(result => {
                const count = result.warnings?.length ?? 0;
                if (count > 0) {
                    console.log("Imported with warnings", result.warnings);
                    onEventRef.current(
                        createNotificationEvent(
                            `Imported with ${count} warning${count === 1 ? "" : "s"}. See console for details.`,
                            "warning",
                        ),
                    );
                }
            })
            .catch((e: unknown) => {
                console.error("Could not import XML", e);
                onEventRef.current(
                    createNotificationEvent(
                        "Could not import changed XML. Is it invalid? See console for details.",
                        "error",
                    ),
                );
            });
    }, [modeler, xml, active, onEventRef]);

    /**
     * Imports the specified element templates whenever they or the instance change.
     */
    const elementTemplates = propertiesPanelOptions?.elementTemplates;
    useEffect(() => {
        if (modeler && !panelHidden) {
            modeler.importElementTemplates(elementTemplates ?? []);
        }
    }, [modeler, panelHidden, elementTemplates]);

    /**
     * Keeps the canvas informed about size changes (divider drag, window resize, being
     * shown again after the XML tab), otherwise zoom and scroll use stale dimensions.
     */
    useEffect(() => {
        const container = modelerContainerRef.current;
        if (!modeler || !container || typeof ResizeObserver === "undefined") {
            return undefined;
        }
        let frame: number | undefined;
        const observer = new ResizeObserver(() => {
            if (frame !== undefined) {
                cancelAnimationFrame(frame);
            }
            frame = requestAnimationFrame(() => {
                frame = undefined;
                if (container.offsetParent !== null) {
                    modeler.resized();
                }
            });
        });
        observer.observe(container);
        return () => {
            observer.disconnect();
            if (frame !== undefined) {
                cancelAnimationFrame(frame);
            }
        };
    }, [modeler]);

    const onPropertiesPanelWidthChanged = useCallback(
        (_first: number, second: number) => {
            onEventRef.current(createPropertiesPanelResizedEvent(second));
        },
        [onEventRef],
    );

    const modelerContainer: ReactNode = modelerOptions?.container ?? (
        <div
            ref={modelerContainerRef}
            className={cx(classes.modeler, modelerOptions?.className)}
        />
    );

    const propertiesPanelContainer: ReactNode = propertiesPanelOptions?.container ?? (
        <div
            ref={propertiesPanelContainerRef}
            className={cx(classes.propertiesPanel, propertiesPanelOptions?.className)}
        />
    );

    if (panelHidden) {
        return (
            <div
                className={cx(classes.modelerOnly, !active && classes.hidden, className)}
            >
                {modelerContainer}
            </div>
        );
    }

    return (
        <ResizablePanels
            className={className}
            active={active}
            firstPanel={modelerContainer}
            secondPanel={propertiesPanelContainer}
            firstPanelSize={modelerOptions?.size}
            secondPanelSize={propertiesPanelOptions?.size}
            onResize={onPropertiesPanelWidthChanged}
        />
    );
};

export default BpmnEditor;
