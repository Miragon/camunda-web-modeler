import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only cleans up automatically when the test framework exposes global
// hooks; Vitest runs without globals here.
afterEach(() => {
    cleanup();
});
