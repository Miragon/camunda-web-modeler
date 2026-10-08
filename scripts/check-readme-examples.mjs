/**
 * Type-checks the TSX examples in README.md against the sources, so the documented
 * usage keeps compiling. Each ```tsx block becomes a file in .readme-check/ that
 * imports the package by its name, mapped to src/.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, ".readme-check");
const blocks = [
    ...readFileSync(join(root, "README.md"), "utf8").matchAll(/```tsx\n([\s\S]*?)```/g),
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir);
blocks.forEach(([, code], index) => {
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
