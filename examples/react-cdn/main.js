import EditorWorker from "https://esm.sh/monaco-editor@0/editor/editor.worker?worker";
import htm from "htm";
import { createElement, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { BpmnModeler, isContentSavedEvent } from "@miragon/camunda-web-modeler";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

const html = htm.bind(createElement);

const BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

const App = () => {
    const [xml, setXml] = useState(BPMN);

    const onEvent = useCallback(event => {
        if (isContentSavedEvent(event)) {
            setXml(event.data.xml);
        }
    }, []);

    return html`<${BpmnModeler} xml=${xml} onEvent=${onEvent} />`;
};

createRoot(document.getElementById("root")).render(html`<${App} />`);
