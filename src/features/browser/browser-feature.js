/**
 * Shared Browser Module
 *
 * Provides a reusable browser panel with:
 * - Two-column layout (content + filter sidebar)
 * - Multiple provider support
 * - Faceted filtering (category, loader, version, sort)
 * - Paginated results
 * - Custom card rendering
 *
 * Usage:
 *   import { createBrowser } from "../browser/browser-feature.js";
 *   const browser = createBrowser({ ...config });
 *   browser.open();
 */

export function createBrowser(config) {
  const {
    container = "#mod-browser",
    mode = "mod",
    providers = [],
    filters = [],
    renderCard = null,
    onAdd = null,
    getContext = null,
  } = config;

  const state = {
    currentProvider: providers[0]?.id || "modrinth",
    currentPage: 0,
    currentQuery: "",
    totalResults: 0,
    filterValues: {},
    results: [],
    isOpen: false,
    isLoading: false,
  };

  let destroyHandlers = [];

  function getEl(id) {
    const root = document.querySelector(container);
    return root ? root.querySelector("#" + id) : document.getElementById(id);
  }

  function init() {
    const browserEl = document.querySelector(container);
    if (!browserEl) return;
    buildFilters();
    bindEvents();
  }

  function buildFilters() {
    filters.forEach((f) => {
      if (f.type === "pill") {
        const el = getEl("filter-" + f.id);
        if (!el) return;
        const opts = typeof f.options === "function" ? f.options(mode) : f.options;
        const items = opts || [];
        el.innerHTML = items
          .map(
            (o) =>
              `<button class="browser-filter-pill${o === f.default ? " active" : ""}" data-filter-${f.id}="${o}">${o === "all" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}</button>`,
          )
          .join("");
        state.filterValues[f.id] = f.default || "all";
      } else if (f.type === "select") {
        const el = getEl("filter-" + f.id);
        if (!el) return;
        const opts = typeof f.options === "function" ? f.options(mode) : f.options;
        const items = opts || [];
        el.innerHTML = items
          .map((o) => `<option value="${o.value}">${o.label}</option>`)
          .join("");
        el.value = f.default || items[0]?.value || "";
        state.filterValues[f.id] = el.value;
      }
    });
    // Clear button
    const clearBtn = getEl("btn-clear-filters");
    if (clearBtn) {
      const handler = () => resetFilters();
      clearBtn.addEventListener("click", handler);
      destroyHandlers.push(() => clearBtn.removeEventListener("click", handler));
    }
  }

  function bindEvents() {
    // Pill filters - delegate from parent containers
    const catContainer = getEl("filter-category");
    if (catContainer) {
      const handler = (e) => {
        const pill = e.target.closest(".browser-filter-pill");
        if (!pill) return;
        const val = pill.dataset.filterCategory;
        if (!val) return;
        catContainer.querySelectorAll(".browser-filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.filterValues.category = val;
        search(state.currentQuery, 0);
      };
      catContainer.addEventListener("click", handler);
      destroyHandlers.push(() => catContainer.removeEventListener("click", handler));
    }

    const loaderContainer = getEl("filter-loader");
    if (loaderContainer) {
      const handler = (e) => {
        const pill = e.target.closest(".browser-filter-pill");
        if (!pill) return;
        const val = pill.dataset.filterLoader;
        if (!val) return;
        loaderContainer.querySelectorAll(".browser-filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.filterValues.loader = val;
        search(state.currentQuery, 0);
      };
      loaderContainer.addEventListener("click", handler);
      destroyHandlers.push(() => loaderContainer.removeEventListener("click", handler));
    }

    // Select filters
    const sortEl = getEl("filter-sort");
    if (sortEl) {
      const handler = () => {
        state.filterValues.sort = sortEl.value;
        search(state.currentQuery, 0);
      };
      sortEl.addEventListener("change", handler);
      destroyHandlers.push(() => sortEl.removeEventListener("change", handler));
    }

    const versionEl = getEl("filter-version");
    if (versionEl) {
      const handler = () => {
        state.filterValues.version = versionEl.value;
        search(state.currentQuery, 0);
      };
      versionEl.addEventListener("change", handler);
      destroyHandlers.push(() => versionEl.removeEventListener("change", handler));
    }

    // Search input
    const searchInput = getEl("mod-search");
    if (searchInput) {
      let timeout;
      const handler = (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => search(e.target.value, 0), 400);
      };
      searchInput.addEventListener("input", handler);
      destroyHandlers.push(() => searchInput.removeEventListener("input", handler));
    }

    // Provider pills
    document.querySelectorAll(`${container} .provider-pill`).forEach((pill) => {
      const handler = () => {
        document.querySelectorAll(`${container} .provider-pill`).forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.currentProvider = pill.dataset.provider;
        search(state.currentQuery, 0);
      };
      pill.addEventListener("click", handler);
      destroyHandlers.push(() => pill.removeEventListener("click", handler));
    });

    // Close button
    const closeBtn = getEl("btn-close-browser");
    if (closeBtn) {
      const handler = () => close();
      closeBtn.addEventListener("click", handler);
      destroyHandlers.push(() => closeBtn.removeEventListener("click", handler));
    }
  }

  function resetFilters() {
    state.filterValues = {};
    filters.forEach((f) => {
      state.filterValues[f.id] = f.default || (f.type === "select" ? "" : "all");
    });
    // Reset UI
    document.querySelectorAll(`${container} .browser-filter-pill`).forEach((p) => p.classList.remove("active"));
    filters.forEach((f) => {
      if (f.type === "pill") {
        const first = document.querySelector(`${container} [data-filter-${f.id}="${f.default || "all"}"]`);
        if (first) first.classList.add("active");
      } else if (f.type === "select") {
        const el = getEl("filter-" + f.id);
        if (el) el.value = f.default || "";
      }
    });
    search(state.currentQuery, 0);
  }

  async function search(query, page) {
    state.currentQuery = query;
    state.currentPage = page;
    state.isLoading = true;

    const resultsEl = getEl("mod-browser-results");
    if (!resultsEl) return;

    resultsEl.innerHTML = `<div class="mp-loading"><div class="launch-spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div>Searching ${state.currentProvider === "modrinth" ? "Modrinth" : "CurseForge"}...</div>`;

    const provider = providers.find((p) => p.id === state.currentProvider);
    if (!provider || !provider.search) {
      resultsEl.innerHTML = `<div class="mp-loading">No search provider configured</div>`;
      state.isLoading = false;
      return;
    }

    try {
      const ctx = typeof getContext === "function" ? getContext() : {};
      const result = await provider.search(query, state.filterValues, page, ctx);
      state.totalResults = result.total || 0;
      renderResults(result.hits || [], resultsEl, ctx);
    } catch (err) {
      resultsEl.innerHTML = `<div class="mp-loading" style="color:red;font-size:12px;">Search error: ${err.message}</div>`;
    }

    state.isLoading = false;
  }

  function renderResults(hits, resultsEl, ctx) {
    resultsEl.innerHTML = "";
    if (!hits.length) {
      resultsEl.innerHTML = `<div class="mp-loading">No results found for "${state.currentQuery || "..."}"</div>`;
      return;
    }

    const pageSize = 20;
    const totalPages = Math.ceil(state.totalResults / pageSize);
    const currentPage = state.currentPage + 1;

    // Pagination in search bar
    const paginationContainer = getEl("pagination-controls");
    if (paginationContainer) {
      paginationContainer.innerHTML = "";
      if (totalPages > 1) {
        if (state.currentPage > 0) {
          const prevBtn = document.createElement("button");
          prevBtn.textContent = "\u2190";
          prevBtn.className = "browser-page-btn";
          prevBtn.addEventListener("click", () => search(state.currentQuery, state.currentPage - 1));
          paginationContainer.appendChild(prevBtn);
        }
        const info = document.createElement("span");
        info.textContent = `${currentPage}/${totalPages}`;
        info.className = "browser-page-info";
        paginationContainer.appendChild(info);
        if (currentPage < totalPages) {
          const nextBtn = document.createElement("button");
          nextBtn.textContent = "\u2192";
          nextBtn.className = "browser-page-btn";
          nextBtn.addEventListener("click", () => search(state.currentQuery, state.currentPage + 1));
          paginationContainer.appendChild(nextBtn);
        }
      }
    }

    // Render cards
    hits.forEach((item, idx) => {
      const el = document.createElement("div");
      el.className = "mod-result-card";
      el.style.animationDelay = `${idx * 30}ms`;

      if (typeof renderCard === "function") {
        el.innerHTML = renderCard(item, { ...ctx, mode, provider: state.currentProvider });
      } else {
        // Default rendering
        const firstLetter = (item.title || "M").charAt(0).toUpperCase();
        el.innerHTML = `
          ${item.icon_url ? `<img class="mod-result-icon" src="${item.icon_url}" onerror="this.style.display='none'" />` : `<div class="mod-result-icon mod-icon-placeholder" style="width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:22px;color:rgba(255,255,255,0.6);">${firstLetter}</div>`}
          <div class="mod-result-info">
            <strong>${item.title}</strong><span>${item.description || ""}</span>
          </div>`;
      }

      if (typeof onAdd === "function") {
        const addBtn = el.querySelector(".add-mod-btn");
        if (addBtn && !addBtn.disabled) {
          addBtn.addEventListener("click", () => onAdd(item, addBtn, ctx));
        }
      }

      resultsEl.appendChild(el);
    });

    // Bottom pagination
    if (totalPages > 1) {
      const bottomPaginationDiv = document.createElement("div");
      bottomPaginationDiv.style.cssText =
        "grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:12px;margin-top:24px;padding:20px;width:100%;";
      if (state.currentPage > 0) {
        const prevBtn = document.createElement("button");
        prevBtn.textContent = "\u2190 Previous Page";
        prevBtn.className = "browser-page-btn-lg";
        prevBtn.addEventListener("click", () => search(state.currentQuery, state.currentPage - 1));
        bottomPaginationDiv.appendChild(prevBtn);
      }
      const pageInfo = document.createElement("span");
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      pageInfo.className = "browser-page-info-lg";
      bottomPaginationDiv.appendChild(pageInfo);
      if (currentPage < totalPages) {
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next Page \u2192";
        nextBtn.className = "browser-page-btn-lg";
        nextBtn.addEventListener("click", () => search(state.currentQuery, state.currentPage + 1));
        bottomPaginationDiv.appendChild(nextBtn);
      }
      resultsEl.appendChild(bottomPaginationDiv);
    }
  }

  function open(title) {
    const browserEl = document.querySelector(container);
    if (!browserEl) return;
    if (title) {
      const titleEl = getEl("browser-title");
      if (titleEl) titleEl.innerText = title;
    }
    browserEl.classList.add("active");
    state.isOpen = true;
    search("", 0);
  }

  function close() {
    const browserEl = document.querySelector(container);
    if (!browserEl) return;
    browserEl.classList.remove("active");
    state.isOpen = false;
  }

  function destroy() {
    destroyHandlers.forEach((fn) => fn());
    destroyHandlers = [];
  }

  function getState() {
    return { ...state };
  }

  // Auto-init on creation
  init();

  return { open, close, search, setFilters: resetFilters, getState, destroy };
}
