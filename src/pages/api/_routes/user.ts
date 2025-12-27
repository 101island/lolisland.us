import { Hono } from "hono";
import { verify } from "hono/jwt";
import type { Bindings, User } from "../_types";
import { errorResp, JWT_SECRET } from "../_utils";

const user = new Hono<{ Bindings: Bindings }>();

// Me
user.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return errorResp(c, 401, "Authorization header required");

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = await verify(token, JWT_SECRET);
    // username is now PK
    const user = await c.env.DB.prepare(
      `SELECT username, qq FROM users WHERE username = ?`,
    )
      .bind(payload.user_id)
      .first<User>();
    if (!user) return errorResp(c, 404, "User not found");

    return c.json(user);
  } catch (_e) {
    return errorResp(c, 401, "Invalid token");
  }
});

export default user;
