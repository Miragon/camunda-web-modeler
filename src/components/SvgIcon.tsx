import React from "react";
import { tss } from "tss-react";

interface Props {
    path: string;
    className?: string;
}

const useStyles = tss.create(() => ({
    root: {
        height: "1.5rem",
        width: "1.5rem",
    },
}));

const SvgIcon: React.FC<Props> = props => {
    const { classes, cx } = useStyles();

    return (
        <svg
            className={cx(classes.root, props.className)}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path d={props.path} />
        </svg>
    );
};

export default SvgIcon;
