import { Event } from "../Events";

const EventName = "properties.panel.resized";

/**
 * Indicates that the width of the properties panel has changed.
 */
export interface PropertiesPanelResizedEventData {
    /**
     * The new width of the properties panel in px.
     */
    width: number;
}

export const createPropertiesPanelResizedEvent = (
    width: number
): Event<PropertiesPanelResizedEventData> => ({
    source: "modeler",
    event: EventName,
    data: { width }
});

export const isPropertiesPanelResizedEvent = (
    event: Event<any>
): event is Event<PropertiesPanelResizedEventData> => (
    event.source === "modeler" && event.event === EventName
);
