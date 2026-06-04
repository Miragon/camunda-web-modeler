import { describe, expect, it } from "vitest";

import { createContentSavedEvent, isContentSavedEvent } from "./ContentSavedEvent";
import { createNotificationEvent } from "./NotificationEvent";

/**
 * Smoke tests for the modeler event factories. They are intentionally tiny: the
 * point is to prove the Vitest pipeline runs and type-checks against the domain
 * model, not to exhaustively cover behaviour. They double as a template for the
 * richer tests that will follow.
 */
describe("ContentSavedEvent", () => {
    it("builds a well-formed modeler event from its inputs", () => {
        const event = createContentSavedEvent("<xml/>", "<svg/>", "diagram.changed");

        expect(event).toEqual({
            source: "modeler",
            event: "content.saved",
            data: {
                xml: "<xml/>",
                svg: "<svg/>",
                reason: "diagram.changed",
            },
        });
    });

    it("recognises its own events and rejects foreign ones", () => {
        const own = createContentSavedEvent("<xml/>", undefined, "xml.changed");
        const foreign = createNotificationEvent("done", "success");

        expect(isContentSavedEvent(own)).toBe(true);
        expect(isContentSavedEvent(foreign)).toBe(false);
    });
});
