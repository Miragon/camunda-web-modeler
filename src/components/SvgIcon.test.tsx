import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SvgIcon from "./SvgIcon";

describe("SvgIcon", () => {
    it("renders the path as a decorative icon", () => {
        const { container } = render(<SvgIcon path="M0 0h24v24H0z" />);
        const svg = container.querySelector("svg")!;

        expect(svg.querySelector("path")!.getAttribute("d")).toBe("M0 0h24v24H0z");
        expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
        expect(svg.getAttribute("aria-hidden")).toBe("true");
        expect(svg.getAttribute("focusable")).toBe("false");
    });
});
