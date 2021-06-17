import { Event } from "../Events";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createBpmnIoEvent = (event: string, data: any): Event<any, "bpmnio"> => ({
    source: "bpmnio",
    event: event,
    data: data
});

export const isBpmnIoEvent = (event: Event<any, any>): event is Event<any, "bpmnio"> => (
    event.source === "bpmnio"
);
