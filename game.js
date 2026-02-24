/* ============================================================
   THE HUNTER — game.js
   كل الـ Game Logic هنا. الملف ده بيشتغل بعد تحميل HTML كامل
   لأنه متحمل في آخر الـ body في index.html
   ============================================================ */

'use strict';

/* ============================================================
   SECTION 1 — CONSTANTS & CONFIG
   ============================================================ */

/** بيانات الـ waves — الـ count والحركة والسرعة والمكافأة */
const WAVE_CONFIGS = [
  { label: 'BOOT CAMP',   count:  5, mH: false, mV: false, spd: 0,    reward: 12 },
  { label: 'SKIRMISH',    count:  7, mH: true,  mV: false, spd: 0.6,  reward: 18 },
  { label: 'AMBUSH',      count:  8, mH: true,  mV: false, spd: 0.95, reward: 24 },
  { label: 'FIREFIGHT',   count:  9, mH: true,  mV: true,  spd: 1.2,  reward: 30 },
  { label: 'DANGER ZONE', count: 11, mH: true,  mV: true,  spd: 1.6,  reward: 40 },
  { label: 'CHAOS',       count: 13, mH: true,  mV: true,  spd: 2.0,  reward: 52 },
  { label: 'NIGHTMARE',   count: 15, mH: true,  mV: true,  spd: 2.6,  reward: 68 },
];

/** الأسلحة المتاحة */
const WEAPONS = [
  {
    id: 0, name: 'HUNTER BOW', emoji: '🏹',
    desc: 'Standard recurve bow. Reliable and deadly.',
    price: 0, dmg: 1, spd: 0.85,
    color: '#00f5ff', trailR: 0,   trailG: 245, trailB: 255,
    shape: 'arrow',
    stats: { power: 30, speed: 40, pierce: 10 }
  },
  {
    id: 1, name: 'COMPOUND X7', emoji: '⚔️',
    desc: 'High-tech compound bow. Faster, harder.',
    price: 150, dmg: 2, spd: 1.05,
    color: '#ff9500', trailR: 255, trailG: 149, trailB: 0,
    shape: 'bolt',
    stats: { power: 55, speed: 65, pierce: 25 }
  },
  {
    id: 2, name: 'PLASMA LANCE', emoji: '⚡',
    desc: 'Energy lance. Cuts through everything.',
    price: 400, dmg: 3, spd: 1.25,
    color: '#bf5af2', trailR: 191, trailG: 90,  trailB: 242,
    shape: 'plasma',
    stats: { power: 80, speed: 80, pierce: 60 }
  },
  {
    id: 3, name: 'NOVA BLASTER', emoji: '🔮',
    desc: 'Max destruction. Futuristic energy cannon.',
    price: 900, dmg: 5, spd: 1.45,
    color: '#ff2d55', trailR: 255, trailG: 45,  trailB: 85,
    shape: 'nova',
    stats: { power: 100, speed: 100, pierce: 100 }
  },
];

/* ============================================================
   SECTION 2 — UTILITY FUNCTIONS
   ============================================================ */

/** Linear interpolation */
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * بيحسب config الـ wave الحالية
 * لو عدينا الـ 7 waves المعرفة، بيكمل ويزود الصعوبة
 */
function getWaveConfig(wave) {
  const i = Math.min(wave - 1, WAVE_CONFIGS.length - 1);
  const c = { ...WAVE_CONFIGS[i] };
  if (wave > WAVE_CONFIGS.length) {
    const extra = wave - WAVE_CONFIGS.length;
    c.count  += extra * 2;
    c.spd    += extra * 0.35;
    c.reward += extra * 12;
    c.label   = `WAVE ${wave}`;
  }
  return c;
}

/* ============================================================
   SECTION 3 — CANVAS SETUP
   ============================================================ */

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

/** بيضبط الـ canvas pixel dimensions مع حجم الشاشة الفعلي */
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/* ============================================================
   SECTION 4 — GAME STATE (G)
   Object واحد بيحتوي على كل حالة اللعبة
   ============================================================ */
const G = {
  /* State Machine */
  phase:  'title', // title | playing | roundEnd | shop | ad | gameOver
  paused: false,

  /* Player Stats */
  score:    0,
  gold:     0,
  lives:    3,
  maxLives: 3,
  ammo:     8,
  maxAmmo:  8,

  /* Progression */
  wave:         1,
  combo:        0,
  maxCombo:     0,
  hits:         0,   // targets اتضربت في الـ wave دي
  totalTargets: 0,
  roundScore:   0,
  roundGold:    0,

  /* Weapon System */
  equippedWeapon: 0,
  ownedWeapons:   [0],

  /* Flags */
  _adShown:            false,   // بيمنع إظهار الـ ad أكتر من مرة
  _roundEndScheduled:  false,   // منع double-trigger لنهاية الـ wave

  /* Time */
  time: 0, // game time بالثواني — بيوقف لما paused

  /* High Score — محفوظ في localStorage */
  highScore: parseInt(localStorage.getItem('th_hs') || '0', 10),

  /** Toggle pause — بيشتغل بس لو state = playing */
  togglePause() {
    if (this.phase !== 'playing') return;
    this.paused = !this.paused;
    document.getElementById('pauseBtn').textContent = this.paused ? '▶ RESUME' : '⏸ PAUSE';
    if (this.paused) {
      UI.showScreen('pauseScreen');
    } else {
      // FIX: لما نعمل resume، بنرجع الـ HUD (مش بنعمل showScreen(null) فقط)
      UI.showScreen(null);
      // HUD بيفضل ظاهر عشان class active موجود
    }
  }
};

