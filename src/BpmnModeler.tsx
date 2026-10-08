import React, { useCallback, useMemo, useRef, useState } from "react";
import { tss } from "tss-react";
import * as monaco from "monaco-editor";

import CustomBpmnJsModeler from "./bpmnio/bpmn/CustomBpmnJsModeler";
import SvgIcon from "./components/SvgIcon";
import ToggleGroup from "./components/ToggleGroup";
import BpmnEditor, {
    BpmnModelerOptions,
    BpmnPropertiesPanelOptions,
} from "./editor/BpmnEditor";
import XmlEditor, { MonacoOptions } from "./editor/XmlEditor";
import { Event } from "./events";
import {
    ContentSavedReason,
    createContentSavedEvent,
} from "./events/modeler/ContentSavedEvent";
import { createNotificationEvent } from "./events/modeler/NotificationEvent";

const useStyles = tss.create(() => ({
    root: {
        // Positioning context for the absolutely positioned mode toggle.
        position: "relative",
        height: "100%",
        overflow: "hidden",
    },
    modeToggle: {
        position: "absolute",
        left: "97px",
        bottom: "32px",
        backgroundColor: "rgba(255, 255, 255, 0.87)",
    },
    icon: {
        marginTop: "4px",
    },
}));

export interface ModelerTabOptions {
    /**
     * This option disables the modeler tab.
     */
    disabled?: boolean;

    /**
     * The options passed to the bpmn-js modeler.
     *
     * CAUTION: When this option object is changed, the old editor instance will be destroyed
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

export interface BpmnModelerProps {
    /**
     * The class name applied to the root element.
     */
    className?: string;

    /**
     * The XML to display in the editor.
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

const BpmnModeler: React.FC<BpmnModelerProps> = props => {
    const { classes, cx } = useStyles();

    const { onEvent, xml, modelerTabOptions, xmlTabOptions, className } = props;

    const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
    const modelerRef = useRef<CustomBpmnJsModeler | undefined>(undefined);

    const [selectedMode, setMode] = useState<BpmnViewMode>("bpmn");

    // A disabled tab can never be the visible one, even if it is disabled while active.
    const mode: BpmnViewMode = modelerTabOptions?.disabled
        ? "xml"
        : xmlTabOptions?.disabled
          ? "bpmn"
          : selectedMode;

    // Only the first render waits for XML. Afterwards an empty document (e.g. the user
    // cleared the XML editor) must not unmount the editors and their undo history.
    const [hasLoaded, setHasLoaded] = useState(!!xml);
    if (xml && !hasLoaded) {
        setHasLoaded(true);
    }

    const modelerOptions: BpmnModelerOptions = useMemo(() => {
        if (!modelerTabOptions?.modelerOptions) {
            return {
                refs: [modelerRef],
            };
        }

        return {
            ...modelerTabOptions.modelerOptions,
            refs: [...(modelerTabOptions.modelerOptions.refs ?? []), modelerRef],
        };
    }, [modelerTabOptions]);

    const monacoOptions: MonacoOptions = useMemo(() => {
        if (!xmlTabOptions?.monacoOptions) {
            return {
                refs: [monacoRef],
            };
        }

        return {
            ...xmlTabOptions.monacoOptions,
            refs: [...(xmlTabOptions.monacoOptions.refs ?? []), monacoRef],
        };
    }, [xmlTabOptions]);

    const saveFile = useCallback(
        async (source: BpmnViewMode, reason: ContentSavedReason) => {
            switch (source) {
                case "bpmn": {
                    if (modelerRef.current) {
                        const saved = await modelerRef.current?.save();
                        onEvent(createContentSavedEvent(saved.xml, saved.svg, reason));
                    }
                    break;
                }
                case "xml": {
                    if (monacoRef.current) {
                        //const saved = await monacoRef.current?.editor?.getValue() || "";
                        const saved = monacoRef.current?.getValue() || "";
                        onEvent(createContentSavedEvent(saved, undefined, reason));
                    }
                    break;
                }
            }
        },
        [onEvent],
    );

    const changeMode = useCallback(
        async (value: string) => {
            const bpmnViewMode = value as BpmnViewMode;
            if (bpmnViewMode !== null && bpmnViewMode !== mode) {
                // Don't leave the XML tab with a document the diagram cannot show, the
                // user would end up on an empty canvas without their text.
                if (mode === "xml" && modelerRef.current && monacoRef.current) {
                    try {
                        await modelerRef.current.validate(monacoRef.current.getValue());
                    } catch (e) {
                        console.error("Invalid XML, staying in XML view", e);
                        onEvent(
                            createNotificationEvent(
                                "The XML is invalid. Fix it before switching to the diagram. See console for details.",
                                "error",
                            ),
                        );
                        return;
                    }
                }

                try {
                    await saveFile(mode, "view.changed");
                } catch (e) {
                    // A failed save (e.g. no definitions loaded after an invalid import)
                    // must never block switching, otherwise the user cannot reach the
                    // XML tab anymore to fix the document.
                    console.error("Could not save content before switching view", e);
                    onEvent(
                        createNotificationEvent(
                            "Could not serialize diagram. Switching anyway. See console for details.",
                            "warning",
                        ),
                    );
                }
                setMode(bpmnViewMode);
            }
        },
        [saveFile, mode, onEvent],
    );

    const onXmlChanged = useCallback(
        (value: string) => {
            onEvent(createContentSavedEvent(value, undefined, "xml.changed"));
        },
        [onEvent],
    );

    if (!hasLoaded) {
        return null;
    }

    return (
        <div className={cx(classes.root, className)}>
            {!modelerTabOptions?.disabled && (
                <BpmnEditor
                    xml={xml}
                    active={mode === "bpmn"}
                    onEvent={onEvent}
                    modelerOptions={modelerOptions}
                    propertiesPanelOptions={modelerTabOptions?.propertiesPanelOptions}
                    bpmnJsOptions={modelerTabOptions?.bpmnJsOptions}
                    className={modelerTabOptions?.className}
                />
            )}

            {!xmlTabOptions?.disabled && (
                <XmlEditor
                    xml={xml}
                    active={mode === "xml"}
                    monacoOptions={monacoOptions}
                    onChanged={onXmlChanged}
                />
            )}

            {!xmlTabOptions?.disabled && !modelerTabOptions?.disabled && (
                <ToggleGroup
                    className={classes.modeToggle}
                    label="View"
                    options={[
                        {
                            id: "bpmn",
                            label: "Diagram",
                            node: (
                                <SvgIcon
                                    className={classes.icon}
                                    path="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71
                                        7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41
                                        0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                                />
                            ),
                        },
                        {
                            id: "xml",
                            label: "XML",
                            node: (
                                <SvgIcon
                                    className={classes.icon}
                                    path="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2
                                        0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
                                />
                            ),
                        },
                    ]}
                    onChange={changeMode}
                    active={mode}
                />
            )}
        </div>
    );
};

export default BpmnModeler;
