// Kiểm tra một file sao lưu (JSON tải từ Cài đặt hoặc R2) còn đọc được và đủ dữ liệu.
// Dùng: node scripts/check-backup.mjs sao-luu-2026-11-20.json
import { readFileSync } from 'node:fs';
const f = process.argv[2];
if (!f) { console.error('Cách dùng: node scripts/check-backup.mjs <file.json>'); process.exit(2); }
let d;
try { d = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.error('KHÔNG ĐỌC ĐƯỢC file sao lưu:', e.message); process.exit(1); }
const need = ['customers', 'orders', 'payments', 'photos', 'history', 'settings', 'customer_requests'];
let bad = 0;
console.log('Sao lưu lúc:', d.exportedAt || '(không rõ)');
for (const k of need) {
  const n = Array.isArray(d[k]) ? d[k].length : null;
  if (n == null) { console.log(`  THIẾU bảng ${k}${k === 'customer_requests' ? ' (bản sao lưu cũ chưa có bảng này)' : ''}`); if (k !== 'customer_requests') bad++; } else console.log(`  ${k}: ${n} dòng`);
}
const ids = new Set((d.orders || []).map((o) => o.id));
const orphan = (d.payments || []).filter((p) => !ids.has(p.order_id)).length;
if (orphan) { console.log(`  CẢNH BÁO: ${orphan} khoản thu không thuộc đơn nào`); bad++; }
console.log(bad ? 'KẾT QUẢ: có vấn đề, xem các dòng trên.' : 'KẾT QUẢ: file sao lưu đọc được và đủ dữ liệu.');
process.exit(bad ? 1 : 0);
