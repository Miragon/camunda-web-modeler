import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { tss } from "tss-react";
import type * as monaco from "monaco-editor";

import CustomDmnJsModeler, {
    DmnView,
    ViewsChangedEvent,
} from "./bpmnio/dmn/CustomDmnJsModeler";
import SvgIcon from "./components/SvgIcon";
import ToggleGroup from "./components/ToggleGroup";
import DmnEditor from "./editor/DmnEditor";
import XmlEditor from "./editor/XmlEditor";
import { EMPTY_DMN } from "./emptyDiagrams";
import { isBpmnIoEvent, ModelerEvent } from "./events";
import {
    ContentSavedReason,
    createContentSavedEvent,
} from "./events/modeler/ContentSavedEvent";
import { createNotificationEvent } from "./events/modeler/NotificationEvent";
import type { ModelerProps } from "./options";
import { useDocumentXml } from "./useDocumentXml";

export interface DmnModelerProps extends ModelerProps {
    /**
     * The options for dmn-js, merged with what this library needs: modules are
     * registered after the library's (and can override its services), also per view and
     * from `common`; values override the library defaults, moddle extensions are merged
     * by key.
     *
     * CAUTION: A new object creates a new modeler instance without saving, so memoize it.
     */
    dmnJsOptions?: Record<string, any>;
}

/**
 * Imperative access to a {@link DmnModeler}, via its `ref`.
 */
export interface DmnModelerHandle {
    /**
     * The dmn-js instance. While the XML editor is shown, it holds the state from before
     * switching; changes made in the XML editor are imported when switching back.
     */
    getModeler(): CustomDmnJsModeler | undefined;

    /**
     * The Monaco editor, once the XML editor has been shown.
     */
    getXmlEditor(): monaco.editor.IStandaloneCodeEditor | null;

    /**
     * The current document, from the view that is shown.
     */
    save(): Promise<{ xml: string }>;
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

/**
 * A DMN modeler (dmn-js with properties panel for the DRD) with an XML editor.
 */
const DmnModeler = forwardRef<DmnModelerHandle, DmnModelerProps>(
    function DmnModeler(props, ref) {
        const { classes, cx } = useStyles();

        const {
            xml: xmlProp,
            defaultXml,
            onEvent,
            dmnJsOptions,
            diagram,
            propertiesPanel,
            xmlEditor,
            classes: hostClasses,
        } = props;

        const { xml, hasLoaded, handleEvent } = useDocumentXml(
            xmlProp,
            defaultXml,
            EMPTY_DMN,
            onEvent,
        );

        const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
        const modelerRef = useRef<CustomDmnJsModeler | undefined>(undefined);

        const [views, setViews] = useState<DmnView[]>([]);
        // The dmn-js view last shown. Kept while the XML tab is open, so switching back
        // returns to it.
        const [viewId, setViewId] = useState<string | undefined>(undefined);
        const [selectedMode, setSelectedMode] = useState<DmnViewMode>("modeler");

        // A disabled view can never be the visible one, even if it is disabled while shown.
        const mode: DmnViewMode = diagram?.disabled
            ? "xml"
            : xmlEditor?.disabled
              ? "modeler"
              : selectedMode;

        useImperativeHandle(
            ref,
            () => ({
                getModeler: () => modelerRef.current,
                getXmlEditor: () => editorRef.current,
                save: async () => {
                    if (mode === "xml") {
                        return { xml: editorRef.current?.getValue() ?? xml };
                    }
                    return modelerRef.current
                        ? modelerRef.current.save({ format: true })
                        : { xml };
                },
            }),
            [mode, xml],
        );

        const saveFile = useCallback(
            async (source: DmnViewMode, reason: ContentSavedReason) => {
                if (source === "xml") {
                    if (editorRef.current) {
                        const saved = editorRef.current.getValue() || "";
                        handleEvent(createContentSavedEvent(saved, undefined, reason));
                    }
                } else if (modelerRef.current) {
                    const saved = await modelerRef.current.save({ format: true });
                    handleEvent(createContentSavedEvent(saved.xml, undefined, reason));
                }
            },
            [handleEvent],
        );

        const changeMode = useCallback(
            async (optionId: string) => {
                const nextMode: DmnViewMode =
                    optionId === XML_OPTION_ID ? "xml" : "modeler";

                if (nextMode !== mode) {
                    // Don't leave the XML tab with a document the diagram cannot show, the
                    // user would end up on an empty view without their text.
                    if (mode === "xml" && modelerRef.current && editorRef.current) {
                        try {
                            await modelerRef.current.validate(
                                editorRef.current.getValue(),
                            );
                        } catch (e) {
                            console.error("Invalid XML, staying in XML view", e);
                            handleEvent(
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
                        handleEvent(
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
            [mode, saveFile, handleEvent],
        );

        const localOnEvent = useCallback(
            (event: ModelerEvent) => {
                if (
                    isBpmnIoEvent(event) &&
                    event.event === "views.changed" &&
                    event.data
                ) {
                    const data = event.data as ViewsChangedEvent;
                    setViews(data.views);
                    // dmn-js reports no active view while it clears the canvas during an
                    // import; keep the last one in that case.
                    if (data.activeView) {
                        setViewId(data.activeView.id);
                    }
                }
                handleEvent(event);
            },
            [handleEvent],
        );

        const onXmlChanged = useCallback(
            (value: string) => {
                handleEvent(createContentSavedEvent(value, undefined, "xml.changed"));
            },
            [handleEvent],
        );

        // Only offer the toggle if there is something to switch between.
        const toggleOptionCount = views.length + (xmlEditor?.disabled ? 0 : 1);

        if (!hasLoaded) {
            return null;
        }

        return (
            <div className={cx(classes.root, hostClasses?.root)}>
                {!diagram?.disabled && toggleOptionCount > 1 && (
                    <ToggleGroup
                        className={cx(classes.modeToggle, hostClasses?.viewToggle)}
                        label="View"
                        options={[
                            ...views.map(view => ({
                                id: view.id,
                                node: (
                                    <>
                                        <span
                                            aria-hidden="true"
                                            className={cx({
                                                "dmn-icon-lasso-tool":
                                                    view.type === "drd",
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
                            ...(xmlEditor?.disabled
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

                {!diagram?.disabled && (
                    <DmnEditor
                        xml={xml}
                        active={mode === "modeler"}
                        viewId={viewId}
                        onEvent={localOnEvent}
                        dmnJsOptions={dmnJsOptions}
                        propertiesPanel={propertiesPanel}
                        diagramSize={diagram?.size}
                        modelerRef={modelerRef}
                        classes={hostClasses}
                    />
                )}

                {!xmlEditor?.disabled && (
                    <XmlEditor
                        xml={xml}
                        active={mode === "xml"}
                        options={xmlEditor}
                        editorRef={editorRef}
                        onChanged={onXmlChanged}
                        className={hostClasses?.xmlEditor}
                    />
                )}
            </div>
        );
    },
);

export default DmnModeler;
