// Game configuration
const ASSET_BASE = 'assets/';
const INVULNERABILITY_DURATION = 1000;
const ALIEN_SPAWN_INTERVAL = 1500;
const BG_SPEED = 2;
const BG_HEIGHT = 1920;

// Game state
let player, bullet = null;
let alienGroup;
let assets = {};
let score = 0;
let health = 3;
let lastHitTime = 0;
let lastAlienSpawnTime = 0;
let audioEnabled = false;
let bgY1 = 0;
let bgY2 = -BG_HEIGHT;
let bgWidth;
let healthSprites = [];

function preload() {
  assets = {
    plane: loadImage(ASSET_BASE + 'derivite.png'),
    planeLeft: loadImage(ASSET_BASE + 'deriviteleft.png'),
    planeRight: loadImage(ASSET_BASE + 'deriviteright.png'),
    bullet: loadImage(ASSET_BASE + 'bootlet.png'),
    health: loadImage(ASSET_BASE + 'enginehealth.png'),
    bg1: loadImage(ASSET_BASE + 'backround1.png'),
    bg2: loadImage(ASSET_BASE + 'backround2.png'),
    alien: loadImage(ASSET_BASE + 'jelifisch.gif'),
    bgMusic: loadSound(ASSET_BASE + 'corneria.mp3'),
    hitSound: loadSound(ASSET_BASE + 'squish.mp3')
  };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Setup audio prompt
  document.getElementById('unlock-audio').addEventListener('click', enableAudio);
  
  // Setup player
  player = new Sprite(width/2, height-100, 150, 95);
  player.image = assets.plane;
  player.layer = 2;
  player.collider = 'dynamic';
  player.rotationLock = true;

  // Setup aliens
  alienGroup = new Group();
  alienGroup.collider = 'dynamic';
  
  // Setup background
  bgWidth = windowWidth;
  
  // Setup health display
  for (let i = 0; i < 3; i++) {
    let healthSprite = new Sprite(40 + i * 50, 60, 40, 40);
    healthSprite.image = assets.health;
    healthSprites.push(healthSprite);
  }
  
  // Hide loading message
  document.getElementById('loading').style.display = 'none';
}

function enableAudio() {
  if (audioEnabled) return;
  
  try {
    userStartAudio();
    audioEnabled = true;
    document.getElementById('audio-prompt').style.display = 'none';
    
    if (assets.bgMusic) {
      assets.bgMusic.loop();
    }
  } catch (e) {
    console.error("Audio enable failed:", e);
  }
}

function draw() {
  if (!assets.plane || !assets.bg1) {
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    text("Loading assets...", width/2, height/2);
    return;
  }
  
  // Draw scrolling background
  background(0);
  image(assets.bg1, 0, bgY1, bgWidth, BG_HEIGHT);
  image(assets.bg2, 0, bgY2, bgWidth, BG_HEIGHT);
  
  // Update background positions
  bgY1 += BG_SPEED;
  bgY2 += BG_SPEED;
  if (bgY1 > height) bgY1 = bgY2 - BG_HEIGHT;
  if (bgY2 > height) bgY2 = bgY1 - BG_HEIGHT;
  
  // Game logic
  handleControls();
  handleSpawning();
  handleCollisions();
}

function handleControls() {
  if (!audioEnabled && (kb.pressing('a') || kb.pressing('d') || kb.pressing('w') || kb.pressing('s'))) {
    enableAudio();
  }
  
  player.vel.x = 0;
  player.vel.y = 0;
  player.image = assets.plane;
  
  if (kb.pressing('a')) {
    player.vel.x = -7;
    player.image = assets.planeLeft;
  } else if (kb.pressing('d')) {
    player.vel.x = 7;
    player.image = assets.planeRight;
  }
  
  if (kb.pressing('w')) player.vel.y = -5;
  if (kb.pressing('s')) player.vel.y = 5;
  
  if (kb.pressing('space') && !bullet) {
    spawnBullet();
  }
}

function spawnBullet() {
  bullet = new Sprite(player.position.x, player.position.y - 60, 10, 20);
  bullet.image = assets.bullet;
  bullet.vel.y = -10;
  bullet.layer = 2;
}

function handleSpawning() {
  if (millis() - lastAlienSpawnTime > ALIEN_SPAWN_INTERVAL) {
    let alien = new Sprite(random(width), random(-100, -50), 80, 80);
    alien.image = assets.alien;
    alien.vel.y = random(2, 5);
    alien.vel.x = random(-1, 1);
    alienGroup.add(alien);
    lastAlienSpawnTime = millis();
  }
}

function handleCollisions() {
  if (bullet) {
    bullet.overlaps(alienGroup, (b, enemy) => {
      enemy.remove();
      b.remove();
      bullet = null;
      increaseScore();
      if (audioEnabled && assets.hitSound) {
        assets.hitSound.play();
      }
    });
    
    if (bullet.position.y < -50) {
      bullet.remove();
      bullet = null;
    }
  }
  
  player.collides(alienGroup, (p, enemy) => {
    if (millis() - lastHitTime < INVULNERABILITY_DURATION) return;
    
    enemy.remove();
    health--;
    lastHitTime = millis();
    
    if (audioEnabled && assets.hitSound) {
      assets.hitSound.play();
    }
    
    updateHealthDisplay();
    
    if (health <= 0) {
      gameOver();
    }
  });
}

function increaseScore() {
  score++;
  document.getElementById('score-display').textContent = `Score: ${score}`;
}

function updateHealthDisplay() {
  for (let i = 0; i < healthSprites.length; i++) {
    healthSprites[i].visible = i < health;
  }
}

function gameOver() {
  window.location.href = "gameover.html?score=" + score;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bgWidth = windowWidth;
}