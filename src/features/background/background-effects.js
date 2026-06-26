let canvas, ctx, animId, currentEffect = "none", currentIntensity = 50;
let width = 0, height = 0;
let particles = [], drops = [], stars = [], waves = [], blobs = [];
let time = 0;
let bgConfig = {};

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

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem("idk_bg_config") || "{}");
  } catch { return {}; }
}
function saveConfig(cfg) {
  localStorage.setItem("idk_bg_config", JSON.stringify(cfg));
}

// ══════════════════════════════════════════════════════════════
// ── Matrix Rain ──
// ══════════════════════════════════════════════════════════════
function initMatrix() {
  drops = [];
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
  const cols = Math.floor(width / 15);
  for (let i = 0; i < cols; i++) {
    const len = 6 + Math.floor(Math.random() * 14);
    const stream = [];
    for (let j = 0; j < len; j++) stream.push(chars[Math.floor(Math.random() * chars.length)]);
    drops.push({ stream, pos: -(len + Math.random() * 20), speed: 0.3 + Math.random() * 1.5, tick: 0 });
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

// ══════════════════════════════════════════════════════════════
// ── Nebula (Hubble-style cosmic gas clouds) ──
// ══════════════════════════════════════════════════════════════
function initNebula() {
  bgConfig = getConfig();
  const i = getIntensity();
  const count = 2 + Math.floor(i * 2);
  waves = [];
  const schemes = [
    { name: "Orion", colors: [[180, 65, 35], [210, 55, 30], [340, 50, 28], [20, 45, 25]], dust: [260, 15, 8] },
    { name: "Crab", colors: [[10, 60, 32], [30, 55, 28], [45, 50, 25], [0, 45, 22]], dust: [240, 12, 7] },
    { name: "Eagle", colors: [[320, 55, 30], [280, 50, 28], [200, 45, 25], [350, 50, 27]], dust: [250, 10, 6] },
    { name: "Helix", colors: [[190, 60, 33], [170, 50, 28], [220, 55, 30], [160, 40, 24]], dust: [230, 12, 7] },
  ];
  const scheme = schemes[bgConfig.nebulaScheme || 0] || schemes[0];
  for (let n = 0; n < count; n++) {
    const ci = n % scheme.colors.length;
    const [h, s, l] = scheme.colors[ci];
    const layers = [];
    for (let k = 0; k < 6 + Math.floor(Math.random() * 4); k++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.6;
      layers.push({
        ox: Math.cos(ang) * dist,
        oy: Math.sin(ang) * dist,
        r: 0.3 + Math.random() * 0.6,
        h: h + (Math.random() - 0.5) * 20,
        s: s + (Math.random() - 0.5) * 15,
        l: l + (Math.random() - 0.5) * 10,
        a: 0.06 + Math.random() * 0.1,
      });
    }
    const dustBands = [];
    for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) {
      const ang = Math.random() * Math.PI * 2;
      dustBands.push({
        ang,
        ox: (Math.random() - 0.5) * 0.5,
        oy: (Math.random() - 0.5) * 0.5,
        w: 0.08 + Math.random() * 0.15,
        len: 0.4 + Math.random() * 0.4,
        a: 0.04 + Math.random() * 0.06,
      });
    }
    const embeddedStars = [];
    for (let k = 0; k < 15 + Math.floor(Math.random() * 20); k++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * 0.7;
      embeddedStars.push({
        ox: Math.cos(ang) * dist,
        oy: Math.sin(ang) * dist,
        r: 0.3 + Math.random() * 1.2,
        br: 0.15 + Math.random() * 0.4,
        ph: Math.random() * Math.PI * 2,
        sp: 0.15 + Math.random() * 0.6,
      });
    }
    waves.push({
      x: Math.random() * width,
      y: Math.random() * height,
      tx: width * (0.2 + Math.random() * 0.6),
      ty: height * (0.2 + Math.random() * 0.6),
      r: 200 + Math.random() * 300,
      hue: h, sat: s, light: l,
      dustHue: scheme.dust[0], dustSat: scheme.dust[1], dustL: scheme.dust[2],
      drift: 0.00003 + Math.random() * 0.00005,
      pulseSpeed: 0.03 + Math.random() * 0.06,
      phase: Math.random() * Math.PI * 2,
      layers, dustBands, embeddedStars,
      rotSpeed: (Math.random() - 0.5) * 0.0003,
      rot: Math.random() * Math.PI * 2,
    });
  }
}
function drawNebula(intensity) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
  bg.addColorStop(0, "#0a0618");
  bg.addColorStop(0.5, "#05030e");
  bg.addColorStop(1, "#010106");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const a = 0.2 + intensity * 0.8;
  for (const w of waves) {
    w.x += (w.tx - w.x) * w.drift;
    w.y += (w.ty - w.y) * w.drift;
    if (Math.abs(w.tx - w.x) < 10 && Math.abs(w.ty - w.y) < 10) {
      w.tx = width * (0.15 + Math.random() * 0.7);
      w.ty = height * (0.15 + Math.random() * 0.7);
    }
    w.rot += w.rotSpeed;
    const pulse = 0.92 + 0.08 * Math.sin(time * w.pulseSpeed + w.phase);
    const r = w.r * pulse;
    const outerG = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, r * 1.6);
    outerG.addColorStop(0, `hsla(${w.hue}, ${w.sat * 0.4}%, ${w.light * 0.5}%, ${0.04 * a})`);
    outerG.addColorStop(0.5, `hsla(${w.hue + 5}, ${w.sat * 0.3}%, ${w.light * 0.3}%, ${0.02 * a})`);
    outerG.addColorStop(1, "transparent");
    ctx.fillStyle = outerG;
    ctx.fillRect(w.x - r * 1.6, w.y - r * 1.6, r * 3.2, r * 3.2);
    for (const l of w.layers) {
      const lx = w.x + l.ox * r * Math.cos(w.rot) - l.oy * r * Math.sin(w.rot);
      const ly = w.y + l.ox * r * Math.sin(w.rot) + l.oy * r * Math.cos(w.rot);
      const lr = l.r * r * (0.9 + 0.1 * Math.sin(time * 0.03 + w.phase + l.ox * 2));
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
      g.addColorStop(0, `hsla(${l.h}, ${l.s}%, ${l.l}%, ${l.a * a})`);
      g.addColorStop(0.3, `hsla(${l.h + 3}, ${l.s - 5}%, ${l.l - 4}%, ${l.a * a * 0.6})`);
      g.addColorStop(0.6, `hsla(${l.h + 6}, ${l.s - 12}%, ${l.l - 10}%, ${l.a * a * 0.2})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
    }
    for (const d of w.dustBands) {
      const dx = w.x + d.ox * r;
      const dy = w.y + d.oy * r;
      const dLen = d.len * r;
      const dW = d.w * r;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(d.ang + Math.sin(time * 0.01 + w.phase) * 0.05);
      const dg = ctx.createLinearGradient(0, -dW, 0, dW);
      dg.addColorStop(0, "transparent");
      dg.addColorStop(0.3, `hsla(${w.dustHue}, ${w.dustSat}%, ${w.dustL}%, ${d.a * a})`);
      dg.addColorStop(0.5, `hsla(${w.dustHue}, ${w.dustSat + 5}%, ${w.dustL + 3}%, ${d.a * a * 1.2})`);
      dg.addColorStop(0.7, `hsla(${w.dustHue}, ${w.dustSat}%, ${w.dustL}%, ${d.a * a})`);
      dg.addColorStop(1, "transparent");
      ctx.fillStyle = dg;
      ctx.fillRect(-dLen, -dW, dLen * 2, dW * 2);
      ctx.restore();
    }
    const coreR = r * 0.25;
    const coreG = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, coreR);
    coreG.addColorStop(0, `hsla(${w.hue + 10}, ${w.sat + 10}%, ${w.light + 15}%, ${0.15 * a})`);
    coreG.addColorStop(0.5, `hsla(${w.hue + 5}, ${w.sat}%, ${w.light + 5}%, ${0.05 * a})`);
    coreG.addColorStop(1, "transparent");
    ctx.fillStyle = coreG;
    ctx.fillRect(w.x - coreR, w.y - coreR, coreR * 2, coreR * 2);
    for (const s of w.embeddedStars) {
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.sp + s.ph));
      const sx = w.x + s.ox * r;
      const sy = w.y + s.oy * r;
      const sa = s.br * a * 0.5 * tw;
      ctx.fillStyle = `hsla(210, 20%, 80%, ${sa * 0.08})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(200, 15%, 85%, ${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ══════════════════════════════════════════════════════════════
// ── Liquid Chrome ──
// ══════════════════════════════════════════════════════════════
function initLiquid() {
  bgConfig = getConfig();
  const i = getIntensity();
  const count = 5 + Math.floor(i * 4);
  blobs = [];
  const schemeIdx = bgConfig.liquidScheme || 0;
  const hueBases = [190, 260, 330, 160];
  const baseHue = hueBases[schemeIdx] || 190;
  for (let n = 0; n < count; n++) {
    blobs.push({
      y: height * (0.05 + Math.random() * 0.9),
      freq: 0.001 + Math.random() * 0.003,
      amp: 30 + Math.random() * 80,
      speed: 0.08 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      thick: 20 + Math.random() * 30,
      hueBase: baseHue + (Math.random() - 0.5) * 60,
      alpha: 0.05 + Math.random() * 0.07,
      dir: Math.random() > 0.5 ? 1 : -1,
      waveDecay: 0.3 + Math.random() * 0.7,
      harmonics: 2 + Math.floor(Math.random() * 2),
      iriSpeed: 0.15 + Math.random() * 0.3,
      shimmer: 0.3 + Math.random() * 0.7,
    });
  }
}
function drawLiquid(intensity) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#06040e");
  bg.addColorStop(0.4, "#040208");
  bg.addColorStop(1, "#010104");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const a = 0.2 + intensity * 0.8;
  for (const b of blobs) {
    const amp = b.amp * (0.5 + a * 0.5);
    const thick = b.thick * (0.5 + a * 0.5);
    const t = time * b.speed * b.dir;
    const iriShift = time * b.iriSpeed;
    ctx.beginPath();
    for (let x = -2; x <= width + 2; x += 2) {
      let wy = b.y + Math.sin(x * b.freq + t + b.phase) * amp;
      wy += Math.sin(x * b.freq * 2.3 + t * 1.4 + b.phase) * amp * 0.15 * b.waveDecay;
      if (b.harmonics > 1) wy += Math.sin(x * b.freq * 0.5 + t * 0.6 + b.phase * 1.7) * amp * 0.25;
      if (x === -2) ctx.moveTo(x, wy - thick * 0.5);
      ctx.lineTo(x, wy - thick * 0.5);
    }
    for (let x = width + 2; x >= -2; x -= 2) {
      let wy = b.y + Math.sin(x * b.freq + t + b.phase) * amp;
      wy += Math.sin(x * b.freq * 2.3 + t * 1.4 + b.phase) * amp * 0.15 * b.waveDecay;
      if (b.harmonics > 1) wy += Math.sin(x * b.freq * 0.5 + t * 0.6 + b.phase * 1.7) * amp * 0.25;
      ctx.lineTo(x, wy + thick * 0.5);
    }
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, b.y - amp - thick, 0, b.y + amp + thick);
    const al = b.alpha * a;
    const h1 = (b.hueBase + Math.sin(iriShift) * 30) % 360;
    const h2 = (b.hueBase + 40 + Math.sin(iriShift + 2) * 25) % 360;
    const h3 = (b.hueBase + 80 + Math.sin(iriShift + 4) * 20) % 360;
    const h4 = (b.hueBase + 120 + Math.sin(iriShift + 1) * 35) % 360;
    const shimmerBright = b.shimmer * (0.5 + 0.5 * Math.sin(time * 1.5 + b.phase));
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.2, `hsla(${h1}, 50%, 30%, ${al * 0.2})`);
    grad.addColorStop(0.35, `hsla(${h2}, 65%, 42%, ${al * 0.5})`);
    grad.addColorStop(0.44, `hsla(${h3}, 75%, 55%, ${al * 0.7})`);
    grad.addColorStop(0.5, `hsla(${h1}, 85%, 65%, ${al * (0.8 + shimmerBright * 0.2)})`);
    grad.addColorStop(0.56, `hsla(${h4}, 70%, 50%, ${al * 0.6})`);
    grad.addColorStop(0.65, `hsla(${h2}, 55%, 38%, ${al * 0.35})`);
    grad.addColorStop(0.8, `hsla(${h3}, 40%, 25%, ${al * 0.1})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    for (let x = -2; x <= width + 2; x += 3) {
      let wy = b.y + Math.sin(x * b.freq + t + b.phase) * amp;
      wy += Math.sin(x * b.freq * 2.3 + t * 1.4 + b.phase) * amp * 0.15 * b.waveDecay;
      if (x === -2) ctx.moveTo(x, wy);
      ctx.lineTo(x, wy);
    }
    const edgeH = (b.hueBase + 60 + Math.sin(iriShift + 3) * 40) % 360;
    ctx.strokeStyle = `hsla(${edgeH}, 70%, 60%, ${al * 0.15 * shimmerBright})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

// ══════════════════════════════════════════════════════════════
// ── Starfield (real night sky) ──
// ══════════════════════════════════════════════════════════════
let shootingStars = [], milkyWayStars = [], galaxies = [], constellations = [], planetData = null;

function initStarfield() {
  bgConfig = getConfig();
  const i = getIntensity();
  const count = 200 + Math.floor(i * 400);
  stars = [];
  shootingStars = [];
  milkyWayStars = [];
  galaxies = [];
  constellations = [];
  planetData = null;

  for (let n = 0; n < count; n++) {
    const layer = Math.random();
    const type = Math.random();
    let hue, sat, light;
    if (type < 0.12) { hue = 200 + Math.random() * 30; sat = 45 + Math.random() * 30; light = 82 + Math.random() * 12; }
    else if (type < 0.22) { hue = 25 + Math.random() * 30; sat = 50 + Math.random() * 35; light = 78 + Math.random() * 12; }
    else if (type < 0.3) { hue = 350 + Math.random() * 15; sat = 45 + Math.random() * 40; light = 70 + Math.random() * 15; }
    else { hue = 200 + Math.random() * 60; sat = 5 + Math.random() * 15; light = 78 + Math.random() * 18; }
    stars.push({
      x: Math.random() * width, y: Math.random() * height, z: layer,
      size: 0.15 + layer * 2.0,
      twinkleSpeed: 0.2 + Math.random() * 1.2 * (0.5 + layer),
      twinklePhase: Math.random() * Math.PI * 2,
      hue, sat, light,
      hasCross: layer > 0.65 && Math.random() > 0.9,
      crossLen: 2 + Math.random() * 5,
    });
  }

  if (bgConfig.starfieldMilkyWay !== false) {
    const milkyAngle = -0.35 + Math.random() * 0.15;
    const milkyCX = width * (0.3 + Math.random() * 0.4);
    const milkyCY = height * (0.3 + Math.random() * 0.4);
    const milkyCount = 150 + Math.floor(i * 200);
    for (let n = 0; n < milkyCount; n++) {
      const spread = (Math.random() - 0.5) * 0.4;
      const along = (Math.random() - 0.5) * 1.2;
      milkyWayStars.push({
        x: milkyCX + Math.cos(milkyAngle) * along * width * 0.5 - Math.sin(milkyAngle) * spread * height * 0.3,
        y: milkyCY + Math.sin(milkyAngle) * along * width * 0.5 + Math.cos(milkyAngle) * spread * height * 0.3,
        size: 0.1 + Math.random() * 0.5,
        hue: 200 + Math.random() * 80,
        alpha: 0.03 + Math.random() * 0.1,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.1 + Math.random() * 0.4,
      });
    }
  }

  if (bgConfig.starfieldGalaxy !== false) {
    const gCount = 1 + Math.floor(Math.random() * 2);
    for (let g = 0; g < gCount; g++) {
      const gx = width * (0.1 + Math.random() * 0.8);
      const gy = height * (0.1 + Math.random() * 0.8);
      const gSize = 15 + Math.random() * 25;
      const arms = 2 + Math.floor(Math.random() * 2);
      const tilt = 0.3 + Math.random() * 0.4;
      const rot = Math.random() * Math.PI * 2;
      const hue = [30, 200, 340, 45][Math.floor(Math.random() * 4)];
      galaxies.push({ x: gx, y: gy, size: gSize, arms, tilt, rot, hue });
    }
  }

  if (bgConfig.starfieldConstellations !== false) {
    const cCount = 2 + Math.floor(Math.random() * 3);
    for (let c = 0; c < cCount; c++) {
      const cx = width * (0.1 + Math.random() * 0.8);
      const cy = height * (0.1 + Math.random() * 0.8);
      const points = [];
      const pCount = 4 + Math.floor(Math.random() * 5);
      for (let p = 0; p < pCount; p++) {
        points.push({
          x: cx + (Math.random() - 0.5) * width * 0.2,
          y: cy + (Math.random() - 0.5) * height * 0.15,
        });
      }
      const lines = [];
      for (let p = 0; p < pCount - 1; p++) {
        if (Math.random() > 0.2) lines.push([p, p + 1]);
      }
      for (let p = 0; p < Math.floor(pCount * 0.3); p++) {
        const a = Math.floor(Math.random() * pCount);
        let b = Math.floor(Math.random() * pCount);
        if (a !== b) lines.push([a, b]);
      }
      constellations.push({ points, lines, alpha: 0.04 + Math.random() * 0.06 });
    }
  }

  if (bgConfig.starfieldPlanet !== false && Math.random() > 0.4) {
    const px = width * (0.6 + Math.random() * 0.3);
    const py = height * (0.15 + Math.random() * 0.3);
    const pr = 3 + Math.random() * 6;
    const hasRing = Math.random() > 0.5;
    planetData = { x: px, y: py, r: pr, hasRing, ringW: pr * 2.2, hue: [20, 200, 30, 350][Math.floor(Math.random() * 4)] };
  }
}

function drawGalaxy(g, a) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.rot);
  const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, g.size * 0.3);
  coreG.addColorStop(0, `hsla(${g.hue}, 30%, 60%, ${0.12 * a})`);
  coreG.addColorStop(0.5, `hsla(${g.hue + 10}, 20%, 40%, ${0.04 * a})`);
  coreG.addColorStop(1, "transparent");
  ctx.fillStyle = coreG;
  ctx.fillRect(-g.size * 0.3, -g.size * 0.3 * g.tilt, g.size * 0.6, g.size * 0.6 * g.tilt);
  for (let arm = 0; arm < g.arms; arm++) {
    const armAngle = (arm / g.arms) * Math.PI * 2;
    for (let s = 0; s < 40; s++) {
      const t = s / 40;
      const spiralAngle = armAngle + t * Math.PI * 1.5;
      const sx = Math.cos(spiralAngle) * t * g.size * 0.8;
      const sy = Math.sin(spiralAngle) * t * g.size * 0.8 * g.tilt;
      const sa = (1 - t * 0.7) * 0.06 * a;
      const ss = 0.3 + (1 - t) * 0.8;
      ctx.fillStyle = `hsla(${g.hue + t * 20}, 25%, 70%, ${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, ss, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPlanet(p, a) {
  const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r);
  g.addColorStop(0, `hsla(${p.hue}, 35%, 45%, ${0.3 * a})`);
  g.addColorStop(0.6, `hsla(${p.hue + 10}, 25%, 25%, ${0.2 * a})`);
  g.addColorStop(1, `hsla(${p.hue + 20}, 15%, 12%, ${0.1 * a})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  if (p.hasRing) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.3);
    ctx.strokeStyle = `hsla(${p.hue + 20}, 20%, 50%, ${0.12 * a})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.ringW, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `hsla(${p.hue + 10}, 15%, 40%, ${0.06 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.ringW * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawStarfield(intensity) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.65);
  bg.addColorStop(0, "#060510");
  bg.addColorStop(0.4, "#03020a");
  bg.addColorStop(1, "#010106");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const a = 0.2 + intensity * 0.8;
  for (const m of milkyWayStars) {
    const tw = 0.5 + 0.5 * Math.sin(time * m.twinkleSpeed + m.twinklePhase);
    const ma = m.alpha * a * tw;
    ctx.fillStyle = `hsla(${m.hue}, 15%, 65%, ${ma})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const g of galaxies) drawGalaxy(g, a);
  if (planetData) drawPlanet(planetData, a);
  for (const c of constellations) {
    ctx.strokeStyle = `hsla(210, 15%, 60%, ${c.alpha * a})`;
    ctx.lineWidth = 0.5;
    for (const [ai, bi] of c.lines) {
      const pa = c.points[ai], pb = c.points[bi];
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    for (const p of c.points) {
      ctx.fillStyle = `hsla(200, 20%, 75%, ${c.alpha * a * 2.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const s of stars) {
    const twinkle = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase));
    const alpha = twinkle * a * (0.25 + s.z * 0.75);
    const size = s.size * 0.5;
    if (s.z > 0.5) {
      ctx.fillStyle = `hsla(${s.hue}, ${s.sat * 0.5}%, ${s.light * 0.7}%, ${alpha * 0.05})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
    ctx.fill();
    if (s.hasCross && twinkle > 0.65) {
      const sk = alpha * 0.4 * (twinkle - 0.65) * 2.8;
      ctx.strokeStyle = `hsla(${s.hue}, ${s.sat * 0.3}%, 85%, ${sk})`;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(s.x - s.crossLen * size, s.y);
      ctx.lineTo(s.x + s.crossLen * size, s.y);
      ctx.moveTo(s.x, s.y - s.crossLen * size);
      ctx.lineTo(s.x, s.y + s.crossLen * size);
      ctx.stroke();
    }
  }
  if (Math.random() < 0.003 * a) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 400 + Math.random() * 600;
    shootingStars.push({
      x: Math.random() * width, y: Math.random() * height * 0.6,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1, decay: 1.5 + Math.random() * 1.5,
      len: 40 + Math.random() * 80,
      hue: 190 + Math.random() * 50,
    });
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const ss = shootingStars[i];
    ss.x += ss.vx * 0.016; ss.y += ss.vy * 0.016;
    ss.life -= ss.decay * 0.016;
    if (ss.life <= 0) { shootingStars.splice(i, 1); continue; }
    const mag = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);
    const dx = -ss.vx / mag, dy = -ss.vy / mag;
    const tailLen = ss.len * ss.life;
    const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x + dx * tailLen, ss.y + dy * tailLen);
    grad.addColorStop(0, `hsla(${ss.hue}, 60%, 85%, ${ss.life * a * 0.8})`);
    grad.addColorStop(0.3, `hsla(${ss.hue}, 40%, 70%, ${ss.life * a * 0.3})`);
    grad.addColorStop(1, "transparent");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ss.x, ss.y);
    ctx.lineTo(ss.x + dx * tailLen, ss.y + dy * tailLen);
    ctx.stroke();
    ctx.fillStyle = `hsla(${ss.hue}, 30%, 90%, ${ss.life * a * 0.9})`;
    ctx.beginPath();
    ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ══════════════════════════════════════════════════════════════
// ── Particles ──
// ══════════════════════════════════════════════════════════════
function initParticles() {
  const i = getIntensity();
  const count = 80 + Math.floor(i * 170);
  particles = [];
  for (let n = 0; n < count; n++) {
    particles.push({
      x: Math.random() * width, y: Math.random() * height,
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
function drawNone() { ctx.clearRect(0, 0, width, height); }

// ══════════════════════════════════════════════════════════════
// ── Effect Registry ──
// ══════════════════════════════════════════════════════════════
const effects = {
  none: { init: () => {}, draw: drawNone },
  matrix: { init: initMatrix, draw: drawMatrix },
  nebula: { init: initNebula, draw: drawNebula },
  liquid: { init: initLiquid, draw: drawLiquid },
  starfield: { init: initStarfield, draw: drawStarfield },
  particles: { init: initParticles, draw: drawParticles },
};

let _onVisibility = null;

function startEffect(effect) {
  stopEffect();
  currentEffect = effect;
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  const def = effects[effect] || effects.none;
  if (typeof def.init === "function") def.init();
  let lastFrame = 0;
  const fps = 30;
  const interval = 1000 / fps;
  let hidden = false;
  _onVisibility = () => {
    hidden = document.hidden;
    if (hidden) {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    } else {
      lastFrame = 0;
      animId = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", _onVisibility);
  function frame(now) {
    if (hidden) return;
    const elapsed = now - lastFrame;
    if (elapsed < interval) { animId = requestAnimationFrame(frame); return; }
    lastFrame = now - (elapsed % interval);
    time = now * 0.001;
    const intensity = getIntensity();
    def.draw(intensity);
    animId = requestAnimationFrame(frame);
  }
  animId = requestAnimationFrame(frame);
}

function stopEffect() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (_onVisibility) {
    document.removeEventListener("visibilitychange", _onVisibility);
    _onVisibility = null;
  }
}

let __initBackgroundEffectsInitialized = false;

export function initBackgroundEffects() {
  if (__initBackgroundEffectsInitialized) return;
  __initBackgroundEffectsInitialized = true;
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
    if (newEffect !== currentEffect) startEffect(newEffect);
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-bg-effect"] });

  return () => {
    stopEffect();
    observer.disconnect();
    window.removeEventListener("resize", resize);
  };
}

export function restartCurrentEffect() {
  bgConfig = getConfig();
  if (currentEffect !== "none") startEffect(currentEffect);
}
