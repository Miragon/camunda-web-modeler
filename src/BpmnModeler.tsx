import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { tss } from "tss-react";
import type * as monaco from "monaco-editor";
import type { BaseViewerOptions } from "bpmn-js/lib/BaseViewer";

import CustomBpmnJsModeler from "./bpmnio/bpmn/CustomBpmnJsModeler";
import SvgIcon from "./components/SvgIcon";
import ToggleGroup from "./components/ToggleGroup";
import BpmnEditor from "./editor/BpmnEditor";
import XmlEditor from "./editor/XmlEditor";
import { EMPTY_BPMN } from "./emptyDiagrams";
import {
    ContentSavedReason,
    createContentSavedEvent,
} from "./events/modeler/ContentSavedEvent";
import { createNotificationEvent } from "./events/modeler/NotificationEvent";
import type { ModelerProps } from "./options";
import { useDocumentXml } from "./useDocumentXml";

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
        left: "97px",
        bottom: "32px",
        // Many DMN views scroll instead of overflowing the modeler.
        maxWidth: "calc(100% - 97px - 32px)",
        overflowX: "auto",
    },
    icon: {
        marginTop: "4px",
    },
}));

export interface BpmnModelerProps extends ModelerProps {
    /**
     * The options for bpmn-js, merged with what this library needs: modules are
     * registered after the library's (and can override its services), values override
     * the library defaults, moddle extensions are merged by key.
     *
     * CAUTION: A new object creates a new modeler instance without saving, so memoize it.
     */
    bpmnJsOptions?: BaseViewerOptions;

    /**
     * Element templates (Camunda 7 format) offered in the properties panel.
     */
    elementTemplates?: Record<string, unknown>[];
}

/**
 * Imperative access to a {@link BpmnModeler}, via its `ref`.
 */
export interface BpmnModelerHandle {
    /**
     * The bpmn-js instance. While the XML editor is shown, it holds the state from before
     * switching; changes made in the XML editor are imported when switching back.
     */
    getModeler(): CustomBpmnJsModeler | undefined;

    /**
     * The Monaco editor, once the XML editor has been shown.
     */
    getXmlEditor(): monaco.editor.IStandaloneCodeEditor | null;

    /**
     * The current document, from the view that is shown. The SVG is only available in
     * the diagram view.
     */
    save(): Promise<{ xml: string; svg?: string }>;
}

declare type BpmnViewMode = "bpmn" | "xml";

/**
 * A BPMN modeler (bpmn-js with properties panel) with an XML editor.
 */
const BpmnModeler = forwardRef<BpmnModelerHandle, BpmnModelerProps>(
    function BpmnModeler(props, ref) {
        const { classes, cx } = useStyles();

        const {
            xml: xmlProp,
            defaultXml,
            onEvent,
            bpmnJsOptions,
            elementTemplates,
            diagram,
            propertiesPanel,
            xmlEditor,
            classes: hostClasses,
        } = props;

        const { xml, hasLoaded, handleEvent } = useDocumentXml(
            xmlProp,
            defaultXml,
            EMPTY_BPMN,
            onEvent,
        );

        const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
        const modelerRef = useRef<CustomBpmnJsModeler | undefined>(undefined);

        const [selectedMode, setSelectedMode] = useState<BpmnViewMode>("bpmn");

        // A disabled view can never be the visible one, even if it is disabled while
        // shown.
        const mode: BpmnViewMode = diagram?.disabled
            ? "xml"
            : xmlEditor?.disabled
              ? "bpmn"
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
                    return modelerRef.current ? modelerRef.current.save() : { xml };
                },
            }),
            [mode, xml],
        );

        const saveFile = useCallback(
            async (source: BpmnViewMode, reason: ContentSavedReason) => {
                switch (source) {
                    case "bpmn": {
                        if (modelerRef.current) {
                            const saved = await modelerRef.current.save();
                            handleEvent(
                                createContentSavedEvent(saved.xml, saved.svg, reason),
                            );
                        }
                        break;
                    }
                    case "xml": {
                        if (editorRef.current) {
                            const saved = editorRef.current.getValue() || "";
                            handleEvent(
                                createContentSavedEvent(saved, undefined, reason),
                            );
                        }
                        break;
                    }
                }
            },
            [handleEvent],
        );

        const changeMode = useCallback(
            async (value: string) => {
                const bpmnViewMode = value as BpmnViewMode;
                if (bpmnViewMode !== mode) {
                    // Don't leave the XML view with a document the diagram cannot show,
                    // the user would end up on an empty canvas without their text.
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

                    try {
                        await saveFile(mode, "view.changed");
                    } catch (e) {
                        // A failed save (e.g. no definitions loaded after an invalid
                        // import) must never block switching, otherwise the user cannot
                        // reach the XML view anymore to fix the document.
                        console.error("Could not save content before switching view", e);
                        handleEvent(
                            createNotificationEvent(
                                "Could not serialize diagram. Switching anyway. See console for details.",
                                "warning",
                            ),
                        );
                    }
                    setSelectedMode(bpmnViewMode);
                }
            },
            [saveFile, mode, handleEvent],
        );

        const onXmlChanged = useCallback(
            (value: string) => {
                handleEvent(createContentSavedEvent(value, undefined, "xml.changed"));
            },
            [handleEvent],
        );

        const onMonacoLoadError = useCallback(() => {
            handleEvent(
                createNotificationEvent(
                    "Could not load the XML editor. See console for details.",
                    "error",
                ),
            );
        }, [handleEvent]);

        if (!hasLoaded) {
            return null;
        }

        return (
            <div className={cx(classes.root, hostClasses?.root)}>
                {!xmlEditor?.disabled && !diagram?.disabled && (
                    <ToggleGroup
                        className={cx(classes.modeToggle, hostClasses?.viewToggle)}
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

                {!diagram?.disabled && (
                    <BpmnEditor
                        xml={xml}
                        active={mode === "bpmn"}
                        onEvent={handleEvent}
                        bpmnJsOptions={bpmnJsOptions}
                        elementTemplates={elementTemplates}
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
                        onLoadError={onMonacoLoadError}
                        onChanged={onXmlChanged}
                        className={hostClasses?.xmlEditor}
                    />
                )}
            </div>
        );
    },
);

export default BpmnModeler;
