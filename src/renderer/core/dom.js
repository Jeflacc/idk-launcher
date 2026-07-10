/* ============================================================================
   DOM UTILITIES
   ----------------------------------------------------------------------------
   Shared helpers for safe DOM queries, event binding, and HTML escaping.
   Consolidates patterns duplicated across download-progress.js, error-display.js,
   content-feature.js, game-features-integration.js, and overlay.js.

   Usage:
     import { $, $$, on, escapeHtml } from "../core/dom.js";

     const btn = $("#my-button");              // querySelector
     const tabs = $$(".tab");                  // querySelectorAll → array
     const off = on(btn, "click", handler);    // addEventListener → remover
     const safe = escapeHtml(userInput);       // XSS-safe text
   ============================================================================ */

/**
 * Query a single element by selector. Returns null if not found.
 * Safer than getElementById because it works with any selector and
 * never throws on null.
 *
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {HTMLElement | null}
 */
export function $(selector, scope = document) {
  return scope.querySelector(selector);
}

/**
 * Query all elements matching a selector. Always returns an array
 * (not a NodeList) so .map/.filter/.reduce work without spreading.
 *
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {HTMLElement[]}
 */
export function $$(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Query an element by ID. Returns null if not found.
 * Equivalent to document.getElementById but chainable and consistent
 * with $/$$.
 *
 * @param {string} id
 * @returns {HTMLElement | null}
 */
export function byId(id) {
  return document.getElementById(id);
}

/**
 * Add an event listener and return a removal function.
 * Ensures every listener added with `on()` can be cleaned up —
 * prevents the listener-leak pattern seen in friends-feature.js
 * where enterChat() adds listeners to shared elements on every call.
 *
 * @param {EventTarget} target
 * @param {string} event
 * @param {(event: Event) => void} handler
 * @param {boolean | AddEventListenerOptions} [options]
 * @returns {() => void} Call to remove the listener
 */
export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/**
 * HTML-escape a string for safe innerHTML insertion.
 * This is the canonical escape function — replaces the local
 * _escapeHtml in download-progress.js, escapeHtml alias in
 * game-features-integration.js, and manual .replace() chains in
 * content-feature.js.
 *
 * Delegates to core/safe-parse.js esc() for the actual implementation
 * to maintain backward compatibility.
 *
 * @param {string | null | undefined} str
 * @returns {string}
 */
import { esc } from "./safe-parse.js";
export const escapeHtml = esc;

/**
 * Create a DOM element from an HTML string.
 * The string must be a single root element (no siblings).
 * Returns the firstElementChild.
 *
 * @param {string} html
 * @returns {HTMLElement | null}
 */
export function fromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

/**
 * Wait for an element matching the selector to appear in the DOM.
 * Uses MutationObserver (not polling) for efficiency.
 * Resolves with the element, or null if timeout elapses.
 *
 * Useful for features that need to wait for app-shell.js to render
 * a specific element before binding to it.
 *
 * @param {string} selector
 * @param {number} [timeout=10000]
 * @returns {Promise<HTMLElement | null>}
 */
export function waitForElement(selector, timeout = 10000) {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Dispatch a custom event on document.
 * Centralizes the CustomEvent pattern used by core/views.js and
 * version-feature.js.
 *
 * @param {string} name
 * @param {object} [detail]
 */
export function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}
