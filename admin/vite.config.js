import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "";

  return {
    plugins: [react()],
    server: { port: 5174 },
    preview: { port: 3000, host: true },
    build: {
      outDir: "dist",
      sourcemap: false,
      emptyOutDir: true,
    },
    define: {
      __BUILD_API_URL__: JSON.stringify(apiUrl),
    },
  };
});
