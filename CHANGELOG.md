# Changelog

## [0.3.0](https://github.com/Miragon/camunda-web-modeler/compare/v0.2.0...v0.3.0) (2026-10-08)


### ⚠ BREAKING CHANGES

* monaco-editor has to be installed by the host; the library no longer calls loader.config() at import time.
* Imports from @miragon/camunda-web-modeler/dist/... no longer resolve; only the package root and the stylesheets are exported.
* Hosts need to import @miragon/camunda-web-modeler/style.css (or bpmn.css / dmn.css).
* PropertiesPanelResizedEventData.width is renamed to sizePercent.
* modelerTabOptions, xmlTabOptions, className and the refs arrays are replaced; see MIGRATION.md.
* The Event type is replaced by ModelerEvent; comparing only event.event no longer types data.
* Host modules and values in bpmnJsOptions / dmnJsOptions take precedence over the library defaults.
* dist/bundle.min.js, dist/bundle.css and dist/docs are no longer published, so the package can no longer be loaded from a CDN as UMD bundle. The root index.js is gone; import from @miragon/camunda-web-modeler.
* Importing XML no longer emits content.saved with reason diagram.changed; only user edits do. Hosts that relied on the event after load (e.g. for an SVG thumbnail) need to export it themselves.

### 🎉 New Features

