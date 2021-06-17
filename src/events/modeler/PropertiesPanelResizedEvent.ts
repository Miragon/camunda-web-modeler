import { Event } from "../Events";

const EventName = "properties.panel.resized";

/**
 * Indicates that the width of the properties panel has changed.
 */
interface Data {
    /**
     * The new width of the properties panel in px.
     */
    width: number;
}

export const createPropertiesPanelResizedEvent = (width: number): Event<Data> => ({
    source: "modeler",
    event: EventName,
    data: { width }
});

export const isPropertiesPanelResizedEvent = (event: Event<any>): event is Event<Data> => (
    event.source === "modeler" && event.event === EventName
);
