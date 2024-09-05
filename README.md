# Camunda Web Modeler

[![NPM](https://img.shields.io/npm/v/@miragon/camunda-web-modeler)](https://www.npmjs.com/package/@miragon/camunda-web-modeler)
![Type Definitions](https://img.shields.io/npm/types/@miragon/camunda-web-modeler)
![License](https://img.shields.io/npm/l/@miragon/camunda-web-modeler)

![Screenshot](./static/screenshot.jpg)

This is a React component based on [bpmn.io](https://bpmn.io) that allows you to use a fully functional modeler for BPMN
and DMN in your browser application. It has lots of configuration options and offers these features:

- Full support for BPMN and DMN
- Embedded XML editor
- Easily import element templates
- Full support for using bpmn.io plugins
- Access to all bpmn.io and additional events to integrate it more easily into your application
- Exposes the complete bpmn.io API
- Includes type definitions for many of the undocumented features and endpoints of bpmn.io
- TypeScript support

# Usage

> [!IMPORTANT]
> There is a known issue with the latest version of `min-dash`
> (read about
> it [here](https://forum.bpmn.io/t/camunda-properties-provider-not-working-properly-in-react-app/10660/10)).
> To fix this, you can force the version of `min-dash` to below `4.2` in your `package.json` or configure your bundler
> to also include `.cjs` and/or `.mjs` files.
>
> | npm                                                                   | yarn                                                                    |
> |-----------------------------------------------------------------------|-------------------------------------------------------------------------|
> | <pre>"overrides":&nbsp;{<br>&nbsp;&nbsp;"min-dash":&nbsp;"4.1.1"<br>} | <pre>"resolutions":&nbsp;{<br>&nbsp;&nbsp;"min-dash":&nbsp;"4.1.1"<br>} |

## Getting Started

1. Add this dependency to your application:

```

yarn add @miragon/camunda-web-modeler

```

2. Include it in your application:

```typescript
import {
    BpmnModeler,
    CustomBpmnJsModeler,
    Event,
    isContentSavedEvent
} from "@miragon/camunda-web-modeler";
import React, { useCallback, useMemo, useRef, useState } from 'react';
import './App.css';

const App: React.FC = () => {
    const modelerRef = useRef<CustomBpmnJsModeler>();

    const [xml, setXml] = useState<string>(BPMN);

    const onEvent = useCallback(async (event: Event<any>) => {
        if (isContentSavedEvent(event)) {
            setXml(event.data.xml);
            return;
        }
    }, []);

    /**
     * ====
     * CAUTION: Using useMemo() is important to prevent additional render cycles!
     * ====
     */

    const modelerTabOptions = useMemo(() => ({
        modelerOptions: {
            refs: [modelerRef]
        }
    }), []);

    return (
        <div style = {
    {
        height: "100vh"
    }
}>
    <BpmnModeler
        xml = { xml }
    onEvent = { onEvent }
    modelerTabOptions = { modelerTabOptions }
    />
    < /div>
)
    ;
}

export default App;

const BPMN = /* ... */;
```

3. Include your BPMN in the last line and run the application!

## Full example

To see all options available, you can use this example. Remember that it's important to wrap all options and callbacks
that are passed into the component using `useMemo()` and `useCallback()`. Else you will have lots of additional render
cycles that can lead to bugs that are difficult to debug.

Using the `bpmnJsOptions`, you can pass any options that you would normally pass into bpmn.io. The component will merge
these with its own options and use it to create the modeler instance.

```typescript
import {
    BpmnModeler,
    ContentSavedReason,
    CustomBpmnJsModeler,
    Event,
    isBpmnIoEvent,
    isContentSavedEvent,
    isNotificationEvent,
    isPropertiesPanelResizedEvent,
    isUIUpdateRequiredEvent
} from "@miragon/camunda-web-modeler-test";
import React, { useCallback, useMemo, useRef, useState } from 'react';
import './App.css';

const App: React.FC = () => {
    const modelerRef = useRef<CustomBpmnJsModeler>();

    const [xml, setXml] = useState<string>(BPMN);

    const onXmlChanged = useCallback((
        newXml: string,
        newSvg: string | undefined,
        reason: ContentSavedReason
    ) => {
        console.log(`Model has been changed because of ${reason}`);
        // Do whatever you want here, save the XML and SVG in the backend etc.
        setXml(newXml);
    }, []);

    const onSaveClicked = useCallback(async () => {
        if (!modelerRef.current) {
            // Should actually never happen, but required for type safety
            return;
        }

        console.log("Saving model...");
        const result = await modelerRef.current.save();
        console.log("Saved model!", result.xml, result.svg);
    }, []);

    const onEvent = useCallback(async (event: Event<any>) => {
        if (isContentSavedEvent(event)) {
            // Content has been saved, e.g. because user edited the model or because he switched
            // from BPMN to XML.
            onXmlChanged(event.data.xml, event.data.svg, event.data.reason);
            return;
        }

        if (isNotificationEvent(event)) {
            // There's a notification the user is supposed to see, e.g. the model could not be
            // imported because it was invalid.
            return;
        }

        if (isUIUpdateRequiredEvent(event)) {
            // Something in the modeler has changed and the UI (e.g. menu) should be updated.
            // This happens when the user selects an element, for example.
            return;
        }

        if (isPropertiesPanelResizedEvent(event)) {
            // The user has resized the properties panel. You can save this value e.g. in local
            // storage to restore it on next load and pass it as initializing option.
            console.log(`Properties panel has been resized to ${event.data.width}`);
            return;
        }

        if (isBpmnIoEvent(event)) {
            // Just a regular bpmn-js event - actually lots of them
            return;
        }

        // eslint-disable-next-line no-console
        console.log("Unhandled event received", event);
    }, [onXmlChanged]);

    /**
     * ====
     * CAUTION: Using useMemo() is important to prevent additional render cycles!
     * ====
     */

    const xmlTabOptions = useMemo(() => ({
        className: undefined,
        disabled: undefined,
        monacoOptions: undefined
    }), []);

    const propertiesPanelOptions = useMemo(() => ({
        className: undefined,
        containerId: undefined,
        container: undefined,
        elementTemplates: undefined,
        hidden: undefined,
        size: {
            max: undefined,
            min: undefined,
            initial: undefined
        }
    }), []);

    const modelerOptions = useMemo(() => ({
        className: undefined,
        refs: [modelerRef],
        container: undefined,
        containerId: undefined,
        size: {
            max: undefined,
            min: undefined,
            initial: undefined
        }
    }), []);

    const bpmnJsOptions = useMemo(() => undefined, []);

    const modelerTabOptions = useMemo(() => ({
        className: undefined,
        disabled: undefined,
        bpmnJsOptions: bpmnJsOptions,
        modelerOptions: modelerOptions,
        propertiesPanelOptions: propertiesPanelOptions
    }), [bpmnJsOptions, modelerOptions, propertiesPanelOptions]);

    return (
        <div style = {
    {
        height: "100vh"
    }
}>

    <button
        onClick = { onSaveClicked }
    style = {
    {
        position: "absolute",
            zIndex
    :
        100,
            top
    :
        25,
            left
    :
        "calc(50% - 100px)",
            textTransform
    :
        "none",
            fontWeight
    :
        "bold",
            minWidth
    :
        "200px",
            minHeight
    :
        "40px",
            backgroundColor
    :
        "yellow",
            borderWidth
    :
        "1px",
            borderRadius
    :
        "4px"
    }
}>
    Save
    Diagram
    < /button>

    < BpmnModeler
    xml = { xml }
    onEvent = { onEvent }
    xmlTabOptions = { xmlTabOptions }
    modelerTabOptions = { modelerTabOptions }
    />
    < /div>
)
    ;
}

export default App;

const BPMN = /* .... */;
```

## Usage with DMN

Usage with DMN is essentially the same. You just have to use the `<DmnModeler>` component instead. The API is very
consistent between the two components.

## More examples

You can find more examples in our examples
repository [camunda-web-modeler-examples](https://github.com/FlowSquad/camunda-web-modeler-examples).

# Usage without npm

You can also use the modeler without npm. However, you should note that this support is only experimental and not
thoroughly tested.

**index.html**

```html
<!DOCTYPE html>
<html style="height: 100%">

<head>
    <title>Modeler Test</title>
    <script src="/index.js"></script>
</head>

<body style="margin: 0; height: 100%">
<div id="root" style="height: 100%"></div>

<!-- React -->
<script src="https://unpkg.com/react@17/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js" crossorigin></script>

<!-- bpmn-js -->
<link rel="stylesheet" href="https://unpkg.com/bpmn-js@8.7.0/dist/assets/diagram-js.css" />
<link rel="stylesheet" href="https://unpkg.com/bpmn-js@8.7.0/dist/assets/bpmn-font/css/bpmn.css" />

<!-- dmn-js -->
<link rel="stylesheet" href="https://unpkg.com/dmn-js@11.0.1/dist/assets/diagram-js.css">
<link rel="stylesheet" href="https://unpkg.com/dmn-js@11.0.1/dist/assets/dmn-js-shared.css">
<link rel="stylesheet" href="https://unpkg.com/dmn-js@11.0.1/dist/assets/dmn-js-drd.css">
<link rel="stylesheet" href="https://unpkg.com/dmn-js@11.0.1/dist/assets/dmn-js-decision-table.css">
<link rel="stylesheet" href="https://unpkg.com/dmn-js@11.0.1/dist/assets/dmn-js-decision-table-controls.css">
<link rel="stylesheet" href="https://unpkg.com/dmn-js@11.0.1/dist/assets/dmn-js-literal-expression.css">
<link rel="stylesheet" href="https://unpkg.com/dmn-js@11.0.1/dist/assets/dmn-font/css/dmn.css">

<!-- Monaco Editor -->
<link rel="stylesheet" href="https://unpkg.com/@miragon/camunda-web-modeler@latest/dist/bundle.css" />
<link rel="stylesheet" data-name="vs/editor/editor.main"
      href="https://unpkg.com/monaco-editor@0.25.2/min/vs/editor/editor.main.css">
<script src="https://unpkg.com/requirejs@2.3.6/require.js"></script>
<script>
    require.config({
        paths: {
            'vs': 'https://unpkg.com/monaco-editor@0.25.2/min/vs',
            'modeler': 'https://unpkg.com/@miragon/camunda-web-modeler@latest/dist',
            'bpmn-js/lib/Modeler': 'https://unpkg.com/bpmn-js@8.7.0/dist/bpmn-modeler.development',
            'dmn-js/lib/Modeler': 'https://unpkg.com/dmn-js@11.0.1/dist/dmn-modeler.development'
        },
        map: {
            '*': {
                'monaco-editor': 'vs/editor/editor.main'
            }
        }
    });
    define('react', () => window.React);
    require(['vs/editor/editor.main', 'modeler/bundle.min'], (monaco, modeler) => {
        this.MiragonModeler = modeler;
        initialize();
    });
</script>
</body>

</html>
```

**index.js**

```javascript
const XML = /* ... */;

initialize = () => {
    var xml = XML;
    const domContainer = document.querySelector('#root');

    var render = () => {
        ReactDOM.render(React.createElement(MiragonModeler.BpmnModeler, { // or MiragonModeler.DmnModeler
            modelerTabOptions: {
                propertiesPanelOptions: {
                    hidden: false
                }
            },
            xml: xml,
            onEvent: (event) => {
                if (event.source === "modeler" && event.event === "content.saved" && event.data.reason === "view.changed") {
                    console.log("XML has been saved", xml);
                    xml = event.data.xml;
                    render();
                }
            }
        }), domContainer);
    };
    render();
};


```

# Issues and Questions

If you experience any bugs or have questions concerning the usage or further development plans, don't hesitate to create
a new issue. However, **please make sure to include all relevant logs, screenshots, and code examples**. Thanks!

# API Reference

For the API reference, start with the type definitions in these files and work your way through:

- [BpmnModeler.tsx](./src/BpmnModeler.tsx)
- [DmnModeler.tsx](./src/DmnModeler.tsx)

You can also use the documentation that you can find here:

- [BPMNModeler](https://unpkg.com/@miragon/camunda-web-modeler@latest/dist/docs/modules/bpmnmodeler.html)
- [DMNModeler](https://unpkg.com/@miragon/camunda-web-modeler@latest/dist/docs/modules/dmnmodeler.html)

## Engage with the Miragon team

If you have any questions or need support, feel free to reach out to us via
email ([info@miragon.io](mailto:info@miragon.io)).
We are here to help you, especially if you are considering introducing camunda-web-modeler in your organization.

For inquiries and professional support, please contact us at: [info@miragon.io](mailto:info@miragon.io)

# License

```
/**
 * Copyright 2021 FlowSquad GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

For the full license text, see the LICENSE file above.
Remember that the bpmn.io license still applies, i.e. you must not remove the icon displayed in the bottom-right corner.