* close deep imports into dist ([#241](https://github.com/Miragon/camunda-web-modeler/issues/241)) ([a802c91](https://github.com/Miragon/camunda-web-modeler/commit/a802c9108c52e0f3aab6410c56e06bbad6f7f124))
* flat props, a ref handle and controlled or uncontrolled xml ([#238](https://github.com/Miragon/camunda-web-modeler/issues/238)) ([446bd28](https://github.com/Miragon/camunda-web-modeler/commit/446bd281d9588b00d42149c68f0b71946fb6fb99))
* let host options and modules override the library defaults ([#236](https://github.com/Miragon/camunda-web-modeler/issues/236)) ([5440218](https://github.com/Miragon/camunda-web-modeler/commit/54402184af926d7b638d55eeeaee1d14218d18a1))
* make Monaco a peer dependency and load it on demand ([#242](https://github.com/Miragon/camunda-web-modeler/issues/242)) ([3c588e1](https://github.com/Miragon/camunda-web-modeler/commit/3c588e1517fd0634b971d23307787ee84b404731))
* publish plain ES modules with an exports map and exported types ([#223](https://github.com/Miragon/camunda-web-modeler/issues/223)) ([f3ba43b](https://github.com/Miragon/camunda-web-modeler/commit/f3ba43b7a57fb8c9079eb12dc455a63b899b3773))
* report the properties panel size as sizePercent ([#239](https://github.com/Miragon/camunda-web-modeler/issues/239)) ([11030e3](https://github.com/Miragon/camunda-web-modeler/commit/11030e372a6df6ffa9ec0fff4807cc15c8e19bec))
* ship the styles as style.css instead of importing CSS from JS ([#240](https://github.com/Miragon/camunda-web-modeler/issues/240)) ([4961c86](https://github.com/Miragon/camunda-web-modeler/commit/4961c8690da7becf5e6841b522314d030b12be94))
* support React 19 and keep modeler instances alive across tab switches ([#222](https://github.com/Miragon/camunda-web-modeler/issues/222)) ([57c0ec3](https://github.com/Miragon/camunda-web-modeler/commit/57c0ec3bd7bda75e03322a4b8df807b41fcf4e73))
* type the event API as a discriminated union ([#237](https://github.com/Miragon/camunda-web-modeler/issues/237)) ([30ed18d](https://github.com/Miragon/camunda-web-modeler/commit/30ed18d478be10256c26eea0a296bb5943228436))


### 🐞 Bug Fixes

* accessible divider and view toggle, DMN styles and event robustness ([#225](https://github.com/Miragon/camunda-web-modeler/issues/225)) ([ee1c209](https://github.com/Miragon/camunda-web-modeler/commit/ee1c209f7ac4d1eb1156f0eab992f2c1ad62e06f))
* **deps:** resolve open Dependabot alerts for source-map-js and dompurify ([#219](https://github.com/Miragon/camunda-web-modeler/issues/219)) ([331d27c](https://github.com/Miragon/camunda-web-modeler/commit/331d27cdb0a66cf16f2c74a880e0ed297484ee5a))
* **styles:** no focus frame around the canvas on mouse clicks ([#244](https://github.com/Miragon/camunda-web-modeler/issues/244)) ([c31ece9](https://github.com/Miragon/camunda-web-modeler/commit/c31ece9ccd1741910e34c3df68316895d1293aab))


### 🛠️ Misc

* **deps:** bump npm-all group (curated) from [#245](https://github.com/Miragon/camunda-web-modeler/issues/245) ([#246](https://github.com/Miragon/camunda-web-modeler/issues/246)) ([d583623](https://github.com/Miragon/camunda-web-modeler/commit/d583623a6afefbea4357a30f904b4e241081afc7))
* harden CI and release workflows and align tooling ([#224](https://github.com/Miragon/camunda-web-modeler/issues/224)) ([1ea6b82](https://github.com/Miragon/camunda-web-modeler/commit/1ea6b82d71f00e802e94d2fa243ff8a832ae49b4))
* lint with ESLint 10 compatible plugins, add Testing Library and coverage ([#243](https://github.com/Miragon/camunda-web-modeler/issues/243)) ([b4c57b2](https://github.com/Miragon/camunda-web-modeler/commit/b4c57b266643d427851e65588de0dd91b3f5b9c2))

## [0.2.0](https://github.com/Miragon/camunda-web-modeler/compare/v0.1.1...v0.2.0) (2026-10-08)


### 🎉 New Features

* add Vite dev playground (example app) for manual UI/UX testing ([#197](https://github.com/Miragon/camunda-web-modeler/issues/197)) ([ceb219c](https://github.com/Miragon/camunda-web-modeler/commit/ceb219ceb07fec2ecd2b95de29521f7874220224)), closes [#190](https://github.com/Miragon/camunda-web-modeler/issues/190)
* replace react-resizable-panels with a custom resizer ([#188](https://github.com/Miragon/camunda-web-modeler/issues/188)) ([19054e9](https://github.com/Miragon/camunda-web-modeler/commit/19054e9887dcf4d0b193094c00f54c05af1068bc))


### 🐞 Bug Fixes

* **deps:** resolve all open Dependabot security alerts in transitive deps ([#212](https://github.com/Miragon/camunda-web-modeler/issues/212)) ([7c5266a](https://github.com/Miragon/camunda-web-modeler/commit/7c5266a47dd9a948eb50f7d7c1de70352335eb9e))


### 🛠️ Misc

* **deps-dev:** bump @babel/eslint-parser from 7.25.1 to 7.25.9 ([#127](https://github.com/Miragon/camunda-web-modeler/issues/127)) ([bf6ac61](https://github.com/Miragon/camunda-web-modeler/commit/bf6ac61d0f9c4eafe7b512f5e60ea7db45b3bcc9))
* **deps-dev:** bump eslint-plugin-import from 2.30.0 to 2.31.0 ([#124](https://github.com/Miragon/camunda-web-modeler/issues/124)) ([a446f9d](https://github.com/Miragon/camunda-web-modeler/commit/a446f9de7d5344548abd1d0b4e7fef16ccbe81a8))
* **deps-dev:** bump eslint-plugin-react from 7.37.0 to 7.37.2 ([#128](https://github.com/Miragon/camunda-web-modeler/issues/128)) ([1d3e377](https://github.com/Miragon/camunda-web-modeler/commit/1d3e377e12b10f9cc73a0b459c4a2ac3c59f661b))
* **deps-dev:** bump globals from 15.9.0 to 15.11.0 ([#125](https://github.com/Miragon/camunda-web-modeler/issues/125)) ([da60a5b](https://github.com/Miragon/camunda-web-modeler/commit/da60a5b5e0d95f4760fe2fe9bbe02e90c6d41750))
* **deps-dev:** bump rollup from 4.23.0 to 4.24.0 ([#123](https://github.com/Miragon/camunda-web-modeler/issues/123)) ([58ec33d](https://github.com/Miragon/camunda-web-modeler/commit/58ec33d7d243d129408c0fc8dc5baf3bc5a6050b))
* **deps:** bump npm-all group (curated) and migrate to TS 6.0 ([#186](https://github.com/Miragon/camunda-web-modeler/issues/186)) ([97ff0ab](https://github.com/Miragon/camunda-web-modeler/commit/97ff0abd987b41906411e04c2ea2904c3b7700b3))
* **deps:** bump npm-all group (curated) from [#210](https://github.com/Miragon/camunda-web-modeler/issues/210) ([#211](https://github.com/Miragon/camunda-web-modeler/issues/211)) ([8580e67](https://github.com/Miragon/camunda-web-modeler/commit/8580e67d07ce17fdc88ce0e11825aa1827751797))
* **deps:** bump npm-all group (curated) from [#215](https://github.com/Miragon/camunda-web-modeler/issues/215) ([#218](https://github.com/Miragon/camunda-web-modeler/issues/218)) ([96f54fa](https://github.com/Miragon/camunda-web-modeler/commit/96f54fa977ae16fa8ef679df9df8bd1c4ff5f5eb))
* **deps:** bump the github-actions-all group across 1 directory with 2 updates ([#205](https://github.com/Miragon/camunda-web-modeler/issues/205)) ([be0e828](https://github.com/Miragon/camunda-web-modeler/commit/be0e828fe8742d89a68d88d68746f28a138149b8))
* **deps:** update dependencies ([a7387a8](https://github.com/Miragon/camunda-web-modeler/commit/a7387a8dbf4f3aa0b1a35827732b53b8216520e8))
* **dpes:** update deps ([#119](https://github.com/Miragon/camunda-web-modeler/issues/119)) ([510f0c7](https://github.com/Miragon/camunda-web-modeler/commit/510f0c72fdae3c2572ad4a4f617b3ceffeb3c4af))
* **release:** switch to release-please and npm trusted publishing ([#216](https://github.com/Miragon/camunda-web-modeler/issues/216)) ([047158b](https://github.com/Miragon/camunda-web-modeler/commit/047158bf5a8edc374d2f138127f27f0e3aa303c6))
* update dependencies ([4c9a49c](https://github.com/Miragon/camunda-web-modeler/commit/4c9a49c23c899911348acf04515fcd0967c3c50c))
* update dependencies ([13ede15](https://github.com/Miragon/camunda-web-modeler/commit/13ede15771da9945bd47a9dbce34c53af78aa4e1))
