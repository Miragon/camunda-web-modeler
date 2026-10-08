import React, { act, useCallback, useMemo, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DmnModeler from "./DmnModeler";
import { Event } from "./events";

/**
 * Lifecycle tests for DmnModeler. dmn-js and Monaco need a real browser, so both are
 * replaced by small fakes that mimic how dmn-js reports views.
 */

interface FakeView {
    id: string;
    name: string;
    type: string;
}

interface FakeDmn {
    bus: Record<string, ((event: { type: string }, data: unknown) => unknown)[]>;
    globals: ((event: string, data: unknown) => void)[];
    active: FakeView | undefined;
    imports: string[];
    destroyed: boolean;
    xml: string;
    fireViewer: (event: string, data?: unknown) => void;
}

interface FakeEditorState {
    onChange: ((value: string) => void) | undefined;
    value: string | undefined;
}

const { instances, editor } = vi.hoisted(() => {
    const instances: FakeDmn[] = [];
    const editor: FakeEditorState = { onChange: undefined, value: undefined };
    return { instances, editor };
});

vi.mock("./bpmnio/dmn/CustomDmnJsModeler", () => {
    const VIEWS: FakeView[] = [
        { id: "Definitions_1", name: "Definitions", type: "drd" },
        { id: "Decision_1", name: "Decision 1", type: "decisionTable" },
    ];

    class Fake implements FakeDmn {
        bus: Record<string, ((event: { type: string }, data: unknown) => unknown)[]> =
            {};
        globals: ((event: string, data: unknown) => void)[] = [];
        active: FakeView | undefined = undefined;
        imports: string[] = [];
        destroyed = false;
        xml = "";

        constructor() {
            instances.push(this);
        }

        on(event: string, handler: (event: { type: string }, data: unknown) => unknown) {
            (this.bus[event] ??= []).push(handler);
        }

        off(
            event: string,
            handler: (event: { type: string }, data: unknown) => unknown,
        ) {
            this.bus[event] = (this.bus[event] ?? []).filter(h => h !== handler);
        }

        private viewsChanged() {
            (this.bus["views.changed"] ?? []).forEach(h =>
                h({ type: "views.changed" }, { views: VIEWS, activeView: this.active }),
            );
        }

        registerGlobalEventListener(listener: (event: string, data: unknown) => void) {
            if (this.active && !this.globals.includes(listener)) {
                this.globals.push(listener);
            }
        }

        unregisterGlobalEventListener(listener: (event: string, data: unknown) => void) {
            this.globals = this.globals.filter(l => l !== listener);
        }

        getViews() {
            return VIEWS;
        }

        getActiveView() {
            return this.active;
        }

        validate(xml: string) {
            return xml.includes("INVALID")
                ? Promise.reject(new Error("unparsable"))
                : Promise.resolve();
        }

        save() {
            return this.xml
                ? Promise.resolve({ xml: this.xml })
                : Promise.reject(new Error("no definitions loaded"));
        }

        async import(xml: string, open = true) {
            this.imports.push(xml);
            const previous = this.active;
            // Like dmn-js: clear first, which reports no active view.
            this.active = undefined;
            this.viewsChanged();
            await Promise.resolve();
            this.xml = xml;
            if (open) {
                this.active = VIEWS.find(v => v.id === previous?.id) ?? VIEWS[0];
            }
            this.viewsChanged();
            return { warnings: [] };
        }

        async open(view: FakeView) {
            await Promise.resolve();
            this.active = view;
            this.viewsChanged();
            return { warnings: [] };
        }

        resized() {
            // The fake has no canvas.
        }

        destroy() {
            this.destroyed = true;
        }

        fireViewer(event: string, data?: unknown) {
            this.globals.forEach(l => {
                l(event, data);
            });
        }
    }
    return { default: Fake };
});

vi.mock("@monaco-editor/react", () => {
    const FakeEditor = (props: {
        value: string;
        onChange: (value: string) => void;
        onMount: (editor: unknown) => void;
    }) => {
        const { onMount, onChange, value } = props;
        React.useEffect(() => {
            editor.onChange = onChange;
            editor.value = value;
        });
        React.useEffect(() => {
            onMount({ getValue: () => editor.value });
        }, [onMount]);
        return <textarea data-testid="monaco" value={props.value} readOnly />;
    };
    return { loader: { config: () => undefined }, default: FakeEditor };
});

vi.mock("monaco-editor", () => ({}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Runs a synchronous interaction inside act() and lets pending promises settle.
 */
const run = async (interaction: () => void) => {
    await act(async () => {
        interaction();
        await Promise.resolve();
    });
};

const flush = async () => {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await Promise.resolve();
        });
    }
};

