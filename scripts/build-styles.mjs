/**
 * Builds the published stylesheets (dist/style.css, dist/bpmn.css, dist/dmn.css) from
 * src/styles by inlining their @imports. Every stylesheet is included once, in import
 * order, like a bundler would.
 *
 * The icon font stylesheets of bpmn-js / dmn-js embed the fonts as data URIs, but also
 * declare fallbacks with relative paths (EOT, SVG fonts) for long-gone browsers. Those
 * @font-face blocks are dropped: the paths would not resolve next to dist/*.css. Any
 * other non-data url() fails the build.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const require = createRequire(join(root, "package.json"));

const IMPORT = /@import\s+["']([^"']+)["']\s*;/g;
const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const CSS_URL = /url\(\s*(["']?)([^"')]+)\1\s*\)/g;

const resolveImport = (specifier, from) =>
    specifier.startsWith(".")
        ? resolve(dirname(from), specifier)
        : require.resolve(specifier);

const inline = (file, seen) => {
    if (seen.has(file)) {
        return "";
    }
    seen.add(file);
    const css = readFileSync(file, "utf8").replace(IMPORT, (_, specifier) =>
        inline(resolveImport(specifier, file), seen),
    );
    return css.replace(FONT_FACE, block =>
        [...block.matchAll(CSS_URL)].some(([, , url]) => url.startsWith("data:"))
            ? block
            : "",
    );
};

const REQUIRED = {
    "bpmn.css": [
        ".djs-container",
        ".djs-hover-tooltip",
        ".bjs-breadcrumbs",
        ".bpmn-icon-task",
        ".bio-properties-panel",
    ],
    "dmn.css": [
        ".djs-container",
        ".djs-hover-tooltip",
        ".dmn-icon-decision-table",
        ".tjs-table",
        ".bio-properties-panel",
    ],
    "style.css": [".bpmn-icon-task", ".dmn-icon-decision-table"],
};

mkdirSync(join(root, "dist"), { recursive: true });
for (const [name, selectors] of Object.entries(REQUIRED)) {
    const css = inline(join(root, "src/styles", name), new Set());

    const external = [...css.matchAll(CSS_URL)]
        .map(([, , url]) => url)
        .filter(url => !url.startsWith("data:"));
    if (external.length > 0) {
        throw new Error(
            `${name} references files that are not published: ${external.join(", ")}`,
        );
    }
    const missing = selectors.filter(selector => !css.includes(selector));
    if (missing.length > 0) {
        throw new Error(`${name} lacks ${missing.join(", ")}`);
    }
    if (/@import/.test(css)) {
        throw new Error(`${name} still contains an @import`);
    }

    writeFileSync(join(root, "dist", name), css);
    console.log(`dist/${name}: ${String(Math.round(css.length / 1024))} KB`);
}
