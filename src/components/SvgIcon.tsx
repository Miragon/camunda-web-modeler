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
        <svg className={cx(classes.root, props.className)}>
            <path d={props.path} />
        </svg>
    );
};

export default SvgIcon;
