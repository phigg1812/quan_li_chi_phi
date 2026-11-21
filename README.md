# Tiệm Hoa Quý Cảnh — Quản lý đơn đặt hoa

**Phiên bản mã nguồn đóng gói:** V3.3.1 (Beta)  
**Nền tảng:** PWA / Cloudflare Workers + D1 + R2 + Workers AI / GitHub  
**Tài liệu:** README tổng hợp duy nhất, bao gồm giới thiệu, triển khai, lưu ý và lịch sử thay đổi.

> **Quan trọng:** V3.2.1 chưa được kiểm thử end-to-end trên hệ thống Cloudflare production hoặc thiết bị iPhone/Android thực tế. Hãy sao lưu D1/R2 và thử nghiệm trước khi thay bản đang sử dụng. Khi upload lên GitHub, **không ghi đè `wrangler.toml`** nếu file đang chạy đã chứa Database ID/bindings đúng; không đưa Secrets hoặc `.dev.vars` lên GitHub.

## Tính năng và kiến trúc hiện tại

- 4 menu chính: **Đơn hàng, Khách hàng, Báo cáo, Cài đặt**.
- Thẻ đơn có ảnh mẫu hoặc avatar chữ cái, giờ nhận/giao, giá, đã thu, còn phải thu; nút gọi, chi tiết, hoàn thành và hoàn tác.
- Nhập đơn bằng tay hoặc giọng nói; ghi âm thời gian thực trên trình duyệt hỗ trợ, fallback tùy thiết bị/dịch vụ AI.
- Khách gửi yêu cầu qua `/dat-hoa.html`; yêu cầu nằm ở **Chờ duyệt**, chỉ chuyển thành đơn cần làm khi chủ tiệm xác nhận.
- Trang đặt hoa của khách **không còn QR thanh toán**: khách gửi yêu cầu rồi gọi tiệm; tiệm tự xác nhận giá và cách thanh toán. Giá khách nhập chỉ để tham khảo, tiệm sửa được khi bấm Nhận làm đơn.
- Thông báo Web Push và lịch nhắc; lịch sử thông báo lưu trong D1, trạng thái đã đọc lưu trên thiết bị.
- Xuất dữ liệu **CSV** mở bằng Excel (chưa xuất XLSX chuẩn), chức năng sao lưu dữ liệu.
- Ảnh lưu ở R2 private; đơn hàng/thông tin ứng dụng lưu trong D1.

## Cấu trúc dự án

```text
public/                 Giao diện PWA, ảnh, icon, trang đặt hoa
  index.html
  app.js
  style.css
  sw.js
  manifest.webmanifest
  dat-hoa.html
  dat-hoa.js
src/                    Backend Cloudflare Worker
  index.js
  parse.js
scripts/vapid.mjs       Tạo khóa thông báo đẩy
wrangler.toml           Cấu hình triển khai — cần giữ ID/bindings thực tế
package.json
README.md               Tài liệu duy nhất, kèm lịch sử thay đổi
```

## Cài đặt và triển khai

1. Sao lưu mã nguồn GitHub, D1 và R2 trước khi cập nhật.
2. Kiểm tra `wrangler.toml` trên GitHub có `database_id` thật, R2 binding và tên Worker đúng. **Không thay file đang hoạt động bằng cấu hình mẫu trong ZIP**.
3. Đưa mã nguồn vào đúng đường dẫn gốc của repository: `public/*`, `src/*`, `scripts/*`.
4. Cloudflare Workers & Pages dùng deploy command `npx wrangler deploy`; sau Commit lên `main`, kiểm tra bản Build mới có `Ready` và đang phục vụ traffic.
5. Secrets (`USERS`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, API keys nếu dùng) được cấu hình riêng trong Cloudflare → Worker → Settings → Variables and Secrets; không lưu trong GitHub.
6. `VAPID_SUBJECT` phải có dạng `mailto:diachi@email.com` trong cấu hình thực tế.
7. Trong ứng dụng, kiểm tra đăng nhập, thêm/chỉnh đơn, thu tiền, ảnh R2, yêu cầu khách tại `/dat-hoa.html`, lịch nhắc và các thiết bị nhận Push.
8. Kiểm tra thêm bảng D1 do code tạo khi cần (`customer_requests`, `public_rate`, `notification_history`); không tự xóa bảng hoặc dữ liệu cũ.

### Cài trên điện thoại