/* ============================================================
   SECTION 5 — OBJECT POOLS
   بنعيد استخدام arrays بدل ما نعمل new arrays كل frame
   ============================================================ */
let projectiles  = [];
let targets      = [];
let dyingTargets = [];  // targets في animation الموت
let particles    = [];
let stars        = [];

/** Initialise the starfield (pseudo-3D) */
function initStars() {
  stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x:    Math.random() * 2000,
      y:    Math.random() * 2000,
      z:    Math.random() * 900 + 100,
      size: Math.random() * 1.5 + 0.3,
      tw:   Math.random() * Math.PI * 2   // twinkle phase
    });
  }
}
initStars();

/* ============================================================
   SECTION 6 — INPUT / DRAG SYSTEM
   ============================================================ */
const Drag = {
  active:   false,
  startX:   0, startY:   0,
  currentX: 0, currentY: 0,
  pullDist: 0,
  maxPull:  0,
  charged:  false,

  /** زاوية التصويب — vertical مع انحراف أفقي */
  aimAngle() {
    const dx = (this.currentX - this.startX) * 0.75;
    return Math.atan2(-canvas.height * 0.85, dx);
  },

  /** موقع السلاح — وسط الشاشة في الأسفل */
  weaponPos() {
    return {
      wx: canvas.width / 2,
      wy: canvas.height - Math.max(55, canvas.height * 0.09)
    };
  }
};

function getXY(e) {
  return e.touches
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX,            y: e.clientY };
}

function onDragStart(e) {
  if (G.phase !== 'playing' || G.paused) return;
  const { x, y } = getXY(e);
  Drag.active   = true;
  Drag.startX   = x;  Drag.startY   = y;
  Drag.currentX = x;  Drag.currentY = y;
  Drag.maxPull  = canvas.height * 0.26;
  Drag.pullDist = 0;
  Drag.charged  = false;
  e.preventDefault();
}

function onDragMove(e) {
  if (!Drag.active) return;
  const { x, y } = getXY(e);
  Drag.currentX = x;
  Drag.currentY = y;
  // FIX: Math.max(0,...) منع pull لفوق
  Drag.pullDist = Math.min(Math.max(0, y - Drag.startY), Drag.maxPull);
  Drag.charged  = Drag.pullDist > Drag.maxPull * 0.18;
  e.preventDefault();
}

function onDragEnd(e) {
  if (!Drag.active) return;
  Drag.active = false;
  if (Drag.charged && Drag.pullDist > 10) {
    Weapons.shoot();
  }
  e.preventDefault();
}

// Event Listeners
canvas.addEventListener('mousedown',  onDragStart);
canvas.addEventListener('mousemove',  onDragMove);
canvas.addEventListener('mouseup',    onDragEnd);
canvas.addEventListener('touchstart', onDragStart, { passive: false });
canvas.addEventListener('touchmove',  onDragMove,  { passive: false });
canvas.addEventListener('touchend',   onDragEnd,   { passive: false });

// Keyboard shortcut
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') G.togglePause();
});

/* ============================================================
   SECTION 7 — WEAPONS MODULE
   ============================================================ */
const Weapons = {
  shoot() {
    if (G.ammo <= 0 || G.phase !== 'playing' || G.paused) return;

    const w       = WEAPONS[G.equippedWeapon];
    const { wx, wy } = Drag.weaponPos();
    const charge  = Math.max(0.35, Drag.pullDist / Drag.maxPull);
    const speed   = (480 + charge * 420) * w.spd;
    const ang     = Drag.aimAngle();

    projectiles.push(
      new Projectile(wx, wy, Math.cos(ang) * speed, Math.sin(ang) * speed, w)
    );

    G.ammo--;
    HUD.updateAmmo();

    // FIX: flash بدون concatenation — بنحول لـ rgba
    FX.flashRGBA(w.trailR, w.trailG, w.trailB, 0.15, 70);

    // لو دي آخر طلقة، نستنى تمشي وبعدين نشوف
    if (G.ammo <= 0) {
      // FIX: بنتابع الـ projectile الأخير بدل setTimeout عشمي
      this._lastShotTime = G.time;
      this._waitingForLastShot = true;
    }
  },

  // بيتعمل check منه في الـ loop
  _waitingForLastShot: false,
  _lastShotTime: 0,

  checkLastShot() {
    if (!this._waitingForLastShot) return;
    // لو لسه في طلقات طايرة، استنى frame تاني
    if (projectiles.length > 0) return;
    // لو الـ wave خلصت بالفعل، كنسل
    if (!targets.some(t => t.alive)) {
      this._waitingForLastShot = false;
      return;
    }
    // الطلقات خلصت والـ targets لسه موجودة = player فاته
    this._waitingForLastShot = false;
    this.onAmmoEmpty();
  },

  onAmmoEmpty() {
    if (G.phase !== 'playing') return;
    if (!targets.some(t => t.alive)) return; // الـ wave خلصت بالفعل

    G.lives = Math.max(0, G.lives - 1);
    HUD.updateLives();

    if (G.lives <= 0) {
      FX.flashRGBA(255, 45, 85, 0.5, 300);
      setTimeout(() => Ad.show(), 700);
    } else {
      FX.flashRGBA(255, 45, 85, 0.25, 200);
      G.ammo  = G.maxAmmo;
      G.combo = 0;
      HUD.updateAmmo();
      const remaining = targets.filter(t => t.alive).length;
      Overlays.showMiss(`${remaining} TARGET(S) REMAINING — ARROWS REFILLED`);
    }
  }
};

