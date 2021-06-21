import { makeStyles } from "@material-ui/styles";
import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import CustomDmnJsModeler, { DmnView } from "./bpmnio/dmn/CustomDmnJsModeler";
import SvgIcon from "./components/SvgIcon";
import ToggleGroup from "./components/ToggleGroup";
import DmnEditor, { DmnModelerOptions, DmnPropertiesPanelOptions } from "./editor/DmnEditor";
import XmlEditor, { MonacoOptions } from "./editor/XmlEditor";
import { isBpmnIoEvent } from "./events/bpmnio/BpmnIoEvents";
import { Event } from "./events/Events";
import { ContentSavedReason, createContentSavedEvent } from "./events/modeler/ContentSavedEvent";

export interface ModelerTabOptions {
    /**
     * This option disables the modeler tab.
     */
    disabled?: boolean;

    /**
     * The options passed to the bpmn-js modeler.
     *
     * CAUTION: When this options object is changed, the old editor instance will be destroyed
     * and a new one will be created without automatic saving!
     */
    dmnJsOptions?: any;

    /**
     * The options to control the appearance of the properties panel.
     */
    propertiesPanelOptions?: DmnPropertiesPanelOptions;

    /**
     * The options to control the appearance of the modeler.
     */
    modelerOptions?: DmnModelerOptions;

    /**
     * The class name to apply to the modeler tab root element.
     */
    className?: string;
}

export interface XmlTabOptions {
    /**
     * This option disables the XML tab.
     */
    disabled?: boolean;

    /**
     * The options to pass to the monaco editor.
     */
    monacoOptions?: MonacoOptions;

    /**
     * The class name applied to the host of the modeler.
     */
    className?: string;
}

interface Props {
    /**
     * The class name applied to the root element.
     */
    className?: string;

    /**
     * The xml to display in the editor.
     */
    xml: string;

    /**
     * Called whenever an event occurs.
     */
    onEvent: (event: Event<any, any>) => void;

    /**
     * Options to customize the modeler tab.
     */
    modelerTabOptions?: ModelerTabOptions;

    /**
     * Options to customize the XML tab.
     */
    xmlTabOptions?: XmlTabOptions;
}

const useStyles = makeStyles(() => ({
    root: {
        height: "100%",
        overflow: "hidden"
    },
    modeToggle: {
        position: "absolute",
        left: "32px",
        bottom: "32px",
        backgroundColor: "rgba(255, 255, 255, 0.87)"
    },
    buttonTitle: {
        marginLeft: "0.5rem",
        textTransform: "none",
        maxWidth: "8rem",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap"
    }
}));

const DmnModeler: React.FC<Props> = props => {
    const classes = useStyles();

    const { onEvent, className, xmlTabOptions, modelerTabOptions, xml } = props;

    const modelerRef = useRef<CustomDmnJsModeler>();

    const [views, setViews] = useState<DmnView[]>([]);
    const [activeView, setActiveView] = useState<string | "xml" | undefined>(undefined);

    useEffect(() => {
        if (modelerTabOptions?.disabled && !xmlTabOptions?.disabled) {
            setActiveView("xml");
        }
    }, [modelerTabOptions, xmlTabOptions]);

    const saveFile = useCallback(async (reason: ContentSavedReason) => {
        if (modelerRef.current) {
            const saved = await modelerRef.current?.save({ format: true });
            // TODO: SVG
            onEvent(createContentSavedEvent(saved.xml, undefined, reason));
        }
    }, [onEvent]);

    const changeMode = useCallback(async value => {
        if (value !== null && value !== activeView) {
            await saveFile("view.changed");
            setActiveView(value);

            // Open view in modeler if it is not "xml"
            if (value !== "xml") {
                modelerRef.current?.open(value);
            }
        }
    }, [activeView, saveFile]);

    const localOnEvent = useCallback((event: Event<any, any>) => {
        if (isBpmnIoEvent(event) && event.event === "views.changed" && event.data) {
            setActiveView(event.data.activeView);
            setViews(event.data.views);
        }
        onEvent(event);
    }, [onEvent]);

    if (!xml) {
        return null;
    }

    return (
        <div className={clsx(classes.root, className)}>

            {!modelerTabOptions?.disabled && (
                <DmnEditor
                    xml={xml}
                    active={activeView === "bpmn"}
                    onEvent={localOnEvent}
                    modelerOptions={modelerTabOptions?.modelerOptions}
                    propertiesPanelOptions={modelerTabOptions?.propertiesPanelOptions}
                    dmnJsOptions={modelerTabOptions?.dmnJsOptions}
                    className={modelerTabOptions?.className} />
            )}

            {!xmlTabOptions?.disabled && (
                <XmlEditor
                    xml={xml}
                    active={activeView === "xml"}
                    onChanged={value => {
                        onEvent(createContentSavedEvent(
                            value,
                            undefined,
                            "xml.changed"
                        ));
                    }} />
            )}

            {!modelerTabOptions?.disabled && (
                <ToggleGroup
                    className={classes.modeToggle}
                    options={[
                        ...views.map(view => ({
                            id: view.id,
                            node: (
                                <>
                                    <span className={clsx({
                                        "dmn-icon-lasso-tool": view.type === "drd",
                                        "dmn-icon-decision-table": view.type === "decisionTable",
                                        "dmn-icon-literal-expression": view.type === "literalExpression"
                                    })} />

                                    <span
                                        title={view.name || "Unnamed"}
                                        className={classes.buttonTitle}>
                                        {view.name || "Unnamed"}
                                    </span>
                                </>
                            )
                        })),
                        {
                            id: "xml",
                            node: (
                                <SvgIcon
                                    path="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2
                                        0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                            )
                        }
                    ]}
                    onChange={changeMode}
                    active={activeView || ""} />
            )}

        </div>
    );
};

export default DmnModeler;
