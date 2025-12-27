import { compare, hash } from "bcryptjs";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { Bindings, User } from "../_types";
import { errorResp, JWT_SECRET } from "../_utils";

const auth = new Hono<{ Bindings: Bindings }>();

// Register
auth.post("/register", async (c) => {
  const { username, password, qq } = await c.req.json();

  if (!username || !password)
    return errorResp(c, 400, "Username and password required");

  // Hash password
  const hashedPassword = await hash(password, 10);

  // Verify QQ if provided
  if (qq) {
    // Check verified status in DO
    const id = c.env.VERIFICATION.idFromName(qq);
    const obj = c.env.VERIFICATION.get(id);
    const doResp = await obj.fetch("http://do/status");
    const { status } = (await doResp.json()) as { status: string };

    if (status !== "verified") {
      return errorResp(c, 403, "QQ verification required or expired");
    }

    // Cleanup DO after successful registration (optional, but good practice if not done elsewhere)
    // Actually, let's keep it in /status logic or let it expire.
    // But here we just check.
  }

  try {
    // Insert into users tables
    await c.env.DB.prepare(
      `INSERT INTO users (username, password, qq) VALUES (?, ?, ?)`,
    )
      .bind(username, hashedPassword, qq || null)
      .run();

    return c.json({ message: "User registered successfully", username });
  } catch (e: unknown) {
    if (e instanceof Error && e.message?.includes("UNIQUE")) {
      return errorResp(c, 400, "Username already exists");
    }
    return errorResp(
      c,
      500,
      `Internal server error: ${e instanceof Error ? e.message : "Unknown error"}`,
    );
  }
});

// Login
auth.post("/login", async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password)
    return errorResp(c, 400, "Username and password required");

  const user = await c.env.DB.prepare(`SELECT * FROM users WHERE username = ?`)
    .bind(username)
    .first<User>();
  if (!user) return errorResp(c, 401, "Invalid username or password");

  const valid = await compare(password, user.password || "");
  if (!valid) return errorResp(c, 401, "Invalid username or password");

  const token = await sign(
    {
      user_id: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
    JWT_SECRET,
  );
  return c.json({ token, qq: user.qq });
});

// Start QQ Auth
auth.post("/auth/qq/start", async (c) => {
  const { qq } = await c.req.json();
  if (!qq) return errorResp(c, 400, "QQ is required");

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in DO
  const id = c.env.VERIFICATION.idFromName(qq);
  const obj = c.env.VERIFICATION.get(id);
  await obj.fetch("http://do/start", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  return c.json({ code });
});

// QQ Status
auth.get("/auth/qq/status", async (c) => {
  const qq = c.req.query("qq");
  if (!qq) return errorResp(c, 400, "QQ is required");

  // Check verified in DO
  const id = c.env.VERIFICATION.idFromName(qq);
  const obj = c.env.VERIFICATION.get(id);
  const doResp = await obj.fetch("http://do/status");
  const { status } = (await doResp.json()) as { status: string };

  if (status !== "verified") {
    return c.json({ status: "pending" });
  }

  // Check if already registered
  const user = await c.env.DB.prepare(`SELECT * FROM users WHERE qq = ?`)
    .bind(qq)
    .first<User>();
  if (user) {
    const token = await sign(
      {
        user_id: user.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      },
      JWT_SECRET,
    );

    // Cleanup DO
    await obj.fetch("http://do/", { method: "DELETE" });

    return c.json({
      status: "authenticated",
      token,
      is_registered: true,
      qq: user.qq,
    });
  }

  return c.json({ status: "verified", is_registered: false });
});

export default auth;
