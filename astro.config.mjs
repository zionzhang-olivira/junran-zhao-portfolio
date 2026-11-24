import { defineConfig } from "astro/config";
export default defineConfig({
  site: "https://jystud.io",
  output: "static",
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "never" },
  devToolbar: { enabled: false },
});
