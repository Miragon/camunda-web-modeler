export type EventCallback = (event: string, data: any) => void;

/**
 * A module that hooks into the event bus fire method to dispatch all events to the callbacks
 * registered via the on() method.
 *
 * The event is delivered to bpmn.io's own listeners first; listeners registered here only
 * observe it afterwards and cannot break bpmn.io's processing by throwing.
 */
class GlobalEventListenerUtil {
    private listeners: EventCallback[] = [];

    constructor(eventBus: any) {
        const fire = eventBus.fire.bind(eventBus);

        // diagram-js supports both fire(type, data) and fire({ type, ... }).
        eventBus.fire = (typeOrEvent: string | { type: string }, data?: any) => {
            const result = fire(typeOrEvent, data);

            const type =
                typeof typeOrEvent === "string" ? typeOrEvent : typeOrEvent.type;
            const payload = typeof typeOrEvent === "string" ? data : typeOrEvent;
            this.listeners.forEach(l => {
                try {
                    l(type, payload);
                } catch (e) {
                    console.error(`Event listener for "${type}" failed`, e);
                }
            });

            return result;
        };
    }

    /**
     * Registers a new callback that will receive all events fired by bpmn.io.
     *
     * @param callback The callback to register
     */
    public on = (callback: EventCallback): void => {
        if (!this.listeners.includes(callback)) {
            this.listeners.push(callback);
        }
    };

    /**
     * Unregisters a previously registered callback.
     *
     * @param callback The callback to unregister
     */
    public off = (callback: EventCallback): void => {
        this.listeners = this.listeners.filter(l => l !== callback);
    };
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
GlobalEventListenerUtil.$inject = ["eventBus"];

export default GlobalEventListenerUtil;
