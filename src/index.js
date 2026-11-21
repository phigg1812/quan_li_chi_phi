// Tiệm Hoa Quý Cảnh - Quản lý đơn đặt hoa
// Cloudflare Workers + D1 (dữ liệu) + R2 (ảnh mẫu, sao lưu) + Workers AI (nhận giọng nói dự phòng) + Anthropic (phân tích đơn)
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { parseOrderText } from './parse.js';

const SHOP = 'Tiệm Hoa Quý Cảnh';
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };

// ====================== Cơ sở dữ liệu ======================
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
    customer_id TEXT, customer_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL, items TEXT NOT NULL DEFAULT '[]', card_message TEXT NOT NULL DEFAULT '',
    due_date TEXT NOT NULL, due_time TEXT NOT NULL DEFAULT '', due_time_end TEXT NOT NULL DEFAULT '',
    method TEXT NOT NULL DEFAULT 'pickup', address TEXT NOT NULL DEFAULT '',
    total INTEGER, note TEXT NOT NULL DEFAULT '', raw TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0, done_at TEXT, deleted INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_orders_due ON orders(due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_cust ON orders(customer_id)`,
  `CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, amount INTEGER NOT NULL, paid_at TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', by_user TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_pay_order ON payments(order_id)`,
  `CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, r2_key TEXT NOT NULL, created_at TEXT NOT NULL, keep INTEGER NOT NULL DEFAULT 0, cleanup_after INTEGER)`,
  `CREATE INDEX IF NOT EXISTS idx_photo_order ON photos(order_id)`,
  `CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, ts TEXT NOT NULL, by_user TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_hist_order ON history(order_id)`,
  `CREATE TABLE IF NOT EXISTS subs (endpoint TEXT PRIMARY KEY, json TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sent (k TEXT PRIMARY KEY, ts INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, n INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS usage (k TEXT PRIMARY KEY, n INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS fails (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS customer_requests (
    id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL,
    customer TEXT NOT NULL, phone TEXT NOT NULL, content TEXT NOT NULL,
    due_date TEXT NOT NULL, due_time TEXT NOT NULL, method TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '', total INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '', reported_paid INTEGER NOT NULL DEFAULT 0,
    payment_reported_at TEXT, status TEXT NOT NULL DEFAULT 'pending',
    photo_key TEXT, order_id TEXT, decided_at TEXT, decided_by TEXT,
    bank_snapshot TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_request_status ON customer_requests(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS public_rate (key TEXT PRIMARY KEY, n INTEGER NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS notification_history (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, url TEXT NOT NULL, kind TEXT NOT NULL, ts TEXT NOT NULL, devices INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_ts ON notification_history(ts DESC)`,
];
let schemaReady;
function ensureSchema(env) {
  schemaReady ??= env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s))).catch((e) => { schemaReady = undefined; throw e; });
  return schemaReady;
}

// ====================== Ngày giờ ======================
const tzOf = (env) => env.APP_TZ || 'Asia/Ho_Chi_Minh';
function nowParts(env, d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tzOf(env), year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(Date.parse(s));
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');
const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';

// ====================== Cài đặt ======================
function defaults(env) {
  return {
    morning: env.REMIND_MORNING || '07:00', evening: env.REMIND_EVENING || '18:00',
    beforeMin: Number(env.REMIND_BEFORE_MIN || 60), overdueMin: Number(env.REMIND_OVERDUE_MIN || 30),
    notifyMorning: true, notifyEvening: true, notifyBefore: true, notifyOverdue: true,
    tomorrowInterval: 60, tomorrowStart: '18:00', tomorrowEnd: '22:00',
    notifyNewRequest: true, notifyUnpaid: false,
    bankCode: '', bankAccount: '', bankOwner: '', shopPhone: '',
    aiDailyLimit: Number(env.AI_DAILY_LIMIT || 100), photoRetentionMonths: 12,
  };
}
async function getSettings(env) {
  const { results } = await env.DB.prepare('SELECT k, v FROM settings').all();
  const s = defaults(env);
  for (const r of results) { try { s[r.k] = JSON.parse(r.v); } catch {} }
  return s;
}
function sanitizeSettings(b, cur) {
  const s = { ...cur };
  if (isTime(b.morning)) s.morning = b.morning;
  if (isTime(b.evening)) s.evening = b.evening;
  if (isTime(b.tomorrowStart)) s.tomorrowStart = b.tomorrowStart;
  if (isTime(b.tomorrowEnd)) s.tomorrowEnd = b.tomorrowEnd;
  if ([0, 60, 120].includes(Number(b.tomorrowInterval))) s.tomorrowInterval = Number(b.tomorrowInterval);
  for (const k of ['beforeMin', 'overdueMin']) if (Number.isFinite(+b[k]) && +b[k] >= 0 && +b[k] <= 720) s[k] = Math.round(+b[k]);
  for (const k of ['notifyMorning', 'notifyEvening', 'notifyBefore', 'notifyOverdue', 'notifyNewRequest', 'notifyUnpaid']) if (typeof b[k] === 'boolean') s[k] = b[k];
  for (const k of ['bankCode', 'bankAccount', 'bankOwner']) if (typeof b[k] === 'string') s[k] = clip(b[k], k === 'bankOwner' ? 100 : 35);
  if (typeof b.shopPhone === 'string') s.shopPhone = normPhone(b.shopPhone).slice(0, 15);
  if (Number.isFinite(+b.aiDailyLimit) && +b.aiDailyLimit >= 0 && +b.aiDailyLimit <= 2000) s.aiDailyLimit = Math.round(+b.aiDailyLimit);
  if (Number.isFinite(+b.photoRetentionMonths) && +b.photoRetentionMonths >= 1 && +b.photoRetentionMonths <= 120) s.photoRetentionMonths = Math.round(+b.photoRetentionMonths);
  return s;
}

// ====================== Người dùng & xác thực ======================
// USERS = "Bố=123456:admin;Mẹ=654321;Con=987654"  (hoặc chỉ APP_PASSCODE cho một người dùng chung)
function parseUsers(env) {
  if (env.USERS) {
    return String(env.USERS).split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => {
      const eq = x.indexOf('=');
      const [pin, role] = x.slice(eq + 1).split(':');
      return { name: x.slice(0, eq).trim(), pin: pin.trim(), admin: (role || '').trim().toLowerCase() === 'admin' };
    }).filter((u) => u.name && u.pin);
  }
  if (env.APP_PASSCODE) return [{ name: 'Tiệm', pin: String(env.APP_PASSCODE), admin: true }];
  return [];
}
const enc = new TextEncoder();
const sha = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
async function authenticate(request, env) {
  const given = await sha(request.headers.get('x-passcode') || '');
  let found = null;
  for (const u of parseUsers(env)) if (crypto.subtle.timingSafeEqual(given, await sha(u.pin))) found = u;
  return found;
}
const LOCK_N = 10, LOCK_MS = 15 * 60 * 1000;
async function checkLock(env, ip) {
  const r = await env.DB.prepare('SELECT n, ts FROM fails WHERE ip = ?').bind(ip).first();
  return !!r && r.n >= LOCK_N && Date.now() - r.ts < LOCK_MS;
}
async function recordFail(env, ip) {
  const r = await env.DB.prepare('SELECT n, ts FROM fails WHERE ip = ?').bind(ip).first();
  const n = r && Date.now() - r.ts < LOCK_MS ? r.n + 1 : 1;
  await env.DB.prepare('INSERT INTO fails (ip, n, ts) VALUES (?1, ?2, ?3) ON CONFLICT(ip) DO UPDATE SET n = ?2, ts = ?3').bind(ip, n, Date.now()).run();
}

