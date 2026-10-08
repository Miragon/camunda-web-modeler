import React, { act, createRef, useCallback, useMemo, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BpmnModeler, { BpmnModelerHandle } from "./BpmnModeler";
import { EMPTY_BPMN } from "./emptyDiagrams";
import type { MonacoModule } from "./options";
import { isContentSavedEvent, isNotificationEvent, ModelerEvent } from "./events";

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
    options: FakeOptions;
    fire: (event: string, data?: unknown) => void;
}

interface FakeOptions {
    container: unknown;
    propertiesPanel?: unknown;
    bpmnJsOptions?: { failOnCreate?: boolean };
}

vi.mock("./bpmnio/bpmn/CustomBpmnJsModeler", () => {
    class Fake implements FakeModeler {
        listeners: ((event: string, data: unknown) => void)[] = [];
        destroyed = false;
        xml = "";
        imports: string[] = [];
        templates: unknown[] | undefined = undefined;

        constructor(public options: FakeOptions) {
            if (options.bpmnJsOptions?.failOnCreate) {
                throw new Error("broken module");
            }
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
let received: ModelerEvent[];

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

const saved = () => received.filter(isContentSavedEvent);
const notifications = () => received.filter(isNotificationEvent);

/**
 * A host following the README: memoized onEvent, stores content.saved in state.
 */
const Host: React.FC<{ initial?: string; templates?: Record<string, unknown>[] }> = ({
    initial = "<A/>",
    templates,
}) => {
    const [xml, setXml] = useState(initial);
    const onEvent = useCallback((event: ModelerEvent) => {
        received.push(event);
        if (isContentSavedEvent(event)) {
            setXml(event.data.xml);
        }
    }, []);
    return <BpmnModeler xml={xml} onEvent={onEvent} elementTemplates={templates} />;
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

    it("calls xmlEditor.props.onMount and still exposes the editor", async () => {
        const onMount = vi.fn();
        const handle = createRef<BpmnModelerHandle>();
        const xmlEditor = { props: { onMount } };
        await render(<BpmnModeler ref={handle} xml="<A/>" xmlEditor={xmlEditor} />);
        await click("XML");

        expect(onMount).toHaveBeenCalledTimes(1);
        expect(handle.current?.getXmlEditor()).not.toBeNull();
    });

    it("reports a modeler that cannot be created instead of crashing the host", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const BrokenHost = () => {
            const options = useMemo(() => ({ failOnCreate: true }), []);
            return (
                <BpmnModeler
                    xml="<A/>"
                    onEvent={e => {
                        received.push(e);
                    }}
                    bpmnJsOptions={options}
                />
            );
        };
        await render(<BrokenHost />);

        expect(container.querySelector('[role="group"]')).not.toBeNull();
        expect(notifications().map(e => e.data.severity)).toEqual(["error"]);
        error.mockRestore();
    });

    it("exposes the modeler and saves the shown view through its ref", async () => {
        const handle = createRef<BpmnModelerHandle>();
        await render(<BpmnModeler ref={handle} defaultXml="<A/>" />);
        const modeler = instances[0];

        expect(handle.current?.getModeler()).toBe(modeler);
        await expect(handle.current?.save()).resolves.toEqual({
            xml: "<A/>",
            svg: "<svg/>",
        });

        await click("XML");
        await run(() => {
            editor.onChange?.("<A typed/>");
        });
        await expect(handle.current?.save()).resolves.toEqual({ xml: "<A typed/>" });
    });

    it("keeps track of the document itself in uncontrolled mode", async () => {
        await render(<BpmnModeler defaultXml="<A/>" />);
        const modeler = instances[0];

        modeler.xml = "<A edited/>";
        await run(() => {
            modeler.fire("commandStack.changed");
        });
        await flush();
        await click("XML");

        expect(editor.value).toBe("<A edited/>");
        expect(modeler.imports).toEqual(["<A/>"]);
    });

    it("shows an empty diagram without xml and defaultXml", async () => {
        await render(<BpmnModeler />);

        expect(instances[0].imports).toEqual([EMPTY_BPMN]);
    });

    it("waits for a controlled document to arrive", async () => {
        await render(<BpmnModeler xml="" />);
        expect(container.innerHTML).toBe("");

        await render(<BpmnModeler xml="<A/>" />);
        expect(instances[0].imports).toEqual(["<A/>"]);
    });

    it("renders the properties panel into a host container", async () => {
        const panel = document.createElement("div");
        const options = { container: panel };
        await render(<BpmnModeler xml="<A/>" propertiesPanel={options} />);

        expect(instances[0].options.propertiesPanel).toBe(panel);
        expect(container.querySelector('[role="separator"]')).toBeNull();
    });

    it("applies the class names to the parts", async () => {
        const classes = {
            root: "c-root",
            diagram: "c-diagram",
            canvas: "c-canvas",
            propertiesPanel: "c-panel",
            xmlEditor: "c-xml",
            viewToggle: "c-toggle",
        };
        await render(<BpmnModeler xml="<A/>" classes={classes} />);
        await click("XML");

        const missing = Object.values(classes).filter(
            className => !container.querySelector(`.${className}`),
        );
        expect(missing).toEqual([]);
        expect(instances[0].options.container).toBe(
            container.querySelector(".c-canvas"),
        );
    });

    it("loads Monaco only when the XML editor is shown for the first time", async () => {
        const loadMonaco = vi.fn(() => Promise.resolve({} as MonacoModule));
        const xmlEditor = { monaco: loadMonaco };
        await render(<BpmnModeler xml="<A/>" xmlEditor={xmlEditor} />);
        expect(loadMonaco).not.toHaveBeenCalled();

        await click("XML");
        await click("Diagram");
        await click("XML");

        expect(loadMonaco).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-testid="monaco"]')).not.toBeNull();
    });

    it("never loads Monaco with the XML editor disabled", async () => {
        const loadMonaco = vi.fn(() => Promise.resolve({} as MonacoModule));
        const xmlEditor = { disabled: true, monaco: loadMonaco };
        await render(<BpmnModeler xml="<A/>" xmlEditor={xmlEditor} />);

        expect(loadMonaco).not.toHaveBeenCalled();
        expect(container.querySelector('[role="group"]')).toBeNull();
    });

    it("reports a Monaco that cannot be loaded", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const xmlEditor = { monaco: () => Promise.reject(new Error("offline")) };
        await render(
            <BpmnModeler
                xml="<A/>"
                xmlEditor={xmlEditor}
                onEvent={e => {
                    received.push(e);
                }}
            />,
        );
        await click("XML");

        expect(notifications().map(e => e.data.message)).toEqual([
            "Could not load the XML editor. See console for details.",
        ]);
        expect(container.querySelector('[role="status"]')?.textContent).toBe(
            "The XML editor could not be loaded.",
        );
        error.mockRestore();
    });

    it("does not ping-pong with a host that applies content.saved late", async () => {
        const DelayedHost = () => {
            const [xml, setXml] = useState("<A v=0/>");
            const onEvent = useCallback((event: ModelerEvent) => {
                if (isContentSavedEvent(event)) {
                    const next = event.data.xml;
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
