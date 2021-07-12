import { makeStyles } from "@material-ui/styles";
import clsx from "clsx";
import React from "react";

interface Props {
    path: string;
    className?: string;
}

const useStyles = makeStyles(() => ({
    root: {
        height: "1.5rem",
        width: "1.5rem"
    }
}));

const SvgIcon: React.FC<Props> = props => {
    const classes = useStyles();

    return (
        <svg className={clsx(classes.root, props.className)}>
            <path d={props.path} />
        </svg>
    );
};

export default SvgIcon;
