import { makeStyles } from "@material-ui/styles";
import { Code, Edit } from "@material-ui/icons";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import CustomBpmnJsModeler from "./bpmnio/bpmn/CustomBpmnJsModeler";
import BpmnEditor, { BpmnModelerOptions, BpmnPropertiesPanelOptions } from "./editor/BpmnEditor";
import XmlEditor, { MonacoOptions } from "./editor/XmlEditor";
import { Event } from "./events/Events";
import { ContentSavedReason, createContentSavedEvent } from "./events/modeler/ContentSavedEvent";

const useStyles = makeStyles(() => ({
    root: {
        height: "100%",
        overflow: "hidden"
    },
    modeToggle: {
        position: "absolute",
        left: "97px",
        bottom: "32px",
        backgroundColor: "rgba(255, 255, 255, 0.87)"
    }
}));

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
    bpmnJsOptions?: any;

    /**
     * The options to control the appearance of the properties panel.
     */
    propertiesPanelOptions?: BpmnPropertiesPanelOptions;

    /**
     * The options to control the appearance of the modeler.
     */
    modelerOptions?: BpmnModelerOptions;

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

declare type BpmnViewMode = "bpmn" | "xml";

const BpmnModeler: React.FC<Props> = props => {
    const classes = useStyles();

    const {
        onEvent,
        xml,
        modelerTabOptions,
        xmlTabOptions,
        className
    } = props;

    const modelerRef = useRef<CustomBpmnJsModeler>();

    const [mode, setMode] = useState<BpmnViewMode>("bpmn");

    useEffect(() => {
        if (modelerTabOptions?.disabled && !xmlTabOptions?.disabled) {
            setMode("xml");
        }
    }, [modelerTabOptions, xmlTabOptions]);

    const saveFile = useCallback(async (reason: ContentSavedReason) => {
        if (modelerRef.current) {
            const saved = await modelerRef.current?.save();
            onEvent(createContentSavedEvent(saved.xml, saved.svg, reason));
        }
    }, [onEvent]);

    const changeMode = useCallback(async (_, value) => {
        if (value !== null && value !== mode) {
            await saveFile("view.changed");
            setMode(value);
        }
    }, [saveFile, mode]);

    if (!xml) {
        return null;
    }

    return (
        <div className={clsx(classes.root, className)}>

            {!modelerTabOptions?.disabled && (
                <BpmnEditor
                    xml={xml}
                    active={mode === "bpmn"}
                    onEvent={onEvent}
                    modelerOptions={modelerTabOptions?.modelerOptions}
                    propertiesPanelOptions={modelerTabOptions?.propertiesPanelOptions}
                    bpmnJsOptions={modelerTabOptions?.bpmnJsOptions}
                    className={modelerTabOptions?.className} />
            )}

            {!xmlTabOptions?.disabled && (
                <XmlEditor
                    xml={xml}
                    active={mode === "xml"}
                    onChanged={value => {
                        onEvent(createContentSavedEvent(
                            value,
                            undefined,
                            "xml.changed"
                        ));
                    }} />
            )}

            {!xmlTabOptions?.disabled && !modelerTabOptions?.disabled && (
                <div className={classes.modeToggle}>

                    <ToggleButtonGroup
                        exclusive
                        value={mode}
                        onChange={changeMode}>

                        <ToggleButton
                            disableRipple
                            value="bpmn">

                            <Edit />

                        </ToggleButton>

                        <ToggleButton
                            value="xml"
                            disableRipple>

                            <Code />

                        </ToggleButton>

                    </ToggleButtonGroup>

                </div>
            )}

        </div>
    );
};

export default BpmnModeler;
