// ============================================
// THE HUNTER - Simple & Clean Version
// ============================================

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================
// Game State
// ============================================
const Game = {
  state: 'menu', // 'menu', 'playing', 'gameover'
  level: 1,
  selectedLevel: 1,
  selectedBow: 0,
  gold: 0,
  score: 0,
  shots: 8,
  maxShots: 8,
  targets: [],
  obstacles: [],
  arrow: null,
  bow: {
    x: 0,
    y: 0,
    angle: 0,
    power: 0,
    charging: false
  },
  ownedBows: [0],
  unlockedLevels: 1,
  
  // Load from localStorage
  load() {
    const saved = localStorage.getItem('hunter_save');
    if (saved) {
      const data = JSON.parse(saved);
      this.gold = data.gold || 0;
      this.ownedBows = data.ownedBows || [0];
      this.unlockedLevels = data.unlockedLevels || 1;
      this.selectedBow = data.selectedBow || 0;
    }
  },
  
  // Save to localStorage
  save() {
    const data = {
      gold: this.gold,
      ownedBows: this.ownedBows,
      unlockedLevels: this.unlockedLevels,
      selectedBow: this.selectedBow
    };
    localStorage.setItem('hunter_save', JSON.stringify(data));
  }
};

// ============================================
// Levels Configuration
// ============================================
const LEVELS = [
  { num: 1, targets: 5, speed: 0, obstacles: 0, gold: 20 },
  { num: 2, targets: 7, speed: 0.5, obstacles: 1, gold: 30 },
  { num: 3, targets: 8, speed: 0.8, obstacles: 2, gold: 40 },
  { num: 4, targets: 10, speed: 1.0, obstacles: 2, gold: 50 },
  { num: 5, targets: 12, speed: 1.2, obstacles: 3, gold: 70 },
  { num: 6, targets: 14, speed: 1.5, obstacles: 4, gold: 90 },
  { num: 7, targets: 16, speed: 1.8, obstacles: 5, gold: 120 },
  { num: 8, targets: 20, speed: 2.0, obstacles: 6, gold: 150 }
];

// ============================================
// Bows Configuration
// ============================================
const BOWS = [
  { id: 0, name: 'Basic Bow', price: 0, color: '#8B4513', speed: 1.0 },
  { id: 1, name: 'Steel Bow', price: 100, color: '#C0C0C0', speed: 1.2 },
  { id: 2, name: 'Fire Bow', price: 250, color: '#FF4500', speed: 1.4 },
  { id: 3, name: 'Ice Bow', price: 500, color: '#00CED1', speed: 1.6 },
  { id: 4, name: 'Gold Bow', price: 1000, color: '#FFD700', speed: 2.0 }
];

// ============================================
// Game Objects
// ============================================
class Target {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.size = 40;
    this.hit = false;
    this.alpha = 1;
    
    // Movement
    const cfg = LEVELS[level - 1];
    this.vx = (Math.random() - 0.5) * cfg.speed * 2;
    this.vy = (Math.random() - 0.5) * cfg.speed * 2;
    
    // Hide/show
    this.visible = true;
    this.hideTimer = 0;
    this.hideInterval = Math.random() * 3 + 2;
  }
  
  update(dt, obstacles) {
    if (this.hit) {
      this.alpha -= dt * 3;
      return this.alpha <= 0;
    }
    
    // Move
    this.x += this.vx;
    this.y += this.vy;
    
    // Bounce
    if (this.x < this.size || this.x > canvas.width - this.size) {
      this.vx *= -1;
      this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
    }
    if (this.y < this.size || this.y > canvas.height * 0.6 - this.size) {
      this.vy *= -1;
      this.y = Math.max(this.size, Math.min(canvas.height * 0.6 - this.size, this.y));
    }
    
    // Hide/show behind obstacles
    this.hideTimer += dt;
    if (this.hideTimer > this.hideInterval) {
      this.visible = !this.visible;
      this.hideTimer = 0;
      this.hideInterval = Math.random() * 3 + 2;
    }
    
    return false;
  }
  
  draw(ctx) {
    if (!this.visible || this.hit) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Target circles
    ctx.fillStyle = '#ff0044';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#aa0022';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#880011';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  checkHit(x, y) {
    if (!this.visible) return false;
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }
}

class Obstacle {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  
  draw(ctx) {
    ctx.fillStyle = 'rgba(100, 100, 150, 0.5)';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = 'rgba(200, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
  }
}

