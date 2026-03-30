// derivitive.js - Convert to module syntax
let deritive, boolet = null;
let imgPlane, imgPlaneleft, imgPlaneright, imgBoolet, imgEngineHealth, imgJelifisch, imgBackGround1, imgBackGround2;
let squish, corneria;
let audioEnabled = false;

let y1 = 0, y2 = 0, bgSpeed = 2, bgWidth, bgHeight = 1920;
let lastAlienSpawnTime = 0, alienSpawnInterval = 1500, alienGroup;
let score = 0, scoreDisplay, health = 3;
let gameStartTime;
let currentTime = 0;
let timerDisplay;

const hasP5LoadSound = typeof window.loadSound === 'function';
function loadGameSound(path) {
    if (hasP5LoadSound) {
        return loadSound(path);
    }

    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.load();
    return audio;
}

function soundPlay(sound, options = {}) {
    if (!sound) return;
    const { loop = false } = options;
    if (typeof sound.setLoop === 'function') {
        sound.setLoop(loop);
    } else {
        sound.loop = loop;
    }
    if (typeof sound.play === 'function') {
        sound.play();
    }
}

function soundIsPlaying(sound) {
    if (!sound) return false;
    if (typeof sound.isPlaying === 'function') return sound.isPlaying();
    return !sound.paused && !sound.ended;
}

function soundIsLoaded(sound) {
    if (!sound) return false;
    if (typeof sound.isLoaded === 'function') return sound.isLoaded();
    return sound.readyState >= 2;
}

// Export functions that need to be accessed
window.gameUserStartAudio = userStartAudio;

/*******************************************************/
function preload() {
    imgPlane = loadImage('../other/derivite.png');
    imgPlaneleft = loadImage('../other/deriviteleft.png');
    imgPlaneright = loadImage('../other/deriviteright.png');
    imgBoolet = loadImage('../other/bootlet.png');
    imgEngineHealth = loadImage('../other/enginehealth.png');
    imgBackGround1 = loadImage('../other/backround1.png');
    imgBackGround2 = loadImage('../other/backround2.png');
    imgJelifisch = loadImage('../other/jelifisch.gif');
}

/*******************************************************/
async function userStartAudio() {
    if (audioEnabled) return;
    
    try {
        // Resume AudioContext
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
        }
        
        // Load sounds using p5 if available, otherwise fallback to Audio
        squish = loadGameSound("../other/squish.mp3");
        corneria = loadGameSound("../other/corneria.mp3");
        
        audioEnabled = true;
        console.log("Audio enabled");
        
        // Start background music
        if (corneria) {
            soundPlay(corneria, { loop: true });
        }
    } catch (error) {
        console.error("Failed to enable audio:", error);
    }
}

/*******************************************************/
function setup() {
    createCanvas(windowWidth, windowHeight);

    funcSetupScore();
    setupHealthDisplay();
    funcImg();

    deritive = new Sprite(width / 2, height - 100, 150, 95);
    deritive.image = imgPlane;
    deritive.rotationLock = true;

    alienGroup = new Group();

    bgWidth = windowWidth;
    y2 = -bgHeight;

    gameStartTime = millis();
    setupTimerDisplay();
}

/*******************************************************/
function draw() {
    background(0);

    image(imgBackGround1, 0, y1, bgWidth, bgHeight);
    image(imgBackGround2, 0, y2, bgWidth, bgHeight);

    y1 += bgSpeed;
    y2 += bgSpeed;
    if (y1 > height) y1 = y2 - bgHeight;
    if (y2 > height) y2 = y1 - bgHeight;

    // Start background music if audio is enabled and not playing
    if (audioEnabled && corneria && !soundIsPlaying(corneria)) {
        soundPlay(corneria, { loop: true });
    }

    handleControls();

    if (millis() - lastAlienSpawnTime > alienSpawnInterval) {
        spawnAlien();
        lastAlienSpawnTime = millis();
    }

    handleCollisions();

    currentTime = floor((millis() - gameStartTime) / 1000);
    updateTimerDisplay();
}

/*******************************************************/
function handleControls() {
    deritive.vel.x = 0;
    deritive.vel.y = 0;

    if (kb.pressing('a')) {
        deritive.vel.x = -7;
        deritive.image = imgPlaneleft;
    }
    else if (kb.pressing('d')) {
        deritive.vel.x = 7;
        deritive.image = imgPlaneright;
    }
    else {
        deritive.image = imgPlane;
    }

    if (kb.pressing('w')) deritive.vel.y = -5;
    if (kb.pressing('s')) deritive.vel.y = 5;

    if (kb.pressing('space') && !boolet) {
        spawnBoolet();
    }
}

/*******************************************************/
function spawnBoolet() {
    boolet = new Sprite(deritive.x, deritive.y - 60, 19, 24);
    boolet.image = imgBoolet;
    boolet.vel.y = -15;
}

/*******************************************************/
function spawnAlien() {
    let enemy = new Sprite(random(width), -50, 50, 50);
    enemy.image = imgJelifisch;
    enemy.vel.y = random(2, 7);
    alienGroup.add(enemy);
}

/*******************************************************/
function handleCollisions() {
    if (boolet) {
        boolet.overlaps(alienGroup, (bullet, enemy) => {
            enemy.remove();
            bullet.remove();
            boolet = null;
            score++;
            scoreDisplay.html('Score: ' + score);
            if (audioEnabled && squish && soundIsLoaded(squish)) {
                soundPlay(squish);
            }
        });

        if (boolet.y < -50) {
            boolet.remove();
            boolet = null;
        }
    }

    deritive.collides(alienGroup, async (player, enemy) => {
        enemy.remove();
        health--;
        updateHealthDisplay();

        if (health <= 0) {
            // Save score to Firebase before redirecting
            if (window.firebaseHelpers && window.firebaseAuth && window.firebaseAuth.currentUser) {
                await window.firebaseHelpers.saveScore('derivitive', score);
            }
            window.location.href = "../HTML/lose.html?score=" + score;
        }
    });
}

/*******************************************************/
function funcSetupScore() {
    scoreDisplay = createDiv('Score: 0');
    scoreDisplay.position(20, 100);
}

/*******************************************************/
function setupHealthDisplay() {
    healthDisplay = createDiv('Health: ' + health);
    healthDisplay.position(20, 70);
}

/*******************************************************/
function updateHealthDisplay() {
    healthDisplay.html('Health: ' + health);
}

/*******************************************************/
function setupTimerDisplay() {
    timerDisplay = createDiv('Time: 0:00');
    timerDisplay.position(20, 120);
}

/*******************************************************/
function updateTimerDisplay() {
    const minutes = floor(currentTime / 60);
    const seconds = floor(currentTime % 60);
    timerDisplay.html(`Time: ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`);
}

/*******************************************************/
function funcImg() {
    imgPlane.resize(150, 95);
    imgPlaneleft.resize(75, 95);
    imgPlaneright.resize(75, 95);
    imgBoolet.resize(19, 24);
    imgEngineHealth.resize(30, 30);
    imgBackGround1.resize(windowWidth, bgHeight);
    imgBackGround2.resize(windowWidth, bgHeight);
    imgJelifisch.resize(50, 50);
}