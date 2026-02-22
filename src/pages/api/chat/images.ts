import type { APIRoute } from "astro";
import {
  getChatBindings,
  resolveUserFromRequest,
} from "../../../server/chatStorage";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const extensionFromType = (type: string) => {
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return "jpg";
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = await resolveUserFromRequest(request);
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { CHAT_IMAGES } = getChatBindings(locals);
  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return json({ error: "Image file is required" }, 400);
  }
  if (!file.type.startsWith("image/")) {
    return json({ error: "Unsupported file type" }, 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    return json({ error: "Image is too large" }, 400);
  }

  const ext = extensionFromType(file.type);
  const key = `${Date.now()}-${crypto.randomUUID().replaceAll("-", "")}.${ext}`;
  await CHAT_IMAGES.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return json({
    key,
    url: `/api/chat/images/${key}`,
  });
};
