'use strict';
(() => {
  const label=document.createElement('span');
  label.className='demo-label';
  label.textContent='Bản demo';
  document.getElementById('menuBtn').after(label);
  const mobile=matchMedia('(max-width:820px)');
  let from;
  document.addEventListener('touchstart',event=>{
    from=null;
    if(!mobile.matches||event.touches.length!==1||document.getElementById('appShell').classList.contains('hidden')||
       document.querySelector('dialog[open], #qrxOv, .drawer.show, .sidebar.mobile-open'))return;
    if(!event.target.matches('.main-content,.view,.main-col,.qd-col,#qrxDash'))return;
    const touch=event.touches[0];
    from={x:touch.clientX,y:touch.clientY,id:touch.identifier};
  },{passive:true});
  document.addEventListener('touchcancel',()=>{from=null;},{passive:true});
  document.addEventListener('touchend',event=>{
    if(!from)return;
    const start=from;
    from=null;
    const touch=[...event.changedTouches].find(item=>item.identifier===start.id);
    if(!touch||event.touches.length)return;
    const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
    if(dx>=70&&dx>2*Math.abs(dy))document.getElementById('menuBtn').click();
  },{passive:true});
})();
