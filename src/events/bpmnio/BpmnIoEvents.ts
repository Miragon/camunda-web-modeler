import type { ModelerEvent } from "../Events";

/**
 * An event fired by bpmn-js or dmn-js, forwarded as is. bpmn.io's event payloads are
 * not typed, so `data` needs to be narrowed by the host.
 */
export interface BpmnIoEvent {
    source: "bpmnio";
    event: string;
    data: unknown;
}

export const createBpmnIoEvent = (event: string, data: unknown): BpmnIoEvent => ({
    source: "bpmnio",
    event: event,
    data: data,
});

export const isBpmnIoEvent = (event: ModelerEvent): event is BpmnIoEvent =>
    event.source === "bpmnio";
