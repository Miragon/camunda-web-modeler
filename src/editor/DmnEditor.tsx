import React, { useCallback, useEffect, useRef, useState } from "react";
import ResizablePanels from "../components/ResizablePanels";
import CustomDmnJsModeler from "../bpmnio/dmn/CustomDmnJsModeler";
import { createBpmnIoEvent } from "../events/bpmnio/BpmnIoEvents";
import { ModelerEvent } from "../events";
import { createContentSavedEvent } from "../events/modeler/ContentSavedEvent";
import { createDmnViewsChangedEvent } from "../events/modeler/DmnViewsChangedEvent";
import { createNotificationEvent } from "../events/modeler/NotificationEvent";
import { createPropertiesPanelResizedEvent } from "../events/modeler/PropertiesPanelResizedEvent";
import { createUIUpdateRequiredEvent } from "../events/modeler/UIUpdateRequiredEvent";
import { EchoTracker } from "./EchoTracker";
import { useLatest } from "./useLatest";
import type { ModelerClasses, PanelSize, PropertiesPanelOptions } from "../options";
import { tss } from "tss-react";
import type { MutableRef } from "./MutableRef";

/**
 * The events that trigger a UI update required event.
 */
const UI_UPDATE_REQUIRED_EVENTS = [
    "import.done",
    "attach",
    "views.changed",
    "commandStack.changed",
    "selection.changed",
    "elements.changed",
    "directEditing.activate",
    "directEditing.deactivate",
];

/**
 * The events that trigger a content saved event.
 */
const CONTENT_SAVED_EVENT = ["elements.changed"];

export interface DmnEditorProps {
    /**
     * The XML to display in the editor.
     */
    xml: string;

    /**
     * Whether this editor is currently active and visible to the user.
     */
    active: boolean;

    /**
     * The ID of the view to show. If undefined, dmn-js opens its initial view.
     */
    viewId?: string;

    /**
     * Called whenever an event occurs.
     */
    onEvent: (event: ModelerEvent) => void;

    /**
     * The options for dmn-js.
     *
     * CAUTION: A new object creates a new modeler instance without saving.
     */
    dmnJsOptions?: Record<string, any>;

    propertiesPanel?: PropertiesPanelOptions;

    /**
     * The size of the canvas next to the properties panel.
     */
    diagramSize?: PanelSize;

    /**
     * Receives the modeler instance while it exists.
     */
    modelerRef?: MutableRef<CustomDmnJsModeler | undefined>;

    classes?: Pick<ModelerClasses, "diagram" | "canvas" | "propertiesPanel">;
}

