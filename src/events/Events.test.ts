import { describe, expect, expectTypeOf, it } from "vitest";

import { createBpmnIoEvent, isBpmnIoEvent } from "./bpmnio/BpmnIoEvents";
import type { ModelerEvent, ModelerEventType } from "./Events";
import {
    ContentSavedEventData,
    createContentSavedEvent,
    isContentSavedEvent,
} from "./modeler/ContentSavedEvent";
import {
    createDmnViewsChangedEvent,
    isDmnViewsChangedEvent,
} from "./modeler/DmnViewsChangedEvent";
import {
    createNotificationEvent,
    isNotificationEvent,
} from "./modeler/NotificationEvent";
import {
    createPropertiesPanelResizedEvent,
    isPropertiesPanelResizedEvent,
} from "./modeler/PropertiesPanelResizedEvent";
import {
    createUIUpdateRequiredEvent,
    isUIUpdateRequiredEvent,
} from "./modeler/UIUpdateRequiredEvent";

const EVENTS = {
    "content.saved": createContentSavedEvent("<xml/>", "<svg/>", "diagram.changed"),
    notification: createNotificationEvent("Saved", "success"),
    "ui.update.required": createUIUpdateRequiredEvent(true),
    "properties.panel.resized": createPropertiesPanelResizedEvent(25),
    "dmn.views.changed": createDmnViewsChangedEvent([], undefined),
    bpmnio: createBpmnIoEvent("commandStack.changed", { trigger: "execute" }),
} satisfies Record<string, ModelerEvent>;

const GUARDS = {
    "content.saved": isContentSavedEvent,
    notification: isNotificationEvent,
    "ui.update.required": isUIUpdateRequiredEvent,
    "properties.panel.resized": isPropertiesPanelResizedEvent,
    "dmn.views.changed": isDmnViewsChangedEvent,
    bpmnio: isBpmnIoEvent,
};

describe("events", () => {
    it.each(Object.entries(EVENTS))(
        "builds %s with its source and name",
        (name, event) => {
            expect(event.source).toBe(name === "bpmnio" ? "bpmnio" : "modeler");
            expect(event.event).toBe(name === "bpmnio" ? "commandStack.changed" : name);
        },
    );

    it.each(Object.entries(GUARDS))("recognizes only %s events", (name, guard) => {
        const matches = Object.entries(EVENTS)
            .filter(([, event]) => guard(event))
            .map(([key]) => key);

        expect(matches).toEqual([name]);
    });

    it("does not mistake a bpmn.io event with the same name for a library event", () => {
        const event = createBpmnIoEvent("content.saved", {});

        expect(isContentSavedEvent(event)).toBe(false);
        expect(isBpmnIoEvent(event)).toBe(true);
    });

    it("types data by source and event name", () => {
        const event = EVENTS["content.saved"] as ModelerEvent;

        if (event.source === "modeler" && event.event === "content.saved") {
            expectTypeOf(event.data).toEqualTypeOf<ContentSavedEventData>();
        }
        if (isBpmnIoEvent(event)) {
            expectTypeOf(event.data).toBeUnknown();
        }
        expectTypeOf<ModelerEventType>().toEqualTypeOf<
            | "content.saved"
            | "notification"
            | "ui.update.required"
            | "properties.panel.resized"
            | "dmn.views.changed"
        >();
    });
});
