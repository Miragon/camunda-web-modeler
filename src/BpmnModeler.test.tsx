import React, { act, useCallback, useMemo, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BpmnModeler from "./BpmnModeler";
import { Event } from "./events";

/**
 * Lifecycle tests for BpmnModeler. bpmn-js and Monaco need a real browser, so both are
 * replaced by small fakes that record what the component does with them.
 */

interface FakeEditorState {
    onChange: ((value: string) => void) | undefined;
    value: string | undefined;
}

const { instances, editor } = vi.hoisted(() => {
    const instances: FakeModeler[] = [];
    const editor: FakeEditorState = { onChange: undefined, value: undefined };
    return { instances, editor };
});

interface FakeModeler {
    listeners: ((event: string, data: unknown) => void)[];
    destroyed: boolean;
    xml: string;
    imports: string[];
    templates: unknown[] | undefined;
    fire: (event: string, data?: unknown) => void;
}

vi.mock("./bpmnio/bpmn/CustomBpmnJsModeler", () => {
    class Fake implements FakeModeler {
        listeners: ((event: string, data: unknown) => void)[] = [];
        destroyed = false;
        xml = "";
        imports: string[] = [];
        templates: unknown[] | undefined = undefined;

        constructor() {
            instances.push(this);
        }

        registerGlobalEventListener(listener: (event: string, data: unknown) => void) {
            if (!this.listeners.includes(listener)) {
                this.listeners.push(listener);
            }
        }

        unregisterGlobalEventListener(listener: (event: string, data: unknown) => void) {
            this.listeners = this.listeners.filter(l => l !== listener);
        }

        destroy() {
            this.destroyed = true;
        }

        validate(xml: string) {
            return xml.includes("INVALID")
                ? Promise.reject(new Error("unparsable"))
                : Promise.resolve();
        }

        save() {
            return this.xml
                ? Promise.resolve({ xml: this.xml, svg: "<svg/>" })
                : Promise.reject(new Error("no definitions loaded"));
        }

        async importXML(xml: string) {
            this.imports.push(xml);
            await Promise.resolve();
            if (xml.includes("INVALID")) {
                this.fire("import.done", { error: new Error("unparsable") });
                throw new Error("unparsable");
            }
            this.xml = xml;
            this.fire("import.done", { error: null, warnings: [] });
            return { warnings: [] };
        }

        importElementTemplates(templates: unknown[]) {
            this.templates = templates;
        }

        resized() {
            // The fake has no canvas.
        }

        fire(event: string, data?: unknown) {
            this.listeners.forEach(l => {
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
    for (let i = 0; i < 5; i++) {
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

const button = (label: string) =>
    container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

const click = async (label: string) => {
    await run(() => {
        button(label).click();
    });
    await flush();
};

const saved = () => received.filter(e => e.event === "content.saved");
const notifications = () => received.filter(e => e.event === "notification");

/**
 * A host following the README: memoized onEvent, stores content.saved in state.
 */
const Host: React.FC<{ initial?: string; templates?: unknown[] }> = ({
    initial = "<A/>",
    templates,
}) => {
    const [xml, setXml] = useState(initial);
    const onEvent = useCallback((event: Event<any, any>) => {
        received.push(event);
        if (event.event === "content.saved") {
            setXml(event.data.xml);
        }
    }, []);
    const modelerTabOptions = useMemo(
        () => ({ propertiesPanelOptions: { elementTemplates: templates } }),
        [templates],
    );
    return (
        <BpmnModeler xml={xml} onEvent={onEvent} modelerTabOptions={modelerTabOptions} />
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

describe("BpmnModeler", () => {
    it("keeps the bpmn-js instance when switching to XML and back", async () => {
        await render(<Host />);
        await click("XML");
        await click("Diagram");

        expect(instances).toHaveLength(1);
        expect(instances[0].destroyed).toBe(false);
        expect(button("Diagram").getAttribute("aria-pressed")).toBe("true");
    });

    it("keeps the instance when the host passes a new onEvent on every render", async () => {
        const InlineHost: React.FC<{ renderCount: number }> = () => (
            <BpmnModeler
                xml="<A/>"
                onEvent={e => {
                    received.push(e);
                }}
            />
        );
        await render(<InlineHost renderCount={1} />);
        await render(<InlineHost renderCount={2} />);
        await render(<InlineHost renderCount={3} />);

        expect(instances).toHaveLength(1);
    });

    it("does not report the initial import as a content change", async () => {
        await render(<Host />);

        expect(instances[0].imports).toEqual(["<A/>"]);
        expect(saved()).toEqual([]);
    });

    it("reports user edits and does not re-import its own echo", async () => {
        await render(<Host />);
        const modeler = instances[0];

        modeler.xml = "<A edited/>";
        await run(() => {
            modeler.fire("commandStack.changed");
        });
        await flush();

        expect(saved().map(e => e.data.reason)).toEqual(["diagram.changed"]);
        expect(modeler.imports).toEqual(["<A/>"]);
    });

    it("reports invalid XML from the host as error notification", async () => {
        // An unhandled rejection would fail the run, vitest reports those as errors.
        await render(<Host initial="<A INVALID" />);

        expect(notifications().map(e => e.data.severity)).toEqual(["error"]);
        expect(saved()).toEqual([]);
    });

    it("defers imports while the XML tab is shown and imports once when switching back", async () => {
        await render(<Host />);
        const modeler = instances[0];
        await click("XML");

        await run(() => {
            editor.onChange?.("<B/>");
        });
        await run(() => {
            editor.onChange?.("<BC/>");
        });
        await flush();
        expect(modeler.imports).toEqual(["<A/>"]);

        await click("Diagram");
        expect(modeler.imports).toEqual(["<A/>", "<BC/>"]);
    });

    it("stays in the XML tab if the XML is invalid", async () => {
        await render(<Host />);
        await click("XML");
        await run(() => {
            editor.onChange?.("<A INVALID");
        });
        await click("Diagram");

        expect(button("XML").getAttribute("aria-pressed")).toBe("true");
        expect(notifications().map(e => e.data.severity)).toEqual(["error"]);
        expect(instances[0].imports).toEqual(["<A/>"]);
    });

    it("stays mounted when the XML is cleared", async () => {
        await render(<Host />);
        await click("XML");
        await run(() => {
            editor.onChange?.("");
        });
        await flush();

        expect(container.querySelector('[data-testid="monaco"]')).not.toBeNull();
        expect(instances[0].destroyed).toBe(false);
    });

    it("keeps element templates applied across tab switches", async () => {
        const templates = [{ id: "template" }];
        await render(<Host templates={templates} />);
        await click("XML");
        await click("Diagram");

        expect(instances).toHaveLength(1);
        expect(instances[0].templates).toBe(templates);
    });

    it("calls monacoOptions.props.onMount in addition to filling the refs", async () => {
        const onMount = vi.fn();
        const editorRef: { current: unknown } = { current: null };
        const MonacoHost = () => {
            const xmlTabOptions = useMemo(
                () => ({
                    monacoOptions: { refs: [editorRef as never], props: { onMount } },
                }),
                [],
            );
            return (
                <BpmnModeler
                    xml="<A/>"
                    onEvent={() => undefined}
                    xmlTabOptions={xmlTabOptions}
                />
            );
        };
        await render(<MonacoHost />);
        await click("XML");

        expect(onMount).toHaveBeenCalledTimes(1);
        expect(editorRef.current).not.toBeNull();
    });

    it("does not ping-pong with a host that applies content.saved late", async () => {
        const DelayedHost = () => {
            const [xml, setXml] = useState("<A v=0/>");
            const onEvent = useCallback((event: Event<any, any>) => {
                if (event.event === "content.saved") {
                    const next = event.data.xml as string;
                    setTimeout(() => {
                        setXml(next);
                    }, 10);
                }
            }, []);
            return <BpmnModeler xml={xml} onEvent={onEvent} />;
        };
        await render(<DelayedHost />);
        const modeler = instances[0];

        modeler.xml = "<A v=1/>";
        await run(() => {
            modeler.fire("commandStack.changed");
        });
        modeler.xml = "<A v=2/>";
        await run(() => {
            modeler.fire("commandStack.changed");
        });
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });
        await flush();

        expect(modeler.imports).toEqual(["<A v=0/>"]);
        expect(modeler.xml).toBe("<A v=2/>");
    });
});
