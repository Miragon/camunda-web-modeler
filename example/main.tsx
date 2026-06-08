// Must come first: registers monaco's worker before `../src` (and thus monaco)
// is evaluated. See monaco-worker.ts for why this lives in its own module.
import "./monaco-worker";

import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

const container = document.getElementById("root");
if (!container) {
    throw new Error("Root container #root not found");
}

createRoot(container).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
