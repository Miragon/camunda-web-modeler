/**
 * A ref whose `current` can be assigned. Compatible with what `useRef` returns in React 17
 * to 19 (`MutableRefObject` is deprecated in the React 19 typings).
 */
export interface MutableRef<T> {
    current: T;
}
