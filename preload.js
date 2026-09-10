const { contextBridge } = require('electron');

const versionArg = process.argv.find(arg => arg.startsWith('--bernie-app-version='));
const version = versionArg ? versionArg.split('=')[1] : '0.0.0';
const parts = version.split('.');
const buildNumber = String(parseInt(parts[2] || '0', 10)).padStart(3, '0');
const majorMinor = `${parts[0] || '0'}.${parts[1] || '0'}`;

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: process.platform,
  version,
  buildNumber
});

window.addEventListener('DOMContentLoaded', () => {
  const buildBadge = document.querySelector('.build');
  if (buildBadge) buildBadge.textContent = `VERSION ${majorMinor} · Build ${buildNumber}`;

  const footer = document.querySelector('.footer');
  if (footer) {
    footer.textContent = `Bernie Wave Editor · Version ${majorMinor} · Build ${buildNumber} · Single-track VoxPro-style workflow`;
  }

  document.title = `Bernie Wave Editor — Build ${buildNumber}`;
});
