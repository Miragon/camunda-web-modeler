import { describe, expect, it } from "vitest";

import { createContentSavedEvent } from "./ContentSavedEvent";
import { createNotificationEvent, isNotificationEvent } from "./NotificationEvent";

/**
 * Smoke tests for the notification event factory. Like the ContentSavedEvent
 * suite, they exist to keep a second domain factory exercised by the pipeline
 * and to serve as a template for future, richer tests.
 */
describe("NotificationEvent", () => {
    it("builds a well-formed modeler event from its inputs", () => {
        const event = createNotificationEvent("Saved successfully", "success");

        expect(event).toEqual({
            source: "modeler",
            event: "notification",
            data: {
                message: "Saved successfully",
                severity: "success",
            },
        });
    });

    it("recognises its own events and rejects foreign ones", () => {
        const own = createNotificationEvent("Import failed", "error");
        const foreign = createContentSavedEvent("<xml/>", undefined, "xml.changed");

        expect(isNotificationEvent(own)).toBe(true);
        expect(isNotificationEvent(foreign)).toBe(false);
    });
});
