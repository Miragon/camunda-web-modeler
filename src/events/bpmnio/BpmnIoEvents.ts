import { Event } from "../Events";

export const createBpmnIoEvent = (event: string, data: any): Event<any, "bpmnio"> => ({
    source: "bpmnio",
    event: event,
    data: data,
});

export const isBpmnIoEvent = (event: Event<any, any>): event is Event<any, "bpmnio"> =>
    event.source === "bpmnio";
