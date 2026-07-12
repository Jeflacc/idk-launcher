# CSS File Organization Audit Report

**Scope:** `/home/z/my-project/idk-launcher/src/renderer/styles/` — 30 CSS files
**Cross-referenced with:** `src/renderer/app/app-shell.js` (2208 lines), `src/renderer/index.html`
**Method:** Read every selector line in every CSS file; cross-checked class/ID ownership against the HTML in `app-shell.js` and dynamic injection in `features/friends/friends-feature.js`.

---

## Executive Summary

The CSS file organization is **substantially broken**. The user's description ("a total mess") is accurate. Key findings:

- **4 empty placeholder files** (`buttons.css`, `forms.css`, `cards.css`, `utilities.css`) — declared as "reserved" but never populated.
- **`downloads.css` is the worst offender** (1714 lines, ~50% misplaced): it contains an entire settings panel, the entire delete-modal dialog, the entire performance-mode grid, and most of the launch-overlay state — none of which belong there.
- **`modpacks.css` contains the entire IDK Connect auth panel** (`#view-idk-connect`, `#friends-auth-panel`) and the entire modpack modal subsystem (`.mp-create-modal`, `.mp-settings-modal`, `.mp-settings-box`, `.mp-settings-close`, etc.).
- **`friends.css` contains the entire Support banner + Ko-Fi widget** and the entire **Featured Server banner** — both of which actually live inside `#view-settings` (advanced ABOUT tab) and `#view-main > .details-section` respectively.
- **`main-view.css` is bloated** with ~10 selectors that actually belong in `modpacks.css` (`.mp-dashboard-columns`, `.mp-quick-actions`, `.mp-action-card`, `.mp-versions-section`, `.mp-welcome-hero`, `.mp-trending-section`, `.mp-wizard-section`, `.mp-version-download-grid`).
- **`layout.css` has duplicate definitions inside itself** for `.top-bar-left`, `.top-brand`, `.brand-title`, `.nav-tabs`, `.nav-tab`, `.window-controls .ctrl` (each defined twice).
- **`modals.css` has duplicate definitions inside itself** for `.custom-modal`, `.modal-content`, `.modal-btn`, `.update-box`, `.update-icon`, `.update-notes-container`, `.modal-icon` (each defined twice).
- **`profile.css` has duplicates inside itself** for `.profile-stat-mini`, `.profile-quick-action`, `#profile-btn-logout`, `.profile-friends-empty`, `.profile-section-header`, `.profile-skin-loading`, `.pose-btn`.
- **`advanced/main-view.css` contains ~8 modpack-related selectors** that belong in `advanced/modpacks.css` (`.mod-result-card`, `.trending-mp-card`, `.installed-mod-card`, etc.).
- **`advanced/modpacks.css` contains profile and settings selectors** (`body.ui-advanced #view-profile`, `.profile-page`, `.settings-content-wrapper`, `.settings-tab-bar`, `.mem-preset-btn`, `.ui-mode-card`).
- **`advanced/shell.css` is a dumping ground** for settings, profile, and main-view overrides that have nothing to do with the shell.
- **Media queries are scattered across 8 files** instead of consolidated in `responsive.css` (scattered in `layout.css`, `modpacks.css`, `downloads.css`, `profile.css`, `modals.css`, `main-view.css`, `advanced/settings.css`, `advanced/glass-system.css`).
- **`global-a11y-fixes.css`** is a giant cross-cutting override file — it intentionally references selectors from every component, which is the correct pattern for an a11y layer. **Not flagged as misplaced.**

**Total misplaced selectors identified: ~120.** See Migration Table (Section B).

---

## A. Per-File Analysis

### 1. `index.css` (65 lines)

- **Purpose:** CSS entry point — `@import`s all layers in order.
- **Selectors:** None (only `@import` statements).
- **Misplaced:** None.
- **Missing:** None.
- **Notes:** Layering is correct. After reorganization, ensure any new files (e.g. `components/launch-overlay.css`) are added to the import list at the right position.

---

### 2. `tokens.css` (299 lines)

- **Purpose:** Design tokens (`:root` custom properties only).
- **Selectors:** `:root` only.
- **Misplaced:** None.
- **Missing:** None.

---

### 3. `themes.css` (79 lines)

- **Purpose:** Theme palette overrides per `[data-theme]`.
- **Selectors:** `:root[data-theme="green"]`, `:root[data-theme="emerald"]`, `:root[data-theme="violet"]`, `:root[data-theme="amethyst"]`, `:root[data-theme="azure"]`, `:root[data-theme="ocean"]`, `:root[data-theme="ember"]`, `:root[data-theme="sunset"]`.
- **Misplaced:** None.
- **Missing:** None.

---

### 4. `base.css` (183 lines)

- **Purpose:** Reset, document defaults, font faces, scrollbars, a11y primitives.
- **Selectors:** `@font-face` (×2), `*, *::before, *::after`, `input, textarea, [contenteditable="true"]`, `html`, `body`, `#app`, `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-thumb:hover`, `.sr-only`, `button:focus-visible` (group), `@media (prefers-contrast: more)`, `@media (prefers-reduced-motion: reduce)`, `#a11y-live-region`.
- **Misplaced:** None.
- **Missing:** None.
- **Notes:** The header comment correctly notes this consolidates previously-duplicated rules. The `prefers-reduced-motion` and `prefers-contrast` blocks are also duplicated in `global-a11y-fixes.css` — see analysis there.

---

### 5. `global-a11y-fixes.css` (461 lines)

- **Purpose:** Cross-cutting WCAG / Nielsen / Laws-of-UX overrides that touch selectors from every component.
- **Selectors:** Many — `:root`, `body, #app, .view`, `small, .settings-row-label small, .settings-description, .launch-hint, .mp-item-count, .news-date, .friend-status-text, .download-metric-label, .stat-label, .profile-stat-mini-label, .settings-empty, .tutorial-tooltip-content`, `*:focus-visible`, `*:focus:not(:focus-visible)`, then a huge focus-visible selector list (~60 selectors), `[role="button"]`, `.modal-btn, .confirm-modal-btn, .delete-modal-btn, .mp-action-btn.icon-btn, ...` (touch-target sizes), another transition list, another border-radius list, `.news-grid:empty::before, #mojang-news-grid:empty::before`, `.spinner`, `@keyframes spin`, `.form-error, .friends-auth-error, .settings-error`, `.clean-input.error, input.error`, `::-webkit-scrollbar*`, `.custom-modal.active, .confirm-modal.active, .delete-modal.active, .mp-create-modal.active, .mp-settings-modal.active, .mp-all-versions-modal.active, .launch-overlay.active`, modal `::before` pseudos, `@media (prefers-reduced-motion: reduce)`, `@media (prefers-contrast: more)`, then a "VLM AUDIT ROUND 3 FIXES" block with `.friends-auth-form *`, `.render-engine-option.selected`, `#render-engine-dont-show`, `.delete-modal.active .delete-modal-content`, `.confirm-modal-content, .delete-modal-content, .mp-create-modal, .mp-settings-modal, .mp-all-versions-modal`, `.confirm-modal-btn.cancel:hover, .delete-modal-btn.cancel:hover`, `.nav-tabs`, `.nav-tab:not(:last-child)::after`, `.friends-auth-form`, `#list-dialog-title`, `#list-dialog-message`.
- **Misplaced:** None — by design, this file is a cross-cutting override layer.
- **Missing:** None.
- **Notes:** Contains duplicate `prefers-reduced-motion` and `prefers-contrast` blocks already present in `base.css`. Consider removing the duplicate media queries here (or move them out of `base.css` and into here as the single source).

---

### 6. `fixes.css` (232 lines)

- **Purpose:** Late-loaded patches — currently only the launch-overlay click-through behavior.
- **Selectors:** `.launch-overlay`, `.launch-overlay.active`, `.launch-overlay-card`, `.launch-card-header`, `.launch-card-header .launch-spinner-gif`, `.launch-card-header .launch-status`, `.launch-card-controls`, `.launch-icon-btn`, `.launch-icon-btn:hover`, `.launch-icon-btn:focus-visible`, `.launch-card-footer`, `.launch-hint`, `.launch-overlay.active.minimized`, `.launch-mini-indicator`, `.launch-mini-indicator:hover`, `.launch-mini-indicator.visible`, `.launch-mini-spinner`, `@keyframes launch-mini-spin`, `.launch-mini-close`, `.launch-mini-close:hover`.
- **Misplaced:** None — these are intentionally late-loaded patches.
- **Notes:** These selectors overlap with `.launch-overlay`, `.launch-overlay-card`, `.launch-spinner-gif`, `.launch-status`, `.launch-bar`, `.launch-fill` defined in `modals.css` (lines 29-101). `fixes.css` loads LAST so it correctly wins the cascade. However, this creates the impression that `.launch-overlay` is defined in two places. **Recommendation:** Move all `.launch-overlay*` rules from `modals.css` into `fixes.css` (or a new `components/launch-overlay.css`) to consolidate ownership.

---

### 7. `components/layout.css` (595 lines)

- **Purpose:** Background layers, top title bar, nav, view roots.
- **Selectors:** `.view`, `.modpacks-sidebar, .browser-sidebar`, `.installed-mod-card, .mod-result-card, .trending-mp-card`, `.background-slider`, `.bg-video`, `.bg-overlay`, `.top-bar`, `.top-bar-left`, `.top-brand`, `.brand-title`, `.nav-tabs`, `.nav-tab`, `.nav-tab:hover`, `.top-bar-left`, `.top-brand`, `.top-brand .brand-mark`, `.top-brand .brand-mark::first-letter`, `.top-brand .brand-word`, `.header-nav`, `.brand-title`, `.nav-tabs`, `.nav-tab`, `.nav-tab svg`, `.nav-tab:hover`, `body:has(#view-*.active) .nav-tab[data-target=*]` (×4), `.top-bar-right`, `.user-profile`, `.user-profile:hover`, `.user-profile-avatar`, `.user-profile-avatar canvas`, `.user-details`, `.user-details-label`, `.user-details h4, #display-username`, `.user-details p`, `@media (min-width: 1280px)`, `.user-profile-wrapper`, `.profile-dropdown`, `.profile-dropdown.active`, `.profile-dropdown-item`, `.profile-dropdown-item svg`, `.profile-dropdown-item:hover`, `.profile-dropdown-item:hover svg`, `.profile-dropdown-item.logout:hover`, `.profile-dropdown-item.logout:hover svg`, `.window-controls`, `.window-controls .ctrl`, `.window-controls .ctrl:hover`, `.window-controls .close:hover`, `body:has(#view-login.active) .header-nav, body:has(#view-login.active) .user-profile`, `.view`, `.view.active`, `body[data-bg-effect]:not([data-bg-effect="none"]) #view-*` (×4), `html body[data-bg-effect]:not([data-bg-effect="none"]) .mods-content-wrapper, .settings-content-wrapper, .profile-page-content, .profile-main-stage, .details-section`, `html body[data-bg-effect]:not([data-bg-effect="none"]) .modpacks-sidebar, .browser-sidebar, .profile-sidebar, .friends-sidebar, .details-section`, `.window-controls .ctrl` (duplicate).
- **Misplaced:** 
  - **Duplicate selector definitions within the file:** `.top-bar-left`, `.top-brand`, `.brand-title`, `.nav-tabs`, `.nav-tab`, `.window-controls .ctrl` are each defined twice (the second definitions override the first). The second set appears to be a "Mojang-style" refinement.
  - The two-layer glass system overrides (`.modpacks-sidebar, .browser-sidebar`, `.installed-mod-card, .mod-result-card, .trending-mp-card`, `html body[data-bg-effect]…`) **belong in `advanced/glass-system.css`** — they only apply when `data-bg-effect` is set, which is the advanced background-effect system. Currently they live in `components/layout.css` because that file loads early in the cascade and uses `!important`.