- **Android:** Chrome → mở URL Worker → menu → Cài đặt ứng dụng / Thêm vào màn hình chính → mở app → cho phép thông báo.
- **iPhone iOS 16.4+:** Safari → Chia sẻ → Thêm vào Màn hình chính → mở app từ icon → cho phép thông báo.
- Push có thể bị ảnh hưởng bởi quyền thông báo, kết nối mạng, Focus và tiết kiệm pin; không đảm bảo đúng từng phút.

## Bật chống spam Turnstile (không bắt buộc)
Cloudflare → Turnstile → Add widget (miễn phí) → lấy **Site key** và **Secret key**. Trong Worker → Settings → Variables and Secrets thêm `TURNSTILE_SITEKEY` (biến thường) và `TURNSTILE_SECRET` (secret). Không thêm thì trang đặt hoa vẫn chạy với giới hạn IP/số điện thoại.

## Kiểm thử và sao lưu
- `npm test` chạy các bài kiểm tra tính tiền/ngày giờ (cần Node 20+).
- Tải sao lưu JSON ở Cài đặt rồi chạy `npm run check-backup -- ten-file.json` để chắc file đọc được. Nên thử khôi phục vào cơ sở dữ liệu thử ít nhất một lần.

## Lưu ý về bảo mật, thanh toán và vận hành

- Địa chỉ `workers.dev` có thể được truy cập công khai. API quản trị phải yêu cầu xác thực, còn form khách cần chống spam và giới hạn upload.
- QR chuyển khoản chỉ cung cấp thông tin thanh toán; **không tự xác nhận giao dịch**. Chủ tiệm đối chiếu số tiền thực nhận trước khi chọn Chưa nhận / Đã cọc / Đã thu đủ.
- Yêu cầu từ QR chỉ ở Chờ duyệt cho đến khi được nhận làm; nếu khách đã chuyển tiền mà tiệm từ chối cần xử lý hoàn tiền thủ công, không xóa lịch sử.
- Ảnh QR đặt hoa có thể dùng dịch vụ ngoài, còn ảnh VietQR từ nhà cung cấp ảnh QR; yêu cầu kết nối mạng và cần kiểm tra chính sách sử dụng khi triển khai.
- Xuất dữ liệu CSV có thể chứa số điện thoại và thông tin cá nhân của khách; hạn chế quyền tải và bảo vệ file sau khi xuất.
- Khi cập nhật PWA, cache hoặc Service Worker có thể giữ bản cũ: kiểm tra Deploy rồi mở lại ứng dụng hoặc làm mới cache.

## Lịch sử thay đổi (Changelog)

### V3.3.6
- Phối màu gọn: gộp 2 bảng màu CSS thành một; xanh lá chỉ cho nút chính và mục đang chọn; đỏ chỉ cho việc gấp (vạch đỏ bên trái thẻ quá hạn thay cho viền đỏ); nút Gọi và thẻ giao hoa chuyển sang xám; avatar một tông; chữ đỏ và xanh dương đạt tương phản 4.5:1.
- Nhắc nhở đầu trang gọn một dòng, bấm để xem đủ, có nút ẩn (nhớ 3 ngày).
- Trang đặt hoa: ảnh tối đa 5 MB (ảnh lớn tự thu nhỏ trước khi gửi), nút chọn ảnh bằng tiếng Việt kèm xem trước, ô giá tự thêm dấu chấm hàng nghìn, ô ngày/giờ hiện chữ gợi ý. Ô giá trong ứng dụng cũng có dấu chấm.

## V3.3.2
- Sửa kéo xuống để làm mới (trước đây mã nằm ngoài phạm vi nên không chạy); bỏ hiệu ứng đẩy `main` để không bị đôi với bounce của iPhone.
- Form nhập tay: bỏ công tắc, bấm chip "Chưa chốt giờ" sẽ hiện phần giờ dự kiến bên dưới.
- Dán ảnh: nút "Dán ảnh đã sao chép", Ctrl+V và kéo thả ảnh (form thêm đơn và chi tiết đơn).
- Nút "Nói để ghi đơn" chỉ bung chữ khi ở sát đầu trang.
- Khôi phục bounce của iPhone trong bảng (`overscroll-behavior:auto`).
- Cài đặt: icon SVG thay emoji, gộp ô trùng; bỏ emoji trong tiêu đề thông báo.

