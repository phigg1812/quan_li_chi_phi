// Tiệm Hoa Quý Cảnh - giao diện
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { esc, TZ, nowVN, today, dparse, addDays, diffDays, WD, short, toMin, dayLabel, fmtTs, money, digits, normPhone, fold, remain, timeText, methodText, doneText, isOverdue, payInfo, cmp, applyFilter } = window.QC;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// ---------- Biểu tượng (nét mảnh, kiểu SF Symbols) ----------
const ICONS = {
  x: '<path d="M18 6L6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M20 6L9 17l-5-5"/>', chev: '<path d="M9 18l6-6-6-6"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  clip: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  qr: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  box: '<path d="M21 8 12 3 3 8l9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>', truck: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17.5l9 5 9-5"/>', tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>', coins: '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v6c0 1.7 2.7 3 6 3M3 12v6c0 1.7 2.7 3 6 3 3 0 6-1.3 6-3v-1"/><ellipse cx="16" cy="13" rx="5" ry="2.5"/><path d="M11 13v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"/>', wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h3"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', flower: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.6c-2.6-3.4-1.4-6.6 0-6.6s2.6 3.2 0 6.6zM12 14.4c2.6 3.4 1.4 6.6 0 6.6s-2.6-3.2 0-6.6zM9.6 12C6.2 9.4 3 10.6 3 12s3.2 2.6 6.6 0zM14.4 12c3.4 2.6 6.6 1.4 6.6 0s-3.2-2.6-6.6 0z"/>',
  alert: '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

// ---------- Trạng thái ----------
let pass = store.get('pin') || '';
const S = { user: null, orders: [], customers: [], settings: {}, features: {}, vapidKey: '', filter: 'all', q: '', cq: '', tab: 'orders', doneShown: 30, offline: false, anim: true, sort: 'new', shownTab: null, requests: [] };
const TABS = ['orders', 'customers', 'report', 'settings'];
const TAB_TITLE = { orders: 'Quản lý đơn hàng', customers: 'Khách hàng', report: 'Báo cáo', settings: 'Cài đặt' };
const isIOS = /iPhone|iPad/.test(navigator.userAgent);
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

// ---------- Gọi máy chủ (có thử lại khi mạng yếu) ----------
async function api(path, o = {}) {
  const method = o.method || 'GET';
  const headers = { 'x-passcode': pass };
  let body = o.body;
  if (o.type) headers['content-type'] = o.type;
  else if (body !== undefined && !(body instanceof FormData)) { headers['content-type'] = 'application/json'; body = JSON.stringify(body); }
  const tries = method === 'GET' ? 3 : 1;
  let res;
  for (let i = 0; i < tries; i++) {
    try { res = await fetch(path, { method, headers, body }); break; }
    catch { if (i === tries - 1) { const e = new Error('Không kết nối được mạng. Vui lòng kiểm tra mạng rồi thử lại.'); e.network = true; throw e; } await sleep(800 * (i + 1)); }
  }
  if (o.blob && res.ok) return res.blob();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) showLogin();
    const e = new Error(data.error || 'Lỗi ' + res.status); e.status = res.status; throw e;
  }
  return data;
}

// ---------- Thông báo nhỏ ----------
let toastT;
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-act="toastundo">Hoàn tác</button>' : ''}`;
  clearTimeout(toast.h);
  t.classList.remove('hidden'); void t.offsetWidth; t.classList.add('show');
  toast.undo = undo;
  clearTimeout(toastT);
  toastT = setTimeout(hideToast, undo ? 7000 : 3500);
}
function hideToast() {
  const t = $('#toast'); t.classList.remove('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 450);
}
// Hộp xác nhận trượt từ dưới lên (thay confirm() của trình duyệt). Nút Huỷ được chọn sẵn để tránh bấm nhầm.
function askConfirm({ title, msg = '', ok = 'Đồng ý', danger = false }) {
  return new Promise((resolve) => {
    const el = document.createElement('div'); el.className = 'dlg';
    el.innerHTML = `<div class="dlg-bg"></div><div class="dlg-box" role="alertdialog" aria-modal="true" aria-labelledby="dlgT"><div class="dlg-head"><b id="dlgT">${esc(title)}</b>${msg ? `<p>${esc(msg).replace(/\n/g, '<br>')}</p>` : ''}</div><button type="button" class="dlg-ok${danger ? ' danger' : ''}">${esc(ok)}</button><button type="button" class="dlg-cancel">Huỷ</button></div>`;
    document.body.appendChild(el); void el.offsetWidth; el.classList.add('show');
    const cancel = $('.dlg-cancel', el); cancel.focus();
    const end = (v) => { document.removeEventListener('keydown', onKey, true); el.classList.remove('show'); setTimeout(() => el.remove(), 380); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); end(false); } };
    document.addEventListener('keydown', onKey, true);
    $('.dlg-ok', el).addEventListener('click', () => end(true));
    cancel.addEventListener('click', () => end(false));
    $('.dlg-bg', el).addEventListener('click', () => end(false));
  });
}
const fail = (e) => { if (e.status !== 401) toast(e.message); };

// ---------- Cửa sổ trượt ----------
const sheets = [];
function pushSheet(opts) {
  const el = document.createElement('div');
  el.className = 'sheet' + (opts.light ? ' light' : '');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  const sh = { el, opts };
  sheets.push(sh);
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  paintSheet(sh);
  void el.offsetWidth; // chốt vị trí ban đầu rồi mới trượt lên
  requestAnimationFrame(() => el.classList.add('show'));
  return sh;
}
function paintSheet(sh) {
  const o = sh.opts, st = sh.el.scrollTop;
  sh.el.innerHTML = `<div class="sheet-in"><div class="sheet-head"><h2>${esc(typeof o.title === 'function' ? o.title() : o.title || '')}</h2><button data-act="closesheet">Đóng</button></div>${o.render()}</div>`;
  sh.el.scrollTop = st;
  hydrateImgs(sh.el);
  if (o.mount) o.mount(sh.el);
}
function refreshSheets() { sheets.forEach((sh) => { if (sh.opts.live !== false) paintSheet(sh); }); }
function closeSheet(sh = sheets[sheets.length - 1]) {
  if (!sh || sh.closing) return;
  sh.closing = true;
  if (sh.opts.onClose) sh.opts.onClose();
  sheets.splice(sheets.indexOf(sh), 1);
  $$('[id]', sh.el).forEach((n) => n.removeAttribute('id')); // tránh trùng id khi đang trượt xuống
  const inn = $('.sheet-in', sh.el); if (inn) inn.style.transform = '';
  sh.el.style.pointerEvents = 'none';
  sh.el.classList.remove('show');
  setTimeout(() => sh.el.remove(), 480);
  if (!sheets.length) document.body.style.overflow = '';
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
const topSheet = () => sheets[sheets.length - 1];
// Kéo thanh trên cùng của cửa sổ xuống để đóng
let drag = null;
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.sheet-head'); if (!h || e.target.closest('button')) return;
  const sh = sheets.find((s) => s.el.contains(h)); if (!sh || sh !== topSheet()) return;
  drag = { sh, y: e.clientY, dy: 0, inn: $('.sheet-in', sh.el) };
  sh.el.classList.add('dragging');
  try { h.setPointerCapture(e.pointerId); } catch {}
});
document.addEventListener('pointermove', (e) => { if (!drag) return; drag.dy = Math.max(0, e.clientY - drag.y); drag.inn.style.transform = `translateY(${drag.dy}px)`; });
const endDrag = () => {
  if (!drag) return;
  const d = drag; drag = null; d.sh.el.classList.remove('dragging');
  if (d.dy > 110) closeSheet(d.sh); else d.inn.style.transform = '';
};
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);

// ---------- Ảnh (tải kèm mã truy cập, dựng thành blob) ----------
const imgCache = new Map();
async function imgURL(pid, size) {
  const k = pid + size;
  if (imgCache.has(k)) return imgCache.get(k);
  const blob = await api(`/api/photos/${pid}?size=${size}`, { blob: true });
  const u = URL.createObjectURL(blob); imgCache.set(k, u); return u;
}
function hydrateImgs(root) {
  $$('img[data-photo]', root).forEach((img) => {
    if (img.getAttribute('src')) return;
    imgURL(img.dataset.photo, img.dataset.size || 'thumb').then((u) => { img.src = u; }).catch(() => { img.alt = 'Không tải được ảnh'; });
  });
}
async function loadBitmap(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {} }
  const url = URL.createObjectURL(file);
  try { return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh')); i.src = url; }); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}
async function shrink(bmp, max, q) {
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * r)); c.height = Math.max(1, Math.round(bmp.height * r));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const to = (type) => new Promise((res) => c.toBlob(res, type, q));
  let b = await to('image/webp');
  if (!b || b.type !== 'image/webp') b = await to('image/jpeg'); // Safari cũ chưa hỗ trợ WebP
  if (!b) throw new Error('Không xử lý được ảnh');
  return b;
}
async function prepPhoto(file) {
  const bmp = await loadBitmap(file);
  let full = await shrink(bmp, 1600, 0.8);
  if (full.size > 2.8 * 1024 * 1024) full = await shrink(bmp, 1100, 0.7);
  const thumb = await shrink(bmp, 360, 0.7);
  if (bmp.close) bmp.close();
  return { full, thumb };
}
// Chỉ báo "đã lưu" khi máy chủ đã trả về đơn có ảnh mới
async function uploadPhotos(orderId, files) {
  let ok = 0, bad = 0, lastErr = '';
  const list = [...files];
  for (let i = 0; i < list.length; i++) {
    toast(`Đang tải ảnh ${i + 1}/${list.length}…`);
    try {
      const { full, thumb } = await prepPhoto(list[i]);
      const fd = new FormData();
      fd.append('full', full, 'full.' + (full.type === 'image/webp' ? 'webp' : 'jpg'));
      fd.append('thumb', thumb, 'thumb.' + (thumb.type === 'image/webp' ? 'webp' : 'jpg'));
      upsert(await api(`/api/orders/${orderId}/photos`, { method: 'POST', body: fd }));
      ok++;
    } catch (e) { bad++; lastErr = e.message; if (e.status === 401) return { ok, bad }; }
  }
  render(); refreshSheets();
  if (bad) toast(`Chưa tải được ${bad} ảnh (${lastErr}). Bấm thêm ảnh để thử lại.`);
  else toast(`Đã lưu ${ok} ảnh`);
  return { ok, bad };
}

// ---------- Logic đơn hàng ----------
const upsert = (o) => { const i = S.orders.findIndex((x) => x.id === o.id); if (i >= 0) S.orders[i] = o; else S.orders.push(o); };
const byId = (id) => S.orders.find((o) => o.id === id);
const searchOrders = (q) => {
  const f = fold(q), dq = digits(q);
  return S.orders.filter((o) => fold([o.customer, o.content, o.code, o.address, o.note].join(' ')).includes(f) || (dq.length >= 3 && o.phone.includes(dq)));
};

