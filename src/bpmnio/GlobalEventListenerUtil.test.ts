import { describe, expect, it, vi } from "vitest";

import GlobalEventListenerUtil from "./GlobalEventListenerUtil";

/**
 * A minimal stand-in for the diagram-js event bus: records internal deliveries.
 */
const createEventBus = () => {
    const internal: string[] = [];
    const bus = {
        fire: (typeOrEvent: string | { type: string }) => {
            internal.push(
                typeof typeOrEvent === "string" ? typeOrEvent : typeOrEvent.type,
            );
            return "result";
        },
    };
    return { bus, internal };
};

describe("GlobalEventListenerUtil", () => {
    it("delivers to bpmn.io before the registered listeners", () => {
        const { bus, internal } = createEventBus();
        const util = new GlobalEventListenerUtil(bus);
        const seen: string[] = [];
        util.on(type => {
            seen.push(`${type} after ${internal.length} internal`);
        });

        expect(bus.fire("commandStack.changed")).toBe("result");
        expect(seen).toEqual(["commandStack.changed after 1 internal"]);
    });

    it("keeps bpmn.io working if a listener throws", () => {
        const { bus, internal } = createEventBus();
        const util = new GlobalEventListenerUtil(bus);
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const second = vi.fn();
        util.on(() => {
            throw new Error("host failure");
        });
        util.on(second);

        bus.fire("commandStack.changed");

        expect(internal).toEqual(["commandStack.changed"]);
        expect(second).toHaveBeenCalledOnce();
        expect(error).toHaveBeenCalledOnce();
        error.mockRestore();
    });

    it("reports the event name for object-style fire calls", () => {
        const { bus } = createEventBus();
        const util = new GlobalEventListenerUtil(bus);
        const listener = vi.fn();
        util.on(listener);

        const event = { type: "contextPad.getProviders", providers: [] };
        (bus.fire as (event: unknown) => unknown)(event);

        expect(listener).toHaveBeenCalledWith("contextPad.getProviders", event);
    });
});
