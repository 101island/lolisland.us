import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./_routes/auth";
import internal from "./_routes/internal";
import user from "./_routes/user";
import type { Bindings } from "./_types";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow production domain
      if (origin === "https://lolisland.us") return origin;
      // Allow local development
      if (origin.startsWith("http://localhost:")) return origin;
      // Allow Cloudflare Pages
      if (origin.endsWith(".lolisland.pages.dev")) return origin;
      // Block others (or return null)
      return null;
    },
    allowHeaders: ["Content-Type", "Authorization", "X-Custom-Header"],
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Mount routers
app.route("/api", auth);
app.route("/api", user);
app.route("/api/internal/bot", internal);

export { VerificationDO } from "./_do/verification";
export default app;