- **Missing:** None.
- **Notes:** The glass `!important` overrides at the top of the file are intentional (must load before component rules so other properties can be overridden). **Acceptable as-is**, but consider moving to `advanced/glass-system.css` for cohesion if the `!important` cascade can be preserved.

---

### 8. `components/buttons.css` (9 lines — EMPTY PLACEHOLDER)

- **Selectors:** None.
- **Misplaced:** None.
- **Recommendation:** Either (a) **delete** the file and remove its `@import` from `index.css`, or (b) **populate** it by migrating cross-cutting button base styles (`button` element defaults, `.modal-btn`, `.submit-btn`, `.login-btn`, `.glass-btn`, `.adv-btn`, `.btn-connect-action`, `.btn-widget-action`, `.mp-action-btn`, `.ddp-btn`, `.friend-*-btn` base styles) out of their owning component files. Currently the header comment explicitly says "Most buttons live in their owning component file … to preserve cascade order" — so deletion is the safer path.

---

### 9. `components/forms.css` (9 lines — EMPTY PLACEHOLDER)

- **Selectors:** None.
- **Recommendation:** Same as `buttons.css` — either delete or populate with `.clean-input`, `.glass-input`, `.glass-slider`, `.adv-input`, `.widget-input`, `.settings-input`, `.clean-select`, `.custom-select-trigger`, `.custom-option`, `.pill-switch`, `.tg-switch`, `.toggle-switch`, `.memory-slider` base styles. Deletion is safer given the cascade-order constraint.

---

### 10. `components/cards.css` (10 lines — EMPTY PLACEHOLDER)

- **Selectors:** None.
- **Recommendation:** Same — either delete or populate with cross-cutting card base styles. Deletion recommended.

---

### 11. `components/utilities.css` (8 lines — EMPTY PLACEHOLDER)

- **Selectors:** None.
- **Recommendation:** Either delete, or populate with utility classes (`.sr-only` is already in `base.css`, `.spinner` is in `global-a11y-fixes.css`). Currently has no purpose. Deletion recommended.

---

### 12. `components/login.css` (254 lines)

- **Purpose:** Login view, auth forms, EULA.
- **Selectors:** `#view-login`, `.login-box`, `.login-box h2`, `.login-subtitle`, `.login-btn`, `.login-btn:hover`, `.login-btn:active`, `.login-btn:focus-visible`, `.login-btn.microsoft`, `.login-btn.microsoft:hover`, `.login-btn.elyby`, `.login-btn.elyby:hover`, `.login-btn.offline-toggle`, `.login-btn.offline-toggle:hover`, `.secondary-login-row`, `.login-btn.small-btn`, `.login-btn.offline`, `.login-btn.offline:hover`, `.offline-form`, `.offline-form.open`, `.clean-input`, `.clean-input::placeholder`, `.clean-input:focus`, `.clean-input:focus-visible`, `.submit-btn`, `.submit-btn:hover`, `.submit-btn:active`, `.submit-btn:focus-visible`.
- **Misplaced:** 
  - `.clean-input` is a **cross-cutting** form input used in login, friends-auth, modpack-create modal, modpack-settings modal, mod-browser search, chat input, profile bio editor, etc. It is currently defined in `login.css` (which makes sense as the "first use" file) but it would be more correct in `forms.css` (the empty placeholder).
  - `.submit-btn` is also cross-cutting (used in login, mp-create, mp-settings, dl-confirm, render-engine, friends-auth, search-users, crash-analyzer). Same recommendation.
- **Missing:** None.

---

### 13. `components/main-view.css` (1503 lines)

- **Purpose:** Main view hero, play bar, version dropdown, news cards, decoration.
- **Selectors (non-exhaustive — full list extracted via grep):**
  - Hero/play bar: `.main-hero-banner`, `.hero-video`, `.hero-overlay`, `.main-center`, `.mc-logo`, `@keyframes floatLogo`, `.main-hero-banner .bottom-bar`, `.controls-left`, `.controls-right`, `.pill-switch`, `.play-button-wrapper`, `.play-button` (multiple states), `.play-container`, `.force-update-container`, `.force-update-label`, `.play-dropdown-trigger`, `.play-dropdown`, `.play-dropdown.active`, `.play-dropdown-item` (multiple states), `.play-dd-setup`, `.play-dd-setup-label`, `.play-dd-setup-value`, `.play-dropdown-divider`, `.play-dd-section`, `.play-dd-section-header`, `.play-dd-version-list`, `.play-dd-version-btn` (multiple states), `.play-dd-version-more`, `.play-dd-version-wrapper`, `.play-dd-version-id`, `.play-dd-version-loader`.
  - Version dropdown: `.refresh-versions-btn`, `.custom-select-wrapper`, `.custom-select-trigger` (and `:hover`, `.open`), `.custom-options`, `.custom-select.open .custom-options`, `.options-filters`, `.options-list` (and `::-webkit-scrollbar*`), `.custom-option` (multiple states), `.downloaded-badge`, `.version-tabs`, `.version-tab` (multiple states), `.grass-icon`.
  - Toggles: `.toggle-switch`, `.toggle-switch input[type="checkbox"]`, `.switch`, `.switch::after`, `input[type="checkbox"]:checked + .switch`, `input[type="checkbox"]:checked + .switch::after`.
  - Buttons: `.manage-mods-button` (multiple states), `.play-button` (multiple states).
  - Version list in dropdown: `.mp-empty`, `.mp-list-section-header`, `.mp-list-section-header:first-child`, `.modpack-item.version-item`, `.modpack-item.version-item .mp-item-icon`, `.modpack-item.version-item .mp-item-icon svg`, `.modpack-item.version-item:hover`, `.modpack-item.version-item.active` — these are inside the version dropdown so they belong here.
  - Details/news: `.details-section`, `.details-content`, `.stats-grid`, `.stat-card`, `.stat-card:hover`, `.stat-icon`, `.stat-info h4`, `.stat-info h2`, `.section-title`, `.section-header` (duplicate), `.news-section`, `.news-grid`, `.news-card`, `.news-card:hover`, `.news-card-featured`, `.news-card-featured .news-img`, `.news-img`, `.news-img::after`, `.news-content`, `.news-category`, `.news-title`, `.news-desc`, `.news-date`, `.news-empty-state`, `.section-header`, `.section-decoration`, `.decoration-block`, `.decoration-block:nth-child(2)`, `.decoration-block:nth-child(3)`, `@keyframes blockBounce`, `@keyframes spin`.
  - **Modpack view selectors misplaced here (lines 1170–1428):** `.mp-dashboard-columns`, `.mp-quick-actions`, `.mp-action-card` (×4 states), `.mp-ac-icon`, `.mp-ac-text h3`, `.mp-ac-text p`, `.mp-versions-section`, `.mp-versions-header`, `.mp-versions-header h3`, `.mp-welcome-hero`, `.mp-welcome-hero h2`, `.mp-welcome-hero p`, `.mp-trending-section`, `.mp-trending-header`, `.mp-trending-title`, `.mp-trending-brand`, `.mp-loading-placeholder`, `.mp-wizard-section`, `.mp-wizard-step`, `.mp-version-download-grid`, `.mp-version-download-item` (×6 states), `.mp-dl-btn` (×4 states), `.mp-dl-loader-badge` — **all of these belong in `modpacks.css`** (they live inside `#view-mods`, lines 1387–1445 of app-shell.js).
  - Late-appended rules (lines 1429–1503): `.custom-select-trigger` (duplicate), `.refresh-versions-btn` (duplicate), `.play-button[data-status]::after`, `.advanced-home-username` (OK — base class for advanced home player), `.details-section .section-header` (duplicate), `.news-empty-state` (duplicate), `.nav-tab:focus-visible` (**MISPLACED** — belongs in `layout.css` or `global-a11y-fixes.css`), `.featured-join-btn`, `.featured-join-btn:hover`, `.featured-server-desc`, `.bg-dots`.
- **Misplaced:** 
  - **`.mp-dashboard-columns`, `.mp-quick-actions`, `.mp-action-card`, `.mp-versions-section`, `.mp-welcome-hero`, `.mp-trending-section`, `.mp-wizard-section`, `.mp-version-download-grid`** and all their descendants → **`modpacks.css`**.
  - **`.nav-tab:focus-visible`** → **`layout.css`** (or `global-a11y-fixes.css`).
- **Missing:** `.featured-server-banner` and its full selector family (currently in `friends.css`) — should be moved here since the featured-server banner lives inside `#view-main > .details-section`.
- **Notes:** The `.featured-join-btn` definition here appears to be a stub/duplicate of the canonical one in `friends.css`. After migration, consolidate to one definition.

---

### 14. `components/modpacks.css` (1909 lines)

