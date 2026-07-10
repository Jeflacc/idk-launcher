/* ============================================================================
   HTML LOADER
   ----------------------------------------------------------------------------
   Replaces the 2,206-line app-shell.js innerHTML template with a system that
   loads real HTML files from views/, partials/, and modals/ directories.

   The renderer becomes HTML-first: static HTML files define the structure,
   and JS modules only query + update specific elements.
   ============================================================================ */

/**
 * Load an HTML partial into a container element.
 * Uses fetch() + DOMParser (not innerHTML) so scripts in the partial
 * are not executed and the DOM is properly parsed.
 *
 * @param {string} containerSelector - CSS selector for the target container
 * @param {string} partialPath - relative path to the HTML file
 */
export async function loadPartial(containerSelector, partialPath) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.warn(`[html-loader] Container not found: ${containerSelector}`);
    return;
  }
  try {
    const response = await fetch(partialPath);
    if (!response.ok) {
      console.warn(`[html-loader] Failed to load ${partialPath}: ${response.status}`);
      return;
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    container.replaceChildren(...doc.body.childNodes);
  } catch (err) {
    console.warn(`[html-loader] Error loading ${partialPath}:`, err);
  }
}

/**
 * Load all partials for the app shell on startup.
 * Called by main.js after settings migration, before feature init.
 *
 * In development, the HTML files are served by Vite from the renderer root.
 * In production, they're bundled into the dist-renderer directory.
 */
export async function loadAppShell() {
  await Promise.all([
    loadPartial("#background-layer", "partials/background.html"),
    loadPartial("#top-bar-container", "partials/top-bar.html"),
    loadPartial("#view-login", "views/login.html"),
    loadPartial("#view-main", "views/main.html"),
    loadPartial("#view-mods", "views/mods.html"),
    loadPartial("#view-settings", "views/settings.html"),
    loadPartial("#view-profile", "views/profile.html"),
    loadPartial("#view-idk-connect", "views/idk-connect.html"),
  ]);
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
