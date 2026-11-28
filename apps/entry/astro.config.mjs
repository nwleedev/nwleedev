import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  markdown: {
    shikiConfig: { theme: "github-light-high-contrast" },
  },
  redirects: {
    "/better-terms": "/projects/terms",
    "/projects/use-better-terms": "/projects/terms",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