// ====================== Dữ liệu đơn ======================
const normPhone = (p) => {
  let d = String(p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3); else if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2);
  return d.replace(/\D/g, '').slice(0, 15);
};
const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const intOrNull = (v) => (v === '' || v == null || isNaN(Number(v)) || Number(v) < 0 ? null : Math.round(Number(v)));

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 20).map((i) => ({
    name: clip(i.name, 80), qty: i.qty == null || i.qty === '' ? '' : clip(i.qty, 10), unit: clip(i.unit, 20),
    color: clip(i.color, 40), style: clip(i.style, 60),
  })).filter((i) => i.name);
}

function rowToOrder(r, pays = [], photos = []) {
  const paid = pays.reduce((a, p) => a + p.amount, 0);
  return {
    id: r.id, code: r.code, createdAt: r.created_at, customerId: r.customer_id, customer: r.customer_name, phone: r.phone,
    content: r.content, items: JSON.parse(r.items || '[]'), cardMessage: r.card_message,
    dueDate: r.due_date, dueTime: r.due_time, dueTimeEnd: r.due_time_end, method: r.method, address: r.address,
    total: r.total, paid, note: r.note, raw: r.raw, done: !!r.done, doneAt: r.done_at, deleted: !!r.deleted,
    updatedAt: r.updated_at, updatedBy: r.updated_by, createdBy: r.created_by || r.updated_by || '',
    payments: pays.map((p) => ({ id: p.id, amount: p.amount, paidAt: p.paid_at, note: p.note, by: p.by_user })),
    photos: photos.map((p) => ({ id: p.id, keep: !!p.keep, createdAt: p.created_at, cleanup: p.cleanup_after ? p.cleanup_after : null })),
  };
}
async function loadOrder(env, id) {
  const r = await env.DB.prepare("SELECT orders.*, (SELECT by_user FROM history WHERE order_id = orders.id AND action = 'created' ORDER BY id LIMIT 1) AS created_by FROM orders WHERE id = ?").bind(id).first();
  if (!r) return null;
  const [p, ph] = await Promise.all([
    env.DB.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY paid_at').bind(id).all(),
    env.DB.prepare('SELECT * FROM photos WHERE order_id = ? ORDER BY created_at').bind(id).all(),
  ]);
  return rowToOrder(r, p.results, ph.results);
}
async function loadAll(env) {
  const [o, p, ph, c] = await Promise.all([
    env.DB.prepare("SELECT orders.*, (SELECT by_user FROM history WHERE order_id = orders.id AND action = 'created' ORDER BY id LIMIT 1) AS created_by FROM orders WHERE deleted = 0").all(),
    env.DB.prepare('SELECT * FROM payments ORDER BY paid_at').all(),
    env.DB.prepare('SELECT * FROM photos ORDER BY created_at').all(),
    env.DB.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE').all(),
  ]);
  const gp = Map.groupBy(p.results, (x) => x.order_id), gph = Map.groupBy(ph.results, (x) => x.order_id);
  return {
    orders: o.results.map((r) => rowToOrder(r, gp.get(r.id) || [], gph.get(r.id) || [])),
    customers: c.results.map((x) => ({ id: x.id, name: x.name, phone: x.phone, note: x.note, createdAt: x.created_at })),
  };
}
const hist = (env, orderId, user, action, detail = '') =>
  env.DB.prepare('INSERT INTO history (order_id, ts, by_user, action, detail) VALUES (?, ?, ?, ?, ?)')
    .bind(orderId, new Date().toISOString(), user.name, action, detail);

// Tìm khách theo số điện thoại (ưu tiên), nếu không có số thì theo tên; không có thì tạo mới
async function resolveCustomer(env, name, phone, hintId) {
  const ph = normPhone(phone);
  let c = null;
  if (hintId) c = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(hintId).first();
  if (!c && ph) c = await env.DB.prepare('SELECT * FROM customers WHERE phone = ?').bind(ph).first();
  if (!c && !ph) c = await env.DB.prepare('SELECT * FROM customers WHERE lower(name) = lower(?) ORDER BY created_at LIMIT 1').bind(name).first();
  if (c) {
    if (!c.phone && ph) { await env.DB.prepare('UPDATE customers SET phone = ? WHERE id = ?').bind(ph, c.id).run(); c.phone = ph; }
    return { id: c.id, phone: c.phone || ph, name: c.name };
  }
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO customers (id, name, phone, note, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, name, ph, '', new Date().toISOString()).run();
  return { id, phone: ph, name };
}

function validateOrder(b, partial = false) {
  const o = {};
  const has = (k) => !partial || b[k] !== undefined;
  if (has('customer')) { o.customer = clip(b.customer, 100); if (!o.customer) bad('Cần nhập tên khách hàng'); }
  if (has('content')) { o.content = clip(b.content, 600); if (!o.content) bad('Cần nhập nội dung hoa đặt'); }
  if (has('dueDate')) { if (!isDate(b.dueDate)) bad('Cần chọn ngày khách nhận'); o.dueDate = b.dueDate; }
  if (has('phone')) o.phone = normPhone(b.phone);
  if (has('items')) o.items = cleanItems(b.items);
  if (has('cardMessage')) o.cardMessage = clip(b.cardMessage, 300);
  if (has('dueTime')) o.dueTime = isTime(b.dueTime) ? b.dueTime : '';
  if (has('dueTimeEnd')) o.dueTimeEnd = isTime(b.dueTimeEnd) ? b.dueTimeEnd : '';
  if (has('method')) o.method = b.method === 'delivery' ? 'delivery' : 'pickup';
  if (has('address')) o.address = clip(b.address, 250);
  if (has('total')) o.total = intOrNull(b.total);
  if (has('note')) o.note = clip(b.note, 500);
  return o;
}

const FIELD_LABEL = { customer_name: 'Tên khách', phone: 'Số điện thoại', content: 'Nội dung hoa', card_message: 'Lời thiệp', due_date: 'Ngày nhận', due_time: 'Giờ nhận', due_time_end: 'Giờ nhận đến', method: 'Hình thức nhận', address: 'Địa chỉ', total: 'Giá trị đơn', note: 'Ghi chú' };
const showVal = (k, v) => (v === null || v === '' ? '(trống)' : k === 'method' ? (v === 'delivery' ? 'Tiệm giao hoa' : 'Khách đến lấy') : k === 'total' ? money(v) : v);

