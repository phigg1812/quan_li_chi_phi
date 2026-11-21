// Bộ tách đơn đặt hoa từ câu nói/gõ tiếng Việt bằng quy tắc (không cần AI).
// Dùng khi chưa có ANTHROPIC_API_KEY, hết lượt AI hoặc AI lỗi. Chỉ tách những gì nói rõ,
// mục nào không chắc thì để trống và đưa vào "uncertain" để người dùng kiểm tra.

const LET = '\\p{L}\\p{N}';
const rx = (src, flags = 'giu') => new RegExp(`(?<![${LET}])(?:${src})(?![${LET}])`, flags);
const isoOf = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return isoOf(new Date(Date.UTC(y, m - 1, d + n))); };
const dowOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const pad = (n) => String(n).padStart(2, '0');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const WORDNUM = { 'không': 0, 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5, 'sáu': 6, 'bảy': 7, 'bẩy': 7, 'tám': 8, 'chín': 9 };
const HOURW = 'mười hai|mười một|mười|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín';
const HOURV = { 'mười hai': 12, 'mười một': 11, 'mười': 10, 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9 };
const MONEYW = new Set([...Object.keys(WORDNUM), 'mười', 'mươi', 'mốt', 'trăm', 'nghìn', 'ngàn', 'triệu', 'củ', 'rưỡi', 'linh', 'lẻ']);
const MONEYU = new Set(['trăm', 'nghìn', 'ngàn', 'triệu', 'củ']);

const STOP = new Set(('đặt đặc lấy mua muốn cần hoa bó giỏ lẵng bình hộp chậu bông cành ship giao tới đến tại ở sáng chiều tối trưa nay mốt ngày lúc vào cọc tổng giá hết và với cho đã sẽ điện thoại sđt số một hai ba bốn năm sáu bảy tám chín mười kiểu màu thiệp viết ghi lời nhờ báo gọi nhận trả chuyển thứ cn tuần khoảng tầm').split(' '));
const TITLES = 'chị|anh|cô|chú|bác|em|bà|ông|cậu|dì|mợ|thím|cháu|thầy|bạn';
const DEPOSIT_PREFIX = /(?:đã\s+)?(?:đặt\s+cọc|cọc|trả\s+trước|ứng\s+trước|chuyển\s+khoản|đã\s+trả|đã\s+chuyển|đã\s+thanh\s+toán)\s*(?:là|:|khoảng|=)?\s*$/iu;
const TOTAL_PREFIX = /(?:tổng\s+cộng|tổng|giá|hết|thành\s+tiền|tất\s+cả)\s*(?:là|:|khoảng|=)?\s*$/iu;

// Chuyển dãy từ chỉ số tiếng Việt thành số (null nếu không hiểu)
function wordsToNumber(words) {
  let total = 0, sec = 0, pend = 0, lastMult = 0, hundredOnly = true, half = false;
  for (const w of words) {
    if (w in WORDNUM) pend = WORDNUM[w];
    else if (w === 'mốt') pend = 1;
    else if (w === 'mười') sec += 10;
    else if (w === 'mươi') { sec += (pend || 1) * 10; pend = 0; }
    else if (w === 'trăm') { sec += (pend || 1) * 100; pend = 0; lastMult = lastMult || 100; }
    else if (w === 'nghìn' || w === 'ngàn') { sec += pend; pend = 0; total += (sec || 1) * 1000; sec = 0; lastMult = 1000; hundredOnly = false; }
    else if (w === 'triệu' || w === 'củ') { sec += pend; pend = 0; total += (sec || 1) * 1e6; sec = 0; lastMult = 1e6; hundredOnly = false; }
    else if (w === 'rưỡi') { half = true; if (lastMult === 1e6) total += 5e5; else if (lastMult === 1000) total += 500; else sec += 50; }
    else if (w === 'linh' || w === 'lẻ') { /* bỏ qua */ }
    else return null;
  }
  sec += pend;
  if (lastMult === 1e6 && sec > 0 && sec < 10) { total += sec * 1e5; sec = 0; }
  else if (lastMult === 1000 && sec > 0 && sec < 10) { total += sec * 100; sec = 0; }
  total += sec;
  if (hundredOnly && total < 1000 && total > 0) total *= 1000; // "năm trăm" = 500.000đ trong ngữ cảnh giá hoa
  return total > 0 ? total : null;
}

