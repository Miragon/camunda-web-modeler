import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ResizablePanels from "./ResizablePanels";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let sizes: number[];

const render = async (initial?: number) => {
    await act(async () => {
        root.render(
            <ResizablePanels
                active
                firstPanel={<div />}
                secondPanel={<button type="button">inside panel</button>}
                secondPanelSize={{ initial, min: 10, max: 60 }}
                onResize={(_first, second) => {
                    sizes.push(second);
                }}
            />,
        );
        await Promise.resolve();
    });
};

const separator = () => container.querySelector<HTMLElement>('[role="separator"]')!;
const toggle = () =>
    container.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
const panel = () => document.getElementById(separator().getAttribute("aria-controls")!)!;

const press = async (key: string, shiftKey = false) => {
    await act(async () => {
        separator().dispatchEvent(
            new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }),
        );
        await Promise.resolve();
    });
};

beforeEach(() => {
    sizes = [];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
        await Promise.resolve();
    });
    container.remove();
});

describe("ResizablePanels", () => {
    it("exposes its size to assistive technology", async () => {
        await render(25);

        expect(separator().getAttribute("aria-valuenow")).toBe("25");
        expect(separator().getAttribute("aria-valuemax")).toBe("60");
        expect(separator().getAttribute("aria-label")).toBe("Resize properties panel");
        expect(panel()).not.toBeNull();
    });

    it("resizes with the arrow keys, in larger steps with Shift", async () => {
        await render(25);
        await press("ArrowLeft");
        await press("ArrowLeft", true);
        await press("ArrowRight");

        expect(sizes).toEqual([25, 26, 36, 35]);
    });

    it("collapses with Home and reopens at the previous width with ArrowLeft", async () => {
        await render(25);
        await press("ArrowLeft", true);
        await press("Home");

        expect(separator().getAttribute("aria-valuetext")).toBe("Collapsed");
        expect(getComputedStyle(panel()).visibility).toBe("hidden");
        expect(toggle().getAttribute("aria-expanded")).toBe("false");

        await press("ArrowLeft");
        expect(sizes).toEqual([25, 35, 0, 35]);
        expect(getComputedStyle(panel()).visibility).not.toBe("hidden");
    });

    it("toggles with Enter and maximizes with End", async () => {
        await render(25);
        await press("Enter");
        await press("Enter");
        await press("End");

        expect(sizes).toEqual([25, 0, 25, 60]);
    });

    it("toggles with the button and keeps the width", async () => {
        await render(30);
        await act(async () => {
            toggle().click();
            await Promise.resolve();
        });
        await act(async () => {
            toggle().click();
            await Promise.resolve();
        });

        expect(sizes).toEqual([30, 0, 30]);
    });

    it("clamps an initial size outside the bounds", async () => {
        await render(2);

        expect(sizes).toEqual([10]);
    });
});
