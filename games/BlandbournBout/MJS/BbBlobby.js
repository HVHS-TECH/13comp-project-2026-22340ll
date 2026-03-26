/*************************************************************
  -BbBlobby.js 
  -Blandbourn Bout lobby
  -Waiting room for players to join before starting the game.
  -

/*************************************************************/
// -Setup
let userID, uidClass, gameID, gameNumber; // Making these exist
let player1, player2, gameTurn; //(So far, these dont do anything and will break 
// smthn if i remove the slash now)
let playerClass = '';
let oppClass = '';
let playerReady = false;
let oppReady = false;
// Initialize availableGames as an empty array
let availableGames = [];
// Declare image variables
let imgPlaceholder, imgSpartan, imgWizard, imgPaladin, imgBarbarian, imgCleric, classImages;
// Declare UI variables
let loginButton, logoutButton, createGameButton, joinGameButton, gameCodeInput, refreshButton, usernameInput;
// Declare other variables
let statusMessage, isAuthenticated, isAdmin;
let currentPlayer, opponentPlayer, gameInterval;

console.log("Authenticate Please");

import {
    fb_initialise,
    fb_signInWithGoogle,
    fb_onAuthStateChanged,
    fb_authChanged,
    fb_signOut,
    fb_checkAdminStatus,
    auth,
    ref,
    set,
    get,
    onValue,
    database
} from '../../../fb_io.mjs';

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Initialize Firebase  
    fb_initialise().then(() => { //Authenticate. THEN define it. FAT arrow. FAT.
        console.log('Firebase initialized');
        setupUI();
        checkAuthState();
        refreshAvailableGames(); // Fetch available games on setup
    });

    // Listen for auth state changes
    fb_authChanged(user => {
        if (user) {
            console.log('User signed in:', user);
            // theres a user
        } else {
            console.log('No user signed in');
            // theres no user
        }
    });
    BbB_checkGames()
    BbB_checkScores();

}

function preload() { //Preload everyting for further purposes.
    imgPlaceholder = loadImage('../other/images.jpg'); //placeholder
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to Sony and Playstation. Also using Kratos as the spartan just seems funny to me.
    imgWizard = loadImage('../other/BbBWiz.png');
    imgPaladin = loadImage('../other/BbBPal.png');
    imgBarbarian = loadImage('../other/BbBBarb.png');
    imgCleric = loadImage('../other/BbBCler.png');

    classImages = { // Map classes to images
        'Spartan': imgSpartan,
        'Wizard': imgWizard,
        'Paladin': imgPaladin,
        'Barbarian': imgBarbarian,
        'Cleric': imgCleric,
        'default': imgPlaceholder
    };
}

function startLobbyListener() {
    const gamesRef = ref(database, 'BbB/games');
    onValue(gamesRef, (snapshot) => {
        if (snapshot.exists()) {
            availableGames = [];
            snapshot.forEach((childSnapshot) => {
                const game = childSnapshot.val();
                if (game.status === 'waiting' && Object.keys(game.players || {}).length < 2) {
                    availableGames.push({
                        id: childSnapshot.key,
                        ...game
                    });
                }
            });
        }
    });
}

function startGameListener(gameId) {
    const gameRef = ref(database, `BbB/games/${gameId}`);
    gameInterval = onValue(gameRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const gameData = snapshot.val();
        const players = gameData.players || {};
        const playerIds = Object.keys(players);
        currentPlayer = players[userID];
        opponentPlayer = playerIds.find(id => id !== userID) ? players[playerIds.find(id => id !== userID)] : null;
        playerReady = currentPlayer?.ready || false;
        oppReady = opponentPlayer?.ready || false;
        playerClass = currentPlayer?.class || '';
        oppClass = opponentPlayer?.class || '';
    });
}

function updateUIForAuth(loggedIn) {
    if (loggedIn) {
        loginButton.hide();
        logoutButton.show();
        createGameButton.show();
        joinGameButton.show();
        usernameInput.show();
        gameCodeInput.show();
        refreshButton.show();
        
        // Set username if available
        if (auth.currentUser) {
            usernameInput.value(auth.currentUser.displayName || '');
        }
    } else {
        loginButton.show();
        logoutButton.hide();
        createGameButton.hide();
        joinGameButton.hide();
        usernameInput.hide();
        gameCodeInput.hide();
        refreshButton.hide();
    }
}

async function handleLogin() {
    try {
        const user = await fb_signInWithGoogle();
        console.log('Logged in:', user);
    } catch (error) {
        statusMessage = 'Login failed: ' + error.message;
    }
}

async function handleLogout() {
    try {
        await fb_signOut();
        console.log('Logged out');
    } catch (error) {
        statusMessage = 'Logout failed: ' + error.message;
    }
}