- **Purpose:** Modpack manager view (`#view-mods`).
- **Selectors:** (huge list — see grep output) includes `#view-mods`, `#view-idk-connect`, `#view-idk-connect .mods-content-wrapper`, `#friends-auth-panel`, `.mods-content-wrapper`, `.mods-page-header`, `.view-title`, `.mods-header-actions`, `.create-modpack-btn`, `.mods-container`, `.modpacks-sidebar*`, `.sidebar-label`, `.modpack-item*`, `.mp-item-icon`, `.mp-item-info*`, `.mp-item-count`, `.modpack-detail`, `.modpack-content*`, `.no-modpack-msg`, `.mp-stats-row*`, `.mp-stat*`, `.modpack-header-actions*`, `#modpack-icon-display*`, `.mp-action-btn*` (all variants: play, settings, delete, icon-btn, browse, back), `.mp-tabs*`, `.mp-tab*`, `.mp-tab-content*`, `.mp-scroll-area`, `.mp-tab-toolbar`, `.shader-note`, `.mods-grid`, `.installed-mod-card*`, `.installed-mod-info*`, `.remove-mod-btn*`, `.mod-browser*`, `.browser-*`, `.mod-result-card*`, `.mod-result-info*`, `.mod-result-meta*`, `.add-mod-btn*`, `.pose-selector`, `.pose-btn*`, `.provider-pill*`, `.trending-modpacks-grid`, `.trending-mp-card*`, `.trending-mp-thumb*`, `.trending-mp-info*`, `.trending-mp-meta*`, `.trending-mp-tag`, `.trending-mp-thumb-fallback`, `.mp-create-modal*`, `.mp-create-box*`, `.icon-picker*`, `.clean-select*`, `.mp-settings-modal*`, `.mp-settings-box*`, `.mp-settings-header*`, `.mp-settings-close*`, `.mp-settings-content*`, `.mp-settings-section*`, `.mp-settings-actions`, `#btn-show-all-versions`.
- **Misplaced:**
  - **`#view-idk-connect`** (line 26), **`#view-idk-connect .mods-content-wrapper`** (line 32), **`#friends-auth-panel`** (line 40) → **`idk-connect.css`**. These are IDK Connect view selectors, not modpack selectors.
  - **`.mp-create-modal`**, **`.mp-create-modal.active`**, **`.mp-create-box`**, **`.mp-create-box h3`**, **`.mp-settings-modal`**, **`.mp-settings-modal.active`**, **`.mp-settings-box`**, **`.mp-settings-header`**, **`.mp-settings-header h3`**, **`.mp-settings-close`**, **`.mp-settings-close:hover`**, **`.mp-settings-content`**, **`.mp-settings-section`**, **`.mp-settings-section label`**, **`.mp-settings-section select`** (and `:focus`, ` option`), **`.mp-settings-actions`** → **`modals.css`**. These are modal dialogs.
  - **`.icon-picker`**, **`.icon-picker:hover`**, **`.icon-picker img`**, **`.icon-picker-placeholder`**, **`.icon-picker-placeholder svg`** → **`modals.css`** (used only inside mp-create-modal and mp-settings-modal).
  - **`.clean-select`**, **`.clean-select:focus`**, **`.clean-select option`** → **`forms.css`** (cross-cutting form control).
  - **`.pose-selector`**, **`.pose-btn`**, **`.pose-btn:hover`**, **`.pose-btn.active`**, **`.pose-btn svg`** → **`profile.css`** (pose buttons are used in the profile skin viewer; this is a duplicate of definitions in `profile.css`).
- **Missing:** Should receive the modpack-view selectors currently misplaced in `main-view.css` (`.mp-dashboard-columns`, `.mp-quick-actions`, `.mp-action-card`, `.mp-versions-section`, `.mp-welcome-hero`, `.mp-trending-section`, `.mp-wizard-section`, `.mp-version-download-grid`).
- **Notes:** The `.mp-create-modal` and `.mp-settings-modal` are modpack-specific modals — an argument could be made for keeping them here, but the project's stated convention is "all modals in `modals.css`" so they should move.

---

### 15. `components/settings.css` (1133 lines)

- **Purpose:** Settings view (`#view-settings`), settings tabs, theme picker, sliders, toggles.
- **Selectors:** `#view-settings`, `.settings-content-wrapper`, `.view-title`, `.settings-grid`, `.settings-section*`, `.memory-slider*`, `.memory-value-label`, `.memory-presets*`, `.mem-preset-btn*`, `.settings-header*`, `.settings-tab-bar`, `.settings-tab*`, `.settings-tab-indicator`, `.settings-tab-panel*`, `@keyframes settingsFadeIn`, `.settings-page`, `.settings-section-title*`, `.settings-section-desc`, `.settings-row*`, `.settings-row-label*`, `.theme-palette-grid`, `.theme-choice-card*`, `.theme-swatch*`, `.custom-swatch`, `.theme-name`, `.color-picker-wrap*`, `.color-picker-input*`, `.color-hex-label`, `.pill-switch*`, `.pill-switch-option*`, `.slider-group`, `.glass-slider*`, `.slider-value`, `.blur-choice-group`, `.blur-choice-card*`, `.tg-switch*`, `.tg-slider*`, `.tg-label`, `.glass-input*`, `.glass-btn*`, `.window-size-group`, `.win-size-x`, `.folder-row`, `.mem-value`, `.settings-content-wrapper .performance-mode-card`, `body.compact-mode *` (many), `.settings-section.appearance-settings-section`, `.ui-mode-card*`, `.bg-effect-card*`, `.advanced-tab*`, `.toggle-switch input:focus-visible + .switch`, `.settings-description`, `.settings-section h3`, `.glass-btn*`, `.theme-choice-card .custom-swatch`.
- **Misplaced:** 
  - **`.performance-mode-card`** (referenced via `.settings-content-wrapper .performance-mode-card`) is a forward-reference to a selector defined in `downloads.css`. The base `.performance-mode-grid` and `.performance-mode-card` should be in `performance.css`, not `downloads.css`.
  - `.ui-mode-card` is used in BOTH classic settings and advanced settings. Base definition in `settings.css` is correct.
  - `.bg-effect-card` is used only in advanced settings (BACKGROUND tab). Base definition is OK here (it shows when body.ui-advanced, but the styles apply universally to the card markup). Acceptable.
  - `.advanced-tab` is an advanced-mode-only selector. It could move to `advanced/settings.css`, but having the base here means it works regardless of advanced mode. Acceptable.
- **Missing:** Should receive the settings-related selectors currently misplaced in `downloads.css` (`.settings-panel`, `.settings-header`, `.settings-title`, `.settings-close-btn`, `.settings-search-input`, `.settings-content`, `.settings-sidebar`, `.settings-category-btn`, `.settings-main`, `.settings-form-container`, `.settings-group`, `.settings-label`, `.settings-tooltip`, `.settings-input`, `.settings-checkbox`, `.settings-number`, `.settings-footer`, `.settings-btn`, `.settings-empty`). **However**, looking at these selectors in `downloads.css`, they appear to be from an OLDER settings UI that may no longer be used (the current settings view uses `.settings-tab-bar` / `.settings-tab` / `.settings-page` / `.settings-row`). They may be **dead code** — verify before migrating.

---

### 16. `components/profile.css` (917 lines)

- **Purpose:** Profile view (`#view-profile`), skin viewer, stats, friends list, quick actions.
- **Selectors:** `#view-profile`, `.profile-page*`, `.profile-main-stage*`, `.profile-stage-grid*`, `.profile-stage-character`, `.profile-stage-heading`, `.profile-character-name`, `.profile-skin-viewer-wrapper*`, `.profile-skin-loading`, `.profile-stage-bar*`, `.profile-stage-bar-combined*`, `.profile-stage-bar-main-text*`, `.profile-stage-bar-export-icon*`, `.profile-stage-bar-side`, `.profile-sidebar*`, `.profile-section-header`, `.profile-sidebar-identity*`, `.profile-sidebar-avatar-wrap*`, `.profile-actions-section` (duplicate), `.profile-section-title*`, `.profile-stats-section`, `.profile-stat-mini-list`, `.profile-stat-mini*` (many), `.profile-friends-section*`, `.profile-friends-list`, `.profile-friends-empty` (duplicate), `.profile-friend-item*`, `.profile-friend-avatar*`, `.profile-friend-info*`, `.profile-friend-name`, `.profile-friend-status*`, `.profile-quick-action*` (many), `.profile-action-primary*`, `.profile-action-danger*`, `#profile-btn-logout*`, `body:has(#view-profile.active) .nav-tab[data-target="profile"]`, `@media (max-width: *)` (×4), `@keyframes spin-anim`, `.spin-anim`, `@keyframes profile-pulse`.
- **Misplaced:** 
  - **`.pose-btn`**, **`.pose-btn:hover`**, **`.pose-btn.active`**, **`.pose-btn:focus-visible`** (lines 837–849) — these are DUPLICATES of the definitions in `modpacks.css` (lines 1411–1441). **Pick one canonical location** — likely `profile.css` since pose-selector is shown on the profile skin viewer (HTML line 1188). Remove from `modpacks.css`.
  - Multiple in-file duplicates (lines 811–820 are duplicates of earlier definitions; lines 857–867 duplicate `#profile-btn-logout`; line 887 duplicates `.profile-section-header`; line 893 duplicates `.profile-skin-loading`; line 907 duplicates `.profile-friends-empty`). **Deduplicate within the file.**
- **Missing:** None.
- **Notes:** The 4 `@media` blocks (lines 731, 741, 762, 789) should be moved to `responsive.css` (or kept here if the team prefers component-co-located responsive rules; the project is inconsistent on this).

---

### 17. `components/friends.css` (1296 lines)

- **Purpose:** Friends sidebar, friends list, chat, friend requests.
- **Selectors:** `.friends-toggle-btn*`, `.friends-badge`, `.friends-unread-dot`, `.friends-sidebar*`, `.friends-sidebar-header*`, `.friends-sidebar-close*`, `.friends-sidebar-content`, `.friends-auth-panel`, `.friends-auth-welcome*`, `.friends-auth-tabs`, `.friends-auth-tab*`, `.friends-auth-form*`, `.friends-auth-error`, `.friends-identity-card*`, `.friends-identity-info*`, `.friends-identity-avatar*`, `.friends-identity-name*`, `.friends-identity-disconnect*`, `.friends-share-card*`, `.friends-share-input-row*`, `.friends-share-btn*`, `.friends-share-tunnel-link*`, `.frpc-progress-bar`, `.frpc-progress-fill`, `.friends-requests-section*`, `.friends-requests-title`, `.friend-request-card*`, `.friend-request-info*`, `.friend-request-actions`, `.friend-request-btn*`, `.friends-add-row*`, `.friends-add-btn*`, `.friends-list-section*`, `.friends-list-container`, `.friends-list-empty`, `.friend-card*` (many), `.friend-avatar*`, `.friend-info*`, `.friend-status-text*`, `.friend-status-dot*`, `.friend-join-btn*`, `@keyframes pulseJoin`, `.friend-remove-btn*`, `.friends-chat-panel*`, `.friends-chat-header*`, `.friends-chat-back*`, `.friends-chat-info`, `.friends-chat-messages*`, `.chat-message-row*`, `.chat-message-bubble*`, `.chat-message-time`, `.friends-chat-input-row*`, `.friends-chat-send-btn*`, `.friend-unread-badge`, then **(MISPLACED)** `.support-banner*` (×15 selectors), `.support-donate-btn*`, `.btn-shine`, `@keyframes shine`, then **(MISPLACED)** `.featured-server-banner*` (×15 selectors), `.featured-join-btn*`.
- **Misplaced (HUGE):**
  - **Entire Support banner family** (lines 895–1078, ~17 selectors): `.support-heart-bg`, `.support-banner-glow`, `.support-banner::after`, `.support-banner`, `.support-banner::before`, `.support-banner:hover *`, `.support-banner-bg-decoration`, `.support-banner-info`, `.support-banner-icon`, `.support-banner-text`, `.support-banner-label`, `.support-banner-title`, `.support-banner-desc`, `.support-banner-action`, `.support-donate-btn`, `.btn-shine`, `@keyframes shine` → **`advanced/settings.css`** (the support banner lives in `#view-settings > .advanced-tab-panel[data-adv-panel="about"]`, app-shell.js line 1096).
  - **Entire Featured Server banner family** (lines 1079–1294, ~17 selectors): `.featured-server-banner`, `.featured-server-banner::before`, `.featured-server-banner:hover`, `.featured-server-info`, `.featured-server-icon`, `.featured-server-text`, `.featured-server-label`, `.featured-server-title`, `.featured-server-desc`, `.featured-server-action`, `.featured-join-btn`, `.featured-join-btn:hover`, `.featured-server-banner--compact`, `.featured-server-banner--compact .featured-server-*`, `.featured-server-banner--compact::before`, `.featured-server-banner--compact:hover` → **`main-view.css`** (the featured-server banner lives in `#view-main > .details-section > .news-section > .featured-server-banner`, app-shell.js line 286).
