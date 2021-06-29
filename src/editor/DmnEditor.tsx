import { makeStyles } from "@material-ui/styles";
import clsx from "clsx";
import React, {
    MutableRefObject,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import CustomDmnJsModeler, { DmnView } from "../bpmnio/dmn/CustomDmnJsModeler";
import SplitView from "../components/SplitView";
import { createBpmnIoEvent } from "../events/bpmnio/BpmnIoEvents";
import { Event } from "../events/Events";
import { createContentSavedEvent } from "../events/modeler/ContentSavedEvent";
import { createDmnViewsChangedEvent } from "../events/modeler/DmnViewsChangedEvent";
import { createNotificationEvent } from "../events/modeler/NotificationEvent";
import { createPropertiesPanelResizedEvent } from "../events/modeler/PropertiesPanelResizedEvent";
import { createUIUpdateRequiredEvent } from "../events/modeler/UIUpdateRequiredEvent";

/**
 * The events that trigger an UI update required event.
 */
const UI_UPDATE_REQUIRED_EVENTS = [
    "import.done",
    "saveXML.done",
    "attach",
    "views.changed",
    "view.contentChanged",
    "view.selectionChanged",
    "view.directEditingChanged",
    "propertiesPanel.focusin",
    "propertiesPanel.focusout"
];

/**
 * The events that trigger a content saved event.
 */
const CONTENT_SAVED_EVENT = [
    "import.done",
    "view.contentChanged"
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
        // Default "25%"
        initial?: string;
        // Default "95%"
        min?: string;
        // Default "5%"
        max?: string;
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
    ref?: MutableRefObject<CustomDmnJsModeler | undefined>;

    /**
     * The initial, minimum, and maximum sizes of the modeler panel.
     * Can be in % or px each.
     */
    size?: {
        // Default "75%"
        initial?: string;
        // Default "95%"
        min?: string;
        // Default "5%"
        max?: string;
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
        height: "100%"
    },
    propertiesPanel: {
        height: "100%",
        "&>div": {
            height: "100%"
        }
    },
    hidden: {
        display: "none"
    },
    modelerOnly: {
        height: "100%"
    }
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
        className
    } = props;

    const [activeView, setActiveView] = useState<DmnView | undefined>(undefined);
    const [initializeCount, setInitializeCount] = useState(0);
    const ref = useRef<CustomDmnJsModeler | null>(null);

    const handleEvent = useCallback(async (event: string, data: any) => {
        // TODO: Should dmn-js events only be forwarded if the editor is currently active?
        onEvent(createBpmnIoEvent(event, data));

        if (!active) {
            return;
        }

        if (event === "views.changed") {
            setActiveView(data.activeView);
            onEvent(createDmnViewsChangedEvent(
                data.views,
                data.activeView
            ));
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
            try {
                const saved = await ref.current.save({ format: true });
                // TODO: Save SVG (but which viewer?)
                onEvent(createContentSavedEvent(saved.xml, undefined, "diagram.changed"));
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn("Could not save document", e);
            }
        }
    }, [active, onEvent]);
    /**
     * Instantiates the modeler and properties panel. Only happens once on mount.
     */
    useEffect(() => {
        const modeler = new CustomDmnJsModeler({
            container: modelerOptions?.containerId || "#dmnview",
            propertiesPanel: propertiesPanelOptions?.hidden ? undefined : propertiesPanelOptions?.containerId || "#dmnprop",
            dmnJsOptions: dmnJsOptions
        });

        ref.current = modeler;
        if (modelerOptions?.ref) {
            modelerOptions.ref.current = modeler;
        }

        setInitializeCount(cur => cur + 1);

        return () => {
            modeler.destroy();
        };
    }, [
        dmnJsOptions,
        modelerOptions,
        propertiesPanelOptions
    ]);

    /**
     * Imports the specified XML. The following steps are executed:
     *
     * 1. Export the currently loaded XML.
     * 2. Check if it is different from the specified XML.
     * 3. Import the specified XML if it has changed.
     * 4. Show any errors or warnings that occurred during import.
     */
    const importXml = useCallback(async (newXml: string) => {
        if (ref.current) {
            try {
                const currentXml = await ref.current?.save({
                    format: true
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
                const result = await ref.current.import(newXml);
                const count = result.warnings.length;
                if (count > 0) {
                    // eslint-disable-next-line no-console
                    console.log("Imported with warnings", result.warnings);
                    onEvent(createNotificationEvent(
                        `Imported with ${count} warning${count === 1 ? "" : "s"}. See console for details.`,
                        "warning"
                    ));
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error("Could not import XML", e);
                onEvent(createNotificationEvent(
                    "Could not import changed XML. Is it invalid? See console for details.",
                    "error",
                ));
            }
        }
    }, [onEvent]);

    /**
     * Imports the document XML whenever it changes.
     */
    useEffect(() => {
        initializeCount > 0 && importXml(xml);
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

    const modelerContainer: ReactNode = modelerOptions?.container ?? (
        <div
            id="dmnview"
            className={clsx(classes.modeler, modelerOptions?.className)} />
    );

    const propertiesPanelContainer: ReactNode = propertiesPanelOptions?.container ?? (
        <div
            id="dmnprop"
            className={clsx(classes.propertiesPanel, propertiesPanelOptions?.className)} />
    );

    if (propertiesPanelOptions?.hidden) {
        return (
            <div className={clsx(
                !props.active && classes.hidden,
                classes.modelerOnly,
                className
            )}>
                {modelerContainer}
            </div>
        );
    }

    return (
        <SplitView
            className={clsx(!props.active && classes.hidden, className)}
            onResize={newWidth => {
                onEvent(createPropertiesPanelResizedEvent(parseInt(newWidth)));
            }}
            orientation="vertical"
            component1={{
                component: modelerContainer,
                initSize: modelerOptions?.size?.initial || "75%",
                maxSize: modelerOptions?.size?.max || "95%",
                minSize: modelerOptions?.size?.min || "5%"
            }}
            component2={{
                component: propertiesPanelContainer,
                initSize: propertiesPanelOptions?.size?.initial || "25%",
                maxSize: propertiesPanelOptions?.size?.max || "95%",
                minSize: propertiesPanelOptions?.size?.min || "5%"
            }} />
    );
};

export default DmnEditor;
