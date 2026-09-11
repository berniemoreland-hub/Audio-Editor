window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('voxStreamDeckOverlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    #voxDeckToggle{position:fixed;left:8px;bottom:8px;z-index:2147483646;height:30px;padding:0 10px;border:1px solid #4c6758;border-radius:7px;background:#17221c;color:#fff;font:900 10px Arial;cursor:pointer}
    #voxStreamDeckOverlay{position:fixed;left:10px;bottom:46px;z-index:2147483646;width:430px;max-width:calc(100vw - 20px);padding:10px;border:1px solid #405148;border-radius:12px;background:rgba(8,11,9,.96);box-shadow:0 12px 32px rgba(0,0,0,.55);font-family:Segoe UI,Arial,sans-serif;display:none}
    #voxStreamDeckOverlay.show{display:block}
    #voxDeckHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#8df0ad;font-size:11px;font-weight:900;letter-spacing:.06em}
    #voxDeckGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
    .voxDeckKey{aspect-ratio:1/1;min-height:62px;border:1px solid #364139;border-radius:10px;background:#121914;color:#eef5f0;font-size:10px;font-weight:900;line-height:1.15;padding:6px;cursor:pointer;user-select:none;touch-action:none;text-align:center}
    .voxDeckKey:hover,.voxDeckKey.active{background:#203128;border-color:#8df0ad}
    .voxDeckKey.record{background:#5d191f;border-color:#a63d46}
    .voxDeckKey.record:hover{background:#742128}
    #voxDeckClose{border:0;background:transparent;color:#9aaa9e;font-weight:900;cursor:pointer;font-size:14px}
  `;
  document.head.appendChild(style);

  const toggle = document.createElement('button');
  toggle.id = 'voxDeckToggle';
  toggle.type = 'button';
  toggle.textContent = 'STREAM DECK';
  document.body.appendChild(toggle);

  const overlay = document.createElement('div');
  overlay.id = 'voxStreamDeckOverlay';
  overlay.innerHTML = '<div id="voxDeckHead"><span>VOX-BERNIE · 15 KEY DECK</span><button id="voxDeckClose" type="button">✕</button></div><div id="voxDeckGrid"></div>';
  document.body.appendChild(overlay);

  const grid = overlay.querySelector('#voxDeckGrid');
  const keys = [
    ['RECORD','recordTransport','record'], ['STOP','stop'], ['PLAY / PAUSE','play'], ['SLOW\nJOG ◀','jogSlowLeft','hold'], ['SLOW\nJOG ▶','jogSlowRight','hold'],
    ['FAST\nJOG ◀','jogFastLeft','hold'], ['FAST\nJOG ▶','jogFastRight','hold'], ['CUT','cut'], ['COPY','copy'], ['PASTE','paste'],
    ['DELETE','del'], ['UNDO','undo'], ['SAVE','ctxSave'], ['SAVE AS','ctxSaveAs'], ['EXPORT','export']
  ];

  function clickTarget(id){ document.getElementById(id)?.click(); }
  function startHold(button,id){
    const target=document.getElementById(id); if(!target)return;
    button.classList.add('active');
    target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
  }
  function stopHold(button,id){
    const target=document.getElementById(id); button.classList.remove('active');
    target?.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
  }

  keys.forEach(([label,id,type]) => {
    const b=document.createElement('button');
    b.type='button'; b.className='voxDeckKey'+(type==='record'?' record':'');
    b.textContent=label;
    if(type==='hold'){
      b.addEventListener('pointerdown',e=>{e.preventDefault();startHold(b,id)});
      ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,e=>stopHold(b,id)));
    }else b.addEventListener('click',()=>clickTarget(id));
    grid.appendChild(b);
  });

  const savedOpen = localStorage.getItem('voxBernie.streamDeckOpen') === '1';
  if(savedOpen) overlay.classList.add('show');
  const setOpen = open => { overlay.classList.toggle('show',open); localStorage.setItem('voxBernie.streamDeckOpen',open?'1':'0'); };
  toggle.addEventListener('click',()=>setOpen(!overlay.classList.contains('show')));
  overlay.querySelector('#voxDeckClose').addEventListener('click',()=>setOpen(false));
});
