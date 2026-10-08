# Migrating to 1.0

1.0 bundles the breaking changes of epic #226. Each section lists what changed, who is
affected and what to do.

## Host options override the library defaults (#232)

`bpmnJsOptions` and `dmnJsOptions` used to be merged _before_ the library's defaults,
so the library won on conflicts and its modules were registered after the host's.

Now the host goes last:

- **Modules** in `additionalModules` are registered after the library's, so a host can
  override library services (for example `elementTemplatesLoader`).
- **Values** override the library defaults. Only `container` and the properties panel
  `parent` always come from the component.
- **Moddle extensions** are merged by key; a host can add `zeebe` or replace `camunda`.
- **DMN:** host modules from `common.additionalModules` now reach every view. Before,
  dmn-js dropped them because the library sets modules per view.

**Who is affected:** hosts whose `bpmnJsOptions` / `dmnJsOptions` contain modules or
values that so far lost against the library. Check that those are still intended now
that they take effect.

## Typed events: `Event` → `ModelerEvent` (#227)

`onEvent` used to receive `Event<any, any>`, so `event.data` was untyped, and the
exported `Event` type shadowed the DOM `Event`. `onEvent` now receives `ModelerEvent`,
a union of all events; narrowing on `source` and `event` (or using the `is*Event`
guards) types `data`. Every event also has its own type (`ContentSavedEvent`,
`NotificationEvent`, …, `BpmnIoEvent`).

```ts
// before
import { Event, isContentSavedEvent } from "@miragon/camunda-web-modeler";
const onEvent = (event: Event<any, any>) => { … };

// after
import { ModelerEvent, isContentSavedEvent } from "@miragon/camunda-web-modeler";
const onEvent = (event: ModelerEvent) => {
    if (isContentSavedEvent(event)) {
        save(event.data.xml); // typed as ContentSavedEventData
    }
};
```

**Who is affected:** everyone importing `Event`. Comparing only `event.event` no
longer types `data`, because forwarded bpmn.io events can have any name; check
`event.source === "modeler"` as well, or use the guards. The `data` of bpmn.io
events is `unknown` instead of `any`.

## Flatter props, a `ref` handle and `xml` / `defaultXml` (#228, #229, #230)

The nested tab options are replaced by flat props, styling goes through one `classes`
object, and the instances are reachable through the component `ref` instead of `refs`
arrays in the options.

| 0.x                                                                   | 1.0                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| `className`                                                           | `classes.root`                                        |
| `modelerTabOptions.disabled`                                          | `diagram.disabled`                                    |
| `modelerTabOptions.className`                                         | `classes.diagram`                                     |
| `modelerTabOptions.bpmnJsOptions` / `.dmnJsOptions`                   | `bpmnJsOptions` / `dmnJsOptions`                      |
| `modelerTabOptions.modelerOptions.refs`                               | `ref` → `getModeler()`                                |
| `modelerTabOptions.modelerOptions.size`                               | `diagram.size`                                        |
| `modelerTabOptions.modelerOptions.className`                          | `classes.canvas`                                      |
| `modelerTabOptions.modelerOptions.container` / `.containerId`         | removed, the component always renders the canvas      |
| `modelerTabOptions.propertiesPanelOptions.hidden` / `.size`           | `propertiesPanel.hidden` / `.size`                    |
| `modelerTabOptions.propertiesPanelOptions.container` / `.containerId` | `propertiesPanel.container` (element or CSS selector) |
| `modelerTabOptions.propertiesPanelOptions.className`                  | `classes.propertiesPanel`                             |
| `modelerTabOptions.propertiesPanelOptions.elementTemplates`           | `elementTemplates`                                    |
| `xmlTabOptions.disabled`                                              | `xmlEditor.disabled`                                  |
| `xmlTabOptions.className`                                             | `classes.xmlEditor`                                   |
| `xmlTabOptions.monacoOptions.options` / `.props`                      | `xmlEditor.options` / `.props`                        |
| `xmlTabOptions.monacoOptions.refs`                                    | `ref` → `getXmlEditor()`                              |
| —                                                                     | `classes.viewToggle`                                  |

```tsx
// before
const modelerRef = useRef<CustomBpmnJsModeler>();
const modelerTabOptions = useMemo(
  () => ({
    modelerOptions: { refs: [modelerRef] },
    propertiesPanelOptions: { elementTemplates: templates, size: { initial: 30 } },
  }),
  [templates],
);
<BpmnModeler xml={xml} onEvent={onEvent} modelerTabOptions={modelerTabOptions} />;
modelerRef.current?.undo();

// after
const modeler = useRef<BpmnModelerHandle>(null);
<BpmnModeler
  ref={modeler}
  xml={xml}
  onEvent={onEvent}
  elementTemplates={templates}
  propertiesPanel={{ size: { initial: 30 } }}
/>;
modeler.current?.getModeler()?.undo();
```

Also new:

- `xml` is optional. Pass `defaultXml` instead to let the modeler keep track of the
  document itself (uncontrolled); without both it starts with an empty diagram.
- `onEvent` is optional.
- `ref.current.save()` returns the current document of the shown view.

**Types:** `BpmnModelerTabOptions`, `DmnModelerTabOptions`, `BpmnModelerOptions`,
`DmnModelerOptions`, `BpmnPropertiesPanelOptions`, `DmnPropertiesPanelOptions`,
`MonacoOptions` and `XmlTabOptions` are replaced by `DiagramOptions`,
`PropertiesPanelOptions`, `XmlEditorOptions`, `ModelerClasses`, `BpmnModelerHandle` and
`DmnModelerHandle`.

**Who is affected:** every host using options or `className`. Hosts that only pass `xml`
and `onEvent` don't need to change anything.

## `properties.panel.resized`: `width` → `sizePercent` (#231)

The event reported the panel size as `data.width`, which suggested pixels but was a
percentage of the editor width. The field is now called `sizePercent`; the value is the
same (0 when collapsed) and can be passed back as `propertiesPanel.size.initial`.

```ts
// before
if (isPropertiesPanelResizedEvent(event)) persist(event.data.width);

// after
if (isPropertiesPanelResizedEvent(event)) persist(event.data.sizePercent);
```

**Who is affected:** hosts that read `data.width`.
