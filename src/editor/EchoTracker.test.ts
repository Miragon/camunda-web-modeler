import { describe, expect, it } from "vitest";

import { EchoTracker } from "./EchoTracker";

describe("EchoTracker", () => {
    it("recognizes emitted XML once", () => {
        const tracker = new EchoTracker();
        tracker.emitted("a");
        expect(tracker.consume("a")).toBe(true);
        expect(tracker.consume("a")).toBe(false);
    });

    it("drops older entries when a newer echo arrives", () => {
        const tracker = new EchoTracker();
        tracker.emitted("v1");
        tracker.emitted("v2");
        expect(tracker.consume("v2")).toBe(true);
        // A host resetting to v1 afterwards is a deliberate change, not an echo.
        expect(tracker.consume("v1")).toBe(false);
    });

    it("recognizes delayed echoes of older versions", () => {
        const tracker = new EchoTracker();
        tracker.emitted("v1");
        tracker.emitted("v2");
        expect(tracker.consume("v1")).toBe(true);
        expect(tracker.consume("v2")).toBe(true);
    });

    it("keeps only the most recent entries", () => {
        const tracker = new EchoTracker(2);
        tracker.emitted("v1");
        tracker.emitted("v2");
        tracker.emitted("v3");
        expect(tracker.consume("v1")).toBe(false);
        expect(tracker.consume("v3")).toBe(true);
    });

    it("forgets everything on reset", () => {
        const tracker = new EchoTracker();
        tracker.emitted("a");
        tracker.reset();
        expect(tracker.consume("a")).toBe(false);
    });
});
