window.addEventListener('DOMContentLoaded', () => {
  const wave = document.getElementById('wave');
  const timeline = wave?.parentElement;
  if (!wave || !timeline) return;

  const handle = document.createElement('div');
  handle.id = 'waveVerticalResizeHandle';
  handle.title = 'Drag up or down to resize waveform';
  timeline.insertAdjacentElement('afterend', handle);

  const style = document.createElement('style');
  style.textContent = `
    #waveVerticalResizeHandle{
      flex:0 0 8px!important;height:8px!important;min-height:8px!important;width:100%!important;
      cursor:ns-resize!important;position:relative!important;z-index:20!important;
      background:linear-gradient(to bottom,transparent 2px,#405148 3px,#405148 5px,transparent 6px)!important;
      user-select:none!important;touch-action:none!important;
    }
    #waveVerticalResizeHandle:hover{background:linear-gradient(to bottom,transparent 2px,#8df0ad 3px,#8df0ad 5px,transparent 6px)!important}
    body.wave-resizing{cursor:ns-resize!important;user-select:none!important}
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'voxBernie.waveformHeight';
  const MIN_HEIGHT = 70;
  function maxHeight(){
    const app = document.querySelector('.app');
    const available = app?.clientHeight || window.innerHeight;
    return Math.max(MIN_HEIGHT, Math.floor(available * 0.62));
  }
  function setHeight(px, save=true){
    const h = Math.max(MIN_HEIGHT, Math.min(maxHeight(), Math.round(px)));
    timeline.style.setProperty('height', h + 'px', 'important');
    timeline.style.setProperty('min-height', h + 'px', 'important');
    timeline.style.setProperty('flex', '0 0 ' + h + 'px', 'important');
    wave.style.setProperty('height', h + 'px', 'important');
    wave.style.setProperty('min-height', h + 'px', 'important');
    if (save) localStorage.setItem(STORAGE_KEY, String(h));
    window.dispatchEvent(new Event('resize'));
  }

  const saved = parseInt(localStorage.getItem(STORAGE_KEY) || '', 10);
  if (Number.isFinite(saved)) setHeight(saved, false);

  let dragging=false,startY=0,startH=0;
  handle.addEventListener('pointerdown', e => {
    dragging=true;startY=e.clientY;startH=timeline.getBoundingClientRect().height;
    handle.setPointerCapture?.(e.pointerId);document.body.classList.add('wave-resizing');e.preventDefault();
  });
  handle.addEventListener('pointermove', e => {
    if(!dragging)return;setHeight(startH + (e.clientY-startY), false);e.preventDefault();
  });
  const finish = e => {
    if(!dragging)return;dragging=false;document.body.classList.remove('wave-resizing');
    setHeight(timeline.getBoundingClientRect().height, true);
    try{handle.releasePointerCapture?.(e.pointerId)}catch{}
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('dblclick', () => {
    localStorage.removeItem(STORAGE_KEY);
    timeline.style.removeProperty('height');timeline.style.removeProperty('min-height');timeline.style.removeProperty('flex');
    wave.style.removeProperty('height');wave.style.removeProperty('min-height');window.dispatchEvent(new Event('resize'));
  });
  window.addEventListener('resize', () => {
    const h=timeline.getBoundingClientRect().height;
    if(h>maxHeight())setHeight(maxHeight(),false);
  });
});
