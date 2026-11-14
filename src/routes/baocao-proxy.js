// Route: /baocao/proxy   (thay cho api/proxy.js của Vercel)
//  - GET  ?action=getSheets|getSheetData  → chỉ cho quản trị (cần header X-Admin-Token)
//  - POST nộp báo cáo (Mẫu 01/02)         → công khai, nhưng chỉ nhận đúng định dạng báo cáo
import { json, sameOrigin, callGas, verifyToken } from "../lib/gas.js";

const ALLOWED_GET = new Set(["getSheets", "getSheetData"]);

export async function onRequest({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  if (!env.GAS_URL_BAOCAO || !env.PROXY_KEY)
    return json({ error: "Chưa cấu hình GAS_URL_BAOCAO / PROXY_KEY trên Cloudflare." }, 500);
  try {
    if (request.method === "GET") {
      const q = Object.fromEntries(new URL(request.url).searchParams);
      if (!ALLOWED_GET.has(q.action)) return json({ error: "Action không hợp lệ." }, 400);
      const secret = env.TOKEN_SECRET || env.PROXY_KEY || env.ADMIN_PASSWORD;
      if (!(await verifyToken(secret, request.headers.get("X-Admin-Token"))))
        return json({ error: "Chưa đăng nhập quản trị." }, 401);
      return json(await callGas(env.GAS_URL_BAOCAO, { method: "GET", query: { action: q.action, sheet: q.sheet || "", key: env.PROXY_KEY } }));
    }
    if (request.method === "POST") {
      let b; try { b = JSON.parse(await request.text()); } catch { return json({ success: false, message: "Body không phải JSON hợp lệ." }, 400); }
      if (!b || !b.fileBase64 || !b.chibo || !b.loaiMau) return json({ success: false, message: "Thiếu dữ liệu báo cáo." }, 400);
      return json(await callGas(env.GAS_URL_BAOCAO, { method: "POST", body: { ...b, key: env.PROXY_KEY } }));
    }
    return json({ error: "Method Not Allowed" }, 405);
  } catch (e) { return json({ error: "Lỗi khi gọi Apps Script: " + e.message }, 502); }
}
