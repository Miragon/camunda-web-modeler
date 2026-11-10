import React, { useRef } from "react";

import { DmnModeler, DmnModelerHandle, ModelerEvent } from "../../src";
import { exampleStyle, modelerStyle, toolbarStyle } from "./exampleLayout";

interface DmnExampleProps {
    xml: string;
    onEvent: (event: ModelerEvent) => void;
}

const DmnExample: React.FC<DmnExampleProps> = ({ xml, onEvent }) => {
    const modelerRef = useRef<DmnModelerHandle>(null);

    const logSavedDiagram = async () => {
        const saved = await modelerRef.current?.save();
        console.log("Saved DMN diagram", saved?.xml);
    };

    return (
        <div style={exampleStyle}>
            <div style={toolbarStyle}>
                <button type="button" onClick={() => void logSavedDiagram()}>
                    Save
                </button>
            </div>
            <div style={modelerStyle}>
                <DmnModeler ref={modelerRef} xml={xml} onEvent={onEvent} />
            </div>
        </div>
    );
};

export default DmnExample;
