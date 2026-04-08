import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const basePath = process.env.BASE_PATH || "/";

const config = defineConfig({
  base: basePath,
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      pages: [
        { path: "/" },
        { path: "/tracker" },
        { path: "/settings" },
        { path: "/about" },
      ],
      prerender: {
        enabled: true,
      },
      spa: {
        prerender: {
          outputPath: "/",
        },
      },
    }),
    viteReact(),
  ],
});

export default config;
