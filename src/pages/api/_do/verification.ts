import { DurableObject } from "cloudflare:workers";

export class VerificationDO extends DurableObject {
  statusResolvers: Array<(res: Response) => void> = [];

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/start") {
      const { code } = (await request.json()) as { code: string };
      await this.ctx.storage.put("code", code);
      // 5 mins expiration for code
      await this.ctx.storage.setAlarm(Date.now() + 300 * 1000);
      return new Response("ok");
    }

    if (request.method === "POST" && path === "/verify") {
      const { code: reqCode } = (await request.json()) as { code: string };
      const storedCode = await this.ctx.storage.get<string>("code");

      if (!storedCode || storedCode !== reqCode) {
        return new Response("Invalid or expired code", { status: 400 });
      }

      // Mark as verified
      await this.ctx.storage.put("verified", "1");
      // Reset alarm to 5 mins for verified status expiration
      await this.ctx.storage.setAlarm(Date.now() + 300 * 1000);

      // Resolve all waiting status requests
      const verifiedResponse = JSON.stringify({ status: "verified" });
      this.statusResolvers.forEach((resolve) => {
        resolve(
          new Response(verifiedResponse, {
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
      this.statusResolvers = [];

      return new Response("ok");
    }

    if (request.method === "GET" && path === "/status") {
      const verified = await this.ctx.storage.get<string>("verified");
      if (verified === "1") {
        return new Response(JSON.stringify({ status: "verified" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Long polling: wait for verification or timeout (30s)
      return new Promise((resolve) => {
        this.statusResolvers.push(resolve);

        // 30s timeout
        setTimeout(() => {
          const index = this.statusResolvers.indexOf(resolve);
          if (index !== -1) {
            this.statusResolvers.splice(index, 1);
            resolve(
              new Response(JSON.stringify({ status: "pending" }), {
                headers: { "Content-Type": "application/json" },
              }),
            );
          }
        }, 30000);
      });
    }

    if (request.method === "DELETE" && path === "/") {
      await this.ctx.storage.deleteAll();
      // Cancel any pending requests with 'pending' status so they don't hang
      this.statusResolvers.forEach((resolve) => {
        resolve(
          new Response(JSON.stringify({ status: "pending" }), {
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
      this.statusResolvers = [];
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
    this.statusResolvers.forEach((resolve) => {
      resolve(
        new Response(JSON.stringify({ status: "pending" }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    this.statusResolvers = [];
  }
}
