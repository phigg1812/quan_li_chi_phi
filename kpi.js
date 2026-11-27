(() => {
  const view=document.getElementById('view-kpi');
  const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'});
  const today=()=>{
    const fields=Object.fromEntries(dayFormat.formatToParts(new Date()).map(p=>[p.type,p.value]));
    return fields.year+'-'+fields.month+'-'+fields.day;
  };
  const move=(day,offset)=>dateISO(new Date(parseISO(day).getFullYear(),parseISO(day).getMonth(),parseISO(day).getDate()+offset));
  let state={tasks:[],ticks:{}};
  let selected=null,month=parseISO(today()),recordNew=false;
  let loadedOwner=null;
  const pendingTaskWrites=new Set();
  const pendingTickWrites=new Map();
  window.loadKpiSettings=rows=>{
    state={tasks:[],ticks:{}};
    pendingTickWrites.clear();
    pendingTaskWrites.clear();
    const owner=window.FB.currentUser?.uid;
    if(loadedOwner!==owner){
      selected=null;
      month=parseISO(today());
      recordNew=false;
      loadedOwner=owner;
    }
    for(const row of rows){
      if(row.key?.startsWith('kpi_task_') && typeof row.id==='string' && typeof row.name==='string' && /^\d{4}-\d{2}-\d{2}$/.test(row.start)) state.tasks.push(row);
      if(row.key?.startsWith('kpi_day_') && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.marks){
        state.ticks[row.date]=new Set(Object.keys(row.marks).filter(id=>row.marks[id]===true));
      }
    }
  };
  const refresh=()=>{if(STATE.ui.currentView==='kpi') render();};
  const taskName=(task,day)=>{
    const revisions=Object.keys(task.names||{}).filter(date=>date<=day).sort();
    return task.names?.[revisions.at(-1)]||task.name;
  };
  function changeTask(task,patch){
    if(pendingTaskWrites.has(task.id)){
      showToast('Hạng mục này đang chờ đồng bộ.');
      return false;
    }
    const previous=state.tasks.find(entry=>entry.id===task.id);
    const changed={...task,...patch,key:'kpi_task_'+task.id};
    const activeState=state;
    state.tasks=state.tasks.filter(entry=>entry.id!==task.id).concat(changed);
    pendingTaskWrites.add(task.id);
    refresh();
    const request=trackWrite(window.FB.setDoc(storeDoc('settings',changed.key),changed));
    request.catch(error=>{
      if(state!==activeState) return;
      state.tasks=state.tasks.filter(entry=>entry.id!==task.id);
      if(previous) state.tasks.push(previous);
      dbFail(error);
    }).finally(()=>{
      if(state!==activeState) return;
      pendingTaskWrites.delete(task.id);
      refresh();
    });
    return true;
  }
  const active=day=>state.tasks.filter(task=>task.start<=day && (!task.end || day<task.end))
    .sort((a,b)=>a.start.localeCompare(b.start)||(a.createdAt||0)-(b.createdAt||0)||a.id.localeCompare(b.id));
  const isDone=(day,id)=>state.ticks[day]?.has(id)===true;
  const count=day=>{const tasks=active(day);return {total:tasks.length,done:tasks.filter(task=>isDone(day,task.id)).length};};
  const percent=(n,d)=>d?Math.round(n/d*100):0;
  const filled=day=>{const {done,total}=count(day);return total>0&&done===total;};
  const tracked=()=>{
    const end=today();
    const dates=[];
    for(let day=state.tasks.map(task=>task.start).sort()[0];day && day<=end;day=move(day,1)) if(active(day).length) dates.push(day);
    return dates;
  };
  const stats=()=>{
    const dates=tracked();
    let record=0,run=0,last='';
    for(const day of dates){
      run=filled(day)?(last && move(last,1)===day?run+1:1):0;
      record=Math.max(record,run);
      last=day;
    }
    const day=today();
    let cursor=filled(day)?day:move(day,-1), current=0;
    while(filled(cursor)){current++;cursor=move(cursor,-1);}
    const elapsed=dates.filter(date=>date!==day||filled(date));
    return {record,current,elapsed,complete:elapsed.filter(filled).length};
  };
  function calendar(){
    const start=new Date(month.getFullYear(),month.getMonth(),1);
    const n=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    let html=['CN','T2','T3','T4','T5','T6','T7'].map(label=>'<span>'+label+'</span>').join('')+'<span aria-hidden="true"></span>'.repeat(start.getDay());
    for(let i=1;i<=n;i++){
      const date=dateISO(new Date(month.getFullYear(),month.getMonth(),i));
      const {done,total}=count(date);
      const visible=total>0&&date<=today();
      html+=`<button type="button" class="cal-cell" data-day="${date}" aria-pressed="${selected===date}" aria-label="${formatDateShort(date)}${visible?', '+done+'/'+total+' hạng mục':''}">${visible?calendarAmountFill(done,total):''}<span>${i}</span>${visible?'<small>'+percent(done,total)+'%</small>':''}</button>`;
    }
    return html;
  }
  function review(metrics){
    const grouped=new Map();
    for(const date of metrics.elapsed){
      const start=move(date,-((parseISO(date).getDay()+6)%7));
      const week=grouped.get(start)||{done:0,total:0};
      week.total++;
      if(filled(date)) week.done++;
      grouped.set(start,week);
    }
    const weeks=[...grouped].slice(-6);
    const datesTracked=tracked();
    const ranks=state.tasks.map(task=>{
      const dates=datesTracked.filter(day=>task.start<=day&&(!task.end||day<task.end));
      return {name:taskName(task,today()),done:dates.filter(day=>isDone(day,task.id)).length,total:dates.length};
    }).sort((a,b)=>b.done-a.done);
    const overall=percent(metrics.complete,metrics.elapsed.length);
    return `<div class="kpi-insights">
        <article class="panel kpi-insight-card"><h3>Tỷ lệ ngày đạt đủ KPI</h3>
          <div class="kpi-result"><div class="kpi-result-ring" style="--ratio:${overall}%"><strong>${overall}%</strong></div>
          <p><b>${metrics.complete}/${metrics.elapsed.length} ngày</b><span>Hoàn thành đủ hạng mục</span></p></div></article>
        <article class="panel kpi-insight-card"><h3>Đạt đủ KPI theo tuần</h3><div class="kpi-week-bars">${weeks.map(([date,week])=>`<div><b>${week.done}/${week.total}</b><div class="kpi-week-track"><i style="height:${percent(week.done,week.total)}%"></i></div>${formatDateShort(date).slice(0,5)}</div>`).join('')}</div></article>
        <article class="panel kpi-insight-card kpi-rank-card"><h3>Hoàn thành theo hạng mục</h3>${ranks.map(rank=>`<div class="kpi-rank"><b>${escapeHTML(rank.name)}</b><div class="kpi-track"><i style="width:${percent(rank.done,rank.total)}%"></i></div><span>${rank.done}/${rank.total} ngày · ${percent(rank.done,rank.total)}%</span></div>`).join('')}</article>
      </div>`;
  }
  function render(){
    const date=today(), metrics=stats(), {done,total}=count(date);
    const detail=selected&&selected<=date?active(selected):[];
    view.innerHTML=`<div class="kpi-page">
      <section class="panel kpi-hero"><h2>Chuỗi hoàn thành hiện tại</h2>
        <strong class="kpi-streak">${metrics.current} ngày liên tiếp</strong>
        <p class="kpi-record">Kỷ lục dài nhất ${metrics.record} ngày, hãy cố lên nhé!</p>
        ${recordNew?'<p class="qrx-note">Kỷ lục mới</p>':''}
        <div class="kpi-progress"><b>${total&&done===total?'Đã hoàn thành hôm nay':'Tiến độ hôm nay'}</b><span>${done}/${total}</span></div>
        <div class="kpi-track"><i style="width:${percent(done,total)}%"></i></div>
      </section>
      <section class="panel kpi-today"><div class="kpi-section-head"><h2>KPI Hôm nay</h2>
        <div class="kpi-task-actions">
          <button type="button" class="btn btn-primary" data-kpi-add aria-label="Thêm hạng mục">${iconSVG('plus',24)} Thêm</button>
          <button type="button" class="btn" data-kpi-manage aria-label="Quản lý hạng mục">${iconSVG('settings',24)} Quản lý</button>
        </div></div>
        <ol class="kpi-task-list" role="list">${[...active(date)].sort((a,b)=>Number(isDone(date,a.id))-Number(isDone(date,b.id))).map((task,index)=>{
          const complete=isDone(date,task.id);
          const label=complete?'Đã xong':'Chưa xong';
          return `<li class="kpi-task"><small class="kpi-task-number">${index+1}.</small><span>${escapeHTML(taskName(task,date))}</span><button type="button" class="exp-check exp-pay-action ${complete?'checked':''}" data-task="${task.id}" aria-pressed="${complete}" aria-label="${complete?'Bỏ đánh dấu hoàn thành':'Đánh dấu xong'}: ${escapeHTML(taskName(task,date))}">${complete?iconSVG('check',13):''}${label}</button></li>`;
        }).join('')||'<li>Chưa có hạng mục. Bấm Thêm để bắt đầu.</li>'}</ol>
      </section>
      <section class="panel"><div class="kpi-month"><button class="btn" data-kpi-month="-1" aria-label="Tháng trước">‹</button><h2>Tháng ${month.getMonth()+1}/${month.getFullYear()}</h2><button class="btn" data-kpi-month="1" aria-label="Tháng sau">›</button></div>
        <div class="kpi-calendar">${calendar()}</div>
        ${selected?`<div class="kpi-day-detail"><b>Ngày ${formatDateShort(selected)}</b>${detail.length?detail.map(task=>'<p>'+(isDone(selected,task.id)?'✓ ':'○ ')+escapeHTML(taskName(task,selected))+'</p>').join(''):'<p>Chưa có dữ liệu</p>'}</div>`:''}
      </section>
      <section class="kpi-review"><h2>Nhìn lại</h2>${review(metrics)}</section>
    </div>`;
  }
  function openEditor(manage=false){
    const dialog=document.createElement('dialog');
    dialog.className='envelope-dialog kpi-editor';
    dialog.setAttribute('aria-labelledby','kpiEditorTitle');
    dialog.innerHTML=manage?`<h2 id="kpiEditorTitle">Quản lý hạng mục</h2>${active(today()).map(task=>`<label>${escapeHTML(taskName(task,today()))}<input autocomplete="off" maxlength="80" data-rename="${task.id}" value="${escapeHTML(taskName(task,today()))}"><button class="btn" type="button" data-archive="${task.id}">Ngừng theo dõi từ ngày mai</button></label>`).join('')}<footer><button class="btn" data-close>Đóng</button></footer>`:
      '<form><h2 id="kpiEditorTitle">Thêm hạng mục hằng ngày</h2><label>Tên hạng mục<input required autocomplete="off" maxlength="80" name="taskTitle"></label><footer><button class="btn" type="button" data-close>Hủy</button><button class="btn btn-primary">Thêm</button></footer></form>';
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.querySelectorAll('[data-rename]').forEach(input=>input.onchange=()=>{
      const task=state.tasks.find(item=>item.id===input.dataset.rename);
      const name=input.value.trim();
      if(task&&name&&name!==taskName(task,today())) changeTask(task,{names:{...task.names,[today()]:name}});
    });
    dialog.querySelectorAll('[data-archive]').forEach(button=>button.onclick=()=>{
      const task=state.tasks.find(item=>item.id===button.dataset.archive);
      if(task&&changeTask(task,{end:move(today(),1)})) dialog.close();
    });
    const form=dialog.querySelector('form');
    if(form) form.onsubmit=event=>{
      event.preventDefault();
      const name=form.elements.taskTitle.value.trim();
      if(!name) return;
      changeTask({id:uid('kpi'),name,start:today(),createdAt:Date.now()});
      dialog.close();
    };
    const viewport=window.visualViewport;
    const root=document.documentElement;
    const mobile=matchMedia('(max-width:820px)');
    const fitEditor=()=>{
      if(!viewport || !mobile.matches) return;
      const inset=Math.max(0,root.clientHeight-viewport.height-viewport.offsetTop);
      root.style.setProperty('--kpi-keyboard-inset',Math.round(inset)+'px');
      dialog.style.setProperty('--kpi-editor-height',Math.floor(viewport.height)+'px');
    };
    dialog.addEventListener('close',()=>{
      viewport?.removeEventListener('resize',fitEditor);
      viewport?.removeEventListener('scroll',fitEditor);
      root.style.removeProperty('--kpi-keyboard-inset');
      dialog.remove();
    },{once:true});
    document.body.append(dialog);
    dialog.showModal();
    fitEditor();
    viewport?.addEventListener('resize',fitEditor);
    viewport?.addEventListener('scroll',fitEditor);
  }
  function toggleTask(id){
    const date=today(), previous=stats().record;
    if(!active(date).some(task=>task.id===id)) return;
    const previousValue=isDone(date,id), nextValue=!previousValue;
    const done=state.ticks[date] ||= new Set();
    const operation=Symbol();
    const operationKey=date+'_'+id;
    const currentState=state;
    pendingTickWrites.set(operationKey,operation);
    if(nextValue) done.add(id); else done.delete(id);
    recordNew=stats().record>previous;
    render();
    view.querySelector('[data-task="'+id+'"]')?.focus({preventScroll:true});
    const key='kpi_day_'+date;
    const request=trackWrite(window.FB.setDoc(storeDoc('settings',key),{key,date,marks:{[id]:nextValue}},{merge:true}));
    request.catch(error=>{
      if(state!==currentState||pendingTickWrites.get(operationKey)!==operation) return;
      if(previousValue) done.add(id); else done.delete(id);
      recordNew=false;
      dbFail(error);refresh();
    }).finally(()=>{
      if(pendingTickWrites.get(operationKey)===operation) pendingTickWrites.delete(operationKey);
    });
  }
  view.onclick=event=>{
    const button=event.target.closest('button');
    if(!button) return;
    if(button.dataset.task) return toggleTask(button.dataset.task);
    if(button.hasAttribute('data-kpi-add')) return openEditor();
    if(button.hasAttribute('data-kpi-manage')) return openEditor(true);
    if(button.dataset.day) selected=button.dataset.day;
    if(button.dataset.kpiMonth){month=new Date(month.getFullYear(),month.getMonth()+Number(button.dataset.kpiMonth),1);selected=null;}
    render();
  };
  window.renderKpiPage=render;
  let renderedDay=today();
  setInterval(()=>{if(renderedDay!==today()){renderedDay=today();if(STATE.ui.currentView==='kpi') render();}},15000);
})();
