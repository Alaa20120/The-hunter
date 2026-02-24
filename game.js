‘use strict’;
/* ============================================================
THE HUNTER v4 — game.js
NEW: Loading screen · Level select · Sound engine ·
Bow/Arrow images · Creatures · Barriers + Ricochet ·
Smooth aiming · Ad-gated refill · Accuracy bonus lives
============================================================ */

/* ============================================================
SECTION 1 — LEVEL CONFIGS
============================================================ */
const LEVEL_CONFIGS = [
// id, name, label, count, mH, mV, spd, reward, hasBarriers, hasCreatures, ricochet
{ id:1,  name:‘BOOT CAMP’,   label:‘Stationary targets. Learn the basics.’,
count:5,  mH:false,mV:false,spd:0,   reward:12, barriers:0, creatures:0 },
{ id:2,  name:‘SKIRMISH’,    label:‘Targets begin to move sideways.’,
count:7,  mH:true, mV:false,spd:0.6, reward:18, barriers:0, creatures:0 },
{ id:3,  name:‘AMBUSH’,      label:‘Faster movement. Stay focused.’,
count:8,  mH:true, mV:false,spd:0.95,reward:24, barriers:1, creatures:0 },
{ id:4,  name:‘FIREFIGHT’,   label:‘Vertical movement added. Use the walls!’,
count:9,  mH:true, mV:true, spd:1.2, reward:30, barriers:2, creatures:0 },
{ id:5,  name:‘DANGER ZONE’, label:‘First creatures appear. Hunt them!’,
count:10, mH:true, mV:true, spd:1.4, reward:38, barriers:2, creatures:2 },
{ id:6,  name:‘SHADOW RUN’,  label:‘More creatures. Precision is key.’,
count:11, mH:true, mV:true, spd:1.7, reward:46, barriers:3, creatures:3 },
{ id:7,  name:‘CHAOS’,       label:‘Heavy barriers. Bounce your shots!’,
count:12, mH:true, mV:true, spd:2.0, reward:56, barriers:4, creatures:3 },
{ id:8,  name:‘NIGHTMARE’,   label:‘Maximum difficulty. Survive!’,
count:15, mH:true, mV:true, spd:2.5, reward:70, barriers:5, creatures:5 },
];

function getLevelConfig(lvl) {
if (lvl <= LEVEL_CONFIGS.length) return { …LEVEL_CONFIGS[lvl-1] };
const base = { …LEVEL_CONFIGS[LEVEL_CONFIGS.length-1] };
const ex = lvl - LEVEL_CONFIGS.length;
base.count    += ex * 2;
base.spd      += ex * 0.3;
base.reward   += ex * 10;
base.barriers += Math.floor(ex * 0.5);
base.creatures+= Math.floor(ex * 0.5);
base.name  = `LEVEL ${lvl}`;
base.label = ‘Endless mode. How far can you go?’;
return base;
}

/* ============================================================
SECTION 2 — WEAPONS (Bows + Arrows)
============================================================ */
const BOWS = [
{ id:0, name:‘WOODEN BOW’,   price:0,   dmg:1, spd:0.85, color:’#c8a06a’,
trailR:200,trailG:160,trailB:100, desc:‘Classic recurve bow.’,
stats:{power:25,speed:35,pierce:10}, unlockLevel:1 },
{ id:1, name:‘STEEL HUNTER’, price:180, dmg:2, spd:1.05, color:’#ff9500’,
trailR:255,trailG:149,trailB:0,   desc:‘Forged steel. Burns on impact.’,
stats:{power:55,speed:60,pierce:20}, unlockLevel:2 },
{ id:2, name:‘BLAZE FIREBRAND’,price:420,dmg:3,spd:1.2,  color:’#ff4500’,
trailR:255,trailG:69, trailB:0,   desc:‘Wreathed in fire. Explosive shots.’,
stats:{power:75,speed:75,pierce:45}, unlockLevel:4 },
{ id:3, name:‘STORM ARC’,    price:850, dmg:4, spd:1.35, color:’#00aaff’,
trailR:0,  trailG:170,trailB:255, desc:‘Electric precision. Chains lightning.’,
stats:{power:88,speed:90,pierce:70}, unlockLevel:6 },
{ id:4, name:‘AEGIS LIGHT’,  price:1600,dmg:6, spd:1.55, color:’#ffd700’,
trailR:255,trailG:215,trailB:0,   desc:‘Divine artifact. Unstoppable.’,
stats:{power:100,speed:100,pierce:100}, unlockLevel:8 },
];

const ARROWS = [
{ id:0, name:‘WOOD ARROW’,   price:0,   dmg:1,   spd:1.0,  color:’#c8a06a’,
trailR:200,trailG:160,trailB:100, shape:‘arrow’,  desc:‘Basic wooden arrow.’,
bounce:0, stats:{power:20,speed:40,bounce:0}, unlockLevel:1 },
{ id:1, name:‘STEEL TIP’,    price:120, dmg:1.5, spd:1.1,  color:’#aaaaaa’,
trailR:180,trailG:180,trailB:180, shape:‘bolt’,   desc:‘Metal tip. Faster flight.’,
bounce:0, stats:{power:40,speed:60,bounce:0}, unlockLevel:2 },
{ id:2, name:‘FIRE ARROW’,   price:280, dmg:2,   spd:1.15, color:’#ff6600’,
trailR:255,trailG:100,trailB:0,   shape:‘fire’,   desc:‘Burns on impact. Flame trail.’,
bounce:0, stats:{power:60,speed:65,bounce:10}, unlockLevel:3 },
{ id:3, name:‘POISON BOLT’,  price:450, dmg:2.5, spd:1.0,  color:’#00ff44’,
trailR:0,  trailG:220,trailB:60,  shape:‘poison’, desc:‘Toxic cloud. Area damage.’,
bounce:0, stats:{power:70,speed:50,bounce:15}, unlockLevel:5 },
{ id:4, name:‘RICOCHET BOLT’,price:700, dmg:2,   spd:1.25, color:’#00f5ff’,
trailR:0,  trailG:245,trailB:255, shape:‘ricochet’,desc:‘Bounces off walls. Surprise attacks.’,
bounce:3, stats:{power:55,speed:70,bounce:100}, unlockLevel:6 },
{ id:5, name:‘DIVINE BOLT’,  price:1200,dmg:4,   spd:1.4,  color:’#ffd700’,
trailR:255,trailG:215,trailB:0,   shape:‘divine’, desc:‘Holy energy. Maximum power.’,
bounce:1, stats:{power:100,speed:85,bounce:50}, unlockLevel:8 },
];

/* ============================================================
SECTION 3 — CANVAS & UTILITIES
============================================================ */
const canvas = document.getElementById(‘gameCanvas’);
const ctx    = canvas.getContext(‘2d’);

