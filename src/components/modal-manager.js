/**
 * Modal Manager — shared Escape/backdrop handling + ARIA wiring for all
 * launcher modals. Self-initializing side-effect module.
 *
 * Contract:
 * - Any element with `[data-modal]` becomes a managed modal.
 * - Pressing Escape while a managed modal is `.active` dispatches a
 *   `modal-close-request` event on the modal element (cancelable).
 *   If `preventDefault` is NOT called, the modal is closed by removing
 *   the `.active` class and any inline `style.display` override.
 * - Clicking the backdrop (the modal element itself) while `.active`
 *   triggers the same flow UNLESS the modal has `[data-modal-noncloseable]`.
 * - ARIA `role="dialog"` and `aria-modal="true"` are applied automatically
 *   the first time a managed modal becomes active.
 */

const MANAGED = new WeakSet();
const ATTR = 'data-modal';

function applyAria(modal) {
  if (modal.getAttribute('role') !== 'dialog') modal.setAttribute('role', 'dialog');
  if (modal.getAttribute('aria-modal') !== 'true') modal.setAttribute('aria-modal', 'true');
  // Wire aria-labelledby if a heading child exists with an id
  if (!modal.getAttribute('aria-labelledby')) {
    const heading = modal.querySelector('h3, h2, .modal-title, [data-modal-title]');
    if (heading && heading.id) modal.setAttribute('aria-labelledby', heading.id);
  }
}

function requestClose(modal) {
  if (modal.hasAttribute('data-modal-noncloseable')) return;
  const evt = new CustomEvent('modal-close-request', { bubbles: true, cancelable: true });
  modal.dispatchEvent(evt);
  if (evt.defaultPrevented) return;
  modal.classList.remove('active');
  // Also clear inline display override (some modals use style.display='flex' on open)
  if (modal.style.display === 'flex' || modal.style.display === 'block') {
    modal.style.display = '';
  }
}

function isModalActive(modal) {
  return modal.classList.contains('active');
}

function manage(modal) {
  if (MANAGED.has(modal)) return;
  MANAGED.add(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal && isModalActive(modal)) requestClose(modal);
  });
}

function scan() {
  document.querySelectorAll(`[${ATTR}]`).forEach(manage);
}

let observer = null;

function init() {
  if (typeof document === 'undefined') return;
  scan();

  // Watch for dynamically-added modals
  observer = new MutationObserver(() => scan());
  observer.observe(document.body, { childList: true, subtree: true });

  // Global Escape handler — close the topmost active managed modal.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const activeModals = Array.from(document.querySelectorAll(`[${ATTR}].active`));
    if (activeModals.length === 0) return;
    // Close the last one (topmost in DOM order)
    requestClose(activeModals[activeModals.length - 1]);
  });

  // Apply ARIA when any managed modal becomes active
  const ariaObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'class' && m.target.classList?.contains('active')) {
        applyAria(m.target);
      }
    }
  });
  ariaObserver.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class'],
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export { init as initModalManager };