/* ============================================================
   SECTION 8 — PROJECTILE CLASS
   ============================================================ */
class Projectile {
  constructor(x, y, vx, vy, weapon) {
    this.x   = x;   this.y  = y;
    this.vx  = vx;  this.vy = vy;
    this.w   = weapon;
    this.alive = true;
    this.hit   = false;   // FIX: flag منفصل — ضرب هدف ≠ خرج من الشاشة
    this.trail = [];
    this.age   = 0;
    this.rot   = Math.atan2(vy, vx);
  }

  /** بيتحرك كل frame — بيرجع true لو miss */
  update(dt) {
    // Save trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 16) this.trail.shift();

    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this.age += dt;

    // Out of bounds = miss
    const pad = 100;
    if (
      this.x < -pad || this.x > canvas.width  + pad ||
      this.y < -pad || this.y > canvas.height + pad
    ) {
      this.alive = false;
      if (!this.hit) {
        // Miss visual — نعرض عند موقع السلاح
        const { wx, wy } = Drag.weaponPos();
        FX.missPop(wx, wy - 65);
      }
    }
  }

  draw() {
    const w = this.w;

    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const ratio  = i / this.trail.length;
      const alpha  = ratio * 0.45;
      const radius = ratio * 7;
      if (radius < 0.1) continue;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${w.trailR},${w.trailG},${w.trailB},${alpha})`;
      ctx.fill();
    }

    // Core
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.shadowColor = w.color;
    ctx.shadowBlur  = 22;

    switch (w.shape) {
      case 'arrow':
        ctx.fillStyle = w.color;
        ctx.beginPath();
        ctx.moveTo(16, 0); ctx.lineTo(-13, -3);
        ctx.lineTo(-9,  0); ctx.lineTo(-13,  3);
        ctx.closePath(); ctx.fill();
        break;

      case 'bolt':
        ctx.fillStyle = w.color;
        ctx.fillRect(-15, -2, 30, 4);
        ctx.beginPath();
        ctx.moveTo(15, 0); ctx.lineTo(9, -5); ctx.lineTo(9, 5);
        ctx.closePath(); ctx.fill();
        break;

      case 'plasma':
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fillStyle = w.color; ctx.fill();
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        break;

      case 'nova':
      default: {
        const pulse = Math.sin(this.age * 8) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, 11 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = w.color; ctx.fill();
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
}

/* ============================================================
   SECTION 9 — TARGETS MODULE
   ============================================================ */
const Targets = {
  /** إنشاء targets الـ wave الجديدة */
  spawn() {
    targets      = [];
    dyingTargets = [];
    G._roundEndScheduled = false;

    const W   = canvas.width,  H   = canvas.height;
    const cfg = getWaveConfig(G.wave);
    G.totalTargets = cfg.count;
    G.hits         = 0;

    const cols = Math.ceil(Math.sqrt(cfg.count));
    const rows = Math.ceil(cfg.count / cols);
    const mx   = W * 0.1,   my = H * 0.06;
    const aw   = W * 0.8,  ah = H * 0.44;

    for (let i = 0; i < cfg.count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx  = mx + (aw / cols) * col + (aw / cols) * 0.5;
      const by  = my + (ah / rows) * row + (ah / rows) * 0.5;
      const dep = 0.25 + Math.random() * 0.5;
      const sz  = lerp(85, 26, dep);
      const py  = by + dep * H * 0.08;

      // Bonus target pattern: كل 7 أو كل 11
      const isBonus = (i % 7 === 0 && i !== 0) || (i % 11 === 0 && i !== 0);

      targets.push({
        x: bx, y: py, baseX: bx, baseY: py,
        depth: dep, size: sz,
        alive: true, flashTimer: 0,
        moveH: cfg.mH && Math.random() > 0.3,
        moveV: cfg.mV && Math.random() > 0.5,
        spdH: (Math.random() * cfg.spd + 0.25) * (Math.random() > 0.5 ? 1 : -1),
        spdV: (Math.random() * cfg.spd * 0.45 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
        phH: Math.random() * Math.PI * 2,
        phV: Math.random() * Math.PI * 2,
        rngH: (28 + Math.random() * 60) * (1 - dep * 0.45),
        rngV: (14 + Math.random() * 28) * (1 - dep * 0.45),
        ring: 0,
        reward: Math.floor(cfg.reward * (1 + dep * 0.6)),
        type: isBonus ? 'bonus' : 'normal'
      });
    }
  },

  /** تحديث مواقع الـ targets المتحركة */
  update(t) {
    for (const tgt of targets) {
      if (!tgt.alive) continue;
      if (tgt.moveH) tgt.x = tgt.baseX + Math.sin(t * tgt.spdH + tgt.phH) * tgt.rngH;
      if (tgt.moveV) tgt.y = tgt.baseY + Math.sin(t * tgt.spdV + tgt.phV) * tgt.rngV;
    }
  },

  /** رسم كل الـ targets الحية وكمان animation الموت */
  draw() {
    // Live targets
    for (const tgt of targets) {
      if (!tgt.alive) continue;
      tgt.ring = (tgt.ring + 0.04) % (Math.PI * 2);

      const x   = tgt.x, y = tgt.y, r = tgt.size * 0.5;
      const isB = tgt.type === 'bonus';
      const rgb = isB ? '255,215,0' : '0,245,255';
      const pc  = isB ? '#ffd700'   : '#00f5ff';

      ctx.save();

      // Ground shadow
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.38, r * 0.58, r * 0.11, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fill();

      // Outer pulse ring
      const rr = r + 4 + Math.sin(tgt.ring) * 4;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb},${0.28 + Math.sin(tgt.ring) * 0.14})`;
      ctx.lineWidth = 1.5; ctx.stroke();

