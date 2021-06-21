export type EventCallback = (event: string, data: any) => void;

/**
 * A module that hooks into the event bus fire method to dispatch all events to the callbacks
 * registered via the on() method.
 */
class GlobalEventListenerUtil {
    private listeners: EventCallback[] = [];

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(eventBus: any) {
        const fire = eventBus.fire.bind(eventBus);

        // eslint-disable-next-line no-param-reassign
        eventBus.fire = (event: string, data: any) => {
            this.listeners.forEach(l => l(event, data));
            return fire(event, data);
        };
    }

    /**
     * Registers a new callback that will receive all events fired by bpmn.io.
     *
     * @param callback The callback to register
     */
    public on = (callback: EventCallback): void => {
        if (this.listeners.indexOf(callback) === -1) {
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
