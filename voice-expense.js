(() => {
  for(const id of ['fAmount','fPaymentMethod']){
    document.getElementById(id).addEventListener('input',event=>event.target.removeAttribute('aria-invalid'));
  }
  const button = document.getElementById('voiceExpenseBtn');
  button.onclick = () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'envelope-dialog voice-expense-sheet';
    dialog.setAttribute('aria-labelledby', 'voiceExpenseTitle');
    dialog.innerHTML = `<form>
      <h2 id="voiceExpenseTitle" tabindex="-1" autofocus>Nhập bằng giọng nói</h2>
      <div class="voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p class="voice-status" role="status">Đang mở mic…</p>
      <label>Nội dung khoản chi<textarea rows="2" placeholder="Ví dụ đổ xăng 1tr thẻ tín dụng"></textarea></label>
      <footer><button class="btn" type="button" data-cancel>Hủy</button>
        <button class="btn btn-primary" type="submit">Xong</button></footer>
    </form>`;
    const form = dialog.querySelector('form');
    const transcript = dialog.querySelector('textarea');
    const status = dialog.querySelector('.voice-status');
    const done = form.querySelector('[type=submit]');
    let voiceDate = todayISO();
    let recognition = null;
    let finalText = '';
    let failed = false;
    let stopping = false;
    const finish = () => {
      const value = transcript.value.trim();
      if(!value){
        status.textContent = 'Chưa có nội dung. Bạn có thể nhập hoặc dùng mic trên bàn phím.';
        transcript.focus();
        return;
      }
      dialog.close();
      prefillExpenseFromNaturalText(value,{voiceDate});
    };
    const stopWithFallback = message => {
      failed = true;
      dialog.classList.remove('listening');
      status.textContent = message+' Bạn có thể dùng mic trên bàn phím hoặc nhập nội dung.';
      done.disabled = false;
    };
    form.querySelector('[data-cancel]').onclick = () => dialog.close();
    form.onsubmit = event => {
      event.preventDefault();
      if(recognition && !failed){
        if(stopping) return;
        stopping = true;
        done.disabled = true;
        status.textContent = 'Đang nhận nội dung…';
        try{ recognition.stop(); }
        catch{ recognition.abort(); recognition = null; finish(); }
      }else finish();
    };
    dialog.addEventListener('close', () => {
      recognition?.abort();
      recognition = null;
      dialog.remove();
    }, {once:true});
    document.body.append(dialog);
    dialog.showModal();

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Recognition){
      stopWithFallback('Trình duyệt chưa hỗ trợ nhận giọng nói trực tiếp.');
      return;
    }
    try{
      recognition = new Recognition();
      recognition.lang = 'vi-VN';
      recognition.interimResults = true;
      recognition.continuous = false;
      transcript.readOnly = true;
      recognition.onstart = () => {
        if(!dialog.open || stopping) return;
        voiceDate = todayISO();
        status.textContent = 'Đang nghe…';
        dialog.classList.add('listening');
      };
      recognition.onresult = event => {
        if(!dialog.open) return;
        const results = [...event.results];
        finalText = results.filter(result=>result.isFinal).map(result=>result[0].transcript).join(' ').trim();
        transcript.value = results.map(result=>result[0].transcript).join(' ').trim();
      };
      recognition.onerror = event => {
        if(!dialog.open) return;
        transcript.readOnly = false;
        stopWithFallback(['not-allowed','service-not-allowed'].includes(event.error)
          ? 'Chưa được cấp quyền dùng mic.' : 'Chưa nhận được giọng nói.');
      };
      recognition.onend = () => {
        if(!dialog.open) return;
        recognition = null;
        transcript.readOnly = false;
        dialog.classList.remove('listening');
        done.disabled = false;
        if(failed) return;
        if(finalText) transcript.value = finalText;
        if(transcript.value.trim()) finish();
        else stopWithFallback('Chưa nhận được giọng nói.');
      };
      recognition.start();
    }catch{
      recognition = null;
      transcript.readOnly = false;
      stopWithFallback('Chưa bật được mic.');
    }
  };
})();