      // Body fill
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
      bg.addColorStop(0, `rgba(${rgb},.24)`);
      bg.addColorStop(1, `rgba(${rgb},.05)`);
      ctx.fillStyle = bg; ctx.fill();

      // Body border
      ctx.strokeStyle = pc;
      ctx.lineWidth   = 2;
      ctx.shadowColor = pc;
      ctx.shadowBlur  = tgt.flashTimer > 0 ? 35 : 12;
      ctx.stroke();

      // Inner rings
      ctx.shadowBlur = 0;
      for (let ri = 1; ri <= 3; ri++) {
        ctx.beginPath();
        ctx.arc(x, y, r * (1 - ri * 0.22), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${0.38 - ri * 0.07})`;
        ctx.lineWidth = 1; ctx.stroke();
      }

      // Center dot
      ctx.beginPath(); ctx.arc(x, y, r * 0.11, 0, Math.PI * 2);
      ctx.fillStyle = isB ? '#ffd700' : '#fff';
      ctx.shadowColor = pc; ctx.shadowBlur = 14; ctx.fill();

      // Bonus star
      if (isB) {
        ctx.shadowBlur = 0;
        ctx.font = `${r * 0.48}px serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', x, y);
      }

      // Hit flash overlay
      if (tgt.flashTimer > 0) {
        ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${tgt.flashTimer * 0.38})`;
        ctx.fill();
        tgt.flashTimer = Math.max(0, tgt.flashTimer - 0.07);
      }

      ctx.restore();
    }

    // Dying targets — ring explosion animation
    // FIX: بنستخدم dt من الـ loop بدل رقم ثابت
    for (let i = dyingTargets.length - 1; i >= 0; i--) {
      const d = dyingTargets[i];
      if (d.age >= 1) { dyingTargets.splice(i, 1); continue; }
      const r = d.r * (1 + d.age * 2.2);
      const a = 1 - d.age;
      ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${d.rgb},${a * 0.7})`;
      ctx.lineWidth   = 2;
      ctx.shadowColor = d.color;
      ctx.shadowBlur  = 22;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  },

  /** تحديث age الـ dying targets — يُنادى من الـ loop مع dt */
  updateDying(dt) {
    for (const d of dyingTargets) {
      d.age += dt * 1.2; // FIX: frame-rate independent
    }
  },

  /**
   * FIX الرئيسي للـ collision:
   * بيجي بعد update الـ projectiles وقبل draw
   * بيتحقق من proj.hit عشان مايطلع "miss" لو ضرب هدف
   */
  checkCollisions() {
    for (const proj of projectiles) {
      if (!proj.alive || proj.hit) continue;
      for (const tgt of targets) {
        if (!tgt.alive) continue;
        const dx = proj.x - tgt.x;
        const dy = proj.y - tgt.y;
        const threshold = tgt.size * 0.52 + 5;
        if (dx * dx + dy * dy < threshold * threshold) {
          proj.hit   = true;
          proj.alive = false;
          this.onHit(tgt, proj.x, proj.y);
          break; // projectile واحد = hit واحد فقط
        }
      }
    }
  },

  /** معالجة إصابة target */
  onHit(tgt, px, py) {
    tgt.alive      = false;
    tgt.flashTimer = 1.0;
    G.hits++;
    G.combo++;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;

    const isB  = tgt.type === 'bonus';
    const mult = 1 + Math.floor(G.combo / 2) * 0.25;
    const pts  = Math.floor(tgt.reward * (isB ? 3 : 1) * mult);
    const gold = Math.floor(
      (isB ? tgt.reward : Math.ceil(tgt.reward * 0.35)) * (1 + G.combo * 0.08)
    );

    G.score      += pts;   G.gold      += gold;
    G.roundScore += pts;   G.roundGold += gold;

    // Death animation
    dyingTargets.push({
      x: tgt.x, y: tgt.y, r: tgt.size * 0.5, age: 0,
      color: isB ? '#ffd700' : '#00f5ff',
      rgb:   isB ? '255,215,0' : '0,245,255'
    });

    // Visual effects
    Particles.spawn(px, py, isB ? [255, 215, 0] : [0, 245, 255], isB ? 22 : 14);
    FX.scorePop(tgt.x - 25, tgt.y - 30, `+${pts}`, isB ? '#ffd700' : '#00f5ff');
    FX.flashRGBA(
      isB ? 255 : 0,
      isB ? 215 : 245,
      isB ? 0   : 255,
      isB ? 0.18 : 0.12,
      90
    );
    if (G.combo > 1) Overlays.showCombo(G.combo);
    HUD.update();

    // FIX: wave clear مرة واحدة بس — نفحص بعد ما كل الـ targets تموت
    if (!G._roundEndScheduled && !targets.some(t => t.alive)) {
      G._roundEndScheduled = true;
      setTimeout(() => Game.roundEnd(), 900);
    }
  }
};

