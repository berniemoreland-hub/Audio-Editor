const { contextBridge, ipcRenderer } = require('electron');

const versionArg = process.argv.find(arg => arg.startsWith('--bernie-app-version='));
const version = versionArg ? versionArg.split('=')[1] : '0.0.0';
const parts = version.split('.');
const buildNumber = String(parseInt(parts[2] || '0', 10)).padStart(3, '0');
const majorMinor = `${parts[0] || '0'}.${parts[1] || '0'}`;

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: process.platform,
  version,
  buildNumber,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: callback => ipcRenderer.on('update-status', (_event, data) => callback(data))
});

window.addEventListener('DOMContentLoaded', () => {
  const buildBadge = document.querySelector('.build');
  if (buildBadge) buildBadge.textContent = `VERSION ${majorMinor} · Build ${buildNumber}`;

  const footer = document.querySelector('.footer');
  if (footer) {
    footer.textContent = `Bernie Wave Editor · Version ${majorMinor} · Build ${buildNumber} · Single-track VoxPro-style workflow`;
  }

  document.title = `Bernie Wave Editor — Build ${buildNumber}`;

  if (buildBadge) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    buildBadge.parentNode.insertBefore(wrap, buildBadge);
    wrap.appendChild(buildBadge);

    const updateButton = document.createElement('button');
    updateButton.id = 'updateAppBtn';
    updateButton.type = 'button';
    updateButton.textContent = 'UPDATE';
    updateButton.title = 'Check for a newer Bernie Wave Editor version';
    updateButton.style.minHeight = '34px';
    updateButton.style.padding = '0 12px';
    updateButton.style.borderRadius = '999px';
    updateButton.style.fontSize = '11px';
    updateButton.style.fontWeight = '900';
    updateButton.style.letterSpacing = '.06em';
    wrap.appendChild(updateButton);

    const setButton = (text, disabled = false) => {
      updateButton.textContent = text;
      updateButton.disabled = disabled;
    };

    updateButton.addEventListener('click', async () => {
      setButton('CHECKING…', true);
      try {
        const result = await ipcRenderer.invoke('check-for-updates');
        if (!result?.ok) {
          setButton('UPDATE');
          window.setTimeout(() => setButton('UPDATE'), 2200);
          return;
        }
        if (result.state === 'current') {
          setButton('UP TO DATE');
          window.setTimeout(() => setButton('UPDATE'), 2200);
        } else {
          setButton('DOWNLOADING…', true);
        }
      } catch {
        setButton('UPDATE');
      }
    });

    ipcRenderer.on('update-status', (_event, data) => {
      if (!data) return;
      if (data.state === 'downloading') setButton(`GETTING ${data.version}…`, true);
      else if (data.state === 'progress') setButton(`UPDATE ${data.percent}%`, true);
      else if (data.state === 'ready') setButton('RESTART TO UPDATE');
      else if (data.state === 'current') {
        setButton('UP TO DATE');
        window.setTimeout(() => setButton('UPDATE'), 2200);
      } else if (data.state === 'error') {
        setButton('UPDATE FAILED');
        window.setTimeout(() => setButton('UPDATE'), 2500);
      }
    });
  }
});
