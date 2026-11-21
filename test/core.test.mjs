// Chạy: npm test  (không cần cài thêm gì, dùng Node có sẵn)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../public/core.js'; // gắn vào globalThis.QC giống như trong trình duyệt
const Q = globalThis.QC;

const order = (o) => ({ id: 'x', done: false, paid: 0, total: 500000, dueDate: '2099-01-01', dueTime: '09:00', createdAt: '2026-01-01', ...o });

test('còn thu = giá - đã thu, không bao giờ âm', () => {
  assert.equal(Q.remain(order({ total: 500000, paid: 200000 })), 300000);
  assert.equal(Q.remain(order({ total: 500000, paid: 500000 })), 0);
  assert.equal(Q.remain(order({ total: 500000, paid: 700000 })), 0);
  assert.equal(Q.remain(order({ total: null })), null);
});
test('nhãn thanh toán', () => {
  assert.equal(Q.payInfo(order({ paid: 0 })).cls, 'red');
  assert.equal(Q.payInfo(order({ paid: 200000 })).text, 'Đã cọc – Còn 300.000đ');
  assert.equal(Q.payInfo(order({ paid: 500000 })).text, 'Đã thu đủ');
  assert.equal(Q.payInfo(order({ total: null, paid: 0 })).text, 'Chưa xác định giá');
});
test('ngày: cộng, trừ, qua tháng và năm', () => {
  assert.equal(Q.addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(Q.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(Q.addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(Q.diffDays('2026-11-20', '2026-11-19'), 1);
});
test('quá hạn: ngày cũ hoặc hôm nay đã quá giờ; đã giao thì không', () => {
  assert.equal(Q.isOverdue(order({ dueDate: '2000-01-01' })), true);
  assert.equal(Q.isOverdue(order({ dueDate: '2000-01-01', done: true })), false);
  assert.equal(Q.isOverdue(order({ dueDate: '2099-01-01' })), false);
});
test('sắp xếp theo ngày rồi giờ; đơn chưa chốt giờ xếp cuối ngày', () => {
  const l = [order({ id: 'c', dueDate: '2026-11-20', dueTime: '' }), order({ id: 'b', dueDate: '2026-11-20', dueTime: '10:00' }), order({ id: 'a', dueDate: '2026-11-19', dueTime: '17:00' })];
  assert.deepEqual(l.sort(Q.cmp).map((o) => o.id), ['a', 'b', 'c']);
});
test('lọc: chưa thu đủ chỉ lấy đơn còn nợ', () => {
  const l = [order({ id: 'a', paid: 500000 }), order({ id: 'b', paid: 0 }), order({ id: 'c', total: null })];
  assert.deepEqual(Q.applyFilter(l, 'unpaid').map((o) => o.id), ['b']);
});
test('lọc theo ngày: hôm nay, ngày mai, ngày kia không lẫn nhau', () => {
  const T = Q.today(), l = [0, 1, 2, 3].map((n) => order({ id: 'd' + n, dueDate: Q.addDays(T, n) }));
  assert.deepEqual(Q.applyFilter(l, 'today').map((o) => o.id), ['d0']);
  assert.deepEqual(Q.applyFilter(l, 'tomorrow').map((o) => o.id), ['d1']);
  assert.deepEqual(Q.applyFilter(l, 'dayafter').map((o) => o.id), ['d2']);
});
test('số điện thoại: +84 và 84 về 0', () => {
  assert.equal(Q.normPhone('+84 912 345 678'), '0912345678');
  assert.equal(Q.normPhone('84912345678'), '0912345678');
  assert.equal(Q.normPhone('0912.345.678'), '0912345678');
});
test('tìm không dấu, tiền định dạng, chống chèn HTML', () => {
  assert.equal(Q.fold('Hồng Đỏ'), 'hong do');
  assert.match(Q.money(1500000), /^1[.,]500[.,]000đ$/);
  assert.equal(Q.esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});