/* ============================================================
   SECTION 10 — PARTICLES MODULE
   ============================================================ */
const Particles = {
  /**
   * @param {number} x
   * @param {number} y
   * @param {[number,number,number]} rgb - مصفوفة [r,g,b]
   * @param {number} count
   */
  spawn(x, y, [r, g, b], count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
      const speed = 90 + Math.random() * 200;
      particles.push({
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        life:  1.0,
        decay: 0.75 + Math.random() * 0.9,
        size:  2 + Math.random() * 5,
        r, g, b
      });
    }
  },

  /** بيتحدث ويرسم في نفس الوقت */
  update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx * dt;  p.y  += p.vy * dt;
      p.vx *= 0.91;        p.vy *= 0.91;
      p.vy += 45 * dt;    // gravity
      p.life -= p.decay * dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      // FIX: rgba() بدل hex concatenation
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.life})`;
      ctx.fill();
    }
  }
};

/* ============================================================
   SECTION 11 — BACKGROUND RENDERER
   ============================================================ */
const BG = {
  draw(t) {
    const W = canvas.width, H = canvas.height, cx = W / 2;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0,    '#000913');
    sky.addColorStop(0.55, '#001525');
    sky.addColorStop(1,    '#000610');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars (pseudo-3D parallax)
    for (const s of stars) {
      s.tw += 0.018;
      const sx = (s.x - 1000) / s.z * 280 + cx;
      const sy = (s.y - 1000) / s.z * 280 + H * 0.35;
      if (sx < 0 || sx > W || sy < 0 || sy > H * 0.6) continue;
      const alpha = (0.35 + Math.sin(s.tw) * 0.28) * (1 - s.z / 1000);
      ctx.beginPath();
      ctx.arc(sx, sy, s.size * (1 - s.z / 1100), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,230,255,${alpha})`;
      ctx.fill();
    }

    // Horizon glow
    const hg = ctx.createRadialGradient(cx, H * 0.52, 0, cx, H * 0.52, W * 0.55);
    hg.addColorStop(0, 'rgba(0,100,180,.1)');
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);

    // Perspective grid floor
    const horizon = H * 0.52;
    const scroll  = (t * 0.045) % 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, W, H - horizon);
    ctx.clip();

    // Horizontal grid lines
    for (let i = 0; i <= 20; i++) {
      const p = (i + scroll) / 20;
      const y = horizon + (H - horizon) * Math.pow(p, 1.9);
      ctx.strokeStyle = `rgba(0,245,255,${Math.pow(p, 0.5) * 0.12})`;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Vertical grid lines (vanishing point)
    for (let i = -22; i <= 22; i++) {
      const fx = cx + (i / 22) * W * 0.62;
      ctx.strokeStyle = 'rgba(0,245,255,.06)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(cx, horizon);
      ctx.lineTo(fx, H);
      ctx.stroke();
    }
    ctx.restore();

    // Horizon line
    ctx.strokeStyle = 'rgba(0,245,255,.28)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon); ctx.lineTo(W, horizon);
    ctx.stroke();
  }
};

/* ============================================================
   SECTION 12 — WEAPON RENDERER
   ============================================================ */
