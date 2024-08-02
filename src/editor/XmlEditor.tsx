import React, {
    MutableRefObject,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import deepmerge from "deepmerge";
import Editor, { EditorProps, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { tss } from "tss-react";

loader.config({ monaco });

export interface MonacoOptions {
    /**
     * Will receive the reference to the editor instance, the monaco instance, and the container
     * element.
     */
    refs?: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>[];

    /**
     * Additional props to pass to the editor component. This will override the defaults defined by
     * this component.
     */
    props?: Partial<EditorProps>;

    /**
     * Additional options to pass to the editor component. This will override the defaults defined
     * by this component.
     */
    options?: Partial<monaco.editor.IStandaloneEditorConstructionOptions>;
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
     * The class name applied to the host of the modeler.
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

    const onEditorMount = useCallback(
        (editor: monaco.editor.IStandaloneCodeEditor) => {
            monacoOptions?.refs?.forEach(e => {
                e.current = editor;
            });
        },
        [monacoOptions],
    );

    const onXmlChanged = useCallback(
        (value?: string) => {
            if (active) {
                const xmlValue = value ?? xml; // value is empty when the editor initialized
                onChanged(xmlValue);
            }
        },
        [xml, active, onChanged],
    );

    /**
     * Initializes the editor when it is visible for the first time. If it is shown when it is
     * first mounted, the size is wrong.
     */
    useEffect(() => {
        if (active && !xmlEditorShown) {
            setXmlEditorShown(true);
        }
    }, [xmlEditorShown, active]);

    const options = useMemo(
        () =>
            deepmerge(
                {
                    theme: "vs-light",
                    wordWrap: "on",
                    wrappingIndent: "deepIndent",
                    scrollBeyondLastLine: false,
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
        <div className={cx(classes.root, !active && classes.hidden)}>
            <Editor
                height="100%"
                language="xml"
                value={xml}
                options={options}
                className={className}
                onChange={onXmlChanged}
                onMount={onEditorMount}
                {...(monacoOptions?.props ?? {})}
            />
        </div>
    );
};

export default React.memo(XmlEditor);
