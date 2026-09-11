window.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('fileContextMenu');
  const deleteBtn = document.getElementById('ctxDelete');
  if (!menu || !deleteBtn || document.getElementById('ctxRename')) return;

  const renameBtn = document.createElement('button');
  renameBtn.id = 'ctxRename';
  renameBtn.type = 'button';
  renameBtn.textContent = 'RENAME';
  menu.insertBefore(renameBtn, deleteBtn);

  renameBtn.addEventListener('click', async () => {
    // Run in the page context so the existing IndexedDB cut functions/state remain authoritative.
    const target = document.querySelector('.fileItem.active');
    if (!target) {
      document.getElementById('status').textContent = 'Select a recorded cut first.';
      menu.classList.remove('show');
      return;
    }
    target.dispatchEvent(new CustomEvent('vox-rename-request', { bubbles: true }));
    menu.classList.remove('show');
  });
});
