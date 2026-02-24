/* 🧠 عقل اللعبة - التحكم والحركة والصعوبة */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- نظام اللغات المتعددة ---
const langDict = {
    ar: { score: "السكور", gold: "الذهب", level: "المرحلة", shop: "المتجر" },
    en: { score: "Score", gold: "Gold", level: "Level", shop: "Shop" }
};
let curLang = 'ar';

window.toggleLanguage = () => {
    curLang = curLang === 'ar' ? 'en' : 'ar';
    document.getElementById('t-score').innerText = langDict[curLang].score;
    document.getElementById('t-gold').innerText = langDict[curLang].gold;
    document.getElementById('t-level').innerText = langDict[curLang].level;
};

// --- بيانات اللعبة ---
let score = 0, gold = 0, level = 1;
let arrows = [], targets = [];
let isDragging = false, pullDist = 0, startY = 0;
let baseSpeed = 2; 

// دالة خلق الأهداف (تزيد مع كل مرحلة)
function initLevel() {
    targets = [];
    for(let i=0; i < (level + 1); i++) {
        targets.push({
            x: Math.random() * (canvas.width - 50) + 25,
            y: Math.random() * 250 + 80,
            r: 25,
            sx: (Math.random() > 0.5 ? 1 : -1) * (baseSpeed + (score * 0.05)),
            sy: (Math.random() - 0.5) * 4,
            color: `hsl(${Math.random() * 360}, 100%, 60%)`
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // واجهة الأرض (العمق البصري)
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // تحريك ورسم الأهداف
    targets.forEach((t, ti) => {
        t.x += t.sx; t.y += t.sy;
        if(t.x > canvas.width - t.r || t.x < t.r) t.sx *= -1;
        if(t.y > canvas.height/2 || t.y < 50) t.sy *= -1;

        ctx.shadowBlur = 15; ctx.shadowColor = t.color;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI*2);
        ctx.strokeStyle = t.color; ctx.lineWidth = 5; ctx.stroke();
        ctx.shadowBlur = 0;
    });

    // تحريك السهم والتصادم
    arrows.forEach((a, ai) => {
        a.y -= 20; // سرعة السهم
        ctx.fillStyle = "#fff";
        ctx.fillRect(a.x-2, a.y, 4, 40);

        targets.forEach((t, ti) => {
            if(Math.hypot(a.x - t.x, a.y - t.y) < t.r) {
                score += 10; gold += 5;
                targets.splice(ti, 1);
                arrows.splice(ai, 1);
                document.getElementById('score').innerText = score;
                document.getElementById('gold').innerText = gold;

                if(targets.length === 0) {
                    level++;
                    document.getElementById('level').innerText = level;
                    baseSpeed += 0.5;
                    initLevel();
                }
            }
        });
        if(a.y < 0) arrows.splice(ai, 1);
    });

    // رسم القوس نيون
    const cx = canvas.width/2, wy = canvas.height - 110;
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx-80, wy); ctx.quadraticCurveTo(cx, wy+pullDist, cx+80, wy); ctx.stroke();

    requestAnimationFrame(draw);
}

// التحكم باللمس
canvas.addEventListener('touchstart', e => { isDragging = true; startY = e.touches[0].clientY; });
canvas.addEventListener('touchmove', e => { if(isDragging) pullDist = Math.min(130, e.touches[0].clientY - startY); });
canvas.addEventListener('touchend', () => {
    if(pullDist > 50) arrows.push({x: canvas.width/2, y: canvas.height-110});
    isDragging = false; pullDist = 0;
});

initLevel();
draw();