class Arrow {
  constructor(x, y, angle, power, bow) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    const speed = power * 20 * BOWS[bow].speed;
    this.vx = Math.sin(angle) * speed;
    this.vy = -Math.cos(angle) * speed;
    this.trail = [];
    this.dead = false;
    this.color = BOWS[bow].color;
  }
  
  update(dt) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();
    
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    
    // Out of bounds
    if (this.x < -50 || this.x > canvas.width + 50 || 
        this.y < -50 || this.y > canvas.height + 50) {
      this.dead = true;
    }
    
    this.angle = Math.atan2(this.vx, -this.vy);
  }
  
  draw(ctx) {
    // Trail
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    this.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Arrow
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ============================================
// Draw Bow Function (Canvas Drawing)
// ============================================
function drawBow(ctx, x, y, angle, power, charging, bowId) {
  const bow = BOWS[bowId];
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // Bow arc
  ctx.strokeStyle = bow.color;
  ctx.lineWidth = 6;
  ctx.shadowColor = bow.color;
  ctx.shadowBlur = charging ? 20 : 10;
  ctx.beginPath();
  ctx.arc(-10, 0, 50, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // String
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -60);
  
  if (charging) {
    const pullX = -30 + power * 40;
    ctx.lineTo(pullX, 0);
    ctx.lineTo(-30, 60);
    ctx.stroke();
    
    // Arrow on string
    ctx.fillStyle = bow.color;
    ctx.shadowColor = bow.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(pullX + 20, 0);
    ctx.lineTo(pullX, -5);
    ctx.lineTo(pullX - 30, 0);
    ctx.lineTo(pullX, 5);
    ctx.closePath();
    ctx.fill();
    
    // Aim line
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pullX, 0);
    ctx.lineTo(pullX + 500, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.lineTo(-30, 60);
    ctx.stroke();
  }
  
  ctx.restore();
}

// ============================================
// UI Functions
// ============================================
function createLevelGrid() {
  const grid = document.getElementById('levelGrid');
  grid.innerHTML = '';
  
  LEVELS.forEach(level => {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = level.num;
    
    if (level.num > Game.unlockedLevels) {
      btn.classList.add('locked');
      btn.disabled = true;
    } else {
      if (level.num === Game.selectedLevel) {
        btn.classList.add('selected');
      }
      btn.onclick = () => selectLevel(level.num);
    }
    
    grid.appendChild(btn);
  });
}

function createBowGrid() {
  const grid = document.getElementById('bowGrid');
  grid.innerHTML = '';
  
  BOWS.forEach(bow => {
    const div = document.createElement('div');
    div.className = 'bow-item';
    
    const owned = Game.ownedBows.includes(bow.id);
    
    if (!owned) {
      div.classList.add('locked');
    } else if (bow.id === Game.selectedBow) {
      div.classList.add('selected');
    }
    
    // Draw bow icon
    const bowCanvas = document.createElement('canvas');
    bowCanvas.className = 'bow-icon';
    bowCanvas.width = 80;
    bowCanvas.height = 80;
    const bowCtx = bowCanvas.getContext('2d');
    
    // Draw simple bow
    bowCtx.strokeStyle = bow.color;
    bowCtx.lineWidth = 4;
    bowCtx.shadowColor = bow.color;
    bowCtx.shadowBlur = 10;
    bowCtx.beginPath();
    bowCtx.arc(30, 40, 25, -Math.PI * 0.6, Math.PI * 0.6);
    bowCtx.stroke();
    
    bowCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    bowCtx.lineWidth = 2;
    bowCtx.beginPath();
    bowCtx.moveTo(20, 15);
    bowCtx.lineTo(20, 65);
    bowCtx.stroke();
    
    div.appendChild(bowCanvas);
    
    const name = document.createElement('div');
    name.className = 'bow-name';
    name.textContent = bow.name;
    div.appendChild(name);
    
    const price = document.createElement('div');
    price.className = 'bow-price';
    if (owned) {
      price.textContent = 'OWNED';
      price.classList.add('owned');
    } else {
      price.textContent = bow.price + ' GOLD';
    }
    div.appendChild(price);
    
    if (!owned && Game.gold >= bow.price) {
      div.onclick = () => buyBow(bow.id);
    } else if (owned) {
      div.onclick = () => selectBow(bow.id);
    }
    
    grid.appendChild(div);
  });
}

function selectLevel(num) {
  Game.selectedLevel = num;
  createLevelGrid();
}

function selectBow(id) {
  Game.selectedBow = id;
  Game.save();
  createBowGrid();
}

function buyBow(id) {
  const bow = BOWS[id];
  if (Game.gold >= bow.price) {
    Game.gold -= bow.price;
    Game.ownedBows.push(id);
    Game.selectedBow = id;
    Game.save();
    updateHUD();
    createBowGrid();
  }
}

function updateHUD() {
  document.getElementById('levelNum').textContent = Game.level;
  document.getElementById('goldNum').textContent = Game.gold;
  document.getElementById('scoreNum').textContent = Game.score;
  document.getElementById('shotsNum').textContent = Game.shots + '/' + Game.maxShots;
}

// ============================================
// Game Functions
// ============================================
function startGame() {
  Game.state = 'playing';
  Game.level = Game.selectedLevel;
  Game.score = 0;
  Game.shots = Game.maxShots;
  setupLevel();
  
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  updateHUD();
}

function setupLevel() {
  const cfg = LEVELS[Game.level - 1];
  Game.targets = [];
  Game.obstacles = [];
  Game.arrow = null;
  
  // Create obstacles
  for (let i = 0; i < cfg.obstacles; i++) {
    const w = 80 + Math.random() * 100;
    const h = 80 + Math.random() * 100;
    const x = Math.random() * (canvas.width - w);
    const y = Math.random() * (canvas.height * 0.5 - h);
    Game.obstacles.push(new Obstacle(x, y, w, h));
  }
  
  // Create targets
  for (let i = 0; i < cfg.targets; i++) {
    let x, y;
    let attempts = 0;
    do {
      x = 40 + Math.random() * (canvas.width - 80);
      y = 40 + Math.random() * (canvas.height * 0.5 - 80);
      attempts++;
    } while (attempts < 50);
    
    Game.targets.push(new Target(x, y, Game.level));
  }
}

function restartGame() {
  startGame();
  document.getElementById('gameOverScreen').classList.add('hidden');
}

function backToMenu() {
  Game.state = 'menu';
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
  createLevelGrid();
  createBowGrid();
}

function gameOver() {
  Game.state = 'gameover';
  
  const cfg = LEVELS[Game.level - 1];
  const goldEarned = cfg.gold;
  Game.gold += goldEarned;
  
  if (Game.level >= Game.unlockedLevels && Game.level < LEVELS.length) {
    Game.unlockedLevels = Game.level + 1;
  }
  
  Game.save();
  
  document.getElementById('finalScore').textContent = Game.score;
  document.getElementById('finalLevel').textContent = Game.level;
  document.getElementById('goldEarned').textContent = goldEarned;
  document.getElementById('gameOverScreen').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
}

// ============================================
// Touch/Mouse Controls
// ============================================
let touch = {
  active: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
};

function handleStart(e) {
  if (Game.state !== 'playing' || Game.shots <= 0) return;
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
  const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
  
  touch.active = true;
  touch.startX = x;
  touch.startY = y;
  touch.currentX = x;
  touch.currentY = y;
  
  Game.bow.x = x;
  Game.bow.y = canvas.height - 100;
  Game.bow.charging = true;
}

function handleMove(e) {
  if (!touch.active || Game.state !== 'playing') return;
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
  const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
  
  touch.currentX = x;
  touch.currentY = y;
  
  const dx = touch.currentX - Game.bow.x;
  const dy = touch.currentY - Game.bow.y;
  Game.bow.angle = Math.atan2(dx, dy);
  
  const dist = Math.sqrt(dx * dx + dy * dy);
  Game.bow.power = Math.min(1, dist / 150);
}

function handleEnd(e) {
  if (!touch.active || Game.state !== 'playing') return;
  e.preventDefault();
  
  if (Game.bow.charging && Game.bow.power > 0.1 && Game.shots > 0) {
    shootArrow();
  }
  
  touch.active = false;
  Game.bow.charging = false;
  Game.bow.power = 0;
}

function shootArrow() {
  const arrow = new Arrow(
    Game.bow.x + Math.sin(Game.bow.angle) * 40,
    Game.bow.y - Math.cos(Game.bow.angle) * 40,
    Game.bow.angle,
    Game.bow.power,
    Game.selectedBow
  );
  Game.arrow = arrow;
  Game.shots--;
  updateHUD();
}

// ============================================
// Game Loop
// ============================================
let lastTime = 0;

function update(dt) {
  if (Game.state !== 'playing') return;
  
  // Update targets
  Game.targets = Game.targets.filter(t => !t.update(dt, Game.obstacles));
  
  // Update arrow
  if (Game.arrow) {
    Game.arrow.update(dt);
    
    // Check hits
    Game.targets.forEach(t => {
      if (!t.hit && t.checkHit(Game.arrow.x, Game.arrow.y)) {
        t.hit = true;
        Game.arrow.dead = true;
        Game.score += 10;
        updateHUD();
      }
    });
    
    if (Game.arrow.dead) {
      Game.arrow = null;
    }
  }
  
  // Check level complete
  const aliveTargets = Game.targets.filter(t => !t.hit).length;
  if (aliveTargets === 0) {
    gameOver();
  }
  
  // Check game over
  if (Game.shots === 0 && !Game.arrow && aliveTargets > 0) {
    gameOver();
  }
}

function draw() {
  // Clear
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Grid background
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  if (Game.state === 'playing') {
    // Draw obstacles
    Game.obstacles.forEach(o => o.draw(ctx));
    
    // Draw targets
    Game.targets.forEach(t => t.draw(ctx));
    
    // Draw arrow
    if (Game.arrow) {
      Game.arrow.draw(ctx);
    }
    
    // Draw bow
    drawBow(ctx, Game.bow.x, Game.bow.y, Game.bow.angle, Game.bow.power, Game.bow.charging, Game.selectedBow);
  }
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  
  update(dt);
  draw();
  
  requestAnimationFrame(gameLoop);
}

// ============================================
// Initialize
// ============================================
function init() {
  console.log('Game initializing...');
  
  Game.load();
  createLevelGrid();
  createBowGrid();
  updateHUD();
  
  // Events
  canvas.addEventListener('touchstart', handleStart, { passive: false });
  canvas.addEventListener('touchmove', handleMove, { passive: false });
  canvas.addEventListener('touchend', handleEnd, { passive: false });
  canvas.addEventListener('mousedown', handleStart);
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('mouseup', handleEnd);
  
  // Start loop
  requestAnimationFrame(gameLoop);
  
  console.log('Game ready!');
}

// Start when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
