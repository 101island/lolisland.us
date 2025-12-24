import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  integrations: [react()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-cn"],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
