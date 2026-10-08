import { DmnView } from "../../bpmnio/dmn/CustomDmnJsModeler";
import type { ModelerEvent } from "../Events";

/**
 * Indicates that the views available or the selected view in the DMN editor have changed.
 */
export interface DmnViewsChangedEventData {
    /**
     * The list of all available views.
     */
    views: DmnView[];

    /**
     * The currently active view.
     */
    activeView: DmnView | undefined;
}

export interface DmnViewsChangedEvent {
    source: "modeler";
    event: "dmn.views.changed";
    data: DmnViewsChangedEventData;
}

export const createDmnViewsChangedEvent = (
    views: DmnView[],
    activeView: DmnView | undefined,
): DmnViewsChangedEvent => ({
    source: "modeler",
    event: "dmn.views.changed",
    data: {
        views,
        activeView,
    },
});

export const isDmnViewsChangedEvent = (
    event: ModelerEvent,
): event is DmnViewsChangedEvent =>
    event.source === "modeler" && event.event === "dmn.views.changed";
