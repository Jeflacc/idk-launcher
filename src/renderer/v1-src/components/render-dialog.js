export function showRenderEngineDialog() {
  return new Promise((resolve) => {
    const modal = document.getElementById('render-engine-modal');
    const sodiumBtn = document.getElementById('render-engine-sodium');
    const vulkanBtn = document.getElementById('render-engine-vulkan');
    const cancelBtn = document.getElementById('render-engine-cancel');
    const dontShowCheckbox = document.getElementById('render-engine-dont-show');

    if (!modal || !sodiumBtn || !vulkanBtn || !cancelBtn || !dontShowCheckbox) {
      resolve(null);
      return;
    }

    // Reset checkbox state
    dontShowCheckbox.checked = false;

    const finish = (result) => {
      modal.classList.remove('active');
      
      // Cleanup event listeners
      sodiumBtn.removeEventListener('click', onSodium);
      vulkanBtn.removeEventListener('click', onVulkan);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      
      resolve(result);
    };

    const onSodium = () => finish({ renderer: 'sodium', dontShowAgain: dontShowCheckbox.checked });
    const onVulkan = () => finish({ renderer: 'vulkanmod', dontShowAgain: dontShowCheckbox.checked });
    const onCancel = () => finish(null);
    const onBackdrop = (e) => {
      if (e.target === modal) finish(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') finish(null);
    };

    // Attach listeners
    sodiumBtn.addEventListener('click', onSodium);
    vulkanBtn.addEventListener('click', onVulkan);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);

    // Show modal
    requestAnimationFrame(() => modal.classList.add('active'));
  });
}
