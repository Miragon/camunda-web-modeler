import { describe, expect, it } from "vitest";

import { getEffectiveBounds, resolveSecondSize } from "./resizablePanelsMath";

/**
 * Unit tests for the pure resizer math. They cover the decisions that are easy to get
 * wrong and impossible to exercise via typecheck: the intersected bounds, the clamp,
 * and the collapse/expand threshold around the effective minimum.
 */
describe("getEffectiveBounds", () => {
    it("applies the documented defaults (75/5/95 and 25/5/95)", () => {
        // second min/max are 5/95, first min/max imply 5/95 → intersection is 5/95.
        expect(getEffectiveBounds({}, {})).toEqual({ min: 5, max: 95 });
    });

    it("floors the second panel by the first panel's maximum", () => {
        // first max 80 ⇒ second can never drop below 20.
        const bounds = getEffectiveBounds({ max: 80 }, { min: 5 });
        expect(bounds.min).toBe(20);
    });

    it("caps the second panel by the first panel's minimum", () => {
        // first min 30 ⇒ second can never exceed 70.
        const bounds = getEffectiveBounds({ min: 30 }, { max: 95 });
        expect(bounds.max).toBe(70);
    });

    it("keeps the tighter of the two constraints on each side", () => {
        const bounds = getEffectiveBounds({ min: 10, max: 90 }, { min: 15, max: 85 });
        // second min 15 > (100-90)=10 ⇒ 15; second max 85 < (100-10)=90 ⇒ 85.
        expect(bounds).toEqual({ min: 15, max: 85 });
    });
});

describe("resolveSecondSize", () => {
    const bounds = { min: 5, max: 95 };

    it("passes through a value within bounds", () => {
        expect(resolveSecondSize(40, bounds)).toEqual({ sizePct: 40, collapsed: false });
    });

    it("clamps a value above the maximum", () => {
        expect(resolveSecondSize(120, bounds)).toEqual({
            sizePct: 95,
            collapsed: false,
        });
    });

    it("collapses when dragged below the minimum", () => {
        expect(resolveSecondSize(2, bounds)).toEqual({ sizePct: 0, collapsed: true });
    });

    it("expands from collapsed once back at or above the minimum", () => {
        // The exact minimum is the first non-collapsed size.
        expect(resolveSecondSize(5, bounds)).toEqual({ sizePct: 5, collapsed: false });
    });
});
