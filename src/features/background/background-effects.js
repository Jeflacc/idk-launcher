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
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
  const cols = Math.floor(width / 15);
  for (let i = 0; i < cols; i++) {
    const len = 6 + Math.floor(Math.random() * 14);
    const stream = [];
    for (let j = 0; j < len; j++) {
      stream.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    drops.push({
      stream,
      pos: -(len + Math.random() * 20),
      speed: 0.3 + Math.random() * 1.5,
      tick: 0,
    });
  }
}
function drawMatrix(intensity) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#030303";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "13px monospace";
  ctx.textBaseline = "top";
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
  const a = 0.2 + intensity * 0.8;
  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    d.pos += d.speed * a * 0.25;
    d.tick++;
    if (d.tick > 3 + Math.floor(Math.random() * 7)) {
      d.tick = 0;
      d.stream[Math.floor(Math.random() * d.stream.length)] = chars[Math.floor(Math.random() * chars.length)];
    }
    if (d.pos * 15 > height + 20) {
      const len = 6 + Math.floor(Math.random() * 14);
      const s = [];
      for (let j = 0; j < len; j++) s.push(chars[Math.floor(Math.random() * chars.length)]);
      d.stream = s;
      d.pos = -(len + Math.random() * 10);
      d.speed = 0.3 + Math.random() * 1.5;
    }
    const x = i * 15;
    for (let j = 0; j < d.stream.length; j++) {
      const y = (d.pos + j) * 15;
      if (y < -15 || y > height) continue;
      const t = j / d.stream.length;
      if (j === 0) {
        ctx.fillStyle = `rgba(210, 255, 220, ${a * 0.9})`;
      } else {
        const g = Math.floor(180 - t * 140);
        ctx.fillStyle = `rgba(0, ${g}, ${30 + Math.floor((1 - t) * 30)}, ${(1 - t * 0.7) * a * 0.5})`;
      }
      ctx.fillText(d.stream[j], x, y);
    }
  }
}

