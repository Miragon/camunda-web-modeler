import React, {
    MutableRefObject,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import deepmerge from "deepmerge";
import Editor, { EditorProps, loader, OnChange, OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { tss } from "tss-react";

loader.config({ monaco });

export interface MonacoOptions {
    /**
     * Will receive the reference to the editor instance.
     */
    refs?: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>[];

    /**
     * Additional props to pass to the editor component. They override the defaults defined
     * by this component; `onMount` and `onChange` are called in addition to the internal
     * handlers, and `value` is always the document XML.
     */
    props?: Partial<EditorProps>;

    /**
     * Additional options to pass to the editor component. This will override the defaults defined
     * by this component.
     */
    options?: Partial<monaco.editor.IStandaloneEditorConstructionOptions>;
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
     * The class name applied to the root element of the XML tab.
     */
    className?: string;
}

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
     * The options to pass to the monaco editor.
     */
    monacoOptions?: MonacoOptions;

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
}));

const XmlEditor: React.FC<XmlEditorProps> = props => {
    const { classes, cx } = useStyles();

    const { xml, onChanged, active, monacoOptions, className } = props;

    const [xmlEditorShown, setXmlEditorShown] = useState(false);

    const {
        onMount: userOnMount,
        onChange: userOnChange,
        ...userProps
    } = monacoOptions?.props ?? {};

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
     * Hands the editor to the refs passed by the host.
     */
    const refs = monacoOptions?.refs;
    useEffect(() => {
        refs?.forEach(r => {
            r.current = editor;
        });
        return () => {
            refs?.forEach(r => {
                r.current = null;
            });
        };
    }, [editor, refs]);

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
                monacoOptions?.options ?? {},
            ),
        [monacoOptions?.options],
    );

    /**
     * Only show the editor once it has become active or the editor size will be wrong.
     */
    if (!xmlEditorShown) {
        return null;
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
