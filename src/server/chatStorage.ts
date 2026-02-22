import { BACKEND_API_BASE } from "../config/loginApiBaseUrl";

type ChatBindings = {
  CHAT_DB: D1LikeDatabase;
  CHAT_IMAGES: R2LikeBucket;
};

type D1LikeDatabase = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      run: () => Promise<unknown>;
      all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
    };
    run: () => Promise<unknown>;
  };
};

type R2LikeBucket = {
  put: (
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob | string,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (key: string) => Promise<{
    body: ReadableStream | null;
    httpMetadata?: { contentType?: string };
    etag?: string;
  } | null>;
};

type JwtPayload = {
  user_id?: string;
};

const IMAGE_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{5,120}$/;

export type ChatMessageRecord = {
  id: string;
  username: string;
  kind: "text" | "image";
  content: string;
  imageKey: string | null;
  createdMs: number;
  createdAt: string;
};

export const parseEmojiToken = (value: string) => {
  const match = value.match(/^\[\[\[([^:\]]+):([^\]]+)\]\]\]$/);
  if (!match) return null;
  return {
    pack: match[1],
    name: match[2],
  };
};

export const isValidImageKey = (value: string) => IMAGE_KEY_PATTERN.test(value);

export const getChatBindings = (locals: unknown): ChatBindings => {
  const env = (locals as { runtime?: { env?: Partial<ChatBindings> } })?.runtime
    ?.env;
  if (!env?.CHAT_DB || !env.CHAT_IMAGES) {
    throw new Error("Missing Cloudflare bindings: CHAT_DB or CHAT_IMAGES");
  }
  return {
    CHAT_DB: env.CHAT_DB,
    CHAT_IMAGES: env.CHAT_IMAGES,
  };
};

export const ensureChatSchema = async (db: D1LikeDatabase) => {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, username TEXT NOT NULL, kind TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', image_key TEXT, created_ms INTEGER NOT NULL, created_at TEXT NOT NULL)",
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_ms ON chat_messages (created_ms)",
    )
    .run();
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) return null;
    const normalized = payloadSegment.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4 || 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

export const getBearerToken = (request: Request) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
};

export const resolveUserFromRequest = async (request: Request) => {
  const token = getBearerToken(request);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const tokenUser = payload?.user_id;

  try {
    const verifyRes = await fetch(`${BACKEND_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!verifyRes.ok) return null;
  } catch {
    return null;
  }

  if (typeof tokenUser !== "string" || tokenUser.length === 0) {
    return null;
  }
  return tokenUser;
};

export const mapRowToMessage = (
  row: Record<string, unknown>,
): ChatMessageRecord => ({
  id: String(row.id || ""),
  username: String(row.username || ""),
  kind: (row.kind === "image" ? "image" : "text") as "text" | "image",
  content: String(row.content || ""),
  imageKey:
    typeof row.image_key === "string" && row.image_key.length > 0
      ? row.image_key
      : null,
  createdMs: Number(row.created_ms || 0),
  createdAt: String(row.created_at || ""),
});
