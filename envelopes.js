const ENVELOPE_SCOPES = {personal:'Riêng tôi', couple:'Vợ chồng'};
let envelopeFilter = 'all';

function renderEnvelopeView(){
  const section = document.getElementById('view-envelopes');
  if(!section.querySelector('.envelope-list')){
    section.innerHTML = `
      <div class="envelope-header"><h1>Sổ phong bì</h1><button class="btn btn-primary" id="envelopeAdd">+ Ghi phong bì</button></div>
      <div class="envelope-totals" aria-label="Tổng tiền phong bì"></div>
      <div class="envelope-filters">
        <input class="filter-select" type="search" aria-label="Tìm phong bì" placeholder="Tên hoặc sự kiện">
        <select class="filter-select" aria-label="Lọc phong bì">
          <option value="all">Tất cả</option><option value="received">Đã nhận</option><option value="sent">Đã đi</option>
          <option value="personal">Riêng tôi</option><option value="couple">Vợ chồng</option><option value="open">Chưa đi lại</option>
        </select>
      </div>
      <div class="envelope-list"></div>`;
    section.querySelector('#envelopeAdd').onclick = ()=>openEnvelopeForm();
    section.querySelector('input').oninput = renderEnvelopeView;
    section.querySelector('select').onchange = event=>{
      envelopeFilter = event.target.value;
      renderEnvelopeView();
    };
  }
  section.querySelector('#envelopeAdd').disabled = STATE.envelopesUnavailable;
  const entries = STATE.envelopes;
  const totals = {received:0, sent:0};
  for(const entry of entries){
    totals[entry.direction] += Number(entry.amount);
    if(entry.reciprocal) totals[entry.direction==='sent' ? 'received' : 'sent'] += Number(entry.reciprocal.amount);
  }
  section.querySelector('.envelope-totals').innerHTML = `
    <div><span>Đã nhận</span><strong>${envelopeAmount(totals.received)}</strong></div>
    <div><span>Đã đi</span><strong>${envelopeAmount(totals.sent)}</strong></div>`;

  const query = normalizeVietnamese(section.querySelector('input').value.trim());
  const visible = entries.filter(entry=>{
    if(!normalizeVietnamese([entry.person,entry.event,entry.reciprocal?.event].join(' ')).includes(query)) return false;
    if(envelopeFilter==='all') return true;
    if(envelopeFilter==='open') return !entry.reciprocal;
    return entry.direction===envelopeFilter || entry.scope===envelopeFilter ||
      (entry.reciprocal && ['sent','received'].includes(envelopeFilter));
  }).sort((a,b)=>(b.reciprocal?.date || b.date).localeCompare(a.reciprocal?.date || a.date)
    || b.createdAt-a.createdAt);
  const list = section.querySelector('.envelope-list');
  list.innerHTML = visible.map(envelopeCard).join('') ||
    `<p class="envelope-empty" role="status">${STATE.envelopesUnavailable ? 'Chưa truy cập được Sổ phong bì. Cần cập nhật quy tắc Firestore.' : entries.length ? 'Không tìm thấy phong bì phù hợp.' : 'Chưa có phong bì. Bấm “Ghi phong bì” để bắt đầu.'}</p>`;
  list.querySelectorAll('button').forEach(button=>{
    button.onclick = ()=>{
      const entry = entries.find(item=>item.id===button.closest('article').dataset.id);
      if(entry) openEnvelopeForm(entry,button.dataset.action==='reciprocal');
    };
  });
}

function envelopeAmount(amount){
  return new Intl.NumberFormat('vi-VN').format(amount)+' đ';
}

function envelopeCard(entry){
  const sent = entry.direction==='sent';
  const action = sent ? 'Họ đã đi lại' : 'Tôi đã đi lại';
  const transaction = (item,label)=>`
    <div class="envelope-transaction">
      <div><span>${label} · ${escapeHTML(item.date.split('-').reverse().join('/'))}</span>
        <b>${escapeHTML(item.event)}</b>${item.notes ? `<span>${escapeHTML(item.notes)}</span>` : ''}</div>
      <strong>${envelopeAmount(item.amount)}</strong>
    </div>`;
  return `<article class="envelope-card" data-id="${escapeHTML(entry.id)}">
    <header><h2>${escapeHTML(entry.person)}</h2><span>${ENVELOPE_SCOPES[entry.scope]}</span></header>
    ${transaction(entry,sent ? 'Tôi đi' : 'Tôi nhận')}
    ${entry.reciprocal ? transaction(entry.reciprocal,action) : ''}
    <footer><button class="btn" data-action="edit">Sửa</button>
      <button class="btn ${entry.reciprocal ? '' : 'btn-primary'}" data-action="reciprocal">${entry.reciprocal ? 'Sửa lượt đi lại' : action}</button>
    </footer></article>`;
}