function setupUI() {
    // Login UI
    loginButton = createButton('Login with Google');
    loginButton.position(20, 20);
    loginButton.mousePressed(handleLogin);
    
    logoutButton = createButton('Logout');
    logoutButton.position(150, 20);
    logoutButton.mousePressed(handleLogout);
    logoutButton.hide();

    // Username input
    usernameInput = createInput('');
    usernameInput.position(20, 70);
    usernameInput.attribute('placeholder', 'Enter Username');
    usernameInput.hide();

    // Game creation UI
    createGameButton = createButton('Create New Game');
    createGameButton.position(20, 110);
    createGameButton.mousePressed(createNewGame);
    createGameButton.hide();

    joinGameButton = createButton('Join Game');
    joinGameButton.position(150, 110);
    joinGameButton.mousePressed(joinGame);
    joinGameButton.hide();

    gameCodeInput = createInput('');
    gameCodeInput.position(20, 150);
    gameCodeInput.attribute('placeholder', 'Enter Game Code');
    gameCodeInput.hide();

    refreshButton = createButton('Refresh Games');
    refreshButton.position(280, 70);
    refreshButton.mousePressed(refreshAvailableGames);
    refreshButton.hide();
}

// Fetch available games from the database and update availableGames array
async function refreshAvailableGames() {
    if (typeof database === 'undefined') return;
    const gamesRef = ref(database, 'BbB/games');
    try {
        const snapshot = await get(gamesRef);
        if (snapshot.exists()) {
            const gamesObj = snapshot.val();
            availableGames = Object.values(gamesObj)
                .filter(game => game.status === 'waiting')
                .map(game => ({
                    id: game.gameId,
                    players: game.players || {}
                }));
        } else {
            availableGames = [];
        }
    } catch (error) {
        console.error('Error fetching games:', error);
        availableGames = [];
    }
}


function checkAuthState() {
    fb_onAuthStateChanged(async (user) => {
        if (user) {
            isAuthenticated = true;
            userID = user.uid;
            isAdmin = await fb_checkAdminStatus(user.uid);
            updateUIForAuth(true);
            startLobbyListener();
        } else {
            isAuthenticated = false;
            userID = null;
            isAdmin = false;
            updateUIForAuth(false);
        }
    });
}

async function createNewGame() {
    if (!isAuthenticated || !auth.currentUser) {
        statusMessage = 'Please login first';
        return;
    }

    const username = usernameInput.value() || auth.currentUser.displayName || 'Player';

    // Generate random game ID
    gameID = Math.random().toString(36).substring(2, 8).toUpperCase();
    gameNumber = Date.now();

    // Create game in Firebase
    const gameRef = ref(database, `BbB/games/${gameID}`);
    await set(gameRef, {
        gameId: gameID,
        gameNumber: gameNumber,
        status: 'waiting',
        createdBy: userID,
        createdAt: new Date().toISOString(),
        players: {
            [userID]: {
                uid: userID,
                username: username,
                ready: false,
                class: '',
                health: 100
            }
        },
        gameOn: false,
        turn: userID,
        dmg: 0
    });

    statusMessage = `Game created! Code: ${gameID}`;
    startGameListener(gameID);

    // Redirect to waiting page
    window.location.href = '../HTML/BbBwaiting.html';
}

async function joinGame() {
    if (!isAuthenticated) {
        statusMessage = 'Please login first';
        return;
    }

    const gameCode = gameCodeInput.value().toUpperCase();
    if (!gameCode) {
        statusMessage = 'Please enter a game code';
        return;
    }

    try {
        const gameRef = ref(database, `BbB/games/${gameCode}`);
        const gameSnapshot = await get(gameRef);

        if (!gameSnapshot.exists()) {
            statusMessage = 'Game not found';
            return;
        }

        const username = usernameInput.value() || auth.currentUser.displayName || 'Player';
        gameID = gameCode;

        // Add player to game
        await set(ref(database, `BbB/games/${gameCode}/players/${userID}`), {
            uid: userID,
            username: username,
            ready: false,
            class: null,
            health: 100
        });

        statusMessage = `Joined game: ${gameCode}`;

        // Redirect to waiting page
        window.location.href = '../HTML/BbBwaiting.html';
    } catch (error) {
        statusMessage = 'Error joining game: ' + error.message;
    }
}


//this is how the classes are sorted. I'm hoping that it will randomized every game to prevent total class maining.
async function assignRandomClasses(gameId, playerIds) {
    const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];

    const gameRef = ref(database, `BbB/games/${gameId}/players`);

    for (let i = 0; i < playerIds.length; i++) {
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        await set(ref(database, `BbB/games/${gameId}/players/${playerIds[i]}/class`), randomClass);
    }
}

async function toggleReady() {
    if (!gameID || !userID) return;
    // Check if player is in the game
    const newReadyState = !playerReady;
    await set(ref(database, `BbB/games/${gameID}/players/${userID}/ready`), newReadyState);
}

