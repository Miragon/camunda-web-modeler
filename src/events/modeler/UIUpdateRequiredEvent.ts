import { Event } from "../Events";

const EventName = "ui.update.required";

/**
 * Indicates that something in the modeler has changed so that external UI that depends on modeler
 * state, such as button bars or menus, have to be updated. This event is only triggered for the
 * bpmnjs and dmnjs editors, but not for the XML editor.
 */
interface Data {
    /**
     * Whether the modeler instance that sent the event is currently active.
     */
    isActive: boolean;
}

export const createUIUpdateRequiredEvent = (isActive: boolean): Event<Data> => ({
    source: "modeler",
    event: EventName,
    data: { isActive }
});

export const isUIUpdateRequiredEvent = (event: Event<any>): event is Event<Data> => (
    event.source === "modeler" && event.event === EventName
);
