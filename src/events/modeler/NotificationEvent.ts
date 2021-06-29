import type { Event } from "../Events";

const EventName = "notification";

export type NotificationSeverity =
    | "success"
    | "info"
    | "warning"
    | "error";

/**
 * Indicates any notification, could be a success, info, warning, or failure. This may be displayed
 * by the application directly to the user, if desired.
 */
export interface NotificationEventData {
    /**
     * The message text. A human readable string.
     */
    message: string;

    /**
     * The severity of the message.
     */
    severity: NotificationSeverity;
}

export const createNotificationEvent = (
    message: string,
    severity: NotificationSeverity
): Event<NotificationEventData> => ({
    source: "modeler",
    event: EventName,
    data: {
        message,
        severity
    }
});

export const isNotificationEvent = (event: Event<any>): event is Event<NotificationEventData> => (
    event.source === "modeler" && event.event === EventName
);
