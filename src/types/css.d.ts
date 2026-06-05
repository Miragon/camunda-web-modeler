/**
 * Ambient declaration for side-effect CSS imports (e.g. the bpmn.io/dmn.io asset
 * stylesheets imported purely for their styling effect).
 *
 * TypeScript 6.0 enables `noUncheckedSideEffectImports` by default, which requires a
 * module/type declaration for every side-effect import. CSS files are handled at bundle
 * time by rollup-plugin-css-only, not by tsc, so this declaration tells the type checker
 * to treat any `*.css` import as a valid, typeless module instead of erroring (TS2882).
 */
declare module "*.css";
