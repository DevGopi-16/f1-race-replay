import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    publicDir: "public",
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
            },
            "/auth": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
            },
            "/profile": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
            },
            "/static": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
            },
        },
    },
    build: {
        sourcemap: true,
    },
});
