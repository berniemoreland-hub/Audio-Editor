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
  const timeline = document.getElementById('wave')?.parentElement;
  const wave = document.getElementById('wave');
  if (!timeline || !wave) return;

  let zoom = 1;
  const minZoom = 1;
  const maxZoom = 24;

  function baseWidth() {
    return Math.max(1, timeline.clientWidth);
  }

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
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    applyZoom(zoom * factor, event.clientX);
  }, { passive: false });

  window.addEventListener('resize', () => {
    if (zoom <= 1) {
      wave.style.width = '100%';
      return;
    }
    wave.style.width = Math.max(baseWidth(), Math.round(baseWidth() * zoom)) + 'px';
  });
});
