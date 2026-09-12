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
    const version = desktop?.version || '2.0.33';
    const parts = String(version).split('.');
    const build = desktop?.buildNumber || String(parseInt(parts[2] || '33', 10)).padStart(3, '0');
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

  function ensureNameDialog() {
    if ($('voxBernieNameDialog')) return;
    const style = document.createElement('style');
    style.id = 'voxBernieNameDialogStyle';
    style.textContent = `
      #voxBernieNameDialog{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72)}
      #voxBernieNameDialog.show{display:flex}
      #voxBernieNameCard{width:min(460px,90vw);background:#101411;border:1px solid #344038;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.6);padding:16px}
      #voxBernieNameTitle{font-weight:900;font-size:16px;margin-bottom:12px}
      #voxBernieNameInput{width:100%;height:42px;border:1px solid #3a473e;border-radius:8px;background:#080b09;color:#fff;padding:0 11px;font-size:14px;outline:none}
      #voxBernieNameInput:focus{border-color:#49df86;box-shadow:0 0 0 2px rgba(73,223,134,.15)}
      #voxBernieNameActions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
      #voxBernieNameActions button{min-height:38px}
    `;
    document.head.appendChild(style);
    const dialog = document.createElement('div');
    dialog.id = 'voxBernieNameDialog';
    dialog.innerHTML = `<div id="voxBernieNameCard"><div id="voxBernieNameTitle">Save As</div><input id="voxBernieNameInput" type="text" autocomplete="off" spellcheck="false"><div id="voxBernieNameActions"><button id="voxBernieNameCancel" type="button">CANCEL</button><button id="voxBernieNameConfirm" type="button" class="primary">SAVE</button></div></div>`;
    document.body.appendChild(dialog);
  }

  function askForName(title, suggested, confirmLabel='SAVE') {
    ensureNameDialog();
    return new Promise(resolve => {
      const dialog = $('voxBernieNameDialog');
      const input = $('voxBernieNameInput');
      const confirm = $('voxBernieNameConfirm');
      const cancel = $('voxBernieNameCancel');
      $('voxBernieNameTitle').textContent = title;
      confirm.textContent = confirmLabel;
      input.value = suggested || '';
      dialog.classList.add('show');
      setTimeout(() => { input.focus(); input.select(); }, 0);
      let finished = false;
      const finish = value => {
        if (finished) return;
        finished = true;
        dialog.classList.remove('show');
        input.removeEventListener('keydown', onKey);
        confirm.onclick = null;
        cancel.onclick = null;
        resolve(value);
      };
      const onKey = e => {
        if (e.key === 'Enter') { e.preventDefault(); finish(input.value.trim()); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(null); }
      };
      input.addEventListener('keydown', onKey);
      confirm.onclick = () => finish(input.value.trim());
      cancel.onclick = () => finish(null);
      dialog.onclick = e => { if (e.target === dialog) finish(null); };
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

    const originalShowContextMenu = showContextMenu;
    showContextMenu = function(x, y) {
      menu.dataset.cutId = String(contextFileId || activeFileId || '');
      return originalShowContextMenu(x, y);
    };

    const selectedCutId = () => {
      const raw = menu.dataset.cutId;
      if (raw !== undefined && raw !== '') {
        const numeric = Number(raw);
        return Number.isNaN(numeric) ? raw : numeric;
      }
      return contextFileId || activeFileId || null;
    };

    $('ctxSave').onclick = async e => {
      e.preventDefault();
      e.stopPropagation();
      hideContextMenu();
      const id = selectedCutId();
      try {
        if (!buffer || !id) {
          $('status').textContent = 'Select a recorded cut first.';
          return;
        }
        $('status').textContent = 'Saving…';
        const cut = await getCut(id);
        if (!cut) throw new Error('Selected cut could not be found.');
        cut.wav = wavBlob(buffer);
        cut.updatedAt = Date.now();
        cut.duration = buffer.duration;
        await putCut(cut);
        activeFileId = id;
        contextFileId = null;
        menu.dataset.cutId = '';
        $('filename').textContent = cut.name;
        $('activeFile').textContent = cut.name;
        $('status').textContent = 'Saved ' + cut.name + '.';
        await renderShelf();
      } catch (err) {
        console.error('VOX-BERNIE Save failed', err);
        $('status').textContent = 'SAVE FAILED: ' + (err.message || err);
      }
    };

    $('ctxSaveAs').onclick = async e => {
      e.preventDefault();
      e.stopPropagation();
      hideContextMenu();
      try {
        if (!buffer) {
          $('status').textContent = 'Load or record audio first.';
          return;
        }
        const suggested = ($('filename').textContent || await nextName()).trim();
        const name = await askForName('SAVE AS', suggested, 'SAVE AS');
        if (!name) return;
        $('status').textContent = 'Saving new cut…';
        const id = await addCut({
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          duration: buffer.duration,
          wav: wavBlob(buffer)
        });
        activeFileId = id;
        contextFileId = null;
        menu.dataset.cutId = '';
        $('filename').textContent = name;
        $('activeFile').textContent = name;
        $('status').textContent = 'Saved as ' + name + '.';
        await renderShelf();
      } catch (err) {
        console.error('VOX-BERNIE Save As failed', err);
        $('status').textContent = 'SAVE AS FAILED: ' + (err.message || err);
      }
    };

    rename.onclick = async e => {
      e.preventDefault();
      e.stopPropagation();
      hideContextMenu();
      const id = selectedCutId();
      try {
        if (!id) {
          $('status').textContent = 'Select a recorded cut first.';
          return;
        }
        const cut = await getCut(id);
        if (!cut) throw new Error('Selected cut could not be found.');
        const name = await askForName('RENAME', cut.name, 'RENAME');
        if (!name || name === cut.name) return;
        cut.name = name;
        cut.updatedAt = Date.now();
        await putCut(cut);
        if (activeFileId === id) {
          $('filename').textContent = name;
          $('activeFile').textContent = name;
        }
        contextFileId = null;
        menu.dataset.cutId = '';
        $('status').textContent = 'Renamed to ' + name + '.';
        await renderShelf();
      } catch (err) {
        console.error('VOX-BERNIE Rename failed', err);
        $('status').textContent = 'RENAME FAILED: ' + (err.message || err);
      }
    };
  }

  ensureUpdateUI();
  ensureNameDialog();
  ensureFileMenu();
})();
