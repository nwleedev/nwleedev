import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  redirects: {
    "/better-terms": "/projects/use-better-terms",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
