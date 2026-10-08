import { describe, expect, it } from "vitest";

import { DMN_VIEWS, mergeBpmnJsOptions, mergeDmnJsOptions } from "./mergeOptions";

const container = document.createElement("div");
const panel = document.createElement("div");

const LIBRARY = {
    container,
    propertiesPanel: panel,
    modules: ["library"],
    propertiesPanelModules: ["panel"],
    moddleExtensions: { camunda: "camunda-library" },
};

describe("mergeBpmnJsOptions", () => {
    it("registers host modules after the library modules", () => {
        const merged = mergeBpmnJsOptions(LIBRARY, { additionalModules: ["host"] });

        expect(merged.additionalModules).toEqual(["library", "panel", "host"]);
    });

    it("leaves out the panel modules without a properties panel", () => {
        const merged = mergeBpmnJsOptions({ ...LIBRARY, propertiesPanel: undefined });

        expect(merged.additionalModules).toEqual(["library"]);
        expect(merged).not.toHaveProperty("propertiesPanel");
    });

    it("lets host values override defaults, but not the containers", () => {
        const merged = mergeBpmnJsOptions(LIBRARY, {
            container: "#somewhere-else",
            keyboard: { bindTo: window },
            propertiesPanel: { parent: "#elsewhere", layout: { open: true } },
        });

        expect(merged.container).toBe(container);
        expect(merged.keyboard).toEqual({ bindTo: window });
        expect(merged.propertiesPanel).toEqual({
            parent: panel,
            layout: { open: true },
        });
    });

    it("merges moddle extensions by key, the host last", () => {
        const merged = mergeBpmnJsOptions(LIBRARY, {
            moddleExtensions: { zeebe: "zeebe", camunda: "camunda-host" },
        });

        expect(merged.moddleExtensions).toEqual({
            camunda: "camunda-host",
            zeebe: "zeebe",
        });
    });

    it("does not copy module or class instances", () => {
        class Service {
            public readonly name = "service";
        }
        const module = { service: ["type", Service] };
        const merged = mergeBpmnJsOptions(LIBRARY, { additionalModules: [module] });

        expect(merged.additionalModules[2]).toBe(module);
    });
});

describe("mergeDmnJsOptions", () => {
    const DMN_LIBRARY = {
        container,
        propertiesPanel: panel,
        modules: {
            drd: ["drd"],
            decisionTable: ["table"],
            literalExpression: ["literal"],
            boxedExpression: ["boxed"],
        },
        propertiesPanelModules: ["panel"],
        moddleExtensions: { camunda: "camunda-library" },
    };

    it("configures every dmn-js view", () => {
        const merged = mergeDmnJsOptions(DMN_LIBRARY);

        expect(DMN_VIEWS.map(view => merged[view].additionalModules)).toEqual([
            ["drd", "panel"],
            ["table"],
            ["literal"],
            ["boxed"],
        ]);
        expect(merged.drd.propertiesPanel).toEqual({ parent: panel });
        expect(merged.decisionTable).not.toHaveProperty("propertiesPanel");
    });

    it("adds common and view modules of the host after the library modules", () => {
        const merged = mergeDmnJsOptions(DMN_LIBRARY, {
            common: { additionalModules: ["common"], keyboard: { bindTo: window } },
            decisionTable: { additionalModules: ["host-table"], hitPolicy: "custom" },
        });

        expect(merged.drd.additionalModules).toEqual(["drd", "panel", "common"]);
        expect(merged.decisionTable.additionalModules).toEqual([
            "table",
            "common",
            "host-table",
        ]);
        expect(merged.decisionTable.hitPolicy).toBe("custom");
        expect(merged.common.keyboard).toEqual({ bindTo: window });
    });

    it("keeps the containers and merges moddle extensions by key", () => {
        const merged = mergeDmnJsOptions(DMN_LIBRARY, {
            container: "#elsewhere",
            moddleExtensions: { zeebe: "zeebe" },
        });

        expect(merged.container).toBe(container);
        expect(merged.moddleExtensions).toEqual({
            camunda: "camunda-library",
            zeebe: "zeebe",
        });
    });
});