- **Missing:** None.
- **Notes:** This file has clearly been a dumping ground for "stuff that needs styling." After migration it shrinks by ~35%.

---

### 18. `components/downloads.css` (1714 lines)

- **Purpose (intended):** Download progress bar, cancel/pause/resume buttons, error display.
- **Purpose (actual):** Contains all of the above PLUS an entire settings panel UI, the entire delete-modal dialog, the entire performance-mode picker, and the launch-overlay eco-mode overrides.
- **Selectors:** (Grouped by actual ownership)
  - **Genuinely belongs here (~600 lines):** `.download-progress-container*`, `.download-progress-bar-wrapper`, `.progress-bar-background`, `.progress-bar-fill*`, `.download-status-text*`, `.download-metrics*`, `.download-metric*`, `.download-eta-text`, `.download-current-item-text*`, `.download-control-buttons`, `.download-control-btn*`, `.download-pause-btn*`, `.download-resume-btn*`, `.download-cancel-btn*`, `.download-error-display*`, `.error-display_container*`, `@keyframes slideInUp`, `.error-display_content*`, `@keyframes slideInLeft`, `.error-display-actions`, `.error-action-btn*`, `.download-status-btn*`, `.ds-ring*`, `.ds-icon`, `.download-detail-panel*`, `.ddp-header*`, `.ddp-title`, `.ddp-close*`, `.ddp-body`, `.ddp-status`, `.ddp-progress-bar`, `.ddp-progress-fill`, `.ddp-current-item`, `.ddp-metrics`, `.ddp-metric*`, `.ddp-actions`, `.ddp-btn*`.
  - **MISPLACED — entire settings panel UI (lines 931–1199, ~30 selectors):** `.settings-panel`, `.settings-panel.hidden`, `@keyframes fadeIn`, `.settings-header`, `.settings-title`, `.settings-close-btn`, `.settings-close-btn:hover`, `.settings-search-container`, `.settings-search-input*`, `.settings-content`, `.settings-sidebar`, `.settings-category-btn*`, `.settings-main`, `.settings-form-container`, `.settings-group`, `.settings-label-container`, `.settings-label`, `.settings-tooltip-icon`, `.settings-tooltip`, `.settings-input*`, `.settings-checkbox`, `.settings-number`, `.settings-description`, `.settings-footer`, `.settings-btn*`, `.settings-empty` → **`settings.css`** (or delete if dead code — see notes below).
  - **MISPLACED — entire delete-modal dialog (lines 1267–1431, ~17 selectors):** `.delete-modal`, `.delete-modal.active`, `.delete-modal-content*`, `.delete-modal-content h3`, `.delete-modal-content p`, `.delete-modal-checkbox*` (×4), `.delete-modal-actions`, `.delete-modal-btn*` (×8) → **`modals.css`** (this is a modal dialog per the project convention).
  - **MISPLACED — performance mode picker (lines 1431–1498, ~7 selectors):** `.performance-mode-grid`, `.performance-mode-card*` (×5), `body[data-launcher-performance="eco"] .hero-video`, `body[data-launcher-performance="eco"] .launch-spinner-gif`, `body[data-launcher-performance="eco"] .background-slider`, `body[data-launcher-performance="balanced"] .background-slider`, `body[data-launcher-performance="balanced"] .mc-logo` → **`performance.css`**.
  - **MISPLACED — duplicate definitions of download progress (lines 395–499, 771–930, 771+):** The file contains the download progress UI defined THREE TIMES (lines 27–282, 395–499, 771–930). Massive in-file duplication. **Deduplicate to one canonical definition.**
  - **`#a11y-live-region`** (line 380) — **MISPLACED**, this is a global a11y primitive already defined in `base.css`. Remove the duplicate.
- **Missing:** None.
- **Notes on settings-panel selectors:** The `.settings-panel`, `.settings-search-input`, `.settings-category-btn` etc. selectors DO NOT match the current settings view HTML (which uses `.settings-content-wrapper`, `.settings-tab-bar`, `.settings-tab`, `.settings-page`, `.settings-row`). These appear to be from a previous settings UI design. **Likely dead code** — verify with a search for `.settings-panel` usage in `app-shell.js` before migrating; if unused, delete instead of migrating.
- **This is the worst-organized file in the project.** It needs a complete rewrite.

---

### 19. `components/modals.css` (1521 lines)

- **Purpose:** All modal dialogs.
- **Selectors:** `.launch-overlay*` (×7), `.custom-modal*` (×2 — duplicate), `.modal-content*` (×2 — duplicate), `.modal-icon` (×2 — duplicate), `.modal-content h3` (×2 — duplicate), `.modal-content p` (×2 — duplicate), `.modal-btn*` (×2 — duplicate), `.warning-toast*`, `.sodium-badge*`, `.sodium-label`, `#update-modal*`, `.update-box*` (×2 — duplicate), `.update-icon` (×2 — duplicate), `.update-notes-container*` (×2 — duplicate), `@keyframes modalSlideIn`, `.modal-content::-webkit-scrollbar*`, `.mp-settings-close*` (MISPLACED — belongs in modpacks.css or here as a generic modal close button; comment says "All modals" so OK to keep here), `.mod-updates-modal-content*`, `.updates-modal-header*`, `#mod-updates-content`, `.updates-shell`, `.updates-card*`, `.updates-summary*`, `.updates-type`, `.updates-breakdown*`, `.updates-count-pill*`, `.updates-toolbar`, `.updates-action-btn*`, `.updates-update-all`, `.updates-actions`, `.updates-version-select*`, `.updates-list`, `.updates-card*` (×2 — duplicate), `.updates-card.installing`, `.updates-card.installed`, `.updates-icon*`, `.updates-icon-image`, `.updates-icon-fallback`, `.updates-card-main*`, `.updates-card-header`, `.updates-version-row*`, `.updates-version-old`, `.updates-version-arrow`, `.updates-version-new`, `.updates-filename`, `.updates-status-chip`, `.updates-empty*`, `@media (max-width: *)` (×3), `.skin-3d-modal-overlay*`, `.skin-3d-modal-card*`, `.skin-3d-modal-header*`, `.skin-3d-modal-close*`, `.skin-3d-modal-body`, `.skin-3d-viewport*`, `.skin-3d-controls`, `.skin-3d-field*`, `.skin-3d-toggle*`, `.skin-3d-modal-footer*`, `.confirm-modal*` (many), `.confirm-modal-content*` (many), `.confirm-modal-btn*`, `#list-dialog-modal*`, `#list-dialog-message`, `#list-dialog-items`, `#list-dialog-cancel`, `#render-engine-modal*`, `#render-engine-title`, `#render-engine-message`, `#render-engine-items`, `.render-engine-option*` (many), `.render-engine-footer*`, `#render-engine-dont-show + label`, `#render-engine-cancel*`.
- **Misplaced:** 
  - **`.launch-overlay`, `.launch-overlay.active`, `.launch-overlay-card`, `.launch-spinner-gif`, `.launch-status`, `.launch-bar`, `.launch-fill`** (lines 29–101) — also defined in `fixes.css`. The `fixes.css` definitions are the "live" ones (loaded last). The `modals.css` definitions are mostly overwritten. **Move all launch-overlay rules into `fixes.css`** (or a new `components/launch-overlay.css`) to consolidate.
  - **In-file duplicates:** `.custom-modal` (101, 345), `.custom-modal.active` (118, 361), `.modal-content` (123, 366), `.modal-content h3` (154, 390), `.modal-content p` (165, 398), `.modal-btn` (172, 422), `.modal-btn:hover` (192, 435), `.modal-btn:active` (201, 441), `.update-box` (285, 465), `.update-icon` (301, 469), `.update-notes-container` (310, 482), `.modal-icon` (140, 497), `.updates-card` (565, 732). **Deduplicate within the file.**
- **Missing:** Should receive the delete-modal family (currently in `downloads.css`) and the mp-create-modal/mp-settings-modal family (currently in `modpacks.css`) per the "all modals in modals.css" convention.

---

### 20. `components/performance.css` (99 lines)

- **Purpose:** Eco-mode overrides (`body[data-launcher-performance="eco"]`).
- **Selectors:** `body[data-launcher-performance="eco"] *`, `body[data-launcher-performance="eco"]::after`, `body[data-launcher-performance="eco"]` (×3 more), `body[data-launcher-performance="eco"] .mod-browser`, `body[data-launcher-performance="eco"] .play-btn` (×2), `body[data-launcher-performance="eco"] .btn-secondary`, `.dashboard-banners-grid`, `.dashboard-banners-grid .support-banner`.
- **Misplaced:** 
  - `.dashboard-banners-grid` and `.dashboard-banners-grid .support-banner` (lines 82–98) — these reference the support-banner which lives in `advanced/settings.css`. **Could move to `advanced/settings.css`** or stay here as a "performance dashboard banners" section. Acceptable as-is.
- **Missing:** Should receive `.performance-mode-grid`, `.performance-mode-card*` (currently in `downloads.css`) and `body[data-launcher-performance="eco"] .hero-video`, `.launch-spinner-gif`, `.background-slider`, `body[data-launcher-performance="balanced"] .background-slider`, `.mc-logo` (currently in `downloads.css`).

