/* ============================================================================
   HTML LOADER
   ----------------------------------------------------------------------------
   Loads real HTML files from views/, partials/, and modals/ directories.
   The legacy app-shell.js innerHTML template was deleted at migration end —
   these files are the single source of truth for the entire app DOM.

   Loading order is load-bearing (see loadAppShell): background → top bar →
   views → modals → floating partials. Features query these elements right
   after loadAppShell() resolves, so every file must load before init.
   ============================================================================ */

/**
 * Load an HTML partial into a container element.
 * Uses fetch() + DOMParser (not innerHTML) so scripts in the partial
 * are not executed and the DOM is properly parsed.
 *
 * @param {string} containerSelector - CSS selector for the target container
 * @param {string} partialPath - relative path to the HTML file
 * @param {{ append?: boolean }} [options] - append:true appends to the
 *   container (shell loading); default replaces the container contents
 * @returns {Promise<boolean>} true when the partial was loaded and inserted
 */
export async function loadPartial(containerSelector, partialPath, options = {}) {
  const { append = false } = options;
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.warn(`[html-loader] Container not found: ${containerSelector}`);
    return false;
  }
  try {
    const response = await fetch(partialPath);
    if (!response.ok) {
      console.warn(`[html-loader] Failed to load ${partialPath}: ${response.status}`);
      return false;
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (append) {
      container.append(...doc.body.childNodes);
    } else {
      container.replaceChildren(...doc.body.childNodes);
    }
    return true;
  } catch (err) {
    console.warn(`[html-loader] Error loading ${partialPath}:`, err);
    return false;
  }
}

/**
 * Every HTML file the app shell is built from, in load order.
 *
 * [containerSelector, relativePath]
 *
 * Order matters:
 *  1. background layers (lowest z-index, painted first)
 *  2. top bar (highest z-index, should come before views in tab order)
 *  3. views (one per navigation tab)
 *  4. modals (fixed-position, DOM order only affects same-z-index stacking)
 *  5. floating partials (chat panel, error modal, toast, error display,
 *     download progress) — loaded last so they sit on top
 */
const SHELL_FILES = [
  ["#background-layer", "partials/background.html"],
  ["#top-bar-container", "partials/top-bar.html"],
  ["#views-root", "views/login.html"],
  ["#views-root", "views/main.html"],
  ["#views-root", "views/settings.html"],
  ["#views-root", "views/mods.html"],
  ["#views-root", "views/profile.html"],
  ["#views-root", "views/idk-connect.html"],
  ["#modals-root", "modals/confirm.html"],
  ["#modals-root", "modals/list-dialog.html"],
  ["#modals-root", "modals/delete-modpack.html"],
  ["#modals-root", "modals/render-engine.html"],
  ["#modals-root", "modals/create-modpack.html"],
  ["#modals-root", "modals/modpack-settings.html"],
  ["#modals-root", "modals/all-versions.html"],
  ["#modals-root", "modals/launch-overlay.html"],
  ["#modals-root", "modals/update.html"],
  ["#modals-root", "modals/mod-updates.html"],
  ["#modals-root", "modals/changelog.html"],
  ["#modals-root", "modals/crash-analyzer.html"],
  ["#modals-root", "modals/dependencies.html"],
  ["#modals-root", "modals/download-confirm.html"],
  ["#modals-root", "modals/download-detail.html"],
  ["#modals-root", "modals/missing-deps.html"],
  ["#chat-root", "partials/chat-panel.html"],
  ["#modals-root", "partials/error-modal.html"],
  ["#modals-root", "partials/warning-toast.html"],
  ["#modals-root", "partials/error-display.html"],
  ["#modals-root", "partials/download-progress.html"],
];

/**
 * Load all partials for the app shell on startup.
 * Called by main.js after settings migration, before feature init.
 *
 * In development, the HTML files are served by Vite from the renderer root.
 * In production, they're copied to dist-renderer by the vite copy plugin.
 *
 * @returns {Promise<boolean>} true when every file loaded and was inserted
 */
export async function loadAppShell() {
  const results = [];
  for (const [selector, path] of SHELL_FILES) {
    results.push(await loadPartial(selector, path, { append: true }));
  }
  const ok = results.every(Boolean);
  if (!ok) {
    console.error(
      `[html-loader] Shell incomplete (${results.filter(Boolean).length}/${SHELL_FILES.length} files) — the app will be broken`,
    );
  }
  return ok;
}

/**
 * Load a <template> element by ID and return a factory that clones it
 * with named element references. The template must define data-ref
 * attributes on elements you want to access.
 *
 * HTML:
 *   <template id="modpack-item-template">
 *     <div class="modpack-item" data-ref="root">
 *       <img class="mp-item-icon" data-ref="icon" alt="">
 *       <div class="mp-item-info">
 *         <div class="mp-item-name" data-ref="name"></div>
 *         <div class="mp-item-count" data-ref="count"></div>
 *       </div>
 *     </div>
 *   </template>
 *
 * JS:
 *   const tpl = loadTemplate("modpack-item-template");
 *   const node = tpl.clone();
 *   node.name.textContent = mp.name;
 */
export function loadTemplate(templateId) {
  const template = document.getElementById(templateId);
  if (!template || template.tagName !== "TEMPLATE") {
    console.warn(`[html-loader] Template not found: ${templateId}`);
    return null;
  }
  return {
    clone() {
      const fragment = template.content.cloneNode(true);
      const refs = {};
      fragment.querySelectorAll("[data-ref]").forEach((el) => {
        refs[el.dataset.ref] = el;
      });
      const rootEl = fragment.firstElementChild;
      if (rootEl?.hasAttribute("data-ref")) {
        refs[rootEl.dataset.ref] = rootEl;
      }
      return { ...refs, root: rootEl };
    },
  };
}
