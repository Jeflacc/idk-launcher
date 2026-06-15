export function showRenderEngineDialog() {
  return new Promise((resolve) => {
    const modal = document.getElementById("render-engine-modal");
    const sodiumBtn = document.getElementById("render-engine-sodium");
    const vulkanBtn = document.getElementById("render-engine-vulkan");
    const cancelBtn = document.getElementById("render-engine-cancel");
    const dontShowCheckbox = document.getElementById("render-engine-dont-show");

    if (!modal || !sodiumBtn || !vulkanBtn || !cancelBtn || !dontShowCheckbox) {
      resolve(null);
      return;
    }

    dontShowCheckbox.checked = false;

    const finish = (result) => {
      modal.classList.remove("active");
      sodiumBtn.removeEventListener("click", onSodium);
      vulkanBtn.removeEventListener("click", onVulkan);
      cancelBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };

    const onSodium = () => finish({ renderer: "sodium", dontShowAgain: dontShowCheckbox.checked });
    const onVulkan = () => finish({ renderer: "vulkan", dontShowAgain: dontShowCheckbox.checked });
    const onCancel = () => finish(null);
    const onBackdrop = (event) => {
      if (event.target === modal) finish(null);
    };
    const onKey = (event) => {
      if (event.key === "Escape") finish(null);
    };

    sodiumBtn.addEventListener("click", onSodium);
    vulkanBtn.addEventListener("click", onVulkan);
    cancelBtn.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => modal.classList.add("active"));
  });
}
