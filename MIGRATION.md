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
