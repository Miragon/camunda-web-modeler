import React, { useCallback, useMemo, useRef, useState } from "react";
import { tss } from "tss-react";
import * as monaco from "monaco-editor";

import CustomDmnJsModeler, {
    DmnView,
    ViewsChangedEvent,
} from "./bpmnio/dmn/CustomDmnJsModeler";
import SvgIcon from "./components/SvgIcon";
import ToggleGroup from "./components/ToggleGroup";
import DmnEditor, {
    DmnModelerOptions,
    DmnPropertiesPanelOptions,
} from "./editor/DmnEditor";
import XmlEditor, { MonacoOptions, XmlTabOptions } from "./editor/XmlEditor";
import { Event, isBpmnIoEvent } from "./events";
import {
    ContentSavedReason,
    createContentSavedEvent,
} from "./events/modeler/ContentSavedEvent";
import { createNotificationEvent } from "./events/modeler/NotificationEvent";

export interface DmnModelerTabOptions {
    /**
     * This option disables the modeler tab.
     */
    disabled?: boolean;

    /**
     * The options passed to the dmn-js modeler.
     *
     * CAUTION: When this option object is changed, the old editor instance will be destroyed
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

export interface DmnModelerProps {
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
    modelerTabOptions?: DmnModelerTabOptions;

    /**
     * Options to customize the XML tab.
     */
    xmlTabOptions?: XmlTabOptions;
}

declare type DmnViewMode = "modeler" | "xml";

/**
 * Toggle option ID of the XML tab. "#" is not allowed in XML names, so it cannot collide
 * with the ID of a DMN element (and thus of a view).
 */
const XML_OPTION_ID = "#xml";

const useStyles = tss.create(() => ({
    root: {
        // Positioning context for the absolutely positioned mode toggle.
        position: "relative",
        height: "100%",
        overflow: "hidden",
    },
    modeToggle: {
        position: "absolute",
        // Rendered before the editors (tab order), so it needs to be lifted above them.
        zIndex: 10,
        left: "32px",
        bottom: "32px",
        // Many DMN views scroll instead of overflowing the modeler.
        maxWidth: "calc(100% - 32px - 32px)",
        overflowX: "auto",
    },
    buttonTitle: {
        marginLeft: "0.5rem",
        textTransform: "none",
        maxWidth: "8rem",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
    },
    icon: {
        marginTop: "4px",
    },
}));