async function startGame(gameId, gameData) {
    // Set game to active
    await set(ref(database, `BbB/games/${gameId}/gameOn`), true);
    await set(ref(database, `BbB/games/${gameId}/status`), 'active');
    statusMessage = 'Game starting soon!';
}

function draw() {
    background(220);
    //Make title
    fill(50);
    textSize(32);
    textAlign(CENTER, TOP);
    text('BLANDBOURN BOUT', width / 2, 60);
    //Make status message
    if (statusMessage) {
        fill(0);
        textSize(16);
        text(statusMessage, width / 2, 100);
    }
    if (isAuthenticated) {
        drawLobby();
    } else {
        drawLoginPrompt();
    }
}

function drawLoginPrompt() {
    fill(100);
    textSize(20);
    textAlign(CENTER);
    text('Please login to continue. Seriously. do it.', width / 2, height / 2);
}

function drawLobby() {
    // Draw current game info if in a game
    if (gameID) {
        drawGameLobby();
    } else {
        drawAvailableGames();
    }

    // Draw userID info
    fill(0);
    textSize(14);
    textAlign(LEFT);
    text(`Logged in as: ${auth.currentUser?.displayName || 'User'}`, 20, height - 40);
    if (isAdmin) {
        text('(Admin)', 20, height - 20);
    }
}

// Moved form BbBwaiting.js for testing
function drawGameLobby() {
    // Draw game header
    fill(50);
    textSize(24);
    textAlign(CENTER);
    text(`Game Code: ${gameID}`, width / 2, 200);

    // Draw players
    const player1X = width / 2 - 200;
    const player2X = width / 2 + 200;
    const playerY = 300;

    // Define currentPlayer and opponentPlayer for demo purposes
    const currentPlayer = auth.currentUser?.displayName || 'Player 1';
    const opponentPlayer = { username: 'Player 2' };

    // Player 1 (current player)
    drawPlayerBox(player1X, playerY, currentPlayer, playerClass, playerReady);
    // VS TEXT
    fill(100);
    textSize(32);
    text('VS', width / 2, playerY + 75);
    // Player 2 (opponent)
    drawPlayerBox(player2X, playerY, opponentPlayer, oppClass, oppReady);
    
    // Ready button if not ready
    if (!playerReady && opponentPlayer) {
        fill(0, 150, 0);
        rect(width / 2 - 60, 450, 120, 40);
        fill(255);
        textSize(18);
        textAlign(CENTER);
        text('Ready Up', width / 2, 475);
        if (mouseIsPressed && mouseX > width / 2 - 60 && mouseX < width / 2 + 60 && mouseY > 450 && mouseY < 490) {
            toggleReady();
        }
    }
    
    if (playerReady && oppReady) {
        fill(0, 150, 0);
        textSize(20);
        text('Both players ready! Starting game...', width / 2, 520);
    }
}

// MAKE PLAYER
function drawPlayerBox(x, y, player, className, ready) {
    // Draw player container
    stroke(0);
    strokeWeight(2);
    fill(ready ? 200 : 240);
    rect(x - 100, y - 50, 200, 250);
    // Draw class image
    const classImage = classImages[className] || classImages['default'];
    image(classImage, x - 75, y - 25, 150, 150);
    // Draw player info
    noStroke();
    fill(0);
    textSize(16);
    textAlign(CENTER);
    let displayName = (typeof player === 'object' && player !== null && 'username' in player)
        ? player.username
        : (typeof player === 'string' ? player : 'Waiting...');
    text(displayName, x, y + 140);
    if (className) {
        textSize(14);
        fill(100);
        text(className, x, y + 160);
    }
    // Ready indicator
    if (ready) {
        fill(0, 150, 0);
        text('Ready!', x, y + 180);
    }
}

//Create game list
function drawAvailableGames() {
    fill(50);
    textSize(20);
    textAlign(LEFT);
    text('Available Games:', 20, 200);
    let y = 240;
    availableGames.forEach((game, index) => {
        const playerCount = Object.keys(game.players || {}).length;
        // Game box
        fill(240);
        stroke(0);
        rect(20, y - 15, 400, 40);

        // Game info
        fill(0);
        textSize(16);
        text(`Game ${game.id} - ${playerCount}/2 players`, 30, y + 10);
        // Join button
        fill(0, 100, 200);
        rect(350, y - 10, 60, 30);
        fill(255);
        textSize(14);
        text('Join', 380, y + 10);
        if (mouseIsPressed && mouseX > 350 && mouseX < 410 && mouseY > y - 10 && mouseY < y + 20) {
            gameCodeInput.value(game.id);
            joinGame();
        }
        y += 50;
    }
    );
}

// Clean up Firebase listeners when leaving the page
function windowWillUnload() {
    if (gameInterval) {
        // Clean up Firebase listener
        // off() would be called here
    }
}

// Expose sketch functions to global scope for p5.js
window.setup = setup;
window.preload = preload;
window.draw = draw;