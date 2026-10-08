import { MutableRefObject, useLayoutEffect, useRef } from "react";

/**
 * Keeps a ref pointing at the latest value. Lets long-lived callbacks (e.g. listeners
 * registered on a bpmn-js instance) read current props without being recreated, which
 * would otherwise force the instance to be torn down and rebuilt.
 */
export const useLatest = <T>(value: T): MutableRefObject<T> => {
    const ref = useRef(value);
    useLayoutEffect(() => {
        ref.current = value;
    });
    return ref;
};
