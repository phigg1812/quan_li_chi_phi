const ENVELOPE_SCOPES = {personal:'Riêng tôi · Bạn Pi', partner:'Bên Bơ', couple:'Vợ chồng · Bạn chung'};
let envelopeFilter = 'all';
let envelopeSort = 'recent';
const envelopeNameOrder = new Intl.Collator('vi',{sensitivity:'base',numeric:true});
const selectedEnvelopeScopes = new Set();

function renderEnvelopeView(){
  const section = document.getElementById('view-envelopes');
  if(!section.querySelector('.envelope-list')){
    section.innerHTML = `
      <div class="envelope-header"><h1>Sổ phong bì</h1><button class="btn btn-primary" id="envelopeAdd">+ Ghi phong bì</button></div>
      <div class="envelope-totals" aria-label="Tổng tiền phong bì"></div>
      <div class="envelope-filters">
        <input class="filter-select" type="search" aria-label="Tìm phong bì" placeholder="Tên, sự kiện hoặc ghi chú">
        <select class="filter-select" aria-label="Lọc phong bì" id="envelopeDirection">
          <option value="all">Tất cả</option><option value="received">Đã nhận</option><option value="sent">Đã đi</option>
          <option value="open">Chưa đi lại</option>
        </select>
        <select class="filter-select" aria-label="Sắp xếp phong bì" id="envelopeSort">
          <option value="recent">Sắp xếp: Mới nhất</option>
          <option value="amount-desc">Tiền: Lớn → nhỏ</option>
          <option value="amount-asc">Tiền: Nhỏ → lớn</option>
          <option value="name-asc">Tên: A → Z</option>
          <option value="name-desc">Tên: Z → A</option>
        </select>
      </div>
      <fieldset class="envelope-groups">
        <legend>Nhóm người gửi hoặc nhận</legend>
        ${Object.entries(ENVELOPE_SCOPES).map(([key,label])=>`<label><input type="checkbox" value="${key}">${label}</label>`).join('')}
      </fieldset>
      <p class="envelope-result-count" role="status"></p>
      <div class="envelope-list"></div>`;
    section.querySelector('#envelopeAdd').onclick = ()=>openEnvelopeForm();
    section.querySelector('input[type=search]').oninput = renderEnvelopeView;
    section.querySelector('.envelope-groups').onchange = ({target})=>{
      if(target.checked) selectedEnvelopeScopes.add(target.value);
      else selectedEnvelopeScopes.delete(target.value);
      renderEnvelopeView();
    };
    section.querySelector('#envelopeDirection').onchange = event=>{
      envelopeFilter = event.target.value;
      renderEnvelopeView();
    };
    section.querySelector('#envelopeSort').onchange = event=>{
      envelopeSort = event.target.value;
      renderEnvelopeView();
    };
  }
  section.querySelector('#envelopeAdd').disabled = STATE.envelopesUnavailable;
  const entries = STATE.envelopes;
  const query = normalizeVietnamese(section.querySelector('input').value.trim());
  const visible = entries.filter(entry=>{
    if(selectedEnvelopeScopes.size && !selectedEnvelopeScopes.has(entry.scope)) return false;
    if(!normalizeVietnamese([entry.person,entry.event,entry.notes,entry.method,entry.reciprocal?.event,entry.reciprocal?.notes].join(' ')).includes(query)) return false;
    if(envelopeFilter==='all') return true;
    if(envelopeFilter==='open') return !entry.reciprocal;
    return entry.direction===envelopeFilter ||
      (entry.reciprocal && ['sent','received'].includes(envelopeFilter));
  }).sort(compareEnvelopes);
  const totals = {received:0, sent:0};
  for(const entry of visible){
    totals[entry.direction] += Number(entry.amount);
    if(entry.reciprocal) totals[entry.direction==='sent' ? 'received' : 'sent'] += Number(entry.reciprocal.amount);
  }
  section.querySelector('.envelope-totals').innerHTML = `
    <div><span>Đã nhận</span><strong>${envelopeAmount(totals.received)}</strong></div>
    <div><span>Đã đi</span><strong>${envelopeAmount(totals.sent)}</strong></div>`;

  section.querySelector('.envelope-result-count').textContent = `${visible.length} khoản đang hiển thị`;
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

function compareEnvelopes(a,b){
  let order = 0;
  switch(envelopeSort){
    case 'amount-asc': order = envelopeSortAmount(a)-envelopeSortAmount(b); break;
    case 'amount-desc': order = envelopeSortAmount(b)-envelopeSortAmount(a); break;
    case 'name-asc': order = envelopeNameOrder.compare(a.person,b.person); break;
    case 'name-desc': order = envelopeNameOrder.compare(b.person,a.person); break;
  }
  return order || (b.reciprocal?.date || b.date).localeCompare(a.reciprocal?.date || a.date)
    || b.createdAt-a.createdAt || (a.sourceRow||0)-(b.sourceRow||0);
}

function envelopeSortAmount(entry){
  if(entry.reciprocal && ['sent','received'].includes(envelopeFilter) && entry.direction!==envelopeFilter){
    return Number(entry.reciprocal.amount);
  }
  return Number(entry.amount);
}

function envelopeAmount(amount){
  return new Intl.NumberFormat('vi-VN').format(amount)+' đ';
}

function envelopeCard(entry){
  const sent = entry.direction==='sent';
  const action = sent ? 'Họ đã đi lại' : 'Tôi đã đi lại';
  const transaction = (item,label)=>`
    <div class="envelope-transaction">
      <div><span>${label} · ${item.date ? escapeHTML(item.date.split('-').reverse().join('/')) : 'Chưa rõ ngày'}${item.method ? ' · '+escapeHTML(item.method) : ''}</span>
        <b>${escapeHTML(item.event)}</b>${item.notes ? `<span>${escapeHTML(item.notes)}</span>` : ''}${item.sourceRow ? `<span>Dòng Excel ${item.sourceRow}</span>` : ''}</div>
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

function formatEnvelopeAmountInput(value){
  const digits = value.replace(/[^0-9]/g,'').replace(/^0+(?=[0-9])/,'');
  return digits.replace(/\B(?=(?:[0-9]{3})+(?![0-9]))/g,'.');
}

function openEnvelopeForm(entry, isReciprocal=false){
  const owner = requireUid();
  const item = isReciprocal ? entry.reciprocal : entry;
  const dialog = document.createElement('dialog');
  dialog.className = 'envelope-dialog';
  dialog.setAttribute('aria-labelledby','envelopeFormTitle');
  dialog.innerHTML = `<form>
    <h2 id="envelopeFormTitle">${isReciprocal ? (entry.direction==='sent' ? 'Họ đã đi lại' : 'Tôi đã đi lại') : entry ? 'Sửa phong bì' : 'Ghi phong bì'}</h2>
    ${isReciprocal ? `<p class="envelope-person">${escapeHTML(entry.person)}</p>` : `
      <label>Người gửi hoặc nhận<input name="person" required maxlength="120" value="${escapeHTML(entry?.person)}"></label>
      <label>Chiều giao nhận<select name="direction" ${entry?.reciprocal ? 'disabled' : ''}>
        <option value="received" ${entry?.direction==='received' ? 'selected' : ''}>Tôi nhận</option>
        <option value="sent" ${!entry || entry.direction==='sent' ? 'selected' : ''}>Tôi đi</option>
      </select></label>
      <label>Ghi cho<select name="scope">
        ${Object.entries(ENVELOPE_SCOPES).map(([key,label])=>`<option value="${key}" ${entry?.scope===key ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>`}
    <label>Sự kiện<input name="event" required maxlength="160" placeholder="Ví dụ: Cưới, sinh nhật" value="${escapeHTML(item?.event)}"></label>
    <div class="envelope-quick-amounts" role="group" aria-label="Chọn sự kiện nhanh">
      ${['Cưới','Sinh nhật','Tân gia'].map(name=>`<button type="button" class="btn" data-event="${name}" aria-pressed="${item?.event===name}">${name}</button>`).join('')}
    </div>
    <label for="envelopeAmountInput">Số tiền</label>
    <div class="envelope-amount-field">
      <input id="envelopeAmountInput" name="amount" inputmode="numeric" placeholder="0" required
        aria-describedby="envelopeAmountHelp" value="${item?.amount ? formatEnvelopeAmountInput(String(item.amount)) : ''}">
      <span aria-hidden="true">₫</span>
    </div>
    <span id="envelopeAmountHelp" class="envelope-field-hint">Nhập hoặc chọn số tiền</span>
    <div class="envelope-quick-amounts">
      <button type="button" class="btn" data-amount="300000">300.000 ₫</button>
      <button type="button" class="btn" data-amount="500000">500.000 ₫</button>
      <button type="button" class="btn" data-amount="1000000">1.000.000 ₫</button>
    </div>
    <label>${isReciprocal ? 'Ngày (có thể để trống)' : 'Ngày'}<input name="date" type="date" ${isReciprocal || item?.date==='' ? '' : 'required'} value="${escapeHTML(item?.date ?? (isReciprocal ? '' : todayISO()))}"></label>
    <label>Ghi chú (không bắt buộc)<textarea name="notes" maxlength="500" rows="2">${escapeHTML(item?.notes)}</textarea></label>
    ${isReciprocal ? `<div class="envelope-quick-amounts">
      <button type="button" class="btn" data-past-gift>${entry.direction==='sent' ? 'Họ đã đi trước đó' : 'Tôi đã đi trước đó'}</button>
    </div>` : ''}
    <p class="envelope-error" role="alert" hidden></p>
    <footer><button class="btn" type="button" data-cancel>Đóng</button><button class="btn btn-primary" type="submit">Lưu phong bì</button></footer>
  </form>`;
  const form = dialog.querySelector('form');
  const error = dialog.querySelector('.envelope-error');
  const submit = form.querySelector('[type=submit]');
  const cancel = form.querySelector('[data-cancel]');
  const amountInput = form.elements.amount;
  const eventInput = form.elements.event;
  const quickEvents = [...form.querySelectorAll('[data-event]')];
  const syncQuickEvents = ()=>quickEvents.forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.event===eventInput.value.trim()));
  });
  eventInput.addEventListener('input',syncQuickEvents);
  quickEvents.forEach(button=>{
    button.onclick = ()=>{
      eventInput.value = button.dataset.event;
      syncQuickEvents();
    };
  });
  const pastGift = form.querySelector('[data-past-gift]');
  if(pastGift){
    const notes = form.elements.notes;
    const phrase = pastGift.textContent;
    const syncPastGift = ()=>{
      pastGift.disabled = notes.value.split('\n').some(line=>line.trim()===phrase)
        || notes.value.trimEnd().length+phrase.length+(notes.value.trimEnd()?1:0)>notes.maxLength;
    };
    notes.addEventListener('input',syncPastGift);
    pastGift.onclick = ()=>{
      notes.value = [notes.value.trimEnd(),phrase].filter(Boolean).join('\n');
      syncPastGift();
    };
    syncPastGift();
  }
  amountInput.addEventListener('input',()=>{
    const raw = amountInput.value;
    const digitsAfterCaret = raw.slice(amountInput.selectionStart).replace(/[^0-9]/g,'').length;
    amountInput.value = formatEnvelopeAmountInput(raw);
    let caret = amountInput.value.length;
    for(let remaining=digitsAfterCaret; caret>0 && remaining>0;){
      if(/[0-9]/.test(amountInput.value[--caret])) remaining--;
    }
    amountInput.setSelectionRange(caret,caret);
    amountInput.setCustomValidity('');
  });
  form.querySelectorAll('[data-amount]').forEach(button=>{
    button.onclick = ()=>{
      amountInput.value = formatEnvelopeAmountInput(button.dataset.amount);
      amountInput.setCustomValidity('');
    };
  });
  cancel.onclick = ()=>dialog.close();
  dialog.addEventListener('cancel',event=>{ if(submit.disabled) event.preventDefault(); });
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  form.onsubmit = async event=>{
    event.preventDefault();
    const values = new FormData(form);
    const value = key=>String(values.get(key) || '').trim();
    const amount = Number(value('amount').replace(/\./g,''));
    if(!Number.isSafeInteger(amount) || amount<=0 || amount>9999999999999){
      amountInput.setCustomValidity('Nhập số tiền lớn hơn 0 và tối đa 13 chữ số.');
      amountInput.reportValidity();
      return;
    }
    const transaction = {event:value('event'),amount,date:value('date'),notes:value('notes')};
    const record = isReciprocal ? {...entry,reciprocal:transaction} : {
      ...entry,...transaction,id:entry?.id || uid('gift'),createdAt:entry?.createdAt || Date.now(),
      person:value('person'),scope:value('scope'),direction:value('direction') || entry.direction
    };
    if(!record.person || !transaction.event){
      error.textContent = 'Hãy nhập tên và sự kiện.';
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

function envelopeImportRows(payload){
  if(payload?.format!=='so-phong-bi-v1' || !Array.isArray(payload.envelopes) ||
     !payload.envelopes.length || payload.envelopes.length>400) throw new Error('Tệp nhập không đúng định dạng hoặc vượt 400 khoản.');
  const ids = new Set();
  return payload.envelopes.map(entry=>{
    if(!entry || typeof entry.id!=='string' || !/^gift_import_[a-f0-9]{24}$/.test(entry.id) || ids.has(entry.id) ||
       !Object.hasOwn(ENVELOPE_SCOPES,entry.scope) || !['sent','received'].includes(entry.direction) ||
       !Number.isSafeInteger(entry.amount) || entry.amount<=0 || !Number.isSafeInteger(entry.sourceRow) || entry.sourceRow<1 ||
       typeof entry.person!=='string' || !entry.person.trim() || entry.person.length>120 ||
       typeof entry.event!=='string' || !entry.event.trim() || entry.event.length>160 ||
       typeof entry.notes!=='string' || entry.notes.length>500 ||
       !['Phong bì','Chuyển khoản'].includes(entry.method) ||
       typeof entry.date!=='string' || (entry.date && !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))){
      throw new Error('Tệp có khoản thiếu thông tin hoặc trùng mã.');
    }
    ids.add(entry.id);
    const {id,person,scope,direction,amount,event,date,method,notes,sourceRow} = entry;
    return {id,person,scope,direction,amount,event,date,method,notes,sourceRow,createdAt:Date.now()};
  });
}

function openEnvelopeImport(){
  const owner = requireUid();
  const dialog = document.createElement('dialog');
  dialog.className = 'envelope-dialog';
  dialog.setAttribute('aria-labelledby','envelopeImportTitle');
  dialog.innerHTML = `<form>
    <h2 id="envelopeImportTitle">Nhập sổ phong bì</h2>
    <label>Tệp đã đối soát<input type="file" accept=".json,application/json" required></label>
    <p role="status"></p>
    <footer><button type="button" class="btn">Đóng</button><button class="btn btn-primary" disabled>Nhập khoản</button></footer>
  </form>`;
  const fileInput = dialog.querySelector('input');
  const submit = dialog.querySelector('button:not([type])');
  const cancel = dialog.querySelector('[type=button]');
  const status = dialog.querySelector('[role=status]');
  let records;
  cancel.onclick = ()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('cancel',event=>{ if(cancel.disabled) event.preventDefault(); });
  fileInput.onchange = async ()=>{
    records = null;
    submit.disabled = true;
    status.textContent = '';
    const file = fileInput.files[0];
    if(!file) return;
    try{
      if(file.size>1000000) throw new Error('Tệp quá lớn.');
      const parsed = envelopeImportRows(JSON.parse(await file.text()));
      if(fileInput.files[0]!==file) return;
      records = parsed;
      status.textContent = `${records.length} khoản · ${envelopeAmount(records.reduce((sum,row)=>sum+row.amount,0))}. Các mã đã có sẽ được bỏ qua.`;
      submit.disabled = false;
    }catch(err){
      if(fileInput.files[0]===file) status.textContent = err instanceof SyntaxError ? 'Tệp JSON không hợp lệ.' : err.message;
    }
  };
  dialog.querySelector('form').onsubmit = async event=>{
    event.preventDefault();
    if(!records || cancel.disabled) return;
    cancel.disabled = submit.disabled = fileInput.disabled = true;
    status.textContent = 'Đang nhập…';
    try{
      if(requireUid()!==owner) throw new Error('Tài khoản đã thay đổi.');
      const docs = records.map(record=>storeDoc('envelopes',record.id));
      const inserted = await window.FB.runTransaction(window.FB.db,async transaction=>{
        const existing = await Promise.all(docs.map(doc=>transaction.get(doc)));
        const fresh = records.filter((record,index)=>{
          if(existing[index].exists()) return false;
          transaction.set(docs[index],record);
          return true;
        });
        return fresh;
      });
      if(window.FB.currentUser?.uid===owner){
        const known = new Set(STATE.envelopes.map(record=>record.id));
        STATE.envelopes.push(...inserted.filter(record=>!known.has(record.id)));
        switchView('envelopes');
        showToast(`Đã nhập ${inserted.length} khoản · bỏ qua ${records.length-inserted.length} mã đã có.`);
      }
      dialog.close();
    }catch(err){
      status.textContent = 'Chưa nhập được dữ liệu. Kiểm tra kết nối và quyền Firestore rồi thử lại.';
    }finally{
      cancel.disabled = submit.disabled = fileInput.disabled = false;
    }
  };
  document.body.append(dialog);
  dialog.showModal();
}

document.getElementById('envelopeImport').addEventListener('click',openEnvelopeImport);