async function createOrder(env, user, b) {
  const v = validateOrder(b);
  const method = v.method || 'pickup';
  if (method === 'delivery' && !v.address) bad('Đơn giao hoa cần có địa chỉ giao');
  const cust = await resolveCustomer(env, v.customer, v.phone, b.customerId);
  const n = (await env.DB.prepare(`INSERT INTO counters (name, n) VALUES ('order', 1) ON CONFLICT(name) DO UPDATE SET n = n + 1 RETURNING n`).first()).n;
  const id = crypto.randomUUID(), now = new Date().toISOString(), code = 'QC-' + String(n).padStart(4, '0');
  const deposit = intOrNull(b.deposit) || 0;
  const stmts = [
    env.DB.prepare(`INSERT INTO orders (id, code, created_at, customer_id, customer_name, phone, content, items, card_message, due_date, due_time, due_time_end, method, address, total, note, raw, updated_at, updated_by)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?3,?18)`)
      .bind(id, code, now, cust.id, v.customer, cust.phone || v.phone, v.content, JSON.stringify(v.items || []), v.cardMessage || '', v.dueDate, v.dueTime || '', v.dueTimeEnd || '', method, v.address || '', v.total, v.note || '', clip(b.raw, 1000), user.name),
    hist(env, id, user, 'created', `Tạo đơn ${code}`),
  ];
  if (deposit > 0) {
    stmts.push(env.DB.prepare('INSERT INTO payments (id, order_id, amount, paid_at, note, by_user) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, deposit, now, 'Tiền cọc khi tạo đơn', user.name));
    stmts.push(hist(env, id, user, 'payment', `Thu ${money(deposit)} (tiền cọc)`));
  }
  await env.DB.batch(stmts);
  return loadOrder(env, id);
}

async function updateOrder(env, user, id, b) {
  const cur = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND deleted = 0').bind(id).first();
  if (!cur) bad('Không tìm thấy đơn', 404);
  const v = validateOrder(b, true);
  const method = v.method ?? cur.method, address = v.address ?? cur.address;
  if (method === 'delivery' && !address) bad('Đơn giao hoa cần có địa chỉ giao');
  const map = { customer_name: v.customer, phone: v.phone, content: v.content, card_message: v.cardMessage, due_date: v.dueDate, due_time: v.dueTime, due_time_end: v.dueTimeEnd, method: v.method, address: v.address, total: v.total, note: v.note };
  const changes = [], sets = [], vals = [];
  for (const [col, val] of Object.entries(map)) {
    if (val === undefined || val === cur[col]) continue;
    changes.push(`${FIELD_LABEL[col]}: ${showVal(col, cur[col])} → ${showVal(col, val)}`);
    sets.push(`${col} = ?`); vals.push(val);
  }
  if (v.items !== undefined && JSON.stringify(v.items) !== cur.items) { sets.push('items = ?'); vals.push(JSON.stringify(v.items)); changes.push('Chi tiết hoa'); }
  // Đổi tên/số điện thoại: gắn lại khách hàng
  if (v.customer !== undefined || v.phone !== undefined) {
    const cust = await resolveCustomer(env, v.customer ?? cur.customer_name, v.phone ?? cur.phone, b.customerId);
    if (cust.id !== cur.customer_id) { sets.push('customer_id = ?'); vals.push(cust.id); }
  }
  if (!sets.length) return loadOrder(env, id);
  sets.push('updated_at = ?', 'updated_by = ?'); vals.push(new Date().toISOString(), user.name);
  await env.DB.batch([
    env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id),
    hist(env, id, user, 'updated', changes.join('; ')),
  ]);
  return loadOrder(env, id);
}

// ====================== AI: nhận diện đơn từ lời nói ======================
function fallbackParse(text, env) {
  return parseOrderText(text, nowParts(env).date); // tách bằng quy tắc, không cần AI
}
async function useQuota(env, key, limit) {
  const day = nowParts(env).date;
  const r = await env.DB.prepare('INSERT INTO usage (k, n) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n').bind(`${key}:${day}`).first();
  return r.n <= limit;
}
async function aiParse(text, env) {
  if (!env.ANTHROPIC_API_KEY) return { ...fallbackParse(text, env), aiOff: true };
  const settings = await getSettings(env);
  if (!(await useQuota(env, 'ai', settings.aiDailyLimit))) return { ...fallbackParse(text, env), aiLimit: true };
  const { date } = nowParts(env);
  const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: tzOf(env), weekday: 'long' }).format(new Date());
  const system = `Bạn là trợ lý ghi sổ đơn đặt hoa cho ${SHOP} ở Việt Nam. Chủ tiệm đọc to một đơn; văn bản do nhận dạng giọng nói tạo ra nên có thể sai chính tả, thiếu dấu, nhầm từ đồng âm, số đọc bằng chữ.
Trả về DUY NHẤT một đối tượng JSON (không giải thích, không markdown) với các trường:
{
 "customer": "tên khách, rỗng nếu không nói",
 "phone": "số điện thoại chỉ gồm chữ số, rỗng nếu không nói",
 "content": "mô tả hoa đặt, ngắn gọn dễ đọc, ví dụ: 2 bó hoa hồng đỏ, cắm kiểu tròn",
 "items": [{"name":"tên hoa/sản phẩm","qty":số hoặc rỗng,"unit":"bó/lẵng/giỏ/bình...","color":"màu nếu có","style":"kiểu cắm nếu có"}],
 "cardMessage": "lời viết thiệp nếu khách yêu cầu, ngược lại rỗng",
 "dueDate": "YYYY-MM-DD ngày khách nhận; rỗng nếu lời nói KHÔNG nêu ngày",
 "dueTime": "HH:MM (24 giờ) giờ khách nhận; rỗng nếu không nói",
 "dueTimeEnd": "HH:MM nếu khách nói một khoảng giờ (ví dụ 'từ 9 đến 11 giờ'), ngược lại rỗng",
 "method": "pickup nếu khách tự lấy hoặc không nói gì; delivery nếu tiệm giao (ship, giao tận nơi, giao đến nhà)",
 "address": "địa chỉ giao, rỗng nếu không có",
 "total": tổng giá trị đơn bằng số nguyên đồng, hoặc null nếu không nói giá,
 "deposit": số tiền khách đã cọc hoặc đã trả bằng số nguyên đồng, 0 nếu không nói,
 "note": "yêu cầu khác không thuộc các trường trên",
 "uncertain": ["tên các trường bạn không chắc chắn, hoặc lời nói thiếu/mơ hồ, cần người dùng kiểm tra"]
}
Quy tắc:
- Hôm nay là ${weekday}, ngày ${date} (múi giờ ${tzOf(env)}). Quy đổi "sáng mai", "mốt", "thứ bảy tuần này", "ngày 25" thành ngày cụ thể.
- Số tiền: "năm trăm" trong ngữ cảnh giá hoa = 500000; "năm trăm nghìn", "500k" = 500000; "tám trăm rưỡi" = 850000. Nếu mơ hồ, đưa "total" vào uncertain.
- Giờ: "chín giờ sáng" = 09:00, "ba giờ chiều" = 15:00, "tám rưỡi" = 08:30. Nếu không rõ sáng hay chiều, chọn giờ hợp lý nhất cho tiệm hoa và đưa "dueTime" vào uncertain.
- "trả trước một nửa" => deposit = total/2 nếu đã biết total; nếu chưa biết total thì deposit = 0 và đưa "deposit" vào uncertain.
- TUYỆT ĐỐI không bịa thông tin khách chưa nói. Thiếu thì để rỗng/null/0 và đưa tên trường vào "uncertain". Nếu không nói ngày thì "dueDate" rỗng và phải có trong "uncertain".`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 900, system, messages: [{ role: 'user', content: text }] }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}`);
    const j = await r.json();
    const out = (j.content || []).map((c) => c.text || '').join('');
    const p = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const total = intOrNull(p.total);
    const res = {
      customer: clip(p.customer, 100), phone: normPhone(p.phone), content: clip(p.content, 600) || text.trim(), items: cleanItems(p.items),
      cardMessage: clip(p.cardMessage, 300), dueDate: isDate(p.dueDate) ? p.dueDate : '', dueTime: isTime(p.dueTime) ? p.dueTime : '',
      dueTimeEnd: isTime(p.dueTimeEnd) ? p.dueTimeEnd : '', method: p.method === 'delivery' ? 'delivery' : 'pickup', address: clip(p.address, 250),
      total, deposit: intOrNull(p.deposit) || 0, note: clip(p.note, 500),
      uncertain: Array.isArray(p.uncertain) ? p.uncertain.map(String).slice(0, 20) : [], raw: text, usedAI: true,
    };
    if (!res.dueDate && !res.uncertain.includes('dueDate')) res.uncertain.push('dueDate');
    if (!res.customer && !res.uncertain.includes('customer')) res.uncertain.push('customer');
    if (res.method === 'delivery' && !res.address && !res.uncertain.includes('address')) res.uncertain.push('address');
    return res;
  } catch (e) {
    console.error('Lỗi AI:', e.message);
    return { ...fallbackParse(text, env), aiError: true };
  }
}

// ====================== Thông báo đẩy ======================
async function pushAll(env, payload) {
  const { results } = await env.DB.prepare('SELECT endpoint, json FROM subs').all();
  const vapid = { subject: env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  if (!vapid.publicKey || !vapid.privateKey) return 0;
  let ok = 0;
  await Promise.all(results.map(async (row) => {
    try {
      const sub = JSON.parse(row.json);
      const req = await buildPushPayload({ data: JSON.stringify(payload), options: { ttl: 3600, urgency: 'high' } }, sub, vapid);
      const res = await fetch(sub.endpoint, req);
      if (res.status === 404 || res.status === 410) await env.DB.prepare('DELETE FROM subs WHERE endpoint = ?').bind(row.endpoint).run();
      else if (res.ok) ok++;
      else console.error('Push lỗi', res.status);
    } catch (e) { console.error('Push lỗi:', e.message); }
  }));
  // Lưu nhật ký ngay cả khi không có thiết bị nhận; chỉ ghi là đã gửi tới bao nhiêu endpoint.
  try {
    await env.DB.prepare('INSERT INTO notification_history (id,title,body,url,kind,ts,devices) VALUES (?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),String(payload.title||'').slice(0,180),String(payload.body||'').slice(0,900),String(payload.url||'/').slice(0,220),payload.tag==='test'?'test':'system',new Date().toISOString(),ok).run();
    await env.DB.prepare('DELETE FROM notification_history WHERE id IN (SELECT id FROM notification_history ORDER BY ts DESC LIMIT -1 OFFSET 300)').run();
  } catch(e) { console.error('Không lưu được lịch sử thông báo',e); }
  return ok;
}
async function claim(env, key) {
  const r = await env.DB.prepare('INSERT OR IGNORE INTO sent (k, ts) VALUES (?, ?)').bind(key, Date.now()).run();
  return r.meta.changes === 1;
}
const timeLabel = (o) => (o.due_time ? (o.due_time_end ? `${o.due_time}–${o.due_time_end}` : o.due_time) : '');
const brief = (list) => list.slice(0, 4).map((o) => `${o.customer_name}${o.due_time ? ' ' + o.due_time : ''}`).join(', ') + (list.length > 4 ? '…' : '');

// ====================== Sao lưu & dọn ảnh ======================
async function exportAll(env) {
  const t = ['customers', 'orders', 'payments', 'photos', 'history', 'settings', 'customer_requests', 'counters'];
  const out = { app: SHOP, exportedAt: new Date().toISOString(), version: 1 };
  for (const name of t) out[name] = (await env.DB.prepare(`SELECT * FROM ${name}`).all()).results;
  return out;
}
async function dailyJobs(env, now) {
  const settings = await getSettings(env);
  // 1) Sao lưu JSON vào R2, giữ 14 bản gần nhất
  if (env.BUCKET && (await claim(env, `bk-${now.date}`))) {
    await env.BUCKET.put(`backups/${now.date}.json`, JSON.stringify(await exportAll(env)), { httpMetadata: { contentType: 'application/json' } });
    const list = await env.BUCKET.list({ prefix: 'backups/' });
    const old = list.objects.map((o) => o.key).sort().slice(0, -14);
    if (old.length) await env.BUCKET.delete(old);
  }
  if (!env.BUCKET) return;
  // 2) Chính sách ảnh: đơn hoàn tất quá hạn lưu giữ -> đánh dấu chờ dọn (30 ngày), thông báo trước khi xoá
  const cutoff = new Date(Date.now() - settings.photoRetentionMonths * 30.44 * 86400000).toISOString();
  const flagged = await env.DB.prepare(`UPDATE photos SET cleanup_after = ?1 WHERE keep = 0 AND cleanup_after IS NULL AND order_id IN (SELECT id FROM orders WHERE done = 1 AND done_at < ?2)`)
    .bind(Date.now() + 30 * 86400000, cutoff).run();
  await env.DB.prepare(`UPDATE photos SET cleanup_after = NULL WHERE cleanup_after IS NOT NULL AND (keep = 1 OR order_id NOT IN (SELECT id FROM orders WHERE done = 1))`).run();
  if (flagged.meta.changes > 0) {
    await pushAll(env, { title: SHOP, body: `Có ${flagged.meta.changes} ảnh mẫu của đơn cũ sẽ được dọn sau 30 ngày. Vào Cài đặt để giữ lại ảnh cần thiết.`, url: '/?view=settings', tag: 'cleanup' });
  }
  await purgePhotos(env, `cleanup_after IS NOT NULL AND cleanup_after < ${Date.now()} AND keep = 0`);
  await purgeRequestPhotos(env);
  await env.DB.prepare('DELETE FROM public_rate WHERE ts < ?').bind(Date.now() - 86400000).run();
}
// Ảnh khách gửi qua trang đặt hoa: bị từ chối >7 ngày, đã chuyển vào đơn >1 ngày, hoặc chờ quá 30 ngày thì xoá khỏi R2
async function purgeRequestPhotos(env) {
  const iso = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const { results } = await env.DB.prepare(`SELECT id, photo_key FROM customer_requests WHERE photo_key IS NOT NULL AND photo_key != '' AND (
      (status = 'rejected' AND decided_at < ?1) OR (status = 'accepted' AND decided_at < ?2) OR (status = 'pending' AND created_at < ?3)) LIMIT 200`)
    .bind(iso(7), iso(1), iso(30)).all();
  if (!results.length) return 0;
  await env.BUCKET.delete(results.map((r) => r.photo_key));
  await env.DB.batch(results.map((r) => env.DB.prepare("UPDATE customer_requests SET photo_key = NULL WHERE id = ?").bind(r.id)));
  return results.length;
}
async function purgePhotos(env, where) {
  const { results } = await env.DB.prepare(`SELECT id, order_id, r2_key FROM photos WHERE ${where}`).all();
  if (!results.length) return 0;
  await env.BUCKET.delete(results.flatMap((p) => [p.r2_key, p.r2_key.replace(/\.(webp|jpg|png)$/, '_t.$1')]));
  const sys = { name: 'Hệ thống' };
  await env.DB.batch(results.flatMap((p) => [
    env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(p.id),
    hist(env, p.order_id, sys, 'photo_cleaned', 'Ảnh mẫu đã được dọn theo chính sách lưu giữ'),
  ]));
  return results.length;
}

// ====================== Nhắc nhở (chạy mỗi phút) ======================
async function tick(env) {
  await ensureSchema(env);
  const now = nowParts(env), tomorrow = addDays(now.date, 1);
  const s = await getSettings(env);
  const { results: pending } = await env.DB.prepare('SELECT * FROM orders WHERE done = 0 AND deleted = 0').all();
  const mAt = toMin(s.morning), eAt = toMin(s.evening);

  // V3: chỉ nhắc trong khung giờ đã chọn, khoá từng mốc để tránh gửi trùng.
  const tStart = toMin(s.tomorrowStart || s.evening || '18:00');
  const tEnd = toMin(s.tomorrowEnd || '22:00');
  const interval = Number(s.tomorrowInterval ?? 60);
  const allowed = interval === 0 ? now.minutes >= tStart && now.minutes <= tEnd :
    now.minutes >= tStart && now.minutes <= tEnd && ((now.minutes - tStart) % interval < 1);
  if (s.notifyEvening && tStart <= tEnd && allowed) {
    const slot = interval === 0 ? 'once' : String(Math.floor((now.minutes - tStart) / interval));
    const list = pending.filter((o) => o.due_date === tomorrow && o.status !== 'pending');
    if (list.length && (await claim(env, `pm-v3-${now.date}-${slot}`))) {
      const early = list.filter((o) => o.due_time && o.due_time < '09:00').length;
      await pushAll(env, { title: SHOP, body: `Ngày mai có ${list.length} đơn hoa cần làm${early ? `, ${early} đơn nhận trước 9 giờ` : ''}.`, url: '/?filter=tomorrow', tag: 'tomorrow-summary' });
    }
  }
  if (s.notifyMorning && now.minutes >= mAt && now.minutes < mAt + 180 && (await claim(env, `am-${now.date}`))) {
    const today = pending.filter((o) => o.due_date === now.date).sort((a, b) => (a.due_time || '99').localeCompare(b.due_time || '99'));
    const late = pending.filter((o) => o.due_date < now.date);
    if (today.length || late.length) {
      const parts = [];
      if (today.length) parts.push(`Hôm nay có ${today.length} đơn: ${brief(today)}`);
      if (late.length) parts.push(`${late.length} đơn quá hạn chưa giao`);
      await pushAll(env, { title: SHOP, body: parts.join('. ') + '.', url: late.length && !today.length ? '/?filter=overdue' : '/?filter=today', tag: 'morning' });
    }
  }
  for (const o of pending) {
    if (o.due_date !== now.date || !o.due_time) continue;
    const at = toMin(o.due_time);
    const what = `${o.customer_name} – ${o.content.slice(0, 60)}`;
    if (s.notifyBefore && now.minutes >= at - s.beforeMin && now.minutes < at && (await claim(env, `b-${o.id}-${o.due_date}-${o.due_time}`)))
      await pushAll(env, { title: `Sắp đến giờ hẹn (${timeLabel(o)})`, body: what, url: `/?order=${o.id}`, tag: `o-${o.id}` });
    if (s.notifyOverdue && now.minutes >= at + s.overdueMin && now.minutes < at + s.overdueMin + 240 && (await claim(env, `l-${o.id}-${o.due_date}-${o.due_time}`)))
      await pushAll(env, { title: 'Đơn quá giờ hẹn', body: `${what}. Hẹn ${timeLabel(o)} nhưng chưa xác nhận.`, url: `/?order=${o.id}`, tag: `o-${o.id}`, urgent: true });
  }
  if (s.notifyUnpaid && now.minutes >= 17*60 && now.minutes < 17*60+3) {
    const unpaid = (await env.DB.prepare('SELECT o.id,o.total,COALESCE(SUM(p.amount),0) AS paid FROM orders o LEFT JOIN payments p ON p.order_id=o.id WHERE o.deleted=0 AND o.done=0 GROUP BY o.id').all()).results.filter(o=>o.total!=null&&o.total>o.paid);
    if (unpaid.length && await claim(env,`unpaid-${now.date}`)) await pushAll(env,{title:'Tiệm hoa Quý Cảnh · Chưa thu đủ',body:`Có ${unpaid.length} đơn chưa thu đủ tiền.`,url:'/?filter=unpaid',tag:'unpaid-summary'});
  }
  if (now.minutes >= 180 && now.minutes < 240) await dailyJobs(env, now); // 03:00-04:00
  if (now.minutes % 60 === 0) await env.DB.prepare('DELETE FROM sent WHERE ts < ?').bind(Date.now() - 10 * 86400000).run();
}

// ====================== Yêu cầu đặt hoa công khai (V3) ======================
// Kiểm tra nội dung thật của ảnh (không tin loại file do trình duyệt tự khai)
function sniffImage(buf) {
  const u = new Uint8Array(buf.slice(0, 12));
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'image/jpeg';
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return 'image/webp';
  return null;
}
async function hit(env, key, limit, windowMs) {
  const ts = Date.now();
  const r = await env.DB.prepare(`INSERT INTO public_rate(key,n,ts) VALUES(?1,1,?2)
    ON CONFLICT(key) DO UPDATE SET n = CASE WHEN ?2 - ts >= ?3 THEN 1 ELSE n + 1 END, ts = CASE WHEN ?2 - ts >= ?3 THEN ?2 ELSE ts END RETURNING n`)
    .bind(key, ts, windowMs).first();
  if (r.n > limit) bad('Đã gửi nhiều yêu cầu. Vui lòng thử lại sau.', 429);
}
async function publicRateLimit(request, env) {
  // Một lệnh ghi duy nhất cho mỗi lượt (không đọc rồi ghi nên không bị gửi dồn lách qua)
  let who = request.headers.get('cf-connecting-ip');
  if (!who) who = 'anon:' + [...(await sha((request.headers.get('user-agent') || '') + (request.headers.get('accept-language') || '')))].slice(0, 6).join('-');
  await hit(env, 'req:ip:' + who.slice(0, 90), 6, 3600000);
  await hit(env, 'req:all', 80, 3600000); // trần chung cả trang, chống bị tấn công từ nhiều IP
}
async function turnstileOk(request, env, token) {
  if (!env.TURNSTILE_SECRET) return true; // chưa bật thì bỏ qua
  if (!token) return false;
  const f = new FormData(); f.set('secret', env.TURNSTILE_SECRET); f.set('response', token);
  const ip = request.headers.get('cf-connecting-ip'); if (ip) f.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: f }).then((x) => x.json()).catch(() => ({}));
  return !!r.success;
}
async function handlePublic(request, env, url) {
  await ensureSchema(env);
  const p = url.pathname;
  const s = await getSettings(env);
  if (p === '/api/public/config' && request.method === 'GET') return json({ shop: SHOP, phone: s.shopPhone || '', turnstileSiteKey: env.TURNSTILE_SITEKEY || '' });
  if (p === '/api/public/requests' && request.method === 'POST') {
    await publicRateLimit(request, env);
    const form = await request.formData();
    if (!(await turnstileOk(request, env, String(form.get('cf-turnstile-response') || '')))) bad('Chưa xác minh được bạn là người thật. Vui lòng tải lại trang và thử lại.', 403);
    const customer = clip(form.get('customer'),100), phone = normPhone(form.get('phone'));
    const content = clip(form.get('content'),600), dueDate = clip(form.get('dueDate'),10), dueTime = clip(form.get('dueTime'),5);
    const total = intOrNull(form.get('total')); const method = form.get('method') === 'delivery' ? 'delivery' : 'pickup';
    const address = clip(form.get('address'),250), note = clip(form.get('note'),500);
    if (!customer || phone.length < 9 || !content || !isDate(dueDate) || !isTime(dueTime) || !total || total > 100000000)
      bad('Vui lòng điền đầy đủ tên, số điện thoại, hoa, ngày giờ nhận và giá đã trao đổi.');
    if (dueDate < nowParts(env).date) bad('Không thể chọn ngày trong quá khứ');
    if (method === 'delivery' && !address) bad('Đơn giao hàng phải có địa chỉ');
    const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM customer_requests WHERE phone=? AND status='pending'").bind(phone).first();
    if (waiting.n >= 3) bad('Số điện thoại này đang có 3 yêu cầu chờ tiệm xác nhận. Vui lòng chờ tiệm liên hệ.', 429);
    const photo = form.get('photo'); let key = null, bytes = null, kind = null;
    if (photo && typeof photo !== 'string' && photo.size) {
      if (!env.BUCKET) bad('Chức năng ảnh đang tạm ngừng',503);
      if (photo.size > 5*1024*1024) bad('Ảnh không quá 5 MB');
      bytes = await photo.arrayBuffer(); kind = sniffImage(bytes);
      if (!kind) bad('Ảnh phải là JPEG, PNG hoặc WebP');
    }
    const id = crypto.randomUUID(), now = new Date().toISOString();
    const n = (await env.DB.prepare("INSERT INTO counters(name,n) VALUES('request',1) ON CONFLICT(name) DO UPDATE SET n=n+1 RETURNING n").first()).n;
    const code = 'YC-' + String(n).padStart(4,'0');
    if (bytes) {
      key = `public-requests/${id}.${kind === 'image/png' ? 'png' : kind === 'image/webp' ? 'webp' : 'jpg'}`;
      await env.BUCKET.put(key, bytes, { httpMetadata:{ contentType: kind } });
    }
    await env.DB.prepare(`INSERT INTO customer_requests (id,code,created_at,customer,phone,content,due_date,due_time,method,address,total,note,photo_key,bank_snapshot)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'')`).bind(id,code,now,customer,phone,content,dueDate,dueTime,method,address,total,note,key).run();
    if (s.notifyNewRequest) await pushAll(env,{title:'Có yêu cầu đặt hoa mới',body:`${customer} · ${money(total)} · ${dueTime} ${dueDate}`,url:'/?view=requests',tag:'new-request'});
    return json({ id, code, phone: s.shopPhone || '' },201);
  }
  return json({error:'Không tìm thấy'},404);
}

// ====================== API ======================
async function handleApi(request, env, url, ctx) {
  if (url.pathname.startsWith('/api/public/')) return handlePublic(request, env, url);
  if (!parseUsers(env).length) return json({ error: 'Máy chủ chưa cài USERS hoặc APP_PASSCODE' }, 500);
  await ensureSchema(env);
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (await checkLock(env, ip)) return json({ error: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' }, 429);
  const user = await authenticate(request, env);
  if (!user) { await recordFail(env, ip); return json({ error: 'Sai mã truy cập' }, 401); }
  // Nhập đúng thì xoá bộ đếm nhập sai, để người dùng thật không bị khoá oan
  if (request.method === 'POST' && new URL(request.url).pathname === '/api/login') await env.DB.prepare('DELETE FROM fails WHERE ip = ?').bind(ip).run();
  const admin = () => { if (!user.admin) bad('Chỉ quản trị viên mới dùng được mục này', 403); };

  const { pathname: p } = url, method = request.method;
  let m;
  const body = async () => (await request.json().catch(() => ({}))) || {};

  if (p === '/api/login' && method === 'POST') return json({ user: { name: user.name, admin: user.admin } });

  if (p === '/api/bootstrap' && method === 'GET') {
    const [data, settings] = await Promise.all([loadAll(env), getSettings(env)]);
    if (!user.admin) { delete settings.bankAccount; delete settings.bankOwner; delete settings.bankCode; }
    return json({
      user: { name: user.name, admin: user.admin }, ...data, settings, today: nowParts(env).date, vapidKey: env.VAPID_PUBLIC_KEY || '',
      features: { photos: !!env.BUCKET, stt: !!env.AI, ai: !!env.ANTHROPIC_API_KEY },
    });
  }

  // --- Yêu cầu khách gửi qua QR ---
  if (p === '/api/requests' && method === 'GET') {
    const {results} = await env.DB.prepare('SELECT * FROM customer_requests ORDER BY created_at DESC LIMIT 300').all();
    return json(results.map(r=>({id:r.id,code:r.code,createdAt:r.created_at,customer:r.customer,phone:r.phone,content:r.content,dueDate:r.due_date,dueTime:r.due_time,method:r.method,address:r.address,total:r.total,note:r.note,reportedPaid:r.reported_paid,status:r.status,photo:!!r.photo_key,orderId:r.order_id})));
  }
  if ((m=p.match(/^\/api\/requests\/([\w-]+)\/photo$/)) && method==='GET') {
    const r=await env.DB.prepare('SELECT photo_key FROM customer_requests WHERE id=?').bind(m[1]).first();
    if (!r?.photo_key || !env.BUCKET) bad('Không tìm thấy ảnh',404);
    const obj=await env.BUCKET.get(r.photo_key);
    if (!obj) bad('Ảnh không tồn tại',404);
    return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'image/jpeg','cache-control':'private,max-age=3600'}});
  }
  if ((m=p.match(/^\/api\/requests\/([\w-]+)\/accept$/)) && method==='POST') {
    const b=await body(), paid=intOrNull(b.paid)||0, total=intOrNull(b.total);
    const r=await env.DB.prepare('SELECT * FROM customer_requests WHERE id=?').bind(m[1]).first();
    if (!r || r.status!=='pending') bad('Yêu cầu đã được xử lý',409);
    const finalTotal=total == null?r.total:total;
    if (!finalTotal || finalTotal>100000000 || paid>finalTotal || paid<0) bad('Giá hoặc số tiền đã thu không hợp lệ');
    const lock=await env.DB.prepare("UPDATE customer_requests SET status='processing' WHERE id=? AND status='pending'").bind(m[1]).run();
    if (!lock.meta.changes) bad('Yêu cầu vừa được xử lý trên thiết bị khác',409);
    try {
      const o=await createOrder(env,user,{customer:r.customer,phone:r.phone,content:r.content,dueDate:r.due_date,dueTime:r.due_time,method:r.method,address:r.address,total:finalTotal,deposit:paid,note:r.note});
      // Đánh dấu đã nhận ngay sau khi đơn được tạo, tránh tạo trùng nếu sao chép ảnh thất bại.
      await env.DB.prepare("UPDATE customer_requests SET status='accepted',order_id=?,decided_at=?,decided_by=? WHERE id=?").bind(o.id,new Date().toISOString(),user.name,r.id).run();
      if (r.photo_key && env.BUCKET) {
        try {
          const photoId=crypto.randomUUID(), ext=r.photo_key.split('.').pop(), dest=`photos/${o.id}/${photoId}.${ext}`;
          const obj=await env.BUCKET.get(r.photo_key);
          if (obj) {
            const binary=await obj.arrayBuffer(), contentType=obj.httpMetadata?.contentType||'image/jpeg';
            await env.BUCKET.put(dest,binary,{httpMetadata:{contentType}});
            await env.BUCKET.put(dest.replace(/\.(webp|jpg|png)$/, '_t.$1'),binary,{httpMetadata:{contentType}});
            await env.DB.prepare('INSERT INTO photos(id,order_id,r2_key,created_at) VALUES(?,?,?,?)').bind(photoId,o.id,dest,new Date().toISOString()).run();
          }
        } catch (photoError) { console.error('Chuyển ảnh mẫu không thành công, đơn vẫn đã được nhận:',photoError); }
      }
      return json({ok:true,order:await loadOrder(env,o.id)});
    } catch(e) {
      await env.DB.prepare("UPDATE customer_requests SET status='pending' WHERE id=? AND status='processing'").bind(m[1]).run();
      throw e;
    }
  }
  if ((m=p.match(/^\/api\/requests\/([\w-]+)\/reject$/)) && method==='POST') {
    const b=await body();
    const r=await env.DB.prepare('SELECT reported_paid,status FROM customer_requests WHERE id=?').bind(m[1]).first();
    if (!r || r.status!=='pending') bad('Yêu cầu đã xử lý',409);
    await env.DB.prepare("UPDATE customer_requests SET status='rejected',decided_at=?,decided_by=?,note=note || ? WHERE id=?").bind(new Date().toISOString(),user.name, '\n[Từ chối] '+clip(b.reason,200), m[1]).run();
    return json({ok:true,refundReview: r.reported_paid>0});
  }

  // --- Đơn hàng ---
  if (p === '/api/orders' && method === 'POST') return json(await createOrder(env, user, await body()));
  if ((m = p.match(/^\/api\/orders\/([\w-]+)$/))) {
    if (method === 'GET') { const o = await loadOrder(env, m[1]); return o ? json(o) : json({ error: 'Không tìm thấy đơn' }, 404); }
    if (method === 'PATCH') return json(await updateOrder(env, user, m[1], await body()));
    if (method === 'DELETE') {
      const r = await env.DB.prepare('UPDATE orders SET deleted = 1, updated_at = ?, updated_by = ? WHERE id = ? AND deleted = 0').bind(new Date().toISOString(), user.name, m[1]).run();
      if (!r.meta.changes) bad('Không tìm thấy đơn', 404);
      await hist(env, m[1], user, 'deleted', 'Xoá đơn (có thể khôi phục trong Cài đặt)').run();
      return json({ ok: true });
    }
  }
  if ((m = p.match(/^\/api\/orders\/([\w-]+)\/restore$/)) && method === 'POST') {
    admin();
    await env.DB.prepare('UPDATE orders SET deleted = 0, updated_at = ?, updated_by = ? WHERE id = ?').bind(new Date().toISOString(), user.name, m[1]).run();
    await hist(env, m[1], user, 'restored', 'Khôi phục đơn đã xoá').run();
    return json(await loadOrder(env, m[1]));
  }
  if ((m = p.match(/^\/api\/orders\/([\w-]+)\/done$/)) && method === 'POST') {
    const b = await body(), done = !!b.done;
    const o = await env.DB.prepare('SELECT method, done FROM orders WHERE id = ? AND deleted = 0').bind(m[1]).first();
    if (!o) bad('Không tìm thấy đơn', 404);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('UPDATE orders SET done = ?, done_at = ?, updated_at = ?, updated_by = ? WHERE id = ?').bind(done ? 1 : 0, done ? now : null, now, user.name, m[1]),
      hist(env, m[1], user, done ? 'done' : 'undone', done ? (o.method === 'delivery' ? 'Đã giao hoa' : 'Khách đã lấy') : 'Hoàn tác: chuyển lại thành chưa giao'),
    ]);
    return json(await loadOrder(env, m[1]));
  }
  if ((m = p.match(/^\/api\/orders\/([\w-]+)\/history$/)) && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT ts, by_user, action, detail FROM history WHERE order_id = ? ORDER BY id DESC LIMIT 200').bind(m[1]).all();
    return json(results.map((h) => ({ ts: h.ts, by: h.by_user, action: h.action, detail: h.detail })));
  }

  // --- Thanh toán ---
  if ((m = p.match(/^\/api\/orders\/([\w-]+)\/payments$/)) && method === 'POST') {
    const b = await body(), amount = intOrNull(b.amount);
    if (!amount || amount <= 0) bad('Số tiền chưa hợp lệ');
    const o = await env.DB.prepare('SELECT id FROM orders WHERE id = ? AND deleted = 0').bind(m[1]).first();
    if (!o) bad('Không tìm thấy đơn', 404);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO payments (id, order_id, amount, paid_at, note, by_user) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), m[1], amount, new Date().toISOString(), clip(b.note, 100), user.name),
      hist(env, m[1], user, 'payment', `Thu thêm ${money(amount)}`),
    ]);
    return json(await loadOrder(env, m[1]));
  }
  if ((m = p.match(/^\/api\/payments\/([\w-]+)$/)) && method === 'DELETE') {
    const pay = await env.DB.prepare('SELECT order_id, amount FROM payments WHERE id = ?').bind(m[1]).first();
    if (!pay) bad('Không tìm thấy khoản thu', 404);
    await env.DB.batch([env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(m[1]), hist(env, pay.order_id, user, 'payment_removed', `Xoá khoản thu ${money(pay.amount)}`)]);
    return json(await loadOrder(env, pay.order_id));
  }

  // --- Ảnh mẫu ---
  if ((m = p.match(/^\/api\/orders\/([\w-]+)\/photos$/)) && method === 'POST') {
    if (!env.BUCKET) bad('Chưa bật lưu ảnh (R2) trên máy chủ', 503);
    const o = await env.DB.prepare('SELECT id FROM orders WHERE id = ? AND deleted = 0').bind(m[1]).first();
    if (!o) bad('Không tìm thấy đơn', 404);
    const form = await request.formData();
    const full = form.get('full'), thumb = form.get('thumb');
    if (!full || typeof full === 'string' || !thumb || typeof thumb === 'string') bad('Thiếu ảnh');
    if (!/^image\/(webp|jpeg|png)$/.test(full.type) || full.size > 3 * 1024 * 1024 || thumb.size > 300 * 1024) bad('Ảnh không hợp lệ hoặc quá lớn');
    const id = crypto.randomUUID(), ext = full.type === 'image/webp' ? 'webp' : 'jpg';
    const key = `photos/${m[1]}/${id}.${ext}`;
    await env.BUCKET.put(key, await full.arrayBuffer(), { httpMetadata: { contentType: full.type } });
    await env.BUCKET.put(key.replace(/\.(webp|jpg)$/, '_t.$1'), await thumb.arrayBuffer(), { httpMetadata: { contentType: thumb.type || full.type } });
    // Chỉ ghi vào cơ sở dữ liệu SAU khi cả hai tệp đã lưu xong
    await env.DB.batch([
      env.DB.prepare('INSERT INTO photos (id, order_id, r2_key, created_at) VALUES (?, ?, ?, ?)').bind(id, m[1], key, new Date().toISOString()),
      hist(env, m[1], user, 'photo_added', 'Thêm ảnh mẫu'),
    ]);
    return json(await loadOrder(env, m[1]));
  }
  if ((m = p.match(/^\/api\/photos\/([\w-]+)$/))) {
    const ph = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(m[1]).first();
    if (!ph) bad('Không tìm thấy ảnh', 404);
    if (method === 'GET') {
      const key = url.searchParams.get('size') === 'thumb' ? ph.r2_key.replace(/\.(webp|jpg|png)$/, '_t.$1') : ph.r2_key;
      const obj = await env.BUCKET.get(key);
      if (!obj) bad('Không tìm thấy tệp ảnh', 404);
      return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'image/webp', 'cache-control': 'private, max-age=86400' } });
    }
    if (method === 'DELETE') {
      await env.BUCKET.delete([ph.r2_key, ph.r2_key.replace(/\.(webp|jpg|png)$/, '_t.$1')]);
      await env.DB.batch([env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(ph.id), hist(env, ph.order_id, user, 'photo_removed', 'Xoá ảnh mẫu')]);
      return json(await loadOrder(env, ph.order_id));
    }
    if (method === 'PATCH') {
      const b = await body(), keep = b.keep ? 1 : 0;
      await env.DB.prepare('UPDATE photos SET keep = ?, cleanup_after = NULL WHERE id = ?').bind(keep, ph.id).run();
      return json(await loadOrder(env, ph.order_id));
    }
  }

  // --- Khách hàng ---
  if ((m = p.match(/^\/api\/customers\/([\w-]+)$/)) && method === 'PATCH') {
    const b = await body(), cur = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(m[1]).first();
    if (!cur) bad('Không tìm thấy khách', 404);
    const name = b.name !== undefined ? clip(b.name, 100) : cur.name, phone = b.phone !== undefined ? normPhone(b.phone) : cur.phone;
    if (!name) bad('Cần nhập tên khách hàng');
    if (phone) { const dup = await env.DB.prepare('SELECT name FROM customers WHERE phone = ? AND id != ?').bind(phone, m[1]).first(); if (dup) bad(`Số này đã có ở khách "${dup.name}"`, 409); }
    await env.DB.batch([
      env.DB.prepare('UPDATE customers SET name = ?, phone = ?, note = ? WHERE id = ?').bind(name, phone, b.note !== undefined ? clip(b.note, 500) : cur.note, m[1]),
      env.DB.prepare('UPDATE orders SET customer_name = ?, phone = ? WHERE customer_id = ?').bind(name, phone, m[1]),
    ]);
    return json({ ok: true });
  }

  // --- AI và giọng nói ---
  if (p === '/api/parse' && method === 'POST') {
    const text = clip((await body()).text, 1500);
    if (!text) bad('Chưa có nội dung');
    return json(await aiParse(text, env));
  }
  if (p === '/api/transcribe' && method === 'POST') {
    if (!env.AI) bad('Máy chủ chưa bật nhận giọng nói', 501);
    const s = await getSettings(env);
    if (!(await useQuota(env, 'stt', s.aiDailyLimit * 2))) bad('Hôm nay đã dùng hết lượt nhận giọng nói', 429);
    const buf = await request.arrayBuffer();
    if (buf.byteLength < 500 || buf.byteLength > 1.5 * 1024 * 1024) bad('Đoạn ghi âm quá ngắn hoặc quá dài');
    let bin = ''; const u8 = new Uint8Array(buf);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: btoa(bin), language: 'vi', task: 'transcribe', initial_prompt: 'Đơn đặt hoa: hoa hồng, hoa ly, hoa cúc, bó, lẵng, giỏ, cọc, giao tận nơi.' });
    return json({ text: String(r.text || '').trim() });
  }

  // --- Lịch sử thông báo cho người đã đăng nhập; không lộ dữ liệu khách qua API công khai ---
  if (p === '/api/notifications' && method === 'GET') {
    const rows=await env.DB.prepare('SELECT id,title,body,url,kind,ts,devices FROM notification_history ORDER BY ts DESC LIMIT 100').all();
    return json(rows.results);
  }
  // --- Thông báo ---
  if (p === '/api/subscribe'  && method === 'POST') {
    const b = await body();
    if (!b.endpoint || !b.keys) bad('Thiếu thông tin đăng ký');
    await env.DB.prepare('INSERT INTO subs (endpoint, json) VALUES (?1, ?2) ON CONFLICT(endpoint) DO UPDATE SET json = ?2').bind(b.endpoint, JSON.stringify(b)).run();
    return json({ ok: true });
  }
  if (p === '/api/test-push' && method === 'POST') {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) bad('Máy chủ chưa cài khoá VAPID', 500);
    return json({ ok: true, devices: await pushAll(env, { title: SHOP, body: 'Thông báo hoạt động tốt rồi ạ!', url: '/', tag: 'test' }) });
  }

  // --- Cài đặt, sao lưu (quản trị) ---
  if (p === '/api/settings' && method === 'PUT') {
    admin();
    const next = sanitizeSettings(await body(), await getSettings(env));
    await env.DB.batch(Object.entries(next).map(([k, v]) => env.DB.prepare('INSERT INTO settings (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind(k, JSON.stringify(v))));
    return json(next);
  }
  if (p === '/api/export.csv' && method === 'GET') {
    admin();
    const type=url.searchParams.get('type')==='customers'?'customers':'orders';
    const from=url.searchParams.get('from')||'', to=url.searchParams.get('to')||'';
    const data=await loadAll(env);
    const rows=type==='customers' ? [ ['Tên khách','SĐT','Ghi chú','Ngày tạo'],...data.customers.map(c=>[c.name,c.phone,c.note,c.createdAt])] :
      [['Mã đơn','Tên khách','SĐT','Hoa đặt','Ngày nhận','Giờ','Hình thức','Địa chỉ','Giá tiền','Đã thu','Còn thu','Trạng thái','Ghi chú'],
       ...data.orders.filter(o=>(!from||o.dueDate>=from)&&(!to||o.dueDate<=to)).map(o=>[o.code,o.customer,o.phone,o.content,o.dueDate,o.dueTime,o.method,o.address,o.total??'',o.paid,o.total==null?'':Math.max(0,o.total-o.paid),o.done?'Đã xong':'Cần làm',o.note])];
    const cell=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@\-\t\r]/,x=>"'"+x)+'"';
    const csv='\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
    return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="quy-canh-${type}.csv"`,'cache-control':'no-store'}});
  }
  if (p === '/api/export' && method === 'GET') { admin(); return json(await exportAll(env)); }
  if (p === '/api/backups' && method === 'GET') {
    admin();
    if (!env.BUCKET) return json([]);
    const l = await env.BUCKET.list({ prefix: 'backups/' });
    return json(l.objects.map((o) => ({ name: o.key.replace('backups/', ''), size: o.size, uploaded: o.uploaded })).sort((a, b) => b.name.localeCompare(a.name)));
  }
  if ((m = p.match(/^\/api\/backups\/([\w.-]+\.json)$/)) && method === 'GET') {
    admin();
    const obj = env.BUCKET && (await env.BUCKET.get('backups/' + m[1]));
    return obj ? new Response(obj.body, { headers: { 'content-type': 'application/json' } }) : json({ error: 'Không tìm thấy' }, 404);
  }
  if (p === '/api/deleted' && method === 'GET') {
    admin();
    const { results } = await env.DB.prepare('SELECT * FROM orders WHERE deleted = 1 ORDER BY updated_at DESC LIMIT 50').all();
    return json(results.map((r) => rowToOrder(r)));
  }
  if (p === '/api/cleanup' && method === 'GET') {
    admin();
    const r = await env.DB.prepare('SELECT COUNT(*) AS n, MIN(cleanup_after) AS soonest FROM photos WHERE cleanup_after IS NOT NULL AND keep = 0').first();
    return json({ pending: r.n, soonest: r.soonest });
  }
  if (p === '/api/cleanup/run' && method === 'POST') {
    admin();
    if (!env.BUCKET) bad('Chưa bật lưu ảnh', 503);
    return json({ deleted: await purgePhotos(env, 'cleanup_after IS NOT NULL AND keep = 0') });
  }
  return json({ error: 'Không tìm thấy' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await handleApi(request, env, url, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Lỗi máy chủ' }, 500);
    }
  },
  scheduled(event, env, ctx) {
    ctx.waitUntil(tick(env).catch((e) => console.error('tick lỗi', e)));
  },
};
