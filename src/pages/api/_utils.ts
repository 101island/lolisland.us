import type { Context } from "hono";

export const errorResp = (c: Context, status: number, msg: string) =>
  // biome-ignore lint/suspicious/noExplicitAny: Hono status code typing is strict, simply casting here
  c.json({ error: msg }, status as any);

// In a real app, this should definitely come from c.env, but keeping consistent with previous code for now.
// However, since we can't easily access c.env here without passing it, exporting a constant is fine for the secret key string if it's hardcoded.
// If it was meant to be env var, we'd access it inside handlers.
export const JWT_SECRET = "your-secret-key-change-this";
