/**
 * Pure layout math for {@link ResizablePanels}. Extracted from the component so the
 * non-trivial clamp/collapse decisions can be unit-tested without a DOM (SRP). The
 * component owns the React state and pointer wiring; this module owns the numbers.
 */

/**
 * The resolved size constraints of a single panel, in percentages of the container.
 */
export interface PanelSize {
    /** Initial size in % (defaults applied by the caller). */
    initial?: number;
    /** Minimum size in %. */
    min?: number;
    /** Maximum size in %. */
    max?: number;
}

/** The effective lower/upper bounds (in %) the second panel may occupy. */
export interface Bounds {
    min: number;
    max: number;
}

/** The outcome of resolving a raw drag position into a concrete panel size. */
export interface ResolvedSize {
    /** The clamped size in %. Zero when collapsed. */
    sizePct: number;
    /** Whether the second panel collapsed (dropped below its effective minimum). */
    collapsed: boolean;
}

/**
 * Computes the range the second (properties) panel may occupy. Because the first
 * panel flexes to `100 - secondPct`, the second panel's own min/max alone are not
 * enough: we must intersect them with the bounds implied by the first panel so that
 * BOTH panels stay inside their configured limits. A first-panel min of 5 caps the
 * second at 95; a first-panel max of 95 floors the second at 5, and so on.
 */
export const getEffectiveBounds = (first: PanelSize, second: PanelSize): Bounds => {
    const firstMin = first.min ?? 5;
    const firstMax = first.max ?? 95;
    const secondMin = second.min ?? 5;
    const secondMax = second.max ?? 95;

    return {
        min: Math.max(secondMin, 100 - firstMax),
        max: Math.min(secondMax, 100 - firstMin),
    };
};

/**
 * Maps a raw drag percentage to a concrete second-panel size. Dragging below the
 * effective minimum snaps the panel shut (collapsed) rather than leaving a sliver,
 * which is what enables the toggle-to-reopen UX; otherwise the value is clamped into
 * the allowed range. Dragging a collapsed panel back past the minimum re-expands it,
 * since any `rawPct >= min` resolves to a non-collapsed, clamped size.
 */
export const resolveSecondSize = (rawPct: number, bounds: Bounds): ResolvedSize => {
    if (rawPct < bounds.min) {
        return { sizePct: 0, collapsed: true };
    }
    return {
        sizePct: Math.min(bounds.max, rawPct),
        collapsed: false,
    };
};