const DmnModeler: React.FC<DmnModelerProps> = props => {
    const { classes, cx } = useStyles();

    const { onEvent, className, xmlTabOptions, modelerTabOptions, xml } = props;

    const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
    const modelerRef = useRef<CustomDmnJsModeler | undefined>(undefined);

    const [views, setViews] = useState<DmnView[]>([]);
    // The dmn-js view last shown. Kept while the XML tab is open, so switching back
    // returns to it.
    const [viewId, setViewId] = useState<string | undefined>(undefined);
    const [selectedMode, setSelectedMode] = useState<DmnViewMode>("modeler");

    // A disabled tab can never be the visible one, even if it is disabled while active.
    const mode: DmnViewMode = modelerTabOptions?.disabled
        ? "xml"
        : xmlTabOptions?.disabled
          ? "modeler"
          : selectedMode;

    // Only the first render waits for XML. Afterwards an empty document (e.g. the user
    // cleared the XML editor) must not unmount the editors and their undo history.
    const [hasLoaded, setHasLoaded] = useState(!!xml);
    if (xml && !hasLoaded) {
        setHasLoaded(true);
    }

    const saveFile = useCallback(
        async (source: DmnViewMode, reason: ContentSavedReason) => {
            if (source === "xml") {
                if (monacoRef.current) {
                    const saved = monacoRef.current.getValue() || "";
                    onEvent(createContentSavedEvent(saved, undefined, reason));
                }
            } else if (modelerRef.current) {
                const saved = await modelerRef.current.save({ format: true });
                onEvent(createContentSavedEvent(saved.xml, undefined, reason));
            }
        },
        [onEvent],
    );

    const changeMode = useCallback(
        async (optionId: string) => {
            const nextMode: DmnViewMode = optionId === XML_OPTION_ID ? "xml" : "modeler";

            if (nextMode !== mode) {
                // Don't leave the XML tab with a document the diagram cannot show, the
                // user would end up on an empty view without their text.
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

                // Save so the other view starts with the latest content.
                try {
                    await saveFile(mode, "view.changed");
                } catch (e) {
                    // Never block switching on a failed save, otherwise the user may
                    // be unable to reach the XML tab to fix the document.
                    console.error("Could not save content before switching view", e);
                    onEvent(
                        createNotificationEvent(
                            "Could not serialize diagram. Switching anyway. See console for details.",
                            "warning",
                        ),
                    );
                }
                setSelectedMode(nextMode);
            }

            // DmnEditor opens the requested view once it is visible.
            if (nextMode === "modeler") {
                setViewId(optionId);
            }
        },
        [mode, saveFile, onEvent],
    );

    const localOnEvent = useCallback(
        (event: Event<any, any>) => {
            if (isBpmnIoEvent(event) && event.event === "views.changed" && event.data) {
                const data = event.data as ViewsChangedEvent;
                setViews(data.views);
                // dmn-js reports no active view while it clears the canvas during an
                // import; keep the last one in that case.
                if (data.activeView) {
                    setViewId(data.activeView.id);
                }
            }
            onEvent(event);
        },
        [onEvent],
    );

    const onXmlChanged = useCallback(
        (value: string) => {
            onEvent(createContentSavedEvent(value, undefined, "xml.changed"));
        },
        [onEvent],
    );

    const modelerOptions: DmnModelerOptions = useMemo(() => {
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

    // Only offer the toggle if there is something to switch between.
    const toggleOptionCount = views.length + (xmlTabOptions?.disabled ? 0 : 1);

    if (!hasLoaded) {
        return null;
    }

    return (
        <div className={cx(classes.root, className)}>
            {!modelerTabOptions?.disabled && toggleOptionCount > 1 && (
                <ToggleGroup
                    className={classes.modeToggle}
                    label="View"
                    options={[
                        ...views.map(view => ({
                            id: view.id,
                            node: (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className={cx({
                                            "dmn-icon-lasso-tool": view.type === "drd",
                                            "dmn-icon-decision-table":
                                                view.type === "decisionTable",
                                            "dmn-icon-literal-expression":
                                                view.type === "literalExpression",
                                            "dmn-icon-business-knowledge":
                                                view.type === "boxedExpression",
                                        })}
                                    />

                                    <span
                                        title={view.name || "Unnamed"}
                                        className={classes.buttonTitle}
                                    >
                                        {view.name || "Unnamed"}
                                    </span>
                                </>
                            ),
                        })),
                        ...(xmlTabOptions?.disabled
                            ? []
                            : [
                                  {
                                      id: XML_OPTION_ID,
                                      label: "XML",
                                      node: (
                                          <SvgIcon
                                              className={classes.icon}
                                              path="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2
                                        0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
                                          />
                                      ),
                                  },
                              ]),
                    ]}
                    onChange={changeMode}
                    active={mode === "xml" ? XML_OPTION_ID : (viewId ?? "")}
                />
            )}

            {!modelerTabOptions?.disabled && (
                <DmnEditor
                    xml={xml}
                    active={mode === "modeler"}
                    viewId={viewId}
                    onEvent={localOnEvent}
                    modelerOptions={modelerOptions}
                    propertiesPanelOptions={modelerTabOptions?.propertiesPanelOptions}
                    dmnJsOptions={modelerTabOptions?.dmnJsOptions}
                    className={modelerTabOptions?.className}
                />
            )}

            {!xmlTabOptions?.disabled && (
                <XmlEditor
                    xml={xml}
                    monacoOptions={monacoOptions}
                    active={mode === "xml"}
                    onChanged={onXmlChanged}
                    className={xmlTabOptions?.className}
                />
            )}
        </div>
    );
};

export default DmnModeler;