const useStyles = tss.create(() => ({
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
    const { classes, cx } = useStyles();

    const {
        xml,
        active,
        viewId,
        onEvent,
        dmnJsOptions,
        propertiesPanel,
        diagramSize,
        modelerRef,
        classes: hostClasses,
    } = props;

    const [modeler, setModeler] = useState<CustomDmnJsModeler | undefined>(undefined);
    // The properties panel only supports the DRD; other views leave it empty.
    const [activeViewType, setActiveViewType] = useState<string | undefined>(undefined);

    const modelerContainerRef = useRef<HTMLDivElement | null>(null);
    const propertiesPanelContainerRef = useRef<HTMLDivElement | null>(null);

    const onEventRef = useLatest(onEvent);
    const activeRef = useLatest(active);
    const viewIdRef = useLatest(viewId);
    const currentModelerRef = useLatest(modeler);
    const echoesRef = useRef(new EchoTracker());
    /** The XML last imported into (or confirmed as echo by) the current instance. */
    const lastImportRef = useRef<
        { modeler: CustomDmnJsModeler; xml: string } | undefined
    >(undefined);
    /**
     * dmn-js clears and reopens views during an import, so imports and view switches
     * must not interleave. Every such operation is chained onto this promise.
     */
    const queueRef = useRef<Promise<void>>(Promise.resolve());
    const enqueue = useCallback((operation: () => Promise<void>) => {
        queueRef.current = queueRef.current.then(operation).catch((e: unknown) => {
            console.error("DMN operation failed", e);
        });
    }, []);

    const panelHidden = !!propertiesPanel?.hidden;
    const panelContainer = propertiesPanel?.container;

    /**
     * Forwards dmn-js events to the host. Stable for the lifetime of the component, so
     * neither a new `onEvent` identity nor switching tabs recreates the modeler.
     */
    const handleEvent = useCallback(
        (event: string, data: any) => {
            const emit = onEventRef.current;

            // TODO: Should dmn-js events only be forwarded if the editor is currently active?
            emit(createBpmnIoEvent(event, data));

            if (!activeRef.current) {
                return;
            }

            if (event === "views.changed") {
                emit(createDmnViewsChangedEvent(data.views, data.activeView));
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
                    ?.save({ format: true })
                    .then(saved => {
                        echoesRef.current.emitted(saved.xml);
                        // TODO: Save SVG (but which viewer?)
                        onEventRef.current(
                            createContentSavedEvent(
                                saved.xml,
                                undefined,
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
     * component and is only recreated if options that dmn-js reads on construction change.
     */
    useEffect(() => {
        const modelerContainer = modelerContainerRef.current;
        if (!modelerContainer) {
            return undefined;
        }

        let instance: CustomDmnJsModeler;
        try {
            instance = new CustomDmnJsModeler({
                container: modelerContainer,
                propertiesPanel: panelHidden
                    ? undefined
                    : (panelContainer ??
                      propertiesPanelContainerRef.current ??
                      undefined),
                dmnJsOptions: dmnJsOptions,
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

        // Every view has its own viewer with its own event bus. Viewers are created
        // lazily on first open, so (re-)register whenever the active view changes. The
        // registration is idempotent. The listener must return nothing: a return value
        // stops the event's propagation in diagram-js.
        const onViewsChanged = (event: { type: string }, data: any) => {
            instance.registerGlobalEventListener(handleEvent);
            if (data?.activeView) {
                setActiveViewType(data.activeView.type);
            }
            handleEvent(event.type, data);
        };
        instance.on("views.changed", onViewsChanged);

        echoesRef.current.reset();
        queueRef.current = Promise.resolve();
        setModeler(instance);

        return () => {
            instance.off("views.changed", onViewsChanged);
            instance.destroy();
            setModeler(undefined);
        };
    }, [handleEvent, onEventRef, dmnJsOptions, panelHidden, panelContainer]);

    /**
     * Hands the instance to the modeler component.
     */
    useEffect(() => {
        if (modelerRef) {
            modelerRef.current = modeler;
        }
        return () => {
            if (modelerRef) {
                modelerRef.current = undefined;
            }
        };
    }, [modeler, modelerRef]);

    /**
     * Opens the requested view if it is not the active one.
     */
    const openRequestedView = useCallback(
        async (instance: CustomDmnJsModeler) => {
            const requested = viewIdRef.current;
            if (!requested || instance.getActiveView()?.id === requested) {
                return;
            }
            const view = instance.getViews().find(v => v.id === requested);
            if (view) {
                await instance.open(view);
            }
        },
        [viewIdRef],
    );

    /**
     * Imports the document XML whenever it changes. Imports are deferred while the editor
     * is hidden, so typing in the XML tab neither re-renders the diagram on every key
     * stroke nor switches the view back; the latest XML is imported once the editor
     * becomes visible again. The editor's own content coming back from the host is not
     * re-imported.
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
        enqueue(async () => {
            try {
                // Opens the previously active view again (or the first one).
                const result = await modeler.import(xml, true);
                const count = result.warnings.length;
                if (count > 0) {
                    console.log("Imported with warnings", result.warnings);
                    onEventRef.current(
                        createNotificationEvent(
                            `Imported with ${count} warning${count === 1 ? "" : "s"}. See console for details.`,
                            "warning",
                        ),
                    );
                }
            } catch (e) {
                console.error("Could not import XML", e);
                onEventRef.current(
                    createNotificationEvent(
                        "Could not import changed XML. Is it invalid? See console for details.",
                        "error",
                    ),
                );
                return;
            }
            await openRequestedView(modeler);
        });
    }, [modeler, xml, active, enqueue, openRequestedView, onEventRef]);

    /**
     * Switches to the requested view.
     */
    useEffect(() => {
        if (modeler && active && viewId) {
            enqueue(() => openRequestedView(modeler));
        }
    }, [modeler, active, viewId, enqueue, openRequestedView]);

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

    const modelerContainer = (
        <div
            ref={modelerContainerRef}
            className={cx(classes.modeler, hostClasses?.canvas)}
        />
    );

    // Without a panel next to the canvas (hidden or rendered into the host's container),
    // only the canvas is shown.
    if (panelHidden || panelContainer !== undefined) {
        return (
            <div
                className={cx(
                    classes.modelerOnly,
                    !active && classes.hidden,
                    hostClasses?.diagram,
                )}
            >
                {modelerContainer}
            </div>
        );
    }

    return (
        <ResizablePanels
            className={hostClasses?.diagram}
            active={active}
            firstPanel={modelerContainer}
            secondPanel={
                <div
                    ref={propertiesPanelContainerRef}
                    className={cx(classes.propertiesPanel, hostClasses?.propertiesPanel)}
                />
            }
            firstPanelSize={diagramSize}
            secondPanelSize={propertiesPanel?.size}
            secondPanelHidden={activeViewType !== undefined && activeViewType !== "drd"}
            onResize={onPropertiesPanelWidthChanged}
        />
    );
};

export default DmnEditor;
