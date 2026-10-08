import type { ModelerEvent } from "../Events";

export type ContentSavedReason =
    /**
     * The diagram inside the bpmnjs / dmnjs editor has been changed by the user.
     */
    | "diagram.changed"

    /**
     * The user has changed the XML inside the XML editor.
     */
    | "xml.changed"

    /**
     * The view has been changed, e.g., from the bpmnjs editor to the XML editor or the other way.
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
     * The new SVG model. Only filled by the BPMN modeler, for changes made in the diagram.
     */
    svg: string | undefined;

    /**
     * The reason for the change.
     */
    reason: ContentSavedReason;
}

export interface ContentSavedEvent {
    source: "modeler";
    event: "content.saved";
    data: ContentSavedEventData;
}

export const createContentSavedEvent = (
    xml: string,
    svg: string | undefined,
    reason: ContentSavedReason,
): ContentSavedEvent => ({
    source: "modeler",
    event: "content.saved",
    data: {
        xml,
        svg,
        reason,
    },
});

export const isContentSavedEvent = (event: ModelerEvent): event is ContentSavedEvent =>
    event.source === "modeler" && event.event === "content.saved";