const WeaponRenderer = {
  draw(t) {
    const w          = WEAPONS[G.equippedWeapon];
    const { wx, wy } = Drag.weaponPos();

    // Platform glow
    const glow = ctx.createRadialGradient(wx, wy + 12, 0, wx, wy + 12, 85);
    glow.addColorStop(0, 'rgba(0,245,255,.14)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(wx, wy + 22, 72, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aim line (dotted) when dragging
    if (Drag.active && Drag.pullDist > 5) {
      const ang = Drag.aimAngle();
      ctx.save();
      ctx.strokeStyle = `rgba(${w.trailR},${w.trailG},${w.trailB},.28)`;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([7, 13]);
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(
        wx + Math.cos(ang) * canvas.height * 0.45,
        wy + Math.sin(ang) * canvas.height * 0.45
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Weapon emoji (with charge scale and sway)
    const chargeScale = Drag.active ? 1 + (Drag.pullDist / Drag.maxPull) * 0.15 : 1;
    const sway        = Drag.active
      ? (Drag.currentX - Drag.startX) * 0.05
      : Math.sin(t * 0.8) * 3;
    const sz = Math.max(36, Math.min(canvas.height * 0.07, 62));

    ctx.save();
    ctx.translate(wx + sway, wy);
    ctx.scale(chargeScale, chargeScale);
    ctx.shadowColor = w.color;
    ctx.shadowBlur  = Drag.charged ? 35 : 12;
    ctx.font        = `${sz}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(w.emoji, 0, 0);
    ctx.restore();

    // Charge arc + percentage
    if (Drag.active) {
      const ch = Drag.pullDist / Drag.maxPull;
      ctx.beginPath();
      ctx.arc(wx, wy, sz * 0.8, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * ch);
      ctx.strokeStyle = w.color;
      ctx.lineWidth   = 3;
      ctx.shadowColor = w.color;
      ctx.shadowBlur  = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (ch > 0.1) {
        ctx.fillStyle    = w.color;
        ctx.font         = `bold ${Math.max(10, sz * 0.22)}px Orbitron`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(Math.round(ch * 100) + '%', wx, wy + sz * 0.85);
      }
    }
  }
};

/* ============================================================
   SECTION 13 — FX MODULE (Visual Effects)
   ============================================================ */
const FX = {
  /**
   * Screen flash — FIX: بنستخدم rgba مباشرة بدل hex concatenation
   * وبنعمل force reflow عشان الـ transition يشتغل
   */
  flashRGBA(r, g, b, alpha, dur = 150) {
    const el = document.getElementById('screenFlash');
    // FIX: نضبط فقط الـ properties المحتاجينها — مش cssText كامل
    el.style.transition = 'none';
    el.style.background = `rgba(${r},${g},${b},1)`;
    el.style.opacity    = String(alpha);
    // Force reflow
    void el.offsetHeight;
    // Fade out
    el.style.transition = `opacity ${dur}ms ease-out`;
    el.style.opacity    = '0';
  },

  /** Score popup — بيتعلق على الـ body ويتمسح بعد animation */
  scorePop(x, y, text, color) {
    const el          = document.createElement('div');
    el.className      = 'score-pop';
    el.textContent    = text;
    const fontSize    = Math.max(14, canvas.width * 0.03);
    el.style.left     = `${x}px`;
    el.style.top      = `${y}px`;
    el.style.color    = color;
    el.style.fontSize = `${fontSize}px`;
    el.style.textShadow = `0 0 10px ${color}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  },

  /** Miss pop — بيظهر عند موقع السلاح */
  missPop(x, y) {
    const el          = document.createElement('div');
    el.className      = 'miss-pop';
    el.textContent    = 'MISS';
    el.style.left     = `${x - 20}px`;
    el.style.top      = `${y}px`;
    el.style.fontSize = `${Math.max(12, canvas.width * 0.025)}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
};

/* ============================================================
   SECTION 14 — OVERLAYS MODULE
   ============================================================ */
const Overlays = {
  showCombo(n) {
    const labels = ['','','DOUBLE!','TRIPLE!','QUAD!!','PENTA!!!','HEXA!!!!','ULTRA!!!!!'];
    const el     = document.getElementById('comboDisplay');
    el.textContent = n >= labels.length ? `${n}× COMBO!!` : labels[n];
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 950);
  },

  showMiss(msg) {
    const el = document.getElementById('missDisplay');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 1500);
  },

  /**
   * FIX: بنعيد trigger الـ animation صح
   * بنشيل الـ class أولاً، نعمل reflow، وبعدين نضيفه
   */
  showWave() {
    const cfg  = getWaveConfig(G.wave);
    const text = document.getElementById('waveAnnounceText');
    const sub  = document.getElementById('waveSubText');
    const ov   = document.getElementById('waveOverlay');

    text.textContent = `WAVE ${G.wave}`;
    sub.textContent  = cfg.label;

    // Restart animation
    text.classList.remove('animate');
    void text.offsetWidth; // force reflow
    text.classList.add('animate');

    ov.classList.add('show');
    setTimeout(() => ov.classList.remove('show'), 2300);
  }
};

/* ============================================================
   SECTION 15 — HUD MODULE
   ============================================================ */
const HUD = {
  update() {
    this._setNum('hudScore', G.score);
    this._setNum('hudGold',  G.gold);
    document.getElementById('hudWave').textContent      = G.wave;
    document.getElementById('hudWaveLabel').textContent = getWaveConfig(G.wave).label;
    this.updateAmmo();
    this.updateLives();
  },

  _setNum(id, v) {
    const el = document.getElementById(id);
    el.textContent = v.toLocaleString();
    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 130);
  },

  updateAmmo() {
    const bar = document.getElementById('ammoBar');
    bar.innerHTML = '';
    for (let i = 0; i < G.maxAmmo; i++) {
      const pip       = document.createElement('div');
      pip.className   = 'ammo-pip' + (i >= G.ammo ? ' used' : '');
      bar.appendChild(pip);
    }
  },

  updateLives() {
    const row = document.getElementById('livesRow');
    row.innerHTML = '';
    for (let i = 0; i < G.maxLives; i++) {
      const dot     = document.createElement('div');
      dot.className = 'life-dot' + (i >= G.lives ? ' empty' : '');
      row.appendChild(dot);
    }
  }
};

/* ============================================================
   SECTION 16 — UI / SCREEN MANAGER
   ============================================================ */
const UI = {
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('off'));
    if (id) document.getElementById(id).classList.remove('off');
  }
};

/* ============================================================
   SECTION 17 — SHOP MODULE
   ============================================================ */
const Shop = {
  open() {
    G.phase = 'shop';
    UI.showScreen('shopScreen');
    this._render();
  },

  close() {
    G.phase = 'roundEnd';
    UI.showScreen('roundScreen');
  },

  _render() {
    document.getElementById('shopGold').textContent = G.gold.toLocaleString();
    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';

    WEAPONS.forEach(w => {
      const owned    = G.ownedWeapons.includes(w.id);
      const equipped = G.equippedWeapon === w.id;
      const locked   = !owned && G.gold < w.price;

      const card = document.createElement('div');
      card.className = [
        'weapon-card',
        owned    ? 'owned'    : '',
        equipped ? 'equipped' : '',
        locked   ? 'locked'   : ''
      ].filter(Boolean).join(' ');

      const badge = equipped
        ? '<div class="card-badge badge-equipped">EQUIPPED</div>'
        : owned
          ? '<div class="card-badge badge-owned">OWNED</div>'
          : '';

      const priceText = w.price === 0
        ? '✓ DEFAULT'
        : owned
          ? '✓ OWNED'
          : `💰 ${w.price} GOLD`;

      card.innerHTML = `
        ${badge}
        <span class="weapon-emoji">${w.emoji}</span>
        <div class="weapon-name">${w.name}</div>
        <div class="weapon-desc">${w.desc}</div>
        <div class="weapon-stat">
          <span class="stat-label">PWR</span>
          <div class="stat-track"><div class="stat-fill" style="width:${w.stats.power}%;background:${w.color}"></div></div>
        </div>
        <div class="weapon-stat">
          <span class="stat-label">SPD</span>
          <div class="stat-track"><div class="stat-fill" style="width:${w.stats.speed}%;background:${w.color}"></div></div>
        </div>
        <div class="weapon-stat">
          <span class="stat-label">PIERCE</span>
          <div class="stat-track"><div class="stat-fill" style="width:${w.stats.pierce}%;background:${w.color}"></div></div>
        </div>
        <div class="weapon-price">${priceText}</div>
      `;

      if (!locked) card.onclick = () => this._buyOrEquip(w.id);
      grid.appendChild(card);
    });
  },

  _buyOrEquip(id) {
    const w = WEAPONS[id];
    if (G.ownedWeapons.includes(id)) {
      G.equippedWeapon = id;
    } else if (G.gold >= w.price) {
      G.gold -= w.price;
      G.ownedWeapons.push(id);
      G.equippedWeapon = id;
      FX.flashRGBA(255, 215, 0, 0.2, 200);
    }
    this._render();
  }
};

/* ============================================================
   SECTION 18 — AD MODULE
   ============================================================ */
const Ad = {
  show() {
    // FIX: لو الـ ad اتشافت قبل كده، روح على game over مباشرة
    if (G._adShown) {
      Game.gameOver();
      return;
    }
    G.phase    = 'ad';
    G._adShown = true;
    UI.showScreen('adScreen');

    const bar = document.getElementById('adProgressBar');
    const cd  = document.getElementById('adCountdown');
    // Reset
    bar.style.transition = 'none';
    bar.style.width      = '0%';
    cd.textContent       = '3';
    document.getElementById('watchAdBtn').disabled = false;
  },

  watch() {
    document.getElementById('watchAdBtn').disabled = true;
    const bar = document.getElementById('adProgressBar');
    const cd  = document.getElementById('adCountdown');
    let t = 3;

    // FIX: reflow قبل الـ transition
    void bar.offsetHeight;
    bar.style.transition = 'width 3s linear';
    bar.style.width      = '100%';

    const iv = setInterval(() => {
      t--;
      cd.textContent = t > 0 ? String(t) : '✓';
      if (t <= 0) {
        clearInterval(iv);
        G.ammo  = G.maxAmmo + 2;  // bonus arrows
        G.lives = G.maxLives;
        G.combo = 0;
        G.phase = 'playing';
        UI.showScreen(null);
        Targets.spawn();
        HUD.update();
        FX.flashRGBA(57, 255, 20, 0.25, 400);
        Overlays.showWave();
      }
    }, 1000);
  }
};

/* ============================================================
   SECTION 19 — GAME MODULE (Main Controller)
   ============================================================ */
const Game = {
  start() {
    // Reset all game state
    Object.assign(G, {
      phase: 'playing', paused: false,
      score: 0, gold: 0, wave: 1,
      lives: 3, maxLives: 3, ammo: 8, maxAmmo: 8,
      combo: 0, maxCombo: 0,
      hits: 0, totalTargets: 0,
      roundScore: 0, roundGold: 0,
      equippedWeapon: 0, ownedWeapons: [0],
      _adShown: false,
      _roundEndScheduled: false,
      time: 0
    });

    // Update title screen weapon preview to match current weapon
    document.getElementById('titleWeapon').textContent = WEAPONS[0].emoji;

    // Reset weapons module flags
    Weapons._waitingForLastShot = false;

    // Clear pools
    projectiles  = [];
    particles    = [];
    dyingTargets = [];

    // Show game
    UI.showScreen(null);
    document.getElementById('hud').classList.add('active');
    document.getElementById('pauseBtn').textContent = '⏸ PAUSE';

    Targets.spawn();
    HUD.update();
    Overlays.showWave();
  },

  quitToMenu() {
    G.phase  = 'title';
    G.paused = false;
    Weapons._waitingForLastShot = false;
    document.getElementById('pauseBtn').textContent = '⏸ PAUSE';
    document.getElementById('hud').classList.remove('active');
    // Update title screen weapon back to bow
    document.getElementById('titleWeapon').textContent = WEAPONS[0].emoji;
    UI.showScreen('titleScreen');
    document.getElementById('titleHS').textContent =
      `BEST: ${G.highScore.toLocaleString()}`;
  },

  roundEnd() {
    // FIX: guard — بيشتغل بس لو state لسه playing
    if (G.phase !== 'playing') return;
    G.phase = 'roundEnd';

    const acc  = G.totalTargets > 0
      ? Math.round((G.hits / G.totalTargets) * 100)
      : 0;
    const perf = acc >= 100 ? '🎯 PERFECT!'
               : acc >= 70  ? '💥 SOLID'
               : acc >= 40  ? '⚡ OK'
               :              '💀 ROUGH';

    document.getElementById('roundWaveTitle').textContent = `WAVE ${G.wave}`;
    document.getElementById('roundStats').innerHTML =
      `TARGETS HIT: <b>${G.hits} / ${G.totalTargets}</b> &nbsp;${perf}<br>` +
      `ACCURACY: <b>${acc}%</b><br>` +
      `WAVE SCORE: <b>${G.roundScore.toLocaleString()}</b><br>` +
      `GOLD EARNED: <b>💰 ${G.roundGold}</b><br>` +
      `TOTAL SCORE: <b>${G.score.toLocaleString()}</b>`;

    UI.showScreen('roundScreen');
  },

  nextWave() {
    G.wave++;
    G.ammo        = G.maxAmmo;
    G.roundScore  = 0;
    G.roundGold   = 0;
    G.combo       = 0;
    G.phase       = 'playing';
    Weapons._waitingForLastShot = false;
    projectiles   = [];
    particles     = [];
    dyingTargets  = [];
    UI.showScreen(null);
    Targets.spawn();
    HUD.update();
    Overlays.showWave();
  },

  gameOver() {
    G.phase = 'gameOver';
    Weapons._waitingForLastShot = false;

    // High score
    const isNew = G.score > G.highScore;
    if (isNew) {
      G.highScore = G.score;
      localStorage.setItem('th_hs', String(G.score));
    }

    const badge = document.getElementById('newHSBadge');
    badge.classList.toggle('off', !isNew);

    const acc = G.totalTargets > 0
      ? Math.round((G.hits / G.totalTargets) * 100)
      : 0;

    document.getElementById('gameOverStats').innerHTML =
      `FINAL SCORE:  <span>${G.score.toLocaleString()}</span><br>` +
      `HIGH SCORE:   <span>${G.highScore.toLocaleString()}</span><br>` +
      `WAVE REACHED: <span>${G.wave}</span><br>` +
      `GOLD:         <span>💰 ${G.gold.toLocaleString()}</span><br>` +
      `BEST COMBO:   <span>×${G.maxCombo}</span><br>` +
      `ACCURACY:     <span>${acc}%</span>`;

    UI.showScreen('gameOverScreen');
    document.getElementById('hud').classList.remove('active');
    document.getElementById('titleHS').textContent =
      `BEST: ${G.highScore.toLocaleString()}`;
  }
};

/* ============================================================
   SECTION 20 — MAIN GAME LOOP
   ============================================================ */
let lastTS = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTS) / 1000, 0.05); // max 50ms per frame
  lastTS = ts;

  // Advance game time only when actually playing
  if (G.phase === 'playing' && !G.paused) G.time += dt;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background draws when playing or on title
  if (G.phase === 'playing' || G.phase === 'title') {
    BG.draw(G.time);
  }

  if (G.phase === 'playing' && !G.paused) {
    /* ── UPDATE ── */
    Targets.update(G.time);
    Targets.updateDying(dt);    // FIX: frame-rate independent death animation

    // Update projectiles (move + out-of-bounds check)
    for (let i = projectiles.length - 1; i >= 0; i--) {
      projectiles[i].update(dt);
      if (!projectiles[i].alive) projectiles.splice(i, 1);
    }

    /* ── COLLISION (after update, before draw) ── */
    Targets.checkCollisions();

    /* ── Check last-shot ── */
    Weapons.checkLastShot();

    /* ── DRAW ── */
    Targets.draw();
    for (const p of projectiles) p.draw();
    Particles.update(dt);
    WeaponRenderer.draw(G.time);

  } else if (G.phase === 'playing' && G.paused) {
    // Paused — draw static frame, but continue dying animations
    Targets.updateDying(dt);
    Targets.draw();
    for (const p of projectiles) p.draw();
    WeaponRenderer.draw(G.time);
  }

  requestAnimationFrame(loop);
}

/* ── Boot ── */
requestAnimationFrame(ts => { lastTS = ts; loop(ts); });

// Init high score display on title screen
document.getElementById('titleHS').textContent =
  `BEST: ${G.highScore.toLocaleString()}`;