// Ô nhập tiền: tự chèn dấu chấm hàng nghìn khi gõ, giữ nguyên vị trí con trỏ
const fm = (n) => (n == null || n === '' ? '' : String(n).replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
document.addEventListener('input', (e) => {
  const el = e.target; if (!el.matches || !el.matches('input[data-money]')) return;
  const raw = el.value, pos = el.selectionStart ?? raw.length, left = raw.slice(0, pos).replace(/\D/g, '').length, out = fm(raw);
  if (out === raw) return;
  el.value = out; let n = 0, i = 0; for (; i < out.length && n < left; i++) if (/\d/.test(out[i])) n++;
  try { el.setSelectionRange(i, i); } catch {}
});
function avatar(name) {
  const clean = (name || '?').trim().split(/\s+/);
  const initials = clean.at(-1)?.charAt(0)?.toLocaleUpperCase('vi-VN') || '?';
  return `<span class="avatar">${esc(initials)}</span>`;
}
// ---------- Hiển thị danh sách ----------
function card(o) {
  const od=isOverdue(o), pi=payInfo(o), dl=dayLabel(o.dueDate)[0];
  const image=o.photos.length?`<img class="order-photo" data-photo="${esc(o.photos[0].id)}" alt="Ảnh hoa mẫu" loading="lazy">`:avatar(o.customer);
  const dd=dparse(o.dueDate), dshort=`${String(dd.getUTCDate()).padStart(2,'0')}/${String(dd.getUTCMonth()+1).padStart(2,'0')}`;
  const timeD=o.dueTime?`${esc(timeText(o))} - ${dshort}`:`Chưa chốt giờ - ${dshort}`;
  const rem=o.total==null?'—':money(remain(o)), paidOK=o.total!=null&&remain(o)===0;
  const doneBtn=o.done?`<button class="b undo" data-act="undone">Hoàn tác</button>`:`<button class="b main" data-act="done">${ic('check')}${doneText(o)}</button>`;
  const meth=`<span class="mchip ${o.method==='delivery'?'delivery':''}">${ic(o.method==='delivery'?'truck':'pin')}${methodText(o)}</span>`;
  return `<article class="card v3-card ${o.done?'done':''} ${od?'late':''}" data-id="${esc(o.id)}">
    <div class="row1 m-only"><span class="code">${esc(o.code)} · ${esc(dl)}${o.createdBy?` · <span class="by">${esc(o.createdBy)} nhận</span>`:''}</span><span class="tag ${pi.cls}">${esc(pi.text)}</span></div>
    <div class="q-grid">
      <div class="order-cover">${image}</div>
      <div class="order-info"><span class="q-code d-only">${esc(o.code)}</span><b class="who">${esc(o.customer)}</b>
        ${o.phone?`<div class="q-line d-only">${ic('phone')}<span>${esc(o.phone)}</span></div>`:''}
        <div class="order-content"><span class="m-only ico">${ic('box')}</span><span class="d-only ico">${ic('flower')}</span><span class="txt">${esc(o.content)}</span></div>
        <div class="when m-only">${ic('cal')}<span>${esc(timeText(o))} · ${short(o.dueDate)}${od?' · Quá hạn':''}</span></div>
        <span class="m-only">${meth}</span>
        <div class="q-line d-only">${ic('pin')}<span>${o.method==='delivery'&&o.address?esc(o.address):'Khách đến lấy'}</span></div></div>
      <div class="q-mid d-only">
        <div class="q-line">${ic('cal')}<span>Giao:</span><b class="tchip ${od?'late':''}">${timeD}</b></div>
        <div class="q-line">${ic(o.method==='delivery'?'truck':'pin')}<span>${methodText(o)}</span></div>
        <div class="q-line">${ic('tag')}<span>Giá đơn:</span><b>${o.total==null?'Chưa chốt':money(o.total)}</b></div>
        <div class="q-line">${ic('wallet')}<span>Đã thu:</span><b>${money(o.paid)}</b></div>
        <div class="q-owe ${paidOK?'ok':''}">${ic('coins')}<span>Còn phải thu:</span><strong>${rem}</strong></div>
      </div>
      <div class="q-side d-only">
        <span class="tag ${pi.cls}">${esc(pi.text)}</span>
        <div class="q-tools">${o.phone?`<a class="tool" href="tel:${esc(normPhone(o.phone))}">${ic('phone')}<span>Gọi</span></a>`:'<span></span>'}<button class="tool" data-act="cardedit">${ic('edit')}<span>Sửa</span></button><button class="tool" data-act="open" aria-label="Chi tiết">${ic('dots')}</button></div>
        ${doneBtn}
      </div>
    </div>
    ${o.method==='delivery' && o.address?`<div class="addr m-only">${ic('pin')} ${esc(o.address)}</div>`:''}
    <div class="v3-finance m-only"><div><span>${ic('tag')}Giá đơn</span><b>${o.total==null?'Chưa chốt':money(o.total)}</b></div><div><span>${ic('coins')}Đã thu</span><b>${money(o.paid)}</b></div><div class="important"><span>${ic('coins')}Còn phải thu</span><strong>${rem}</strong></div></div>
    <div class="acts m-only">${o.phone ? `<a class="b call" href="tel:${esc(normPhone(o.phone))}">${ic('phone')}Gọi</a>` : ''}<button class="b" data-act="open">${ic('info')}Chi tiết</button>${doneBtn}</div>
  </article>`;
}
function groupedCards(list, lateMark) {
  let html = '', cur = '', open = false;
  for (const o of list) {
    if (o.dueDate !== cur) {
      if (open) html += '</div>';
      cur = o.dueDate;
      const [a, b] = dayLabel(cur), n = list.filter((x) => x.dueDate === cur).length;
      const dsh = short(cur), dd = a.includes(',') ? a : `${a}, ${dsh}`;
      html += `<div class="day ${lateMark && cur < today() ? 'late' : ''} ${cur === today() ? 'is-today' : cur === addDays(today(), 1) ? 'is-tom' : ''}"><span class="dt">${ic('cal')}<span class="dm">${esc(a)} (${n} đơn)</span><span class="dd">${esc(dd)} (${n} đơn)</span></span><small>${esc(b)}</small></div><div class="dcards">`;
      open = true;
    }
    html += card(o);
  }
  return html + (open ? '</div>' : '');
}
function renderList() {
  const el = $('#list');
  let html = '';
  if (S.q.trim()) {
    const res = searchOrders(S.q);
    const open = res.filter((o) => !o.done).sort(cmp), done = res.filter((o) => o.done).sort((a, b) => cmp(b, a));
    html = res.length ? groupedCards(open, true) + (done.length ? `<div class="day"><span>Đã hoàn tất (${done.length})</span></div><div class="dcards">${done.slice(0, 30).map(card).join('')}</div>` : '') : '<div class="empty">Không tìm thấy đơn nào phù hợp</div>';
  } else if (S.filter === 'all') {
    const open = S.orders.filter((o) => !o.done).sort(cmp), done = S.orders.filter((o) => o.done).sort((a, b) => cmp(b, a));
    if (S.sort === 'old') open.reverse();
    html = open.length ? groupedCards(open, true) : '<div class="empty">Không còn đơn nào chưa giao.<br>Bấm dấu + ở trên để thêm đơn mới</div>';
    if (done.length) html += `<div class="day"><span>Đã hoàn tất (${done.length})</span></div>${done.slice(0, S.doneShown).map(card).join('')}${done.length > S.doneShown ? '<button class="btn ghost" data-act="moredone">Hiện thêm đơn đã hoàn tất</button>' : ''}`;
  } else {
    const list = applyFilter(S.orders, S.filter).sort(cmp);
    if (S.sort === 'old') list.reverse();
    html = list.length ? groupedCards(list, S.filter !== 'unpaid') : `<div class="empty">${{ today: 'Hôm nay không có đơn nào cần giao', tomorrow: 'Ngày mai chưa có đơn nào', upcoming: 'Chưa có đơn nào sắp tới', unpaid: 'Không còn đơn nào chưa thu đủ tiền', overdue: 'Không có đơn quá hạn' }[S.filter] || 'Không có đơn nào'}</div>`;
  }
  el.innerHTML = html; hydrateImgs(el);
  if (S.anim) { S.anim = false; $$('.card', el).slice(0, 10).forEach((c, i) => { c.classList.add('rise'); c.style.animationDelay = i * 45 + 'ms'; }); }
}
function renderStats() {
  const t = today(), open = S.orders.filter((o) => !o.done);
  const od = open.filter(isOverdue).length;
  const up = open.filter((o) => o.dueDate > t).length;
  const cards = [
    ['today', 'cal', 'g', `Hôm nay (${short(t)})`, open.filter((o) => o.dueDate === t).length, ''],
    ['tomorrow', 'cal', 'b', `Ngày mai (${short(addDays(t, 1))})`, open.filter((o) => o.dueDate === addDays(t, 1)).length, ''],
    ['upcoming', 'clock', 'y', 'Sắp tới', up, 'd-only'],
    ['dayafter', 'clock', 'y', `Ngày kia (${short(addDays(t, 2))})`, open.filter((o) => o.dueDate === addDays(t, 2)).length, 'm-only'],
    ['all', 'layers', 'p', 'Tất cả đơn', S.orders.length, ''],
  ];
  $('#stats').innerHTML = (od ? `<button class="alert" data-act="overdue">${ic('alert')}Có ${od} đơn quá hạn chưa giao. Bấm để xem</button>` : '') +
    cards.map(([f, i, c, l, n, vis]) => `<button class="stat c-${c} ${vis} ${S.filter === f && !S.q ? 'on' : ''}" data-act="filter" data-f="${f}">${ic(i)}<b>${n}</b><span>${l}</span>${f === 'all' ? '<img class="stat-deco" src="/deco-bouquet.png?v=1" alt="" aria-hidden="true">' : ''}</button>`).join('');
  const qi = { today: 'cal', tomorrow: 'cal', upcoming: 'clock', all: 'cal' };
  $('#quick').innerHTML = [['today', 'Hôm nay', short(t)], ['tomorrow', 'Ngày mai', short(addDays(t, 1))], ['upcoming', 'Sắp tới', ''], ['all', 'Tất cả', '']]
    .map(([f, l, d]) => `<button type="button" class="${S.filter === f && !S.q ? 'on' : ''}" data-act="filter" data-f="${f}" aria-pressed="${S.filter === f && !S.q}">${ic(qi[f])}<span class="ql">${l}${d ? `<small>(${d})</small>` : ''}</span></button>`).join('');
  const n = od + open.filter((o) => o.dueDate === t && !isOverdue(o)).length;
  const b = $('#bellN'); b.textContent = n; b.classList.toggle('hidden', !n);
}
function renderCustomers() {
  const q = fold(S.cq), dq = digits(S.cq);
  const list = S.customers.filter((c) => !q || fold(c.name).includes(q) || (dq.length >= 3 && c.phone.includes(dq)));
  $('#clist').innerHTML = list.length ? list.map((c) => {
    const n = S.orders.filter((o) => o.customerId === c.id).length;
    return `<div class="crow"><button class="info" data-act="cust" data-cid="${c.id}"><b>${esc(c.name)}</b><small>${esc(c.phone || 'Chưa có số điện thoại')} · ${n} đơn</small></button>${c.phone ? `<a href="tel:${esc(c.phone)}">${ic('phone')}Gọi</a>` : ''}</div>`;
  }).join('') : '<div class="empty">Chưa có khách hàng nào. Khách mới sẽ tự được lưu khi bạn tạo đơn.</div>';
}
function reportRows() {
  const t = today(), open = S.orders.filter((o) => !o.done);
  const inRange = (a, b) => open.filter((o) => o.dueDate >= a && o.dueDate <= b);
  const owed = S.orders.filter((o) => (remain(o) || 0) > 0);
  return {
    today: ['Hôm nay', open.filter((o) => o.dueDate === t)],
    tomorrow: ['Ngày mai', open.filter((o) => o.dueDate === addDays(t, 1))],
    d7: ['7 ngày tới', inRange(t, addDays(t, 6))],
    d30: ['30 ngày tới', inRange(t, addDays(t, 29))],
    done: ['Đã hoàn tất', S.orders.filter((o) => o.done)],
    open: ['Chưa hoàn tất', open],
    overdue: ['Quá hạn chưa giao', open.filter(isOverdue)],
    pickup: ['Khách đến lấy (chưa giao)', open.filter((o) => o.method === 'pickup')],
    delivery: ['Cần giao tận nơi (chưa giao)', open.filter((o) => o.method === 'delivery')],
    owed: ['Đơn còn phải thu tiền', owed],
  };
}
function renderReport() {
  const t=today(), rows=reportRows(), days=Array.from({length:7},(_,i)=>addDays(t,i));
  const total=S.orders.reduce((s,o)=>s+(o.total||0),0);
  const paid=S.orders.reduce((s,o)=>s+(o.paid||0),0);
  const owed=rows.owed[1].reduce((s,o)=>s+(remain(o)||0),0);
  const counts=days.map(d=>S.orders.filter(o=>!o.done && o.dueDate===d).length);
  const peak=Math.max(1,...counts);
  const boxes=[['Giá trị tất cả đơn',money(total),'Tổng giá đơn đã ghi'],['Đã thu',money(paid),'Khoản thu đã xác nhận'],['Còn phải thu',money(owed),'Cần đối chiếu'],['Đơn chưa hoàn tất',String(rows.open[1].length),'Đơn cần thực hiện']];
  $('#report').innerHTML=`<div class="report-kpis">${boxes.map(([label,val,sub],i)=>`<div class="report-kpi ${i===2?'report-warning':''}"><span>${label}</span><strong>${val}</strong><small>${sub}</small></div>`).join('')}</div>
  <section class="report-panel"><h3>Đơn cần làm · 7 ngày tới</h3><p class="hint">Chạm vào cột để xem danh sách đơn của ngày đó.</p><div class="report-bars">${days.map((d,i)=>`<button type="button" class="report-bar" data-act="repday" data-d="${d}" aria-label="${esc(dayLabel(d)[0])}: ${counts[i]} đơn"><b>${counts[i]}</b><span class="report-track"><span style="height:${Math.max(counts[i]?9:3,counts[i]/peak*100)}%"></span></span><small>${short(d)}</small></button>`).join('')}</div></section>
  <section class="report-panel"><h3>Cần chú ý</h3><div class="report-links">${[['overdue','Quá hạn'],['owed','Chưa thu đủ'],['tomorrow','Đơn ngày mai'],['delivery','Cần giao']].map(([k,l])=>`<button data-act="rep" data-k="${k}"><span>${l}</span><b>${rows[k][1].length} đơn ›</b></button>`).join('')}</div></section>
  <details class="report-more"><summary>Xem thống kê chi tiết</summary><table class="rep">${Object.entries(rows).map(([k,[l,list]])=>`<tr><td>${esc(l)}</td><td><button data-act="rep" data-k="${k}">${list.length}</button></td></tr>`).join('')}</table></details>
  <h3 style="margin-top:20px">Lọc theo thời gian</h3><div class="box"><label>Từ ngày<input type="date" id="r-from" value="${t}"></label><label>Đến ngày<input type="date" id="r-to" value="${addDays(t,6)}"></label><button class="btn primary" data-act="range">Xem các đơn</button></div>`;
}

function render() {
  if (!S.user) return;
  renderStats(); renderList(); renderCustomers(); renderReport(); renderSettingsHome();
  $$('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
  const ti = TABS.indexOf(S.tab); $('.nav').style.setProperty('--i', ti); $('.nav').style.setProperty('--s', ti >= 2 ? ti + 1 : ti); // ô giữa dành cho nút nói
  TABS.forEach((t) => $('#tab-' + t).classList.toggle('hidden', t !== S.tab));
  $('#topTitle').textContent = 'Quản lý đơn hàng'; // đầu trang giữ nguyên ở mọi tab, tên tab đã có ở thanh dưới
  $('#topSubtitle').textContent = 'Tiệm Hoa Quý Cảnh';
  $('#searchToggle').classList.toggle('hidden', S.tab !== 'orders');
  $('#addBtn').classList.toggle('hidden', S.tab !== 'orders');
  $('#banner').classList.toggle('hidden', S.tab !== 'orders');

  if (S.shownTab !== S.tab) { // chuyển tab: nội dung mới trượt nhẹ lên
    if (S.shownTab) { const el = $('#tab-' + S.tab); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
    S.shownTab = S.tab;
  }
  renderBanner();
}
const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > (S.tab === 'orders' ? 70 : 40));
window.addEventListener('scroll', onScroll, { passive: true });
function listSheet(title, list, opts = {}) {
  pushSheet({ title, render: () => {
    const l = (opts.refilter ? opts.refilter() : list).sort(cmp);
    return l.length ? groupedCards(l, true) : '<div class="empty">Không có đơn nào</div>';
  } });
}

// ---------- Banner (thông báo, ngoại tuyến) ----------
const pushOK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function renderBanner() {
  const parts = [], off = Number(store.get('bnOff') || 0) > Date.now();
  const bn = (short, full, extra = '', dismiss = true) => `<div class="bn"><button type="button" class="bt" data-act="bntoggle" aria-label="Xem đầy đủ"><span class="s">${short}</span><span class="f">${full}</span></button>${extra}${dismiss ? '<button type="button" class="bx" data-act="bnx" aria-label="Ẩn nhắc nhở">✕</button>' : ''}</div>`;
  if (S.offline) parts.push(bn('Không có mạng. Đang xem dữ liệu đã lưu', 'Không có mạng. Đang hiển thị dữ liệu đã lưu lần trước, chưa thể lưu thay đổi.', '<button class="btn small" data-act="reload">Thử lại</button>', false));
  if (!off) {
    if (isIOS && !standalone) parts.push(bn('Thêm vào màn hình chính để nhận thông báo', 'Để nhận thông báo trên iPhone: bấm nút Chia sẻ (ô vuông có mũi tên), chọn <b>“Thêm vào MH chính”</b>, rồi mở ứng dụng từ màn hình chính.'));
    else if (pushOK && Notification.permission === 'default') parts.push(bn('Bật thông báo để được nhắc đơn đến hạn', 'Bật thông báo để điện thoại nhắc khi có đơn đến hạn.', '<button class="btn small primary" data-act="pushon">Bật</button>'));
    else if (pushOK && Notification.permission === 'denied') parts.push(bn('Thông báo đang bị tắt trên trình duyệt', 'Thông báo đang bị tắt. Hãy cho phép thông báo cho trang này trong cài đặt của trình duyệt.'));
  }
  $('#banner').innerHTML = parts.length ? `<div class="banner">${parts.join('')}</div>` : '';
}
const b64 = (s) => Uint8Array.from(atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function enablePush() {
  try {
    if (!pushOK) return toast('Máy này chưa hỗ trợ thông báo');
    if (isIOS && !standalone) return toast('Hãy thêm ứng dụng vào màn hình chính trước');
    if (!S.vapidKey) return toast('Máy chủ chưa cài khoá thông báo');
    const reg = await navigator.serviceWorker.ready;
    if ((await Notification.requestPermission()) !== 'granted') { renderBanner(); return toast('Chưa cho phép thông báo'); }
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(S.vapidKey) }));
    await api('/api/subscribe', { method: 'POST', body: sub.toJSON() });
    const r = await api('/api/test-push', { method: 'POST' });
    renderBanner();
    toast(r.devices ? 'Đã bật thông báo. Điện thoại sẽ rung thử một lần' : 'Đã bật, nhưng chưa gửi được thông báo thử');
  } catch (e) { fail(e); }
}
async function resubscribe() {
  try {
    if (!pushOK || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription();
    if (s) await api('/api/subscribe', { method: 'POST', body: s.toJSON() });
  } catch {}
}

// ---------- Nhập giọng nói ----------
let voice = null;
const setMic = (on) => {
  const b = $('#micBtn'); if (!b) return;
  b.classList.toggle('rec', on); b.innerHTML = ic(on ? 'stop' : 'mic');
  b.setAttribute('aria-label', on ? 'Bấm để dừng' : 'Bấm để nói');
  const t = $('#micT'); if (t) t.textContent = on ? 'Đang nghe… bấm để dừng' : 'Bấm để nói';
};
function stopVoice() { const v = voice; voice = null; if (v) { try { v.stop(); } catch {} } setMic(false); }
async function toggleVoice() {
  if (voice) return stopVoice();
  const ta = $('#speech'), hint = $('#micHint');
  hint.textContent = '';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && !(isIOS && standalone)) {
    const rec = new SR(); rec.lang = 'vi-VN'; rec.interimResults = true; rec.continuous = true;
    const base = ta.value ? ta.value.trim() + ' ' : '';
    let prev = ta.value;
    rec.onresult = (ev) => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; if (ta.value !== prev && !ta.value.startsWith(base)) { rec.abort(); voice=null; setMic(false); return; } ta.value = base + t; prev=ta.value; };
    ta.addEventListener('input',()=>{ if (voice) { try {rec.abort();}catch{} voice=null;setMic(false); } },{once:true});
    rec.onerror = (ev) => { stopVoice(); hint.textContent = ev.error === 'not-allowed' ? 'Cần cho phép dùng micro cho trang này (biểu tượng ổ khoá cạnh địa chỉ).' : 'Chưa nghe được, bấm nói lại nhé.'; };
    rec.onend = () => { if (voice) stopVoice(); };
    try { rec.start(); voice = { stop: () => rec.stop() }; setMic(true); } catch { stopVoice(); }
    return;
  }
  if (S.features.stt && window.MediaRecorder && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
      const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
      const chunks = []; const originalText = ta.value;
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearTimeout(cap);
        const blob = new Blob(chunks, { type: mr.mimeType });
        if (blob.size < 800) { hint.textContent = 'Chưa thu được tiếng, bấm nói lại nhé.'; return; }
        hint.textContent = 'Đang chuyển giọng nói thành chữ…';
        try {
          const r = await api('/api/transcribe', { method: 'POST', body: await blob.arrayBuffer(), type: 'application/octet-stream' });
          if (ta.value === originalText) ta.value = (ta.value ? ta.value.trim() + ' ' : '') + r.text; hint.textContent = r.text ? '' : 'Chưa nghe rõ, bấm nói lại nhé.';
        } catch (e) { hint.textContent = e.message; }
      };
      const cap = setTimeout(stopVoice, 60000);
      mr.start(); voice = { stop: () => mr.state !== 'inactive' && mr.stop() }; setMic(true);
    } catch { hint.textContent = 'Không mở được micro. Hãy cho phép dùng micro, hoặc bấm vào ô chữ rồi dùng micro trên bàn phím.'; }
    return;
  }
  hint.textContent = 'Máy này chưa hỗ trợ nút nói. Bấm vào ô chữ bên dưới rồi bấm biểu tượng micro trên bàn phím để đọc.';
}

