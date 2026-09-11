(() => {
  const $ = id => document.getElementById(id);

  function ensureUpdateUI() {
    let panel = $('voxBernieUpdatePanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'voxBernieUpdatePanel';
      panel.innerHTML = '<div id="voxBernieVersionLabel"></div><button id="voxBernieUpdateButton" type="button">CHECK UPDATE</button>';
      document.body.appendChild(panel);
    }
    if (!$('voxBernieUpdateStyle')) {
      const style = document.createElement('style');
      style.id = 'voxBernieUpdateStyle';
      style.textContent = `
        #voxBernieUpdatePanel{position:fixed!important;top:8px!important;right:8px!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:8px!important;padding:5px 7px!important;border:1px solid #344038!important;border-radius:8px!important;background:#0b0f0d!important;box-shadow:0 2px 12px rgba(0,0,0,.45)!important;font-family:Arial,sans-serif!important}
        #voxBernieVersionLabel{color:#8df0ad!important;font-size:11px!important;font-weight:900!important;white-space:nowrap!important;letter-spacing:.04em!important}
        #voxBernieUpdateButton{display:block!important;visibility:visible!important;opacity:1!important;height:30px!important;min-width:112px!important;padding:0 10px!important;border:1px solid #4c6758!important;border-radius:6px!important;background:#17221c!important;color:#fff!important;font-size:10px!important;font-weight:900!important;cursor:pointer!important}
        #voxBernieUpdateButton:hover{background:#213128!important}
      `;
      document.head.appendChild(style);
    }

    const desktop = window.desktopApp;
    const version = desktop?.version || '2.0.30';
    const parts = String(version).split('.');
    const build = desktop?.buildNumber || String(parseInt(parts[2] || '30', 10)).padStart(3, '0');
    $('voxBernieVersionLabel').textContent = `VERSION ${version} · BUILD ${build}`;
    if ($('buildLabel')) $('buildLabel').textContent = `VERSION ${version} · BUILD ${build}`;
    if ($('footer')) $('footer').textContent = `VOX-BERNIE · VERSION ${version} · BUILD ${build}`;

    const button = $('voxBernieUpdateButton');
    let updateReady = false;
    button.onclick = async () => {
      if (!desktop) {
        button.textContent = 'UPDATE UNAVAILABLE';
        return;
      }
      if (updateReady && desktop.installUpdate) {
        button.textContent = 'RESTARTING…';
        await desktop.installUpdate();
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
    };

    desktop?.onUpdateStatus?.(data => {
      if (!data) return;
      if (data.state === 'downloading') button.textContent = `GETTING ${data.version || ''}`.trim();
      else if (data.state === 'progress') button.textContent = `UPDATE ${Math.round(data.percent || 0)}%`;
      else if (data.state === 'ready') { updateReady = true; button.textContent = 'RESTART TO UPDATE'; button.disabled = false; }
      else if (data.state === 'current') { updateReady = false; button.textContent = 'UP TO DATE'; button.disabled = false; }
      else if (data.state === 'error') { button.textContent = 'UPDATE FAILED'; button.disabled = false; }
    });
  }

  function ensureFileMenu() {
    const menu = $('fileContextMenu');
    if (!menu) return;

    let rename = $('ctxRename');
    if (!rename) {
      rename = document.createElement('button');
      rename.id = 'ctxRename';
      rename.textContent = 'RENAME';
      menu.insertBefore(rename, $('ctxDelete'));
    }

    $('ctxSave').onclick = async () => {
      hideContextMenu();
      try {
        const id = contextFileId || activeFileId;
        if (!buffer || !id) return $('status').textContent = 'Select a recorded cut first.';
        const cut = await getCut(id);
        if (!cut) return $('status').textContent = 'Could not find that recorded cut.';
        cut.wav = wavBlob(buffer);
        cut.updatedAt = Date.now();
        cut.duration = buffer.duration;
        await putCut(cut);
        activeFileId = id;
        $('filename').textContent = cut.name;
        $('activeFile').textContent = cut.name;
        $('status').textContent = 'Saved ' + cut.name + '.';
        contextFileId = null;
        await renderShelf();
      } catch (e) {
        console.error(e);
        $('status').textContent = 'SAVE FAILED: ' + (e.message || e);
      }
    };

    $('ctxSaveAs').onclick = async () => {
      hideContextMenu();
      try {
        if (!buffer) return $('status').textContent = 'Load or record audio first.';
        const suggested = $('filename').textContent || await nextName();
        const entered = prompt('Save As', suggested);
        const name = entered?.trim();
        if (!name) return;
        const id = await addCut({name, createdAt:Date.now(), updatedAt:Date.now(), duration:buffer.duration, wav:wavBlob(buffer)});
        activeFileId = id;
        contextFileId = null;
        $('filename').textContent = name;
        $('activeFile').textContent = name;
        $('status').textContent = 'Saved as ' + name + '.';
        await renderShelf();
      } catch (e) {
        console.error(e);
        $('status').textContent = 'SAVE AS FAILED: ' + (e.message || e);
      }
    };

    rename.onclick = async () => {
      hideContextMenu();
      try {
        const id = contextFileId || activeFileId;
        if (!id) return $('status').textContent = 'Select a recorded cut first.';
        const cut = await getCut(id);
        if (!cut) return $('status').textContent = 'Could not find that recorded cut.';
        const entered = prompt('Rename', cut.name);
        const name = entered?.trim();
        if (!name || name === cut.name) { contextFileId = null; return; }
        cut.name = name;
        cut.updatedAt = Date.now();
        await putCut(cut);
        if (activeFileId === id) {
          $('filename').textContent = name;
          $('activeFile').textContent = name;
        }
        $('status').textContent = 'Renamed to ' + name + '.';
        contextFileId = null;
        await renderShelf();
      } catch (e) {
        console.error(e);
        $('status').textContent = 'RENAME FAILED: ' + (e.message || e);
      }
    };
  }

  ensureUpdateUI();
  ensureFileMenu();
})();
