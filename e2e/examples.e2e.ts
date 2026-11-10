import { expect, test, type Page } from "@playwright/test";

const recordErrors = (page: Page) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
        if (message.type() === "error") {
            errors.push(message.text());
        }
    });
    return errors;
};

const expectDiagramAndXmlEditor = async (page: Page, rootElement: string) => {
    await expect(page.locator(".djs-container").first()).toBeVisible();
    await page.getByRole("button", { name: "XML", exact: true }).click();
    await expect(page.locator(".monaco-editor .view-lines")).toContainText(rootElement);
};

test("react-vite shows the BPMN and the DMN modeler", async ({ page }) => {
    const errors = recordErrors(page);
    await page.goto("http://localhost:4173/");

    await expectDiagramAndXmlEditor(page, "bpmn:definitions");
    await page.getByRole("button", { name: "DMN", exact: true }).click();
    await expectDiagramAndXmlEditor(page, "definitions");

    expect(errors).toEqual([]);
});

test("vue-vite shows the BPMN modeler", async ({ page }) => {
    const errors = recordErrors(page);
    await page.goto("http://localhost:4174/");

    await expectDiagramAndXmlEditor(page, "bpmn:definitions");

    expect(errors).toEqual([]);
});

test("react-cdn shows the BPMN modeler loaded from esm.sh", async ({ page }) => {
    const errors = recordErrors(page);
    await page.goto("http://localhost:4175/");

    await expectDiagramAndXmlEditor(page, "bpmn:definitions");

    expect(errors).toEqual([]);
});
