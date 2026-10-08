import type { ModelerEvent } from "../Events";

/**
 * Indicates that something in the modeler has changed so that external UI that depends on modeler
 * state, such as button bars or menus, have to be updated. This event is only triggered for the
 * bpmnjs and dmnjs editors, but not for the XML editor.
 */
export interface UIUpdateRequiredEventData {
    /**
     * Whether the modeler instance that sent the event is currently active.
     */
    isActive: boolean;
}

export interface UIUpdateRequiredEvent {
    source: "modeler";
    event: "ui.update.required";
    data: UIUpdateRequiredEventData;
}

export const createUIUpdateRequiredEvent = (
    isActive: boolean,
): UIUpdateRequiredEvent => ({
    source: "modeler",
    event: "ui.update.required",
    data: { isActive },
});

export const isUIUpdateRequiredEvent = (
    event: ModelerEvent,
): event is UIUpdateRequiredEvent =>
    event.source === "modeler" && event.event === "ui.update.required";
