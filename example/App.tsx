import React, { useCallback, useState } from "react";

import { BpmnModeler, DmnModeler, Event, isContentSavedEvent } from "../src";
import { EMPTY_BPMN, EMPTY_DMN } from "./diagrams";

type Mode = "bpmn" | "dmn";

const rootStyle: React.CSSProperties = {
    position: "relative",
    height: "100%",
    width: "100%",
};

const toolbarStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 100,
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 8,
};

/**
 * Hands host-level events to browser tests: a test defines `window.__cwmEvents` (e.g.
 * via Playwright's `addInitScript`) and inspects what the host received. bpmn.io's own
 * events are skipped, they are far too many.
 */
const recordEvent = (modeler: Mode, event: Event<any, any>) => {
    const sink = (window as unknown as { __cwmEvents?: unknown[] }).__cwmEvents;
    if (sink && event.source !== "bpmnio") {
        sink.push({
            modeler,
            source: event.source,
            event: event.event,
            data: event.data,
        });
    }
};

/**
 * Playground host (issue #190): a single page that toggles between the real
 * `BpmnModeler` and `DmnModeler` for manual UI/UX testing.
 *
 * Each diagram's XML is held in state and updated on `content.saved` — mirroring
 * the README usage contract — so edits survive switching tabs. Only the active
 * modeler is mounted: this guarantees it initializes while visible (bpmn-js /
 * dmn-js size their canvas to the container and render blank if mounted hidden).
 */
const App: React.FC = () => {
    const [mode, setMode] = useState<Mode>("bpmn");
    const [bpmnXml, setBpmnXml] = useState<string>(EMPTY_BPMN);
    const [dmnXml, setDmnXml] = useState<string>(EMPTY_DMN);

    const onBpmnEvent = useCallback((event: Event<any, any>) => {
        recordEvent("bpmn", event);
        if (isContentSavedEvent(event)) {
            setBpmnXml(event.data.xml);
        }
    }, []);

    const onDmnEvent = useCallback((event: Event<any, any>) => {
        recordEvent("dmn", event);
        if (isContentSavedEvent(event)) {
            setDmnXml(event.data.xml);
        }
    }, []);

    return (
        <div style={rootStyle}>
            <div style={toolbarStyle}>
                <button
                    type="button"
                    disabled={mode === "bpmn"}
                    onClick={() => {
                        setMode("bpmn");
                    }}
                >
                    BPMN
                </button>
                <button
                    type="button"
                    disabled={mode === "dmn"}
                    onClick={() => {
                        setMode("dmn");
                    }}
                >
                    DMN
                </button>
            </div>

            {mode === "bpmn" ? (
                <BpmnModeler xml={bpmnXml} onEvent={onBpmnEvent} />
            ) : (
                <DmnModeler xml={dmnXml} onEvent={onDmnEvent} />
            )}
        </div>
    );
};

export default App;