## V3.3.1 — Tinh chỉnh giao diện (bản hiện tại)
- Thẻ đầu trang: **Hôm nay (d/m), Ngày mai (d/m), Ngày kia (d/m), Tất cả đơn**; bỏ hàng lọc vuốt ngang. "Chưa thu đủ" nằm trong **Báo cáo → Cần chú ý**.
- Cửa sổ trượt: bỏ thanh nắm phía trên (đã có nút Đóng); không còn lộ trang phía dưới khi vuốt quá.
- Xuất dữ liệu: mặc định từ ngày đầu tháng đến ngày cuối tháng, vẫn chọn ngày khác được.
- Cài đặt nhắc nhở: bỏ biểu tượng ở tên nhóm; ô giờ và ô tần suất căn trái đồng nhất.
- Nút **Nói để ghi đơn**: thu tròn từ từ khi cuộn xuống, bung ra từ từ khi cuộn lên.
- **File thay đổi so với V3.3:** `public/app.js`, `public/core.js`, `public/index.html`, `public/style.css`, `public/sw.js`, `test/core.test.mjs`, `README.md`.

### V3.3 — Bảo mật, nút nói cố định, dùng được khi mất mạng
- **Trang đặt hoa của khách:** bỏ QR/VietQR và nút "Tôi đã chuyển khoản"; sau khi gửi có nút **Gọi tiệm** (cài số trong Cài đặt → Thông tin tiệm cho khách). Giá khách nhập chỉ để tham khảo, tiệm sửa khi nhận làm.
- **Chống spam:** tối đa 6 yêu cầu/giờ/IP, 80/giờ toàn trang, 3 yêu cầu chờ/số điện thoại; có thể bật Cloudflare Turnstile (xem bên dưới).
- **Ảnh khách gửi:** kiểm tra nội dung thật (JPEG/PNG/WebP), không tin loại file do trình duyệt khai; ảnh của yêu cầu bị từ chối >7 ngày, đã chuyển vào đơn >1 ngày hoặc chờ >30 ngày được tự xoá khỏi R2.
- **Giao diện:** nút **Nói để ghi đơn** nổi cố định ở nửa dưới; hộp xác nhận trượt từ dưới lên thay cho `confirm()`/`alert()` (nút Huỷ chọn sẵn); **xoá đơn không hỏi mà cho Hoàn tác 7 giây**; kéo xuống làm mới có hiệu ứng kéo theo nội dung và rung nhẹ.
- **Thông báo:** chỉ thông báo "đơn quá giờ" mới nằm lại đến khi bấm; các thông báo khác tự mất.
- **Ngoại tuyến:** service worker lưu giao diện, mất mạng vẫn mở được app và xem đơn đã lưu (không ghi được thay đổi).
- **Sao lưu:** thêm bảng `customer_requests`, `counters`; thêm `npm run check-backup -- file.json` để kiểm tra file sao lưu.
- **Mã nguồn:** hàm tính tiền/ngày giờ tách ra `public/core.js` và có `npm test` (8 bài kiểm tra). Sửa lỗi tìm không dấu không khớp chữ Đ hoa.
- **File thay đổi so với V3.2.1:** `src/index.js`, `public/index.html`, `public/app.js`, `public/core.js` (mới), `public/style.css`, `public/sw.js`, `public/dat-hoa.html`, `public/dat-hoa.js`, `scripts/check-backup.mjs` (mới), `test/core.test.mjs` (mới), `package.json`, `README.md`.

### V3.2.1 — Khung iPhone và thêm ảnh
- Ổn định chiều rộng giao diện và các sheet khi nhập liệu trên iPhone; ô nhập tối thiểu 16px nhằm giảm tình trạng Safari tự zoom khi focus.
- Ảnh đã có và ô **Thêm ảnh** cùng kích thước, căn đều trong grid.
- Gộp thao tác chụp/chọn ảnh vào **một nút Thêm ảnh**, bỏ nút camera riêng và input file hệ thống hiển thị dư thừa.
- Vẫn cho phép người dùng phóng to bằng các tính năng trợ năng của thiết bị.
- **File thay đổi so với V3.2:** `public/app.js`, `public/style.css`.