function openEnvelopeForm(entry, isReciprocal=false){
  const owner = requireUid();
  const item = isReciprocal ? entry.reciprocal : entry;
  const dialog = document.createElement('dialog');
  dialog.className = 'envelope-dialog';
  dialog.setAttribute('aria-labelledby','envelopeFormTitle');
  dialog.innerHTML = `<form>
    <h2 id="envelopeFormTitle">${isReciprocal ? (entry.direction==='sent' ? 'Họ đã đi lại' : 'Tôi đã đi lại') : entry ? 'Sửa phong bì' : 'Ghi phong bì'}</h2>
    ${isReciprocal ? `<p>${escapeHTML(entry.person)}</p>` : `
      <label>Người gửi hoặc nhận<input name="person" required maxlength="120" value="${escapeHTML(entry?.person)}"></label>
      <label>Chiều giao nhận<select name="direction" ${entry?.reciprocal ? 'disabled' : ''}>
        <option value="received" ${entry?.direction==='received' ? 'selected' : ''}>Tôi nhận</option>
        <option value="sent" ${!entry || entry.direction==='sent' ? 'selected' : ''}>Tôi đi</option>
      </select></label>
      <label>Ghi cho<select name="scope">
        <option value="personal">Riêng tôi</option><option value="couple" ${entry?.scope==='couple' ? 'selected' : ''}>Vợ chồng</option>
      </select></label>`}
    <label>Sự kiện<input name="event" required maxlength="160" placeholder="Ví dụ: Cưới, sinh nhật" value="${escapeHTML(item?.event)}"></label>
    <label>Số tiền (đ)<input name="amount" inputmode="numeric" pattern="[0-9]+" maxlength="13" required value="${escapeHTML(item?.amount)}"></label>
    <label>Ngày<input name="date" type="date" required value="${escapeHTML(item?.date || todayISO())}"></label>
    <label>Ghi chú<textarea name="notes" maxlength="500" rows="2">${escapeHTML(item?.notes)}</textarea></label>
    <p class="envelope-error" role="alert" hidden></p>
    <footer><button class="btn" type="button">Đóng</button><button class="btn btn-primary" type="submit">Lưu phong bì</button></footer>
  </form>`;
  const form = dialog.querySelector('form');
  const error = dialog.querySelector('.envelope-error');
  const submit = form.querySelector('[type=submit]');
  const cancel = form.querySelector('[type=button]');
  cancel.onclick = ()=>dialog.close();
  dialog.addEventListener('cancel',event=>{ if(submit.disabled) event.preventDefault(); });
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  form.onsubmit = async event=>{
    event.preventDefault();
    const values = new FormData(form);
    const value = key=>String(values.get(key) || '').trim();
    const transaction = {event:value('event'),amount:Number(value('amount')),date:value('date'),notes:value('notes')};
    const record = isReciprocal ? {...entry,reciprocal:transaction} : {
      ...entry,...transaction,id:entry?.id || uid('gift'),createdAt:entry?.createdAt || Date.now(),
      person:value('person'),scope:value('scope'),direction:value('direction') || entry.direction
    };
    if(!record.person || !transaction.event || transaction.amount<=0){
      error.textContent = 'Hãy nhập tên, sự kiện và số tiền lớn hơn 0.';
      error.hidden = false;
      return;
    }
    submit.disabled = cancel.disabled = true;
    submit.textContent = 'Đang lưu…';
    error.hidden = true;
    try{
      if(requireUid()!==owner) throw new Error('Tài khoản đã thay đổi');
      await window.FB.setDoc(storeDoc('envelopes',record.id),record);
      if(requireUid()!==owner){ dialog.close(); return; }
      const index = STATE.envelopes.findIndex(existing=>existing.id===record.id);
      if(index<0) STATE.envelopes.push(record);
      else STATE.envelopes[index] = record;
      dialog.close();
      renderEnvelopeView();
      focusEnvelopeCard(record.id);
      showToast('Đã lưu phong bì');
    }catch(err){
      error.textContent = 'Chưa lưu được phong bì. Kiểm tra kết nối rồi thử lại.';
      error.hidden = false;
    }finally{
      submit.disabled = cancel.disabled = false;
      submit.textContent = 'Lưu phong bì';
    }
  };
  document.body.append(dialog);
  dialog.showModal();
}

function focusEnvelopeCard(id){
  const section = document.getElementById('view-envelopes');
  const card = [...section.querySelectorAll('.envelope-card')].find(item=>item.dataset.id===id);
  (card?.querySelector('button') || section.querySelector('#envelopeAdd'))?.focus();
}
