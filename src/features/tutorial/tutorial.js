import './tutorial.css';
import { actions } from "../../core/app-state.js";

const TUTORIAL_KEY = 'idk_tutorial_completed_v2';

const tutorialSteps = [
  {
    target: '.nav-tab[data-target="main"]',
    title: 'Play Tab',
    content: 'This is your home base. Select your Minecraft version, mod loader, and hit PLAY to launch the game.',
    position: 'bottom',
    view: 'main'
  },
  {
    target: '#play-btn',
    title: 'Launch Button',
    content: 'Click here to launch Minecraft with your current setup. Use the dropdown arrow for more options like closing the launcher after the game starts.',
    position: 'top',
    view: 'main'
  },
  {
    target: '.nav-tab[data-target="mods"]',
    title: 'Modpacks Manager',
    content: 'Create, import, and manage your modpacks. Browse thousands of modpacks from Modrinth and CurseForge, or build your own from scratch.',
    position: 'bottom',
    view: 'mods'
  },
  {
    target: '.nav-tab[data-target="profile"]',
    title: 'Your Profile',
    content: 'View your Minecraft profile, change your skin, and check your account details here.',
    position: 'bottom',
    view: 'profile'
  },
  {
    target: '.nav-tab[data-target="settings"]',
    title: 'Settings',
    content: 'Customize the launcher appearance, blur intensity, themes, and manage your accounts.',
    position: 'bottom',
    view: 'settings'
  },
  {
    target: '#btn-friends-toggle',
    title: 'IDK Connect',
    content: 'Open IDK Connect to chat with friends, share your world over LAN, and manage your friend list.',
    position: 'bottom',
    view: 'main'
  }
];

let currentStep = 0;
let overlayEl = null;
let backdropEl = null;
let highlightEl = null;
let tooltipEl = null;
let resizeHandler = null;

export function initTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY) === 'true') {
    return;
  }

  setTimeout(startTutorial, 800);
}

function startTutorial() {
  currentStep = 0;

  overlayEl = document.createElement('div');
  overlayEl.className = 'tutorial-overlay';

  backdropEl = document.createElement('div');
  backdropEl.className = 'tutorial-backdrop';

  highlightEl = document.createElement('div');
  highlightEl.className = 'tutorial-highlight';

  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tutorial-tooltip';

  tooltipEl.innerHTML = `
    <h3 class="tutorial-tooltip-title"></h3>
    <p class="tutorial-tooltip-content"></p>
    <div class="tutorial-tooltip-footer">
      <span class="tutorial-progress"></span>
      <div>
        <button class="tutorial-btn tutorial-btn-skip">Skip Tour</button>
        <button class="tutorial-btn tutorial-btn-next">Next</button>
      </div>
    </div>
  `;

  overlayEl.appendChild(backdropEl);
  overlayEl.appendChild(highlightEl);
  overlayEl.appendChild(tooltipEl);
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target === backdropEl) {
      e.stopPropagation();
    }
  });

  const skipBtn = tooltipEl.querySelector('.tutorial-btn-skip');
  const nextBtn = tooltipEl.querySelector('.tutorial-btn-next');
  if (skipBtn) skipBtn.addEventListener('click', endTutorial);
  if (nextBtn) nextBtn.addEventListener('click', nextStep);

  resizeHandler = () => renderStep();
  window.addEventListener('resize', resizeHandler);

  renderStep();
}

function renderStep() {
  // Iterate (not recurse) so a long run of missing targets never overflows
  // the call stack. Bail out after a sane limit so a broken tutorial never
  // spins forever.
  let safety = tutorialSteps.length * 2 + 8;
  while (currentStep < tutorialSteps.length && safety-- > 0) {
    const step = tutorialSteps[currentStep];

    if (step.view && actions.switchView) {
      actions.switchView(step.view);
    }

    const targetNode = document.querySelector(step.target);

    if (!targetNode || targetNode.offsetParent === null) {
      currentStep++;
      continue;
    }

    // Found a valid target — render the tooltip and exit the loop.
    const rect = targetNode.getBoundingClientRect();
    const padding = 8;

    highlightEl.style.top = `${rect.top - padding}px`;
    highlightEl.style.left = `${rect.left - padding}px`;
    highlightEl.style.width = `${rect.width + padding * 2}px`;
    highlightEl.style.height = `${rect.height + padding * 2}px`;

    const cutTop = rect.top - padding;
    const cutBottom = rect.bottom + padding;
    const cutLeft = rect.left - padding;
    const cutRight = rect.right + padding;

    backdropEl.style.clipPath = `polygon(
      0% 0%, 0% 100%, ${cutLeft}px 100%, ${cutLeft}px ${cutTop}px,
      ${cutRight}px ${cutTop}px, ${cutRight}px ${cutBottom}px, 
      ${cutLeft}px ${cutBottom}px, ${cutLeft}px 100%, 100% 100%, 100% 0%
    )`;

    const titleEl = tooltipEl.querySelector('.tutorial-tooltip-title');
    const contentEl = tooltipEl.querySelector('.tutorial-tooltip-content');
    const progressEl = tooltipEl.querySelector('.tutorial-progress');
    const nextBtnEl = tooltipEl.querySelector('.tutorial-btn-next');
    if (titleEl) titleEl.textContent = step.title || '';
    if (contentEl) contentEl.textContent = step.content || '';
    if (progressEl) progressEl.textContent = `${currentStep + 1} / ${tutorialSteps.length}`;
    if (nextBtnEl) {
      nextBtnEl.textContent = (currentStep === tutorialSteps.length - 1) ? 'Got it!' : 'Next';
    }

    positionTooltip(rect, step.position);
    return;
  }

  // No valid target found in any remaining step — end the tutorial.
  endTutorial();
}

function positionTooltip(targetRect, position) {
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const margin = 16;

  let top = 0;
  let left = 0;

  if (position === 'center') {
    top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
    left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  } else if (position === 'bottom') {
    top = targetRect.bottom + margin;
    left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  } else if (position === 'top') {
    top = targetRect.top - tooltipRect.height - margin;
    left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  } else if (position === 'right') {
    top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
    left = targetRect.right + margin;
  }

  if (left < margin) left = margin;
  if (left + tooltipRect.width > window.innerWidth - margin) {
    left = window.innerWidth - tooltipRect.width - margin;
  }
  if (top < margin) top = margin;
  if (top + tooltipRect.height > window.innerHeight - margin) {
    top = window.innerHeight - tooltipRect.height - margin;
  }

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}

function nextStep() {
  currentStep++;
  renderStep();
}

function endTutorial() {
  localStorage.setItem(TUTORIAL_KEY, 'true');

  if (overlayEl) {
    overlayEl.style.opacity = '0';
    setTimeout(() => {
      if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
      }
      overlayEl = null;
    }, 300);
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
}