export function parseOrderText(input, today) {
  const text = String(input || '').normalize('NFC').trim();
  const w = text;                    // chuỗi gốc; mọi vị trí đều tính trên chuỗi này
  const spans = [];                  // các đoạn đã dùng (để xoá khỏi phần mô tả)
  const free = (s, e) => !spans.some(([a, b]) => s < b && e > a);
  const take = (s, e) => spans.push([s, e]);
  const out = { customer: '', phone: '', content: '', items: [], cardMessage: '', dueDate: '', dueTime: '', dueTimeEnd: '', method: 'pickup', address: '', total: null, deposit: 0, note: '', uncertain: [], raw: text, usedAI: false };
  const unsure = new Set();

  // 1) Số điện thoại
  for (const m of w.matchAll(/(?:\+?84|0)[\d .\-]{8,12}\d/g)) { const p = m[0].replace(/\D/g, ''); if (p.length >= 9) { out.phone = p.startsWith('84') ? '0' + p.slice(2) : p; take(m.index, m.index + m[0].length); break; } }

  // 2) Tên khách: danh xưng + 1-2 từ sau đó
  const tm = rx(TITLES).exec(w);
  if (tm) {
    const toks = [];
    let pos = tm.index + tm[0].length;
    const rest = w.slice(pos);
    const re = /^\s+([\p{L}]+)/u;
    let cur = rest, used = 0;
    for (let i = 0; i < 3; i++) {
      const m = re.exec(cur); if (!m) break;
      toks.push({ t: m[1], end: pos + used + m[0].length }); used += m[0].length; cur = rest.slice(used);
    }
    const isStop = (t) => STOP.has(t.toLowerCase()) || (t === 'mai' ); // "mai" viết thường là ngày mai
    const name = [];
    let endAt = tm.index + tm[0].length;
    for (let i = 0; i < toks.length && name.length < 2; i++) {
      const { t, end } = toks[i];
      if (isStop(t)) break;
      const capitalised = t[0] !== t[0].toLowerCase();
      if (name.length === 1 && !capitalised) {
        const nxt = toks[i + 1]; // từ thứ hai viết thường: chỉ nhận khi theo sau là từ khoá hoặc số
        const nextIsStop = !nxt || STOP.has(nxt.t.toLowerCase());
        const followedByDigit = /^\s*\d/.test(w.slice(end));
        if (!(nextIsStop || followedByDigit)) break;
      }
      name.push(t); endAt = end;
    }
    if (name.length) {
      out.customer = [cap(tm[0].toLowerCase()), ...name.map(cap)].join(' ');
      take(tm.index, endAt);
    }
  }

  // 3) Ngày nhận
  let datePeriod = '';
  const todayDow = dowOf(today);
  const pickDate = (re, fn) => { for (const m of w.matchAll(re)) { if (!free(m.index, m.index + m[0].length)) continue; const d = fn(m); if (d) { out.dueDate = d; take(m.index, m.index + m[0].length); if (m.groups?.p) datePeriod = m.groups.p.toLowerCase(); return true; } } return false; };
  const PER = '(?<p>sáng|trưa|chiều|tối)';
  const found =
    pickDate(rx(`(?:${PER}\\s+)?(?:ngày\\s+)?(?:hôm\\s+nay|bữa\\s+nay)|(?<p2>sáng|trưa|chiều|tối)\\s+nay`), () => today) ||
    pickDate(rx(`(?:${PER}\\s+)?(?:ngày\\s+)?(?:mốt|kia)`), () => addDays(today, 2)) ||
    pickDate(rx(`(?:${PER}\\s+)?(?:ngày\\s+)?mai`), function (m) {
      const before = w.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
      if (/(?:hoa|cây|chậu|cành|cánh|bó|giỏ)\s*$/u.test(before) && !m.groups.p) return null; // "hoa mai" là loại hoa
      return addDays(today, 1);
    }) ||
    pickDate(rx('(?:thứ\\s+(hai|ba|tư|năm|sáu|bảy)|chủ\\s+nhật)(?:\\s+(tuần\\s+(?:này|sau|tới)))?'), (m) => {
      const map = { hai: 1, ba: 2, 'tư': 3, 'năm': 4, 'sáu': 5, 'bảy': 6 };
      const target = m[1] ? map[m[1].toLowerCase()] : 0;
      let ahead = (target - todayDow + 7) % 7; if (ahead === 0) ahead = 7;
      if (m[2] && /sau|tới/i.test(m[2])) ahead += 7;
      return addDays(today, ahead);
    }) ||
    pickDate(rx('(?:ngày\\s+)?(\\d{1,2})\\s*(?:\\/|-|\\s+tháng\\s+)\\s*(\\d{1,2})(?!\\d)'), (m) => {
      const d = +m[1], mo = +m[2]; if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
      const y0 = +today.slice(0, 4); let cand = `${y0}-${pad(mo)}-${pad(d)}`; if (cand < today) cand = `${y0 + 1}-${pad(mo)}-${pad(d)}`; return cand;
    }) ||
    pickDate(rx('ngày\\s+(\\d{1,2})'), (m) => {
      const d = +m[1]; if (d < 1 || d > 31) return null;
      let y = +today.slice(0, 4), mo = +today.slice(5, 7); let cand = `${y}-${pad(mo)}-${pad(d)}`;
      if (cand < today) { mo++; if (mo > 12) { mo = 1; y++; } cand = `${y}-${pad(mo)}-${pad(d)}`; }
      return cand;
    });
  void found;
  const p2 = /(?:sáng|trưa|chiều|tối)\s+nay/iu.exec(w); if (p2 && !datePeriod) datePeriod = p2[0].split(/\s+/)[0].toLowerCase();

  // 4) Giờ nhận
  const periodNear = (s, e) => {
    const after = /^\s*(sáng|trưa|chiều|tối|đêm)(?![\p{L}])/iu.exec(w.slice(e));
    if (after) return { p: after[1].toLowerCase(), end: e + after[0].length };
    const before = /(sáng|trưa|chiều|tối|đêm)\s*(?:lúc\s*|vào\s*)?$/iu.exec(w.slice(0, s));
    if (before) return { p: before[1].toLowerCase(), start: s - before[0].length };
    return null;
  };
  const cands = [
    ...[...w.matchAll(/(\d{1,2})\s*(?:h|giờ|g|:)\s*(\d{2})?(?!\d)(?:\s*(rưỡi))?/giu)].map((m) => ({ m, h: +m[1], mi: m[2] ? +m[2] : m[3] ? 30 : 0 })),
    ...[...w.matchAll(rx(`(${HOURW})\\s+giờ(?:\\s+(rưỡi|\\d{1,2}))?`))].map((m) => ({ m, h: HOURV[m[1].toLowerCase()], mi: m[2] ? (/rưỡi/i.test(m[2]) ? 30 : +m[2]) : 0 })),
    ...[...w.matchAll(rx(`(${HOURW}|\\d{1,2})\\s+rưỡi`))].map((m) => ({ m, h: /\d/.test(m[1]) ? +m[1] : HOURV[m[1].toLowerCase()], mi: 30 })),
  ];
  for (const c of cands.sort((a, b) => a.m.index - b.m.index)) {
    const s = c.m.index, e = s + c.m[0].length;
    if (!free(s, e) || c.h > 23 || c.mi > 59 || c.h == null) continue;
    if (/^\s*(?:k|nghìn|ngàn|triệu|tr|củ|đ|đồng)(?![\p{L}])/iu.test(w.slice(e))) continue; // đây là tiền, không phải giờ
    const near = periodNear(s, e);
    const per = near?.p || datePeriod;
    let h = c.h;
    if (per === 'chiều' || per === 'tối') { if (h < 12) h += 12; }
    else if (per === 'trưa') { if (h >= 1 && h <= 5) h += 12; }
    else if (per === 'đêm') { if (h >= 6 && h < 12) h += 12; }
    else if (!per && h >= 1 && h <= 6) { h += 12; unsure.add('dueTime'); } // không nói sáng/chiều: tiệm hoa thường là chiều, nhưng cần kiểm tra
    if (h > 23) continue;
    out.dueTime = `${pad(h)}:${pad(c.mi)}`;
    const lead = /(?:lúc|vào|khoảng|tầm)\s*$/iu.exec(w.slice(0, near?.start ?? s));
    take(lead ? (near?.start ?? s) - lead[0].length : (near?.start ?? s), near?.end ?? e);
    break;
  }

  // 5) Tiền: tổng và tiền cọc
  const money = [];
  for (const m of w.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|củ|đồng|đ|vnđ|vnd)?(?![\p{L}\p{N}])/giu)) {
    let s = m.index, e = s + m[0].length;
    if (!free(s, e)) continue;
    const numS = m[1], unit = (m[2] || '').toLowerCase();
    const thousands = /^\d{1,3}(?:[.,]\d{3})+$/.test(numS);
    let v;
    if (thousands) v = +numS.replace(/[.,]/g, ''); else v = +numS.replace(',', '.');
    if (!Number.isFinite(v)) continue;
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') v *= 1000;
    else if (unit === 'tr' || unit === 'triệu' || unit === 'củ') v *= 1e6;
    else if (!unit) { if (v < 10000 || /^0/.test(numS)) continue; }
    if (/triệu|tr|củ|nghìn|ngàn/i.test(unit)) { // "1 triệu 2" = 1,2 triệu; "1 triệu rưỡi"
      const tail = /^\s+(?:(\d)(?!\d)|(rưỡi))/iu.exec(w.slice(e));
      if (tail && free(e, e + tail[0].length)) { const big = /tr|triệu|củ/i.test(unit) ? 1e6 : 1000; v += tail[1] ? +tail[1] * big / 10 : big / 2; e += tail[0].length; }
    }
    if (v < 1000) continue;
    money.push({ s, e, v: Math.round(v) });
  }
  // dạng chữ: "năm trăm nghìn", "hai triệu rưỡi"
  const toks = [...w.matchAll(/[\p{L}]+/gu)];
  for (let i = 0; i < toks.length; i++) {
    if (!MONEYW.has(toks[i][0].toLowerCase())) continue;
    let j = i; const words = [];
    while (j < toks.length && MONEYW.has(toks[j][0].toLowerCase()) && (j === i || /^\s+$/.test(w.slice(toks[j - 1].index + toks[j - 1][0].length, toks[j].index)))) { words.push(toks[j][0].toLowerCase()); j++; }
    const s = toks[i].index, e = toks[j - 1].index + toks[j - 1][0].length;
    if (words.some((x) => MONEYU.has(x)) && free(s, e) && !money.some((x) => s < x.e && e > x.s)) {
      const v = wordsToNumber(words); if (v) money.push({ s, e, v });
    }
    i = j - 1;
  }
  money.sort((a, b) => a.s - b.s);
  for (const mo of money) {
    const before = w.slice(Math.max(0, mo.s - 28), mo.s);
    const dep = DEPOSIT_PREFIX.exec(before), tot = TOTAL_PREFIX.exec(before);
    const pre = dep || tot;
    const start = pre ? mo.s - pre[0].length : mo.s;
    if (dep) { if (!out.deposit) { out.deposit = mo.v; take(start, mo.e); } }
    else if (out.total == null) { out.total = mo.v; take(start, mo.e); }
    else if (!out.deposit && /trước|cọc/i.test(before)) { out.deposit = mo.v; take(start, mo.e); }
  }
  const halfM = /(?:đã\s+)?(?:trả\s+trước|cọc)\s+(?:một\s+)?nửa/iu.exec(w);
  if (halfM) { take(halfM.index, halfM.index + halfM[0].length); if (out.total) out.deposit = Math.round(out.total / 2); else unsure.add('deposit'); }

  // 6) Giao hay khách lấy
  let rest = w;
  const del = /(?<![\p{L}])(?:ship|giao(?:\s+(?:tận\s+nơi|tận\s+nhà|hàng|hoa))?|mang)(?![\p{L}])/iu.exec(w);
  if (del && free(del.index, del.index + del[0].length)) {
    out.method = 'delivery';
    const tail = w.slice(del.index + del[0].length);
    const am = /^\s*(?:đến|tới|tại|ở|về|qua)\s+([^,;\n]+)/iu.exec(tail);
    let end = del.index + del[0].length;
    if (am) {
      let addr = am[1].trim();
      // cắt phần địa chỉ ở chỗ đã được dùng cho ngày/giờ/tiền
      const base = del.index + del[0].length + am[0].length - am[1].length;
      let cut = addr.length;
      for (const [a, b] of spans) if (a >= base && a < base + addr.length) cut = Math.min(cut, a - base);
      addr = addr.slice(0, cut).trim().replace(/[,.\s]+$/, '');
      if (addr && !/^(?:nhà|nơi|tận nơi|nhà khách|chỗ khách|địa chỉ)$/iu.test(addr) && addr.length >= 4) { out.address = addr; end = base + cut; }
      else end = base + cut;
    }
    take(del.index, end);
    if (!out.address) unsure.add('address');
  }
  rest = '';
  { let last = 0; for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) { if (a > last) rest += w.slice(last, a); rest += ' '; last = Math.max(last, b); } rest += w.slice(last); }

  // 7) Nội dung hoa = phần còn lại đã làm sạch
  let content = rest
    .replace(/(?<![\p{L}])(?:khách\s+(?:tự\s+)?lấy|tự\s+lấy|đến\s+lấy|qua\s+lấy|ghé\s+lấy)(?![\p{L}])/giu, ' ')
    .replace(/(?<![\p{L}])(?:nhé|nha|ạ|giúp|nhờ|làm\s+giúp|cho\s+tôi|cho\s+mình)(?![\p{L}])/giu, ' ');
  for (let i = 0; i < 4; i++) content = content.replace(/^[\s,.;:\-]+|[\s,.;:\-]+$/g, '').replace(/^(?:đặt|muốn|mua|cần|lấy|và|lúc|vào|là|khoảng|với|cho|order)(?![\p{L}])\s*/iu, '').replace(/\s+(?:lấy|đặt|và|lúc|vào|là|với|cho)$/iu, '');
  content = content.replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').replace(/([,;]\s*){2,}/g, ', ').trim();
  if (content.length >= 2) out.content = cap(content); else { out.content = spans.length ? '' : text; unsure.add('content'); }

  // 8) Mục hàng (số lượng + đơn vị + tên)
  const NUMW = Object.keys(WORDNUM).concat('mười').join('|');
  const im = [...out.content.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])(\\d+|${NUMW})\\s+(bó|giỏ|lẵng|bình|hộp|chậu|bông|cành|kệ|vòng)\\s+([^,;]+)`, 'giu'))];
  for (const m of im) {
    const q = /\d/.test(m[1]) ? m[1] : String(m[1].toLowerCase() === 'mười' ? 10 : WORDNUM[m[1].toLowerCase()]);
    const color = /(đỏ|trắng|vàng|hồng|tím|xanh|cam)\s*$/iu.exec(m[3].trim());
    const style = /kiểu\s+([\p{L}]+(?:\s[\p{L}]+)?)/iu.exec(out.content);
    out.items.push({ name: m[3].trim().replace(/\s+kiểu.*$/iu, ''), qty: q, unit: m[2].toLowerCase(), color: color ? color[1].toLowerCase() : '', style: style ? style[1] : '' });
  }
  const card = /(?:viết\s+thiệp|lời\s+thiệp|thiệp\s+ghi|ghi\s+thiệp)\s*[:\-]?\s*["“]?([^"”]+)["”]?$/iu.exec(w);
  if (card) out.cardMessage = card[1].trim();

  if (!out.customer) unsure.add('customer');
  if (!out.dueDate) unsure.add('dueDate');
  out.uncertain = [...unsure];
  return out;
}
