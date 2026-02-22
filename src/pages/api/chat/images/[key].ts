import type { APIRoute } from "astro";
import {
  getChatBindings,
  isValidImageKey,
} from "../../../../server/chatStorage";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key || "";
  if (!isValidImageKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  const { CHAT_IMAGES } = getChatBindings(locals);
  const object = await CHAT_IMAGES.get(key);
  if (!object?.body) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.etag || "",
    },
  });
};
