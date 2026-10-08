import React, { useCallback, useEffect, useState } from "react";

import {
    BpmnModeler,
    DmnModeler,
    Event,
    isContentSavedEvent,
    isNotificationEvent,
    NotificationEventData,
} from "../src";
import { EMPTY_BPMN, EMPTY_DMN } from "./diagrams";

type Mode = "bpmn" | "dmn";

const rootStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    fontFamily: "Arial, sans-serif",
};

// A header bar instead of a floating toolbar, so the playground does not cover the
// modeler (e.g. the first XML line or the properties panel header).
const headerStyle: React.CSSProperties = {
    flex: "none",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    borderBottom: "1px solid rgba(0, 0, 0, 0.15)",
    fontSize: 14,
};

const modelerAreaStyle: React.CSSProperties = {
    flex: "1 1 0",
    minHeight: 0,
};

const notificationsStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 100,
    right: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxWidth: 420,
};

const SEVERITY_COLORS: Record<NotificationEventData["severity"], string> = {
    success: "#2e7d32",
    info: "#0277bd",
    warning: "#ed6c02",
    error: "#c62828",
};

interface Notification extends NotificationEventData {
    id: number;
}

let notificationId = 0;

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
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Shows what a host is supposed to surface; the library itself renders none.
    const notify = useCallback((event: Event<any, any>) => {
        if (isNotificationEvent(event)) {
            setNotifications(current => [
                ...current,
                { ...event.data, id: ++notificationId },
            ]);
        }
    }, []);

    useEffect(() => {
        if (notifications.length === 0) {
            return undefined;
        }
        const timer = setTimeout(() => {
            setNotifications(current => current.slice(1));
        }, 6000);
        return () => {
            clearTimeout(timer);
        };
    }, [notifications]);

    const onBpmnEvent = useCallback(
        (event: Event<any, any>) => {
            recordEvent("bpmn", event);
            notify(event);
            if (isContentSavedEvent(event)) {
                setBpmnXml(event.data.xml);
            }
        },
        [notify],
    );

    const onDmnEvent = useCallback(
        (event: Event<any, any>) => {
            recordEvent("dmn", event);
            notify(event);
            if (isContentSavedEvent(event)) {
                setDmnXml(event.data.xml);
            }
        },
        [notify],
    );

    return (
        <div style={rootStyle}>
            <header style={headerStyle}>
                <strong>Playground</strong>
                <div
                    role="group"
                    aria-label="Modeler"
                    style={{ display: "flex", gap: 4 }}
                >
                    {(["bpmn", "dmn"] as const).map(option => (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={mode === option}
                            style={{ fontWeight: mode === option ? "bold" : "normal" }}
                            onClick={() => {
                                setMode(option);
                            }}
                        >
                            {option.toUpperCase()}
                        </button>
                    ))}
                </div>
            </header>

            <main style={modelerAreaStyle}>
                {mode === "bpmn" ? (
                    <BpmnModeler xml={bpmnXml} onEvent={onBpmnEvent} />
                ) : (
                    <DmnModeler xml={dmnXml} onEvent={onDmnEvent} />
                )}
            </main>

            <div style={notificationsStyle} role="status" aria-live="polite">
                {notifications.map(notification => (
                    <div
                        key={notification.id}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 4,
                            color: "#fff",
                            fontSize: 14,
                            backgroundColor: SEVERITY_COLORS[notification.severity],
                        }}
                    >
                        {notification.message}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
