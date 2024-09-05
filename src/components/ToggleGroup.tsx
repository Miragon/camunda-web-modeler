import React, { ReactNode } from "react";
import { tss } from "tss-react";

export interface ToggleOption {
    id: string;
    node: ReactNode;
}

interface Props {
    options: ToggleOption[];
    onChange: (id: string) => Promise<void>;
    active: string;
    className?: string;
}

const useStyles = tss.create(() => ({
    root: {
        height: "40px",
        border: "1px solid #AAA",
        borderRadius: "4px",
        display: "flex",
        "&>*": {
            padding: "0px 16px !important",
            minWidth: "50px",
            border: "none",
            cursor: "pointer",
            transition: "all 400ms",
            color: "rgba(0, 0, 0, 0.54)",
            fill: "rgba(0, 0, 0, 0.54)",
            "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                color: "rgba(0, 0, 0, 0.87)",
                fill: "rgba(0, 0, 0, 0.87)",
            },
        },
        "&>:first-of-type": {
            borderTopLeftRadius: "4px",
            borderBottomLeftRadius: "4px",
        },
        "&>:last-child": {
            borderTopRightRadius: "4px",
            borderBottomRightRadius: "4px",
        },
    },
    active: {
        backgroundColor: "rgba(0, 0, 0, 0.15)",
        color: "rgba(0, 0, 0, 0.87)",
        fill: "rgba(0, 0, 0, 0.87)",
    },
}));

const ToggleGroup: React.FC<Props> = props => {
    const { classes, cx } = useStyles();

    return (
        <div className={cx(classes.root, props.className)}>
            {props.options.map(option => (
                <button
                    key={option.id}
                    type="button"
                    className={cx(props.active === option.id && classes.active)}
                    onClick={() => void props.onChange(option.id)}
                >
                    {option.node}
                </button>
            ))}
        </div>
    );
};

export default ToggleGroup;