// ---------- Biểu mẫu đơn hàng ----------
let F = null;
const FIELD_VN = { customer: 'tên khách', phone: 'số điện thoại', content: 'nội dung hoa', dueDate: 'ngày nhận', dueTime: 'giờ nhận', dueTimeEnd: 'giờ kết thúc', method: 'hình thức nhận', address: 'địa chỉ giao', total: 'giá tiền', deposit: 'tiền cọc', cardMessage: 'lời thiệp', note: 'ghi chú' };
function openForm(order, pre) {
  F = { id: order?.id || null, customerId: order?.customerId || pre?.customerId || null, items: order?.items || [], raw: order?.raw || '', method: order?.method || 'pickup', range: !!order?.dueTimeEnd, photos: [], manual: !!(order || pre?.manual), vals: order ? { customer: order.customer, phone: order.phone, content: order.content, dueDate: order.dueDate, dueTime: order.dueTime, dueTimeEnd: order.dueTimeEnd, address: order.address, total: order.total ?? '', cardMessage: order.cardMessage, note: order.note } : { ...(pre || {}) }, contentOrig: order?.content || '', uncertain: [] };
  const sh = pushSheet({ title: order ? 'Sửa đơn ' + order.code : 'Thêm đơn mới', live: false, render: formHTML, mount: () => bindForm(), onClose: () => { stopVoice(); F?.photos.forEach((p) => URL.revokeObjectURL(p.url)); F = null; } });
  return sh;
}
const wc = (F0, k, extra = '') => ((F0.uncertain.includes(k) ? 'warn ' : '') + extra).trim();
function pendHTML() {
  return F.photos.map((p, i) => `<div class="pthumb"><img src="${p.url}" alt="Ảnh đã chọn ${i + 1}"><button type="button" class="x" data-act="rmpend" data-i="${i}" aria-label="Bỏ ảnh số ${i + 1}">${ic('x')}</button></div>`).join('') +
    `<label class="padd">${ic('plus')}<span>Thêm ảnh</span><input type="file" accept="image/*" multiple data-pend aria-label="Thêm ảnh: chụp ảnh hoặc chọn ảnh có sẵn"></label>`;
}
function formHTML() {
  const v = F.vals, c = (k, x) => wc(F, k, x);
  const step1 = `<div id="step1" class="${F.manual ? 'hidden' : ''} fadein">
      <p class="muted" style="margin:.4rem .2rem">Bấm vào hình micro rồi nói về đơn hàng. Ví dụ: <i>“Chị Lan đặt hai bó hoa hồng đỏ, lấy sáng mai lúc 9 giờ, tổng năm trăm nghìn, đã cọc hai trăm nghìn.”</i></p>
      <div class="micwrap"><button type="button" class="mic" id="micBtn" data-act="mic" aria-label="Bấm để nói">${ic('mic')}</button><div class="mic-t" id="micT">Bấm để nói</div><p class="hint" id="micHint"></p></div>
      <div class="group"><label class="row"><span class="lab">Lời nói hiện ở đây, có thể sửa lại bằng tay</span><textarea id="speech" rows="4" placeholder="Ví dụ: Chị Hồng 1 bó hoa 500k sáng mai 9h lấy"></textarea></label></div>
      <button class="btn primary" id="aiBtn" data-act="ai">${ic('spark')}Điền thông tin đơn</button>
      <button class="btn ghost" data-act="manual">Nhập tay, không dùng giọng nói</button>
    </div>`;
  const form = `<form id="oform" class="${F.manual ? 'fadein' : 'hidden'}" novalidate autocomplete="off">
      <div id="aiNote"></div>
      <div class="gh">KHÁCH HÀNG</div>
      <div class="group">
        <label class="row ${c('customer')}" data-f="customer"><span class="lab">Tên khách hàng · bắt buộc</span><input id="f-customer" value="${esc(v.customer)}" placeholder="Ví dụ: Chị Lan"><div id="sugg"></div></label>
        <label class="row ${c('phone')}" data-f="phone"><span class="lab">Số điện thoại</span><input id="f-phone" inputmode="tel" value="${esc(v.phone)}" placeholder="Không bắt buộc"><small id="custHint" class="hint"></small></label>
      </div>
      <div class="gh">HOA ĐẶT</div>
      <div class="group"><label class="row ${c('content')}" data-f="content"><span class="lab">Nội dung hoa đặt · bắt buộc</span><textarea id="f-content" rows="3" placeholder="Ví dụ: 2 bó hồng đỏ, gói giấy kraft">${esc(v.content)}</textarea></label></div>
      <div class="gh">NGÀY GIỜ NHẬN</div>
      <div class="group">
        <label class="row pick ${c('dueDate')}" data-f="dueDate"><div><span class="lab">Ngày khách nhận · bắt buộc</span><div class="val" id="v-date"></div></div>${ic('chev')}<input id="f-date" type="date" value="${esc(v.dueDate)}" aria-label="Ngày khách nhận"></label>
        <div class="quick" id="q-date"><button type="button" data-act="setdate" data-d="0">Hôm nay</button><button type="button" data-act="setdate" data-d="1">Ngày mai</button><button type="button" data-act="setdate" data-d="2">Ngày kia</button></div>
      </div>
      <div class="group" style="margin-top:.8rem">
        <div class="est ${F.range ? '' : 'open'}" id="l-time"><div><label class="row pick ${c('dueTime')}" data-f="dueTime"><div><span class="lab">Giờ nhận</span><div class="val" id="v-time"></div></div>${ic('chev')}<input id="f-time" type="time" value="${F.range ? '' : esc(v.dueTime)}" aria-label="Giờ nhận"></label></div></div>
        <div class="quick" id="q-time"><button type="button" data-act="settime" data-t="08:00">8h</button><button type="button" data-act="settime" data-t="09:00">9h</button><button type="button" data-act="settime" data-t="10:00">10h</button><button type="button" data-act="settime" data-t="14:00">14h</button><button type="button" data-act="settime" data-t="16:00">16h</button><button type="button" data-act="togrange" id="b-range" class="${F.range ? 'on' : ''}" aria-pressed="${F.range ? 'true' : 'false'}">Chưa chốt giờ</button></div>
        <div class="est ${F.range ? 'open' : ''}" id="l-est"><div>
          <label class="row pick ${c('dueTime')}" data-f="dueTime"><div><span class="lab">Dự kiến từ giờ</span><div class="val" id="v-est1"></div></div>${ic('chev')}<input id="f-est1" type="time" value="${F.range ? esc(v.dueTime) : ''}" aria-label="Dự kiến từ giờ"></label>
          <label class="row pick ${c('dueTimeEnd')}" data-f="dueTimeEnd" id="l-time2"><div><span class="lab">Dự kiến đến giờ</span><div class="val" id="v-time2"></div></div>${ic('chev')}<input id="f-time2" type="time" value="${esc(v.dueTimeEnd)}" aria-label="Dự kiến đến giờ"></label>
          <p class="hint" style="padding:0 1rem .7rem">Khách chưa chốt giờ. Để trống nếu chưa biết, bạn có thể sửa lại sau.</p>
        </div></div>
      </div>
      <div class="gh">HÌNH THỨC NHẬN</div>
      <div class="seg" id="seg" data-v="${F.method}"><span class="thumb"></span><button type="button" data-act="setmethod" data-m="pickup" class="${F.method === 'pickup' ? 'on' : ''}">Khách đến lấy</button><button type="button" data-act="setmethod" data-m="delivery" class="${F.method === 'delivery' ? 'on' : ''}">Tiệm giao hoa</button></div>
      <div class="group ${F.method === 'delivery' ? '' : 'hidden'}" id="l-addr-g"><label class="row ${c('address')}" data-f="address" id="l-addr"><span class="lab">Địa chỉ giao hoa · bắt buộc</span><input id="f-address" value="${esc(v.address)}" placeholder="Số nhà, đường, phường"></label></div>
      <div class="gh">TIỀN</div>
      <div class="group">
        <label class="row ${c('total')}" data-f="total"><span class="lab">Giá trị đơn (đồng) · có thể bổ sung sau</span><input id="f-total" inputmode="numeric" data-money autocomplete="off" value="${esc(fm(v.total))}" placeholder="Ví dụ: 500.000"><small class="hint" id="totalPrev"></small></label>
        ${F.id ? '' : `<label class="row ${c('deposit')}" data-f="deposit"><span class="lab">Khách đã cọc / đã trả (đồng)</span><input id="f-deposit" inputmode="numeric" value="${esc(v.deposit || '')}" placeholder="Không bắt buộc"></label>`}
      </div>
      <div class="gh">GHI CHÚ THÊM</div>
      <div class="group">
        <label class="row ${c('cardMessage')}" data-f="cardMessage"><span class="lab">Lời viết thiệp</span><input id="f-card" value="${esc(v.cardMessage)}" placeholder="Nếu có"></label>
        <label class="row ${c('note')}" data-f="note"><span class="lab">Ghi chú</span><input id="f-note" value="${esc(v.note)}" placeholder="Nếu có"></label>
      </div>
      ${F.id ? '' : `<div class="gh">ẢNH MẪU HOA · không bắt buộc</div>
      <div class="group"><div class="pgrid" id="pend">${pendHTML()}</div><button type="button" class="linkbtn" data-act="pasteimg" style="display:flex;align-items:center;gap:6px">${ic('clip')}Dán ảnh đã sao chép</button><p class="hint" style="padding:0 1rem .8rem">Sao chép ảnh trong Zalo hoặc Album rồi bấm Dán. Trên máy tính có thể nhấn Ctrl+V hoặc kéo ảnh thả vào.</p></div>`}
      <p class="err" id="formErr" role="alert"></p>
      <button class="btn primary" type="submit" id="saveBtn">Lưu đơn</button>
      <button class="btn ghost" type="button" data-act="closesheet">Huỷ</button>
    </form>`;
  return step1 + form;
}
function readForm() {
  return {
    customer: $('#f-customer').value.trim(), phone: $('#f-phone').value, content: $('#f-content').value.trim(), dueDate: $('#f-date').value,
    dueTime: F.range ? $('#f-est1').value : $('#f-time').value, dueTimeEnd: F.range ? $('#f-time2').value : '', method: F.method, address: $('#f-address').value.trim(),
    total: digits($('#f-total').value), cardMessage: $('#f-card').value.trim(), note: $('#f-note').value.trim(),
    ...(F.id ? {} : { deposit: digits($('#f-deposit').value) }),
  };
}
function fillForm(v) {
  $('#f-customer').value = v.customer || ''; $('#f-phone').value = v.phone || ''; $('#f-content').value = v.content || ''; $('#f-date').value = v.dueDate || '';
  $('#f-time').value = F.range ? '' : (v.dueTime || ''); $('#f-est1').value = F.range ? (v.dueTime || '') : ''; $('#f-time2').value = v.dueTimeEnd || ''; $('#f-address').value = v.address || ''; $('#f-total').value = fm(v.total);
  if ($('#f-deposit')) $('#f-deposit').value = v.deposit || ''; $('#f-card').value = v.cardMessage || ''; $('#f-note').value = v.note || '';
}
// Bật/tắt "Chưa chốt giờ": hiện hoặc ẩn phần giờ dự kiến bên dưới (giữ lại giờ đã chọn)
function setRange(on) {
  if (F.range === on) return;
  F.range = on;
  const t = $('#f-time'), e1 = $('#f-est1');
  if (on && t.value && !e1.value) e1.value = t.value;
  if (!on && e1.value && !t.value) t.value = e1.value;
  if (on) t.value = '';
  $('#l-time').classList.toggle('open', !on); $('#l-est').classList.toggle('open', on);
  const b = $('#b-range'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  syncPickers();
}
function setMethod(m) {
  F.method = m;
  $$('[data-act=setmethod]').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  $('#seg').dataset.v = m;
  $('#l-addr-g').classList.toggle('hidden', m !== 'delivery');
}
// Hiện ngày/giờ bằng chữ tiếng Việt (ô chọn thật nằm trong suốt phía trên, nên không bao giờ tràn khung)
function syncPickers() {
  const d = $('#f-date'); if (!d) return;
  const vd = $('#v-date'), set = (el, txt, ph) => { el.innerHTML = txt; el.classList.toggle('ph', !!ph); };
  if (d.value) {
    const dt = dparse(d.value), df = diffDays(d.value, today()), [a, b] = dayLabel(d.value);
    set(vd, `${WD[dt.getUTCDay()]}, ${dt.getUTCDate()}/${dt.getUTCMonth() + 1}/${dt.getUTCFullYear()}<small>${esc(df >= 0 && df <= 2 || df < 0 ? a : b)}</small>`);
  } else set(vd, 'Chọn ngày', true);
  const t = $('#f-time').value, e1 = $('#f-est1').value, t2 = $('#f-time2').value;
  set($('#v-time'), t ? esc(t) : 'Chọn giờ nhận', !t);
  set($('#v-est1'), e1 ? esc(e1) : 'Chọn giờ', !e1);
  set($('#v-time2'), t2 ? esc(t2) : 'Chọn giờ', !t2);
  $$('#q-date button').forEach((b) => b.classList.toggle('on', d.value === addDays(today(), Number(b.dataset.d))));
  $$('#q-time button[data-t]').forEach((b) => b.classList.toggle('on', !F.range && t === b.dataset.t));
}
async function runAI() {
  stopVoice();
  const text = $('#speech').value.trim();
  if (!text) return toast('Chưa có nội dung. Hãy bấm nói hoặc gõ vào ô chữ');
  const b = $('#aiBtn'); b.disabled = true; b.textContent = 'Đang điền thông tin…';
  try {
    const p = await api('/api/parse', { method: 'POST', body: { text } });
    F.raw = text; F.items = p.items || []; F.contentOrig = p.content || '';
    F.uncertain = (p.uncertain || []).filter((k) => FIELD_VN[k]);
    F.method = p.method || 'pickup'; F.range = !!p.dueTimeEnd; F.manual = true;
    F.vals = { customer: p.customer, phone: p.phone, content: p.content, dueDate: p.dueDate, dueTime: p.dueTime, dueTimeEnd: p.dueTimeEnd, address: p.address, total: p.total ?? '', deposit: p.deposit || '', cardMessage: p.cardMessage, note: p.note };
    paintSheet(topSheet());
    const unsure = F.uncertain.map((k) => FIELD_VN[k]);
    const msg = p.usedAI ? 'Máy đã điền xong. Hãy kiểm tra lại rồi bấm Lưu.' : p.aiLimit ? 'Hôm nay đã hết lượt AI, đã điền bằng cách đọc chữ thông thường. Hãy kiểm tra lại.' : p.aiError ? 'AI đang bận, đã điền bằng cách đọc chữ thông thường. Hãy kiểm tra lại.' : 'Đã tự điền theo cách đọc chữ thông thường (chưa nối AI). Hãy kiểm tra lại các mục trước khi lưu.';
    $('#aiNote').innerHTML = `<div class="note">${esc(msg)}${unsure.length ? `<br><b>Cần kiểm tra:</b> ${esc(unsure.join(', '))}.` : ''}<details><summary>Lời đã nói</summary>${esc(text)}</details></div>`;
    topSheet().el.scrollTop = 0;
  } catch (e) { fail(e); b.disabled = false; b.innerHTML = `${ic('spark')}Điền thông tin đơn`; }
}
function bindForm() {
  const f = $('#oform'); if (!f) return;
  const cust = $('#f-customer'), phone = $('#f-phone');
  const prev = () => { const n = digits($('#f-total').value); $('#totalPrev').textContent = n ? '= ' + money(Number(n)) : ''; };
  $('#f-total').addEventListener('input', prev); prev();
  cust.addEventListener('input', () => {
    F.customerId = null;
    const q = fold(cust.value.trim()); const box = $('#sugg');
    const list = q.length < 1 ? [] : S.customers.filter((c) => fold(c.name).includes(q) || (digits(q).length >= 3 && c.phone.includes(digits(q)))).slice(0, 5);
    box.className = list.length ? 'sugg' : '';
    box.innerHTML = list.map((c) => `<button type="button" data-act="pickcust" data-cid="${c.id}"><b>${esc(c.name)}</b> <small>${esc(c.phone)}</small></button>`).join('');
  });
  phone.addEventListener('input', () => {
    const p = normPhone(phone.value), c = p.length >= 9 ? S.customers.find((x) => x.phone === p) : null;
    F.customerId = c ? c.id : null;
    $('#custHint').textContent = c ? `Khách quen: ${c.name}` : '';
    if (c && !cust.value.trim()) cust.value = c.name;
  });
  ['#f-date', '#f-time', '#f-est1', '#f-time2'].forEach((s) => { $(s).addEventListener('input', syncPickers); $(s).addEventListener('change', syncPickers); });
  syncPickers();
  f.addEventListener('submit', saveOrder);
}
function addPend(files) {
  for (const f of files) if (!f.type || f.type.startsWith('image/')) F.photos.push({ file: f, url: URL.createObjectURL(f) });
  paintPend();
}
function paintPend() { const p = $('#pend'); if (p) p.innerHTML = pendHTML(); }
async function saveOrder(e) {
  e.preventDefault();
  const err = $('#formErr'), btn = $('#saveBtn'), b = readForm();
  err.textContent = '';
  if (!b.customer) return (err.textContent = 'Cần nhập tên khách hàng');
  if (!b.content) return (err.textContent = 'Cần nhập nội dung hoa đặt');
  if (!b.dueDate) return (err.textContent = 'Cần chọn ngày khách nhận');
  if (b.method === 'delivery' && !b.address) return (err.textContent = 'Đơn giao hoa cần có địa chỉ giao');
  if (b.dueTimeEnd && b.dueTime && b.dueTimeEnd <= b.dueTime) return (err.textContent = 'Giờ kết thúc phải sau giờ bắt đầu');
  b.total = b.total === '' ? null : Number(b.total);
  b.items = b.content === F.contentOrig ? F.items : []; // nội dung đã sửa tay thì bỏ phần tách cũ để khỏi lệch
  if (F.customerId) b.customerId = F.customerId;
  b.raw = F.raw;
  btn.disabled = true; btn.textContent = 'Đang lưu…';
  try {
    const wasNew = !F.id, pend = F.photos.map((p) => p.file);
    const o = wasNew ? await api('/api/orders', { method: 'POST', body: b }) : await api('/api/orders/' + F.id, { method: 'PATCH', body: b });
    upsert(o);
    closeSheet();
    render(); // hiện đơn mới ngay, không chờ tải lại từ máy chủ
    await load(true);
    if (wasNew && pend.length) { const r = await uploadPhotos(o.id, pend); if (r.bad) openDetail(o.id); else toast(`Đã lưu đơn ${o.code} và ${r.ok} ảnh`); }
    else toast(wasNew ? `Đã lưu đơn ${o.code}` : 'Đã lưu thay đổi');
  } catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Lưu đơn'; }
}

// ---------- Chi tiết đơn ----------
const histCache = {};
const ACT_VN = { created: 'Tạo đơn', updated: 'Sửa đơn', done: 'Hoàn tất', undone: 'Hoàn tác', payment: 'Thu tiền', payment_removed: 'Xoá khoản thu', photo_added: 'Thêm ảnh', photo_removed: 'Xoá ảnh', photo_cleaned: 'Dọn ảnh', deleted: 'Xoá đơn', restored: 'Khôi phục' };
function detailHTML(id) {
  const o = byId(id);
  if (!o) return '<div class="empty">Đơn này không còn nữa</div>';
  const pi = payInfo(o), r = remain(o), h = histCache[id];
  return `
  <div class="box">
    <div style="font-size:1.35rem;font-weight:800">${esc(o.customer)}</div>
    ${o.phone ? `<div style="margin:.3rem 0"><a class="btn small" href="tel:${esc(o.phone)}">${ic('phone')}Gọi ${esc(o.phone)}</a></div>` : '<small>Chưa có số điện thoại</small>'}
    <div class="kv"><span>Ngày nhận</span><span>${esc(dayLabel(o.dueDate)[0])} · ${short(o.dueDate)}</span></div>
    <div class="kv"><span>Giờ nhận</span><span>${esc(timeText(o))}</span></div>
    <div class="kv"><span>Hình thức</span><span>${methodText(o)}</span></div>
    ${o.method === 'delivery' ? `<div class="kv"><span>Địa chỉ</span><span>${esc(o.address)}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}" target="_blank" rel="noopener">Xem bản đồ</a></span></div>` : ''}
    <div class="kv"><span>Trạng thái</span><span>${o.done ? `${doneText(o)} (${fmtTs(o.doneAt)})` : isOverdue(o) ? '<span class="tag red">Quá hạn, chưa giao</span>' : 'Chưa giao'}</span></div>
  </div>
  <div class="box"><b>Hoa đặt</b><div class="what" style="margin-top:.3rem">${esc(o.content)}</div>
    ${o.items.length ? o.items.map((i) => `<span class="tag green" style="margin:.1rem">${esc([i.name, [i.qty, i.unit].filter(Boolean).join(' '), i.color, i.style].filter(Boolean).join(' · '))}</span>`).join('') : ''}
    ${o.cardMessage ? `<div class="kv"><span>Lời thiệp</span><span>${esc(o.cardMessage)}</span></div>` : ''}
    ${o.note ? `<div class="kv"><span>Ghi chú</span><span>${esc(o.note)}</span></div>` : ''}
  </div>
  <div class="box"><b>Thanh toán</b>
    <div class="kv"><span>Giá trị đơn</span><span>${o.total != null ? money(o.total) : 'Chưa xác định giá'}</span></div>
    <div class="kv"><span>Đã thu</span><span>${money(o.paid)}</span></div>
    <div class="kv"><span>Còn phải thu</span><span>${r == null ? '—' : money(r)}</span></div>
    <div style="margin:.4rem 0"><span class="tag ${pi.cls}">${esc(pi.text)}</span></div>
    ${o.payments.map((p) => `<div class="pay"><span>${fmtTs(p.paidAt)} · <b>${money(p.amount)}</b>${p.note ? ` <small>${esc(p.note)}</small>` : ''}</span><button data-act="delpay" data-pid="${p.id}">Xoá</button></div>`).join('')}
    <label>Ghi nhận khách trả thêm (đồng)<input id="payAmt" inputmode="numeric" placeholder="Ví dụ: 200000"></label>
    <button class="btn primary" data-act="addpay">Ghi nhận khoản thu</button>
    ${r > 0 ? `<button class="btn" data-act="payrest">Thu đủ phần còn lại (${money(r)})</button>` : ''}
    ${o.total == null ? `<label>Cập nhật giá trị đơn (đồng)<input id="setTotal" inputmode="numeric"></label><button class="btn" data-act="settotal">Lưu giá trị đơn</button>` : ''}
  </div>
  <div class="box"><b>Ảnh mẫu hoa</b>
    <div class="pgrid" style="padding:.6rem 0 .2rem">${o.photos.map((p) => `<button class="pthumb" data-act="photo" data-pid="${p.id}" aria-label="Xem ảnh mẫu"><img data-photo="${p.id}" data-size="thumb" alt="Ảnh mẫu">${p.keep ? '<span class="pin">Giữ lại</span>' : p.cleanup ? '<span class="pin">Sắp dọn</span>' : ''}</button>`).join('')}${S.features.photos ? `<label class="padd">${ic('plus')}<span>Thêm ảnh</span><input type="file" accept="image/*" multiple data-up="${o.id}" aria-label="Thêm ảnh: chụp ảnh hoặc chọn ảnh có sẵn"></label>` : ''}</div>
    ${S.features.photos ? `<button type="button" class="linkbtn" data-act="pasteimg" style="display:flex;align-items:center;gap:6px;padding-left:0">${ic('clip')}Dán ảnh đã sao chép</button>` : ''}
    ${!o.photos.length && !S.features.photos ? '<div class="hint">Máy chủ chưa bật lưu ảnh</div>' : ''}
  </div>
  ${o.done ? `<button class="btn ghost" data-act="undone" data-from="sheet">Hoàn tác: chuyển lại thành chưa giao</button>` : `<button class="btn primary huge" data-act="done" data-from="sheet">${ic('check')}${doneText(o)}</button>`}
  <button class="btn" data-act="edit">Sửa thông tin đơn</button>
  <button class="btn ghost" data-act="hist">${h ? 'Ẩn lịch sử chỉnh sửa' : 'Xem lịch sử chỉnh sửa'}</button>
  ${h && h.length ? `<div class="box">${h.map((x) => `<div class="hist"><small>${fmtTs(x.ts)} · ${esc(x.by)} · ${esc(ACT_VN[x.action] || x.action)}</small>${esc(x.detail)}</div>`).join('')}</div>` : ''}
  <button class="btn danger" data-act="delorder">Xoá đơn này</button>`;
}
function openDetail(id) {
  const o = byId(id); if (!o) return;
  pushSheet({ title: o.code, render: () => detailHTML(id) });
  api('/api/orders/' + id).then((fresh) => { upsert(fresh); render(); refreshSheets(); }).catch(() => {});
}
function openPhoto(oid, pid) {
  const draw = () => { const p = byId(oid)?.photos.find((x) => x.id === pid); return p ? `<img data-photo="${pid}" data-size="full" alt="Ảnh mẫu hoa"><div style="padding:1rem 0"><button class="btn" data-act="keep" data-pid="${pid}">${p.keep ? 'Bỏ giữ lại' : 'Đánh dấu giữ lại (không tự xoá)'}</button><button class="btn danger" data-act="delphoto" data-pid="${pid}">Xoá ảnh này</button></div>` : '<div class="empty">Ảnh đã được xoá</div>'; };
  pushSheet({ title: 'Ảnh mẫu', light: true, render: draw });
}

// ---------- Khách hàng ----------
function openCustomer(cid) {
  pushSheet({ title: () => S.customers.find((c) => c.id === cid)?.name || 'Khách hàng', live: false, render: () => {
    const c = S.customers.find((x) => x.id === cid); if (!c) return '<div class="empty">Không tìm thấy khách</div>';
    const list = S.orders.filter((o) => o.customerId === cid).sort((a, b) => cmp(b, a));
    return `<div class="box"><label>Tên khách<input id="c-name" value="${esc(c.name)}"></label><label>Số điện thoại<input id="c-phone" inputmode="tel" value="${esc(c.phone)}"></label><label>Ghi chú<input id="c-note" value="${esc(c.note)}"></label>
      <p class="err" id="cErr"></p><button class="btn primary" data-act="savecust" data-cid="${cid}">Lưu thông tin khách</button>
      ${c.phone ? `<a class="btn" href="tel:${esc(c.phone)}">${ic('phone')}Gọi khách</a>` : ''}
      <button class="btn" data-act="newfor" data-cid="${cid}">Tạo đơn mới cho khách này</button></div>
      <h3>Lịch sử đơn (${list.length})</h3>${list.length ? list.map(card).join('') : '<div class="empty">Chưa có đơn</div>'}`;
  } });
}

// ---------- V3: yêu cầu khách qua QR ----------
async function refreshRequests() {
  if (!S.user) return;
  try { S.requests = await api('/api/requests'); if (S.tab === 'settings') renderSettingsHome(); if ($('#requestList')) renderRequests(); }
  catch (e) { console.warn('Chưa tải yêu cầu',e.message); }
}
function requestCard(r) {
  const image=r.photo?`<img class="request-photo" data-request-photo="${esc(r.id)}" alt="Ảnh khách gửi" loading="lazy">`:avatar(r.customer);
  const status=r.status==='pending'?'Chờ duyệt':r.status==='accepted'?'Đã nhận':'Đã từ chối';
  return `<article class="card v3-card"><div class="row1"><span class="code">${esc(r.code)} · ${short(r.dueDate)}</span><span class="tag ${r.status==='pending'?'amber':'green'}">${status}</span></div>
    <div class="order-row"><div class="order-cover">${image}</div><div class="order-info"><b class="who">${esc(r.customer)}</b><div class="order-content">${esc(r.content)}</div><div class="when">${esc(r.dueTime)} · ${short(r.dueDate)}</div><span class="tag">${r.method==='delivery'?'Tiệm giao hoa':'Khách đến lấy'}</span></div></div>
    <div class="v3-finance"><div><span>Giá khách nhập</span><b>${money(r.total)}</b></div></div>
    ${r.status==='pending'?`<div class="acts"><button class="b" data-act="requestdetail" data-id="${esc(r.id)}">Chi tiết</button><button class="b main" data-act="requestaccept" data-id="${esc(r.id)}">Nhận làm đơn</button></div><button class="v3-reject" data-act="requestreject" data-id="${esc(r.id)}">Không nhận đơn này</button>`:''}
    </article>`;
}
function openRequests() {S.tab='settings';render();pushSheet({title:'Yêu cầu khách gửi',render:()=>`<div id="requestList"></div>`,mount:(el)=>{const target=$('#requestList',el);if(target) { const pending=S.requests.filter(r=>r.status==='pending');target.innerHTML=pending.length?pending.map(requestCard).join(''):'<div class="empty">Chưa có yêu cầu mới</div>';hydrateRequestPhotos(el);} },live:false});}
function renderRequests() {
  const el=$('#requestList'); if (!el) return;
  const rs=S.requests||[], pending=rs.filter(r=>r.status==='pending'), done=rs.filter(r=>r.status!=='pending');
  el.innerHTML=`<p class="muted">${pending.length} yêu cầu chờ duyệt</p>`+(pending.length?pending.map(requestCard).join(''):'<div class="empty">Chưa có yêu cầu mới</div>')+(done.length?'<h3>Đã xử lý gần đây</h3>'+done.slice(0,15).map(requestCard).join(''):'');
  hydrateRequestPhotos(el);
}
async function hydrateRequestPhotos(root) {
  for (const el of $$('img[data-request-photo]',root)) {
    try { const blob=await api(`/api/requests/${el.dataset.requestPhoto}/photo`,{blob:true}); const url=URL.createObjectURL(blob);el.src=url;el.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true}); }
    catch {el.replaceWith(document.createTextNode('🌸'));}
  }
}
function requestDialog(r) {
  return `<div class="box"><b>${esc(r.customer)}</b><div>${esc(r.phone)} · ${esc(r.content)}</div>
  <div class="kv"><span>Ngày giờ nhận</span><b>${short(r.dueDate)} ${esc(r.dueTime)}</b></div><div class="kv"><span>Giá khách nhập</span><b>${money(r.total)}</b></div>
  ${r.address?`<div class="kv"><span>Địa chỉ</span><b>${esc(r.address)}</b></div>`:''}</div>
  <form id="request-accept-form" class="box" data-id="${esc(r.id)}">
    <b>Chốt đơn & nhận tiền</b><p class="hint">Chỉ đánh dấu đã nhận tiền sau khi bố mẹ nghe loa báo tiền hoặc đối chiếu tài khoản ngân hàng.</p>
    <label>Giá chốt với khách (đồng) · sửa nếu khác giá khách nhập<input name="total" type="text" inputmode="numeric" data-money autocomplete="off" value="${fm(r.total)}" required></label>
    <label>Trạng thái tiền<select name="payment" id="rpayment"><option value="none">Chưa nhận tiền</option><option value="deposit">Đã nhận cọc</option><option value="full">Đã thu đủ</option></select></label>
    <label id="deposit-label" class="hidden">Số tiền cọc thực nhận<input name="deposit" type="text" inputmode="numeric" data-money autocomplete="off" value=""></label>
    <button class="btn primary" type="submit">Xác nhận · Đưa vào Cần làm</button>
  </form>`;
}
function openRequest(id) { const r=S.requests.find(x=>x.id===id); if (!r)return; pushSheet({title:'Nhận làm '+r.code,render:()=>requestDialog(r),live:false}); }
async function acceptRequest(form) {
  const b=Object.fromEntries(new FormData(form).entries()); const total=Number(digits(b.total));
  const paid=b.payment==='full'?total:b.payment==='deposit'?Number(digits(b.deposit)):0;
  if (!(total>0)||paid<0||paid>total|| (b.payment==='deposit' && paid<=0)) return toast('Kiểm tra số tiền đã nhận');
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try { const result=await api(`/api/requests/${form.dataset.id}/accept`,{method:'POST',body:{total,paid}});upsert(result.order);closeSheet();await refreshRequests();render();toast('Đã nhận làm đơn '+result.order.code); }
  catch(e) { btn.disabled=false;fail(e); }
}
function renderSettingsHome() {
  const el=$('#settingsHome'); if(!el||!S.user)return;
  const count=(S.requests||[]).filter(r=>r.status==='pending').length;
  const items=[['inbox','Yêu cầu từ khách',`${count} yêu cầu chờ xác nhận`,'requests'],['phone','Thông tin tiệm cho khách','Số điện thoại hiện trên trang đặt hoa','shopinfo'],['qr','Mã QR đặt hoa','Tải QR và chia sẻ link khách đặt','shareqr'],['bell','Thông báo, sao lưu và tài khoản','Lịch nhắc, sao lưu, dọn ảnh, đăng xuất','settings'],['down','Xuất dữ liệu','Tải CSV mở bằng Excel','exportv3']];
  el.innerHTML=items.map(([icon,title,sub,act])=>`<button class="setting-tile" data-act="${act}"><span class="setting-emoji">${ic(icon)}</span><span><b>${title}</b><small>${sub}</small></span><span class="setting-arrow">›</span></button>`).join('');
}
function openShopInfo() {
  if(!S.user.admin)return toast('Chỉ quản trị viên được sửa thông tin tiệm');
  pushSheet({title:'Thông tin tiệm cho khách',live:false,render:()=>`<form id="shop-form" class="box">
    <p class="hint">Sau khi gửi yêu cầu đặt hoa, khách sẽ thấy nút gọi đến số này.</p>
    <label>Số điện thoại tiệm<input name="shopPhone" inputmode="tel" value="${esc(S.settings.shopPhone||'')}" placeholder="Ví dụ: 0912345678"></label>
    <button class="btn primary" type="submit">Lưu</button></form>`});
}
function openShareQR() {
  const link=location.origin+'/dat-hoa.html';
  const qr='https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='+encodeURIComponent(link);
  pushSheet({title:'Mã QR đặt hoa',live:false,render:()=>`<div class="box" style="text-align:center"><p>Khách quét mã để tự gửi yêu cầu đặt hoa</p><img class="share-qr" src="${qr}" alt="QR đặt hoa"><p class="hint share-link">${esc(link)}</p><a class="btn primary" href="${qr}" download="qr-dat-hoa.png" target="_blank" rel="noopener">Xem / lưu ảnh QR</a><button class="btn" data-act="copylink">Sao chép link đặt hoa</button></div>`});
}
function openExportV3() {
  if(!S.user.admin)return toast('Chỉ quản trị viên được xuất dữ liệu');
  const t=today(), first=t.slice(0,8)+'01', last=t.slice(0,8)+String(new Date(Date.UTC(+t.slice(0,4),+t.slice(5,7),0)).getUTCDate()).padStart(2,'0');
  pushSheet({title:'Xuất dữ liệu',live:false,render:()=>`<form id="exportv3-form" class="box"><p>File CSV hỗ trợ mở bằng Excel và giữ tiếng Việt.</p>
    <label>Loại dữ liệu<select name="type"><option value="orders">Danh sách đơn hàng</option><option value="customers">Danh sách khách hàng</option></select></label>
    <label>Từ ngày<input type="date" name="from" value="${first}"></label><label>Đến ngày<input type="date" name="to" value="${last}"></label><p class="hint">Mặc định là cả tháng này. Chọn ngày khác nếu cần.</p><button class="btn primary" type="submit">Tải dữ liệu CSV</button></form>`});
}

// ---------- Báo bell, cài đặt ----------
async function openBell() {
  let records=[];
  try { records=await api('/api/notifications'); } catch(e) { console.warn('Không tải được lịch sử thông báo',e); }
  const read=(()=>{try{return JSON.parse(store.get('qc-read-notifs')||'[]')}catch{return []}})();
  pushSheet({title:'Thông báo',live:false,render:()=>{
    const todayOpen=S.orders.filter(o=>!o.done && o.dueDate===today());
    const overdue=S.orders.filter(isOverdue);
    return `<div class="notif-head"><b>Lịch sử thông báo</b><button class="btn small ghost" data-act="notifread">Đánh dấu đã đọc</button></div>
    <p class="hint">Thông báo gửi từ hệ thống, bao gồm cả thông báo thử. Việc gửi không bảo đảm thiết bị đã nhận.</p>
    ${records.length?records.map(n=>`<div class="notif-item ${read.includes(n.id)?'read':''}"><span class="notif-dot"></span><div><b>${esc(n.title)}</b><p>${esc(n.body||'')}</p><small>${fmtTs(n.ts)}</small>${n.kind==='test'?'<small> · Thông báo thử</small>':''}</div></div>`).join(''):'<div class="empty">Chưa có thông báo nào được ghi vào hệ thống.</div>'}
    <div class="box"><b>Đơn cần chú ý lúc này</b><p>${overdue.length} đơn quá hạn · ${todayOpen.length} đơn hôm nay</p><button class="btn" data-act="gotoorders">Xem danh sách đơn</button></div>
    <button class="btn ghost" data-act="pushon">Bật / gửi thông báo thử</button>`;
  }});
  window.__qcVisibleNotifs=records.map(r=>r.id);
}

let ST = { backups: null, deleted: null, cleanup: null };
function openSettings() {
  ST = { backups: null, deleted: null, cleanup: null };
  const sh = pushSheet({ title: 'Cài đặt', live: false, render: settingsHTML });
  if (S.user.admin) Promise.allSettled([api('/api/backups'), api('/api/deleted'), api('/api/cleanup')]).then(([a, b, c]) => {
    ST = { backups: a.value || [], deleted: b.value || [], cleanup: c.value || { pending: 0 } };
    if (sheets.includes(sh)) { const keep = $('#set-form') ? readSettingsForm() : null; paintSheet(sh); if (keep) applySettingsForm(keep); }
  });
}
function settingsHTML() {
  const s = S.settings, adm = S.user.admin, opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${Number(cur) === v ? 'selected' : ''}>${l}</option>`).join('');
  return `<div class="box"><b>${esc(S.user.name)}</b> ${adm ? '<span class="tag green">Quản trị</span>' : ''}
      <button class="btn" data-act="pushon">Bật / kiểm tra thông báo trên máy này</button><button class="btn ghost" data-act="logout">Đăng xuất</button></div>
    ${adm ? `<form id="set-form" class="box v4-settings"><h3>Thông báo & nhắc nhở</h3><p class="hint">Bật theo nhu cầu; các nhóm có thể thu gọn.</p><details open><summary>Nhắc đơn ngày mai</summary>
      <label class="check"><input type="checkbox" name="notifyEvening" ${s.notifyEvening ? 'checked' : ''}> Tối hôm trước nhắc các đơn ngày mai</label>
      <label>Giờ nhắc buổi tối<input type="time" name="evening" value="${esc(s.evening)}"></label>
      <label>Tần suất nhắc đơn ngày mai<select name="tomorrowInterval"><option value="60" ${s.tomorrowInterval===60?'selected':''}>Mỗi 1 tiếng</option><option value="120" ${s.tomorrowInterval===120?'selected':''}>Mỗi 2 tiếng</option><option value="0" ${s.tomorrowInterval===0?'selected':''}>Một lần</option></select></label>
      <label>Giờ bắt đầu<input type="time" name="tomorrowStart" value="${esc(s.tomorrowStart||'18:00')}"></label>
      <label>Giờ kết thúc<input type="time" name="tomorrowEnd" value="${esc(s.tomorrowEnd||'22:00')}"></label>
      </details><details><summary>Yêu cầu mới & thanh toán</summary><label class="check"><input type="checkbox" name="notifyNewRequest" ${s.notifyNewRequest?'checked':''}> Báo khi khách gửi yêu cầu qua QR</label>
      <label class="check"><input type="checkbox" name="notifyUnpaid" ${s.notifyUnpaid?'checked':''}> Bật nhắc tiền chưa thu (dự kiến)</label>
      </details><details><summary>Nhắc đơn trong ngày & quá hạn</summary><label class="check"><input type="checkbox" name="notifyMorning" ${s.notifyMorning ? 'checked' : ''}> Sáng hôm nay nhắc các đơn trong ngày</label>
      <label>Giờ nhắc buổi sáng<input type="time" name="morning" value="${esc(s.morning)}"></label>
      <label class="check"><input type="checkbox" name="notifyBefore" ${s.notifyBefore ? 'checked' : ''}> Nhắc trước giờ khách hẹn</label>
      <label>Nhắc trước<select name="beforeMin">${opt([[15, '15 phút'], [30, '30 phút'], [60, '1 giờ'], [120, '2 giờ'], [180, '3 giờ']], s.beforeMin)}</select></label>
      <label class="check"><input type="checkbox" name="notifyOverdue" ${s.notifyOverdue ? 'checked' : ''}> Cảnh báo khi quá giờ hẹn mà chưa xác nhận</label>
      <label>Cảnh báo sau giờ hẹn<select name="overdueMin">${opt([[0, 'Đúng giờ hẹn'], [15, '15 phút'], [30, '30 phút'], [60, '1 giờ']], s.overdueMin)}</select></label>
      </details><details><summary>AI và lưu ảnh</summary><b style="display:block;margin-top:1rem">Chi phí AI và ảnh</b>
      <label>Số lượt máy sắp xếp đơn tối đa mỗi ngày<input type="number" name="aiDailyLimit" min="0" max="2000" value="${esc(s.aiDailyLimit)}"></label>
      <label>Giữ ảnh của đơn đã hoàn tất (tháng)<input type="number" name="photoRetentionMonths" min="1" max="120" value="${esc(s.photoRetentionMonths)}"></label>
      <p class="hint">Máy sắp xếp đơn: ${S.features.ai ? 'đang bật' : 'chưa bật (thiếu khoá API)'} · Nhận giọng nói dự phòng: ${S.features.stt ? 'đang bật' : 'chưa bật'} · Lưu ảnh: ${S.features.photos ? 'đang bật' : 'chưa bật'}</p>
      </details><button class="btn primary" type="submit">Lưu cài đặt</button></form>
    <div class="box"><b>Ảnh sắp dọn</b><div class="hint">${ST.cleanup ? (ST.cleanup.pending ? `${ST.cleanup.pending} ảnh của đơn cũ đang chờ dọn. Mở đơn và đánh dấu “Giữ lại” nếu cần giữ.` : 'Không có ảnh nào đang chờ dọn.') : 'Đang tải…'}</div>
      ${ST.cleanup?.pending ? '<button class="btn danger" data-act="runcleanup">Dọn các ảnh này ngay</button>' : ''}</div>
    <div class="box"><b>Sao lưu dữ liệu</b><div class="hint">Máy chủ tự sao lưu mỗi đêm (giữ 14 bản gần nhất).</div>
      <button class="btn" data-act="exportnow">Tải bản sao lưu ngay</button>
      ${ST.backups ? ST.backups.map((b) => `<button class="btn ghost small" data-act="dlbackup" data-n="${esc(b.name)}">${esc(b.name)}</button>`).join('') : '<div class="hint">Đang tải…</div>'}</div>
    <div class="box"><b>Đơn đã xoá</b>${ST.deleted ? (ST.deleted.length ? ST.deleted.map((o) => `<div class="pay"><span>${esc(o.code)} · ${esc(o.customer)} · ${short(o.dueDate)}</span><button data-act="restore" data-id="${o.id}" style="color:var(--gd)">Khôi phục</button></div>`).join('') : '<div class="hint">Không có</div>') : '<div class="hint">Đang tải…</div>'}</div>` : '<p class="hint">Các cài đặt khác chỉ dành cho quản trị viên.</p>'}`;
}
const readSettingsForm = () => { const f = $('#set-form'); return f ? Object.fromEntries([...new FormData(f).entries()]) && [...$$('input,select', f)].map((el) => [el.name, el.type === 'checkbox' ? el.checked : el.value]) : null; };
const applySettingsForm = (arr) => arr.forEach(([n, v]) => { const el = $(`#set-form [name=${n}]`); if (el) { if (el.type === 'checkbox') el.checked = v; else el.value = v; } });
async function saveSettings(form) {
  const b = {};
  for (const el of $$('input,select', form)) b[el.name] = el.type === 'checkbox' ? el.checked : ['time','text'].includes(el.type) ? el.value : Number(el.value);
  try { S.settings = await api('/api/settings', { method: 'PUT', body: b }); toast('Đã lưu cài đặt'); } catch (e) { fail(e); }
}
async function download(blobP, name) {
  try { const blob = await blobP; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  catch (e) { fail(e); }
}

// ---------- Hành động (bắt sự kiện bấm) ----------
async function setDone(o, done, fromSheet) {
  try {
    const res = await api(`/api/orders/${o.id}/done`, { method: 'POST', body: { done } });
    const c = $(`#list .card[data-id="${o.id}"]`);
    if (c && !matchMedia('(prefers-reduced-motion: reduce)').matches) { // thẻ thu gọn lại mượt mà rồi mới biến mất
      c.style.height = c.offsetHeight + 'px'; void c.offsetHeight; c.classList.add('leaving'); await sleep(340);
    }
    upsert(res);
    render(); refreshSheets();
    toast(done ? `✓ ${doneText(o)} · ${o.customer}` : '✓ Đã chuyển về chưa giao', done ? () => setDone(o, false) : null);
  } catch (e) { fail(e); }
}
async function addPayment(o, amount) {
  if (!amount) return toast('Hãy nhập số tiền');
  try { upsert(await api(`/api/orders/${o.id}/payments`, { method: 'POST', body: { amount } })); render(); refreshSheets(); toast(`Đã ghi nhận thu ${money(amount)}`); } catch (e) { fail(e); }
}
// Ảnh dán từ bộ nhớ tạm hoặc kéo thả: vào đơn đang nhập, hoặc đơn đang xem
async function takeImages(files) {
  files = [...files].filter((f) => f && f.type && f.type.startsWith('image/'));
  if (!files.length) return false;
  if (F && F.photos && !F.id) { addPend(files); toast(files.length > 1 ? `Đã thêm ${files.length} ảnh` : 'Đã thêm ảnh'); return true; }
  const id = sheets.length ? sheetOrderId() : null;
  if (id && S.features.photos) { await uploadPhotos(id, files); return true; }
  return false;
}
document.addEventListener('paste', (e) => {
  const fs = [...(e.clipboardData?.files || [])];
  if (fs.some((f) => f.type.startsWith('image/')) && sheets.length) { e.preventDefault(); takeImages(fs); }
});
document.addEventListener('dragover', (e) => { if (sheets.length && [...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
document.addEventListener('drop', (e) => { if (sheets.length && e.dataTransfer?.files?.length) { e.preventDefault(); takeImages(e.dataTransfer.files); } });
async function pasteFromClipboard() {
  try {
    const items = await navigator.clipboard.read(), files = [];
    for (const it of items) for (const type of it.types) if (type.startsWith('image/')) files.push(new File([await it.getType(type)], 'dan-' + Date.now() + '.' + type.split('/')[1], { type }));
    if (!(await takeImages(files))) toast('Chưa có ảnh nào được sao chép');
  } catch { toast('Máy chưa cho dán ảnh. Hãy nhấn giữ ở ô ghi chú rồi chọn Dán.'); }
}
// Hiệu ứng khi bấm nút nói: vòng sóng lan ra từ nút và một vệt màu xanh loang ra rồi tan
function micFx(el) {
  try { navigator.vibrate && navigator.vibrate(10); } catch {}
  const disc = el.querySelector('.mic-disc') || el;
  disc.classList.remove('fire'); void disc.offsetWidth; disc.classList.add('fire');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = disc.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const w = document.createElement('div'); w.className = 'mic-wash'; document.body.appendChild(w);
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
  const an = w.animate([
    { clipPath: `circle(${r.width / 2}px at ${x}px ${y}px)`, opacity: .0 },
    { clipPath: `circle(${R * .55}px at ${x}px ${y}px)`, opacity: .26, offset: .45 },
    { clipPath: `circle(${R}px at ${x}px ${y}px)`, opacity: 0 },
  ], { duration: 650, easing: 'cubic-bezier(.32,.72,0,1)' });
  an.onfinish = () => w.remove();
}
const ACTIONS = {
  bntoggle: (el) => el.closest('.bn').classList.toggle('open'),
  bnx: () => { store.set('bnOff', Date.now() + 3 * 864e5); renderBanner(); },
  pasteimg: pasteFromClipboard,
  closesheet: () => closeSheet(),
  toastundo: () => { const u = toast.undo; hideToast(); if (u) u(); },
  new: () => openForm(),
  newvoice: (el) => { micFx(el); openForm(); },
  newmanual: () => openForm(null, {manual:true}),
  filter: (el) => { S.filter = el.dataset.f; S.q = ''; S.anim = true; $('#q').value = ''; render(); if (el.classList.contains('stat')) $('#list').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  overdue: () => { S.filter = 'overdue'; S.q = ''; $('#q').value = ''; render(); $('#list').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  moredone: () => { S.doneShown += 30; renderList(); },
  cardedit: (el) => { const o = byId(el.closest('[data-id]').dataset.id); if (o) openForm(o); },
  open: (el) => openDetail(el.closest('[data-id]').dataset.id),
  done: (el) => { const o = byId(el.closest('[data-id]')?.dataset.id || sheetOrderId()); o && setDone(o, true); },
  undone: (el) => { const o = byId(el.closest('[data-id]')?.dataset.id || sheetOrderId()); o && setDone(o, false); },
  reload: () => load(),
  pushon: enablePush,
  notifread: () => {store.set('qc-read-notifs',JSON.stringify(window.__qcVisibleNotifs||[]));toast('Đã đánh dấu đã đọc');closeSheet();openBell();},
  gotoorders: () => {closeSheet();S.tab='orders';render();window.scrollTo(0,0);},
  mic: toggleVoice,
  ai: runAI,
  manual: () => { F.manual = true; stopVoice(); paintSheet(topSheet()); },
  setdate: (el) => { $('#f-date').value = addDays(today(), Number(el.dataset.d)); syncPickers(); },
  settime: (el) => { setRange(false); $('#f-time').value = el.dataset.t; syncPickers(); },
  togrange: () => setRange(!F.range),
  rmpend: (el) => {
    const i = Number(el.dataset.i), th = el.closest('.pthumb'); th.classList.add('out');
    setTimeout(() => { const [p] = F.photos.splice(i, 1); if (p) URL.revokeObjectURL(p.url); paintPend(); }, 260);
  },
  setmethod: (el) => setMethod(el.dataset.m),
  pickcust: (el) => { const c = S.customers.find((x) => x.id === el.dataset.cid); if (!c) return; F.customerId = c.id; $('#f-customer').value = c.name; $('#f-phone').value = c.phone; $('#sugg').innerHTML = ''; $('#sugg').className = ''; $('#custHint').textContent = 'Khách quen: đã điền số điện thoại'; },
  cust: (el) => openCustomer(el.dataset.cid),
  savecust: async (el) => {
    try { await api('/api/customers/' + el.dataset.cid, { method: 'PATCH', body: { name: $('#c-name').value, phone: $('#c-phone').value, note: $('#c-note').value } }); await load(true); toast('Đã lưu thông tin khách'); closeSheet(); }
    catch (e) { $('#cErr').textContent = e.message; }
  },
  newfor: (el) => { const c = S.customers.find((x) => x.id === el.dataset.cid); closeSheet(); openForm(null, { customerId: c.id, customer: c.name, phone: c.phone, manual: false }); },
  rep: (el) => { const [l, list] = reportRows()[el.dataset.k]; const k = el.dataset.k; listSheet(l, list, { refilter: () => reportRows()[k][1] }); },
  repday: (el) => { const d = el.dataset.d; listSheet(`${dayLabel(d)[0]} (${short(d)})`, [], { refilter: () => S.orders.filter((o) => !o.done && o.dueDate === d) }); },
  range: () => {
    const a = $('#r-from').value, b = $('#r-to').value;
    if (!a || !b || a > b) return toast('Hãy chọn khoảng ngày hợp lệ');
    listSheet(`Từ ${short(a)} đến ${short(b)}`, [], { refilter: () => S.orders.filter((o) => o.dueDate >= a && o.dueDate <= b) });
  },
  settings: openSettings,
  requests: async()=>{ await refreshRequests();openRequests(); },
  shopinfo:openShopInfo,
  shareqr:openShareQR,
  copylink:()=>{navigator.clipboard.writeText(location.origin+'/dat-hoa.html').then(()=>toast('Đã sao chép link')).catch(()=>toast('Không sao chép được'));},
  exportv3:openExportV3,
  requestaccept:(el)=>openRequest(el.dataset.id),
  requestdetail:(el)=>openRequest(el.dataset.id),
  requestreject:async(el)=>{ if(!(await askConfirm({title:'Không nhận yêu cầu này?',msg:'Yêu cầu sẽ chuyển sang "Đã từ chối". Bạn nên gọi báo khách.',ok:'Không nhận',danger:true})))return; try{await api(`/api/requests/${el.dataset.id}/reject`,{method:'POST',body:{reason:'Tiệm không nhận làm'}});await refreshRequests();closeSheet();toast('Đã từ chối yêu cầu');}catch(e){fail(e);}},
  logout: () => { store.del('pin'); store.del('cache'); location.reload(); },
  edit: () => { const o = byId(sheetOrderId()); if (o) openForm(o); },
  hist: async () => {
    const id = sheetOrderId();
    if (histCache[id]) { delete histCache[id]; return refreshSheets(); }
    try { histCache[id] = await api(`/api/orders/${id}/history`); refreshSheets(); } catch (e) { fail(e); }
  },
  addpay: () => addPayment(byId(sheetOrderId()), Number(digits($('#payAmt').value))),
  payrest: () => { const o = byId(sheetOrderId()); addPayment(o, remain(o)); },
  settotal: async () => {
    const n = digits($('#setTotal').value); if (!n) return toast('Hãy nhập giá trị đơn');
    try { upsert(await api('/api/orders/' + sheetOrderId(), { method: 'PATCH', body: { total: Number(n) } })); render(); refreshSheets(); toast('Đã lưu giá trị đơn'); } catch (e) { fail(e); }
  },
  delpay: async (el) => { if (!(await askConfirm({ title: 'Xoá khoản thu này?', msg: 'Số tiền còn phải thu của đơn sẽ được tính lại.', ok: 'Xoá khoản thu', danger: true }))) return; try { upsert(await api('/api/payments/' + el.dataset.pid, { method: 'DELETE' })); render(); refreshSheets(); toast('Đã xoá khoản thu'); } catch (e) { fail(e); } },
  photo: (el) => openPhoto(sheetOrderId(), el.dataset.pid),
  keep: async (el) => { const o = byId(sheetOrderId(true)); const p = o?.photos.find((x) => x.id === el.dataset.pid); try { upsert(await api('/api/photos/' + el.dataset.pid, { method: 'PATCH', body: { keep: !p?.keep } })); render(); refreshSheets(); toast(p?.keep ? 'Đã bỏ giữ lại' : 'Đã đánh dấu giữ lại'); } catch (e) { fail(e); } },
  delphoto: async (el) => { if (!(await askConfirm({ title: 'Xoá ảnh này?', msg: 'Ảnh bị xoá sẽ không lấy lại được.', ok: 'Xoá ảnh', danger: true }))) return; try { upsert(await api('/api/photos/' + el.dataset.pid, { method: 'DELETE' })); closeSheet(); render(); refreshSheets(); toast('Đã xoá ảnh'); } catch (e) { fail(e); } },
  delorder: async () => {
    // Xoá ngay rồi cho 7 giây để Hoàn tác (đơn chỉ bị ẩn, khôi phục được)
    const o = byId(sheetOrderId()); if (!o) return;
    try {
      await api('/api/orders/' + o.id, { method: 'DELETE' }); S.orders = S.orders.filter((x) => x.id !== o.id); closeSheet(); render();
      toast(`Đã xoá đơn ${o.code} · ${o.customer}`, async () => { try { await api(`/api/orders/${o.id}/restore`, { method: 'POST' }); await load(true); toast('Đã khôi phục đơn'); } catch (e) { fail(e); } });
    } catch (e) { fail(e); }
  },
  restore: async (el) => { try { await api(`/api/orders/${el.dataset.id}/restore`, { method: 'POST' }); await load(true); ST.deleted = ST.deleted.filter((o) => o.id !== el.dataset.id); paintSheet(topSheet()); toast('Đã khôi phục đơn'); } catch (e) { fail(e); } },
  runcleanup: async () => { if (!(await askConfirm({ title: 'Xoá vĩnh viễn các ảnh đang chờ dọn?', msg: 'Dữ liệu đơn hàng vẫn được giữ.', ok: 'Xoá ảnh', danger: true }))) return; try { const r = await api('/api/cleanup/run', { method: 'POST' }); ST.cleanup = { pending: 0 }; await load(true); paintSheet(topSheet()); toast(`Đã dọn ${r.deleted} ảnh`); } catch (e) { fail(e); } },
  exportnow: () => download(api('/api/export').then((d) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), `sao-luu-${today()}.json`),
  dlbackup: (el) => download(api('/api/backups/' + el.dataset.n, { blob: true }), el.dataset.n),
};
// Id đơn của cửa sổ chi tiết đang mở (hoặc cửa sổ bên dưới khi đang xem ảnh)
function sheetOrderId(skipLight) {
  for (let i = sheets.length - 1; i >= 0; i--) { const t = sheets[i].opts.title; const code = typeof t === 'string' ? t : ''; const o = S.orders.find((x) => x.code === code); if (o) return o.id; }
  return null;
}

document.addEventListener('click', (e) => {
  if (e.target.matches?.('.pick input')) { try { e.target.showPicker?.(); } catch {} return; }
  if (e.target.closest('a[href^="tel:"], a[target=_blank]')) return;
  const sheetBg = e.target.classList?.contains('sheet') ? e.target : null;
  if (sheetBg) return closeSheet(sheets.find((s) => s.el === sheetBg));
  const el = e.target.closest('[data-act]');
  if (el) { const fn = ACTIONS[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); } return; }
  const c = e.target.closest('.card');
  if (c && !e.target.closest('a,button')) openDetail(c.dataset.id);
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.matches('input[data-up]')) { const files = [...t.files]; t.value = ''; if (files.length) await uploadPhotos(t.dataset.up, files); }
  else if (t.matches('input[data-pend]')) { const files = [...t.files]; t.value = ''; if (F) addPend(files); }
});
document.addEventListener('submit', async (e) => {
  const f=e.target;
  if(f.id==='set-form'){e.preventDefault();saveSettings(f);}
  if(f.id==='request-accept-form'){e.preventDefault();acceptRequest(f);}
  if(f.id==='shop-form'){
    e.preventDefault(); const b=Object.fromEntries(new FormData(f).entries());
    try { S.settings=await api('/api/settings',{method:'PUT',body:b});closeSheet();toast('Đã lưu thông tin tiệm'); }
    catch(err){fail(err);}
  }
  if(f.id==='exportv3-form'){
    e.preventDefault();const v=Object.fromEntries(new FormData(f).entries());
    const u='/api/export.csv?'+new URLSearchParams(v);download(api(u,{blob:true}),`tiem-hoa-${v.type}-${today()}.csv`);
  }
});
$('#q').addEventListener('input', (e) => { S.q = e.target.value; renderStats(); renderList(); });
$('#cq').addEventListener('input', (e) => { S.cq = e.target.value; renderCustomers(); });
$('#bell').addEventListener('click', openBell);
$('#sortSel').addEventListener('change', (e) => { S.sort = e.target.value; renderList(); });
function closeHomeSearch(){const box=$('#homeSearch');box.classList.add('hidden');$('#q').value='';S.q='';renderList();renderStats();}
$('#searchToggle').addEventListener('click', () => {const box=$('#homeSearch');box.classList.toggle('hidden');if(!box.classList.contains('hidden'))$('#q').focus();else closeHomeSearch();});
$('#closeSearch').addEventListener('click',closeHomeSearch);
$$('.nav button[data-tab]').forEach((b) => b.addEventListener('click', () => { if (S.tab === b.dataset.tab) return window.scrollTo({ top: 0, behavior: 'smooth' }); S.tab = b.dataset.tab; S.anim = true; render(); window.scrollTo(0, 0); onScroll(); }));

// ---------- Đăng nhập và khởi động ----------
function showLogin() { S.user = null; $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); }
$('#loginBtn').addEventListener('click', async () => {
  pass = $('#pin').value.trim();
  try { await api('/api/login', { method: 'POST' }); store.set('pin', pass); $('#loginErr').textContent = ''; await start(); }
  catch (e) { $('#loginErr').textContent = e.status === 401 ? 'Mã chưa đúng, thử lại nhé' : e.message; }
});
$('#pin').addEventListener('keydown', (e) => e.key === 'Enter' && $('#loginBtn').click());

async function load(silent) {
  try {
    const d = await api('/api/bootstrap');
    Object.assign(S, { user: d.user, orders: d.orders, customers: d.customers, settings: d.settings, features: d.features, vapidKey: d.vapidKey, offline: false });
    store.set('cache', JSON.stringify(d));
    refreshRequests();
  } catch (e) {
    if (e.status === 401) return;
    S.offline = true;
    if (!S.user) { try { const d = JSON.parse(store.get('cache') || 'null'); if (d) Object.assign(S, { user: d.user, orders: d.orders, customers: d.customers, settings: d.settings, features: d.features, vapidKey: d.vapidKey }); } catch {} }
    if (!silent && !S.user) toast(e.message);
  }
  if (S.user) { $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); }
  render(); refreshSheets();
}
async function start() {
  await load();
  if (!S.user) return showLogin();
  resubscribe();
  // Mở đúng chỗ khi bấm vào thông báo
  const p = new URLSearchParams(location.search);
  if (p.get('filter') === 'unpaid') { S.tab = 'report'; render(); ACTIONS.rep({ dataset: { k: 'owed' } }); } // "chưa thu đủ" nay nằm trong Báo cáo
  else if (p.has('filter') && ['today', 'tomorrow', 'dayafter', 'overdue', 'upcoming'].includes(p.get('filter'))) { S.filter = p.get('filter'); S.tab = 'orders'; render(); }
  if (p.get('order') && byId(p.get('order'))) openDetail(p.get('order'));
  if (p.get('view') === 'settings') {S.tab='settings';render();}
  if (p.get('view') === 'requests') {S.tab='settings';render(); refreshRequests().then(()=>openRequests());}
  if (location.search) history.replaceState(null, '', '/');
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// Tự đồng bộ khi mở lại ứng dụng và mỗi phút (khi không đang nhập liệu)
const idle = () => !document.hidden && S.user && !sheets.length && !$('#q').value;
document.addEventListener('visibilitychange', () => { if (idle()) load(true); });
window.addEventListener('online', () => load(true));
setInterval(() => { if (idle()) load(true); else if (S.user) renderStats(); }, 60000);
if (pass) {
  // Mở ngay bằng dữ liệu lần trước (hoặc khung chờ), rồi cập nhật ngầm
  try { const d = JSON.parse(store.get('cache') || 'null'); if (d) Object.assign(S, { user: d.user, orders: d.orders, customers: d.customers, settings: d.settings, features: d.features, vapidKey: d.vapidKey }); } catch {}
  $('#app').classList.remove('hidden');
  if (S.user) render(); else $('#list').innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  start();
} else showLogin();
// Kéo xuống để làm mới: chỉ ở đầu trang. Cập nhật theo từng khung hình, không dùng transition khi đang kéo.
{
  const el = document.getElementById('pullRefresh');
  if (el) {
    const text = el.querySelector('#pullText');
    let startY = 0, armed = false, dragging = false, busy = false, raf = 0, amount = 0, active = false;
    const paint = () => { raf = 0; el.style.setProperty('--pull', amount + 'px'); };
    const set = (v) => { amount = v; if (!raf) raf = requestAnimationFrame(paint); };
    const reset = () => {
      dragging = false; armed = false; active = false;
      document.body.classList.remove('pulling'); el.classList.remove('drag', 'ready');
      if (!busy) { el.classList.remove('visible'); set(0); }
    };
    document.addEventListener('touchstart', (e) => {
      if (busy || !S.user || document.querySelector('.sheet.show') || window.scrollY > 2 || e.touches.length !== 1 || e.target.closest('input,textarea,select,[contenteditable],.nav')) return;
      startY = e.touches[0].clientY; dragging = true; active = false;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const d = e.touches[0].clientY - startY;
      if (window.scrollY > 2) return reset();
      if (d < 10) { if (active) reset(); return; } // chưa đủ để coi là kéo xuống
      if (!active) { active = true; document.body.classList.add('pulling'); el.classList.add('drag', 'visible'); }
      set(Math.min(84, (d - 10) * .5));
      const a = d > 120;
      if (a !== armed) {
        armed = a; el.classList.toggle('ready', a);
        text.textContent = a ? 'Thả tay để làm mới' : 'Kéo xuống để làm mới';
        if (a && navigator.vibrate) try { navigator.vibrate(12); } catch {}
      }
    }, { passive: true });
    document.addEventListener('touchend', async () => {
      if (!dragging) return;
      const go = armed && active;
      dragging = false; document.body.classList.remove('pulling'); el.classList.remove('drag', 'ready'); armed = false; active = false;
      if (!go || busy) { el.classList.remove('visible'); set(0); return; }
      busy = true; el.classList.add('visible', 'loading'); set(52); text.textContent = 'Đang làm mới…';
      const t0 = Date.now();
      try { await load(true); await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - t0)))); toast('Đã cập nhật dữ liệu'); }
      catch { toast('Không thể làm mới, hãy kiểm tra mạng'); }
      finally { busy = false; el.classList.remove('loading', 'visible'); set(0); text.textContent = 'Kéo xuống để làm mới'; }
    }, { passive: true });
    document.addEventListener('touchcancel', reset, { passive: true });
  }
}
})();
