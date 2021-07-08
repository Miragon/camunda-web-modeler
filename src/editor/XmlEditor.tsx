import { makeStyles } from "@material-ui/styles";
import MonacoEditor, { MonacoEditorProps, RefEditorInstance } from "@uiw/react-monacoeditor";
import clsx from "clsx";
import deepmerge from "deepmerge";
import * as monaco from "monaco-editor";
import React, { MutableRefObject, useCallback, useEffect, useMemo, useState } from "react";

export interface MonacoOptions {
    /**
     * Will receive the reference to the editor instance, the monaco instance, and the container
     * element.
     */
    ref?: MutableRefObject<RefEditorInstance | null>;

    /**
     * Additional props to pass to the editor component. This will override the defaults defined by
     * this component.
     */
    props?: Partial<MonacoEditorProps>;

    /**
     * Additional options to pass to the editor component. This will override the defaults defined
     * by this compnent.
     */
    options?: Partial<monaco.editor.IStandaloneEditorConstructionOptions>;
}

export interface XmlEditorProps {
    /**
     * The xml to display in the editor.
     */
    xml: string;

    /**
     * Whether this editor is currently active and visible to the user.
     */
    active: boolean;

    /**
     * Callback to execute whenever the diagram's xml changes.
     *
     * @param xml The new xml
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

const useStyles = makeStyles(() => ({
    root: {
        height: "100%",
        "&>div": {
            height: "100%",
            overflow: "hidden"
        }
    },
    hidden: {
        display: "none"
    }
}));

const XmlEditor: React.FC<XmlEditorProps> = props => {
    const classes = useStyles();

    const { xml, onChanged, active, monacoOptions, className } = props;

    const [xmlEditorShown, setXmlEditorShown] = useState(false);

    const onXmlChanged = useCallback((value: string) => {
        if (active) {
            onChanged(value);
        }
    }, [active, onChanged]);

    /**
     * Initializes the editor when it is visible for the first time. If it is shown when it is
     * first mounted, the size is wrong.
     */
    useEffect(() => {
        if (active && !xmlEditorShown) {
            setXmlEditorShown(true);
        }
    }, [xmlEditorShown, active]);

    const options = useMemo(() => deepmerge(
        {
            theme: "vs-light",
            wordWrap: "on",
            wrappingIndent: "deepIndent",
            scrollBeyondLastLine: false,
            minimap: {
                enabled: false
            }
        },
        monacoOptions?.options || {}
    ), [monacoOptions?.options]);

    /**
     * Only show the editor once it has became active or the editor size will be wrong.
     */
    if (!xmlEditorShown) {
        return null;
    }

    return (
        <div className={clsx(classes.root, !active && classes.hidden)}>
            <MonacoEditor
                height=""
                language="xml"
                value={xml}
                options={options}
                className={className}
                onChange={onXmlChanged}
                ref={monacoOptions?.ref}
                {...monacoOptions?.props || {}} />
        </div>
    );
};

export default React.memo(XmlEditor);
