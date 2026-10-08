import type { ModelerEvent } from "../Events";

/**
 * Indicates that the width of the properties panel has changed.
 */
export interface PropertiesPanelResizedEventData {
    /**
     * The new width of the properties panel in percent of the editor width; 0 if it has
     * been collapsed. Can be passed back as `size.initial`.
     */
    width: number;
}

export interface PropertiesPanelResizedEvent {
    source: "modeler";
    event: "properties.panel.resized";
    data: PropertiesPanelResizedEventData;
}

export const createPropertiesPanelResizedEvent = (
    width: number,
): PropertiesPanelResizedEvent => ({
    source: "modeler",
    event: "properties.panel.resized",
    data: { width },
});

export const isPropertiesPanelResizedEvent = (
    event: ModelerEvent,
): event is PropertiesPanelResizedEvent =>
    event.source === "modeler" && event.event === "properties.panel.resized";
