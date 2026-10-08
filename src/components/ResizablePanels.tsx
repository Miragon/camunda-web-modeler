import React, {
    PointerEvent as ReactPointerEvent,
    KeyboardEvent as ReactKeyboardEvent,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { tss } from "tss-react";

import { getEffectiveBounds, PanelSize, resolveSecondSize } from "./resizablePanelsMath";

/**
 * Props for {@link ResizablePanels}. Sizes are percentages of the container width to
 * preserve the published `@miragon/camunda-web-modeler` contract (the old
 * `react-resizable-panels` API was percentage-based too).
 */
export interface ResizablePanelsProps {
    /** Class applied to the flex root. */
    className?: string;
    /**
     * When false the root is hidden via `display: none` but stays mounted — bpmn-js /
     * dmn-js attach to the child container DOM nodes, so unmounting would tear them down.
     */
    active: boolean;
    /** Left panel (modeler); flexes to fill whatever the second panel leaves. */
    firstPanel: ReactNode;
    /** Right panel (properties); explicit width, resizable and collapsible. */
    secondPanel: ReactNode;
    /** First-panel size constraints in %. Defaults 75 / 5 / 95. */
    firstPanelSize?: PanelSize;
    /** Second-panel size constraints in %. Defaults 25 / 5 / 95. */
    secondPanelSize?: PanelSize;
    /**
     * Hides the second panel and the divider while true. The panel stays mounted (its
     * content may be owned by bpmn-js / dmn-js) and keeps its size for when it is shown
     * again.
     */
    secondPanelHidden?: boolean;
    /** Fired on mount with the initial sizes and on every subsequent change. */
    onResize?: (firstSize: number, secondSize: number) => void;
}

/** Visible width of the divider line in px. The grab area is wider, see `divider`. */
const DIVIDER_WIDTH = 1;
/** Step (in %) applied per ArrowLeft/ArrowRight press on the focused divider. */
const KEYBOARD_STEP = 1;
/** Step (in %) applied per Shift+ArrowLeft/ArrowRight press. */
const KEYBOARD_STEP_LARGE = 10;

const ACCENT = "var(--cwm-accent-color, hsl(205, 100%, 40%))";

let panelIdCounter = 0;

const useStyles = tss.create(() => ({
    root: {
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
    },
    hidden: {
        display: "none",
    },
    firstPanel: {
        flex: "1 1 0",
        minWidth: 0,
        overflow: "hidden",
    },
    dividerArea: {
        flex: "none",
        position: "relative",
        // Above both panels, so the widened grab area and the toggle are not covered.
        zIndex: 1,
        width: `${DIVIDER_WIDTH}px`,
    },
    divider: {
        position: "absolute",
        inset: 0,
        cursor: "col-resize",
        touchAction: "none",
        backgroundColor: "var(--cwm-divider-color, rgba(0, 0, 0, 0.15))",
        transition: "background-color 120ms ease-out",
        outline: "none",
        // Widens the grab area without widening the visible line.
        "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "-4px",
            right: "-4px",
        },
        "&:hover, &[data-dragging='true']": {
            backgroundColor: ACCENT,
        },
        "&:focus-visible": {
            backgroundColor: ACCENT,
            boxShadow: `0 0 0 2px ${ACCENT}`,
        },
        "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
        },
    },
    secondPanel: {
        flex: "none",
        overflow: "hidden",
    },
    collapsedPanel: {
        // Keeps the content mounted (bpmn-js / dmn-js own it) but takes it out of the
        // tab order and the accessibility tree.
        visibility: "hidden",
    },
    toggleButton: {
        position: "absolute",
        top: "50%",
        right: "100%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "40px",
        padding: 0,
        border: "1px solid var(--cwm-divider-color, rgba(0, 0, 0, 0.15))",
        borderRight: "none",
        borderTopLeftRadius: "4px",
        borderBottomLeftRadius: "4px",
        cursor: "pointer",
        color: "rgba(0, 0, 0, 0.6)",
        backgroundColor: "var(--cwm-surface-color, #fff)",
        "&:hover": {
            color: "rgba(0, 0, 0, 0.87)",
            backgroundColor: "var(--cwm-hover-color, rgba(0, 0, 0, 0.06))",
        },
        "&:focus-visible": {
            outline: `2px solid ${ACCENT}`,
            outlineOffset: "-2px",
        },
    },
}));

/**
 * A purpose-built, controlled horizontal split with a draggable divider and a
 * collapse-to-zero toggle for the second panel. Replaces `react-resizable-panels`,
 * whose React peer range conflicted with this repo's intentional React 17 support.
 *
 * Only the second (properties) panel's size is tracked as state; the first (modeler)
 * panel flexes to the remainder. Keeping a single source of truth makes the math 1:1
 * with the emitted `onResize` second value.
 *
 * The divider follows the WAI-ARIA window splitter pattern: arrow keys resize (Shift
 * for larger steps), Enter toggles, Home collapses and End maximizes the panel.
 */