---

### 21. `components/idk-connect.css` (541 lines)

- **Purpose:** IDK Connect dashboard view (`#view-idk-connect`).
- **Selectors:** `.connect-dashboard-wrapper*`, `.connect-header*`, `.connect-title`, `.connect-header-actions`, `.btn-connect-action*` (×2 — duplicate), `.connect-dashboard-layout`, `.connect-sidebar`, `.connect-profile-card*`, `.profile-avatar-wrapper*`, `.profile-status-dot*`, `.profile-username`, `.profile-status-text` (MISPLACED — duplicates of profile.css selectors used by the profile sidebar), `.connect-widget-card*`, `.widget-header*`, `.widget-desc`, `.widget-input-group*`, `.widget-input*` (many), `.btn-widget-action*`, `.widget-code-block`, `.connect-main-content`, `.connect-section-title*`, `.connect-friends-list`, `.connect-empty-state`, `.friends-auth-tab*` (×4 — overrides for IDK Connect context; acceptable here), `.btn-connect-action*` (duplicate, lines 429+), `#friends-auth-otp*`, `.friends-auth-welcome p`, `.connect-dashboard-wrapper input:focus-visible`, `.connect-dashboard-layout .nav-item*`, `.connect-friends-list .friend-card*` (overrides for IDK Connect context; acceptable), `.friends-auth-submit.loading*`, `@keyframes idk-spin`, `.friends-auth-error`.
- **Misplaced:** 
  - `.profile-status-dot`, `.profile-status-dot.online`, `.profile-username`, `.profile-status-text` (lines 153–183) — these are DUPLICATES of selectors in `profile.css`. The IDK Connect sidebar uses these classes for its own user-profile display. Either (a) keep as acceptable IDK Connect overrides, or (b) rename the IDK Connect profile elements to use `.connect-*` classes to avoid the collision.
  - `.btn-connect-action` is defined twice within the file (lines 58 and 429). **Deduplicate within the file.**
- **Missing:** Should receive `#view-idk-connect`, `#view-idk-connect .mods-content-wrapper`, `#friends-auth-panel` (currently in `modpacks.css`).

---

### 22. `components/responsive.css` (619 lines)

- **Purpose:** Consolidated media queries.
- **Selectors:** `@media (max-width: 1200px)`, `@media (max-width: 1100px)`, `@media (max-width: 768px)`, `@media (max-width: 480px)` — with selectors for `.top-bar`, `.main-hero-banner`, `.details-content`, `.stats-grid`, `.news-grid`, `.modpacks-sidebar`, `.modpack-content-header`, `.modpack-header-actions`, `.mp-wizard-*`, `.top-brand`, `.brand-title`, `.nav-tab`, `.user-details`, `.user-profile`, `.user-profile-avatar`, `.header-nav`, `.nav-tabs`, `.create-modpack-btn`, `.mp-tab`, `.mp-action-btn.browse`, `.mc-logo`, `.main-hero-banner .bottom-bar`, `.controls-left`, `.stat-card`, `.stat-icon`, `.section-title`, `.news-card`, `.news-img`, `.news-content`, `.friends-sidebar`, `.mods-container`, `.mp-wizard-header`, `.modpack-detail`, `.modpack-item`, `.mp-scroll-area`, `.browser-sidebar`, `.mod-browser-header*`, `.provider-pill*`, `.mod-browser-close`, `.mod-browser-results`, `.mod-result-card*`, `.mod-result-icon`, `.mod-result-info strong`, `.add-mod-btn`, `.browser-search-bar`, `.browser-pagination-bar`, `.browser-filter-section`, `.browser-filter-pill`, `.browser-filter-options`, `.trending-modpacks-grid`, `.custom-select-wrapper`, `.play-button-wrapper`, `.play-button`, `.stat-info h2`, `.modal-content`, `.mods-page-header`, `body[data-window-mode="restored"] .mp-wizard-buttons .mp-action-btn.browse`, `body[data-window-mode="restored"] .modpack-header-actions .mp-action-btn.play`, `:root`.
- **Misplaced:** None — this is the canonical responsive file.
- **Missing:** Should receive the scattered media queries from `layout.css` (`@media (min-width: 1280px)`), `modpacks.css` (`@media (max-width: 900px)`), `downloads.css` (5 media queries), `profile.css` (4 media queries), `modals.css` (3 media queries), `advanced/settings.css` (`@media (max-width: 720px)`), `advanced/glass-system.css` (`@media (max-width: 980px)`).
- **Notes:** The project is inconsistent — some components co-locate their media queries, others rely on `responsive.css`. Pick one convention and apply it project-wide.

---

### 23. `advanced/shell.css` (486 lines)

