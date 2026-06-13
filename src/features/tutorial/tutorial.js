import './tutorial.css';

const TUTORIAL_KEY = 'idk_tutorial_modpack_manager_completed';

const tutorialSteps = [
  {
    target: '#btn-new-modpack',
    title: 'Welcome to Modpacks!',
    content: 'Start by creating your own modpack. You can pick your Minecraft version and Mod Loader easily.',
    position: 'bottom'
  },
  {
    target: '#btn-browse-modpacks',
    title: 'Discover Modpacks',
    content: 'Don\'t want to build from scratch? Browse and download thousands of pre-made modpacks from Modrinth and CurseForge.',
    position: 'bottom'
  },
  {
    target: '#btn-import-modpack',
    title: 'Import Zip',
    content: 'You can also import standard modpack zip files directly if you downloaded them manually.',
    position: 'bottom'
  },
  {
    target: '#modpack-content',
    title: 'Manage & Import',
    content: 'Once you select a modpack, you can add mods or resourcepacks here. \n\n💡 TIP: You can easily DRAG & DROP .jar or .zip files directly into this area to import them!',
    position: 'center'
  }
];

let currentStep = 0;
let overlayEl = null;
let backdropEl = null;
let highlightEl = null;
let tooltipEl = null;
let resizeHandler = null;

export function initTutorial() {
  // Check if tutorial is already completed
  if (localStorage.getItem(TUTORIAL_KEY) === 'true') {
    return;
  }
  
  // Wait a brief moment to ensure UI is fully rendered
  setTimeout(startTutorial, 500);
}

function startTutorial() {
  currentStep = 0;
  
  // Create DOM elements
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
  
  // Event Listeners
  tooltipEl.querySelector('.tutorial-btn-skip').addEventListener('click', endTutorial);
  tooltipEl.querySelector('.tutorial-btn-next').addEventListener('click', nextStep);
  
  // Update positioning on resize
  resizeHandler = () => renderStep();
  window.addEventListener('resize', resizeHandler);
  
  renderStep();
}

function renderStep() {
  if (currentStep >= tutorialSteps.length) {
    endTutorial();
    return;
  }
  
  const step = tutorialSteps[currentStep];
  const targetNode = document.querySelector(step.target);
  
  // If target doesn't exist or isn't visible, skip to next step
  if (!targetNode || targetNode.offsetParent === null) {
    currentStep++;
    renderStep();
    return;
  }
  
  const rect = targetNode.getBoundingClientRect();
  const padding = 8;
  
  // Update Highlight Box
  highlightEl.style.top = `${rect.top - padding}px`;
  highlightEl.style.left = `${rect.left - padding}px`;
  highlightEl.style.width = `${rect.width + padding * 2}px`;
  highlightEl.style.height = `${rect.height + padding * 2}px`;
  
  // Update Backdrop Cutout (Clip-path mask to create the hole)
  const cutTop = rect.top - padding;
  const cutBottom = rect.bottom + padding;
  const cutLeft = rect.left - padding;
  const cutRight = rect.right + padding;
  
  backdropEl.style.clipPath = `polygon(
    0% 0%, 0% 100%, ${cutLeft}px 100%, ${cutLeft}px ${cutTop}px,
    ${cutRight}px ${cutTop}px, ${cutRight}px ${cutBottom}px, 
    ${cutLeft}px ${cutBottom}px, ${cutLeft}px 100%, 100% 100%, 100% 0%
  )`;
  
  // Update Tooltip Content
  tooltipEl.querySelector('.tutorial-tooltip-title').textContent = step.title;
  tooltipEl.querySelector('.tutorial-tooltip-content').textContent = step.content;
  tooltipEl.querySelector('.tutorial-progress').textContent = `${currentStep + 1} / ${tutorialSteps.length}`;
  
  const nextBtn = tooltipEl.querySelector('.tutorial-btn-next');
  if (currentStep === tutorialSteps.length - 1) {
    nextBtn.textContent = 'Got it!';
  } else {
    nextBtn.textContent = 'Next';
  }
  
  // Position Tooltip
  positionTooltip(rect, step.position);
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
  
  // Keep tooltip inside window bounds
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
