import type { APIRoute } from "astro";
import app from "./_app";

export const prerender = false;

export const ALL: APIRoute = async (context) => {
  return app.fetch(
    context.request,
    context.locals.runtime.env,
    context.locals.runtime.ctx,
  );
};
