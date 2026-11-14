// Route: POST /proxy   (Cloudflare Pages Functions — thư mục "functions", KHÔNG dùng "api/")
// Sổ tay gửi {action, code, ...} → proxy thêm PROXY_KEY rồi chuyển tới Apps Script.
import { json, sameOrigin, callGas } from "../lib/gas.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: "Forbidden" }, 403);
  if (!env.GAS_URL || !env.PROXY_KEY)
    return json({ ok: false, error: "Chưa cấu hình GAS_URL / PROXY_KEY trên Cloudflare." }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Body không phải JSON." }, 400); }
  try {
    const out = await callGas(env.GAS_URL, { method: "POST", body: { ...body, key: env.PROXY_KEY } });
    return json(out);
  } catch (e) { return json({ ok: false, error: e.message }, 502); }
}
export const onRequest = () => json({ ok: false, error: "Method Not Allowed" }, 405); // GET/khác
