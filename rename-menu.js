window.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('fileContextMenu');
  const deleteBtn = document.getElementById('ctxDelete');
  if (!menu || !deleteBtn || document.getElementById('ctxRename')) return;

  const renameBtn = document.createElement('button');
  renameBtn.id = 'ctxRename';
  renameBtn.type = 'button';
  renameBtn.textContent = 'RENAME';
  menu.insertBefore(renameBtn, deleteBtn);

  const openCutsDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('BernieWaveEditorFiles', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  renameBtn.addEventListener('click', async () => {
    menu.classList.remove('show');
    const target = document.querySelector('.fileItem.active');
    const status = document.getElementById('status');
    if (!target) {
      if (status) status.textContent = 'Select a recorded cut first.';
      return;
    }

    const oldName = target.textContent.trim();
    const requested = prompt('Rename cut', oldName);
    const newName = requested?.trim();
    if (!newName || newName === oldName) return;

    try {
      const db = await openCutsDb();
      const tx = db.transaction('cuts', 'readwrite');
      const store = tx.objectStore('cuts');
      const allReq = store.getAll();
      const cuts = await new Promise((resolve, reject) => {
        allReq.onsuccess = () => resolve(allReq.result || []);
        allReq.onerror = () => reject(allReq.error);
      });
      const cut = cuts.find(c => c.name === oldName);
      if (!cut) throw new Error('Cut not found');
      cut.name = newName;
      cut.updatedAt = Date.now();
      store.put(cut);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Rename aborted'));
      });
      db.close();

      target.textContent = newName;
      target.title = newName;
      const filename = document.getElementById('filename');
      const activeFile = document.getElementById('activeFile');
      if (filename && filename.textContent.trim() === oldName) filename.textContent = newName;
      if (activeFile) activeFile.textContent = newName;
      if (status) status.textContent = 'Renamed to ' + newName + '.';
    } catch (e) {
      console.error(e);
      if (status) status.textContent = 'RENAME FAILED: ' + (e.message || e);
    }
  });
});
