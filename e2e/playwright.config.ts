import { defineConfig, devices } from "@playwright/test";

const viteExample = (name: string, port: number) => ({
    command: `yarn vite build examples/${name} && yarn vite preview examples/${name} --port ${String(port)} --strictPort`,
    cwd: "..",
    port,
    reuseExistingServer: false,
    timeout: 120_000,
});

export default defineConfig({
    testMatch: "*.e2e.ts",
    retries: 1,
    use: { ...devices["Desktop Chrome"] },
    webServer: [
        viteExample("react-vite", 4173),
        viteExample("vue-vite", 4174),
        {
            command: "python3 -m http.server 4175 --directory examples/react-cdn",
            cwd: "..",
            port: 4175,
            reuseExistingServer: false,
        },
    ],
});
