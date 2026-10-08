import { describe, expect, it } from "vitest";

import { createPropertiesPanelResizedEvent } from "./PropertiesPanelResizedEvent";

describe("PropertiesPanelResizedEvent", () => {
    it("reports the size in percent", () => {
        expect(createPropertiesPanelResizedEvent(25).data).toEqual({ sizePercent: 25 });
    });
});
