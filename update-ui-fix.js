window.addEventListener('DOMContentLoaded', () => {
  const desktop = window.desktopApp;
  const version = desktop?.version || '2.0.27';
  const parts = String(version).split('.');
  const build = desktop?.buildNumber || String(parseInt(parts[2] || '27', 10)).padStart(3, '0');

  let panel = document.getElementById('voxBernieUpdatePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'voxBernieUpdatePanel';
    panel.innerHTML = '<div id="voxBernieVersionLabel"></div><button id="voxBernieUpdateButton" type="button">CHECK UPDATE</button>';
    document.body.appendChild(panel);
  }

  const style = document.createElement('style');
  style.textContent = `
    #voxBernieUpdatePanel{
      position:fixed!important;top:8px!important;right:8px!important;z-index:2147483647!important;
      display:flex!important;align-items:center!important;gap:8px!important;
      padding:5px 7px!important;border:1px solid #344038!important;border-radius:8px!important;
      background:#0b0f0d!important;box-shadow:0 2px 12px rgba(0,0,0,.45)!important;
      font-family:Arial,sans-serif!important;
    }
    #voxBernieVersionLabel{color:#8df0ad!important;font-size:11px!important;font-weight:900!important;white-space:nowrap!important;letter-spacing:.04em!important}
    #voxBernieUpdateButton{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;
      height:30px!important;min-width:112px!important;padding:0 10px!important;border:1px solid #4c6758!important;border-radius:6px!important;
      background:#17221c!important;color:#fff!important;font-size:10px!important;font-weight:900!important;cursor:pointer!important}
    #voxBernieUpdateButton:hover{background:#213128!important}
  `;
  document.head.appendChild(style);

  const label = document.getElementById('voxBernieVersionLabel');
  const button = document.getElementById('voxBernieUpdateButton');
  label.textContent = `VERSION ${version} · BUILD ${build}`;

  const oldLabel = document.getElementById('buildLabel');
  if (oldLabel) oldLabel.textContent = `VERSION ${version} · BUILD ${build}`;

  const footer = document.getElementById('footer');
  if (footer) footer.textContent = `VOX-BERNIE · VERSION ${version} · BUILD ${build}`;

  async function checkUpdate() {
    if (!desktop?.checkForUpdates) {
      button.textContent = 'UPDATE UNAVAILABLE';
      return;
    }
    button.disabled = true;
    button.textContent = 'CHECKING…';
    try {
      const result = await desktop.checkForUpdates();
      if (result?.state === 'current') button.textContent = 'UP TO DATE';
      else if (result?.state === 'downloading') button.textContent = `GETTING ${result.version || ''}`.trim();
      else if (result?.state === 'error') button.textContent = 'UPDATE FAILED';
      else button.textContent = 'CHECK UPDATE';
    } catch (e) {
      console.error(e);
      button.textContent = 'UPDATE FAILED';
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', checkUpdate);

  desktop?.onUpdateStatus?.(data => {
    if (!data) return;
    if (data.state === 'downloading') button.textContent = `GETTING ${data.version || ''}`.trim();
    else if (data.state === 'progress') button.textContent = `UPDATE ${Math.round(data.percent || 0)}%`;
    else if (data.state === 'ready') button.textContent = 'RESTART TO UPDATE';
    else if (data.state === 'current') button.textContent = 'UP TO DATE';
    else if (data.state === 'error') button.textContent = 'UPDATE FAILED';
  });
});
