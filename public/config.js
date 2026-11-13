// Cấu hình công khai — KHÔNG chứa link Google Sheet/Apps Script hay mật khẩu.
// Các giá trị bí mật nằm trong biến môi trường Cloudflare (xem HUONG_DAN.md).
window.KTGS_CONFIG = {
  API: "/proxy",          // Cloudflare Pages Function: functions/proxy.js
  BAOCAO_URL: "baocao/"   // Địa chỉ ứng dụng Báo cáo kiểm tra (cùng tên miền). Tách site riêng thì điền URL đầy đủ.
};
