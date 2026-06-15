export function showListDialog({
  title = "Select",
  message = "Choose an option",
  items = [],
  cancelText = "Cancel",
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("list-dialog-modal");
    const titleEl = document.getElementById("list-dialog-title");
    const messageEl = document.getElementById("list-dialog-message");
    const itemsContainer = document.getElementById("list-dialog-items");
    const cancelBtn = document.getElementById("list-dialog-cancel");

    if (!modal || !titleEl || !messageEl || !itemsContainer || !cancelBtn) {
      resolve(null);
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    cancelBtn.textContent = cancelText;
    itemsContainer.innerHTML = "";

    const finish = (result) => {
      modal.classList.remove("active");
      cancelBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };

    const onCancel = () => finish(null);
    const onBackdrop = (event) => {
      if (event.target === modal) finish(null);
    };
    const onKey = (event) => {
      if (event.key === "Escape") finish(null);
    };

    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "list-dialog-item-btn";
      btn.style.cssText = `
        display: flex;
        align-items: center;
        width: 100%;
        padding: 12px 16px;
        background: rgba(var(--theme-accent-rgb), 0.05);
        border: 1px solid rgba(var(--theme-accent-rgb), 0.2);
        border-radius: 8px;
        color: var(--text-main);
        font-family: var(--font-main);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      `;
      btn.onmouseenter = () => {
        btn.style.background = "rgba(var(--theme-accent-rgb), 0.15)";
        btn.style.borderColor = "rgba(var(--theme-accent-rgb), 0.4)";
      };
      btn.onmouseleave = () => {
        btn.style.background = "rgba(var(--theme-accent-rgb), 0.05)";
        btn.style.borderColor = "rgba(var(--theme-accent-rgb), 0.2)";
      };

      btn.innerHTML = item.icon
        ? `<span style="margin-right: 12px; display: flex; align-items: center;">${item.icon}</span><span>${item.label}</span>`
        : `<span>${item.label}</span>`;

      btn.addEventListener("click", () => {
        finish(item.id);
      });
      itemsContainer.appendChild(btn);
    });

    cancelBtn.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => modal.classList.add("active"));
  });
}
