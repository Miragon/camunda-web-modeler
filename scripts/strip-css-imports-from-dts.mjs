/**
 * Removes side-effect CSS imports from the emitted declaration files.
 *
 * tsc keeps `import "x.css"` in .d.ts output. In consumer projects that type-check
 * libraries (skipLibCheck: false) every such import fails with TS2882 under
 * TypeScript 6's default noUncheckedSideEffectImports, and the imports carry no type
 * information anyway. The JavaScript output keeps them, so styles still load.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;
const CSS_IMPORT = /^import\s+["'][^"']+\.css["'];\r?\n/gm;

const walk = async dir => {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(entry => {
            const path = join(dir, entry.name);
            return entry.isDirectory() ? walk(path) : [path];
        }),
    );
    return files.flat();
};

let changed = 0;
for (const file of await walk(DIST)) {
    if (!file.endsWith(".d.ts")) {
        continue;
    }
    const source = await readFile(file, "utf8");
    const stripped = source.replace(CSS_IMPORT, "");
    if (stripped !== source) {
        await writeFile(file, stripped);
        changed++;
    }
}
console.log(`Removed CSS imports from ${changed} declaration file(s).`);
