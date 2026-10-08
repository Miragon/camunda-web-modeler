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
