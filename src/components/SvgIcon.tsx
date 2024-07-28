import React from "react";
import { makeStyles } from "tss-react/mui";

interface Props {
    path: string;
    className?: string;
}

const useStyles = makeStyles()(() => ({
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
