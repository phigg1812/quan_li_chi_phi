(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
$('input[name=dueDate]').min = today;
// Ô giá: tự chèn dấu chấm ngăn cách hàng nghìn khi gõ (500000 → 500.000), giữ nguyên vị trí con trỏ
const money = $('input[data-money]');
money.addEventListener('input', () => {
  const raw = money.value, pos = money.selectionStart ?? raw.length, left = raw.slice(0, pos).replace(/\D/g, '').length;
  const out = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (out === raw) return;
  money.value = out;
  let n = 0, i = 0; for (; i < out.length && n < left; i++) if (/\d/.test(out[i])) n++;
  try { money.setSelectionRange(i, i); } catch {}
});

// Ảnh mẫu: nút bằng tiếng Việt (nút mặc định của trình duyệt hiện theo ngôn ngữ máy). Ảnh lớn được thu nhỏ trước khi gửi cho nhanh.
const MAX_PHOTO = 5 * 1024 * 1024;
const pin = $('#photoInput'), pname = $('#photoName'), pprev = $('#photoPrev'), pclear = $('#photoClear');
$('#photoBtn').addEventListener('click', () => pin.click());
const showPhoto = () => {
  const f = pin.files[0];
  if (pprev.src) { URL.revokeObjectURL(pprev.src); pprev.removeAttribute('src'); }
  if (!f) { pname.textContent = 'Chưa chọn ảnh'; pprev.classList.add('hidden'); pclear.classList.add('hidden'); return; }
  pname.textContent = f.name + ' (' + (f.size / 1048576).toFixed(1).replace('.', ',') + ' MB)';
  pprev.src = URL.createObjectURL(f); pprev.classList.remove('hidden'); pclear.classList.remove('hidden');
};
pin.addEventListener('change', showPhoto);
pclear.addEventListener('click', () => { pin.value = ''; showPhoto(); });
async function fitPhoto(file) {
  if (!file || !file.size || file.size <= 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    for (const [side, q] of [[2000, .82], [1600, .75], [1200, .7]]) {
      const k = Math.min(1, side / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= 1.6 * 1024 * 1024) return new File([blob], 'mau-hoa.jpg', { type: 'image/jpeg' });
    }
  } catch {}
  return file;
}

$('#publicMethod').addEventListener('change', (e) => {
  $('#deliveryAddr').classList.toggle('hidden', e.target.value !== 'delivery');
  $('#deliveryAddr textarea').required = e.target.value === 'delivery';
});

// Cloudflare Turnstile (chống spam) chỉ hiện khi tiệm đã cài khoá TURNSTILE_SITEKEY / TURNSTILE_SECRET
fetch('/api/public/config').then((r) => r.json()).then((c) => {
  if (!c.turnstileSiteKey) return;
  const box = $('#turnstile'); box.classList.remove('hidden');
  const sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; sc.async = true;
  sc.onload = () => window.turnstile && window.turnstile.render(box, { sitekey: c.turnstileSiteKey });
  document.head.appendChild(sc);
}).catch(() => {});

$('#publicForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target, btn = $('#publicSubmit'), err = $('#publicError');
  btn.disabled = true; btn.textContent = 'Đang gửi yêu cầu…'; err.textContent = '';
  try {
    const fd = new FormData(form);
    fd.set('total', String(money.value).replace(/\D/g, ''));
    const raw = pin.files[0];
    if (raw) {
      const f = await fitPhoto(raw);
      if (f.size > MAX_PHOTO) throw Error('Ảnh quá lớn (tối đa 5 MB). Hãy chọn ảnh khác.');
      fd.set('photo', f, f.name);
    }
    const res = await fetch('/api/public/requests', { method: 'POST', body: fd });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(d.error || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    form.classList.add('hidden');
    const done = $('#publicDone'); done.classList.remove('hidden');
    done.innerHTML = `<h2>Đã gửi yêu cầu ${esc(d.code)}</h2>
      <p class="public-note">Tiệm đã nhận được yêu cầu và sẽ liên hệ lại qua số điện thoại bạn đã nhập để xác nhận mẫu hoa, giá và cách thanh toán. Yêu cầu chỉ được nhận làm sau khi tiệm xác nhận.</p>
      ${d.phone ? `<a class="btn primary" href="tel:${esc(d.phone)}">Gọi tiệm: ${esc(d.phone)}</a>` : ''}
      <button type="button" class="btn ghost" id="again">Gửi yêu cầu khác</button>`;
    done.scrollIntoView({ behavior: 'smooth' });
    $('#again').addEventListener('click', () => { form.reset(); showPhoto(); if (window.turnstile) try { window.turnstile.reset(); } catch {} form.classList.remove('hidden'); done.classList.add('hidden'); btn.disabled = false; btn.textContent = 'Gửi yêu cầu đặt hoa'; window.scrollTo(0, 0); });
  } catch (ex) {
    err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Gửi yêu cầu đặt hoa';
    if (window.turnstile) try { window.turnstile.reset(); } catch {}
  }
});
})();
