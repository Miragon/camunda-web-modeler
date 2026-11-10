# Contributing

## Setup

You need Node.js 22 or newer (see `.nvmrc`) and Yarn 4 via
[Corepack](https://github.com/nodejs/corepack). Node.js 25 and newer no longer ship
Corepack, install it with `npm install -g corepack` there.

```sh
corepack enable
yarn install
```

## Scripts

```sh
yarn dev            # playground with BPMN and DMN at http://localhost:5173
yarn dev:vue        # the Vue example
yarn test           # unit and component tests
yarn test:coverage  # the same with a coverage report (coverage/index.html)
yarn test:e2e       # opens all examples in Chromium (once: yarn playwright install chromium)
yarn lint           # ESLint, warnings fail the check
yarn format:check   # Prettier
yarn typecheck      # sources, tests, examples, e2e tests and the code in README.md and docs/
yarn build          # library output in dist/
```

## Examples

The Vite examples in [examples/](examples) import the library from `../../src`, so they run
against the current sources. The [react-cdn](examples/react-cdn) example loads the latest
published release; serve the folder with any static web server, e.g.
`npx serve examples/react-cdn`.

## Pull requests and releases

Pull request titles must follow
[Conventional Commits](https://www.conventionalcommits.org/). Releases, the version bump and
CHANGELOG.md are created by release-please from them. Breaking changes get a section in
[MIGRATION.md](MIGRATION.md).
