# Sổ theo dõi — bản web tiếng Việt

Ứng dụng quản lý chi tiêu dùng Firebase Authentication và Firestore, chạy như một web app (có thể ghim ra màn hình chính iPhone).

## Các file trong dự án
- `index.html`: toàn bộ giao diện và mã chạy của app.
- `manifest.json`: thông tin để ghim app ra màn hình chính.
- `sw.js`: service worker, giúp mở app nhanh hơn và dùng được khi mạng yếu.
- `firestore.rules`: quy tắc bảo mật Firestore (mỗi người chỉ đọc/ghi dữ liệu của mình).
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`: biểu tượng.

## Phương thức đăng nhập
- Email và mật khẩu: đăng nhập, tự đăng ký và đặt lại mật khẩu (có gửi thư xác minh email).
- Google.

## Cấu hình Firebase
1. Tạo một Firebase project thuộc tài khoản của bạn.
2. Trong **Authentication → Sign-in method**, bật **Email/Password** và **Google**.
3. Tạo Firestore Database.
4. Thay `firebaseConfig` ở đầu `index.html` bằng cấu hình Web App của bạn.
5. Thêm tên miền triển khai vào **Authentication → Settings → Authorized domains**.
6. Triển khai `firestore.rules`.

Không lưu mật khẩu trong Firestore. Firebase Authentication chịu trách nhiệm lưu và bảo vệ thông tin đăng nhập.

## Triển khai
Đưa toàn bộ file trong thư mục lên GitHub Pages (hoặc hosting HTTPS khác). Service worker và camera chỉ hoạt động qua HTTPS. Không mở trực tiếp bằng `file://`.

## Cập nhật bản mới
Trang tải từ mạng trước nên thường có bản mới ngay sau khi triển khai (có thể cần đợi 1–2 phút). Nếu vẫn thấy bản cũ, mở địa chỉ kèm `?v=số-bất-kỳ`, hoặc xóa icon rồi ghim lại. Dòng "bản QR vXX" ở cuối cửa sổ thanh toán cho biết bạn đang chạy bản nào.

## Lưu ý
- Khóa Gemini (phân loại tự động) chỉ lưu trên thiết bị của bạn, không nằm trong mã nguồn.
- Sao lưu và khôi phục dùng file JSON; hãy tự tải một bản sao lưu trước khi khôi phục.