let container: HTMLDivElement;
let root: Root;
let received: Event<any, any>[];

const render = async (element: React.ReactElement) => {
    await run(() => {
        root.render(element);
    });
    await flush();
};

const buttons = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>("button"));

const pressed = () =>
    buttons()
        .filter(b => b.getAttribute("aria-pressed") === "true")
        .map(b => b.getAttribute("aria-label") ?? b.textContent)
        .join(",");

const click = async (name: string) => {
    const target = buttons().find(
        b => b.getAttribute("aria-label") === name || b.textContent === name,
    );
    await run(() => {
        target!.click();
    });
    await flush();
};

const saved = () => received.filter(e => e.event === "content.saved");

const Host: React.FC<{ dmnJsOptions?: unknown }> = ({ dmnJsOptions }) => {
    const [xml, setXml] = useState("<A/>");
    const onEvent = useCallback((event: Event<any, any>) => {
        received.push(event);
        if (event.event === "content.saved") {
            setXml(event.data.xml);
        }
    }, []);
    const modelerTabOptions = useMemo(() => ({ dmnJsOptions }), [dmnJsOptions]);
    return (
        <DmnModeler xml={xml} onEvent={onEvent} modelerTabOptions={modelerTabOptions} />
    );
};

beforeEach(() => {
    instances.length = 0;
    received = [];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await run(() => {
        root.unmount();
    });
    container.remove();
});

describe("DmnModeler", () => {
    it("opens the first view on load without reporting a change", async () => {
        await render(<Host />);

        expect(pressed()).toBe("Definitions");
        expect(saved()).toEqual([]);
    });

    it("works in StrictMode", async () => {
        await render(
            <React.StrictMode>
                <Host />
            </React.StrictMode>,
        );

        const live = instances.filter(i => !i.destroyed);
        expect(live).toHaveLength(1);
        expect(live[0].active?.id).toBe("Definitions_1");
    });

    it("keeps the XML tab while typing", async () => {
        await render(<Host />);
        await click("XML");
        await run(() => {
            editor.onChange?.("<A typed/>");
        });
        await flush();

        expect(pressed()).toBe("XML");
        expect(instances[0].imports).toEqual(["<A/>"]);
    });

    it("returns to the last view after the XML tab", async () => {
        await render(<Host />);
        await click("Decision 1");
        await click("XML");
        await run(() => {
            editor.onChange?.("<A typed/>");
        });
        await click("Decision 1");

        expect(pressed()).toBe("Decision 1");
        expect(instances[0].active?.id).toBe("Decision_1");
        expect(instances[0].imports).toEqual(["<A/>", "<A typed/>"]);
    });

    it("stays in the XML tab if the XML is invalid", async () => {
        await render(<Host />);
        await click("XML");
        await run(() => {
            editor.onChange?.("<A INVALID");
        });
        await click("Definitions");

        expect(pressed()).toBe("XML");
        expect(received.filter(e => e.event === "notification")).toHaveLength(1);
    });

    it("reports one content.saved per change, no matter how often views were switched", async () => {
        await render(<Host />);
        for (let i = 0; i < 3; i++) {
            await click("Decision 1");
            await click("Definitions");
            await click("XML");
            await click("Definitions");
        }
        const modeler = instances[0];
        received.length = 0;

        modeler.xml = "<A edited/>";
        await run(() => {
            modeler.fireViewer("elements.changed");
        });
        await flush();

        expect(saved().map(e => e.data.reason)).toEqual(["diagram.changed"]);
        expect(modeler.bus["views.changed"]).toHaveLength(1);
        expect(modeler.imports).toEqual(["<A/>"]);
    });

    it("wires a recreated instance like the first one", async () => {
        const { rerender } = {
            rerender: async (options: unknown) =>
                render(<Host dmnJsOptions={options} />),
        };
        await rerender({ a: 1 });
        await rerender({ a: 2 });

        expect(instances).toHaveLength(2);
        expect(instances[0].destroyed).toBe(true);
        const current = instances[1];
        expect(current.bus["views.changed"]).toHaveLength(1);
        expect(current.active?.id).toBe("Definitions_1");
        expect(current.globals).toHaveLength(1);
    });
});
