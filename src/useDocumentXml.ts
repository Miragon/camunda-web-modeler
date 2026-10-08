import { useCallback, useState } from "react";

import { isContentSavedEvent, ModelerEvent } from "./events";
import { useLatest } from "./editor/useLatest";

/**
 * Resolves the document of a modeler from its `xml` (controlled) or `defaultXml`
 * (uncontrolled) prop.
 *
 * In uncontrolled mode the modeler keeps the latest content itself, taken from the
 * `content.saved` events that also go to the host.
 *
 * @param xml The controlled document
 * @param defaultXml The initial document in uncontrolled mode
 * @param emptyXml The document if neither is given
 * @param onEvent The host's event callback
 */
export const useDocumentXml = (
    xml: string | undefined,
    defaultXml: string | undefined,
    emptyXml: string,
    onEvent: ((event: ModelerEvent) => void) | undefined,
) => {
    const controlled = xml !== undefined;
    const [internalXml, setInternalXml] = useState(() => defaultXml ?? emptyXml);
    const current = controlled ? xml : internalXml;

    // Only the first render waits for content (a controlled host may still be loading it).
    // Afterwards an empty document (e.g. the user cleared the XML editor) must not
    // unmount the editors and their undo history.
    const [hasLoaded, setHasLoaded] = useState(current !== "");
    if (current !== "" && !hasLoaded) {
        setHasLoaded(true);
    }

    const controlledRef = useLatest(controlled);
    const onEventRef = useLatest(onEvent);
    const handleEvent = useCallback(
        (event: ModelerEvent) => {
            if (!controlledRef.current && isContentSavedEvent(event)) {
                setInternalXml(event.data.xml);
            }
            onEventRef.current?.(event);
        },
        [controlledRef, onEventRef],
    );

    return { xml: current, hasLoaded, handleEvent };
};
