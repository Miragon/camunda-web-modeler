import type { BpmnIoEvent } from "./bpmnio/BpmnIoEvents";
import type { ContentSavedEvent } from "./modeler/ContentSavedEvent";
import type { DmnViewsChangedEvent } from "./modeler/DmnViewsChangedEvent";
import type { NotificationEvent } from "./modeler/NotificationEvent";
import type { PropertiesPanelResizedEvent } from "./modeler/PropertiesPanelResizedEvent";
import type { UIUpdateRequiredEvent } from "./modeler/UIUpdateRequiredEvent";

/**
 * Everything `onEvent` receives: the events of this library (`source: "modeler"`) and
 * the forwarded bpmn.io events (`source: "bpmnio"`).
 *
 * Narrowing on `source` and `event` types `data`:
 *
 * ```ts
 * if (event.source === "modeler" && event.event === "content.saved") {
 *     save(event.data.xml);
 * }
 * ```
 *
 * The `is*Event` guards do the same.
 */
export type ModelerEvent =
    | ContentSavedEvent
    | NotificationEvent
    | UIUpdateRequiredEvent
    | PropertiesPanelResizedEvent
    | DmnViewsChangedEvent
    | BpmnIoEvent;

/**
 * The names of the events of this library.
 */
export type ModelerEventType = Exclude<ModelerEvent, BpmnIoEvent>["event"];
