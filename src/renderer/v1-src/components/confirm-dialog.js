/**
 * Styled confirmation dialog (replaces window.confirm).
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-dialog-modal');
    const titleEl = document.getElementById('confirm-dialog-title');
    const messageEl = document.getElementById('confirm-dialog-message');
    const confirmBtn = document.getElementById('confirm-dialog-confirm');
    const cancelBtn = document.getElementById('confirm-dialog-cancel');
    const content = modal?.querySelector('.confirm-modal-content');

    if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
      resolve(window.confirm(message));
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    content?.classList.remove('confirm-modal-content--danger', 'confirm-modal-content--neutral');
    content?.classList.add(variant === 'neutral' ? 'confirm-modal-content--neutral' : 'confirm-modal-content--danger');

    const finish = (result) => {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onConfirm = () => finish(true);
    const onCancel = () => finish(false);
    const onBackdrop = (e) => {
      if (e.target === modal) finish(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);

    requestAnimationFrame(() => modal.classList.add('active'));
  });
}
