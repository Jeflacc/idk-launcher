let canvas, ctx, animId, currentEffect = "none", currentIntensity = 50;
let width = 0, height = 0;
let particles = [], drops = [], stars = [], waves = [], blobs = [];
let time = 0;

function resize() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getIntensity() {
  const raw = getComputedStyle(document.body).getPropertyValue("--bg-intensity").trim();
  const val = parseFloat(raw);
  return isNaN(val) ? 0.5 : val;
}

// ── Matrix Rain ──
function initMatrix() {
  drops = [];
  const cols = Math.floor(width / 14);
  for (let i = 0; i < cols; i++) {
    drops[i] = Math.floor(Math.random() * -height / 14);
  }
}
function drawMatrix(intensity) {
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${14 * (0.5 + intensity)}px monospace`;
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
  for (let i = 0; i < drops.length; i++) {
    const char = chars[Math.floor(Math.random() * chars.length)];
    const alpha = 0.3 + Math.random() * 0.7 * intensity;
    ctx.fillStyle = `rgba(0, 255, 70, ${alpha})`;
    ctx.fillText(char, i * 14, drops[i] * 14);
    if (drops[i] * 14 > height && Math.random() < 0.025 * intensity) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

// ── Nebula Waves ──
function initNebula() {
  const count = 4 + Math.floor(getIntensity() * 4);
  waves = [];
  for (let i = 0; i < count; i++) {
    waves.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 80 + Math.random() * 200 * getIntensity(),
      hue: Math.random() * 360,
      hueSpeed: 0.1 + Math.random() * 0.3,
    });
  }
}
function drawNebula(intensity) {
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(0, 0, width, height);
  for (const w of waves) {
    w.x += w.vx;
    w.y += w.vy;
    w.hue = (w.hue + w.hueSpeed) % 360;
    if (w.x < -w.r) w.x = width + w.r;
    if (w.x > width + w.r) w.x = -w.r;
    if (w.y < -w.r) w.y = height + w.r;
    if (w.y > height + w.r) w.y = -w.r;
    const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
    grad.addColorStop(0, `hsla(${w.hue}, 80%, 50%, ${0.08 * intensity})`);
    grad.addColorStop(0.5, `hsla(${(w.hue + 30) % 360}, 70%, 40%, ${0.04 * intensity})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(w.x - w.r, w.y - w.r, w.r * 2, w.r * 2);
  }
}

// ── Liquid Chrome ──
function initLiquid() {
  blobs = [];
  const count = 5 + Math.floor(getIntensity() * 5);
  for (let i = 0; i < count; i++) {
    blobs.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 60 + Math.random() * 120,
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.01,
    });
  }
}
function drawLiquid(intensity) {
  ctx.fillStyle = "rgba(2,2,3,0.1)";
  ctx.fillRect(0, 0, width, height);
  const accRgb = getComputedStyle(document.body).getPropertyValue("--theme-accent-rgb").trim() || "76, 184, 55";
  for (const b of blobs) {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < -b.r) b.x = width + b.r;
    if (b.x > width + b.r) b.x = -b.r;
    if (b.y < -b.r) b.y = height + b.r;
    if (b.y > height + b.r) b.y = -b.r;
    const pulse = Math.sin(time * b.speed + b.phase) * 0.3 + 0.7;
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * pulse);
    grad.addColorStop(0, `rgba(${accRgb}, ${0.04 * intensity})`);
    grad.addColorStop(0.5, `rgba(${accRgb}, ${0.02 * intensity})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const rr = b.r * pulse * (0.8 + 0.2 * Math.sin(a * 3 + time * b.speed + b.phase));
      const px = b.x + Math.cos(a) * rr;
      const py = b.y + Math.sin(a) * rr;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

// ── Starfield ──
function initStarfield() {
  const count = 100 + Math.floor(getIntensity() * 200);
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 3,
      size: 0.5 + Math.random() * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.05,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
}
function drawStarfield(intensity) {
  ctx.fillStyle = "#020203";
  ctx.fillRect(0, 0, width, height);
  for (const s of stars) {
    const alpha = (0.3 + 0.7 * ((Math.sin(time * s.twinkleSpeed + s.twinklePhase) + 1) / 2)) * (0.5 + intensity * 0.5);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size * (0.5 + (1 - s.z)), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Particles ──
function initParticles() {
  const count = 30 + Math.floor(getIntensity() * 70);
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6 - 0.2,
      r: 1 + Math.random() * 3,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 0.5 + Math.random() * 0.5,
    });
  }
}
function drawParticles(intensity) {
  ctx.clearRect(0, 0, width, height);
  const accRgb = getComputedStyle(document.body).getPropertyValue("--theme-accent-rgb").trim() || "76, 184, 55";
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.002;
    if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
      p.x = Math.random() * width;
      p.y = height + 10;
      p.vx = (Math.random() - 0.5) * 0.6;
      p.vy = (Math.random() - 0.5) * 0.6 - 0.3;
      p.life = p.maxLife;
    }
    const alpha = p.life * intensity;
    ctx.fillStyle = `rgba(${accRgb}, ${alpha * 0.4})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── None ──
function drawNone() {
  ctx.clearRect(0, 0, width, height);
}

// ── Effect Registry ──
const effects = {
  none: { init: () => {}, draw: drawNone },
  matrix: { init: initMatrix, draw: drawMatrix },
  nebula: { init: initNebula, draw: drawNebula },
  liquid: { init: initLiquid, draw: drawLiquid },
  starfield: { init: initStarfield, draw: drawStarfield },
  particles: { init: initParticles, draw: drawParticles },
};

function startEffect(effect) {
  stopEffect();
  currentEffect = effect;
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  const def = effects[effect] || effects.none;
  if (typeof def.init === "function") {
    def.init();
  }
  function frame(now) {
    time = now * 0.001;
    const intensity = getIntensity();
    def.draw(intensity);
    animId = requestAnimationFrame(frame);
  }
  animId = requestAnimationFrame(frame);
}

function stopEffect() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}

export function initBackgroundEffects() {
  canvas = document.getElementById("bg-effects-canvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  if (!ctx) return;

  resize();
  window.addEventListener("resize", resize);

  const currentBgEffect = document.body.dataset.bgEffect || "none";
  startEffect(currentBgEffect);

  const observer = new MutationObserver(() => {
    const newEffect = document.body.dataset.bgEffect || "none";
    if (newEffect !== currentEffect) {
      startEffect(newEffect);
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-bg-effect"] });

  return () => {
    stopEffect();
    observer.disconnect();
    window.removeEventListener("resize", resize);
  };
}
