const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const click = id => document.getElementById(id)?.click();
  const pulse = id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
    setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { bubbles:true })), 45);
  };

  const commands = {
    record: () => click('recordTransport'),
    stop: () => click('stop'),
    play: () => click('play'),
    'jog-slow-left': () => pulse('jogSlowLeft'),
    'jog-slow-right': () => pulse('jogSlowRight'),
    'jog-fast-left': () => pulse('jogFastLeft'),
    'jog-fast-right': () => pulse('jogFastRight'),
    cut: () => click('cut'),
    copy: () => click('copy'),
    paste: () => click('paste'),
    delete: () => click('del'),
    undo: () => click('undo'),
    save: () => click('ctxSave'),
    'save-as': () => click('ctxSaveAs'),
    export: () => click('export')
  };

  ipcRenderer.on('stream-deck-command', (_event, command) => {
    const fn = commands[command];
    if (fn) fn();
  });
});
