// Hàm thuần của giao diện (ngày giờ, tiền, lọc đơn). Chạy được cả trong trình duyệt lẫn Node để kiểm thử: npm test
(function (root) {
'use strict';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// ---------- Ngày giờ (giờ Việt Nam) ----------
const TZ = 'Asia/Ho_Chi_Minh';
function nowVN() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
const today = () => nowVN().date;
const dparse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (s, n) => { const d = dparse(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (a, b) => Math.round((dparse(a) - dparse(b)) / 864e5);
const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const short = (s) => { const d = dparse(s); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function dayLabel(s) {
  const df = diffDays(s, today()), wd = WD[dparse(s).getUTCDay()];
  if (df === 0) return ['Hôm nay', `${wd}, ${short(s)}`];
  if (df === 1) return ['Ngày mai', `${wd}, ${short(s)}`];
  if (df === 2) return ['Ngày kia', `${wd}, ${short(s)}`];
  if (df < 0) return [`Quá hạn ${-df} ngày`, `${wd}, ${short(s)}`];
  return [`${wd}, ${short(s)}`, `${df} ngày nữa`];
}
const fmtTs = (ts) => new Date(ts).toLocaleString('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const money = (n) => (n == null ? '' : Math.round(n).toLocaleString('vi-VN') + 'đ');
const digits = (v) => String(v ?? '').replace(/[^\d]/g, '');
const normPhone = (p) => {
  let d = String(p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3); else if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2);
  return d.replace(/\D/g, '').slice(0, 15);
};
const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const remain = (o) => (o.total == null ? null : Math.max(0, o.total - o.paid));
const timeText = (o) => (o.dueTime ? (o.dueTimeEnd ? `${o.dueTime}–${o.dueTimeEnd}` : o.dueTime) : 'Chưa chốt giờ');
const methodText = (o) => (o.method === 'delivery' ? 'Tiệm giao hoa' : 'Khách đến lấy');
const doneText = (o) => (o.method === 'delivery' ? 'Đã giao hoa' : 'Khách đã lấy');
function isOverdue(o) {
  if (o.done) return false;
  const n = nowVN();
  if (o.dueDate < n.date) return true;
  return o.dueDate === n.date && !!o.dueTime && n.min > toMin(o.dueTimeEnd || o.dueTime);
}
function payInfo(o) {
  const r = remain(o);
  if (r == null) return { text: o.paid > 0 ? `Đã thu ${money(o.paid)} – Chưa xác định giá` : 'Chưa xác định giá', cls: 'gray' };
  if (r === 0) return { text: 'Đã thu đủ', cls: 'green' };
  if (o.paid === 0) return { text: 'Chưa thu tiền', cls: 'red' };
  return { text: `Đã cọc – Còn ${money(r)}`, cls: 'amber' };
}
const cmp = (a, b) => (a.dueDate + (a.dueTime || '99:99')).localeCompare(b.dueDate + (b.dueTime || '99:99')) || a.createdAt.localeCompare(b.createdAt);
function applyFilter(list, f) {
  const t = today();
  switch (f) {
    case 'today': return list.filter((o) => !o.done && o.dueDate === t);
    case 'tomorrow': return list.filter((o) => !o.done && o.dueDate === addDays(t, 1));
    case 'dayafter': return list.filter((o) => !o.done && o.dueDate === addDays(t, 2));
    case 'upcoming': return list.filter((o) => !o.done && o.dueDate > t);
    case 'unpaid': return list.filter((o) => (remain(o) || 0) > 0);
    case 'overdue': return list.filter(isOverdue);
    default: return list;
  }
}
const api = { esc, TZ, nowVN, today, dparse, addDays, diffDays, WD, short, toMin, dayLabel, fmtTs, money, digits, normPhone, fold, remain, timeText, methodText, doneText, isOverdue, payInfo, cmp, applyFilter };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.QC = api;
})(typeof window !== 'undefined' ? window : globalThis);