### V3.2 — Tinh chỉnh giao diện iPhone/Android
- Hạ và thu gọn menu dưới, bo tròn và tính safe area.
- Đổi đầu trang thành **Quản lý đơn hàng / Hoa Tươi Quý Cảnh**; logo rõ hơn, không bóng.
- Kính lúp mở tìm kiếm riêng; tránh luôn hiện ô tìm kiếm chiếm chỗ.
- Thêm kéo xuống làm mới tại đầu trang, không kích hoạt trong cửa sổ sheet.
- Bỏ hiệu ứng co/nháy cả thẻ đơn khi chạm Gọi hoặc Chi tiết.
- Thu thông báo hoàn thành và Hoàn tác thành một hàng; căn chỉnh lại phần Cài đặt thông báo.
- **File thay đổi so với V3.1:** `public/index.html`, `public/style.css`, `public/app.js`.

### V3.1 — Giao diện, Báo cáo và lịch sử thông báo
- Giao diện chính gọn: logo QC, tìm kiếm cạnh chuông; nút **Nói để ghi đơn** nổi bật hơn nút nhập tay.
- Bộ lọc ngày nằm một hàng, cuộn ngang; thẻ đơn có nút Gọi, Chi tiết và hoàn thành.
- Báo cáo: KPI, biểu đồ đơn 7 ngày và nhóm cần chú ý.
- Cài đặt thông báo chia nhóm có thể thu gọn.
- Chuông có lịch sử thông báo (gồm thử); backend có bảng `notification_history`, giới hạn lịch sử theo triển khai.
- Trạng thái đã đọc lưu trên từng thiết bị, chưa đồng bộ giữa các điện thoại.
- **File thay đổi so với V3.0:** `public/index.html`, `public/style.css`, `public/app.js`, `src/index.js`.

### V3.0 Beta — QR đặt hoa, VietQR và 4 menu
- Thêm menu Cài đặt thứ tư; thẻ đơn dùng ảnh hoa hoặc avatar chữ cái ổn định.
- Trang `/dat-hoa.html` cho khách gửi yêu cầu qua QR; yêu cầu nằm trong Chờ duyệt, không tự nhập vào Cần làm.
- Thanh toán VietQR theo ngân hàng và số tiền; khách báo đã chuyển chỉ tạo thông tin chờ xác nhận.
- Chủ tiệm nhận làm đơn và chọn Chưa nhận / Đã cọc / Đã thu đủ; bổ sung quản lý yêu cầu trong backend/D1.
- Thêm thiết lập ngân hàng nhận tiền, thông báo nhắc đơn ngày mai theo tần suất, thông báo yêu cầu mới và xuất CSV.
- Cải thiện bàn phím đăng nhập và nhập giọng nói trên trình duyệt hỗ trợ.

### V1.0 / V2 nền tảng — Quản lý đơn hoa (MVP và các chỉnh sửa nền)
- PWA quản lý đơn, khách hàng và báo cáo; lọc theo thời gian, tìm kiếm, hoàn thành/hoàn tác, lịch sử chỉnh sửa.
- Đặt hoa đến lấy/giao, quản lý nhiều đợt thanh toán, hiển thị tiền còn thu.
- Ảnh mẫu trong R2, dữ liệu D1, sao lưu, thông báo Push và nhập đơn bằng giọng nói/AI.
- Đăng nhập bằng mã truy cập và phân quyền tài khoản.
- **Ghi chú:** Các thay đổi chi tiết của từng bản V2 trước đây không được ghi đầy đủ trong các README nguồn, nên được gộp vào nhóm nền tảng thay vì suy đoán phiên bản/ngày sửa.

## Kiểm thử sau cập nhật V3.2.1

1. Chọn ảnh qua nút **Thêm ảnh** trên iPhone/Android; kiểm tra ảnh và nút cùng cỡ, không xuất hiện input hệ thống thừa.
2. Focus ô số điện thoại và số tiền; kiểm tra Safari không tự phóng to bất ngờ.
3. Bấm Gọi, Chi tiết, Hoàn tất, Hoàn tác trên thẻ đơn; kiểm tra không nháy/co cả thẻ.
4. Thử thanh tìm kiếm, chuông và lịch sử thông báo (cả thông báo thử), Báo cáo, Cài đặt nhắc đơn.
5. Tạo yêu cầu tại `/dat-hoa.html`, nhận làm, chọn tình trạng tiền, kiểm tra D1/R2 không bị lỗi.
6. Kiểm tra Deploy Cloudflare có `Ready` và đang phục vụ, không chỉ Build thành công.

---

**Trạng thái:** Bộ mã nguồn V3.2.1 Beta, chưa chứng nhận vận hành production. Các tính năng và khuyến nghị trên tổng hợp từ README gốc V1/V2 cùng các file cập nhật V3.0–V3.2.1.
