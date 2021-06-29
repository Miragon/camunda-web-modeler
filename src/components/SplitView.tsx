import { makeStyles } from "@material-ui/styles";
import clsx from "clsx";
import React, { ReactNode } from "react";
import SplitPane, { Pane } from "react-split-pane";

interface SplitPaneComponent {
    component: ReactNode;
    className?: string;
    initSize?: string;
    minSize?: string;
    maxSize?: string;
}

interface Props {
    orientation: "horizontal" | "vertical";
    onResize: (newSize1: string) => void;
    component1?: SplitPaneComponent;
    component2?: SplitPaneComponent;
    className?: string;
}

const useStyles = makeStyles(() => ({
    root: {
        "&>div:nth-child(2)": {
            minWidth: "11px",
            backgroundColor: "#000",
            opacity: 1,
            transition: "all 300ms linear",
            "&:hover": {
                borderColor: "transparent"
            }
        }
    }
}));

const SplitView: React.FC<Props> = props => {
    const classes = useStyles();

    const c1 = props.component1;
    const c2 = props.component2;

    return (
        <SplitPane
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore values is a string array!
            onChange={(values: string[]) => props.onResize(values[0])}
            split={props.orientation}
            className={clsx(classes.root, props.className)}>

            {c1 && (
                <Pane
                    minSize={c1.minSize}
                    maxSize={c1.maxSize}
                    className={c1.className}
                    initialSize={c1.initSize}>

                    {c1.component}

                </Pane>
            )}

            {c2 && (
                <Pane
                    minSize={c2.minSize}
                    maxSize={c2.maxSize}
                    className={c2.className}
                    initialSize={c2.initSize}>

                    {c2.component}

                </Pane>
            )}

        </SplitPane>
    );
};

export default SplitView;
