export function initDesktopHelpers() {
// Electron Click-Through & Focus Healer
// ==========================================
// Instantly restores input focus and typing capability when switching back to the app,
// bypassing the native Chromium click-through activation limits on frameless windows.
window.addEventListener('focus', () => {
  const hoveredInput = document.querySelector('input:hover, textarea:hover');
  if (hoveredInput) {
    hoveredInput.focus();
  }
});

document.addEventListener('pointerdown', (e) => {
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    target.focus();
  }
}, true);


}
