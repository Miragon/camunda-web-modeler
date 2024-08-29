import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import XmlEditor, { MonacoOptions } from "./editor/XmlEditor";
import { Event, isBpmnIoEvent } from "./events";
import {
    ContentSavedReason,
    createContentSavedEvent,
} from "./events/modeler/ContentSavedEvent";

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
    modelerTabOptions?: ModelerTabOptions;

    /**
     * Options to customize the XML tab.
     */
    xmlTabOptions?: XmlTabOptions;
}

const useStyles = tss.create(() => ({
    root: {
        height: "100%",
        overflow: "hidden",
    },
    modeToggle: {
        position: "absolute",
        left: "32px",
        bottom: "32px",
        backgroundColor: "rgba(255, 255, 255, 0.87)",
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
    const modelerRef = useRef<CustomDmnJsModeler>();

    const [views, setViews] = useState<DmnView[]>([]);
    const [activeView, setActiveView] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (modelerTabOptions?.disabled && !xmlTabOptions?.disabled) {
            setActiveView("xml");
        }
    }, [modelerTabOptions, xmlTabOptions]);

    const saveFile = useCallback(
        async (source: string | undefined, reason: ContentSavedReason) => {
            switch (source) {
                case "xml": {
                    if (monacoRef.current) {
                        const saved = monacoRef.current?.getValue() || "";
                        onEvent(createContentSavedEvent(saved, undefined, reason));
                    }
                    break;
                }
                case undefined: {
                    break;
                }
                default: {
                    if (modelerRef.current) {
                        const saved = await modelerRef.current?.save({ format: true });
                        onEvent(createContentSavedEvent(saved.xml, undefined, reason));
                    }
                    break;
                }
            }
        },
        [onEvent],
    );

    const changeMode = useCallback(
        async (viewId: string | undefined) => {
            if (viewId && activeView !== viewId) {
                // View has been changed from or to XML, save it so the user can reimport it
                if (viewId === "xml" || activeView === "xml") {
                    await saveFile(activeView, "view.changed");
                }

                setActiveView(viewId);

                // View is a dmn-js view, open it
                if (viewId !== "xml") {
                    const view = modelerRef.current
                        ?.getViews()
                        .find(v => v.id === viewId);
                    await (view && modelerRef.current?.open(view));
                }
            }
        },
        [activeView, saveFile],
    );

    const localOnEvent = useCallback(
        (event: Event<any, any>) => {
            if (isBpmnIoEvent(event) && event.event === "views.changed" && event.data) {
                const data = event.data as ViewsChangedEvent;
                setViews(data.views);

                if (!data.activeView) {
                    const initialView = data.views[0];
                    setActiveView(initialView.id);
                    modelerRef.current
                        ?.open(data.views[0])
                        .then(result => {
                            if (result.warnings.length > 0) {
                                console.log(
                                    "Opened initial view with warnings",
                                    result.warnings,
                                );
                            }
                        })
                        .catch((e: any) => {
                            if (e.warnings) {
                                console.log(
                                    "Failed to open initial view with warnings",
                                    e.warnings,
                                    e.error,
                                );
                            }
                        });
                } else {
                    setActiveView(data.activeView.id);
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

    if (!xml) {
        return null;
    }

    return (
        <div className={cx(classes.root, className)}>
            {!modelerTabOptions?.disabled && (
                <DmnEditor
                    xml={xml}
                    active={activeView !== "xml"}
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
                    active={activeView === "xml"}
                    onChanged={onXmlChanged}
                />
            )}

            {!modelerTabOptions?.disabled && (
                <ToggleGroup
                    className={classes.modeToggle}
                    options={[
                        ...views.map(view => ({
                            id: view.id,
                            node: (
                                <>
                                    <span
                                        className={cx({
                                            "dmn-icon-lasso-tool": view.type === "drd",
                                            "dmn-icon-decision-table":
                                                view.type === "decisionTable",
                                            "dmn-icon-literal-expression":
                                                view.type === "literalExpression",
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
                        {
                            id: "xml",
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
                    active={activeView ?? ""}
                />
            )}
        </div>
    );
};

export default DmnModeler;
