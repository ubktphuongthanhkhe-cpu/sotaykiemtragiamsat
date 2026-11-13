// Hàm dùng chung cho các Cloudflare Pages Function.
export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

// Chỉ nhận yêu cầu từ chính trang web này (chặn trang khác gọi ké proxy)
export function sameOrigin(request) {
  const o = request.headers.get("Origin");
  return !o || o === new URL(request.url).origin;
}

// Gọi Apps Script phía máy chủ. Link GAS + khóa PROXY_KEY chỉ tồn tại trong biến môi trường Cloudflare.
export async function callGas(gasUrl, { method, query = {}, body }) {
  const url = new URL(gasUrl);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method,
    redirect: "follow", // Apps Script trả 302 sang googleusercontent
    headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : {},
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error("Apps Script trả về dữ liệu không hợp lệ (có thể chưa triển khai lại phiên bản mới)."); }
}

// Token đăng nhập quản trị (HMAC-SHA256, hết hạn sau 8 giờ)
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
export async function signToken(secret, ttlMs = 8 * 3600 * 1000) {
  const exp = String(Date.now() + ttlMs);
  return exp + "." + (await hmac(secret, exp));
}
export async function verifyToken(secret, token) {
  if (!token) return false;
  const [exp, sig] = String(token).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(secret, exp));
}
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
