import React, {
    PointerEvent as ReactPointerEvent,
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
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
    /** Fired on mount with the initial sizes and on every subsequent change. */
    onResize?: (firstSize: number, secondSize: number) => void;
}

const DIVIDER_WIDTH = 5;
/** Step (in %) applied per ArrowLeft/ArrowRight press on the focused divider. */
const KEYBOARD_STEP = 1;

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
    divider: {
        flex: "none",
        position: "relative",
        width: `${DIVIDER_WIDTH}px`,
        cursor: "col-resize",
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        touchAction: "none",
    },
    secondPanel: {
        flex: "none",
        overflow: "hidden",
    },
    toggleButton: {
        position: "absolute",
        top: "50%",
        right: "100%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "20px",
        height: "40px",
        padding: 0,
        border: "none",
        cursor: "pointer",
        color: "rgba(0, 0, 0, 0.54)",
        fill: "rgba(0, 0, 0, 0.54)",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        borderTopLeftRadius: "4px",
        borderBottomLeftRadius: "4px",
        "&:hover": {
            color: "rgba(0, 0, 0, 0.87)",
            fill: "rgba(0, 0, 0, 0.87)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
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
 */
const ResizablePanels: React.FC<ResizablePanelsProps> = props => {
    const {
        className,
        active,
        firstPanel,
        secondPanel,
        firstPanelSize,
        secondPanelSize,
        onResize,
    } = props;

    const { classes, cx } = useStyles();

    const bounds = useMemo(
        () => getEffectiveBounds(firstPanelSize ?? {}, secondPanelSize ?? {}),
        [firstPanelSize, secondPanelSize],
    );

    const initialSize = secondPanelSize?.initial ?? 25;

    // `sizePct` is the panel's size while expanded; `collapsed` overrides it to 0 for
    // both layout and the emitted event, while preserving a size to restore on reopen.
    const [sizePct, setSizePct] = useState(initialSize);
    const [collapsed, setCollapsed] = useState(false);

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
        // Suppress text selection / cursor flicker across the whole document while
        // dragging, mirroring react-resizable-panels' drag affordance.
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, []);

    const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }, []);

    const handleKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLDivElement>) => {
            // ArrowLeft grows the right-hand panel (divider moves left); ArrowRight shrinks it.
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                applyRawSize(secondSize + KEYBOARD_STEP);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                applyRawSize(secondSize - KEYBOARD_STEP);
            }
        },
        [applyRawSize, secondSize],
    );

    const openPanel = useCallback(() => {
        setCollapsed(false);
        setSizePct(initialSize);
    }, [initialSize]);

    return (
        <div
            ref={rootRef}
            className={cx(classes.root, !active && classes.hidden, className)}
        >
            <div className={classes.firstPanel}>{firstPanel}</div>

            <div
                className={classes.divider}
                role="separator"
                aria-orientation="vertical"
                tabIndex={0}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={handleKeyDown}
            >
                {collapsed && (
                    <button
                        type="button"
                        className={classes.toggleButton}
                        aria-label="Open properties panel"
                        title="Open properties panel"
                        // Prevent the click from initiating a divider drag.
                        onPointerDown={(e: ReactPointerEvent) => {
                            e.stopPropagation();
                        }}
                        onMouseDown={(e: ReactMouseEvent) => {
                            e.stopPropagation();
                        }}
                        onClick={openPanel}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24">
                            <path
                                d="M15 6l-6 6 6 6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                        </svg>
                    </button>
                )}
            </div>

            <div
                className={classes.secondPanel}
                style={{ width: `${secondSize}%` }}
                aria-hidden={collapsed}
            >
                {secondPanel}
            </div>
        </div>
    );
};

export default ResizablePanels;
