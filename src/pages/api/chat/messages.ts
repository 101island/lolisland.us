import type { APIRoute } from "astro";
import {
  ensureChatSchema,
  getChatBindings,
  isValidImageKey,
  mapRowToMessage,
  parseEmojiToken,
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

export const GET: APIRoute = async ({ url, locals }) => {
  const { CHAT_DB } = getChatBindings(locals);
  await ensureChatSchema(CHAT_DB);

  const rawLimit = Number(url.searchParams.get("limit") || "30");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(50, Math.max(1, Math.floor(rawLimit)))
    : 30;
  const before = Number(url.searchParams.get("before") || "0");

  const query =
    before > 0
      ? CHAT_DB.prepare(
          "SELECT id, username, kind, content, image_key, created_ms, created_at FROM chat_messages WHERE created_ms < ? ORDER BY created_ms DESC LIMIT ?",
        ).bind(before, limit)
      : CHAT_DB.prepare(
          "SELECT id, username, kind, content, image_key, created_ms, created_at FROM chat_messages ORDER BY created_ms DESC LIMIT ?",
        ).bind(limit);

  const result = await query.all<Record<string, unknown>>();
  const messages = result.results.map(mapRowToMessage).reverse();
  return json({ messages });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = await resolveUserFromRequest(request);
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { CHAT_DB } = getChatBindings(locals);
  await ensureChatSchema(CHAT_DB);

  let payload: { text?: string; imageKey?: string };
  try {
    payload = (await request.json()) as { text?: string; imageKey?: string };
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const imageKey = typeof payload.imageKey === "string" ? payload.imageKey : "";
  if (!text && !imageKey) {
    return json({ error: "Message is empty" }, 400);
  }
  if (text.length > 2000) {
    return json({ error: "Message too long" }, 400);
  }
  if (imageKey && !isValidImageKey(imageKey)) {
    return json({ error: "Invalid image key" }, 400);
  }

  if (text) {
    const emoji = parseEmojiToken(text);
    if (emoji && (emoji.pack.length > 32 || emoji.name.length > 32)) {
      return json({ error: "Emoji token is too long" }, 400);
    }
  }

  const createdMs = Date.now();
  const id = `${createdMs}-${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date(createdMs).toISOString();
  const kind = imageKey ? "image" : "text";

  await CHAT_DB.prepare(
    "INSERT INTO chat_messages (id, username, kind, content, image_key, created_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(id, user, kind, text, imageKey || null, createdMs, createdAt)
    .run();

  return json({
    message: {
      id,
      username: user,
      kind,
      content: text,
      imageKey: imageKey || null,
      createdMs,
      createdAt,
    },
  });
};
