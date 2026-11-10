/**
 * Type-checks the TSX examples in README.md and docs/guide.md against the sources, so
 * the documented usage keeps compiling. Each ```tsx block, also when indented in a list,
 * becomes a file in .readme-check/ that imports the package by its name, mapped to src/.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, ".readme-check");
const documentedFiles = ["README.md", "docs/guide.md"];
const removeIndent = (code, indent) => code.replace(new RegExp(`^${indent}`, "gm"), "");
const blocks = documentedFiles.flatMap(file =>
    [
        ...readFileSync(join(root, file), "utf8").matchAll(
            /^( *)```tsx\n([\s\S]*?)^\1```/gm,
        ),
    ].map(([, indent, code]) => removeIndent(code, indent)),
);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir);
blocks.forEach((code, index) => {
    writeFileSync(join(outDir, `example-${String(index + 1)}.tsx`), code);
});
writeFileSync(
    join(outDir, "tsconfig.json"),
    JSON.stringify({
        extends: "../tsconfig.json",
        compilerOptions: {
            noEmit: true,
            rootDir: "..",
            paths: { "@miragon/camunda-web-modeler": ["../src/index.ts"] },
        },
        include: ["../src/types/**/*", "./*.tsx"],
    }),
);

try {
    execFileSync(
        join(root, "node_modules/.bin/tsc"),
        ["-p", join(outDir, "tsconfig.json")],
        {
            stdio: "inherit",
        },
    );
    console.log(`README examples type-check (${String(blocks.length)} blocks).`);
} finally {
    rmSync(outDir, { recursive: true, force: true });
}
