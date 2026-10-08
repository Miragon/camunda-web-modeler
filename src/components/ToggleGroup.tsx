import React, { ReactNode } from "react";
import { tss } from "tss-react";

export interface ToggleOption {
    id: string;
    /** Accessible name and tooltip of the option. Required for icon-only options. */
    label?: string;
    node: ReactNode;
}

interface Props {
    options: ToggleOption[];
    onChange: (id: string) => Promise<void>;
    active: string;
    className?: string;
    /** Accessible name of the whole group. */
    label?: string;
}

const ACCENT = "var(--cwm-accent-color, hsl(205, 100%, 40%))";

const useStyles = tss.create(() => ({
    root: {
        height: "40px",
        // At least 3:1 against white for the boundary of an interactive control.
        border: "1px solid var(--cwm-border-color, rgba(0, 0, 0, 0.45))",
        borderRadius: "4px",
        display: "flex",
        backgroundColor: "var(--cwm-surface-color, rgba(255, 255, 255, 0.92))",
        "&>*": {
            // Keep the labels readable; the group scrolls if they do not fit.
            flex: "none",
            display: "flex",
            alignItems: "center",
            padding: "0px 16px !important",
            minWidth: "50px",
            border: "none",
            background: "transparent",
            fontFamily: "var(--cwm-font-family, Arial, sans-serif)",
            fontSize: "14px",
            cursor: "pointer",
            color: "rgba(0, 0, 0, 0.7)",
            fill: "currentColor",
            transition: "background-color 120ms ease-out, color 120ms ease-out",
            "&:hover": {
                backgroundColor: "var(--cwm-hover-color, rgba(0, 0, 0, 0.06))",
                color: "rgba(0, 0, 0, 0.87)",
            },
            // Inset, because the group may scroll (and thereby clip an outline); the
            // white inner ring keeps it visible on the accent-colored active option.
            "&:focus-visible": {
                outline: "none",
                boxShadow: `inset 0 0 0 2px ${ACCENT}, inset 0 0 0 4px #fff`,
            },
            "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
            },
        },
        "&>[aria-pressed='true'], &>[aria-pressed='true']:hover": {
            backgroundColor: ACCENT,
            color: "var(--cwm-on-accent-color, #fff)",
        },
        "&>:first-of-type": {
            borderTopLeftRadius: "3px",
            borderBottomLeftRadius: "3px",
        },
        "&>:last-child": {
            borderTopRightRadius: "3px",
            borderBottomRightRadius: "3px",
        },
    },
}));

const ToggleGroup: React.FC<Props> = props => {
    const { classes, cx } = useStyles();

    return (
        <div
            role="group"
            aria-label={props.label}
            className={cx(classes.root, props.className)}
        >
            {props.options.map(option => (
                <button
                    key={option.id}
                    type="button"
                    aria-pressed={props.active === option.id}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => {
                        props.onChange(option.id).catch((e: unknown) => {
                            console.error("Could not change view", e);
                        });
                    }}
                >
                    {option.node}
                </button>
            ))}
        </div>
    );
};

export default ToggleGroup;
