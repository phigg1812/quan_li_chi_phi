# Sổ theo dõi — bản web tiếng Việt

Ứng dụng quản lý chi tiêu dùng Firebase Authentication, Firestore và Storage.

## Phương thức đăng nhập

- Email và mật khẩu: đăng nhập, tự đăng ký và đặt lại mật khẩu.
- Google.
- Khi đăng ký bằng email, ứng dụng tự gửi thư xác minh email.

## Cấu hình Firebase

1. Tạo một Firebase project thuộc tài khoản của bạn.
2. Trong **Authentication → Sign-in method**, bật **Email/Password** và **Google**.
3. Tạo Firestore Database và Firebase Storage.
4. Thay `firebaseConfig` ở đầu `index.html` bằng cấu hình Web App của bạn.
5. Thêm tên miền triển khai vào **Authentication → Settings → Authorized domains**.
6. Triển khai `firestore.rules` và `storage.rules` đi kèm dự án.

Không lưu mật khẩu trong Firestore. Firebase Authentication chịu trách nhiệm lưu và bảo vệ thông tin đăng nhập.

## Chạy thử

Không mở trực tiếp bằng đường dẫn `file://`. Hãy phục vụ thư mục dự án bằng một máy chủ web tĩnh, sau đó mở địa chỉ máy chủ trên trình duyệt.

Ví dụ, nếu đã có Python:

```bash
python -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## Triển khai

Có thể triển khai thư mục gốc lên Firebase Hosting, Cloudflare Pages, Netlify, Vercel hoặc GitHub Pages. Dự án này không cần build APK.

## Cấu trúc dữ liệu

Dữ liệu của mỗi tài khoản nằm dưới `users/{uid}`. Security Rules chỉ cho phép người dùng đã đăng nhập đọc và ghi dữ liệu thuộc đúng `uid` của họ.
