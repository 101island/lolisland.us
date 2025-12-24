import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ request, redirect }) => {
  const acceptLang = request.headers.get("accept-language") || "";

  // Parse and sort languages by quality (q)
  // Example: "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7"
  const languages = acceptLang
    .split(",")
    .map((part) => {
      const [code, qPart] = part.split(";");
      const q = qPart ? parseFloat(qPart.split("=")[1]) : 1.0;
      return { code: code.trim().toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  // Iterate through user's preferred languages in order
  for (const lang of languages) {
    if (lang.code.startsWith("zh")) {
      return redirect("/zh-cn/");
    }
    if (lang.code.startsWith("en")) {
      return redirect("/en/");
    }
  }

  // Fallback to default
  return redirect("/en/");
};
