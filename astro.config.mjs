import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  integrations: [react()],
  i18n: {
    defaultLocale: "zh-cn",
    locales: ["en", "zh-cn", "zh-hk", "ja"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
});
