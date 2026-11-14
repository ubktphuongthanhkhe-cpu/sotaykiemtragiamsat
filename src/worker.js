// Cloudflare Worker: phục vụ website tĩnh (thư mục public/) và 3 đường dẫn API.
//   POST /proxy            → Sổ tay
//   *    /baocao/proxy     → Báo cáo kiểm tra
//   POST /baocao/login     → đăng nhập quản trị Báo cáo
import * as sotay from "./routes/sotay.js";
import * as bcProxy from "./routes/baocao-proxy.js";
import * as bcLogin from "./routes/baocao-login.js";
import { json } from "./lib/gas.js";

const ROUTES = {
  "/proxy": sotay,
  "/baocao/proxy": bcProxy,
  "/baocao/login": bcLogin,
};

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const mod = ROUTES[pathname.replace(/\/+$/, "")];
    if (!mod) return env.ASSETS.fetch(request); // file tĩnh
    const handler = mod["onRequest" + request.method[0] + request.method.slice(1).toLowerCase()] || mod.onRequest;
    if (!handler) return json({ ok: false, error: "Method Not Allowed" }, 405);
    return handler({ request, env, ctx });
  },
};
