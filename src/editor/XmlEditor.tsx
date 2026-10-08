import React, { useCallback, useEffect, useMemo, useState } from "react";
import deepmerge from "deepmerge";
import Editor, { loader, OnChange, OnMount } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { tss } from "tss-react";

import type { XmlEditorOptions } from "../options";
import { useLatest } from "./useLatest";
import type { MutableRef } from "./MutableRef";

export interface XmlEditorProps {
    /**
     * The XML to display in the editor.
     */
    xml: string;

    /**
     * Whether this editor is currently active and visible to the user.
     */
    active: boolean;

    /**
     * Callback to execute whenever the diagram's XML changes.
     *
     * @param xml The new XML
     */
    onChanged: (xml: string) => void;

    /**
     * Options for Monaco.
     */
    options?: Pick<XmlEditorOptions, "options" | "props" | "monaco">;

    /**
     * Called if Monaco cannot be loaded.
     */
    onLoadError?: (error: unknown) => void;

    /**
     * Receives the editor instance while it is mounted.
     */
    editorRef?: MutableRef<monaco.editor.IStandaloneCodeEditor | null>;

    /**
     * The class name applied to the root element.
     */
    className?: string;
}

const useStyles = tss.create(() => ({
    root: {
        height: "100%",
        "&>div": {
            height: "100%",
            overflow: "hidden",
        },
    },
    hidden: {
        display: "none",
    },
    loading: {
        padding: "16px",
        fontFamily: "var(--cwm-font-family, Arial, sans-serif)",
        fontSize: "14px",
        color: "rgba(0, 0, 0, 0.6)",
    },
}));

/**
 * Loads the monaco-editor installed next to this library (a peer dependency), in a chunk
 * of its own.
 */
const loadInstalledMonaco = () => import("monaco-editor");

const XmlEditor: React.FC<XmlEditorProps> = props => {
    const { classes, cx } = useStyles();

    const {
        xml,
        onChanged,
        active,
        options: editorOptions,
        editorRef,
        onLoadError,
        className,
    } = props;

    const [xmlEditorShown, setXmlEditorShown] = useState(false);

    const {
        onMount: userOnMount,
        onChange: userOnChange,
        ...userProps
    } = editorOptions?.props ?? {};

    const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(
        null,
    );

    const onEditorMount = useCallback<OnMount>(
        (mountedEditor, monacoInstance) => {
            setEditor(mountedEditor);
            userOnMount?.(mountedEditor, monacoInstance);
        },
        [userOnMount],
    );

    /**
     * Hands the editor to the modeler while it is mounted.
     */
    useEffect(() => {
        if (editorRef) {
            editorRef.current = editor;
        }
        return () => {
            if (editorRef) {
                editorRef.current = null;
            }
        };
    }, [editor, editorRef]);

    const onXmlChanged = useCallback<OnChange>(
        (value, event) => {
            if (active) {
                const xmlValue = value ?? xml; // value is empty when the editor initialized
                onChanged(xmlValue);
            }
            userOnChange?.(value, event);
        },
        [xml, active, onChanged, userOnChange],
    );

    /**
     * Initializes the editor when it is visible for the first time. If it is shown when it is
     * first mounted, the size is wrong.
     */
    if (active && !xmlEditorShown) {
        setXmlEditorShown(true);
    }

    /**
     * Loads Monaco when the editor is shown for the first time: the host's instance or
     * loader if given, the installed monaco-editor otherwise. Until then neither Monaco
     * nor its workers are loaded.
     */
    const monacoSource = editorOptions?.monaco;
    const onLoadErrorRef = useLatest(onLoadError);
    const [monacoState, setMonacoState] = useState<"loading" | "ready" | "failed">(
        "loading",
    );
    useEffect(() => {
        if (!xmlEditorShown) {
            return undefined;
        }
        let cancelled = false;
        const source = monacoSource ?? loadInstalledMonaco;
        Promise.resolve(typeof source === "function" ? source() : source)
            .then(instance => {
                loader.config({ monaco: instance });
                if (!cancelled) {
                    setMonacoState("ready");
                }
            })
            .catch((e: unknown) => {
                console.error("Could not load Monaco", e);
                if (!cancelled) {
                    setMonacoState("failed");
                    onLoadErrorRef.current?.(e);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [xmlEditorShown, monacoSource, onLoadErrorRef]);

    const options = useMemo(
        () =>
            deepmerge(
                {
                    theme: "vs-light",
                    wordWrap: "on",
                    wrappingIndent: "deepIndent",
                    scrollBeyondLastLine: false,
                    // Room to scroll the last lines out from under the view toggle.
                    padding: { bottom: 88 },
                    minimap: {
                        enabled: false,
                    },
                },
                editorOptions?.options ?? {},
            ),
        [editorOptions?.options],
    );

    /**
     * Only show the editor once it has become active or the editor size will be wrong.
     */
    if (!xmlEditorShown) {
        return null;
    }

    if (monacoState !== "ready") {
        return (
            <div className={cx(classes.root, !active && classes.hidden, className)}>
                <div role="status" className={classes.loading}>
                    {monacoState === "loading"
                        ? "Loading XML editor…"
                        : "The XML editor could not be loaded."}
                </div>
            </div>
        );
    }

    return (
        <div className={cx(classes.root, !active && classes.hidden, className)}>
            <Editor
                height="100%"
                language="xml"
                options={options}
                {...userProps}
                value={xml}
                onChange={onXmlChanged}
                onMount={onEditorMount}
            />
        </div>
    );
};

export default React.memo(XmlEditor);
