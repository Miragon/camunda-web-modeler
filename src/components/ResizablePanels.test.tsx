import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import ResizablePanels from "./ResizablePanels";

/**
 * Keyboard and button handling of the splitter. Pointer dragging needs real layout
 * (getBoundingClientRect is all zeros in jsdom) and is covered in the playground.
 */
const renderPanels = (initial?: number) => {
    const sizes: number[] = [];
    render(
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
    const separator = screen.getByRole("separator", { name: "Resize properties panel" });
    const panel = document.getElementById(separator.getAttribute("aria-controls")!)!;
    return { sizes, separator, panel };
};

const toggleButton = () => screen.getByRole("button", { name: /properties panel$/ });

describe("ResizablePanels", () => {
    it("exposes its size to assistive technology", () => {
        const { separator, panel } = renderPanels(25);

        expect(separator.getAttribute("aria-valuenow")).toBe("25");
        expect(separator.getAttribute("aria-valuemin")).toBe("0");
        expect(separator.getAttribute("aria-valuemax")).toBe("60");
        expect(separator.getAttribute("aria-valuetext")).toBe("25 %");
        expect(panel).not.toBeNull();
    });

    it("reports the initial size once on mount", () => {
        const { sizes } = renderPanels(25);

        expect(sizes).toEqual([25]);
    });

    it("resizes with the arrow keys, in larger steps with Shift", async () => {
        const { sizes, separator } = renderPanels(25);
        separator.focus();

        await userEvent.keyboard("{ArrowLeft}{Shift>}{ArrowLeft}{/Shift}{ArrowRight}");

        expect(sizes).toEqual([25, 26, 36, 35]);
    });

    it("collapses with Home and reopens at the previous width with ArrowLeft", async () => {
        const { sizes, separator, panel } = renderPanels(25);
        separator.focus();

        await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}{Home}");
        expect(separator.getAttribute("aria-valuetext")).toBe("Collapsed");
        expect(getComputedStyle(panel).visibility).toBe("hidden");
        expect(toggleButton().getAttribute("aria-expanded")).toBe("false");

        await userEvent.keyboard("{ArrowLeft}");
        expect(sizes).toEqual([25, 35, 0, 35]);
        expect(getComputedStyle(panel).visibility).not.toBe("hidden");
    });

    it("toggles with Enter and maximizes with End", async () => {
        const { sizes, separator } = renderPanels(25);
        separator.focus();

        await userEvent.keyboard("{Enter}{Enter}{End}");

        expect(sizes).toEqual([25, 0, 25, 60]);
    });

    it("toggles with the button and keeps the width", async () => {
        const { sizes } = renderPanels(30);

        await userEvent.click(toggleButton());
        expect(toggleButton().getAttribute("aria-label")).toBe("Open properties panel");
        await userEvent.click(toggleButton());

        expect(sizes).toEqual([30, 0, 30]);
    });

    it("clamps an initial size outside the bounds", () => {
        const { sizes } = renderPanels(2);

        expect(sizes).toEqual([10]);
    });
});