function resizeCanvas() {
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener(‘resize’, resizeCanvas);

function lerp(a,b,t){ return a+(b-a)*t; }
function clamp(v,mn,mx){ return Math.max(mn,Math.min(mx,v)); }
function randBetween(a,b){ return a+Math.random()*(b-a); }
function dist2(ax,ay,bx,by){ const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }

/* ============================================================
SECTION 4 — SOUND ENGINE
============================================================ */
const Sound = {
ctx: null,
_buffers: {},
_muted: false,

init() {
try {
this.ctx = new (window.AudioContext || window.webkitAudioContext)();
} catch(e) { console.warn(‘No AudioContext’); }
},

/** Play from base64 data URI */
play(dataUri, volume=1.0, pitch=1.0) {
if (this._muted || !this.ctx) return;
// Resume context if suspended (mobile)
if (this.ctx.state === ‘suspended’) this.ctx.resume();

```
// Cache decoded buffer
if (this._buffers[dataUri]) {
  this._playBuffer(this._buffers[dataUri], volume, pitch);
  return;
}
// Fetch and decode
fetch(dataUri)
  .then(r => r.arrayBuffer())
  .then(ab => this.ctx.decodeAudioData(ab))
  .then(buf => {
    this._buffers[dataUri] = buf;
    this._playBuffer(buf, volume, pitch);
  })
  .catch(()=>{});
```

},

_playBuffer(buf, vol, pitch) {
const src = this.ctx.createBufferSource();
src.buffer = buf;
src.playbackRate.value = pitch;
const gain = this.ctx.createGain();
gain.gain.value = vol;
src.connect(gain);
gain.connect(this.ctx.destination);
src.start();
},

/** Pick random arrow shoot sound */
playShoot(bowId) {
const sounds = [
AUDIO.ARROW_1, AUDIO.ARROW_2, AUDIO.ARROW_3, AUDIO.ARROW_4,
AUDIO.ARROW_5, AUDIO.ARROW_6, AUDIO.ARROW_7, AUDIO.ARROW_8
];
const idx = bowId < sounds.length ? bowId : Math.floor(Math.random()*sounds.length);
this.play(sounds[idx], 0.8, 0.9 + Math.random()*0.2);
},

playCharge()        { this.play(AUDIO.CHARGE,          0.6, 1.0); },
playHit(combo=1)    {
const s = [AUDIO.HIT_1, AUDIO.HIT_2, AUDIO.HIT_3, AUDIO.HIT_4];
const i = Math.min(combo-1, s.length-1);
this.play(s[i], 0.9, 0.95+combo*0.05);
},
playMiss()          { this.play(Math.random()<0.5 ? AUDIO.MISS_1 : AUDIO.MISS_2, 0.7); },
playLevelComplete() { this.play(AUDIO.LEVEL_COMPLETE, 0.9); },
playEmptyAmmo()     { this.play(AUDIO.EMPTY_AMMO, 0.8); },
playLoading()       { this.play(AUDIO.LOADING, 0.4); },
};

/* ============================================================
SECTION 5 — IMAGE LOADER (bows & arrows sprite sheet)
============================================================ */
const ImgAssets = {
bowsSheet:   null,
arrowsSheet: null,
loaded: false,

load(onProgress) {
let done = 0;
const total = 2;
const check = () => {
done++;
onProgress(done/total);
if (done >= total) this.loaded = true;
};

```
const bi = new Image();
bi.onload = () => { this.bowsSheet = bi; check(); };
bi.onerror = check;
bi.src = IMAGES.bows;

const ai = new Image();
ai.onload = () => { this.arrowsSheet = ai; check(); };
ai.onerror = check;
ai.src = IMAGES.arrows;
```

},

/**

- Draw bow at given position
- Bows layout in sprite: 3 columns, 2 rows (Wooden, Steel, Blaze, w9, Aegis, w10)
- Map our 5 bows → image indices
  */
  drawBow(ctx, bowId, x, y, w, h, angle=0, glow=false, glowColor=’#fff’) {
  if (!this.bowsSheet) return this._fallbackBow(ctx, bowId, x, y, w, h);
  // Layout: 3 cols × 2 rows, each ~330×550px approx
  const cols = 3, rows = 2;
  const sw = this.bowsSheet.naturalWidth  / cols;
  const sh = this.bowsSheet.naturalHeight / rows;
  const bowMap = [0,1,2,4,3]; // our bow ids → sprite cells (0=Wooden,1=Steel,2=Blaze,3=Aegis,4=w9)
  const cell = bowMap[Math.min(bowId, 4)];
  const sx = (cell % cols) * sw;
  const sy = Math.floor(cell / cols) * sh;

```
ctx.save();
ctx.translate(x, y);
if (angle) ctx.rotate(angle);
if (glow) {
  ctx.shadowColor = glowColor;
  ctx.shadowBlur  = 20;
}
ctx.drawImage(this.bowsSheet, sx, sy, sw, sh, -w/2, -h/2, w, h);
ctx.restore();
```

},

/** Draw arrow type at position */
drawArrow(ctx, arrowId, x, y, w, h, angle=0) {
if (!this.arrowsSheet) return this._fallbackArrow(ctx, arrowId, x, y, w, h, angle);
// Arrows sheet: 8 columns × 1 row
const cols = 8;
const sw = this.arrowsSheet.naturalWidth / cols;
const sh = this.arrowsSheet.naturalHeight;
const col = Math.min(arrowId, cols-1);

```
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.drawImage(this.arrowsSheet, col*sw, 0, sw, sh, -w/2, -h/2, w, h);
ctx.restore();
```

},

_fallbackBow(ctx, id, x, y, w, h) {
const colors = [’#c8a06a’,’#ff9500’,’#ff4500’,’#00aaff’,’#ffd700’];
ctx.save();
ctx.strokeStyle = colors[id] || ‘#fff’;
ctx.lineWidth = 4;
ctx.shadowColor = colors[id] || ‘#fff’;
ctx.shadowBlur = 15;
ctx.beginPath();
ctx.moveTo(x - w*0.1, y - h*0.45);
ctx.quadraticCurveTo(x - w*0.5, y, x - w*0.1, y + h*0.45);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(x - w*0.1, y - h*0.45);
ctx.lineTo(x - w*0.1, y + h*0.45);
ctx.strokeStyle = ‘rgba(255,255,255,0.3)’;
ctx.lineWidth = 1;
ctx.stroke();
ctx.restore();
},

_fallbackArrow(ctx, id, x, y, w, h, angle) {
const colors = [’#c8a06a’,’#aaaaaa’,’#ff6600’,’#00ff44’,’#00f5ff’,’#ffd700’];
ctx.save();
ctx.translate(x,y); ctx.rotate(angle);
ctx.fillStyle = colors[id] || ‘#fff’;
ctx.shadowColor = colors[id] || ‘#fff’;
ctx.shadowBlur = 12;
ctx.beginPath();
ctx.moveTo(w*0.5,0); ctx.lineTo(-w*0.3,-h*0.15);
ctx.lineTo(-w*0.15,0); ctx.lineTo(-w*0.3,h*0.15);
ctx.closePath(); ctx.fill();
ctx.restore();
}
};

/* ============================================================
SECTION 6 — GAME STATE
============================================================ */
const G = {
phase:   ‘loading’,
paused:  false,
score:   0, gold:  0,
lives:   3, maxLives: 3,
ammo:    8, maxAmmo:  8,
wave:    1,
combo:   0, maxCombo: 0,
hits:    0, totalTargets: 0,
roundScore: 0, roundGold: 0,
equippedBow:   0,
equippedArrow: 0,
ownedBows:   [0],
ownedArrows: [0],
_adShown:            false,
_roundEndScheduled:  false,
highScore: parseInt(localStorage.getItem(‘th_hs’)||‘0’, 10),
unlockedLevels: JSON.parse(localStorage.getItem(‘th_levels’)||’[1]’),
time: 0,

togglePause() {
if (this.phase !== ‘playing’) return;
this.paused = !this.paused;
document.getElementById(‘pauseBtn’).textContent = this.paused ? ‘▶’ : ‘⏸’;
UI.showScreen(this.paused ? ‘pauseScreen’ : null);
},

unlockLevel(n) {
if (!this.unlockedLevels.includes(n)) {
this.unlockedLevels.push(n);
localStorage.setItem(‘th_levels’, JSON.stringify(this.unlockedLevels));
}
}
};

/* ============================================================
SECTION 7 — OBJECT POOLS
============================================================ */
let projectiles  = [];
let targets      = [];
let creatures    = [];
let barriers     = [];
let dyingTargets = [];
let particles    = [];
let stars        = [];
let screenShake  = { x:0, y:0, dur:0 };

function initStars() {
stars = [];
for (let i=0;i<130;i++) stars.push({
x:Math.random()*2000, y:Math.random()*2000,
z:Math.random()*900+100,
size:Math.random()*1.5+0.3,
tw:Math.random()*Math.PI*2
});
}
initStars();

/* ============================================================
SECTION 8 — SMOOTH DRAG / INPUT
New: velocity-based aiming, smoothing, dead zone
============================================================ */
const Drag = {
active:   false,
startX:   0, startY:   0,
currentX: 0, currentY: 0,
smoothX:  0,               // smoothed aim X
pullDist: 0, maxPull:  0,
charged:  false,
_prevX:   0,
_vel:     0,               // horizontal velocity for prediction

aimAngle() {
// Use smoothed X for aiming — much nicer feel
const dx = (this.smoothX - this.startX) * 0.72;
return Math.atan2(-canvas.height * 0.85, dx);
},

weaponPos() {
return {
wx: canvas.width / 2,
wy: canvas.height - Math.max(60, canvas.height * 0.1)
};
},

update(dt) {
if (!this.active) return;
// Smooth the aim X towards current finger position
const targetX = this.currentX;
this.smoothX  = lerp(this.smoothX, targetX, clamp(dt * 18, 0, 1));
this._vel     = (this.currentX - this._prevX) / (dt || 0.016);
this._prevX   = this.currentX;
}
};

function getXY(e) {
return e.touches
? { x:e.touches[0].clientX, y:e.touches[0].clientY }
: { x:e.clientX,            y:e.clientY };
}

function onDragStart(e) {
if (G.phase !== ‘playing’ || G.paused) return;
Sound.init(); // Ensure AudioContext after user gesture
const {x,y} = getXY(e);
Drag.active   = true;
Drag.startX   = x; Drag.startY   = y;
Drag.currentX = x; Drag.currentY = y;
Drag.smoothX  = x;
Drag._prevX   = x; Drag._vel     = 0;
Drag.maxPull  = canvas.height * 0.28;
Drag.pullDist = 0; Drag.charged  = false;
Sound.playCharge();
e.preventDefault();
}
function onDragMove(e) {
if (!Drag.active) return;
const {x,y} = getXY(e);
Drag.currentX = x; Drag.currentY = y;
Drag.pullDist = clamp(y - Drag.startY, 0, Drag.maxPull);
Drag.charged  = Drag.pullDist > Drag.maxPull * 0.15;
e.preventDefault();
}
function onDragEnd(e) {
if (!Drag.active) return;
Drag.active = false;
if (Drag.charged && Drag.pullDist > 8) Weapons.shoot();
e.preventDefault();
}

canvas.addEventListener(‘mousedown’,  onDragStart);
canvas.addEventListener(‘mousemove’,  onDragMove);
canvas.addEventListener(‘mouseup’,    onDragEnd);
canvas.addEventListener(‘touchstart’, onDragStart, {passive:false});
canvas.addEventListener(‘touchmove’,  onDragMove,  {passive:false});
canvas.addEventListener(‘touchend’,   onDragEnd,   {passive:false});
window.addEventListener(‘keydown’, e => { if(e.key===‘Escape’) G.togglePause(); });

/* ============================================================
SECTION 9 — WEAPONS MODULE
============================================================ */
const Weapons = {
_waitingForLastShot: false,

shoot() {
if (G.ammo<=0 || G.phase!==‘playing’ || G.paused) return;
const bow   = BOWS[G.equippedBow];
const arrow = ARROWS[G.equippedArrow];
const {wx,wy} = Drag.weaponPos();
const charge  = Math.max(0.35, Drag.pullDist / Drag.maxPull);
const spd     = (500 + charge*450) * bow.spd * arrow.spd;
const ang     = Drag.aimAngle();

```
projectiles.push(new Projectile(
  wx, wy,
  Math.cos(ang)*spd, Math.sin(ang)*spd,
  bow, arrow, arrow.bounce
));

G.ammo--;
HUD.updateAmmo();
Sound.playShoot(G.equippedBow);
FX.flashRGBA(bow.trailR, bow.trailG, bow.trailB, 0.12, 60);

if (G.ammo <= 0) {
  this._waitingForLastShot = true;
}
```

},

checkLastShot() {
if (!this._waitingForLastShot) return;
if (projectiles.length > 0) return;
if (!targets.some(t=>t.alive) && !creatures.some(c=>c.alive)) {
this._waitingForLastShot = false; return;
}
this._waitingForLastShot = false;
this.onAmmoEmpty();
},

onAmmoEmpty() {
if (G.phase !== ‘playing’) return;
if (!targets.some(t=>t.alive) && !creatures.some(c=>c.alive)) return;
Sound.playEmptyAmmo();
G.lives = Math.max(0, G.lives-1);
HUD.updateLives();
FX.shakeScreen(8, 400);
if (G.lives <= 0) {
FX.flashRGBA(255,45,85,0.6,350);
setTimeout(() => Ad.show(), 700);
} else {
FX.flashRGBA(255,45,85,0.3,200);
G.ammo  = G.maxAmmo;
G.combo = 0;
HUD.updateAmmo();
const rem = targets.filter(t=>t.alive).length + creatures.filter(c=>c.alive).length;
Overlays.showMiss(`${rem} REMAINING — ARROWS REFILLED`);
}
}
};

/* ============================================================
SECTION 10 — PROJECTILE CLASS
With ricochet support off barriers
============================================================ */
class Projectile {
constructor(x,y,vx,vy,bow,arrow,maxBounces) {
this.x=x; this.y=y; this.vx=vx; this.vy=vy;
this.bow=bow; this.arrow=arrow;
this.alive=true; this.hit=false;
this.trail=[]; this.age=0;
this.rot=Math.atan2(vy,vx);
this.bouncesLeft = maxBounces || 0;
this.bouncedFrom = [];  // track which barriers we bounced off
}

update(dt) {
this.trail.push({x:this.x, y:this.y});
if (this.trail.length > 20) this.trail.shift();

```
this.x += this.vx*dt;
this.y += this.vy*dt;
this.age += dt;
this.rot  = Math.atan2(this.vy, this.vx);

// Barrier bounce
if (this.bouncesLeft > 0) {
  for (const bar of barriers) {
    if (this.bouncedFrom.includes(bar)) continue;
    if (this._checkBarrierBounce(bar)) {
      this.bouncesLeft--;
      this.bouncedFrom.push(bar);
      FX.flashRGBA(100,200,255,0.2,80);
      Particles.spawn(this.x,this.y,[this.arrow.trailR,this.arrow.trailG,this.arrow.trailB],6);
      break;
    }
  }
} else {
  // Clear bounce memory once we've used all bounces
  this.bouncedFrom = [];
}

// Out of bounds
const pad = 80;
if (this.x<-pad || this.x>canvas.width+pad || this.y<-pad || this.y>canvas.height+pad) {
  this.alive = false;
  if (!this.hit) FX.missPop(Drag.weaponPos().wx, Drag.weaponPos().wy-65);
}
```

}

_checkBarrierBounce(bar) {
// Simple AABB check
const r = 8; // projectile radius
if (this.x+r < bar.x || this.x-r > bar.x+bar.w ||
this.y+r < bar.y || this.y-r > bar.y+bar.h) return false;

```
// Which side did we hit?
const overlapL = (this.x+r) - bar.x;
const overlapR = (bar.x+bar.w) - (this.x-r);
const overlapT = (this.y+r) - bar.y;
const overlapB = (bar.y+bar.h) - (this.y-r);

const minH = Math.min(overlapL, overlapR);
const minV = Math.min(overlapT, overlapB);

if (minH < minV) {
  this.vx = -this.vx; // bounce horizontal
  this.x += overlapL < overlapR ? -overlapL*2 : overlapR*2;
} else {
  this.vy = -this.vy; // bounce vertical
  this.y += overlapT < overlapB ? -overlapT*2 : overlapB*2;
}
Sound.play(AUDIO.MISS_1, 0.4, 1.5); // clank sound on bounce
return true;
```

}

draw() {
const bow   = this.bow;
const arrow = this.arrow;

```
// Trail
for (let i=0;i<this.trail.length;i++) {
  const ratio = i/this.trail.length;
  const alpha = ratio*0.5;
  const radius = ratio*8;
  if (radius < 0.1) continue;
  ctx.beginPath();
  ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI*2);
  ctx.fillStyle = `rgba(${arrow.trailR},${arrow.trailG},${arrow.trailB},${alpha})`;
  ctx.fill();
}

// Draw arrow image
const aw = 48, ah = 16;
ImgAssets.drawArrow(ctx, G.equippedArrow, this.x, this.y, aw, ah, this.rot);

// Extra glow for special arrows
if (arrow.shape==='fire'||arrow.shape==='divine') {
  ctx.save();
  ctx.shadowColor = arrow.color;
  ctx.shadowBlur  = 18;
  ctx.beginPath();
  ctx.arc(this.x, this.y, 6, 0, Math.PI*2);
  ctx.fillStyle = arrow.color+'88';
  ctx.fill();
  ctx.restore();
}
if (arrow.shape==='poison') {
  const p = Math.sin(this.age*10)*0.4+0.6;
  ctx.save();
  ctx.globalAlpha = p*0.6;
  ctx.beginPath();
  ctx.arc(this.x, this.y, 10, 0, Math.PI*2);
  ctx.fillStyle = '#00ff4444';
  ctx.fill();
  ctx.restore();
}
```

}
}

/* ============================================================
SECTION 11 — BARRIERS
============================================================ */
function spawnBarriers(count) {
barriers = [];
if (count <= 0) return;
const W = canvas.width, H = canvas.height;
const horizonY = H * 0.52;
const playH    = horizonY * 0.9;
const playW    = W * 0.8;
const startX   = W * 0.1;

for (let i=0; i<count; i++) {
const isVertical = Math.random() > 0.4;
const bw = isVertical ? 14 : 90 + Math.random()*60;
const bh = isVertical ? 80 + Math.random()*60 : 14;
const x  = startX + Math.random() * (playW - bw);
const y  = H*0.08 + Math.random() * (playH*0.75 - bh);
barriers.push({
x, y, w:bw, h:bh,
color: `hsl(${200+Math.random()*60},60%,40%)`,
glow:  `hsl(${200+Math.random()*60},80%,65%)`,
alpha: 0.85
});
}
}

function drawBarriers() {
for (const bar of barriers) {
ctx.save();
// Glow
ctx.shadowColor = bar.glow;
ctx.shadowBlur  = 12;
// Fill
ctx.fillStyle = bar.color;
ctx.globalAlpha = bar.alpha;
ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
// Border
ctx.strokeStyle = bar.glow;
ctx.lineWidth   = 2;
ctx.strokeRect(bar.x, bar.y, bar.w, bar.h);
ctx.restore();
}
}

/* ============================================================
SECTION 12 — CREATURES
Creatures move and bob — extra reward to hunt
============================================================ */
const CREATURE_TYPES = [
{ name:‘BIRD’,    emoji:‘🦅’, size:36, speed:1.8, reward:80,  color:’#ffaa00’, rgb:‘255,170,0’ },
{ name:‘BAT’,     emoji:‘🦇’, size:32, speed:2.4, reward:90,  color:’#cc44ff’, rgb:‘204,68,255’ },
{ name:‘DRAGON’,  emoji:‘🐉’, size:48, speed:1.2, reward:150, color:’#ff3300’, rgb:‘255,51,0’   },
{ name:‘WOLF’,    emoji:‘🐺’, size:38, speed:2.0, reward:100, color:’#8888ff’, rgb:‘136,136,255’},
{ name:‘HAWK’,    emoji:‘🦉’, size:34, speed:2.2, reward:85,  color:’#ffcc44’, rgb:‘255,204,68’ },
];

function spawnCreatures(count) {
creatures = [];
const W = canvas.width, H = canvas.height;
const horizonY = H * 0.52;
for (let i=0; i<count; i++) {
const type = CREATURE_TYPES[Math.floor(Math.random()*CREATURE_TYPES.length)];
const x    = 0.1*W + Math.random()*0.8*W;
const y    = H*0.06 + Math.random()*horizonY*0.82;
const dir  = Math.random()>0.5 ? 1 : -1;
creatures.push({
x, y, baseX:x, baseY:y,
vx: dir * (type.speed + Math.random()*0.8),
vy: (Math.random()-0.5)*0.6,
phase: Math.random()*Math.PI*2,
type, alive:true, flashTimer:0,
size: type.size,
reward: type.reward,
ring: 0
});
}
}

function updateCreatures(dt) {
const W = canvas.width, H = canvas.height;
const horizonY = H * 0.52;
for (const c of creatures) {
if (!c.alive) continue;
c.x += c.vx * dt * 60;
c.y += c.vy * dt * 60 + Math.sin(c.phase + G.time*3) * 0.4;
c.phase += dt * 2;
c.ring = (c.ring + 0.06) % (Math.PI*2);
// Bounce off edges
if (c.x < c.size*0.5 || c.x > W-c.size*0.5) c.vx *= -1;
if (c.y < c.size*0.5 || c.y > horizonY-c.size*0.5) c.vy *= -1;
}
}

function drawCreatures() {
for (const c of creatures) {
if (!c.alive) continue;
const r = c.size*0.5;
// Outer ring
const rr = r + 3 + Math.sin(c.ring)*3;
ctx.beginPath(); ctx.arc(c.x,c.y,rr,0,Math.PI*2);
ctx.strokeStyle = `rgba(${c.type.rgb},${0.3+Math.sin(c.ring)*0.15})`;
ctx.lineWidth = 1.5; ctx.stroke();
// Body bg
ctx.beginPath(); ctx.arc(c.x,c.y,r,0,Math.PI*2);
ctx.fillStyle = `rgba(${c.type.rgb},0.12)`;
ctx.fill();
ctx.strokeStyle = c.type.color;
ctx.lineWidth = 2;
ctx.shadowColor = c.type.color;
ctx.shadowBlur  = c.flashTimer>0 ? 30 : 8;
ctx.stroke(); ctx.shadowBlur=0;
// Emoji
ctx.save();
ctx.font = `${r*1.1}px serif`;
ctx.textAlign=‘center’; ctx.textBaseline=‘middle’;
// Mirror horizontally if moving left
if (c.vx < 0) { ctx.scale(-1,1); ctx.fillText(c.type.emoji,-c.x,c.y); }
else            { ctx.fillText(c.type.emoji, c.x, c.y); }
ctx.restore();
// Hit flash
if (c.flashTimer>0) {
ctx.beginPath(); ctx.arc(c.x,c.y,r*1.5,0,Math.PI*2);
ctx.fillStyle=`rgba(${c.type.rgb},${c.flashTimer*0.4})`; ctx.fill();
c.flashTimer = Math.max(0, c.flashTimer-0.08);
}
}
}

/* ============================================================
SECTION 13 — TARGETS
============================================================ */
const Targets = {
spawn() {
targets=[]; dyingTargets=[]; creatures=[];
G._roundEndScheduled = false;

```
const cfg = getLevelConfig(G.wave);
const W   = canvas.width, H = canvas.height;
const horizonY = H * 0.52;
G.totalTargets = cfg.count + cfg.creatures;
G.hits = 0;

const cols = Math.ceil(Math.sqrt(cfg.count));
const rows = Math.ceil(cfg.count / cols);
const mx=W*0.1, my=H*0.05, aw=W*0.8, ah=horizonY*0.85;

for (let i=0;i<cfg.count;i++) {
  const col=i%cols, row=Math.floor(i/cols);
  const bx = mx + (aw/cols)*col + (aw/cols)*0.5;
  const by = my + (ah/rows)*row + (ah/rows)*0.5;
  const dep = 0.2 + Math.random()*0.55;
  const sz  = lerp(88, 24, dep);
  const py  = by + dep*H*0.07;
  const isBonus = (i%7===0&&i!==0)||(i%11===0&&i!==0);

  targets.push({
    x:bx, y:py, baseX:bx, baseY:py,
    depth:dep, size:sz, alive:true, flashTimer:0,
    moveH: cfg.mH && Math.random()>0.3,
    moveV: cfg.mV && Math.random()>0.5,
    spdH:(Math.random()*cfg.spd+0.2)*(Math.random()>0.5?1:-1),
    spdV:(Math.random()*cfg.spd*0.4+0.15)*(Math.random()>0.5?1:-1),
    phH:Math.random()*Math.PI*2, phV:Math.random()*Math.PI*2,
    rngH:(30+Math.random()*65)*(1-dep*0.5),
    rngV:(14+Math.random()*30)*(1-dep*0.5),
    ring:0,
    reward: Math.floor(cfg.reward*(1+dep*0.6)),
    type: isBonus ? 'bonus' : 'normal'
  });
}

// Spawn barriers and creatures
spawnBarriers(cfg.barriers || 0);
spawnCreatures(cfg.creatures || 0);
```

},

update(t) {
for (const tgt of targets) {
if (!tgt.alive) continue;
if (tgt.moveH) tgt.x = tgt.baseX + Math.sin(t*tgt.spdH+tgt.phH)*tgt.rngH;
if (tgt.moveV) tgt.y = tgt.baseY + Math.sin(t*tgt.spdV+tgt.phV)*tgt.rngV;
}
updateCreatures(1/60);
},

updateDying(dt) {
for (const d of dyingTargets) d.age += dt*1.3;
},

draw() {
drawBarriers();

```
for (const tgt of targets) {
  if (!tgt.alive) continue;
  tgt.ring=(tgt.ring+0.04)%(Math.PI*2);
  const x=tgt.x, y=tgt.y, r=tgt.size*0.5;
  const isB = tgt.type==='bonus';
  const rgb = isB?'255,215,0':'0,245,255';
  const pc  = isB?'#ffd700':'#00f5ff';

  ctx.save();
  // Shadow
  ctx.beginPath(); ctx.ellipse(x,y+r*0.38,r*0.58,r*0.11,0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fill();
  // Pulse ring
  const rr=r+4+Math.sin(tgt.ring)*4;
  ctx.beginPath(); ctx.arc(x,y,rr,0,Math.PI*2);
  ctx.strokeStyle=`rgba(${rgb},${0.28+Math.sin(tgt.ring)*0.14})`;
  ctx.lineWidth=1.5; ctx.stroke();
  // Body
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  const bg=ctx.createRadialGradient(x-r*0.2,y-r*0.2,0,x,y,r);
  bg.addColorStop(0,`rgba(${rgb},.26)`); bg.addColorStop(1,`rgba(${rgb},.05)`);
  ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle=pc; ctx.lineWidth=2;
  ctx.shadowColor=pc; ctx.shadowBlur=tgt.flashTimer>0?35:12; ctx.stroke();
  ctx.shadowBlur=0;
  // Inner rings
  for (let ri=1;ri<=3;ri++) {
    ctx.beginPath(); ctx.arc(x,y,r*(1-ri*0.22),0,Math.PI*2);
    ctx.strokeStyle=`rgba(${rgb},${0.38-ri*0.07})`; ctx.lineWidth=1; ctx.stroke();
  }
  // Center
  ctx.beginPath(); ctx.arc(x,y,r*0.11,0,Math.PI*2);
  ctx.fillStyle=isB?'#ffd700':'#fff';
  ctx.shadowColor=pc; ctx.shadowBlur=14; ctx.fill(); ctx.shadowBlur=0;
  if (isB) {
    ctx.font=`${r*0.5}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('★',x,y);
  }
  if (tgt.flashTimer>0) {
    ctx.beginPath(); ctx.arc(x,y,r*1.4,0,Math.PI*2);
    ctx.fillStyle=`rgba(${rgb},${tgt.flashTimer*0.38})`; ctx.fill();
    tgt.flashTimer=Math.max(0,tgt.flashTimer-0.07);
  }
  ctx.restore();
}

drawCreatures();

// Dying rings
for (let i=dyingTargets.length-1;i>=0;i--) {
  const d=dyingTargets[i];
  if (d.age>=1){dyingTargets.splice(i,1);continue;}
  const r=d.r*(1+d.age*2.2), a=1-d.age;
  ctx.beginPath(); ctx.arc(d.x,d.y,r,0,Math.PI*2);
  ctx.strokeStyle=`rgba(${d.rgb},${a*0.75})`;
  ctx.lineWidth=2; ctx.shadowColor=d.color; ctx.shadowBlur=22; ctx.stroke();
  ctx.shadowBlur=0;
}
```

},

checkCollisions() {
const allTargets = [
…targets.filter(t=>t.alive).map(t=>({obj:t,isCreature:false})),
…creatures.filter(c=>c.alive).map(c=>({obj:c,isCreature:true}))
];

```
for (const proj of projectiles) {
  if (!proj.alive || proj.hit) continue;
  for (const {obj,isCreature} of allTargets) {
    const threshold = obj.size*0.52+6;
    if (dist2(proj.x,proj.y,obj.x,obj.y) < threshold*threshold) {
      proj.hit=true; proj.alive=false;
      this.onHit(obj, proj.x, proj.y, isCreature);
      break;
    }
  }
}
```

},

onHit(obj, px, py, isCreature) {
obj.alive=false; obj.flashTimer=1.0;
G.hits++; G.combo++;
if (G.combo>G.maxCombo) G.maxCombo=G.combo;

```
const isB   = obj.type==='bonus';
const mult  = 1 + Math.floor(G.combo/2)*0.25;
const baseR = isCreature ? obj.reward : obj.reward;
const pts   = Math.floor(baseR*(isB?3:1)*mult*(isCreature?1.5:1));
const gold  = Math.floor((isB?baseR:Math.ceil(baseR*0.35))*(1+G.combo*0.08));

G.score+=pts; G.gold+=gold;
G.roundScore+=pts; G.roundGold+=gold;

// Accuracy bonus: perfect hits restore life
const totalShot = G.maxAmmo - G.ammo + G.hits;
if (G.hits > 0 && G.hits % 5 === 0 && G.combo >= 3 && G.lives < G.maxLives) {
  G.lives = Math.min(G.maxLives, G.lives+1);
  HUD.updateLives();
  Overlays.showAccuracyBonus('+1 ❤️ ACCURACY BONUS!');
}

const rgb = isCreature ? obj.type.rgb : (isB?'255,215,0':'0,245,255');
const col  = isCreature ? obj.type.color : (isB?'#ffd700':'#00f5ff');

dyingTargets.push({x:obj.x,y:obj.y,r:obj.size*0.5,age:0,color:col,rgb});
Particles.spawn(px,py,[...rgb.split(',').map(Number)], isCreature?28:(isB?22:14));
FX.scorePop(obj.x-25, obj.y-30, isCreature?`🎯+${pts}`:`+${pts}`, col);

const cr=parseInt(rgb.split(',')[0]), cg=parseInt(rgb.split(',')[1]),cb=parseInt(rgb.split(',')[2]);
FX.flashRGBA(cr,cg,cb, isB?0.18:0.12, 90);

Sound.playHit(Math.min(G.combo,4));
if (G.combo>1) Overlays.showCombo(G.combo);
HUD.update();

const allDone = !targets.some(t=>t.alive) && !creatures.some(c=>c.alive);
if (!G._roundEndScheduled && allDone) {
  G._roundEndScheduled = true;
  Sound.playLevelComplete();
  setTimeout(()=>Game.roundEnd(), 900);
}
```

}
};

/* ============================================================
SECTION 14 — PARTICLES
============================================================ */
const Particles = {
spawn(x,y,[r,g,b],count=14) {
for (let i=0;i<count;i++) {
const a=(Math.PI*2/count)*i+Math.random()*0.5;
const spd=80+Math.random()*220;
particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
life:1, decay:0.7+Math.random()*1.0, size:2+Math.random()*5.5, r,g,b});
}
},
update(dt) {
for (let i=particles.length-1;i>=0;i–) {
const p=particles[i];
p.x+=p.vx*dt; p.y+=p.vy*dt;
p.vx*=0.90; p.vy*=0.90; p.vy+=50*dt;
p.life-=p.decay*dt;
if (p.life<=0){particles.splice(i,1);continue;}
ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);
ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.life})`; ctx.fill();
}
}
};

/* ============================================================
SECTION 15 — BACKGROUND
============================================================ */
const BG = {
draw(t) {
const W=canvas.width, H=canvas.height, cx=W/2;
const sky=ctx.createLinearGradient(0,0,0,H);
sky.addColorStop(0,’#000913’); sky.addColorStop(0.55,’#001525’); sky.addColorStop(1,’#000610’);
ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
for (const s of stars) {
s.tw+=0.018;
const sx=(s.x-1000)/s.z*280+cx;
const sy=(s.y-1000)/s.z*280+H*0.35;
if (sx<0||sx>W||sy<0||sy>H*0.6) continue;
const alpha=(0.35+Math.sin(s.tw)*0.28)*(1-s.z/1000);
ctx.beginPath(); ctx.arc(sx,sy,s.size*(1-s.z/1100),0,Math.PI*2);
ctx.fillStyle=`rgba(200,230,255,${alpha})`; ctx.fill();
}
const hg=ctx.createRadialGradient(cx,H*0.52,0,cx,H*0.52,W*0.55);
hg.addColorStop(0,‘rgba(0,100,180,.1)’); hg.addColorStop(1,‘transparent’);
ctx.fillStyle=hg; ctx.fillRect(0,0,W,H);
const horizon=H*0.52;
const scroll=(t*0.045)%1;
ctx.save(); ctx.beginPath(); ctx.rect(0,horizon,W,H-horizon); ctx.clip();
for (let i=0;i<=20;i++) {
const p=(i+scroll)/20;
const y=horizon+(H-horizon)*Math.pow(p,1.9);
ctx.strokeStyle=`rgba(0,245,255,${Math.pow(p,0.5)*0.12})`;
ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
}
for (let i=-22;i<=22;i++) {
const fx=cx+(i/22)*W*0.62;
ctx.strokeStyle=‘rgba(0,245,255,.06)’; ctx.lineWidth=1;
ctx.beginPath(); ctx.moveTo(cx,horizon); ctx.lineTo(fx,H); ctx.stroke();
}
ctx.restore();
ctx.strokeStyle=‘rgba(0,245,255,.28)’; ctx.lineWidth=1;
ctx.beginPath(); ctx.moveTo(0,horizon); ctx.lineTo(W,horizon); ctx.stroke();
}
};

/* ============================================================
SECTION 16 — BOW RENDERER (draws actual bow image)
============================================================ */
const WeaponRenderer = {
draw(t) {
const bow   = BOWS[G.equippedBow];
const {wx,wy} = Drag.weaponPos();

```
// Platform glow
const glow=ctx.createRadialGradient(wx,wy+12,0,wx,wy+12,85);
glow.addColorStop(0,'rgba(0,245,255,.14)'); glow.addColorStop(1,'transparent');
ctx.fillStyle=glow;
ctx.beginPath(); ctx.ellipse(wx,wy+22,72,14,0,0,Math.PI*2); ctx.fill();

// Aim line
if (Drag.active && Drag.pullDist>5) {
  const ang=Drag.aimAngle();
  ctx.save();
  ctx.strokeStyle=`rgba(${bow.trailR},${bow.trailG},${bow.trailB},.3)`;
  ctx.lineWidth=1.5; ctx.setLineDash([7,13]);
  ctx.beginPath(); ctx.moveTo(wx,wy);
  ctx.lineTo(wx+Math.cos(ang)*canvas.height*0.5, wy+Math.sin(ang)*canvas.height*0.5);
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

// Draw bow image (rotated/scaled)
const bowH = Math.max(90, Math.min(canvas.height*0.16, 140));
const bowW = bowH * 0.45;
const chargeScale = Drag.active ? 1+(Drag.pullDist/Drag.maxPull)*0.12 : 1;
const sway = Drag.active
  ? (Drag.smoothX - Drag.startX)*0.04
  : Math.sin(t*0.8)*2.5;
const aimAng = Drag.active ? Drag.aimAngle() + Math.PI/2 : -Math.PI*0.05;

ctx.save();
ctx.translate(wx+sway, wy);
ctx.scale(chargeScale, chargeScale);
ImgAssets.drawBow(ctx, G.equippedBow, 0, 0, bowW, bowH, aimAng,
  Drag.charged, bow.color);
ctx.restore();

// Charge arc
if (Drag.active) {
  const ch=Drag.pullDist/Drag.maxPull;
  const sz=Math.max(36,Math.min(canvas.height*0.07,56));
  ctx.beginPath();
  ctx.arc(wx,wy,sz*0.9,-Math.PI*0.5,-Math.PI*0.5+Math.PI*2*ch);
  ctx.strokeStyle=bow.color; ctx.lineWidth=3;
  ctx.shadowColor=bow.color; ctx.shadowBlur=16; ctx.stroke(); ctx.shadowBlur=0;
  if (ch>0.1) {
    ctx.fillStyle=bow.color;
    ctx.font=`bold ${Math.max(10,sz*0.22)}px Orbitron`;
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillText(Math.round(ch*100)+'%', wx, wy+sz*0.9);
  }
}
```

}
};

/* ============================================================
SECTION 17 — FX
============================================================ */
const FX = {
flashRGBA(r,g,b,alpha,dur=150) {
const el=document.getElementById(‘screenFlash’);
el.style.transition=‘none’;
el.style.background=`rgba(${r},${g},${b},1)`;
el.style.opacity=String(alpha);
void el.offsetHeight;
el.style.transition=`opacity ${dur}ms ease-out`;
el.style.opacity=‘0’;
},

shakeScreen(intensity, dur) {
screenShake.dur=dur;
screenShake.x=intensity;
screenShake.y=intensity;
},

scorePop(x,y,text,color) {
const el=document.createElement(‘div’);
el.className=‘score-pop’;
el.textContent=text;
const fs=Math.max(14,canvas.width*0.03);
el.style.cssText=`left:${x}px;top:${y}px;color:${color};font-size:${fs}px;text-shadow:0 0 10px ${color}`;
document.body.appendChild(el);
setTimeout(()=>el.remove(),950);
},

missPop(x,y) {
Sound.playMiss();
const el=document.createElement(‘div’);
el.className=‘miss-pop’;
el.textContent=‘MISS’;
el.style.cssText=`left:${x-20}px;top:${y}px;font-size:${Math.max(12,canvas.width*0.025)}px`;
document.body.appendChild(el);
setTimeout(()=>el.remove(),700);
}
};

/* ============================================================
SECTION 18 — OVERLAYS
============================================================ */
const Overlays = {
showCombo(n) {
const labels=[’’,’’,‘DOUBLE!’,‘TRIPLE!’,‘QUAD!!’,‘PENTA!!!’,‘ULTRA!!!!!’];
const el=document.getElementById(‘comboDisplay’);
el.textContent=n>=labels.length?`${n}× COMBO!!`:labels[n];
el.classList.add(‘show’);
clearTimeout(el._t);
el._t=setTimeout(()=>el.classList.remove(‘show’),950);
},
showMiss(msg) {
const el=document.getElementById(‘missDisplay’);
el.textContent=msg;
el.classList.add(‘show’);
clearTimeout(el._t);
el._t=setTimeout(()=>el.classList.remove(‘show’),1500);
},
showAccuracyBonus(msg) {
const el=document.getElementById(‘accuracyBonus’);
el.textContent=msg;
el.classList.add(‘show’);
clearTimeout(el._t);
el._t=setTimeout(()=>el.classList.remove(‘show’),2000);
},
showWave() {
const cfg=getLevelConfig(G.wave);
document.getElementById(‘waveAnnounceText’).textContent=`LEVEL ${G.wave}`;
document.getElementById(‘waveSubText’).textContent=cfg.name;
const ov=document.getElementById(‘waveOverlay’);
const txt=document.getElementById(‘waveAnnounceText’);
txt.classList.remove(‘animate’); void txt.offsetWidth; txt.classList.add(‘animate’);
ov.classList.add(‘show’);
setTimeout(()=>ov.classList.remove(‘show’),2400);
}
};

/* ============================================================
SECTION 19 — HUD
============================================================ */
const HUD = {
update() {
this._setNum(‘hudScore’,G.score);
this._setNum(‘hudGold’, G.gold);
document.getElementById(‘hudWave’).textContent=G.wave;
document.getElementById(‘hudWaveLabel’).textContent=getLevelConfig(G.wave).name;
this.updateAmmo(); this.updateLives();
},
_setNum(id,v) {
const el=document.getElementById(id);
el.textContent=v.toLocaleString();
el.classList.add(‘pop’);
setTimeout(()=>el.classList.remove(‘pop’),130);
},
updateAmmo() {
const bar=document.getElementById(‘ammoBar’); bar.innerHTML=’’;
for (let i=0;i<G.maxAmmo;i++) {
const p=document.createElement(‘div’);
p.className=‘ammo-pip’+(i>=G.ammo?’ used’:’’);
bar.appendChild(p);
}
},
updateLives() {
const row=document.getElementById(‘livesRow’); row.innerHTML=’’;
for (let i=0;i<G.maxLives;i++) {
const d=document.createElement(‘div’);
d.className=‘life-dot’+(i>=G.lives?’ empty’:’’);
row.appendChild(d);
}
}
};

/* ============================================================
SECTION 20 — UI
============================================================ */
const UI = {
showScreen(id) {
document.querySelectorAll(’.screen’).forEach(s=>s.classList.add(‘off’));
if (id) document.getElementById(id).classList.remove(‘off’);
}
};

/* ============================================================
SECTION 21 — LEVEL SELECT
============================================================ */
const LevelSelect = {
build() {
const grid=document.getElementById(‘levelGrid’); grid.innerHTML=’’;
document.getElementById(‘lsHighScore’).textContent=`BEST SCORE: ${G.highScore.toLocaleString()}`;

```
for (let i=1; i<=LEVEL_CONFIGS.length; i++) {
  const cfg=LEVEL_CONFIGS[i-1];
  const unlocked=G.unlockedLevels.includes(i);
  const card=document.createElement('div');
  card.className=`ls-card${unlocked?'':' locked'}`;
  card.innerHTML=`
    <div class="ls-num">${i}</div>
    <div class="ls-name">${cfg.name}</div>
    <div class="ls-desc">${unlocked ? cfg.label : '🔒 LOCKED'}</div>
    <div class="ls-meta">
      <span>${cfg.count} targets</span>
      ${cfg.creatures>0?`<span>🦅 ${cfg.creatures}</span>`:''}
      ${cfg.barriers>0?`<span>🧱 ${cfg.barriers}</span>`:''}
    </div>`;
  if (unlocked) card.onclick=()=>Game.start(i);
  grid.appendChild(card);
}

// Endless card
const endless=document.createElement('div');
endless.className='ls-card ls-endless';
endless.innerHTML=`<div class="ls-num">∞</div><div class="ls-name">ENDLESS</div>
  <div class="ls-desc">Continue beyond Level ${LEVEL_CONFIGS.length}</div>`;
if (G.unlockedLevels.includes(LEVEL_CONFIGS.length)) {
  endless.onclick=()=>Game.start(LEVEL_CONFIGS.length+1);
} else {
  endless.classList.add('locked');
}
grid.appendChild(endless);
```

}
};

/* ============================================================
SECTION 22 — SHOP
============================================================ */
const Shop = {
_fromTitle: false,
_tab: ‘bows’,

open() {
this._fromTitle=false;
G.phase=‘shop’;
UI.showScreen(‘shopScreen’);
this._render();
},

openFromTitle() {
this._fromTitle=true;
G.phase=‘shop’;
UI.showScreen(‘shopScreen’);
this._render();
},

close() {
if (this._fromTitle) {
G.phase=‘title’;
UI.showScreen(‘titleScreen’);
} else {
G.phase=‘roundEnd’;
UI.showScreen(‘roundScreen’);
}
},

switchTab(tab) {
this._tab=tab;
document.getElementById(‘tabBows’).classList.toggle(‘active’, tab===‘bows’);
document.getElementById(‘tabArrows’).classList.toggle(‘active’, tab===‘arrows’);
this._render();
},

_render() {
document.getElementById(‘shopGold’).textContent=G.gold.toLocaleString();
const grid=document.getElementById(‘shopGrid’); grid.innerHTML=’’;
const items = this._tab===‘bows’ ? BOWS : ARROWS;
const owned = this._tab===‘bows’ ? G.ownedBows : G.ownedArrows;
const equipped = this._tab===‘bows’ ? G.equippedBow : G.equippedArrow;

```
items.forEach(item => {
  const isOwned    = owned.includes(item.id);
  const isEquipped = equipped===item.id;
  const locked     = !isOwned && G.gold<item.price;
  const lvlLock    = !isOwned && G.unlockedLevels[G.unlockedLevels.length-1]<item.unlockLevel;

  const card=document.createElement('div');
  card.className=['weapon-card',
    isOwned?'owned':'', isEquipped?'equipped':'',
    locked||lvlLock?'locked':''
  ].filter(Boolean).join(' ');

  const badge=isEquipped?'<div class="card-badge badge-equipped">EQUIPPED</div>'
            :isOwned?'<div class="card-badge badge-owned">OWNED</div>':'';
  const priceText=item.price===0?'✓ DEFAULT':isOwned?'✓ OWNED':`💰 ${item.price}`;
  const lvlText=lvlLock?`🔒 Lvl ${item.unlockLevel}`:'';
  const dot=(v,mx)=>`<div class="stat-track"><div class="stat-fill" style="width:${v}%;background:${item.color}"></div></div>`;

  card.innerHTML=`${badge}
    <div class="weapon-emoji" style="font-size:36px;color:${item.color};text-shadow:0 0 15px ${item.color}">
      ${this._tab==='bows'?'🏹':'🏹'}
    </div>
    <div class="weapon-name">${item.name}</div>
    <div class="weapon-desc">${lvlText||item.desc}</div>
    <div class="weapon-stat"><span class="stat-label">PWR</span>${dot(item.stats.power)}</div>
    <div class="weapon-stat"><span class="stat-label">SPD</span>${dot(item.stats.speed)}</div>
    <div class="weapon-stat"><span class="stat-label">${this._tab==='bows'?'PIERCE':'BOUNCE'}</span>${dot(this._tab==='bows'?item.stats.pierce:(item.stats.bounce||0))}</div>
    <div class="weapon-price">${priceText}</div>`;

  if (!locked && !lvlLock) card.onclick=()=>this._buyOrEquip(item.id);
  grid.appendChild(card);
});
```

},

_buyOrEquip(id) {
const items  = this._tab===‘bows’ ? BOWS : ARROWS;
const owned  = this._tab===‘bows’ ? G.ownedBows : G.ownedArrows;
const item   = items[id];
if (owned.includes(id)) {
if (this._tab===‘bows’) G.equippedBow=id;
else                    G.equippedArrow=id;
} else if (G.gold >= item.price) {
G.gold -= item.price;
owned.push(id);
if (this._tab===‘bows’) G.equippedBow=id;
else                    G.equippedArrow=id;
FX.flashRGBA(255,215,0,0.2,200);
}
this._render();
}
};

/* ============================================================
SECTION 23 — AD MODULE
============================================================ */
const Ad = {
show() {
if (G._adShown) { Game.gameOver(); return; }
G.phase=‘ad’; G._adShown=true;
UI.showScreen(‘adScreen’);
const bar=document.getElementById(‘adProgressBar’);
bar.style.transition=‘none’; bar.style.width=‘0%’;
document.getElementById(‘adCountdown’).textContent=‘3’;
document.getElementById(‘watchAdBtn’).disabled=false;
},

watch() {
document.getElementById(‘watchAdBtn’).disabled=true;
const bar=document.getElementById(‘adProgressBar’);
const cd=document.getElementById(‘adCountdown’);
let t=3;
void bar.offsetHeight;
bar.style.transition=‘width 3s linear’; bar.style.width=‘100%’;
const iv=setInterval(()=>{
t–; cd.textContent=t>0?String(t):‘✓’;
if (t<=0) {
clearInterval(iv);
G.ammo=G.maxAmmo+2; G.lives=G.maxLives; G.combo=0; G.phase=‘playing’;
UI.showScreen(null);
Targets.spawn(); HUD.update();
FX.flashRGBA(57,255,20,0.25,400);
Overlays.showWave();
}
},1000);
}
};

/* ============================================================
SECTION 24 — GAME CONTROLLER
============================================================ */
const Game = {
start(level=1) {
Sound.init();
Object.assign(G, {
phase:‘playing’, paused:false,
score:0, gold:0, wave:level,
lives:3, maxLives:3, ammo:8, maxAmmo:8,
combo:0, maxCombo:0,
hits:0, totalTargets:0,
roundScore:0, roundGold:0,
equippedBow:G.equippedBow,
equippedArrow:G.equippedArrow,
_adShown:false, _roundEndScheduled:false, time:0
});
Weapons._waitingForLastShot=false;
projectiles=[]; particles=[]; dyingTargets=[];
UI.showScreen(null);
document.getElementById(‘hud’).classList.add(‘active’);
document.getElementById(‘pauseBtn’).textContent=‘⏸’;
Targets.spawn(); HUD.update(); Overlays.showWave();
},

quitToMenu() {
G.phase=‘title’; G.paused=false;
Weapons._waitingForLastShot=false;
document.getElementById(‘hud’).classList.remove(‘active’);
document.getElementById(‘titleWeapon’).textContent=BOWS[G.equippedBow].emoji||‘🏹’;
LevelSelect.build();
UI.showScreen(‘titleScreen’);
document.getElementById(‘titleHS’).textContent=`BEST: ${G.highScore.toLocaleString()}`;
},

roundEnd() {
if (G.phase!==‘playing’) return;
G.phase=‘roundEnd’;

```
// Unlock next level
G.unlockLevel(G.wave+1);
LevelSelect.build();

const acc=G.totalTargets>0?Math.round((G.hits/G.totalTargets)*100):0;
const stars=acc>=100?3:acc>=70?2:acc>=40?1:0;
const perf=['💀 ROUGH','⚡ OK','💥 SOLID','🎯 PERFECT!'][stars];
document.getElementById('roundWaveTitle').textContent=`LEVEL ${G.wave}`;
document.getElementById('roundStars').textContent='⭐'.repeat(stars)+'☆'.repeat(3-stars);
document.getElementById('roundStats').innerHTML=
  `TARGETS HIT: <b>${G.hits} / ${G.totalTargets}</b> &nbsp;${perf}<br>`+
  `ACCURACY: <b>${acc}%</b><br>`+
  `LEVEL SCORE: <b>${G.roundScore.toLocaleString()}</b><br>`+
  `GOLD EARNED: <b>💰 ${G.roundGold}</b><br>`+
  `TOTAL SCORE: <b>${G.score.toLocaleString()}</b>`;
UI.showScreen('roundScreen');
```

},

nextWave() {
G.wave++; G.ammo=G.maxAmmo; G.roundScore=0; G.roundGold=0; G.combo=0;
G.phase=‘playing’;
Weapons._waitingForLastShot=false;
projectiles=[]; particles=[]; dyingTargets=[];
UI.showScreen(null);
Targets.spawn(); HUD.update(); Overlays.showWave();
},

gameOver() {
G.phase=‘gameOver’;
Weapons._waitingForLastShot=false;
const isNew=G.score>G.highScore;
if (isNew){ G.highScore=G.score; localStorage.setItem(‘th_hs’,String(G.score)); }
document.getElementById(‘newHSBadge’).classList.toggle(‘off’,!isNew);
const acc=G.totalTargets>0?Math.round((G.hits/G.totalTargets)*100):0;
document.getElementById(‘gameOverStats’).innerHTML=
`FINAL SCORE:  <span>${G.score.toLocaleString()}</span><br>`+
`HIGH SCORE:   <span>${G.highScore.toLocaleString()}</span><br>`+
`LEVEL:        <span>${G.wave}</span><br>`+
`GOLD:         <span>💰 ${G.gold.toLocaleString()}</span><br>`+
`BEST COMBO:   <span>×${G.maxCombo}</span><br>`+
`ACCURACY:     <span>${acc}%</span>`;
UI.showScreen(‘gameOverScreen’);
document.getElementById(‘hud’).classList.remove(‘active’);
document.getElementById(‘titleHS’).textContent=`BEST: ${G.highScore.toLocaleString()}`;
}
};

/* ============================================================
SECTION 25 — LOADING SCREEN ANIMATION
============================================================ */
const Loading = {
_bowCanvas: null,
_bowCtx: null,
_t: 0,

init() {
this._bowCanvas = document.getElementById(‘loadingBowCanvas’);
this._bowCtx    = this._bowCanvas.getContext(‘2d’);
this._animate();
},

_animate() {
const c=this._bowCtx, W=120, H=200;
this._t += 0.04;
c.clearRect(0,0,W,H);

```
// Draw animated bow
const t=this._t;
const cx=60, cy=100;
const stretch=Math.sin(t)*8;

// Bow limbs
c.strokeStyle='#c8a06a'; c.lineWidth=5;
c.shadowColor='#00f5ff'; c.shadowBlur=20;
c.beginPath();
c.moveTo(cx-8, cy-75);
c.quadraticCurveTo(cx-45+stretch, cy, cx-8, cy+75);
c.stroke();
// Bowstring
c.strokeStyle='rgba(200,160,100,0.8)'; c.lineWidth=1.5; c.shadowBlur=8;
c.beginPath();
c.moveTo(cx-8, cy-75);
c.lineTo(cx-8+stretch*0.3, cy);
c.lineTo(cx-8, cy+75);
c.stroke();
c.shadowBlur=0;

// Pulsing arrow
const arrowAlpha = 0.5+Math.sin(t*2)*0.5;
c.save(); c.globalAlpha=arrowAlpha;
c.strokeStyle='#00f5ff'; c.lineWidth=2;
c.shadowColor='#00f5ff'; c.shadowBlur=12;
c.beginPath();
c.moveTo(cx-8+stretch*0.3, cy-45);
c.lineTo(cx-8+stretch*0.3, cy+45);
c.stroke();
c.restore();

requestAnimationFrame(()=>this._animate());
```

},

start(onDone) {
this.init();
Sound.init();
Sound.playLoading();

```
let progress = 0;
const fill = document.getElementById('loadingBarFill');
const pct  = document.getElementById('loadingPct');
const tip  = document.getElementById('loadingTip');

const tips = [
  'LOADING ASSETS...',
  'CALIBRATING BOWS...',
  'SUMMONING CREATURES...',
  'SHARPENING ARROWS...',
  'BUILDING LEVELS...',
  'READY TO HUNT!'
];

// Load image assets
ImgAssets.load(imgPct => {
  // imgPct goes 0→1
});

// Simulate loading progress
const interval = setInterval(() => {
  progress += Math.random()*6 + 2;
  if (progress >= 100) {
    progress = 100;
    clearInterval(interval);
    fill.style.width = '100%';
    pct.textContent  = '100%';
    tip.textContent  = 'READY!';
    setTimeout(()=>{
      LevelSelect.build();
      document.getElementById('titleHS').textContent=`BEST: ${G.highScore.toLocaleString()}`;
      UI.showScreen('titleScreen');
      onDone();
    }, 600);
    return;
  }
  const p = Math.min(progress, 100);
  fill.style.width = `${p}%`;
  pct.textContent  = `${Math.round(p)}%`;
  tip.textContent  = tips[Math.floor(p/20)];
}, 80);
```

}
};

/* ============================================================
SECTION 26 — MAIN GAME LOOP
============================================================ */
let lastTS = 0;

function loop(ts) {
const dt = Math.min((ts-lastTS)/1000, 0.05);
lastTS = ts;

if (G.phase===‘playing’&&!G.paused) G.time+=dt;

// Screen shake
let shakeOffX=0, shakeOffY=0;
if (screenShake.dur>0) {
screenShake.dur-=dt*1000;
const intensity=screenShake.x*(screenShake.dur/400);
shakeOffX=(Math.random()-0.5)*intensity*2;
shakeOffY=(Math.random()-0.5)*intensity*2;
}

ctx.save();
if (shakeOffX||shakeOffY) ctx.translate(shakeOffX,shakeOffY);
ctx.clearRect(-20,-20,canvas.width+40,canvas.height+40);

if (G.phase===‘playing’||G.phase===‘title’) BG.draw(G.time);

if (G.phase===‘playing’&&!G.paused) {
Drag.update(dt);
Targets.update(G.time);
Targets.updateDying(dt);

```
for (let i=projectiles.length-1;i>=0;i--) {
  projectiles[i].update(dt);
  if (!projectiles[i].alive) projectiles.splice(i,1);
}

Targets.checkCollisions();
Weapons.checkLastShot();

Targets.draw();
for (const p of projectiles) p.draw();
Particles.update(dt);
WeaponRenderer.draw(G.time);
```

} else if (G.phase===‘playing’&&G.paused) {
Targets.updateDying(dt);
Targets.draw();
for (const p of projectiles) p.draw();
WeaponRenderer.draw(G.time);
}

ctx.restore();
requestAnimationFrame(loop);
}

/* ============================================================
SECTION 27 — BOOT
============================================================ */
// Start loading screen, then boot game
Loading.start(() => {
G.phase = ‘title’;
});

// Start render loop immediately (loading screen animation needs it)
requestAnimationFrame(ts => { lastTS=ts; loop(ts); });
