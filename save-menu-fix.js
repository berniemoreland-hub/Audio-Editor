window.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('ctxSave');
  const saveAsBtn = document.getElementById('ctxSaveAs');
  if (!saveBtn || !saveAsBtn) return;

  saveBtn.onclick = async () => {
    try {
      hideContextMenu();
      const id = contextFileId || activeFileId;
      if (!buffer || !id) {
        $('status').textContent = 'Select a recorded cut first.';
        return;
      }
      const cut = await getCut(id);
      if (!cut) {
        $('status').textContent = 'Could not find that recorded cut.';
        return;
      }
      cut.wav = wavBlob(buffer);
      cut.updatedAt = Date.now();
      cut.duration = buffer.duration;
      await putCut(cut);
      activeFileId = cut.id;
      contextFileId = cut.id;
      $('filename').textContent = cut.name;
      $('activeFile').textContent = cut.name;
      $('status').textContent = 'Saved ' + cut.name + '.';
      await renderShelf();
    } catch (e) {
      console.error(e);
      $('status').textContent = 'SAVE FAILED: ' + (e.message || e);
    }
  };

  saveAsBtn.onclick = async () => {
    try {
      hideContextMenu();
      if (!buffer) {
        $('status').textContent = 'Open or record audio before using Save As.';
        return;
      }
      const sourceId = contextFileId || activeFileId;
      let suggested = $('filename').textContent || await nextName();
      if (sourceId) {
        const sourceCut = await getCut(sourceId);
        if (sourceCut?.name) suggested = sourceCut.name + ' Copy';
      }
      const entered = prompt('Save As', suggested);
      if (entered == null) return;
      const name = entered.trim();
      if (!name) {
        $('status').textContent = 'Save As cancelled: enter a file name.';
        return;
      }
      const id = await addCut({
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        duration: buffer.duration,
        wav: wavBlob(buffer)
      });
      activeFileId = id;
      contextFileId = id;
      $('filename').textContent = name;
      $('activeFile').textContent = name;
      $('status').textContent = 'Saved as ' + name + '.';
      await renderShelf();
    } catch (e) {
      console.error(e);
      $('status').textContent = 'SAVE AS FAILED: ' + (e.message || e);
    }
  };
});
