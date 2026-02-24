// Global game variables
let deritive, boolet = null;
let imgPlane, imgPlaneleft, imgPlaneright, imgBoolet, imgEngineHealth, imgJelifisch, imgBackGround1, imgBackGround2;
let y1 = 0, y2 = 0, bgSpeed = 2, bgWidth, bgHeight = 1920;
let lastAlienSpawnTime = 0, alienSpawnInterval = 1500, alienGroup;
let score = 0, health = 3, maxHealth = 3, lastHitTime = 0, invulnerabilityDuration = 500;
let healthSprites = [];
let scoreDisplay, healthDisplay, timerDisplay;
let gameStartTime;
let currentTime = 0;
let difficultyMultiplier = 1;
const MAX_MINUTES = 10;
const BASE_SPAWN_INTERVAL = 1500;
let squish, corneria;

// Export all functions that need to be called from p5 instance
export function preload() {
    imgPlane = loadImage('./games/other/derivite.png', window.assetLoaded);
    imgPlaneleft = loadImage('./games/other/deriviteleft.png', window.assetLoaded);
    imgPlaneright = loadImage('./games/other/deriviteright.png', window.assetLoaded);
    imgBoolet = loadImage('./games/other/bootlet.png', window.assetLoaded);
    imgEngineHealth = loadImage('./games/other/enginehealth.png', window.assetLoaded);
    imgBackGround1 = loadImage('./games/other/backround1.png', window.assetLoaded);
    imgBackGround2 = loadImage('./games/other/backround2.png', window.assetLoaded);
    imgJelifisch = loadImage('./games/other/jelifisch.gif', window.assetLoaded);
    squish = loadSound("./games/other/squish.mp3", window.assetLoaded);
    squish.volume = 1;
    corneria = loadSound("./games/other/corneria.mp3", window.assetLoaded);
    corneria.setLoop(true);
}

export function setup() {
    createCanvas(windowWidth, windowHeight);

    // Initialize systems
    setupScoreDisplay();
    setupHealthDisplay();
    resizeImages();
    
    // Create plane
    deritive = new Sprite(width/2, height-100, 150, 95);
    deritive.image = imgPlane;
    deritive.layer = 2;
    deritive.collider = 'dynamic';
    deritive.rotationLock = true;

    // Create enemy group
    alienGroup = new Group();
    alienGroup.collider = 'dynamic';
    
    // Set initial background positions
    bgWidth = windowWidth;
    y2 = -bgHeight;

    // Start game timer
    gameStartTime = millis();
    setupTimerDisplay();
    alienSpawnInterval = BASE_SPAWN_INTERVAL;
}

export function draw() {
    if (!imgPlane || !imgBackGround1) return;
    
    background(0); 
    drawScrollingBackground();
    handleControls();
    spawnEnemies();
    handleCollisions();
    updateGameTimer();
}

function drawScrollingBackground() {
    image(imgBackGround1, 0, y1, bgWidth, bgHeight);
    image(imgBackGround2, 0, y2, bgWidth, bgHeight);
    
    y1 += bgSpeed;
    y2 += bgSpeed;
    if (y1 > height) y1 = y2 - bgHeight;
    if (y2 > height) y2 = y1 - bgHeight;
}

function handleControls() {
    deritive.vel.x = 0;
    deritive.vel.y = 0;
    
    if (kb.pressing('a')) {
        deritive.vel.x = -7;
        deritive.image = imgPlaneleft;
        deritive.width = 75;
        deritive.height = 95;
    } 
    else if (kb.pressing('d')) {
        deritive.vel.x = 7;
        deritive.image = imgPlaneright;
        deritive.width = 75;
        deritive.height = 95;
    }
    
    if (kb.pressing('w')) deritive.vel.y = -5;
    if (kb.pressing('s')) deritive.vel.y = 5;
    
    if (!kb.pressing('a') && !kb.pressing('d')) {
        deritive.image = imgPlane;
        deritive.width = 150;
        deritive.height = 95;
    }
    
    if (kb.pressing('space') && !boolet) {
        spawnBoolet();
    }
}

function spawnBoolet() {
    boolet = new Sprite(deritive.x, deritive.y - 60, 19, 24);
    boolet.image = imgBoolet;
    boolet.layer = 1;
    boolet.vel.y = -15;
}

function spawnEnemies() {
    if (millis() - lastAlienSpawnTime > alienSpawnInterval) {
        let enemy = new Sprite(random(width), -50, 50, 50);
        enemy.image = imgJelifisch;
        enemy.vel.y = random(2, 7);
        alienGroup.add(enemy);
        lastAlienSpawnTime = millis();
    }
}

function handleCollisions() {
    if (boolet) {
        boolet.overlaps(alienGroup, (bullet, enemy) => {
            enemy.remove();
            bullet.remove();
            boolet = null;
            score++;
            scoreDisplay.html('Score: ' + score);
            squish.play();
        });
        
        if (boolet.y < -50) {
            boolet.remove();
            boolet = null;
        }
    }
    
    deritive.collides(alienGroup, (player, enemy) => {
        if (millis() - lastHitTime < invulnerabilityDuration) return;
        
        enemy.remove();
        health--;
        lastHitTime = millis();
        squish.play();
        updateHealthDisplay();
        
        if (health <= 0) {
            window.location.href = "lose.html?score=" + score;
        }
    });
}

function setupScoreDisplay() {
    scoreDisplay = createDiv('Score: 0');
    scoreDisplay.position(20, 100);
    scoreDisplay.style('color', 'white');
    scoreDisplay.style('font-size', '20px');
    scoreDisplay.style('font-family', 'Arial');
    scoreDisplay.style('font-weight', 'bold');
}

function setupHealthDisplay() {
    healthSprites.forEach(s => s?.remove());
    healthSprites = [];
    
    for (let i = 0; i < maxHealth; i++) {
        let h = new Sprite(50 + i * 40, 50, 40, 40);
        h.image = imgEngineHealth;
        h.layer = 999;
        h.collider = 'none';
        healthSprites.push(h);
    }
    updateHealthDisplay();
}

function updateHealthDisplay() {
    for (let i = 0; i < healthSprites.length; i++) {
        healthSprites[i].visible = i < health;
    }
}

function setupTimerDisplay() {
    timerDisplay = createDiv('Time: 0:00');
    timerDisplay.position(20, 130);
    timerDisplay.style('color', 'white');
    timerDisplay.style('font-size', '20px');
    timerDisplay.style('font-family', 'Arial');
    timerDisplay.style('font-weight', 'bold');
}

function updateGameTimer() {
    currentTime = floor((millis() - gameStartTime) / 1000);
    const minutes = min(floor(currentTime / 60), MAX_MINUTES);
    const seconds = floor(currentTime % 60);
    timerDisplay.html(`Time: ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`);
    
    difficultyMultiplier = 1 + (minutes * 0.5);
    alienSpawnInterval = max(300, BASE_SPAWN_INTERVAL / difficultyMultiplier);
}

function resizeImages() {
    imgPlane.resize(150, 95);
    imgPlaneleft.resize(75, 95);
    imgPlaneright.resize(75, 95);
    imgBoolet.resize(19, 24);
    imgEngineHealth.resize(30, 30);
    imgBackGround1.resize(windowWidth, bgHeight);
    imgBackGround2.resize(windowWidth, bgHeight);
    imgJelifisch.resize(50, 50);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    resizeImages();
}

// Make sure to call this after audio is unlocked
export function startAudio() {
    if (corneria && !corneria.isPlaying()) {
        corneria.loop();
    }
}

export {
  preload,
  setup,
  draw,
  windowResized,
  corneria
};