// ── Cosmic Veil ──
function initNebula() {
  const i = getIntensity();
  const count = 5 + Math.floor(i * 4);
  waves = [];
  const schemes = [
    { body: [270, 300], accent: [190, 220], warm: [20, 50] },
    { body: [240, 270], accent: [320, 350], warm: [30, 60] },
    { body: [200, 230], accent: [280, 310], warm: [10, 40] },
    { body: [320, 350], accent: [200, 230], warm: [25, 55] },
  ];
  const s = schemes[Math.floor(Math.random() * schemes.length)];
  for (let n = 0; n < count; n++) {
    const bh = s.body[0] + Math.random() * (s.body[1] - s.body[0]);
    const ah = s.accent[0] + Math.random() * (s.accent[1] - s.accent[0]);
    const wh = s.warm[0] + Math.random() * (s.warm[1] - s.warm[0]);
    const subs = [];
    for (let k = 0; k < 5 + Math.floor(Math.random() * 5); k++) {
      subs.push({
        ox: (Math.random() - 0.5) * 1.2,
        oy: (Math.random() - 0.5) * 1.2,
        sr: 0.2 + Math.random() * 0.5,
        sh: bh + (Math.random() - 0.5) * 30,
        sa: 0.4 + Math.random() * 0.6,
      });
    }
    const fils = [];
    for (let k = 0; k < 5 + Math.floor(Math.random() * 6); k++) {
      const ang = Math.random() * Math.PI * 2;
      fils.push({
        ang,
        len: 0.4 + Math.random() * 0.6,
        curl: (Math.random() - 0.5) * 0.8,
        w: 2 + Math.random() * 8,
        fa: 0.12 + Math.random() * 0.2,
      });
    }
    const dusts = [];
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      dusts.push({
        ox: (Math.random() - 0.5) * 0.8,
        oy: (Math.random() - 0.5) * 0.8,
        dr: 0.15 + Math.random() * 0.35,
        da: 0.08 + Math.random() * 0.12,
      });
    }
    const sc = 40 + Math.floor(Math.random() * 60);
    const seeds = [];
    for (let k = 0; k < sc; k++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.85;
      seeds.push({
        ox: Math.cos(ang) * dist,
        oy: Math.sin(ang) * dist,
        r: 0.3 + Math.random() * 1.5,
        br: 0.3 + Math.random() * 0.7,
        ph: Math.random() * Math.PI * 2,
        sp: 0.3 + Math.random() * 1.2,
        sh: Math.random() * 360,
        spike: Math.random() > 0.88,
      });
    }
    waves.push({
      x: Math.random() * width,
      y: Math.random() * height,
      tx: width * (0.2 + Math.random() * 0.6),
      ty: height * (0.2 + Math.random() * 0.6),
      r: 300 + Math.random() * 400,
      bodyHue: bh,
      accentHue: ah,
      warmHue: wh,
      drift: 0.00006 + Math.random() * 0.00012,
      pulseSpeed: 0.08 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      subs, fils, dusts, seeds,
    });
  }
}
function drawNebula(intensity) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.6);
  bg.addColorStop(0, "#070413");
  bg.addColorStop(1, "#010105");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const a = 0.2 + intensity * 0.8;
  for (const w of waves) {
    w.x += (w.tx - w.x) * w.drift;
    w.y += (w.ty - w.y) * w.drift;
    if (Math.abs(w.tx - w.x) < 20 && Math.abs(w.ty - w.y) < 20) {
      w.tx = width * (0.15 + Math.random() * 0.7);
      w.ty = height * (0.15 + Math.random() * 0.7);
    }
    const pulse = 0.85 + 0.15 * Math.sin(time * w.pulseSpeed + w.phase);
    const r = w.r * pulse;
    const ab = 0.22 * a;
    const mixedHue = (w.bodyHue * 0.6 + w.accentHue * 0.4);
    const outerHue = (mixedHue + w.warmHue) / 2;
    const gOuter = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, r * 1.4);
    gOuter.addColorStop(0, `hsla(${outerHue}, 45%, 18%, ${ab * 0.25})`);
    gOuter.addColorStop(0.4, `hsla(${outerHue + 15}, 35%, 12%, ${ab * 0.12})`);
    gOuter.addColorStop(1, "transparent");
    ctx.fillStyle = gOuter;
    ctx.fillRect(w.x - r * 1.4, w.y - r * 1.4, r * 2.8, r * 2.8);
    for (const sub of w.subs) {
      const sx = w.x + sub.ox * r;
      const sy = w.y + sub.oy * r;
      const sr = sub.sr * r * (0.8 + 0.2 * Math.sin(time * 0.05 + w.phase * 1.3));
      const g1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      g1.addColorStop(0, `hsla(${sub.sh}, 65%, 34%, ${ab * sub.sa})`);
      g1.addColorStop(0.35, `hsla(${sub.sh + 8}, 50%, 22%, ${ab * sub.sa * 0.45})`);
      g1.addColorStop(0.65, `hsla(${sub.sh + 18}, 40%, 14%, ${ab * sub.sa * 0.2})`);
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
    const ax = w.x + r * 0.22;
    const ay = w.y - r * 0.12;
    const ar = r * 0.55;
    const g2 = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
    g2.addColorStop(0, `hsla(${w.accentHue}, 78%, 48%, ${ab * 0.55})`);
    g2.addColorStop(0.25, `hsla(${w.accentHue + 10}, 60%, 30%, ${ab * 0.3})`);
    g2.addColorStop(0.55, `hsla(${w.accentHue + 22}, 45%, 18%, ${ab * 0.12})`);
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2;
    ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    for (const f of w.fils) {
      const ft = time * 0.02 + w.phase;
      const ang = f.ang + Math.sin(ft) * 0.15;
      const fl = f.len * r;
      const sx = w.x + Math.cos(ang) * r * 0.15;
      const sy = w.y + Math.sin(ang) * r * 0.15;
      const ex = w.x + Math.cos(ang + f.curl + Math.sin(ft * 0.7) * 0.2) * (r * 0.2 + fl);
      const ey = w.y + Math.sin(ang + f.curl + Math.sin(ft * 0.7) * 0.2) * (r * 0.2 + fl);
      const cx = (sx + ex) / 2 + Math.cos(ang + 1.5) * fl * 0.35;
      const cy = (sy + ey) / 2 + Math.sin(ang + 1.5) * fl * 0.35;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      const fa = f.fa * a * 0.5;
      const fh = w.accentHue + Math.sin(ft + f.ang) * 10;
      ctx.strokeStyle = `hsla(${fh}, 55%, 38%, ${fa})`;
      ctx.lineWidth = f.w * (0.5 + a * 0.5);
      ctx.lineCap = "round";
      ctx.stroke();
    }
    for (const d of w.dusts) {
      const dx = w.x + d.ox * r;
      const dy = w.y + d.oy * r;
      const dr = d.dr * r;
      const dd = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr);
      dd.addColorStop(0, `rgba(1, 0, 2, ${d.da * a})`);
      dd.addColorStop(1, "transparent");
      ctx.fillStyle = dd;
      ctx.fillRect(dx - dr, dy - dr, dr * 2, dr * 2);
    }
    for (const k of w.seeds) {
      const tw = 0.5 + 0.5 * Math.sin(time * k.sp + k.ph);
      const kx = w.x + k.ox * r;
      const ky = w.y + k.oy * r;
      const ka = k.br * a * 0.55 * tw;
      const kr = k.r * 1.5;
      ctx.fillStyle = `hsla(${k.sh}, 35%, 65%, ${ka * 0.12})`;
      ctx.beginPath();
      ctx.arc(kx, ky, kr * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${k.sh}, 25%, 80%, ${ka})`;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();
      if (k.spike && tw > 0.6) {
        const sk = ka * 0.5 * (tw - 0.6) * 2.5;
        ctx.strokeStyle = `hsla(${k.sh}, 15%, 90%, ${sk})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(kx - kr * 5, ky);
        ctx.lineTo(kx + kr * 5, ky);
        ctx.moveTo(kx, ky - kr * 5);
        ctx.lineTo(kx, ky + kr * 5);
        ctx.stroke();
      }
    }
  }
}

