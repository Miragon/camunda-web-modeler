import React, { useRef } from "react";

import { BpmnModeler, BpmnModelerHandle, ModelerEvent } from "../../src";
import { ELEMENT_TEMPLATES } from "./elementTemplates";
import { exampleStyle, modelerStyle, toolbarStyle } from "./exampleLayout";

interface BpmnExampleProps {
    xml: string;
    onEvent: (event: ModelerEvent) => void;
}

const BpmnExample: React.FC<BpmnExampleProps> = ({ xml, onEvent }) => {
    const modelerRef = useRef<BpmnModelerHandle>(null);

    const logSavedDiagram = async () => {
        const saved = await modelerRef.current?.save();
        console.log("Saved BPMN diagram", saved?.xml, saved?.svg);
    };

    return (
        <div style={exampleStyle}>
            <div style={toolbarStyle}>
                <button type="button" onClick={() => void logSavedDiagram()}>
                    Save
                </button>
            </div>
            <div style={modelerStyle}>
                <BpmnModeler
                    ref={modelerRef}
                    xml={xml}
                    onEvent={onEvent}
                    elementTemplates={ELEMENT_TEMPLATES}
                />
            </div>
        </div>
    );
};

export default BpmnExample;