- **Purpose (intended):** `body.ui-advanced` top bar / nav overrides.
- **Purpose (actual):** Dumping ground for advanced settings, profile, and main-view overrides that have nothing to do with the shell.
- **Selectors:** `.advanced-settings`, `.bg-effects-canvas`, `body[data-bg-effect]:not([data-bg-effect="none"]) .view`, `.details-section`, `.mod-browser`, `.profile-main-stage::before` (MISPLACED), `.profile-stage-grid` (MISPLACED), `svg[stroke="#4cb837"]` (MISPLACED), `.settings-subgroup*` (MISPLACED), `.settings-subgroup-heading*` (MISPLACED), `.ui-mode-grid` (MISPLACED), `.ui-mode-card*` (MISPLACED — base styles should be in `settings.css`), `.theme-choice-swatch` (MISPLACED), `.advanced-home-player` (MISPLACED — belongs in `advanced/main-view.css`), then `body.ui-advanced .top-bar*`, `.top-bar-left*`, `.top-brand*`, `.brand-mark*`, `.brand-word*`, `.top-bar-right`, `.header-nav`, `.brand-title`, `.nav-tabs*`, `.nav-tab*`, `.window-controls*`, `.user-profile*`, `.friends-toggle-btn`, `.view`, `#view-login` — these are the actual shell selectors.
- **Misplaced (MAJOR):**
  - **`.advanced-settings`** → **`advanced/settings.css`** (it's the settings panel wrapper).
  - **`.bg-effects-canvas`** → **`advanced/main-view.css`** (it's the background effects canvas; could also go in a new `advanced/background-effects.css`).
  - **`body[data-bg-effect]:not([data-bg-effect="none"]) .view`**, **`.details-section`**, **`.mod-browser`** (lines 52–65) → **`advanced/glass-system.css`** (these are background-effect glass overrides).
  - **`.profile-main-stage::before`**, **`.profile-stage-grid`** (lines 72–105) → **`advanced/profile.css`**.
  - **`svg[stroke="#4cb837"]`** (line 106) — global selector for theme-colored SVGs. **Belongs in `advanced/theme-moods.css`** (it's a theme override) or `tokens.css` (as a global rule). 
  - **`.settings-subgroup`**, **`.settings-subgroup-heading`**, **`.settings-subgroup-heading span`**, **`.settings-subgroup-heading small`** (lines 111–140) → **`advanced/settings.css`** (or `settings.css` base if they're used in both modes).
  - **`.ui-mode-grid`**, **`.ui-mode-card`**, **`.ui-mode-card:hover`**, `.ui-mode-card.active`, `.ui-mode-card strong`, `.ui-mode-card span` (lines 141–198) → **`settings.css`** (base styles; they're used in the classic settings General tab too — HTML line 413).
  - **`.theme-choice-swatch`** (line 199) → **`settings.css`** (used in classic theme picker).
  - **`.advanced-home-player`** (line 215) → **`advanced/main-view.css`**.
- **Missing:** None.

---

### 24. `advanced/main-view.css` (670 lines)

- **Purpose:** `body.ui-advanced #view-main` overrides.
- **Selectors:** `body.ui-advanced #view-main`, `.main-hero-banner*`, `.mc-logo`, `.main-center`, `.advanced-home-player*`, `.advanced-home-username*`, `.advanced-home-skin-viewer-wrapper*`, `.advanced-home-skin-loading*`, `.main-hero-banner .bottom-bar`, `.manage-mods-button`, `.controls-right`, `.play-container`, `.force-update-container`, `.play-button-wrapper`, `.play-dropdown-trigger*`, `.play-button*` (many), `.play-dropdown*` (many), `.play-dd-*` (many), `.details-section`, `.details-content`, `.stats-grid`, `.section-header`, `.section-title`, `.section-decoration`, `.news-grid`, **(MISPLACED)** `.mod-result-card`, `.trending-mp-card*`, `.trending-mp-thumb*`, `.trending-mp-info`, `.installed-mod-card`, `.mod-result-card:hover`, `.mod-result-icon`, `.mod-result-info strong`, `.mod-result-info > span`, `.mod-result-meta`, `.mod-result-info`, `.mod-result-card .add-mod-btn`, `.mod-result-card` (duplicate), `.news-img`, `.news-content`.
- **Misplaced:**
  - **`body.ui-advanced .mod-result-card`** and all `.mod-result-*` variants (lines 532–655) → **`advanced/modpacks.css`** (these are modpack-view selectors — the mod browser lives in `#view-mods`).
  - **`body.ui-advanced .trending-mp-card`**, `.trending-mp-thumb`, `.trending-mp-thumb-fallback`, `.trending-mp-info` (lines 544–583) → **`advanced/modpacks.css`** (modpacks trending section).
  - **`body.ui-advanced .installed-mod-card`** (line 583) → **`advanced/modpacks.css`** (modpacks installed mods list).
- **Missing:** Should receive `.advanced-home-player` from `advanced/shell.css`.

---

### 25. `advanced/modpacks.css` (641 lines)

- **Purpose:** `body.ui-advanced #view-mods` overrides.
- **Selectors:** **(MISPLACED)** `body.ui-advanced #view-profile`, `body.ui-advanced[data-bg-effect="particles"] #view-profile`, `body.ui-advanced[data-bg-effect="particles"]`, `body.ui-advanced[data-bg-effect="particles"] .bg-overlay`, `body.ui-advanced .profile-page`, `body.ui-advanced .settings-content-wrapper` (×2), `body.ui-advanced .profile-page-content`, `body.ui-advanced .settings-tab-bar`, `.settings-tab-bar::-webkit-scrollbar`, `body.ui-advanced .mods-page-header h2.view-title`, `body.ui-advanced .view-title::before`, `body.ui-advanced .no-modpack-msg*`, `body.ui-advanced .section-title::before`, `body.ui-advanced .mods-page-header`, `body.ui-advanced .friends-share-btn` (MISPLACED — friends), `body.ui-advanced .mem-preset-btn*` (MISPLACED — settings), `body.ui-advanced .mp-action-btn.icon-btn*`, `.mp-action-btn.play*`, `.add-mod-btn*`, `.mods-container`, `.modpacks-sidebar*`, `.mp-list-section-header*`, `.modpack-item*`, `body.ui-advanced .ui-mode-card` (MISPLACED — settings), `.mp-tab*`, `.mp-tabs`, `.mp-scroll-area`, `.mod-browser-results`, `.mod-result-card`, `.mod-browser-header h3`, `.mp-tab.active`, `.mod-browser`, `.mod-browser-header`, `.mod-browser-header-actions .provider-pill-group*`, `.mod-browser-header-actions`, `.browser-search-bar`, `.browser-sidebar`, `.browser-filter-section`, `.browser-filter-title`, `.browser-filter-pill*`, `.browser-filter-section .clean-select`, `.browser-filter-clear*`, `.browser-results`, `.browser-filter-options`, `.mods-header-actions`, `.mp-wizard-buttons*`, `.browser-pagination-bar`, `.browser-page-info-lg` (×2), `body.ui-advanced #view-main` (MISPLACED — main view), `body.ui-advanced #view-main::before` (MISPLACED), `body.ui-advanced .mods-page-header` (duplicate), `.mods-container` (duplicate), `.modpacks-sidebar-header .sidebar-label`, `.modpack-item.active`, `.mp-list-section-header` (duplicate), `.browser-page-btn*`, `.browser-page-info*`, `.mp-tab.active` (duplicate), `.modpack-detail .modpack-content-header`, `.modpack-detail .mp-tabs`, `.mp-stat*`, `.pose-selector`, `.pose-btn*`.
- **Misplaced:**
  - **`body.ui-advanced #view-profile`** (line 23) → **`advanced/profile.css`**.
  - **`body.ui-advanced[data-bg-effect="particles"] #view-profile`** (line 39) → **`advanced/profile.css`** or **`advanced/glass-system.css`**.
  - **`body.ui-advanced[data-bg-effect="particles"]`** (line 46) → **`advanced/glass-system.css`**.
  - **`body.ui-advanced[data-bg-effect="particles"] .bg-overlay`** (line 53) → **`advanced/glass-system.css`**.
  - **`body.ui-advanced .profile-page`** (line 59) → **`advanced/profile.css`**.
  - **`body.ui-advanced .settings-content-wrapper`** (lines 66, 80) → **`advanced/settings.css`**.
  - **`body.ui-advanced .settings-tab-bar`** + `::-webkit-scrollbar` (lines 87, 93) → **`advanced/settings.css`**.
  - **`body.ui-advanced .friends-share-btn`** (line 137) → **`advanced/friends.css`** (it's the friends share button).
  - **`body.ui-advanced .mem-preset-btn:hover`**, **`.mem-preset-btn.active`** (lines 164, 171) → **`advanced/settings.css`** (memory presets are in the settings Performance tab).
  - **`body.ui-advanced .ui-mode-card`** (line 289) → **`advanced/settings.css`** (UI mode picker is in settings).
  - **`body.ui-advanced #view-main`** (line 510) and **`body.ui-advanced #view-main::before`** (line 517) → **`advanced/main-view.css`**.
- **Missing:** Should receive the modpack-related selectors currently in `advanced/main-view.css` (`.mod-result-card`, `.trending-mp-card*`, `.installed-mod-card`, `.mod-result-*`).

---

### 26. `advanced/settings.css` (947 lines)

- **Purpose:** `body.ui-advanced #view-settings` overrides + advanced-only controls.
- **Selectors:** `body.ui-advanced #view-settings`, `.settings-content_wrapper*`, `.settings-grid`, `.settings-section`, `.settings-subgroup-heading span`, `.skin-3d-toggle`, `.clean-select:focus`, `.memory-slider*`, `.advanced-settings`, `.advanced-tab-bar`, `.advanced-tab*` (many), `.advanced-tab-indicator`, `.advanced-tab-panel*`, `@keyframes advFadeIn`, `.adv-section*` (many), `.adv-select*`, `.accent-swatch-grid`, `.accent-swatch*` (many), `.accent-custom-row*`, `.accent-picker-input*` (many), `.accent-hex-label`, `.adv-toggles`, `.adv-toggle-row*` (many), `.adv-toggle-track*`, `.bg-effects-grid`, `.bg-effect-card*` (many), `.bg-effect-preview`, `.bg-none`, `.bg-matrix`, `.bg-nebula`, `.bg-liquid`, `@keyframes liquidPreview`, `.bg-starfield*`, `.bg-particles`, `.adv-slider-field*` (many), `.adv-slider*` (many), `.adv-slider-range`, `.adv-slider-group`, `.adv-slider-label`, `.adv-slider-value`, `.debug-terminal`, `.debug-line`, `.debug-actions`, `.adv-btn` (×2 — duplicate of later non-prefixed definition), `@media (max-width: 720px)`, then **(BASE, NOT body.ui-advanced-scoped)** `.adv-input-field`, `.adv-input-label`, `.adv-input*` (many), `.adv-btn*` (many), `.adv-action-row*`, `.adv-action-label*`, `.adv-open-dir-link*`, `#adv-launcher-theme-picker .theme-choice-card`, `#adv-toggles-wrap`, `body.ui-advanced .dashboard-banners-grid .support-banner`, `body.ui-advanced .main-hero-banner .featured-server-banner--compact*` (many).
- **Misplaced:** 
  - **`.adv-input-field`, `.adv-input-label`, `.adv-input`, `.adv-btn`, `.adv-action-row`, `.adv-action-label`, `.adv-open-dir-link`** (lines 660–830) — these are base (unscoped) styles for advanced-only components. They are correctly placed here (because the components only render when `body.ui-advanced`), but they pollute the global namespace. Consider scoping them all with `body.ui-advanced .adv-*` for safety. Not a hard "misplaced" — a refactor suggestion.
  - **`@media (max-width: 720px)`** (line 626) → **`responsive.css`** (or keep co-located — be consistent).
  - **`body.ui-advanced .main-hero-banner .featured-server-banner--compact*`** (lines 851–942) — these are advanced-mode overrides for the featured-server banner which lives in `#view-main`. The base styles for `.featured-server-banner` are currently in `friends.css` (misplaced) and should move to `main-view.css`. The advanced overrides here are correctly scoped to `body.ui-advanced .main-hero-banner`. Acceptable as-is, but **after** the friends.css → main-view.css migration, this stays consistent.
  - **`body.ui-advanced .dashboard-banners-grid .support-banner`** (line 846) — overrides for the support banner which lives in `advanced/settings.css` ABOUT tab. Correctly placed.
- **Missing:** Should receive `.advanced-settings` (currently in `advanced/shell.css`), `body.ui-advanced .settings-content_wrapper` overrides from `advanced/modpacks.css`, `body.ui-advanced .mem-preset-btn*` from `advanced/modpacks.css`, `body.ui-advanced .ui-mode-card` from `advanced/modpacks.css`, `.settings-subgroup*` from `advanced/shell.css`.

---

### 27. `advanced/profile.css` (922 lines)

- **Purpose:** `body.ui-advanced #view-profile` overrides.
- **Selectors:** (Massive list — see grep output.) Includes many duplicate-in-file definitions of `.profile-page-content`, `.profile-sidebar`, `.profile-main-stage`, `.profile-stage-*`, `.profile-stat-mini*`, `.profile-quick-action*`, `.profile-friend-*`, `#profile-btn-logout*`. Also `body.ui-advanced .download-current-item-text` (MISPLACED).
- **Misplaced:**
  - **`body.ui-advanced .download-current-item-text`** (line 673) → **`advanced/downloads.css`** (does not exist) — recommend creating it, OR moving this single rule into `downloads.css` itself (since advanced-mode overrides for a download element are conceptually a download-style concern).
- **Missing:** Should receive `body.ui-advanced #view-profile`, `body.ui-advanced[data-bg-effect="particles"] #view-profile`, `body.ui-advanced .profile-page` (currently in `advanced/modpacks.css`).
- **Notes:** This file has many in-file duplicates (the same `body.ui-advanced .profile-stat-mini*` etc. rules appear 3+ times). **Deduplicate aggressively.**

---

### 28. `advanced/friends.css` (180 lines)

- **Purpose:** `body.ui-advanced` friends chat overrides.
- **Selectors:** `body.ui-advanced .friends-chat-panel*`, `.friends-chat-header`, `.friends-chat-messages*` (and scrollbar pseudos), `.chat-message-row*` (many), `@keyframes fadeInUp`, `.chat-message-bubble*`, `.chat-message-time`, `.friends-chat-input-row*` (many), `.friends-chat-send-btn*`, `body.ui-advanced .confirm-modal-content` (MISPLACED — belongs in advanced/modals.css or advanced/shell.css), `body.ui-advanced .friends-sidebar`.
- **Misplaced:**
  - **`body.ui-advanced .confirm-modal-content`** (line 169) → no dedicated `advanced/modals.css` exists. Either (a) create one, or (b) leave here with a comment. Recommend creating `advanced/modals.css`.
- **Missing:** Should receive `body.ui-advanced .friends-share-btn` (currently in `advanced/modpacks.css`).

---

### 29. `advanced/glass-system.css` (87 lines)

- **Purpose:** Two-layer glass system for `body.ui-advanced[data-bg-effect]`.
- **Selectors:** `body.ui-advanced[data-bg-effect]:not([data-bg-effect="none"]) #view-main .main-hero-banner`, `.profile-main-stage`, `body.ui-advanced[data-bg-effect="particles"] .details-section`, `body.ui-advanced[data-bg-effect]:not([data-bg-effect="none"]):not([data-bg-effect="particles"]) .details-section`, `@media (max-width: 980px)`.
- **Misplaced:**
  - **`@media (max-width: 980px)`** (line 77) → **`responsive.css`** (or keep co-located if adopting the co-located convention).
- **Missing:** Should receive the glass `!important` overrides currently in `components/layout.css` (`body[data-bg-effect]:not([data-bg-effect="none"]) #view-*`, `html body[data-bg-effect]:not([data-bg-effect="none"]) .mods-content-wrapper`, `.settings-content-wrapper`, etc.) AND the glass overrides currently in `advanced/shell.css` (`body[data-bg-effect]:not([data-bg-effect="none"]) .view`, `.details-section`, `.mod-browser`).

---

### 30. `advanced/theme-moods.css` (92 lines)

- **Purpose:** Per-theme mood overrides for `body.ui-advanced`.
- **Selectors:** `body.ui-advanced[data-theme="emerald"] #view-main .main-hero-banner`, `body.ui-advanced[data-theme="amethyst"] #view-profile`, `body.ui-advanced[data-theme="ocean"] #view-profile`, `body.ui-advanced[data-theme="sunset"] #view-profile`, `body.ui-advanced[data-theme="custom"] #view-profile`.
- **Misplaced:** None — correctly placed.
- **Missing:** Could receive `svg[stroke="#4cb837"]` from `advanced/shell.css` (which is a global theme-color SVG selector).

---

## B. Migration Table

| Selector(s) | Current File | Correct File | Reason |
|---|---|---|---|
| `#view-idk-connect`, `#view-idk-connect .mods-content-wrapper`, `#friends-auth-panel` | `components/modpacks.css` | `components/idk-connect.css` | These are IDK Connect view selectors; the modpacks file owns `#view-mods` only. |
| `.mp-create-modal*`, `.mp-create-box*`, `.mp-settings-modal*`, `.mp-settings-box*`, `.mp-settings-header*`, `.mp-settings-close*`, `.mp-settings-content*`, `.mp-settings-section*`, `.mp-settings-actions` | `components/modpacks.css` | `components/modals.css` | Project convention: "all modal dialogs in modals.css". |
| `.icon-picker*`, `.icon-picker-placeholder*` | `components/modpacks.css` | `components/modals.css` | Used only inside mp-create-modal and mp-settings-modal. |
| `.clean-select`, `.clean-select:focus`, `.clean-select option` | `components/modpacks.css` | `components/forms.css` | Cross-cutting form control (used in modals, browser filters, settings). |
| `.pose-selector`, `.pose-btn*` | `components/modpacks.css` | `components/profile.css` | Pose buttons are in the profile skin viewer (HTML line 1188). |
| `.mp-dashboard-columns`, `.mp-quick-actions`, `.mp-action-card*`, `.mp-versions-section*`, `.mp-welcome-hero*`, `.mp-trending-section*`, `.mp-loading-placeholder`, `.mp-wizard-section`, `.mp-wizard-step`, `.mp-version-download-grid`, `.mp-version-download-item*`, `.mp-dl-btn*`, `.mp-dl-loader-badge` | `components/main-view.css` | `components/modpacks.css` | All live inside `#view-mods` (app-shell.js lines 1387–1445). |
| `.nav-tab:focus-visible` | `components/main-view.css` | `components/layout.css` (or `global-a11y-fixes.css`) | `.nav-tab` is owned by layout.css. |
| `.featured-server-banner*`, `.featured-server-info`, `.featured-server-icon`, `.featured-server-text`, `.featured-server-label`, `.featured-server-title`, `.featured-server-desc`, `.featured-server-action`, `.featured-join-btn*`, `.featured-server-banner--compact*` | `components/friends.css` | `components/main-view.css` | Featured server banner lives in `#view-main > .details-section` (app-shell.js line 286). |
| `.support-banner*` (15 selectors), `.support-donate-btn*`, `.btn-shine`, `@keyframes shine` | `components/friends.css` | `advanced/settings.css` | Support banner lives in `#view-settings > [data-adv-panel="about"]` (app-shell.js line 1096). |
| `.settings-panel*`, `.settings-header*`, `.settings-title`, `.settings-close-btn*`, `.settings-search-container`, `.settings-search-input*`, `.settings-content`, `.settings-sidebar`, `.settings-category-btn*`, `.settings-main`, `.settings-form-container`, `.settings-group`, `.settings-label-container`, `.settings-label`, `.settings-tooltip-icon`, `.settings-tooltip`, `.settings-input*`, `.settings-checkbox`, `.settings-number`, `.settings-description`, `.settings-footer`, `.settings-btn*`, `.settings-empty` | `components/downloads.css` | `components/settings.css` (or **delete** if dead code) | These are settings UI selectors. **Verify they're still used** — current settings view uses `.settings-tab-bar`/`.settings-page`/`.settings-row` instead. |
| `.delete-modal*`, `.delete-modal-content*`, `.delete-modal-checkbox*`, `.delete-modal-actions`, `.delete-modal-btn*` | `components/downloads.css` | `components/modals.css` | Delete modpack modal is a modal dialog. |
| `.performance-mode-grid`, `.performance-mode-card*` | `components/downloads.css` | `components/performance.css` | Performance-mode picker. |
| `body[data-launcher-performance="eco"] .hero-video`, `body[data-launcher-performance="eco"] .launch-spinner-gif`, `body[data-launcher-performance="eco"] .background-slider`, `body[data-launcher-performance="balanced"] .background-slider`, `body[data-launcher-performance="balanced"] .mc-logo` | `components/downloads.css` | `components/performance.css` | Performance-mode overrides. |
| `#a11y-live-region` | `components/downloads.css` | `components/base.css` (already defined there — remove duplicate) | Global a11y primitive. |
| `.launch-overlay`, `.launch-overlay.active`, `.launch-overlay-card`, `.launch-spinner-gif`, `.launch-status`, `.launch-bar`, `.launch-fill` | `components/modals.css` | `fixes.css` (or new `components/launch-overlay.css`) | `fixes.css` already defines the live versions; consolidate. |
| `.advanced-settings`, `.bg-effects-canvas` | `advanced/shell.css` | `advanced/settings.css` (`.advanced-settings`) and `advanced/main-view.css` (`.bg-effects-canvas`) | Not shell selectors. |
| `body[data-bg-effect]:not([data-bg-effect="none"]) .view`, `.details-section`, `.mod-browser` | `advanced/shell.css` | `advanced/glass-system.css` | Glass-system overrides. |
| `.profile-main-stage::before`, `.profile-stage-grid` | `advanced/shell.css` | `advanced/profile.css` | Profile selectors. |
| `svg[stroke="#4cb837"]` | `advanced/shell.css` | `advanced/theme-moods.css` | Theme-color SVG selector. |
| `.settings-subgroup*`, `.ui-mode-grid`, `.ui-mode-card*`, `.theme-choice-swatch` | `advanced/shell.css` | `components/settings.css` | Base styles used in BOTH classic and advanced settings. |
| `.advanced-home-player` | `advanced/shell.css` | `advanced/main-view.css` | Main-view selector. |
| `body.ui-advanced .mod-result-card*`, `.trending-mp-card*`, `.trending-mp-thumb*`, `.trending-mp-info`, `.installed-mod-card`, `.mod-result-icon`, `.mod-result-info*`, `.mod-result-meta`, `.mod-result-card .add-mod-btn` | `advanced/main-view.css` | `advanced/modpacks.css` | Modpack-view selectors. |
| `body.ui-advanced #view-profile`, `body.ui-advanced[data-bg-effect="particles"] #view-profile`, `body.ui-advanced .profile-page`, `body.ui-advanced .profile-page-content` | `advanced/modpacks.css` | `advanced/profile.css` | Profile selectors. |
| `body.ui-advanced[data-bg-effect="particles"]`, `body.ui-advanced[data-bg-effect="particles"] .bg-overlay` | `advanced/modpacks.css` | `advanced/glass-system.css` | Background-effect glass overrides. |
| `body.ui-advanced .settings-content_wrapper*`, `.settings-tab_bar*`, `.mem-preset_btn:hover`, `.mem-preset_btn.active`, `body.ui-advanced .ui-mode-card` | `advanced/modpacks.css` | `advanced/settings.css` | Settings selectors. |
| `body.ui-advanced .friends-share-btn` | `advanced/modpacks.css` | `advanced/friends.css` | Friends share button. |
| `body.ui-advanced #view-main`, `body.ui-advanced #view-main::before` | `advanced/modpacks.css` | `advanced/main-view.css` | Main-view selectors. |
| `body.ui-advanced .download-current-item-text` | `advanced/profile.css` | `components/downloads.css` (or new `advanced/downloads.css`) | Download selector. |
| `body.ui-advanced .confirm-modal-content` | `advanced/friends.css` | new `advanced/modals.css` | Modal selector. |
| `@media (min-width: 1280px)` (user-profile wide-window rule) | `components/layout.css` | `components/responsive.css` | Consolidate media queries. |
| `@media (max-width: 900px)` (modpack-content-header) | `components/modpacks.css` | `components/responsive.css` | Consolidate media queries. |
| `@media (max-width: 768px)`, `@media (max-width: 480px)`, `@media (prefers-contrast: more)`, `@media (prefers-reduced-motion: no-preference) and (min-width: 0px)` | `components/downloads.css` | `components/responsive.css` (size queries); `global-a11y-fixes.css` (a11y queries) | Consolidate. |
| `@media (max-width: 1180px)`, `@media (max-width: 980px)`, `@media (max-width: 720px)`, `@media (max-width: 520px)` | `components/profile.css` | `components/responsive.css` | Consolidate. |
| `@media (max-width: 640px)`, `@media (max-width: 768px)`, `@media (max-width: 480px)` | `components/modals.css` | `components/responsive.css` | Consolidate. |
| `@media (max-width: 720px)` | `advanced/settings.css` | `components/responsive.css` | Consolidate. |
| `@media (max-width: 980px)` | `advanced/glass-system.css` | `components/responsive.css` | Consolidate. |

### Duplicates Within Single Files (Deduplicate)

| File | Duplicate Selectors |
|---|---|
| `components/layout.css` | `.top-bar-left`, `.top-brand`, `.brand-title`, `.nav-tabs`, `.nav-tab`, `.window-controls .ctrl` (each defined twice) |
| `components/modals.css` | `.custom-modal`, `.custom-modal.active`, `.modal-content`, `.modal-content h3`, `.modal-content p`, `.modal-btn`, `.modal-btn:hover`, `.modal-btn:active`, `.update-box`, `.update-icon`, `.update-notes-container`, `.modal-icon`, `.updates-card` (each defined twice) |
| `components/downloads.css` | `.download-progress-container*`, `.download-status-text`, `.download-progress-bar-wrapper`, `.progress-bar-*`, `.download-metrics*`, `.download-metric*`, `.download-current-item-text`, `.download-error_display*`, `.download-control-btn*` (defined 3x) |
| `components/profile.css` | `.profile-stat-mini`, `.profile-quick-action`, `#profile-btn-logout`, `.profile-friends-empty`, `.profile-section_header`, `.profile-skin-loading`, `.pose-btn` |
| `components/idk-connect.css` | `.btn-connect-action` (defined twice) |
| `components/main-view.css` | `.play-button`, `.play-button-wrapper`, `.custom-select-trigger`, `.refresh-versions-btn`, `.section-header`, `.news-empty-state` (defined twice) |
| `components/modpacks.css` | `.modpack-item`, `.mp-action-card`, `.mp-action-btn`, `.trending-mp-card`, `.mp-item-icon`, `.version-tab`, `.mp-trending-section`, `.mp-action-btn.settings:hover`, `.mp-action-btn.icon-btn:hover`, `.mod-browser-close`, `.mod-browser-results`, `.mod-result-card` |
| `advanced/profile.css` | Many — `body.ui-advanced .profile-sidebar`, `.profile-stat-mini*`, `.profile-quick-action*`, `.profile-friend_*`, `#profile-btn-logout*` each defined 3+ times |
| `advanced/modpacks.css` | `.mods-page-header`, `.mods-container`, `.mp-list-section_header`, `.mp-tab.active`, `.browser-page-info-lg` |

---

## C. Recommended Actions

### C.1 Selector Moves (priority order)

**HIGH PRIORITY — Clear misplacements that break the file-purpose contract:**

1. Move `#view-idk-connect`, `#view-idk-connect .mods-content-wrapper`, `#friends-auth-panel` from `modpacks.css` → `idk-connect.css`.
2. Move entire `.support-banner*` family (~17 selectors) from `friends.css` → `advanced/settings.css`.
3. Move entire `.featured-server-banner*` family (~17 selectors) from `friends.css` → `main-view.css`.
4. Move `.mp-dashboard-columns`, `.mp-quick-actions`, `.mp-action-card`, `.mp-versions-section`, `.mp-welcome-hero`, `.mp-trending-section`, `.mp-wizard-section`, `.mp-version-download-grid` and all descendants from `main-view.css` → `modpacks.css`.
5. Move `.delete-modal*` family from `downloads.css` → `modals.css`.
6. Move `.performance-mode-grid`, `.performance-mode-card*`, and `body[data-launcher-performance="eco/balanced"] *` rules from `downloads.css` → `performance.css`.
7. Move `.mp-create-modal*`, `.mp-settings-modal*`, `.mp-settings-close*`, `.mp-settings-content*`, `.mp-settings-section*`, `.mp-settings-actions` from `modpacks.css` → `modals.css`.
8. Move `.pose-btn*` family from `modpacks.css` → `profile.css` (and remove the duplicate that's already there).
9. Move `body.ui-advanced #view-profile`, `.profile-page`, `.profile-page-content` from `advanced/modpacks.css` → `advanced/profile.css`.
10. Move `body.ui-advanced #view-main`, `#view-main::before` from `advanced/modpacks.css` → `advanced/main-view.css`.
11. Move `body.ui-advanced .mod-result-card*`, `.trending-mp-card*`, `.installed-mod-card`, `.mod-result-*` from `advanced/main-view.css` → `advanced/modpacks.css`.
12. Move `.advanced-settings`, `.bg-effects-canvas`, `.profile-main-stage::before`, `.profile-stage-grid`, `.advanced-home-player`, `.settings-subgroup*`, `.ui-mode-grid`, `.ui-mode-card*`, `.theme-choice-swatch` from `advanced/shell.css` → their respective owners.
13. Move glass overrides from `advanced/shell.css` (`body[data-bg-effect]:not([data-bg-effect="none"]) .view`, `.details-section`, `.mod-browser`) → `advanced/glass-system.css`.

**MEDIUM PRIORITY — Verify-then-move (may be dead code):**

14. Verify whether `.settings-panel`, `.settings-header`, `.settings-title`, `.settings-close-btn`, `.settings-search-input`, `.settings-content`, `.settings-sidebar`, `.settings-category-btn`, `.settings-main`, `.settings-form-container`, `.settings-group`, `.settings-label`, `.settings-tooltip`, `.settings-input`, `.settings-checkbox`, `.settings-number`, `.settings-footer`, `.settings-btn`, `.settings-empty` (in `downloads.css`) are still used. If yes, move to `settings.css`. If no, delete.
15. Move `.icon-picker*` from `modpacks.css` → `modals.css` (only used inside mp-create-modal and mp-settings-modal).
16. Move `.clean-select*` from `modpacks.css` → `forms.css` (cross-cutting form control; also populate the empty `forms.css` placeholder).
17. Move `.clean-input`, `.submit-btn` from `login.css` → `forms.css` / `buttons.css` (cross-cutting; used in many components).
18. Move `.launch-overlay*` family from `modals.css` → `fixes.css` (consolidate ownership since `fixes.css` is the canonical source for these rules).
19. Move `body.ui-advanced .download-current-item-text` from `advanced/profile.css` → `downloads.css` (or new `advanced/downloads.css`).
20. Move `body.ui-advanced .friends-share-btn` from `advanced/modpacks.css` → `advanced/friends.css`.
21. Move `body.ui-advanced .confirm-modal-content` from `advanced/friends.css` → new `advanced/modals.css`.
22. Move `svg[stroke="#4cb837"]` from `advanced/shell.css` → `advanced/theme-moods.css`.

**LOW PRIORITY — Co-locate or consolidate media queries (pick a convention):**

23. Move all scattered `@media` rules (in `layout.css`, `modpacks.css`, `downloads.css`, `profile.css`, `modals.css`, `main-view.css`, `advanced/settings.css`, `advanced/glass-system.css`) → `responsive.css` — **OR** adopt the opposite convention (co-locate all media queries with their component) and delete `responsive.css`. The current split is the worst of both worlds.

### C.2 Files to Delete (if empty placeholders stay empty)

- `components/buttons.css` (9 lines, empty) — **delete** unless populated per C.3.
- `components/forms.css` (9 lines, empty) — **delete** unless populated per C.3.
- `components/cards.css` (10 lines, empty) — **delete** unless populated per C.3.
- `components/utilities.css` (8 lines, empty) — **delete** (no clear purpose; `.sr-only` is in `base.css`, `.spinner` is in `global-a11y-fixes.css`).

If deleted, also remove their `@import` lines from `index.css`.

### C.3 Files to Populate (alternative to deletion)

If you choose to keep the empty placeholders, populate them as follows to fulfill their stated purpose:

- `components/buttons.css` — Move cross-cutting button base styles here: `button` element defaults, `.submit-btn`, `.modal-btn`, `.login-btn`, `.glass-btn`, `.adv-btn`, `.btn-connect-action`, `.btn-widget-action`, `.mp-action-btn`, `.ddp-btn`, `.friend-*-btn`, `.profile-quick-action` base definitions. **Risk:** breaks cascade order from the original monolithic `style.css`. Test thoroughly.
- `components/forms.css` — Move cross-cutting form controls here: `.clean-input`, `.clean-select`, `.custom-select-trigger`, `.custom-option`, `.glass-input`, `.glass-slider`, `.memory-slider`, `.adv-input`, `.widget-input`, `.settings-input`, `.pill-switch`, `.pill-switch-option`, `.tg-switch`, `.toggle-switch`, `.switch`.
- `components/cards.css` — Move cross-cutting card base styles here: `.stat-card`, `.news-card`, `.installed-mod-card`, `.mod-result-card`, `.trending-mp-card`, `.friend-card`, `.connect-profile-card`, `.connect-widget-card`, `.mp-action-card`, `.theme-choice-card`, `.ui-mode-card`, `.blur-choice-card`, `.bg-effect-card`, `.performance-mode-card`, `.accent-swatch`.
- `components/utilities.css` — Move `.spinner`, `@keyframes spin`, `.btn-shine`, `@keyframes shine`, and any other cross-cutting utility classes here.

### C.4 Files to Merge

- **`fixes.css` ← `modals.css` (launch-overlay rules only):** Consolidate `.launch-overlay*` ownership. `fixes.css` already owns the live versions.
- **`advanced/glass-system.css` ← `components/layout.css` (glass `!important` overrides only):** Move the two-layer glass system overrides (`body[data-bg-effect]:not([data-bg-effect="none"]) .view`, etc.) to consolidate glass-system ownership. **Caveat:** must preserve the `!important` cascade order — load `glass-system.css` early enough.
- **`advanced/glass-system.css` ← `advanced/shell.css` (glass overrides):** Move the 3 glass overrides currently in shell.css.

### C.5 New Files to Create

- **`advanced/modals.css`** — For `body.ui-advanced` modal overrides (currently `body.ui-advanced .confirm-modal-content` is misplaced in `advanced/friends.css`).
- **(Optional) `components/launch-overlay.css`** — If the launch-overlay system grows, split it out from `fixes.css`. Currently `fixes.css` is fine.
- **(Optional) `advanced/downloads.css`** — For `body.ui-advanced` overrides of download UI (currently `body.ui-advanced .download-current-item-text` is misplaced in `advanced/profile.css`).

### C.6 Refactor (deduplicate within files)

Apply the in-file deduplication table from Section B to:
- `components/layout.css` — 6 selectors defined twice.
- `components/modals.css` — 12 selectors defined twice.
- `components/downloads.css` — entire download UI defined 3 times (~400 redundant lines).
- `components/profile.css` — 7 selectors defined twice.
- `components/main-view.css` — 6 selectors defined twice.
- `components/modpacks.css` — 12 selectors defined twice.
- `components/idk-connect.css` — 1 selector defined twice.
- `advanced/profile.css` — many selectors defined 3+ times.

Estimated line reduction from deduplication alone: **~600–800 lines** across the project.

### C.7 Documentation Update

After reorganization, update the file-header comments in each CSS file to accurately reflect what it contains. Several current headers are inaccurate:
- `components/main-view.css` header says it contains `mp-dashboard-columns` etc. — these will move out.
- `components/modpacks.css` header doesn't mention that it (currently) holds `#view-idk-connect` and `#friends-auth-panel`.
- `components/downloads.css` header doesn't mention that it (currently) holds the settings panel, delete-modal, and performance picker.
- `components/friends.css` header doesn't mention the support-banner and featured-server-banner families.

---

## Summary of Impact

| Metric | Before | After (estimated) |
|---|---|---|
| Total CSS files | 30 | 26–28 (delete 2–4 empty placeholders) |
| Total CSS lines | ~17,000 | ~15,500 (dedup) → ~14,000 (dedup + migration cleanup) |
| Misplaced selectors | ~120 | 0 |
| In-file duplicate selector definitions | ~50 | 0 |
| Scattered media queries | 16+ | 0 (or all co-located — pick one convention) |
| Largest file (`components/downloads.css`) | 1714 lines | ~700 lines (after settings-panel/delete-modal/performance extraction + dedup) |
| Second largest (`components/modpacks.css`) | 1909 lines | ~1500 lines (after modal extraction) |
| Empty placeholder files | 4 | 0 (deleted or populated) |

**Recommended execution order:**
1. Verify dead code in `downloads.css` settings-panel selectors.
2. Deduplicate within each file (lowest risk, no cross-file impact).
3. Execute HIGH PRIORITY migrations one file pair at a time, testing the app after each move.
4. Execute MEDIUM PRIORITY migrations.
5. Decide on media-query convention and execute LOW PRIORITY migrations.
6. Delete or populate empty placeholder files.
7. Update file-header comments.
8. Update `index.css` `@import` list if any files are added/removed.