// ── Aurora ──
function initLiquid() {
  const i = getIntensity();
  const count = 4 + Math.floor(i * 4);
  blobs = [];
  const hues = [190, 210, 240, 270, 180, 220, 200, 250];
  for (let n = 0; n < count; n++) {
    blobs.push({
      y: height * (0.05 + Math.random() * 0.9),
      freq: 0.0015 + Math.random() * 0.0035,
      amp: 40 + Math.random() * 90,
      speed: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      thick: 25 + Math.random() * 35,
      hue: hues[n % hues.length] + (Math.random() - 0.5) * 20,
      alpha: 0.06 + Math.random() * 0.08,
      dir: Math.random() > 0.5 ? 1 : -1,
    });
  }
}
function drawLiquid(intensity) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#05030c");
  bg.addColorStop(0.5, "#030206");
  bg.addColorStop(1, "#010104");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const a = 0.2 + intensity * 0.8;
  for (const b of blobs) {
    const amp = b.amp * (0.5 + a * 0.5);
    const thick = b.thick * (0.5 + a * 0.5);
    const t = time * b.speed * b.dir;
    ctx.beginPath();
    for (let x = -2; x <= width + 2; x += 2) {
      const wy = b.y + Math.sin(x * b.freq + t + b.phase) * amp;
      if (x === -2) ctx.moveTo(x, wy - thick * 0.5);
      ctx.lineTo(x, wy - thick * 0.5);
    }
    for (let x = width + 2; x >= -2; x -= 2) {
      const wy = b.y + Math.sin(x * b.freq + t + b.phase) * amp;
      ctx.lineTo(x, wy + thick * 0.5);
    }
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, b.y - amp - thick, 0, b.y + amp + thick);
    const al = b.alpha * a;
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.35, `hsla(${b.hue}, 60%, 40%, ${al * 0.4})`);
    grad.addColorStop(0.45, `hsla(${b.hue + 5}, 70%, 55%, ${al * 0.8})`);
    grad.addColorStop(0.5, `hsla(${b.hue + 2}, 80%, 65%, ${al})`);
    grad.addColorStop(0.55, `hsla(${b.hue - 5}, 65%, 50%, ${al * 0.7})`);
    grad.addColorStop(0.65, `hsla(${b.hue - 10}, 50%, 35%, ${al * 0.3})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ── Stellar Depth ──
function initStarfield() {
  const i = getIntensity();
  const count = 200 + Math.floor(i * 400);
  stars = [];
  for (let n = 0; n < count; n++) {
    const layer = Math.random();
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: layer,
      size: 0.2 + layer * 2.2,
      twinkleSpeed: 0.3 + Math.random() * 1.5 * (0.5 + layer),
      twinklePhase: Math.random() * Math.PI * 2,
      hue: layer > 0.7 ? 30 + Math.random() * 40 : 210 + Math.random() * 50,
      sat: layer > 0.7 ? 20 + Math.random() * 30 : 10 + Math.random() * 20,
    });
  }
}
function drawStarfield(intensity) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.6);
  bg.addColorStop(0, "#05040c");
  bg.addColorStop(1, "#010105");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const a = 0.2 + intensity * 0.8;
  for (const s of stars) {
    const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase));
    const alpha = twinkle * a * (0.3 + s.z * 0.7);
    const size = s.size * 0.5;
    if (s.z > 0.5) {
      ctx.fillStyle = `hsla(${s.hue + Math.sin(time * 0.15) * 3}, ${s.sat}%, 60%, ${alpha * 0.06})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${70 + 20 * s.z}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Dust ──
function initParticles() {
  const i = getIntensity();
  const count = 80 + Math.floor(i * 170);
  particles = [];
  for (let n = 0; n < count; n++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.3 + Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
    });
  }
}
function drawParticles(intensity) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#010105";
  ctx.fillRect(0, 0, width, height);
  const a = 0.2 + intensity * 0.8;
  for (const p of particles) {
    p.x += (Math.random() - 0.5) * 0.4;
    p.y += (Math.random() - 0.5) * 0.4;
    if (p.x < -5) p.x = width + 5;
    if (p.x > width + 5) p.x = -5;
    if (p.y < -5) p.y = height + 5;
    if (p.y > height + 5) p.y = -5;
    const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * p.speed + p.phase));
    const alpha = twinkle * a * 0.35;
    ctx.fillStyle = `rgba(180, 200, 230, ${alpha * 0.1})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(210, 225, 250, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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