const ResizablePanels: React.FC<ResizablePanelsProps> = props => {
    const {
        className,
        active,
        firstPanel,
        secondPanel,
        firstPanelSize,
        secondPanelSize,
        secondPanelHidden = false,
        onResize,
    } = props;

    const { classes, cx } = useStyles();

    const bounds = useMemo(
        () => getEffectiveBounds(firstPanelSize ?? {}, secondPanelSize ?? {}),
        [firstPanelSize, secondPanelSize],
    );

    const clampToBounds = useCallback(
        (pct: number) => Math.min(bounds.max, Math.max(bounds.min, pct)),
        [bounds],
    );

    // `sizePct` is the panel's size while expanded; `collapsed` overrides it to 0 for
    // both layout and the emitted event, while preserving a size to restore on reopen.
    // An initial size outside the bounds would otherwise render a 0 px panel.
    const [sizePct, setSizePct] = useState(() =>
        clampToBounds(secondPanelSize?.initial ?? 25),
    );
    const [collapsed, setCollapsed] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [panelId] = useState(() => `cwm-resizable-panel-${String(++panelIdCounter)}`);

    const rootRef = useRef<HTMLDivElement | null>(null);

    // Hold the latest onResize so the emit effect can depend only on the sizes, firing
    // once on mount and once per change without re-firing when the callback identity
    // (which the editors recreate from props) changes.
    const onResizeRef = useRef(onResize);
    useEffect(() => {
        onResizeRef.current = onResize;
    });

    const secondSize = collapsed ? 0 : sizePct;

    useEffect(() => {
        onResizeRef.current?.(100 - secondSize, secondSize);
    }, [secondSize]);

    /**
     * Applies a raw second-panel percentage through the shared math, updating both the
     * collapsed flag and the remembered size.
     */
    const applyRawSize = useCallback(
        (rawPct: number) => {
            const resolved = resolveSecondSize(rawPct, bounds);
            setCollapsed(resolved.collapsed);
            if (!resolved.collapsed) {
                setSizePct(resolved.sizePct);
            }
        },
        [bounds],
    );

    /**
     * Shows the panel again at the width it had before it was collapsed.
     */
    const expand = useCallback(() => {
        setCollapsed(false);
        setSizePct(clampToBounds);
    }, [clampToBounds]);

    /**
     * Translates a pointer x-coordinate into the second panel's percentage. The second
     * panel hugs the right edge, so its width is the distance from the cursor to the
     * container's right edge.
     */
    const sizeFromPointer = useCallback((clientX: number): number | undefined => {
        const root = rootRef.current;
        if (!root) {
            return undefined;
        }
        const rect = root.getBoundingClientRect();
        if (rect.width === 0) {
            return undefined;
        }
        return ((rect.right - clientX) / rect.width) * 100;
    }, []);

    const handlePointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            // Only resize while a drag is in progress (pointer captured on pointerdown);
            // plain hovering over the divider must not move it.
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                return;
            }
            const rawPct = sizeFromPointer(event.clientX);
            if (rawPct !== undefined) {
                applyRawSize(rawPct);
            }
        },
        [applyRawSize, sizeFromPointer],
    );

    const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        // Suppress text selection / cursor flicker across the whole document while
        // dragging, mirroring react-resizable-panels' drag affordance.
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, []);

    const resetDrag = useCallback(() => {
        setDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }, []);

    const endDrag = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            resetDrag();
        },
        [resetDrag],
    );

    // Don't leave the document stuck in drag styling if we unmount mid-drag.
    useEffect(
        () => () => {
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        },
        [],
    );

    const handleKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLDivElement>) => {
            const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
            switch (event.key) {
                // ArrowLeft grows the right-hand panel (divider moves left); on a
                // collapsed panel it reopens it.
                case "ArrowLeft":
                    if (collapsed) {
                        expand();
                    } else {
                        applyRawSize(sizePct + step);
                    }
                    break;
                case "ArrowRight":
                    if (!collapsed) {
                        applyRawSize(sizePct - step);
                    }
                    break;
                case "Enter":
                    if (collapsed) {
                        expand();
                    } else {
                        setCollapsed(true);
                    }
                    break;
                case "Home":
                    setCollapsed(true);
                    break;
                case "End":
                    setCollapsed(false);
                    setSizePct(bounds.max);
                    break;
                default:
                    return;
            }
            event.preventDefault();
        },
        [applyRawSize, bounds.max, collapsed, expand, sizePct],
    );

    const toggleLabel = collapsed ? "Open properties panel" : "Close properties panel";

    return (
        <div
            ref={rootRef}
            className={cx(classes.root, !active && classes.hidden, className)}
        >
            <div className={classes.firstPanel}>{firstPanel}</div>

            <div
                className={cx(classes.dividerArea, secondPanelHidden && classes.hidden)}
            >
                {/* A focusable separator is the WAI-ARIA window splitter widget, which
                    jsx-a11y does not know as interactive. */}
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                <div
                    className={classes.divider}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize properties panel"
                    aria-controls={panelId}
                    aria-valuenow={Math.round(secondSize)}
                    aria-valuemin={0}
                    aria-valuemax={Math.round(bounds.max)}
                    aria-valuetext={
                        collapsed ? "Collapsed" : `${String(Math.round(secondSize))} %`
                    }
                    data-dragging={dragging}
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
                    tabIndex={0}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onLostPointerCapture={resetDrag}
                    onKeyDown={handleKeyDown}
                />
                <button
                    type="button"
                    className={classes.toggleButton}
                    aria-expanded={!collapsed}
                    aria-controls={panelId}
                    aria-label={toggleLabel}
                    title={toggleLabel}
                    onClick={
                        collapsed
                            ? expand
                            : () => {
                                  setCollapsed(true);
                              }
                    }
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d={collapsed ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        />
                    </svg>
                </button>
            </div>

            <div
                id={panelId}
                className={cx(
                    classes.secondPanel,
                    collapsed && classes.collapsedPanel,
                    secondPanelHidden && classes.hidden,
                )}
                style={{ width: `${String(secondSize)}%` }}
            >
                {secondPanel}
            </div>
        </div>
    );
};

export default ResizablePanels;
