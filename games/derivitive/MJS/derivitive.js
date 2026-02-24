/*******************************************************/
let deritive, boolet = null;
let imgPlane, imgPlaneleft, imgPlaneright, imgBoolet, imgEngineHealth, imgJelifisch, imgBackGround1, imgBackGround2;
let squish, corneria;

let y1 = 0, y2 = 0, bgSpeed = 2, bgWidth, bgHeight = 1920;
let lastAlienSpawnTime = 0, alienSpawnInterval = 1500, alienGroup;
let score = 0, scoreDisplay, health = 3;
let gameStartTime;
let currentTime = 0;
let timerDisplay;

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

    squish = loadSound("../other/squish.mp3");
    corneria = loadSound("../other/corneria.mp3");
    corneria.setLoop(true);
}

/*******************************************************/
function setup() {
    createCanvas(windowWidth, windowHeight);

    funcSetupScore();
    setupHealthDisplay();
    funcImg();

    deritive = new Sprite(width/2, height-100, 150, 95);
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
            squish.play();
        });

        if (boolet.y < -50) {
            boolet.remove();
            boolet = null;
        }
    }

    deritive.collides(alienGroup, (player, enemy) => {
        enemy.remove();
        health--;
        updateHealthDisplay();

        if (health <= 0) {
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
function funcImg(){
    imgPlane.resize(150, 95);
    imgPlaneleft.resize(75, 95);
    imgPlaneright.resize(75, 95);
    imgBoolet.resize(19, 24);
    imgEngineHealth.resize(30, 30);
    imgBackGround1.resize(windowWidth, bgHeight);
    imgBackGround2.resize(windowWidth, bgHeight);
    imgJelifisch.resize(50, 50);
}
