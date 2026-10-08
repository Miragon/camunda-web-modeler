import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ToggleGroup from "./ToggleGroup";

const OPTIONS = [
    { id: "diagram", label: "Diagram", node: <span>icon</span> },
    { id: "xml", label: "XML", node: <span>icon</span> },
];

describe("ToggleGroup", () => {
    it("exposes a labelled group of named buttons", () => {
        render(
            <ToggleGroup
                label="View"
                options={OPTIONS}
                active="diagram"
                onChange={() => Promise.resolve()}
            />,
        );

        const group = screen.getByRole("group", { name: "View" });
        expect(group).toBeDefined();
        expect(screen.getByRole("button", { name: "Diagram" }).title).toBe("Diagram");
        expect(screen.getByRole("button", { name: "XML" }).title).toBe("XML");
    });

    it("marks only the active option as pressed", () => {
        render(
            <ToggleGroup
                options={OPTIONS}
                active="xml"
                onChange={() => Promise.resolve()}
            />,
        );

        expect(
            screen.getByRole("button", { name: "Diagram" }).getAttribute("aria-pressed"),
        ).toBe("false");
        expect(
            screen.getByRole("button", { name: "XML" }).getAttribute("aria-pressed"),
        ).toBe("true");
    });

    it("reports the clicked option", async () => {
        const onChange = vi.fn(() => Promise.resolve());
        render(<ToggleGroup options={OPTIONS} active="diagram" onChange={onChange} />);

        await userEvent.click(screen.getByRole("button", { name: "XML" }));

        expect(onChange).toHaveBeenCalledWith("xml");
    });

    it("logs a failing change instead of leaving an unhandled rejection", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        render(
            <ToggleGroup
                options={OPTIONS}
                active="diagram"
                onChange={() => Promise.reject(new Error("failed"))}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "XML" }));

        expect(error).toHaveBeenCalledWith("Could not change view", expect.any(Error));
        error.mockRestore();
    });
});
