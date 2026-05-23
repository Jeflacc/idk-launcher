export function createViewController() {
  const views = {
    login: document.getElementById('view-login'),
    main: document.getElementById('view-main'),
    settings: document.getElementById('view-settings'),
    mods: document.getElementById('view-mods'),
    profile: document.getElementById('view-profile'),
  };

  let returnView = 'main';

  function getActiveViewName() {
    return Object.entries(views).find(([, el]) => el?.classList.contains('active'))?.[0] || 'main';
  }

  function switchView(viewName) {
    const current = getActiveViewName();
    if (current !== viewName && viewName !== 'login') {
      returnView = current === 'login' ? 'main' : current;
    }
    Object.values(views).forEach((view) => view?.classList.remove('active'));
    views[viewName]?.classList.add('active');
  }

  function getReturnView() {
    return returnView;
  }

  return { views, switchView, getReturnView, getActiveViewName };
}

export function initWindowControls() {
  if (!window.electronAPI) return;
  document.querySelector('.close')?.addEventListener('click', () => window.electronAPI.close());
  document.querySelector('.minimize')?.addEventListener('click', () => window.electronAPI.minimize());
  document.querySelector('.maximize')?.addEventListener('click', () => window.electronAPI.maximize());
}
