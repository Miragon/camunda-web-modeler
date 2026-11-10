# Guide

How to set up and configure `@miragon/camunda-web-modeler` beyond the first steps in the
[README](../README.md).

## Requirements

- React 17, 18 or 19 and [monaco-editor](https://github.com/microsoft/monaco-editor) 0.55 or
  newer (`react`, `react-dom` and `monaco-editor` are peer dependencies).
- A bundler such as Vite, webpack 5 or Next.js. The package is published as ES modules.
- The stylesheet, imported once: `@miragon/camunda-web-modeler/style.css` for both
  modelers, or `bpmn.css` / `dmn.css` if you only use one of them.

## Monaco and the XML editor

Monaco needs its editor worker for the XML editor. With Vite, register it in a module of
its own and import that module before anything that loads the modeler, because ES modules
hoist imports above plain assignments:

```ts
// monaco-worker.ts
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
```

Monaco is loaded when the XML editor is shown for the first time, so it is not part of your
initial bundle; with `xmlEditor={{ disabled: true }}` it is never loaded. To use your own
Monaco build (e.g. only the editor core and the XML language), pass it or a function
loading it as `xmlEditor={{ monaco: () => import("./my-monaco") }}`. Monaco is configured
globally, so all modelers on a page should use the same one.

## Server-side rendering

bpmn-js, dmn-js and Monaco only run in the browser. Load the modeler on the client only,
e.g. with Next.js:

```ts
const BpmnModeler = dynamic(
  () => import("@miragon/camunda-web-modeler").then(m => m.BpmnModeler),
  { ssr: false },
);
```

## Controlled or uncontrolled

Like a React input, the modeler works in two modes:

- **Controlled** (`xml`): you own the document and update it from `content.saved` events,
  as in the README. Until `xml` is non-empty for the first time, nothing is rendered, so
  you can load the document asynchronously.
- **Uncontrolled** (`defaultXml`): the modeler keeps track of the changes itself. Without
  `xml` and `defaultXml`, it starts with an empty diagram.

The modeler fills its parent element, so give the host element a height.

## Accessing the modeler

Pass a `ref` to get the bpmn-js instance, the Monaco editor or the current document:

```tsx
import { BpmnModeler, BpmnModelerHandle } from "@miragon/camunda-web-modeler";
import React, { useRef } from "react";

const BPMN = `<?xml version="1.0" encoding="UTF-8"?>...`;

export const Editor: React.FC = () => {
  const modeler = useRef<BpmnModelerHandle>(null);

  const onSave = async () => {
    const { xml, svg } = (await modeler.current?.save()) ?? {};
    console.log("Saved", xml, svg);
  };

  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <button type="button" onClick={() => void onSave()}>
        Save
      </button>
      <button type="button" onClick={() => modeler.current?.getModeler()?.undo()}>
        Undo
      </button>
      <BpmnModeler ref={modeler} defaultXml={BPMN} />
    </div>
  );
};
```

## All options

All options of the BPMN modeler. Memoize objects you pass (`useMemo`): a new
`bpmnJsOptions` object creates a new bpmn-js instance.

```tsx
import {
  BpmnModeler,
  BpmnModelerHandle,
  isBpmnIoEvent,
  isContentSavedEvent,
  isNotificationEvent,
  isPropertiesPanelResizedEvent,
  isUIUpdateRequiredEvent,
  ModelerEvent,
} from "@miragon/camunda-web-modeler";
import React, { useCallback, useMemo, useRef, useState } from "react";

const BPMN = `<?xml version="1.0" encoding="UTF-8"?>...`;

const App: React.FC = () => {
  const modeler = useRef<BpmnModelerHandle>(null);
  const [xml, setXml] = useState(BPMN);

  const onEvent = useCallback((event: ModelerEvent) => {
    if (isContentSavedEvent(event)) {
      // The user changed the diagram or the XML, or switched views.
      console.log(`Content saved because of ${event.data.reason}`);
      setXml(event.data.xml);
    } else if (isNotificationEvent(event)) {
      // Something the user should see, e.g. an import error.
      console.log(event.data.severity, event.data.message);
    } else if (isUIUpdateRequiredEvent(event)) {
      // Update your toolbar, e.g. undo / redo buttons via the ref.
    } else if (isPropertiesPanelResizedEvent(event)) {
      // In percent of the editor width; can be passed back as propertiesPanel.size.
      console.log(`Properties panel resized to ${event.data.sizePercent} %`);
    } else if (isBpmnIoEvent(event)) {
      // Any bpmn-js event, forwarded as is.
    }
  }, []);

  // Passed to bpmn-js; modules can override services of this library.
  const bpmnJsOptions = useMemo(() => ({ keyboard: { bindTo: document } }), []);

  // Element templates in the Camunda 7 format.
  const elementTemplates = useMemo(() => [], []);

  return (
    <div style={{ height: "100vh" }}>
      <BpmnModeler
        ref={modeler}
        xml={xml}
        onEvent={onEvent}
        bpmnJsOptions={bpmnJsOptions}
        elementTemplates={elementTemplates}
        diagram={{ size: { initial: 70, min: 20, max: 90 } }}
        propertiesPanel={{ hidden: false, size: { initial: 30 } }}
        xmlEditor={{ disabled: false, options: { fontSize: 13 } }}
        classes={{ root: "my-modeler", viewToggle: "my-toggle" }}
      />
    </div>
  );
};

export default App;
```

## DMN

Usage with DMN is the same: use `<DmnModeler>` (and `DmnModelerHandle` for the `ref`) with
`dmnJsOptions` instead of `bpmnJsOptions`. Element templates don't exist for DMN, and the
properties panel is only shown for the DRD.

## Examples

- [examples/react-vite](../examples/react-vite): a Vite app with separate BPMN and DMN
  components, saving via the `ref` and element templates.
- [examples/vue-vite](../examples/vue-vite): the BPMN modeler in a Vue 3 app, bound with
  `v-model:xml`. The [BpmnModeler.vue](../examples/vue-vite/BpmnModeler.vue) wrapper
  mounts the React component with `createRoot`; copy it into your app.
- [examples/react-cdn](../examples/react-cdn): the BPMN modeler without npm or a build
  step, loaded from [esm.sh](https://esm.sh) via an import map, always in the latest
  release.

The Vite examples import the library from `../../src`; in your app, import from
`@miragon/camunda-web-modeler` instead. How to run them is in
[CONTRIBUTING.md](../CONTRIBUTING.md).

## API reference

Every prop, handle method and event is typed and documented in the type definitions.
Start with these files:

- [options.ts](../src/options.ts): the props both modelers share
- [BpmnModeler.tsx](../src/BpmnModeler.tsx)
- [DmnModeler.tsx](../src/DmnModeler.tsx)
- [Events.ts](../src/events/Events.ts)
