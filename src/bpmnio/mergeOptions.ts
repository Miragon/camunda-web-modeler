/**
 * Builds the options for bpmn-js / dmn-js from what the library needs and what the
 * host passes in `bpmnJsOptions` / `dmnJsOptions`.
 *
 * The host always goes last: its modules come after the library's (so they can
 * override library services), its values override library defaults and its moddle
 * extensions are merged by key. Only the containers are owned by the component.
 */

type Options = Record<string, any>;

export interface LibraryOptions {
    /** The element (or selector) hosting the modeler; owned by the component. */
    container: string | HTMLElement;

    /** The element (or selector) hosting the properties panel, if any. */
    propertiesPanel?: string | HTMLElement;

    /** Modules the library always registers. */
    modules: unknown[];

    /** Modules the library registers if a properties panel is shown. */
    propertiesPanelModules: unknown[];

    /** Moddle extensions the library registers, e.g. `{ camunda: … }`. */
    moddleExtensions: Record<string, unknown>;
}

/**
 * Merges the bpmn-js options.
 *
 * @param library What the library needs
 * @param host The host's `bpmnJsOptions`
 */
export const mergeBpmnJsOptions = (
    library: LibraryOptions,
    host: Options = {},
): Options => {
    const hostModules = (host.additionalModules as unknown[] | undefined) ?? [];
    return {
        ...host,
        container: library.container,
        additionalModules: [
            ...library.modules,
            ...(library.propertiesPanel ? library.propertiesPanelModules : []),
            ...hostModules,
        ],
        moddleExtensions: { ...library.moddleExtensions, ...host.moddleExtensions },
        ...(library.propertiesPanel
            ? {
                  propertiesPanel: {
                      ...host.propertiesPanel,
                      parent: library.propertiesPanel,
                  },
              }
            : {}),
    };
};

/** The dmn-js views, each with its own viewer and options. */
export const DMN_VIEWS = [
    "drd",
    "decisionTable",
    "literalExpression",
    "boxedExpression",
] as const;

export type DmnViewType = (typeof DMN_VIEWS)[number];

export interface DmnLibraryOptions extends Omit<LibraryOptions, "modules"> {
    /** Modules the library always registers, per view. */
    modules: Record<DmnViewType, unknown[]>;
}

/**
 * Merges the dmn-js options. The properties panel only exists for the DRD.
 *
 * dmn-js passes `common.additionalModules` to a view only if the view has no modules
 * of its own. Every view has library modules, so the host's common modules are added
 * to each view explicitly.
 *
 * @param library What the library needs
 * @param host The host's `dmnJsOptions`
 */
export const mergeDmnJsOptions = (
    library: DmnLibraryOptions,
    host: Options = {},
): Options => {
    const common = (host.common as Options | undefined) ?? {};
    const commonModules = (common.additionalModules as unknown[] | undefined) ?? [];

    const merged: Options = {
        ...host,
        container: library.container,
        moddleExtensions: { ...library.moddleExtensions, ...host.moddleExtensions },
    };

    for (const view of DMN_VIEWS) {
        const hostView = (host[view] as Options | undefined) ?? {};
        const withPanel = view === "drd" && library.propertiesPanel !== undefined;
        merged[view] = {
            ...hostView,
            additionalModules: [
                ...library.modules[view],
                ...(withPanel ? library.propertiesPanelModules : []),
                ...commonModules,
                ...((hostView.additionalModules as unknown[] | undefined) ?? []),
            ],
            ...(withPanel
                ? {
                      propertiesPanel: {
                          ...hostView.propertiesPanel,
                          parent: library.propertiesPanel,
                      },
                  }
                : {}),
        };
    }

    return merged;
};
