// Route: POST /baocao/login — kiểm tra mật khẩu quản trị ở phía máy chủ (biến ADMIN_PASSWORD), trả token 8 giờ.
import { json, sameOrigin, safeEqual, signToken } from "../lib/gas.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  if (!env.ADMIN_PASSWORD) return json({ error: "Chưa cấu hình ADMIN_PASSWORD trên Cloudflare." }, 500);
  let b; try { b = await request.json(); } catch { return json({ error: "Body không hợp lệ." }, 400); }
  await new Promise((r) => setTimeout(r, 600)); // làm chậm dò mật khẩu
  if (!safeEqual(b.password || "", env.ADMIN_PASSWORD)) return json({ error: "Sai mật khẩu." }, 401);
  const token = await signToken(env.TOKEN_SECRET || env.PROXY_KEY || env.ADMIN_PASSWORD);
  return json({ token });
}
export const onRequest = () => json({ error: "Method Not Allowed" }, 405);
