import { makeStyles } from "@material-ui/styles";
import clsx from "clsx";
import React, { ReactNode } from "react";

export interface ToggleOption {
    id: string;
    node: ReactNode;
}

interface Props {
    options: ToggleOption[];
    onChange: (id: string) => void;
    active: string;
    className?: string;
}

const useStyles = makeStyles(() => ({
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
                fill: "rgba(0, 0, 0, 0.87)"
            }
        },
        "&>:first-child": {
            borderTopLeftRadius: "4px",
            borderBottomLeftRadius: "4px"
        },
        "&>:last-child": {
            borderTopRightRadius: "4px",
            borderBottomRightRadius: "4px"
        }
    },
    active: {
        backgroundColor: "rgba(0, 0, 0, 0.15)",
        color: "rgba(0, 0, 0, 0.87)",
        fill: "rgba(0, 0, 0, 0.87)"
    }
}));

const ToggleGroup: React.FC<Props> = props => {
    const classes = useStyles();
    return (
        <div className={clsx(classes.root, props.className)}>
            {props.options.map(option => (
                <button
                    key={option.id}
                    type="button"
                    className={clsx(props.active === option.id && classes.active)}
                    onClick={() => props.onChange(option.id)}>
                    {option.node}
                </button>
            ))}
        </div>
    );
};

export default ToggleGroup;
