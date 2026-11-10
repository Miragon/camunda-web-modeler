import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    server: {
        fs: {
            allow: ["../.."],
        },
    },
    optimizeDeps: {
        include: ["monaco-editor", "@monaco-editor/react"],
    },
});
