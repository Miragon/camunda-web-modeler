export type ModelerEventType =
    | "content.saved"
    | "ui.update.required"
    | "notification"
    | "properties.panel.resized"
    | "dmn.views.changed";

type EventSource =
    | "bpmnio"
    | "modeler";

export interface Event<Data, Source extends EventSource = "modeler"> {
    source: Source;
    event: Source extends "modeler" ? ModelerEventType : string;
    data: Data;
}
