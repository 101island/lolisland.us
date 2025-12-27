import { Hono } from "hono";
import type { Bindings } from "../_types";
import { errorResp } from "../_utils";

const internal = new Hono<{ Bindings: Bindings }>();

internal.use(async (c, next) => {
  const token = c.req.header("X-Internal-Token");
  if (token !== c.env.QBOT_TOKEN) {
    return errorResp(c, 401, "Unauthorized");
  }
  await next();
});

// Internal Bot Verify
internal.post("/verify", async (c) => {
  const { qq, code } = await c.req.json();
  if (!qq || !code) return errorResp(c, 400, "QQ and Code required");

  const id = c.env.VERIFICATION.idFromName(qq);
  const obj = c.env.VERIFICATION.get(id);
  const resp = await obj.fetch("http://do/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  if (resp.status !== 200) {
    return errorResp(c, 400, "Invalid or expired code");
  }

  return c.json({ status: "ok" });
});

export default internal;
