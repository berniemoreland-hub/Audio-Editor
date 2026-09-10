const { contextBridge, ipcRenderer } = require('electron');

const versionArg = process.argv.find(arg => arg.startsWith('--bernie-app-version='));
const version = versionArg ? versionArg.split('=')[1] : '0.0.0';
const parts = version.split('.');
const buildNumber = String(parseInt(parts[2] || '0', 10)).padStart(3, '0');

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: process.platform,
  version,
  buildNumber,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: callback => ipcRenderer.on('update-status', (_event, data) => callback(data))
});

window.addEventListener('DOMContentLoaded', () => {
  document.title = `VOX-BERNIE — Build ${buildNumber}`;
  const title = document.querySelector('.title h1');
  if (title) title.textContent = 'VOX-BERNIE';
  const subtitle = document.querySelector('.title p');
  if (subtitle) subtitle.textContent = 'Single-track radio recorder • VoxPro-style editing';
  const logo = document.querySelector('.logo');
  if (logo) logo.textContent = 'VB';
  const footer = document.getElementById('footer');
  if (footer) footer.textContent = `VOX-BERNIE · Version ${parts[0] || '2'}.${parts[1] || '0'} · Build ${buildNumber}`;

  document.querySelectorAll('.card').forEach(card => {
    const heading = card.querySelector('.cardTitle');
    if (heading && heading.textContent.trim().toLowerCase() === 'fast keys') card.remove();
  });
  const lower = document.querySelector('.lower');
  if (lower) lower.style.gridTemplateColumns = '1fr';

  const settingsBody = document.querySelector('.settingsBody');
  if (settingsBody) {
    const wrap = document.createElement('details');
    wrap.id = 'fastKeysManager';
    wrap.style.border = '1px solid #344038';
    wrap.style.borderRadius = '8px';
    wrap.style.padding = '10px';
    wrap.innerHTML = `
      <summary style="cursor:pointer;font-weight:900;letter-spacing:.05em">FAST KEYS</summary>
      <div style="display:grid;gap:9px;margin-top:12px">
        <div class="status">Choose an action and assign a keyboard key. Assignments are saved automatically.</div>
        <select id="fastKeyAction"></select>
        <select id="fastKeyKey"></select>
        <button id="fastKeyAssign" type="button">ASSIGN KEY</button>
        <button id="fastKeyClear" type="button">CLEAR ACTION</button>
        <div id="fastKeyCurrent" class="status"></div>
      </div>`;
    settingsBody.appendChild(wrap);
  }

  const ACTIONS = {
    record: { label: 'Record', run: () => document.getElementById('recordTransport')?.click() },
    play: { label: 'Play / Pause', run: () => document.getElementById('play')?.click() },
    stop: { label: 'Stop', run: () => document.getElementById('stop')?.click() },
    deleteSelection: { label: 'Delete selected audio', run: () => document.getElementById('del')?.click() },
    cut: { label: 'Cut', run: () => document.getElementById('cut')?.click() },
    copy: { label: 'Copy', run: () => document.getElementById('copy')?.click() },
    paste: { label: 'Paste', run: () => document.getElementById('paste')?.click() },
    undo: { label: 'Undo', run: () => document.getElementById('undo')?.click() },
    trim: { label: 'Trim', run: () => document.getElementById('trim')?.click() },
    normalize: { label: 'Normalize', run: () => document.getElementById('normalize')?.click() },
    export: { label: 'Export WAV', run: () => document.getElementById('export')?.click() },
    save: { label: 'Save active cut', run: () => document.getElementById('ctxSave')?.click() },
    saveAs: { label: 'Save As', run: () => document.getElementById('ctxSaveAs')?.click() },
    jogSlowLeft: { label: 'Jog Slow Left', run: () => pulse('jogSlowLeft') },
    jogFastLeft: { label: 'Jog Fast Left', run: () => pulse('jogFastLeft') },
    jogSlowRight: { label: 'Jog Slow Right', run: () => pulse('jogSlowRight') },
    jogFastRight: { label: 'Jog Fast Right', run: () => pulse('jogFastRight') }
  };

  function pulse(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), 35);
  }

  const KEY_OPTIONS = [
    ['Delete','Delete'],['Space','Space'],['Escape','Escape'],['Backspace','Backspace'],
    ['ArrowLeft','Left Arrow'],['ArrowRight','Right Arrow'],['ArrowUp','Up Arrow'],['ArrowDown','Down Arrow'],
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(x => [`Key${x}`,x]),
    ...Array.from({length:12},(_,i)=>[`F${i+1}`,`F${i+1}`])
  ];
  const defaults = {
    record:'KeyR', play:'Space', stop:'Escape', deleteSelection:'Delete',
    jogSlowLeft:'KeyA', jogSlowRight:'KeyL', jogFastLeft:'KeyQ', jogFastRight:'KeyP'
  };
  const FAST_KEYS_KEY = 'voxBernie.fastKeys';
  let bindings;
  try { bindings = Object.assign({}, defaults, JSON.parse(localStorage.getItem(FAST_KEYS_KEY) || '{}')); }
  catch { bindings = { ...defaults }; }

  const actionSel = document.getElementById('fastKeyAction');
  const keySel = document.getElementById('fastKeyKey');
  const current = document.getElementById('fastKeyCurrent');
  if (actionSel && keySel) {
    Object.entries(ACTIONS).forEach(([id,a]) => {
      const o = document.createElement('option'); o.value=id; o.textContent=a.label; actionSel.appendChild(o);
    });
    KEY_OPTIONS.forEach(([code,label]) => {
      const o = document.createElement('option'); o.value=code; o.textContent=label; keySel.appendChild(o);
    });
    const refresh = () => {
      const id = actionSel.value, code = bindings[id] || '';
      if (code && [...keySel.options].some(o => o.value === code)) keySel.value = code;
      if (current) current.textContent = `${ACTIONS[id].label}: ${code || 'Unassigned'}`;
    };
    actionSel.addEventListener('change', refresh);
    document.getElementById('fastKeyAssign')?.addEventListener('click', () => {
      const action = actionSel.value, code = keySel.value;
      const conflict = Object.entries(bindings).find(([a,c]) => c === code && a !== action);
      if (conflict) delete bindings[conflict[0]];
      bindings[action] = code;
      localStorage.setItem(FAST_KEYS_KEY, JSON.stringify(bindings));
      refresh();
    });
    document.getElementById('fastKeyClear')?.addEventListener('click', () => {
      delete bindings[actionSel.value];
      localStorage.setItem(FAST_KEYS_KEY, JSON.stringify(bindings));
      refresh();
    });
    refresh();
  }

  window.addEventListener('keydown', event => {
    const tag = (event.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    const actionId = Object.keys(ACTIONS).find(id => bindings[id] === event.code);
    if (!actionId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    ACTIONS[actionId].run();
  }, true);

  const timeline = document.getElementById('wave')?.parentElement;
  const wave = document.getElementById('wave');
  if (!timeline || !wave) return;

  let zoom = 1;
  const minZoom = 1;
  const maxZoom = 24;
  function baseWidth() { return Math.max(1, timeline.clientWidth); }
  function applyZoom(nextZoom, anchorClientX) {
    const oldWidth = wave.getBoundingClientRect().width || baseWidth();
    const rect = timeline.getBoundingClientRect();
    const anchorX = Math.max(0, Math.min(rect.width, anchorClientX - rect.left));
    const contentX = timeline.scrollLeft + anchorX;
    const ratio = oldWidth > 0 ? contentX / oldWidth : 0;
    zoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
    const newWidth = Math.max(baseWidth(), Math.round(baseWidth() * zoom));
    wave.style.width = newWidth + 'px';
    wave.style.maxWidth = 'none';
    requestAnimationFrame(() => {
      timeline.scrollLeft = Math.max(0, ratio * newWidth - anchorX);
      window.dispatchEvent(new Event('resize'));
    });
  }
  timeline.addEventListener('wheel', event => {
    if (!event.deltaY) return;
    event.preventDefault();
    applyZoom(zoom * (event.deltaY < 0 ? 1.18 : 1 / 1.18), event.clientX);
  }, { passive: false });
  window.addEventListener('resize', () => {
    wave.style.width = zoom <= 1 ? '100%' : Math.max(baseWidth(), Math.round(baseWidth() * zoom)) + 'px';
  });
});
