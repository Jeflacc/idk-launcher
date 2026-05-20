export function createViewController() {
  const views = {
    login: document.getElementById('view-login'),
    main: document.getElementById('view-main'),
    settings: document.getElementById('view-settings'),
    mods: document.getElementById('view-mods'),
  };

  function switchView(viewName) {
    Object.values(views).forEach((view) => view?.classList.remove('active'));
    views[viewName]?.classList.add('active');
  }

  return { views, switchView };
}

export function initWindowControls() {
  if (!window.electronAPI) return;
  document.querySelector('.close')?.addEventListener('click', () => window.electronAPI.close());
  document.querySelector('.minimize')?.addEventListener('click', () => window.electronAPI.minimize());
  document.querySelector('.maximize')?.addEventListener('click', () => window.electronAPI.maximize());
}
