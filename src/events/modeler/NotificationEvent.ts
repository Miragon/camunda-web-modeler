import type { ModelerEvent } from "../Events";

export type NotificationSeverity = "success" | "info" | "warning" | "error";

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

export interface NotificationEvent {
    source: "modeler";
    event: "notification";
    data: NotificationEventData;
}

export const createNotificationEvent = (
    message: string,
    severity: NotificationSeverity,
): NotificationEvent => ({
    source: "modeler",
    event: "notification",
    data: {
        message,
        severity,
    },
});

export const isNotificationEvent = (event: ModelerEvent): event is NotificationEvent =>
    event.source === "modeler" && event.event === "notification";
