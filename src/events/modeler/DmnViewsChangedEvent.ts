import { DmnView } from "../../bpmnio/dmn/CustomDmnJsModeler";
import type { Event } from "../Events";

const EventName = "dmn.views.changed";

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

export const createDmnViewsChangedEvent = (
    views: DmnView[],
    activeView: DmnView | undefined
): Event<DmnViewsChangedEventData> => ({
    source: "modeler",
    event: EventName,
    data: {
        views,
        activeView
    }
});

export const isDmnViewsChangedEvent = (event: Event<any>): event is Event<DmnViewsChangedEventData> => (
    event.source === "modeler" && event.event === EventName
);
