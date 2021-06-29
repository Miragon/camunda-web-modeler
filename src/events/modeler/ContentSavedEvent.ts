import { Event } from "../Events";

const EventName = "content.saved";

export type ContentSavedReason =
/**
 * The diagram inside the bpmnjs / dmnjs editor has been changed by the user.
 */
    | "diagram.changed"

    /**
     * The XML inside the XML editor has been changed by the user.
     */
    | "xml.changed"

    /**
     * The view has been changed, e.g. from the bpmnjs editor to the XML editor or the other way.
     */
    | "view.changed";

/**
 * Indicates that the content of the model has changed for some reason. The reasons are documented
 * above.
 */
export interface ContentSavedEventData {
    /**
     * The new XML model.
     */
    xml: string;

    /**
     * The new SVG model. Only filled, if the reason for the change is the bpmnjs / dmnjs editor.
     */
    svg: string | undefined,

    /**
     * The reason for the change.
     */
    reason: ContentSavedReason
}

export const createContentSavedEvent = (
    xml: string,
    svg: string | undefined,
    reason: ContentSavedReason
): Event<ContentSavedEventData> => ({
    source: "modeler",
    event: EventName,
    data: {
        xml,
        svg,
        reason
    }
});

export const isContentSavedEvent = (event: Event<any>): event is Event<ContentSavedEventData> => (
    event.source === "modeler" && event.event === EventName
);
